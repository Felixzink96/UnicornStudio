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

        // Add "Edit with Unicorn Studio" functionality
        add_action('add_meta_boxes', [$this, 'add_editor_meta_box']);
        add_filter('page_row_actions', [$this, 'add_row_action'], 10, 2);
        add_filter('post_row_actions', [$this, 'add_row_action'], 10, 2);

        // Add admin bar button (like Elementor)
        add_action('admin_bar_menu', [$this, 'add_admin_bar_button'], 100);
        add_action('admin_head', [$this, 'admin_bar_styles']);
        add_action('wp_head', [$this, 'admin_bar_styles']);

        // Intercept editor page early to prevent WP admin wrapper
        add_action('admin_init', [$this, 'maybe_render_fullscreen_editor']);
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

        add_submenu_page(
            'unicorn-studio',
            __('CSS Debug', 'unicorn-studio'),
            __('CSS Debug', 'unicorn-studio'),
            'manage_options',
            'unicorn-studio-css-debug',
            [$this, 'render_css_debug_page']
        );

        // Hidden page for iframe editor (no menu item)
        add_submenu_page(
            null, // No parent = hidden from menu
            __('Editor', 'unicorn-studio'),
            __('Editor', 'unicorn-studio'),
            'edit_pages',
            'unicorn-studio-editor',
            [$this, 'render_editor_iframe']
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

    /**
     * Render CSS Debug page
     */
    public function render_css_debug_page() {
        include UNICORN_STUDIO_PLUGIN_DIR . 'admin/views/css-debug.php';
    }

    /**
     * Check if we should render fullscreen editor (called early in admin_init)
     */
    public function maybe_render_fullscreen_editor() {
        // Check if this is the editor page request
        if (!isset($_GET['page']) || $_GET['page'] !== 'unicorn-studio-editor') {
            return;
        }

        if (!isset($_GET['post_id']) || !current_user_can('edit_pages')) {
            return;
        }

        // Render fullscreen editor and exit early (before WP admin renders)
        $this->render_editor_iframe();
    }

    /**
     * Render fullscreen editor iframe (Elementor-style)
     */
    public function render_editor_iframe() {
        // This outputs a full HTML page, not within WP admin
        include UNICORN_STUDIO_PLUGIN_DIR . 'admin/views/editor-iframe.php';
        exit; // Stop WordPress from rendering anything else
    }

    /**
     * Add meta box for Unicorn Studio editor link
     */
    public function add_editor_meta_box() {
        add_meta_box(
            'unicorn_studio_editor',
            __('Unicorn Studio', 'unicorn-studio'),
            [$this, 'render_editor_meta_box'],
            'page',
            'side',
            'high'
        );
    }

    /**
     * Render the editor meta box
     *
     * @param WP_Post $post Current post object
     */
    public function render_editor_meta_box($post) {
        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        $site_id = get_option('unicorn_studio_site_id');

        if ($unicorn_id && $site_id) {
            // Build iframe editor URL (internal WordPress page)
            $editor_url = admin_url('admin.php?page=unicorn-studio-editor&post_id=' . $post->ID);

            $last_sync = get_post_meta($post->ID, '_unicorn_studio_sync', true);
            ?>
            <div class="unicorn-studio-meta-box">
                <p style="margin-bottom: 12px;">
                    <a href="<?php echo esc_url($editor_url); ?>"
                       class="button button-primary button-large"
                       style="width: 100%; text-align: center; display: block;">
                        <span class="dashicons dashicons-edit" style="margin-top: 4px;"></span>
                        <?php esc_html_e('Mit Unicorn Studio bearbeiten', 'unicorn-studio'); ?>
                    </a>
                </p>

                <?php if ($last_sync) : ?>
                    <p class="description" style="margin: 0;">
                        <small>
                            <?php esc_html_e('Letzte Synchronisierung:', 'unicorn-studio'); ?>
                            <br>
                            <?php echo esc_html($last_sync); ?>
                        </small>
                    </p>
                <?php endif; ?>
            </div>
            <?php
        } else {
            ?>
            <p class="description">
                <?php esc_html_e('Diese Seite ist nicht mit Unicorn Studio verknüpft.', 'unicorn-studio'); ?>
            </p>
            <p>
                <a href="<?php echo esc_url(admin_url('admin.php?page=unicorn-studio-sync')); ?>" class="button">
                    <?php esc_html_e('Seiten synchronisieren', 'unicorn-studio'); ?>
                </a>
            </p>
            <?php
        }
    }

    /**
     * Add "Edit with Unicorn Studio" to page/post row actions
     *
     * @param array   $actions Existing actions
     * @param WP_Post $post    Post object
     * @return array Modified actions
     */
    public function add_row_action($actions, $post) {
        // Only for pages
        if ($post->post_type !== 'page') {
            return $actions;
        }

        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        $site_id = get_option('unicorn_studio_site_id');

        if (!$unicorn_id || !$site_id) {
            return $actions;
        }

        // Build iframe editor URL (internal WordPress page)
        $editor_url = admin_url('admin.php?page=unicorn-studio-editor&post_id=' . $post->ID);

        // Add the action after "Edit"
        $new_actions = [];
        foreach ($actions as $key => $action) {
            $new_actions[$key] = $action;
            if ($key === 'edit') {
                $new_actions['unicorn_edit'] = sprintf(
                    '<a href="%s" style="color: #9333ea; font-weight: 500;">%s</a>',
                    esc_url($editor_url),
                    esc_html__('Unicorn Studio', 'unicorn-studio')
                );
            }
        }

        return $new_actions;
    }

    /**
     * Get the Unicorn Studio iframe editor URL for a page
     *
     * @param int $post_id WordPress post ID
     * @return string|false Editor URL or false if not a Unicorn page
     */
    public static function get_editor_url($post_id) {
        $unicorn_id = get_post_meta($post_id, '_unicorn_studio_id', true);
        $site_id = get_option('unicorn_studio_site_id');

        if (!$unicorn_id || !$site_id) {
            return false;
        }

        return admin_url('admin.php?page=unicorn-studio-editor&post_id=' . $post_id);
    }

    /**
     * Add Unicorn Studio button to admin bar (like Elementor)
     *
     * @param WP_Admin_Bar $admin_bar Admin bar object
     */
    public function add_admin_bar_button($admin_bar) {
        // Only show on page edit screens or frontend page views
        $post_id = $this->get_current_post_id();
        if (!$post_id) {
            return;
        }

        // Check if this page has a Unicorn Studio ID
        $unicorn_id = get_post_meta($post_id, '_unicorn_studio_id', true);
        $site_id = get_option('unicorn_studio_site_id');

        if (!$unicorn_id || !$site_id) {
            return;
        }

        // Check user permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Build editor URL
        $editor_url = admin_url('admin.php?page=unicorn-studio-editor&post_id=' . $post_id);

        // Add the main button
        $admin_bar->add_node([
            'id'    => 'unicorn-studio-edit',
            'title' => '<span class="ab-icon"></span><span class="ab-label">' . __('Mit Unicorn Studio bearbeiten', 'unicorn-studio') . '</span>',
            'href'  => $editor_url,
            'meta'  => [
                'class' => 'unicorn-studio-admin-bar-button',
                'title' => __('Diese Seite mit Unicorn Studio bearbeiten', 'unicorn-studio'),
            ],
        ]);
    }

    /**
     * Get current post ID from admin or frontend context
     *
     * @return int|false Post ID or false
     */
    private function get_current_post_id() {
        // Admin: Check for post.php?post=123
        if (is_admin()) {
            global $pagenow, $post;

            // Page/post edit screen
            if ($pagenow === 'post.php' && isset($_GET['post'])) {
                return intval($_GET['post']);
            }

            // If we have a global $post
            if ($post && $post->ID) {
                return $post->ID;
            }

            return false;
        }

        // Frontend: Get the queried object
        if (is_singular('page')) {
            return get_queried_object_id();
        }

        return false;
    }

    /**
     * Add styles for admin bar button
     */
    public function admin_bar_styles() {
        // Only output if user can edit pages
        if (!current_user_can('edit_pages')) {
            return;
        }
        ?>
        <style>
            #wpadminbar .unicorn-studio-admin-bar-button > a {
                background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%) !important;
                color: #ffffff !important;
            }
            #wpadminbar .unicorn-studio-admin-bar-button > a:hover {
                background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%) !important;
            }
            #wpadminbar .unicorn-studio-admin-bar-button .ab-icon::before {
                content: '\f116';
                top: 3px;
                font-family: dashicons;
            }
            #wpadminbar .unicorn-studio-admin-bar-button .ab-label {
                margin-left: 4px;
            }
            @media screen and (max-width: 782px) {
                #wpadminbar .unicorn-studio-admin-bar-button .ab-label {
                    display: none;
                }
            }
        </style>
        <?php
    }
}
