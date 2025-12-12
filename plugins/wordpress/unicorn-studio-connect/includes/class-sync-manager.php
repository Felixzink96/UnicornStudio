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
            'content_types' => null,
            'taxonomies'    => null,
            'entries'       => null,
            'pages'         => null,
            'css'           => null,
            'started_at'    => current_time('mysql'),
            'errors'        => [],
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
        return [
            'connected'       => Unicorn_Studio::is_connected(),
            'last_sync'       => self::get_last_sync(),
            'content_types'   => count(get_option('unicorn_studio_content_types', [])),
            'taxonomies'      => count(get_option('unicorn_studio_taxonomies', [])),
            'css_exists'      => unicorn_studio()->css->css_exists(),
            'css_size'        => unicorn_studio()->css->get_css_size(),
            'css_modified'    => unicorn_studio()->css->get_last_modified(),
            'acf_available'   => Unicorn_Studio_Fields::is_acf_available(),
        ];
    }
}
