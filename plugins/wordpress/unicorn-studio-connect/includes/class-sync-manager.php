<?php
/**
 * Sync Manager
 *
 * Orchestrates synchronization between Unicorn Studio and WordPress
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Sync Manager Class
 */
class Unicorn_Studio_Sync_Manager {

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
     * Full sync - sync everything
     *
     * @return array Results
     */
    public function sync_all() {
        $results = [
            'content_types'     => null,
            'taxonomies'        => null,
            'entries'           => null,
            'pages'             => null,
            'css'               => null,
            'fonts'             => null,
            'global_components' => null,
            'site_identity'     => null,
            'menus'             => null,
            'sitemap'           => null,
            'robots'            => null,
            'started_at'        => current_time('mysql'),
            'errors'            => [],
        ];

        // 1. Sync Content Types (structure)
        if (Unicorn_Studio::get_option('sync_content_types', true)) {
            $results['content_types'] = $this->sync_structure();
        }

        // 2. Sync Taxonomies
        if (Unicorn_Studio::get_option('sync_taxonomies', true)) {
            $results['taxonomies'] = $this->sync_taxonomies();
        }

        // 3. Sync Entries
        if (Unicorn_Studio::get_option('sync_entries', true)) {
            $results['entries'] = $this->sync_entries();
        }

        // 4. Sync Pages
        if (Unicorn_Studio::get_option('sync_pages', true)) {
            $results['pages'] = $this->sync_pages();
        }

        // 5. Sync CSS
        if (Unicorn_Studio::get_option('sync_css', true)) {
            $results['css'] = $this->sync_css();
        }

        // 6. Sync Fonts (GDPR-compliant local hosting)
        if (Unicorn_Studio::get_option('sync_fonts', true)) {
            $results['fonts'] = $this->sync_fonts();
        }

        // 7. Sync Global Components (Header/Footer)
        $results['global_components'] = $this->sync_global_components();

        // 8. Sync Site Identity (Logo, Favicon, Tagline)
        $results['site_identity'] = $this->sync_site_identity();

        // 9. Sync Menus
        $results['menus'] = $this->sync_menus();

        // 10. Sync Sitemap
        $results['sitemap'] = $this->sync_sitemap();

        // 11. Sync robots.txt
        $results['robots'] = $this->sync_robots();

        // Update last sync time
        update_option('unicorn_studio_last_sync', current_time('mysql'));
        $results['completed_at'] = current_time('mysql');

        return $results;
    }

    /**
     * Sync content types and fields (structure)
     *
     * @return array|WP_Error
     */
    public function sync_structure() {
        $response = $this->api->get_content_types();

        if (is_wp_error($response)) {
            return $response;
        }

        $content_types = $response['data'] ?? [];

        // Update stored content types
        unicorn_studio()->content_types->sync_from_api($content_types);

        // Refresh field groups
        if (class_exists('ACF')) {
            // ACF field groups are registered on acf/init, so they'll update on next page load
        }

        return [
            'success' => true,
            'count'   => count($content_types),
        ];
    }

    /**
     * Sync taxonomies and terms
     *
     * @return array|WP_Error
     */
    public function sync_taxonomies() {
        $response = $this->api->get_taxonomies();

        if (is_wp_error($response)) {
            return $response;
        }

        $taxonomies = $response['data'] ?? [];
        $terms_synced = 0;

        // Update stored taxonomies
        unicorn_studio()->taxonomies->sync_from_api($taxonomies);

        // Sync terms for each taxonomy
        foreach ($taxonomies as $taxonomy) {
            $terms_response = $this->api->get_terms($taxonomy['id']);

            if (!is_wp_error($terms_response)) {
                $terms_data = $terms_response['data'] ?? [];
                $terms = $terms_data['terms'] ?? [];

                unicorn_studio()->taxonomies->sync_terms($taxonomy['id'], $terms);
                $terms_synced += $this->count_terms($terms);
            }
        }

        return [
            'success'         => true,
            'taxonomies'      => count($taxonomies),
            'terms'           => $terms_synced,
        ];
    }

    /**
     * Count terms including nested children
     *
     * @param array $terms Terms array
     * @return int
     */
    private function count_terms($terms) {
        $count = count($terms);

        foreach ($terms as $term) {
            if (!empty($term['children'])) {
                $count += $this->count_terms($term['children']);
            }
        }

        return $count;
    }

    /**
     * Sync all entries
     *
     * @return array
     */
    public function sync_entries() {
        $content_types = unicorn_studio()->content_types->get_all();
        $results = [
            'success'       => true,
            'total_synced'  => 0,
            'total_created' => 0,
            'total_updated' => 0,
            'by_type'       => [],
            'errors'        => [],
        ];

        foreach ($content_types as $type) {
            $type_result = unicorn_studio()->entries->sync_entries($type['name']);

            $results['by_type'][$type['name']] = $type_result;
            $results['total_synced'] += $type_result['synced'];
            $results['total_created'] += $type_result['created'];
            $results['total_updated'] += $type_result['updated'];

            if (!empty($type_result['errors'])) {
                $results['errors'] = array_merge($results['errors'], $type_result['errors']);
            }
        }

        if (!empty($results['errors'])) {
            $results['success'] = false;
        }

        return $results;
    }

