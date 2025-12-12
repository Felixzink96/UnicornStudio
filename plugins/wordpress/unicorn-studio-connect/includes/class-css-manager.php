<?php
/**
 * CSS Manager
 *
 * Downloads and manages CSS from Unicorn Studio (GDPR compliant - local hosting)
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * CSS Manager Class
 */
class Unicorn_Studio_CSS_Manager {

    /**
     * API Client
     */
    private $api;

    /**
     * CSS directory path
     */
    private $css_dir;

    /**
     * CSS directory URL
     */
    private $css_url;

    /**
     * Constructor
     *
     * @param Unicorn_Studio_API_Client $api API client
     */
    public function __construct($api) {
        $this->api = $api;

        $upload_dir = wp_upload_dir();
        $this->css_dir = $upload_dir['basedir'] . '/unicorn-studio/';
        $this->css_url = $upload_dir['baseurl'] . '/unicorn-studio/';
    }

    /**
     * Enqueue CSS in frontend
     */
    public function enqueue_styles() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        if (!Unicorn_Studio::get_option('sync_css', true)) {
            return;
        }

        $css_file = $this->css_dir . 'styles.css';
        $version = get_option('unicorn_studio_css_version', '1');

        if (file_exists($css_file)) {
            wp_enqueue_style(
                'unicorn-studio-styles',
                $this->css_url . 'styles.css',
                [],
                $version
            );
        }
    }

    /**
     * Sync CSS from Unicorn Studio
     *
     * @return bool|WP_Error
     */
    public function sync_css() {
        // Get CSS from API
        $css = $this->api->get_css();

        if ($css === false) {
            return new WP_Error('css_fetch_failed', __('CSS konnte nicht abgerufen werden.', 'unicorn-studio'));
        }

        // Ensure directory exists
        if (!file_exists($this->css_dir)) {
            wp_mkdir_p($this->css_dir);
        }

        // Add .htaccess for security
        $htaccess = $this->css_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            file_put_contents($htaccess, "Options -Indexes\n");
        }

        // Write CSS file
        $css_file = $this->css_dir . 'styles.css';
        $result = file_put_contents($css_file, $css);

        if ($result === false) {
            return new WP_Error('css_write_failed', __('CSS konnte nicht gespeichert werden.', 'unicorn-studio'));
        }

        // Update version for cache busting
        update_option('unicorn_studio_css_version', time());

        return true;
    }

    /**
     * Check if CSS update is available
     *
     * @return bool
     */
    public function check_for_updates() {
        $local_version = get_option('unicorn_studio_css_version', '0');
        $response = $this->api->get_css_version();

        if (is_wp_error($response)) {
            return false;
        }

        $remote_version = $response['data']['version'] ?? '0';

        return $remote_version > $local_version;
    }

    /**
     * Get CSS file path
     *
     * @return string
     */
    public function get_css_path() {
        return $this->css_dir . 'styles.css';
    }

    /**
     * Get CSS file URL
     *
     * @return string
     */
    public function get_css_url() {
        return $this->css_url . 'styles.css';
    }

    /**
     * Check if CSS file exists
     *
     * @return bool
     */
    public function css_exists() {
        return file_exists($this->get_css_path());
    }

    /**
     * Get CSS file size
     *
     * @return string Human readable size
     */
    public function get_css_size() {
        $path = $this->get_css_path();

        if (!file_exists($path)) {
            return '0 KB';
        }

        $size = filesize($path);
        return size_format($size);
    }

    /**
     * Get last modified time
     *
     * @return string|false Formatted date or false
     */
    public function get_last_modified() {
        $path = $this->get_css_path();

        if (!file_exists($path)) {
            return false;
        }

        return date_i18n(get_option('date_format') . ' ' . get_option('time_format'), filemtime($path));
    }

    /**
     * Delete CSS file
     *
     * @return bool
     */
    public function delete_css() {
        $path = $this->get_css_path();

        if (file_exists($path)) {
            return unlink($path);
        }

        return true;
    }
}
