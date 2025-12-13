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
     * Sync a single page by Unicorn Studio ID
     *
     * @param string $page_id Unicorn Studio page ID
     * @return array Sync result
     */
    public function sync_page_by_id($page_id) {
        $debug = [
            'step' => 'start',
            'page_id_received' => $page_id,
            'timestamp' => current_time('mysql'),
        ];

        // Validate page_id
        if (empty($page_id)) {
            return [
                'success' => false,
                'error'   => 'Keine Page ID erhalten',
                'debug'   => array_merge($debug, [
                    'step' => 'validation_error',
                    'issue' => 'page_id is empty',
                ]),
            ];
        }

        // Get API config for debugging
        $debug['api_config'] = [
            'base_url' => Unicorn_Studio::get_option('api_url', 'nicht gesetzt'),
            'site_id' => Unicorn_Studio::get_site_id() ? substr(Unicorn_Studio::get_site_id(), 0, 8) . '...' : 'nicht gesetzt',
            'api_key_set' => !empty(Unicorn_Studio::get_api_key()),
        ];

        $response = $this->api->get_page($page_id);

        if (is_wp_error($response)) {
            $error_data = $response->get_error_data();
            return [
                'success' => false,
                'error'   => $response->get_error_message(),
                'debug'   => array_merge($debug, [
                    'step' => 'api_error',
                    'error_code' => $response->get_error_code(),
                    'error_data' => is_array($error_data) ? $error_data : ['raw' => $error_data],
                ]),
            ];
        }

        $debug['api_response_keys'] = is_array($response) ? array_keys($response) : 'not_array';
        $debug['api_response_success'] = $response['success'] ?? 'not_set';

        $page = $response['data'] ?? null;
        if (!$page) {
            return [
                'success' => false,
                'error'   => 'Seite nicht in API-Antwort gefunden. Response: ' . wp_json_encode(array_slice($response, 0, 3, true)),
                'debug'   => array_merge($debug, [
                    'step' => 'page_not_found_in_response',
                    'response_keys' => is_array($response) ? array_keys($response) : 'not_array',
                    'response_sample' => is_array($response) ? array_slice($response, 0, 5, true) : $response,
                ]),
            ];
        }

        $debug['page_data'] = [
            'id' => $page['id'] ?? 'missing',
            'name' => $page['name'] ?? 'missing',
            'slug' => $page['slug'] ?? 'missing',
            'title' => $page['title'] ?? 'missing',
            'html_length' => isset($page['html']) ? strlen($page['html']) : 0,
            'is_published' => $page['is_published'] ?? 'not_set',
            'has_content' => !empty($page['content']),
        ];

        // Check if WordPress page exists
        $existing = $this->get_page_by_unicorn_id($page['id']);
        $debug['wordpress_lookup'] = [
            'searched_unicorn_id' => $page['id'],
            'found' => $existing ? true : false,
            'wp_post_id' => $existing ? $existing->ID : null,
            'wp_post_title' => $existing ? $existing->post_title : null,
            'wp_post_status' => $existing ? $existing->post_status : null,
        ];

        $result = $this->sync_single_page($page);

        // Add more context to result
        $result['debug'] = array_merge($debug, [
            'step' => 'completed',
            'action_taken' => $result['action'] ?? 'unknown',
            'resulting_post_id' => $result['post_id'] ?? null,
        ]);

        return $result;
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

        // Prepare content - extracts HTML and JS separately
        $prepared = $this->prepare_content($page);

        // Determine post status:
        // - For new pages: use Unicorn Studio's is_published flag
        // - For existing pages: keep current WordPress status (don't downgrade published to draft)
        $new_status = !empty($page['is_published']) ? 'publish' : 'draft';
        if ($existing_page) {
            // Keep the current WordPress status - don't change it on update
            // This prevents published pages from being reverted to draft
            $new_status = $existing_page->post_status;
        }

        $post_data = [
            'post_title'   => $page['title'] ?? $page['name'],
            'post_name'    => $page['slug'],
            'post_content' => $prepared['html'],
            'post_status'  => $new_status,
            'post_type'    => 'page',
            'meta_input'   => [
                '_unicorn_studio_id'      => $page['id'],
                '_unicorn_studio_path'    => $page['path'] ?? '',
                '_unicorn_studio_html'    => $page['html'] ?? '',
                '_unicorn_studio_js'      => $prepared['js'], // Store extracted JS
                '_unicorn_studio_content' => maybe_serialize($page['content'] ?? []),
                '_unicorn_studio_seo'     => maybe_serialize($page['seo'] ?? []),
                '_unicorn_studio_sync'    => current_time('mysql'),
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

        // Disable kses filters to allow SVGs and full HTML
        // WordPress normally strips SVG tags for security
        kses_remove_filters();

        try {
            if ($existing_page) {
                // Update existing page
                $post_data['ID'] = $existing_page->ID;
                $result = wp_update_post($post_data, true);

                if (is_wp_error($result)) {
                    kses_init_filters();
                    return [
                        'success' => false,
                        'error'   => $result->get_error_message(),
                    ];
                }

                // Set as front page if is_home
                if (!empty($page['is_home'])) {
                    $this->set_as_front_page($existing_page->ID);
                }

                kses_init_filters();
                return [
                    'success' => true,
                    'action'  => 'updated',
                    'post_id' => $existing_page->ID,
                ];
            } else {
                // Create new page
                $post_id = wp_insert_post($post_data, true);

                if (is_wp_error($post_id)) {
                    kses_init_filters();
                    return [
                        'success' => false,
                        'error'   => $post_id->get_error_message(),
                    ];
                }

                // Set as front page if is_home
                if (!empty($page['is_home'])) {
                    $this->set_as_front_page($post_id);
                }

                kses_init_filters();
                return [
                    'success' => true,
                    'action'  => 'created',
                    'post_id' => $post_id,
                ];
            }
        } catch (\Exception $e) {
            kses_init_filters();
            throw $e;
        }
    }

    /**
     * Prepare content for WordPress
     *
     * @param array $page Page data
     * @return array ['html' => string, 'js' => string]
     */
    private function prepare_content($page) {
        $html = $page['html'] ?? '';

        if (empty($html)) {
            return ['html' => '', 'js' => ''];
        }

        // Clean the HTML for WordPress
        $html = $this->clean_html_for_wordpress($html);

        // Extract inline scripts from HTML
        $extracted = $this->extract_scripts($html);
        $html = $extracted['html'];
        $js = $extracted['js'];

        // Wrap in a shortcode or block that renders the HTML
        // This allows the HTML to be rendered properly
        $content = '<!-- wp:html -->' . "\n";
        $content .= '<div class="unicorn-studio-page">' . "\n";
        $content .= $html . "\n";
        $content .= '</div>' . "\n";
        $content .= '<!-- /wp:html -->';

        return ['html' => $content, 'js' => $js];
    }

    /**
     * Extract inline scripts from HTML
     *
     * @param string $html HTML content
     * @return array ['html' => string without scripts, 'js' => extracted JS code]
     */
    private function extract_scripts($html) {
        $js = '';

        // Match inline scripts (not external src scripts)
        // Pattern matches <script>...</script> and <script type="...">...</script>
        $pattern = '/<script(?:\s+[^>]*)?(?<!src=["\'][^"\']*["\'])>(.+?)<\/script>/is';

        // Also match scripts without any attributes
        $pattern_simple = '/<script>(.*?)<\/script>/is';

        // Extract all inline scripts
        if (preg_match_all($pattern_simple, $html, $matches)) {
            foreach ($matches[1] as $script) {
                $js .= trim($script) . "\n\n";
            }
            // Remove the scripts from HTML
            $html = preg_replace($pattern_simple, '', $html);
        }

        // Also check for scripts with type attribute but no src
        $pattern_typed = '/<script\s+type=["\'][^"\']*["\'](?:\s+[^>]*)?>(.+?)<\/script>/is';
        if (preg_match_all($pattern_typed, $html, $matches)) {
            foreach ($matches[1] as $script) {
                // Avoid duplicates
                if (strpos($js, trim($script)) === false) {
                    $js .= trim($script) . "\n\n";
                }
            }
            $html = preg_replace($pattern_typed, '', $html);
        }

        return [
            'html' => trim($html),
            'js' => trim($js),
        ];
    }

    /**
     * Clean HTML for WordPress
     * - Extracts body content from full HTML documents
     * - Removes Tailwind CDN script (we use locally hosted CSS)
     *
     * @param string $html Raw HTML
     * @return string Cleaned HTML
     */
    private function clean_html_for_wordpress($html) {
        // Remove Tailwind CDN script - we use our own generated CSS
        $html = preg_replace('/<script[^>]*src=["\']https?:\/\/cdn\.tailwindcss\.com[^"\']*["\'][^>]*><\/script>/i', '', $html);
        $html = preg_replace('/<script[^>]*src=["\']https?:\/\/cdn\.tailwindcss\.com[^"\']*["\'][^>]*\/>/i', '', $html);

        // Check if this is a full HTML document
        if (strpos($html, '<!DOCTYPE') !== false || strpos($html, '<html') !== false) {
            // Extract body content
            if (preg_match('/<body[^>]*>(.*?)<\/body>/is', $html, $matches)) {
                $html = trim($matches[1]);
            } else {
                // Fallback: Remove doctype, html, head, body tags
                $html = preg_replace('/<!DOCTYPE[^>]*>/i', '', $html);
                $html = preg_replace('/<\/?html[^>]*>/i', '', $html);
                $html = preg_replace('/<head>.*?<\/head>/is', '', $html);
                $html = preg_replace('/<\/?body[^>]*>/i', '', $html);
            }
        }

        // Remove any remaining script tags that might load external resources
        // Keep inline scripts that might be needed for functionality
        $html = preg_replace('/<script[^>]*src=["\'][^"\']*tailwind[^"\']*["\'][^>]*><\/script>/i', '', $html);

        return trim($html);
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

    /**
     * Sync a single page from webhook data
     * Called directly by webhook handler with page data from Unicorn Studio
     *
     * @param array $page Page data from webhook
     * @return bool|WP_Error
     */
    public function sync_single_page_from_webhook($page) {
        if (empty($page['id'])) {
            return new WP_Error('missing_id', 'Page ID is required');
        }

        $result = $this->sync_single_page($page);

        if ($result['success']) {
            return true;
        }

        return new WP_Error('sync_failed', $result['error'] ?? 'Unknown error');
    }

    /**
     * Delete a page by Unicorn Studio ID
     *
     * @param string $unicorn_id Unicorn Studio page ID
     * @return bool|WP_Error
     */
    public function delete_page_by_unicorn_id($unicorn_id) {
        $existing = $this->get_page_by_unicorn_id($unicorn_id);

        if (!$existing) {
            // Page doesn't exist, nothing to delete
            return true;
        }

        $result = wp_trash_post($existing->ID);

        if (!$result) {
            return new WP_Error('delete_failed', 'Failed to delete page');
        }

        return true;
    }
}
