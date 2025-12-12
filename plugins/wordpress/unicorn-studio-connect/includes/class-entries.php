<?php
/**
 * Entries Handler
 *
 * Syncs entries from Unicorn Studio to WordPress posts
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Entries Class
 */
class Unicorn_Studio_Entries {

    /**
     * API Client
     */
    private $api;

    /**
     * Meta key for storing Unicorn Studio entry ID
     */
    const META_KEY_ENTRY_ID = '_unicorn_studio_entry_id';

    /**
     * Constructor
     *
     * @param Unicorn_Studio_API_Client $api API client instance
     */
    public function __construct($api) {
        $this->api = $api;
    }

    /**
     * Sync all entries for a content type
     *
     * @param string $content_type_name Content type name
     * @return array Result with success count and errors
     */
    public function sync_entries($content_type_name) {
        $result = [
            'synced'  => 0,
            'created' => 0,
            'updated' => 0,
            'errors'  => [],
        ];

        $page = 1;
        $per_page = 50;

        do {
            $response = $this->api->get_entries_by_type($content_type_name, [
                'page'     => $page,
                'per_page' => $per_page,
                'status'   => 'all',
            ]);

            if (is_wp_error($response)) {
                $result['errors'][] = $response->get_error_message();
                break;
            }

            $entries = $response['data']['entries'] ?? [];

            foreach ($entries as $entry) {
                $sync_result = $this->sync_single_entry($entry, $content_type_name);

                if (is_wp_error($sync_result)) {
                    $result['errors'][] = sprintf(
                        __('Fehler bei Entry "%s": %s', 'unicorn-studio'),
                        $entry['title'] ?? $entry['id'],
                        $sync_result->get_error_message()
                    );
                } else {
                    $result['synced']++;
                    if ($sync_result === 'created') {
                        $result['created']++;
                    } else {
                        $result['updated']++;
                    }
                }
            }

            $page++;
            $has_more = $response['meta']['has_more'] ?? false;

        } while ($has_more);

        return $result;
    }

    /**
     * Sync a single entry
     *
     * @param array  $entry             Entry data from API
     * @param string $content_type_name Content type name
     * @return string|WP_Error 'created', 'updated', or WP_Error
     */
    public function sync_single_entry($entry, $content_type_name) {
        $post_type = unicorn_studio()->content_types->get_post_type_name($content_type_name);
        $existing_post_id = $this->get_post_by_entry_id($entry['id']);

        // Map status
        $status_map = [
            'published' => 'publish',
            'draft'     => 'draft',
            'scheduled' => 'future',
            'archived'  => 'private',
        ];
        $post_status = $status_map[$entry['status']] ?? 'draft';

        // Prepare post data
        $post_data = [
            'post_type'    => $post_type,
            'post_title'   => $entry['title'] ?? '',
            'post_name'    => $entry['slug'] ?? '',
            'post_content' => $entry['content'] ?? '',
            'post_excerpt' => $entry['excerpt'] ?? '',
            'post_status'  => $post_status,
        ];

        // Handle scheduled posts
        if ($post_status === 'future' && !empty($entry['scheduled_at'])) {
            $post_data['post_date'] = $entry['scheduled_at'];
            $post_data['post_date_gmt'] = get_gmt_from_date($entry['scheduled_at']);
        }

        // Handle published date
        if (!empty($entry['published_at'])) {
            $post_data['post_date'] = $entry['published_at'];
            $post_data['post_date_gmt'] = get_gmt_from_date($entry['published_at']);
        }

        // Update or create
        if ($existing_post_id) {
            $post_data['ID'] = $existing_post_id;
            $post_id = wp_update_post($post_data, true);
            $action = 'updated';
        } else {
            $post_id = wp_insert_post($post_data, true);
            $action = 'created';
        }

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Store entry ID
        update_post_meta($post_id, self::META_KEY_ENTRY_ID, $entry['id']);

        // Sync custom field data
        $this->sync_field_data($post_id, $entry['data'] ?? [], $entry['fields'] ?? []);

        // Sync featured image
        if (!empty($entry['featured_image'])) {
            $this->sync_featured_image($post_id, $entry['featured_image']);
        }

        // Sync taxonomies
        if (!empty($entry['taxonomies'])) {
            $this->sync_taxonomies($post_id, $entry['taxonomies']);
        }

        // Sync SEO (if Yoast or RankMath available)
        if (!empty($entry['seo'])) {
            $this->sync_seo($post_id, $entry['seo']);
        }

        return $action;
    }

