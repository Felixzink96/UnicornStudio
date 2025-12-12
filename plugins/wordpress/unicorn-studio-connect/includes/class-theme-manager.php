<?php
/**
 * Theme Manager
 *
 * Manages the Unicorn Studio Blank Theme
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Theme Manager Class
 */
class Unicorn_Studio_Theme_Manager {

    /**
     * Theme slug
     */
    const THEME_SLUG = 'unicorn-studio-blank';

    /**
     * Theme source path (in plugin)
     */
    private $theme_source;

    /**
     * Constructor
     */
    public function __construct() {
        $this->theme_source = UNICORN_STUDIO_PLUGIN_DIR . 'themes/' . self::THEME_SLUG;

        // Admin actions
        add_action('admin_post_unicorn_download_theme', [$this, 'handle_download_theme']);
        add_action('wp_ajax_unicorn_install_theme', [$this, 'ajax_install_theme']);
    }

    /**
     * Check if blank theme is installed
     *
     * @return bool
     */
    public static function is_theme_installed(): bool {
        return wp_get_theme(self::THEME_SLUG)->exists();
    }

    /**
     * Check if blank theme is active
     *
     * @return bool
     */
    public static function is_theme_active(): bool {
        return get_option('template') === self::THEME_SLUG;
    }

    /**
     * Get theme status
     *
     * @return array
     */
    public static function get_status(): array {
        return [
            'installed' => self::is_theme_installed(),
            'active'    => self::is_theme_active(),
            'version'   => self::is_theme_installed() ? wp_get_theme(self::THEME_SLUG)->get('Version') : null,
        ];
    }

    /**
     * Generate theme ZIP file
     *
     * @return string|WP_Error Path to ZIP file or error
     */
    public function generate_theme_zip() {
        if (!class_exists('ZipArchive')) {
            return new WP_Error('no_zip', __('ZipArchive ist nicht verfügbar.', 'unicorn-studio'));
        }

        $upload_dir = wp_upload_dir();
        $zip_path = $upload_dir['basedir'] . '/unicorn-studio-blank-theme.zip';

        // Delete old ZIP if exists
        if (file_exists($zip_path)) {
            unlink($zip_path);
        }

        $zip = new ZipArchive();
        if ($zip->open($zip_path, ZipArchive::CREATE) !== true) {
            return new WP_Error('zip_create_failed', __('ZIP konnte nicht erstellt werden.', 'unicorn-studio'));
        }

        // Add all theme files
        $theme_files = $this->get_theme_files();
        foreach ($theme_files as $file) {
            $file_path = $this->theme_source . '/' . $file;
            if (file_exists($file_path)) {
                $zip->addFile($file_path, self::THEME_SLUG . '/' . $file);
            }
        }

        $zip->close();

        return $zip_path;
    }

    /**
     * Get list of theme files
     *
     * @return array
     */
    private function get_theme_files(): array {
        return [
            'style.css',
            'functions.php',
            'index.php',
            'single.php',
            'archive.php',
            'page.php',
            'header.php',
            'header-unicorn.php',
            'footer.php',
            'footer-unicorn.php',
        ];
    }

    /**
     * Handle theme download
     */
    public function handle_download_theme() {
        if (!current_user_can('install_themes')) {
            wp_die(__('Keine Berechtigung.', 'unicorn-studio'));
        }

        check_admin_referer('unicorn_download_theme');

        $zip_path = $this->generate_theme_zip();

        if (is_wp_error($zip_path)) {
            wp_die($zip_path->get_error_message());
        }

        // Send ZIP file
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename="unicorn-studio-blank.zip"');
        header('Content-Length: ' . filesize($zip_path));
        readfile($zip_path);

        // Clean up
        unlink($zip_path);
        exit;
    }

    /**
     * Install theme via AJAX
     */
    public function ajax_install_theme() {
        check_ajax_referer('unicorn_studio_admin', 'nonce');

        if (!current_user_can('install_themes')) {
            wp_send_json_error(['message' => __('Keine Berechtigung.', 'unicorn-studio')]);
        }

        $result = $this->install_theme();

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()]);
        }

        wp_send_json_success(['message' => __('Theme erfolgreich installiert!', 'unicorn-studio')]);
    }

    /**
     * Install theme to WordPress themes directory
     *
     * @return bool|WP_Error
     */
    public function install_theme() {
        $themes_dir = get_theme_root();
        $target_dir = $themes_dir . '/' . self::THEME_SLUG;

        // Check if already installed
        if (self::is_theme_installed()) {
            return new WP_Error('already_installed', __('Theme ist bereits installiert.', 'unicorn-studio'));
        }

        // Create theme directory
        if (!wp_mkdir_p($target_dir)) {
            return new WP_Error('mkdir_failed', __('Theme-Verzeichnis konnte nicht erstellt werden.', 'unicorn-studio'));
        }

        // Copy theme files
        $theme_files = $this->get_theme_files();
        foreach ($theme_files as $file) {
            $source = $this->theme_source . '/' . $file;
            $target = $target_dir . '/' . $file;

            if (file_exists($source)) {
                if (!copy($source, $target)) {
                    return new WP_Error('copy_failed', sprintf(__('Datei %s konnte nicht kopiert werden.', 'unicorn-studio'), $file));
                }
            }
        }

        return true;
    }
}
