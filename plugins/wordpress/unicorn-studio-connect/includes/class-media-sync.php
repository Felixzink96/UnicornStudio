<?php
/**
 * Media Sync
 *
 * Syncs images from Unicorn Studio to WordPress Media Library
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Media Sync Class
 */
class Unicorn_Studio_Media_Sync {

    /**
     * Register REST API endpoints
     */
    public function register_endpoints() {
        register_rest_route('unicorn-studio/v1', '/media/upload', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle_media_upload'],
            'permission_callback' => [$this, 'verify_request'],
        ]);

        register_rest_route('unicorn-studio/v1', '/media/sync', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle_media_sync'],
            'permission_callback' => [$this, 'verify_request'],
        ]);

        register_rest_route('unicorn-studio/v1', '/media/delete', [
            'methods'             => 'DELETE',
            'callback'            => [$this, 'handle_media_delete'],
            'permission_callback' => [$this, 'verify_request'],
        ]);
    }

    /**
     * Verify request authorization
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    public function verify_request($request) {
        $auth_header = $request->get_header('Authorization');
        if ($auth_header && strpos($auth_header, 'Bearer ') === 0) {
            $token = substr($auth_header, 7);
            $stored_api_key = Unicorn_Studio::get_api_key();

            if ($token && $stored_api_key && hash_equals($stored_api_key, $token)) {
                return true;
            }
        }

        return new WP_Error(
            'unauthorized',
            'Unauthorized request',
            ['status' => 401]
        );
    }

    /**
     * Handle media upload from URL
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function handle_media_upload($request) {
        $params = $request->get_json_params();

        $image_url = esc_url_raw($params['url'] ?? '');
        $filename = sanitize_file_name($params['filename'] ?? '');
        $alt_text = sanitize_text_field($params['alt_text'] ?? '');
        $unicorn_id = sanitize_text_field($params['unicorn_id'] ?? '');

        if (empty($image_url)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'No image URL provided',
            ], 400);
        }

        // Download image
        $tmp_file = download_url($image_url, 30);

        if (is_wp_error($tmp_file)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Failed to download image: ' . $tmp_file->get_error_message(),
            ], 500);
        }

        // Prepare file array for sideload
        $file_array = [
            'name'     => $filename ?: basename(parse_url($image_url, PHP_URL_PATH)),
            'tmp_name' => $tmp_file,
        ];

        // Sideload into media library
        $attachment_id = media_handle_sideload($file_array, 0);

        // Clean up temp file
        if (file_exists($tmp_file)) {
            @unlink($tmp_file);
        }

        if (is_wp_error($attachment_id)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Failed to add to media library: ' . $attachment_id->get_error_message(),
            ], 500);
        }

        // Set alt text
        if (!empty($alt_text)) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt_text);
        }

        // Store Unicorn Studio reference
        if (!empty($unicorn_id)) {
            update_post_meta($attachment_id, '_unicorn_studio_id', $unicorn_id);
        }

        // Store original Supabase URL for URL rewriting
        if (!empty($image_url)) {
            update_post_meta($attachment_id, '_unicorn_original_url', $image_url);
        }

        // Get attachment URL
        $attachment_url = wp_get_attachment_url($attachment_id);

        return new WP_REST_Response([
            'success' => true,
            'attachment_id' => $attachment_id,
            'url' => $attachment_url,
        ], 200);
    }

    /**
     * Handle bulk media sync
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function handle_media_sync($request) {
        $params = $request->get_json_params();
        $images = $params['images'] ?? [];

        if (empty($images) || !is_array($images)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'No images provided',
            ], 400);
        }

        $results = [];
        $synced = 0;
        $failed = 0;

        foreach ($images as $image) {
            $url = esc_url_raw($image['url'] ?? '');
            $unicorn_id = sanitize_text_field($image['id'] ?? '');

            if (empty($url) || empty($unicorn_id)) {
                $failed++;
                continue;
            }

            // Check if already synced
            $existing = $this->get_attachment_by_unicorn_id($unicorn_id);
            if ($existing) {
                $results[$unicorn_id] = [
                    'status' => 'exists',
                    'attachment_id' => $existing,
                    'url' => wp_get_attachment_url($existing),
                ];
                continue;
            }

            // Download and sideload
            $tmp_file = download_url($url, 30);

            if (is_wp_error($tmp_file)) {
                $results[$unicorn_id] = [
                    'status' => 'failed',
                    'error' => $tmp_file->get_error_message(),
                ];
                $failed++;
                continue;
            }

            $file_array = [
                'name'     => sanitize_file_name($image['filename'] ?? basename(parse_url($url, PHP_URL_PATH))),
                'tmp_name' => $tmp_file,
            ];

            $attachment_id = media_handle_sideload($file_array, 0);

            if (file_exists($tmp_file)) {
                @unlink($tmp_file);
            }

            if (is_wp_error($attachment_id)) {
                $results[$unicorn_id] = [
                    'status' => 'failed',
                    'error' => $attachment_id->get_error_message(),
                ];
                $failed++;
                continue;
            }

            // Set metadata
            if (!empty($image['alt_text'])) {
                update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($image['alt_text']));
            }
            update_post_meta($attachment_id, '_unicorn_studio_id', $unicorn_id);
            update_post_meta($attachment_id, '_unicorn_original_url', $url);

            $results[$unicorn_id] = [
                'status' => 'synced',
                'attachment_id' => $attachment_id,
                'url' => wp_get_attachment_url($attachment_id),
            ];
            $synced++;
        }

        return new WP_REST_Response([
            'success' => true,
            'synced' => $synced,
            'failed' => $failed,
            'results' => $results,
        ], 200);
    }

    /**
     * Handle media delete
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function handle_media_delete($request) {
        $params = $request->get_json_params();
        $unicorn_id = sanitize_text_field($params['unicorn_id'] ?? '');

        if (empty($unicorn_id)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'No unicorn_id provided',
            ], 400);
        }

        $attachment_id = $this->get_attachment_by_unicorn_id($unicorn_id);

        if (!$attachment_id) {
            return new WP_REST_Response([
                'success' => true,
                'message' => 'Attachment not found (already deleted or never synced)',
            ], 200);
        }

        $deleted = wp_delete_attachment($attachment_id, true);

        if (!$deleted) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Failed to delete attachment',
            ], 500);
        }

        return new WP_REST_Response([
            'success' => true,
            'deleted_id' => $attachment_id,
        ], 200);
    }

    /**
     * Get attachment ID by Unicorn Studio ID
     *
     * @param string $unicorn_id Unicorn Studio image ID
     * @return int|null Attachment ID or null
     */
    private function get_attachment_by_unicorn_id($unicorn_id) {
        global $wpdb;

        $attachment_id = $wpdb->get_var($wpdb->prepare(
            "SELECT post_id FROM {$wpdb->postmeta} WHERE meta_key = '_unicorn_studio_id' AND meta_value = %s LIMIT 1",
            $unicorn_id
        ));

        return $attachment_id ? (int) $attachment_id : null;
    }

    /**
     * Rewrite image URLs in HTML content
     *
     * Replaces Supabase URLs with WordPress Media Library URLs
     *
     * @param string $html HTML content
     * @param string $site_id Site ID
     * @return string Updated HTML
     */
    public function rewrite_image_urls($html, $site_id) {
        // Get all synced images for this site
        $synced_images = $this->get_synced_images_map();

        if (empty($synced_images)) {
            return $html;
        }

        // Replace URLs
        foreach ($synced_images as $unicorn_url => $wp_url) {
            $html = str_replace($unicorn_url, $wp_url, $html);
        }

        return $html;
    }

    /**
     * Get map of synced image URLs
     *
     * @return array Map of Original Supabase URL => WordPress URL
     */
    private function get_synced_images_map() {
        global $wpdb;

        // Get all attachments with original URL stored
        $results = $wpdb->get_results(
            "SELECT p.ID, pm.meta_value as original_url
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
             WHERE pm.meta_key = '_unicorn_original_url'
             AND p.post_type = 'attachment'"
        );

        $map = [];
        foreach ($results as $row) {
            $wp_url = wp_get_attachment_url($row->ID);
            if ($wp_url && !empty($row->original_url)) {
                // Map original Supabase URL to WordPress URL
                $map[$row->original_url] = $wp_url;
            }
        }

        return $map;
    }

    /**
     * Rewrite all Supabase storage URLs in HTML to WordPress URLs
     * This is called during page sync to ensure images point to local WP media
     *
     * @param string $html HTML content
     * @return string HTML with rewritten URLs
     */
    public function rewrite_supabase_urls($html) {
        if (empty($html)) {
            return $html;
        }

        // Get URL map
        $map = $this->get_synced_images_map();

        if (!empty($map)) {
            // Replace all mapped URLs
            foreach ($map as $original_url => $wp_url) {
                $html = str_replace($original_url, $wp_url, $html);
            }
        }

        return $html;
    }
}