    /**
     * Sync field data to ACF or post meta
     *
     * @param int   $post_id Post ID
     * @param array $data    Field values
     * @param array $fields  Field definitions
     */
    private function sync_field_data($post_id, $data, $fields = []) {
        if (empty($data)) {
            return;
        }

        // Use ACF if available
        if (function_exists('update_field')) {
            foreach ($data as $field_name => $value) {
                // Transform value based on field type
                $transformed_value = $this->transform_field_value($value, $field_name, $fields);
                update_field($field_name, $transformed_value, $post_id);
            }
        } else {
            // Fallback to post meta
            foreach ($data as $field_name => $value) {
                update_post_meta($post_id, $field_name, $value);
            }
        }
    }

    /**
     * Transform field value for WordPress/ACF
     *
     * @param mixed  $value      Field value
     * @param string $field_name Field name
     * @param array  $fields     Field definitions
     * @return mixed Transformed value
     */
    private function transform_field_value($value, $field_name, $fields) {
        // Find field definition
        $field_def = null;
        foreach ($fields as $field) {
            if (($field['name'] ?? '') === $field_name) {
                $field_def = $field;
                break;
            }
        }

        if (!$field_def) {
            return $value;
        }

        $type = $field_def['type'] ?? '';

        switch ($type) {
            case 'image':
            case 'file':
                // Handle media - download and attach if URL
                if (is_array($value) && !empty($value['url'])) {
                    return $this->import_media($value['url'], $value['name'] ?? '');
                }
                return $value;

            case 'gallery':
                // Handle multiple images
                if (is_array($value)) {
                    $attachment_ids = [];
                    foreach ($value as $image) {
                        if (is_array($image) && !empty($image['url'])) {
                            $att_id = $this->import_media($image['url'], $image['name'] ?? '');
                            if ($att_id) {
                                $attachment_ids[] = $att_id;
                            }
                        }
                    }
                    return $attachment_ids;
                }
                return $value;

            case 'relation':
                // Handle post relationships
                if (is_array($value)) {
                    $post_ids = [];
                    foreach ($value as $related) {
                        if (isset($related['id'])) {
                            $related_post = $this->get_post_by_entry_id($related['id']);
                            if ($related_post) {
                                $post_ids[] = $related_post;
                            }
                        }
                    }
                    return $post_ids;
                }
                return $value;

            default:
                return $value;
        }
    }

    /**
     * Sync featured image
     *
     * @param int   $post_id Post ID
     * @param array $image   Image data
     */
    private function sync_featured_image($post_id, $image) {
        if (empty($image['url'])) {
            return;
        }

        $attachment_id = $this->import_media($image['url'], $image['name'] ?? '');

        if ($attachment_id) {
            set_post_thumbnail($post_id, $attachment_id);

            // Set alt text
            if (!empty($image['alt'])) {
                update_post_meta($attachment_id, '_wp_attachment_image_alt', $image['alt']);
            }
        }
    }

    /**
     * Sync taxonomies
     *
     * @param int   $post_id    Post ID
     * @param array $taxonomies Taxonomies with terms
     */
    private function sync_taxonomies($post_id, $taxonomies) {
        foreach ($taxonomies as $tax_slug => $tax_data) {
            $taxonomy = unicorn_studio()->taxonomies->get_taxonomy_name($tax_slug);

            if (!taxonomy_exists($taxonomy)) {
                continue;
            }

            $terms = $tax_data['terms'] ?? $tax_data;
            $term_ids = [];

            foreach ($terms as $term) {
                $term_name = is_array($term) ? ($term['name'] ?? '') : $term;
                $term_slug = is_array($term) ? ($term['slug'] ?? '') : sanitize_title($term);

                if (empty($term_name)) {
                    continue;
                }

                // Get or create term
                $existing_term = get_term_by('slug', $term_slug, $taxonomy);

                if ($existing_term) {
                    $term_ids[] = $existing_term->term_id;
                } else {
                    $new_term = wp_insert_term($term_name, $taxonomy, ['slug' => $term_slug]);
                    if (!is_wp_error($new_term)) {
                        $term_ids[] = $new_term['term_id'];
                    }
                }
            }

            wp_set_object_terms($post_id, $term_ids, $taxonomy);
        }
    }

