<?php
/**
 * API Client for Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * API Client Class
 */
class Unicorn_Studio_API_Client {

    /**
     * API Key
     */
    private $api_key;

    /**
     * Site ID
     */
    private $site_id;

    /**
     * Base API URL
     */
    private $base_url;

    /**
     * Constructor
     */
    public function __construct() {
        $this->api_key = Unicorn_Studio::get_api_key();
        $this->site_id = Unicorn_Studio::get_site_id();
        $this->base_url = $this->get_api_url();
    }

    /**
     * Get API URL from options
     *
     * @return string
     */
    private function get_api_url() {
        $saved_url = get_option('unicorn_studio_api_url', '');
        return $saved_url ?: 'http://localhost:3000/api/v1';
    }

    /**
     * Make API request
     *
     * @param string $endpoint API endpoint
     * @param string $method   HTTP method
     * @param array  $body     Request body
     * @return array|WP_Error Response data or error
     */
    public function request($endpoint, $method = 'GET', $body = null) {
        $url = $this->base_url . '/sites/' . $this->site_id . $endpoint;

        $args = [
            'method'  => $method,
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
            ],
            'timeout' => 30,
        ];

        if ($body !== null) {
            $args['body'] = wp_json_encode($body);
        }

        $response = wp_remote_request($url, $args);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        $response_body = json_decode(wp_remote_retrieve_body($response), true);

        if ($status_code >= 400) {
            $error_message = $response_body['error']['message'] ?? __('Unbekannter Fehler', 'unicorn-studio');
            return new WP_Error(
                'unicorn_api_error',
                $error_message,
                ['status' => $status_code]
            );
        }

        return $response_body;
    }

    /**
     * Test API connection
     *
     * @return bool|WP_Error True on success, WP_Error on failure
     */
    public function test_connection() {
        if (empty($this->api_key) || empty($this->site_id)) {
            return new WP_Error(
                'missing_credentials',
                __('API Key und Site ID sind erforderlich.', 'unicorn-studio')
            );
        }

        $response = $this->request('');

        if (is_wp_error($response)) {
            return $response;
        }

        return isset($response['success']) && $response['success'];
    }

    /**
     * AJAX handler for connection test
     */
    public function ajax_test_connection() {
        check_ajax_referer('unicorn_studio_admin', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => __('Keine Berechtigung.', 'unicorn-studio')]);
        }

        // Temporarily set credentials from POST
        $api_url = sanitize_text_field($_POST['api_url'] ?? '');
        $api_key = sanitize_text_field($_POST['api_key'] ?? '');
        $site_id = sanitize_text_field($_POST['site_id'] ?? '');

        if (empty($api_key) || empty($site_id)) {
            wp_send_json_error(['message' => __('API Key und Site ID sind erforderlich.', 'unicorn-studio')]);
        }

        if (empty($api_url)) {
            $api_url = 'http://localhost:3000/api/v1';
        }

        $this->base_url = rtrim($api_url, '/');
        $this->api_key = $api_key;
        $this->site_id = $site_id;

        $result = $this->test_connection();

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        }

        wp_send_json_success(['message' => __('Verbindung erfolgreich!', 'unicorn-studio')]);
    }

    /**
     * Get all content types
     *
     * @return array|WP_Error
     */
    public function get_content_types() {
        return $this->request('/content-types');
    }

    /**
     * Get single content type
     *
     * @param string $type_id Content type ID
     * @return array|WP_Error
     */
    public function get_content_type($type_id) {
        return $this->request('/content-types/' . $type_id);
    }

    /**
     * Get all entries
     *
     * @param array $params Query parameters
     * @return array|WP_Error
     */
    public function get_entries($params = []) {
        $query = http_build_query($params);
        return $this->request('/entries' . ($query ? '?' . $query : ''));
    }

    /**
     * Get entries by content type
     *
     * @param string $content_type Content type name
     * @param array  $params       Query parameters
     * @return array|WP_Error
     */
    public function get_entries_by_type($content_type, $params = []) {
        $query = http_build_query($params);
        return $this->request('/entries/type/' . $content_type . ($query ? '?' . $query : ''));
    }

    /**
     * Get single entry
     *
     * @param string $entry_id Entry ID
     * @return array|WP_Error
     */
    public function get_entry($entry_id) {
        return $this->request('/entries/' . $entry_id);
    }

    /**
     * Get all taxonomies
     *
     * @return array|WP_Error
     */
    public function get_taxonomies() {
        return $this->request('/taxonomies');
    }

    /**
     * Get terms for a taxonomy
     *
     * @param string $taxonomy_id Taxonomy ID
     * @return array|WP_Error
     */
    public function get_terms($taxonomy_id) {
        return $this->request('/taxonomies/' . $taxonomy_id . '/terms');
    }

    /**
     * Get design variables
     *
     * @return array|WP_Error
     */
    public function get_variables() {
        return $this->request('/variables');
    }

    /**
     * Get components
     *
     * @return array|WP_Error
     */
    public function get_components() {
        return $this->request('/components');
    }

    /**
     * Get templates
     *
     * @return array|WP_Error
     */
    public function get_templates() {
        return $this->request('/templates');
    }

    /**
     * Get assets
     *
     * @param array $params Query parameters
     * @return array|WP_Error
     */
    public function get_assets($params = []) {
        $query = http_build_query($params);
        return $this->request('/assets' . ($query ? '?' . $query : ''));
    }

    /**
     * Get CSS
     *
     * @return string|false CSS content or false on failure
     */
    public function get_css() {
        $url = $this->base_url . '/sites/' . $this->site_id . '/export/css';

        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
            ],
            'timeout' => 60,
        ]);

        if (is_wp_error($response)) {
            return false;
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            return false;
        }

        return wp_remote_retrieve_body($response);
    }

    /**
     * Get CSS version
     *
     * @return array|WP_Error
     */
    public function get_css_version() {
        return $this->request('/export/css/version');
    }

    /**
     * Register webhook
     *
     * @param string $url    Webhook URL
     * @param array  $events Events to listen for
     * @return array|WP_Error
     */
    public function register_webhook($url, $events) {
        return $this->request('/webhooks', 'POST', [
            'url'    => $url,
            'events' => $events,
        ]);
    }

    /**
     * Delete webhook
     *
     * @param string $webhook_id Webhook ID
     * @return array|WP_Error
     */
    public function delete_webhook($webhook_id) {
        return $this->request('/webhooks?id=' . $webhook_id, 'DELETE');
    }

    /**
     * Get all pages
     *
     * @return array|WP_Error
     */
    public function get_pages() {
        return $this->request('/pages');
    }

    /**
     * Get single page
     *
     * @param string $page_id Page ID
     * @return array|WP_Error
     */
    public function get_page($page_id) {
        return $this->request('/pages/' . $page_id);
    }
}