    /**
     * Sync pages
     *
     * @return array|WP_Error
     */
    public function sync_pages() {
        $result = unicorn_studio()->pages->sync_pages();

        return $result;
    }

    /**
     * Sync CSS
     *
     * @return array|WP_Error
     */
    public function sync_css() {
        $result = unicorn_studio()->css->sync_css();

        if (is_wp_error($result)) {
            return $result;
        }

        return [
            'success' => true,
            'size'    => unicorn_studio()->css->get_css_size(),
        ];
    }

    /**
     * Sync Fonts (GDPR-compliant local hosting)
     *
     * @return array|WP_Error
     */
    public function sync_fonts() {
        $result = unicorn_studio()->fonts->sync_fonts();

        if (is_wp_error($result)) {
            return $result;
        }

        return [
            'success' => $result['success'] ?? true,
            'count'   => $result['count'] ?? 0,
            'size'    => $result['size'] ?? '0 KB',
            'errors'  => $result['errors'] ?? [],
        ];
    }

    /**
     * Sync Global Components (Header/Footer)
     *
     * @return array|WP_Error
     */
    public function sync_global_components() {
        $response = $this->api->request('/global-components?is_global=true');

        if (is_wp_error($response)) {
            // Try fallback without filter
            $response = $this->api->request('/global-components');

            if (is_wp_error($response)) {
                return $response;
            }
        }

        $components = $response['data'] ?? [];

        // Filter to only header/footer positions
        $filtered = [];
        foreach ($components as $component) {
            $position = $component['component_position'] ?? $component['position'] ?? '';
            if (in_array($position, ['header', 'footer'], true)) {
                $filtered[] = $component;
            }
        }

        // Sync components
        if (!empty($filtered)) {
            Unicorn_Studio_Global_Components::sync_from_api($filtered);
        }

        // Count synced header/footer
        $has_header = false;
        $has_footer = false;

        foreach ($filtered as $component) {
            $position = $component['component_position'] ?? $component['position'] ?? '';
            if ($position === 'header') $has_header = true;
            if ($position === 'footer') $has_footer = true;
        }

        return [
            'success' => true,
            'count'   => count($filtered),
            'header'  => $has_header,
            'footer'  => $has_footer,
        ];
    }

    /**
     * Sync Site Identity (Logo, Favicon, Tagline, OG Image)
     *
     * @return array|WP_Error
     */
    public function sync_site_identity() {
        $response = $this->api->request('/site-identity');

        if (is_wp_error($response)) {
            // Site identity endpoint might not exist yet - not critical
            return [
                'success' => true,
                'skipped' => true,
                'message' => 'Site identity endpoint not available',
            ];
        }

        $data = $response['data'] ?? [];

        // Sync using the Site Identity class
        Unicorn_Studio_Site_Identity::sync($data);

        return [
            'success'   => true,
            'has_logo'  => !empty($data['logo_url']),
            'has_favicon' => !empty($data['favicon_url']),
        ];
    }

    /**
     * Sync Menus from Unicorn Studio
     *
     * @return array|WP_Error
     */
    public function sync_menus() {
        $response = $this->api->get_menus();

        // Debug logging
        error_log('[Unicorn Menu Sync] API Response type: ' . gettype($response));
        if (is_array($response)) {
            error_log('[Unicorn Menu Sync] API Response keys: ' . implode(', ', array_keys($response)));
            error_log('[Unicorn Menu Sync] API Response: ' . wp_json_encode($response));
        }

        if (is_wp_error($response)) {
            error_log('[Unicorn Menu Sync] Error: ' . $response->get_error_message());
            return $response;
        }

        // Response format: { data: [...] } or array directly
        $menus = [];
        if (isset($response['data']) && is_array($response['data'])) {
            $menus = $response['data'];
            error_log('[Unicorn Menu Sync] Extracted from data key, count: ' . count($menus));
        } elseif (is_array($response) && !isset($response['data'])) {
            $menus = $response;
            error_log('[Unicorn Menu Sync] Using response directly, count: ' . count($menus));
        }

        // Log each menu
        foreach ($menus as $index => $menu) {
            error_log('[Unicorn Menu Sync] Menu ' . $index . ': ' . wp_json_encode($menu));
        }

        // Store menus in option
        update_option('unicorn_studio_menus', $menus);
        update_option('unicorn_studio_menus_last_sync', current_time('mysql'));

        return [
            'success' => true,
            'count'   => count($menus),
            'menus'   => array_map(function($menu) {
                return [
                    'name' => $menu['name'] ?? '',
                    'slug' => $menu['slug'] ?? '',
                    'position' => $menu['position'] ?? $menu['menu_position'] ?? 'custom',
                    'items_count' => $menu['itemCount'] ?? $menu['item_count'] ?? 0,
                ];
            }, $menus),
        ];
    }