    /**
     * Sync SEO data
     *
     * @param int   $post_id Post ID
     * @param array $seo     SEO data
     */
    private function sync_seo($post_id, $seo) {
        // Yoast SEO
        if (defined('WPSEO_VERSION')) {
            if (!empty($seo['meta_title'])) {
                update_post_meta($post_id, '_yoast_wpseo_title', $seo['meta_title']);
            }
            if (!empty($seo['meta_description'])) {
                update_post_meta($post_id, '_yoast_wpseo_metadesc', $seo['meta_description']);
            }
            if (!empty($seo['focus_keyword'])) {
                update_post_meta($post_id, '_yoast_wpseo_focuskw', $seo['focus_keyword']);
            }
        }

        // RankMath
        if (class_exists('RankMath')) {
            if (!empty($seo['meta_title'])) {
                update_post_meta($post_id, 'rank_math_title', $seo['meta_title']);
            }
            if (!empty($seo['meta_description'])) {
                update_post_meta($post_id, 'rank_math_description', $seo['meta_description']);
            }
            if (!empty($seo['focus_keyword'])) {
                update_post_meta($post_id, 'rank_math_focus_keyword', $seo['focus_keyword']);
            }
        }
    }

    /**
     * Import media from URL
     *
     * @param string $url      Media URL
     * @param string $filename Filename
     * @return int|false Attachment ID or false
     */
    private function import_media($url, $filename = '') {
        if (empty($url)) {
            return false;
        }

        // Check if already imported
        $existing = $this->get_attachment_by_url($url);
        if ($existing) {
            return $existing;
        }

        // Download file
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        $tmp = download_url($url);

        if (is_wp_error($tmp)) {
            return false;
        }

        $file_array = [
            'name'     => $filename ?: basename(parse_url($url, PHP_URL_PATH)),
            'tmp_name' => $tmp,
        ];

        $attachment_id = media_handle_sideload($file_array, 0);

        if (is_wp_error($attachment_id)) {
            @unlink($tmp);
            return false;
        }

        // Store original URL for deduplication
        update_post_meta($attachment_id, '_unicorn_studio_source_url', $url);

        return $attachment_id;
    }

    /**
     * Get attachment by source URL
     *
     * @param string $url Source URL
     * @return int|false Attachment ID or false
     */
    private function get_attachment_by_url($url) {
        global $wpdb;

        $attachment_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = '_unicorn_studio_source_url'
             AND meta_value = %s",
            $url
        ));

        return $attachment_id ? (int) $attachment_id : false;
    }

    /**
     * Get WordPress post ID by Unicorn Studio entry ID
     *
     * @param string $entry_id Unicorn Studio entry ID
     * @return int|false Post ID or false
     */
    public function get_post_by_entry_id($entry_id) {
        global $wpdb;

        $post_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta}
             WHERE meta_key = %s AND meta_value = %s",
            self::META_KEY_ENTRY_ID,
            $entry_id
        ));

        return $post_id ? (int) $post_id : false;
    }

    /**
     * Create post from webhook data
     *
     * @param array $data Webhook payload data
     * @return int|WP_Error Post ID or error
     */
    public function create_post($data) {
        // Fetch full entry data from API
        $response = $this->api->get_entry($data['id']);

        if (is_wp_error($response)) {
            return $response;
        }

        $entry = $response['data'] ?? [];
        $content_type_name = $data['content_type_name'] ?? $entry['content_type']['name'] ?? '';

        if (empty($content_type_name)) {
            return new WP_Error('missing_content_type', __('Content Type nicht gefunden.', 'unicorn-studio'));
        }

        $result = $this->sync_single_entry($entry, $content_type_name);

        if ($result === 'created' || $result === 'updated') {
            return $this->get_post_by_entry_id($data['id']);
        }

        return $result; // WP_Error
    }

    /**
     * Update post from webhook data
     *
     * @param array $data Webhook payload data
     * @return int|WP_Error Post ID or error
     */
    public function update_post($data) {
        return $this->create_post($data); // Same logic
    }

    /**
     * Delete post from webhook data
     *
     * @param string $entry_id Unicorn Studio entry ID
     * @return bool|WP_Error
     */
    public function delete_post($entry_id) {
        $post_id = $this->get_post_by_entry_id($entry_id);

        if (!$post_id) {
            return true; // Already deleted
        }

        $result = wp_delete_post($post_id, true);

        return $result ? true : new WP_Error('delete_failed', __('Beitrag konnte nicht gelöscht werden.', 'unicorn-studio'));
    }

    /**
     * Publish post from webhook data
     *
     * @param string $entry_id Unicorn Studio entry ID
     * @return bool|WP_Error
     */
    public function publish_post($entry_id) {
        $post_id = $this->get_post_by_entry_id($entry_id);

        if (!$post_id) {
            return new WP_Error('post_not_found', __('Beitrag nicht gefunden.', 'unicorn-studio'));
        }

        $result = wp_update_post([
            'ID'          => $post_id,
            'post_status' => 'publish',
        ], true);

        return is_wp_error($result) ? $result : true;
    }
}
