<?php
/**
 * Admin Class
 *
 * Handles admin pages and settings
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Admin Class
 */
class Unicorn_Studio_Admin {

    /**
     * Constructor
     */
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
    }

    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_menu_page(
            __('Unicorn Studio', 'unicorn-studio'),
            __('Unicorn Studio', 'unicorn-studio'),
            'manage_options',
            'unicorn-studio',
            [$this, 'render_settings_page'],
            'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>'),
            30
        );

        add_submenu_page(
            'unicorn-studio',
            __('Einstellungen', 'unicorn-studio'),
            __('Einstellungen', 'unicorn-studio'),
            'manage_options',
            'unicorn-studio',
            [$this, 'render_settings_page']
        );

        add_submenu_page(
            'unicorn-studio',
            __('Sync Status', 'unicorn-studio'),
            __('Sync Status', 'unicorn-studio'),
            'manage_options',
            'unicorn-studio-sync',
            [$this, 'render_sync_page']
        );

        add_submenu_page(
            'unicorn-studio',
            __('Design & Komponenten', 'unicorn-studio'),
            __('Design & Komponenten', 'unicorn-studio'),
            'manage_options',
            'unicorn-studio-design',
            [$this, 'render_design_page']
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('unicorn_studio_connection', 'unicorn_studio_api_url', [
            'sanitize_callback' => 'esc_url_raw',
            'default' => 'http://localhost:3000/api/v1',
        ]);
        register_setting('unicorn_studio_connection', 'unicorn_studio_api_key');
        register_setting('unicorn_studio_connection', 'unicorn_studio_site_id');
        register_setting('unicorn_studio_options', 'unicorn_studio_settings');
    }

    /**
     * Enqueue admin scripts
     *
     * @param string $hook Current admin page
     */
    public function enqueue_scripts($hook) {
        if (strpos($hook, 'unicorn-studio') === false) {
            return;
        }

        wp_enqueue_style(
            'unicorn-studio-admin',
            UNICORN_STUDIO_PLUGIN_URL . 'assets/css/admin.css',
            [],
            UNICORN_STUDIO_VERSION
        );

        wp_enqueue_script(
            'unicorn-studio-admin',
            UNICORN_STUDIO_PLUGIN_URL . 'assets/js/admin.js',
            ['jquery'],
            UNICORN_STUDIO_VERSION,
            true
        );

        wp_localize_script('unicorn-studio-admin', 'unicornStudio', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('unicorn_studio_admin'),
            'strings' => [
                'syncing'       => __('Synchronisiere...', 'unicorn-studio'),
                'syncComplete'  => __('Synchronisierung abgeschlossen!', 'unicorn-studio'),
                'syncError'     => __('Fehler bei der Synchronisierung', 'unicorn-studio'),
                'testing'       => __('Teste Verbindung...', 'unicorn-studio'),
                'testSuccess'   => __('Verbindung erfolgreich!', 'unicorn-studio'),
                'testError'     => __('Verbindung fehlgeschlagen', 'unicorn-studio'),
            ],
        ]);
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        include UNICORN_STUDIO_PLUGIN_DIR . 'admin/views/settings.php';
    }

    /**
     * Render sync status page
     */
    public function render_sync_page() {
        include UNICORN_STUDIO_PLUGIN_DIR . 'admin/views/sync.php';
    }

    /**
     * Render design & components page
     */
    public function render_design_page() {
        include UNICORN_STUDIO_PLUGIN_DIR . 'admin/views/design.php';
    }
}