    /**
     * Sync Sitemap from Unicorn Studio
     *
     * @return array|WP_Error
     */
    public function sync_sitemap() {
        $response = $this->api->get_sitemap();

        if (is_wp_error($response)) {
            return $response;
        }

        // Save sitemap.xml to uploads folder
        $upload_dir = wp_upload_dir();
        $sitemap_path = $upload_dir['basedir'] . '/unicorn-studio/sitemap.xml';

        // Ensure directory exists
        wp_mkdir_p(dirname($sitemap_path));

        // Write sitemap file
        $result = file_put_contents($sitemap_path, $response);

        if ($result === false) {
            return new WP_Error('sitemap_write_error', 'Could not write sitemap.xml');
        }

        update_option('unicorn_studio_sitemap_last_sync', current_time('mysql'));

        return [
            'success' => true,
            'path'    => $sitemap_path,
            'size'    => size_format($result),
        ];
    }

    /**
     * Sync robots.txt
     *
     * @return array|WP_Error
     */
    public function sync_robots() {
        $robots_content = $this->api->get_robots_txt();

        if (is_wp_error($robots_content)) {
            return $robots_content;
        }

        // Store robots.txt content in option (WordPress handles virtual robots.txt)
        update_option('unicorn_studio_robots_txt', $robots_content);
        update_option('unicorn_studio_robots_last_sync', current_time('mysql'));

        return [
            'success' => true,
            'content' => $robots_content,
        ];
    }

    /**
     * AJAX handler for sync
     */
    public function ajax_sync() {
        check_ajax_referer('unicorn_studio_admin', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Keine Berechtigung.', 'unicorn-studio')]);
        }

        $type = sanitize_text_field($_POST['sync_type'] ?? 'all');

        switch ($type) {
            case 'structure':
                $result = $this->sync_structure();
                break;

            case 'taxonomies':
                $result = $this->sync_taxonomies();
                break;

            case 'entries':
                $result = $this->sync_entries();
                break;

            case 'pages':
                $result = $this->sync_pages();
                break;

            case 'css':
                $result = $this->sync_css();
                break;

            case 'fonts':
                $result = $this->sync_fonts();
                break;

            case 'components':
            case 'global_components':
                $result = $this->sync_global_components();
                break;

            case 'site_identity':
                $result = $this->sync_site_identity();
                break;

            case 'menus':
                $result = $this->sync_menus();
                break;

            case 'sitemap':
                $result = $this->sync_sitemap();
                break;

            case 'robots':
                $result = $this->sync_robots();
                break;

            case 'all':
            default:
                $result = $this->sync_all();
                break;
        }

        if (is_wp_error($result)) {
            wp_send_json_error([
                'message' => $result->get_error_message(),
            ]);
        }

        wp_send_json_success($result);
    }

    /**
     * Get last sync time
     *
     * @return string|false
     */
    public static function get_last_sync() {
        $last_sync = get_option('unicorn_studio_last_sync');

        if (!$last_sync) {
            return false;
        }

        return date_i18n(
            get_option('date_format') . ' ' . get_option('time_format'),
            strtotime($last_sync)
        );
    }

    /**
     * Get sync status
     *
     * @return array
     */
    public static function get_status() {
        $global_header = Unicorn_Studio_Global_Components::get_global_header();
        $global_footer = Unicorn_Studio_Global_Components::get_global_footer();

        return [
            'connected'        => Unicorn_Studio::is_connected(),
            'last_sync'        => self::get_last_sync(),
            'content_types'    => count(get_option('unicorn_studio_content_types', [])),
            'taxonomies'       => count(get_option('unicorn_studio_taxonomies', [])),
            'css_exists'       => unicorn_studio()->css->css_exists(),
            'css_size'         => unicorn_studio()->css->get_css_size(),
            'css_modified'     => unicorn_studio()->css->get_last_modified(),
            'fonts_count'      => unicorn_studio()->fonts->get_fonts_count(),
            'fonts_size'       => unicorn_studio()->fonts->get_fonts_size(),
            'fonts_families'   => unicorn_studio()->fonts->get_font_families(),
            'fonts_synced'     => unicorn_studio()->fonts->get_last_sync(),
            'has_header'       => !empty($global_header),
            'has_footer'       => !empty($global_footer),
            'header_name'      => $global_header['name'] ?? null,
            'footer_name'      => $global_footer['name'] ?? null,
            'acf_available'    => Unicorn_Studio_Fields::is_acf_available(),
        ];
    }
}
