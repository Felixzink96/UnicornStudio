<?php
/**
 * Pages Handler
 *
 * Syncs pages from Unicorn Studio to WordPress Pages
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Pages Class
 */
class Unicorn_Studio_Pages {

    /**
     * API Client
     */
    private $api;

    /**
     * Constructor
     *
     * @param Unicorn_Studio_API_Client $api API client
     */
    public function __construct($api) {
        $this->api = $api;
    }

    /**
     * Sync all pages from Unicorn Studio
     *
     * @return array Sync results
     */
    public function sync_pages() {
        $response = $this->api->get_pages();

        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error'   => $response->get_error_message(),
                'synced'  => 0,
                'created' => 0,
                'updated' => 0,
            ];
        }

        $pages = $response['data'] ?? [];
        $results = [
            'success' => true,
            'synced'  => 0,
            'created' => 0,
            'updated' => 0,
            'errors'  => [],
        ];

        foreach ($pages as $page) {
            $result = $this->sync_single_page($page);

            if ($result['success']) {
                $results['synced']++;
                if ($result['action'] === 'created') {
                    $results['created']++;
                } else {
                    $results['updated']++;
                }
            } else {
                $results['errors'][] = $result['error'];
            }
        }

        if (!empty($results['errors'])) {
            $results['success'] = false;
        }

        return $results;
    }

    /**
     * Sync a single page
     *
     * @param array $page Page data from API
     * @return array Result
     */
    private function sync_single_page($page) {
        // Check if page already exists by unicorn_studio_id
        $existing_page = $this->get_page_by_unicorn_id($page['id']);

        $post_data = [
            'post_title'   => $page['title'] ?? $page['name'],
            'post_name'    => $page['slug'],
            'post_content' => $this->prepare_content($page),
            'post_status'  => $page['is_published'] ? 'publish' : 'draft',
            'post_type'    => 'page',
            'meta_input'   => [
                '_unicorn_studio_id'   => $page['id'],
                '_unicorn_studio_path' => $page['path'] ?? '',
                '_unicorn_studio_html' => $page['html'] ?? '',
                '_unicorn_studio_css'  => $page['css'] ?? '',
                '_unicorn_studio_seo'  => maybe_serialize($page['seo'] ?? []),
                '_unicorn_studio_sync' => current_time('mysql'),
            ],
        ];

        // Set page template for full-width if needed
        if (!empty($page['html'])) {
            $post_data['meta_input']['_wp_page_template'] = 'templates/unicorn-studio-page.php';
        }

        // Handle SEO meta
        if (!empty($page['seo'])) {
            $seo = $page['seo'];
            if (!empty($seo['meta_title'])) {
                $post_data['meta_input']['_yoast_wpseo_title'] = $seo['meta_title'];
                $post_data['meta_input']['_aioseo_title'] = $seo['meta_title'];
            }
            if (!empty($seo['meta_description'])) {
                $post_data['meta_input']['_yoast_wpseo_metadesc'] = $seo['meta_description'];
                $post_data['meta_input']['_aioseo_description'] = $seo['meta_description'];
            }
        }

        if ($existing_page) {
            // Update existing page
            $post_data['ID'] = $existing_page->ID;
            $result = wp_update_post($post_data, true);

            if (is_wp_error($result)) {
                return [
                    'success' => false,
                    'error'   => $result->get_error_message(),
                ];
            }

            // Set as front page if is_home
            if (!empty($page['is_home'])) {
                $this->set_as_front_page($existing_page->ID);
            }

            return [
                'success' => true,
                'action'  => 'updated',
                'post_id' => $existing_page->ID,
            ];
        } else {
            // Create new page
            $post_id = wp_insert_post($post_data, true);

            if (is_wp_error($post_id)) {
                return [
                    'success' => false,
                    'error'   => $post_id->get_error_message(),
                ];
            }

            // Set as front page if is_home
            if (!empty($page['is_home'])) {
                $this->set_as_front_page($post_id);
            }

            return [
                'success' => true,
                'action'  => 'created',
                'post_id' => $post_id,
            ];
        }
    }

    /**
     * Prepare content for WordPress
     *
     * @param array $page Page data
     * @return string
     */
    private function prepare_content($page) {
        $html = $page['html'] ?? '';

        if (empty($html)) {
            return '';
        }

        // Wrap in a shortcode or block that renders the HTML
        // This allows the HTML to be rendered properly
        $content = '<!-- wp:html -->' . "\n";
        $content .= '<div class="unicorn-studio-page">' . "\n";
        $content .= $html . "\n";
        $content .= '</div>' . "\n";
        $content .= '<!-- /wp:html -->';

        // Add CSS if present
        if (!empty($page['css'])) {
            $content .= "\n" . '<!-- wp:html -->' . "\n";
            $content .= '<style class="unicorn-studio-page-css">' . "\n";
            $content .= $page['css'] . "\n";
            $content .= '</style>' . "\n";
            $content .= '<!-- /wp:html -->';
        }

        return $content;
    }

    /**
     * Get WordPress page by Unicorn Studio ID
     *
     * @param string $unicorn_id Unicorn Studio page ID
     * @return WP_Post|null
     */
    private function get_page_by_unicorn_id($unicorn_id) {
        $pages = get_posts([
            'post_type'      => 'page',
            'posts_per_page' => 1,
            'meta_key'       => '_unicorn_studio_id',
            'meta_value'     => $unicorn_id,
            'post_status'    => ['publish', 'draft', 'pending', 'private'],
        ]);

        return !empty($pages) ? $pages[0] : null;
    }

    /**
     * Set a page as the front page
     *
     * @param int $page_id Page ID
     */
    private function set_as_front_page($page_id) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $page_id);
    }

    /**
     * Handle webhook event for page updates
     *
     * @param array $payload Webhook payload
     */
    public function handle_webhook($payload) {
        $event = $payload['event'] ?? '';
        $data = $payload['data'] ?? [];

        switch ($event) {
            case 'page.created':
            case 'page.updated':
                if (!empty($data['id'])) {
                    // Fetch fresh page data from API
                    $page_response = $this->api->get_page($data['id']);
                    if (!is_wp_error($page_response) && !empty($page_response['data'])) {
                        $this->sync_single_page($page_response['data']);
                    }
                }
                break;

            case 'page.deleted':
                if (!empty($data['id'])) {
                    $existing = $this->get_page_by_unicorn_id($data['id']);
                    if ($existing) {
                        wp_trash_post($existing->ID);
                    }
                }
                break;

            case 'page.published':
                if (!empty($data['id'])) {
                    $existing = $this->get_page_by_unicorn_id($data['id']);
                    if ($existing) {
                        wp_update_post([
                            'ID'          => $existing->ID,
                            'post_status' => 'publish',
                        ]);
                    }
                }
                break;
        }
    }

    /**
     * Get all synced pages
     *
     * @return array
     */
    public function get_synced_pages() {
        $pages = get_posts([
            'post_type'      => 'page',
            'posts_per_page' => -1,
            'meta_key'       => '_unicorn_studio_id',
            'post_status'    => ['publish', 'draft', 'pending', 'private'],
        ]);

        $result = [];
        foreach ($pages as $page) {
            $result[] = [
                'id'               => $page->ID,
                'title'            => $page->post_title,
                'slug'             => $page->post_name,
                'status'           => $page->post_status,
                'unicorn_id'       => get_post_meta($page->ID, '_unicorn_studio_id', true),
                'last_sync'        => get_post_meta($page->ID, '_unicorn_studio_sync', true),
                'edit_link'        => get_edit_post_link($page->ID),
                'view_link'        => get_permalink($page->ID),
            ];
        }

        return $result;
    }
}
