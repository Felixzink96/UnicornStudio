<?php
/**
 * SEO Manager
 *
 * Manages Sitemap and robots.txt from Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * SEO Manager Class
 */
class Unicorn_Studio_SEO_Manager {

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

        // Override robots.txt
        add_filter('robots_txt', [$this, 'custom_robots_txt'], 10, 2);

        // Add sitemap to robots.txt
        add_action('do_robotstxt', [$this, 'add_sitemap_to_robots'], 100);
    }

    /**
     * Custom robots.txt content
     *
     * @param string $output Default robots.txt
     * @param bool $public Site visibility
     * @return string
     */
    public function custom_robots_txt($output, $public) {
        if (!Unicorn_Studio::is_connected()) {
            return $output;
        }

        $custom_robots = get_option('unicorn_studio_robots_txt', '');

        if (!empty($custom_robots)) {
            $output = $custom_robots;

            // Add sitemap URL if not already present
            if (stripos($output, 'sitemap:') === false) {
                $sitemap_url = $this->get_sitemap_url();
                if ($sitemap_url) {
                    $output .= "\n\n# Sitemap\nSitemap: " . $sitemap_url;
                }
            }
        }

        return $output;
    }

    /**
     * Add sitemap to robots.txt action
     */
    public function add_sitemap_to_robots() {
        // This is handled in custom_robots_txt filter
    }

    /**
     * Get sitemap URL
     *
     * @return string|false
     */
    public function get_sitemap_url() {
        $site_id = Unicorn_Studio::get_site_id();
        $api_url = Unicorn_Studio::get_api_url();

        if (!$site_id || !$api_url) {
            return false;
        }

        // Use local cached sitemap if available
        $cached_sitemap = $this->get_cached_sitemap_path();
        if (file_exists($cached_sitemap)) {
            return home_url('/sitemap.xml');
        }

        // Fallback to Unicorn Studio API
        return rtrim($api_url, '/') . "/sites/{$site_id}/sitemap.xml";
    }

    /**
     * Sync sitemap from Unicorn Studio
     *
     * @return array|WP_Error
     */
    public function sync_sitemap() {
        $site_id = Unicorn_Studio::get_site_id();

        if (!$site_id) {
            return new WP_Error('no_site_id', 'Site ID not configured');
        }

        // Fetch sitemap from Unicorn Studio
        $sitemap = $this->api->request('/sitemap.xml', 'GET', [], false);

        if (is_wp_error($sitemap)) {
            return $sitemap;
        }

        // Save to local file
        $upload_dir = wp_upload_dir();
        $sitemap_dir = $upload_dir['basedir'] . '/unicorn-studio/';
        $sitemap_path = $sitemap_dir . 'sitemap.xml';

        if (!file_exists($sitemap_dir)) {
            wp_mkdir_p($sitemap_dir);
        }

        // The API returns XML directly when requesting sitemap.xml
        $result = file_put_contents($sitemap_path, $sitemap);

        if ($result === false) {
            return new WP_Error('write_failed', 'Could not save sitemap');
        }

        update_option('unicorn_studio_sitemap_synced', current_time('mysql'));

        return [
            'success' => true,
            'path' => $sitemap_path,
            'size' => size_format(strlen($sitemap)),
        ];
    }

    /**
     * Sync robots.txt from data
     *
     * @param array $data Robots data
     * @return bool
     */
    public static function sync_robots($data) {
        if (isset($data['robots_txt'])) {
            update_option('unicorn_studio_robots_txt', sanitize_textarea_field($data['robots_txt']));
        }

        return true;
    }

    /**
     * Get cached sitemap path
     *
     * @return string
     */
    private function get_cached_sitemap_path() {
        $upload_dir = wp_upload_dir();
        return $upload_dir['basedir'] . '/unicorn-studio/sitemap.xml';
    }

    /**
     * Serve cached sitemap
     *
     * Hook into template_redirect to serve sitemap.xml
     */
    public function maybe_serve_sitemap() {
        if (!isset($_SERVER['REQUEST_URI'])) {
            return;
        }

        $request = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        if ($request !== '/sitemap.xml') {
            return;
        }

        $cached_sitemap = $this->get_cached_sitemap_path();

        if (file_exists($cached_sitemap)) {
            header('Content-Type: application/xml; charset=utf-8');
            header('X-Robots-Tag: noindex, follow');
            readfile($cached_sitemap);
            exit;
        }

        // Fallback: redirect to Unicorn Studio sitemap
        $sitemap_url = $this->get_sitemap_url();
        if ($sitemap_url && strpos($sitemap_url, home_url()) === false) {
            wp_redirect($sitemap_url, 301);
            exit;
        }
    }

    /**
     * Initialize sitemap serving
     */
    public function init() {
        add_action('template_redirect', [$this, 'maybe_serve_sitemap'], 1);
    }

    /**
     * Get last sitemap sync time
     *
     * @return string|false
     */
    public static function get_last_sync() {
        return get_option('unicorn_studio_sitemap_synced', false);
    }

    /**
     * Clear cached sitemap
     *
     * @return bool
     */
    public function clear_cache() {
        $cached_sitemap = $this->get_cached_sitemap_path();

        if (file_exists($cached_sitemap)) {
            return unlink($cached_sitemap);
        }

        return true;
    }
}
