<?php
/**
 * Plugin Name:       Unicorn Studio Connect
 * Plugin URI:        https://unicorn.studio
 * Description:       Verbindet WordPress mit Unicorn Studio - AI Website Builder & CMS. Synchronisiert Content Types, Entries und Design automatisch.
 * Version:           1.16.0
 * Requires at least: 6.0
 * Requires PHP:      8.0
 * Author:            Unicorn Factory
 * Author URI:        https://unicorn.studio
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       unicorn-studio
 * Domain Path:       /languages
 */

// Prevent direct access
defined('ABSPATH') || exit;

// Plugin Constants
define('UNICORN_STUDIO_VERSION', '1.16.0');
define('UNICORN_STUDIO_PLUGIN_FILE', __FILE__);
define('UNICORN_STUDIO_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('UNICORN_STUDIO_PLUGIN_URL', plugin_dir_url(__FILE__));
define('UNICORN_STUDIO_PLUGIN_BASENAME', plugin_basename(__FILE__));

// Default API URL (can be overridden in wp-config.php or settings)
if (!defined('UNICORN_STUDIO_API_URL')) {
    // Try to get from options first, fallback to localhost for development
    $saved_api_url = get_option('unicorn_studio_api_url', '');
    define('UNICORN_STUDIO_API_URL', $saved_api_url ?: 'http://localhost:3000/api/v1');
}

/**
 * Autoloader for plugin classes
 */
spl_autoload_register(function ($class) {
    $prefix = 'Unicorn_Studio_';

    if (strpos($class, $prefix) !== 0) {
        return;
    }

    $relative_class = substr($class, strlen($prefix));
    $file = UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-' .
            strtolower(str_replace('_', '-', $relative_class)) . '.php';

    if (file_exists($file)) {
        require $file;
    }
});

/**
 * Main Plugin Class
 */
final class Unicorn_Studio {

    /**
     * Single instance
     */
    private static $instance = null;

    /**
     * Plugin components
     */
    public $api;
    public $sync;
    public $content_types;
    public $fields;
    public $entries;
    public $taxonomies;
    public $pages;
    public $css;
    public $fonts;
    public $webhooks;
    public $asset_optimizer;
    public $theme_manager;
    public $template_converter;
    public $template_loader;
    public $global_components;
    public $admin_bar;

    /**
     * Get single instance
     */
    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->check_requirements();
        $this->load_dependencies();
        $this->init_hooks();
    }

    /**
     * Check PHP and WordPress requirements
     */
    private function check_requirements() {
        if (version_compare(PHP_VERSION, '8.0', '<')) {
            add_action('admin_notices', function() {
                echo '<div class="error"><p>';
                echo esc_html__('Unicorn Studio Connect benötigt PHP 8.0 oder höher.', 'unicorn-studio');
                echo '</p></div>';
            });
            return;
        }
    }

    /**
     * Load plugin dependencies
     */
    private function load_dependencies() {
        // Core classes
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-api-client.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-sync-manager.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-content-types.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-fields.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-entries.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-taxonomies.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-pages.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-css-manager.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-font-manager.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-webhook-handler.php';

        // New feature classes
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-asset-optimizer.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-theme-manager.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-template-converter.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-template-loader.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-global-components.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-admin-bar.php';

        // Initialize components
        $this->api = new Unicorn_Studio_API_Client();
        $this->sync = new Unicorn_Studio_Sync_Manager($this->api);
        $this->content_types = new Unicorn_Studio_Content_Types();
        $this->fields = new Unicorn_Studio_Fields();
        $this->entries = new Unicorn_Studio_Entries($this->api);
        $this->taxonomies = new Unicorn_Studio_Taxonomies();
        $this->pages = new Unicorn_Studio_Pages($this->api);
        $this->css = new Unicorn_Studio_CSS_Manager($this->api);
        $this->fonts = new Unicorn_Studio_Font_Manager($this->api);
        $this->webhooks = new Unicorn_Studio_Webhook_Handler();

        // New feature components
        $this->asset_optimizer = new Unicorn_Studio_Asset_Optimizer();
        $this->theme_manager = new Unicorn_Studio_Theme_Manager();
        $this->template_converter = new Unicorn_Studio_Template_Converter();
        $this->template_loader = new Unicorn_Studio_Template_Loader();
        $this->global_components = new Unicorn_Studio_Global_Components();
        $this->global_components->init();

        // Admin bar / floating button (frontend only)
        if (!is_admin()) {
            $this->admin_bar = new Unicorn_Studio_Admin_Bar();
            $this->admin_bar->init();
        }

        // Admin classes
        if (is_admin()) {
            require_once UNICORN_STUDIO_PLUGIN_DIR . 'admin/class-admin.php';
            new Unicorn_Studio_Admin();
        }
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        // Load translations
        add_action('init', [$this, 'load_textdomain']);

        // Register post types and taxonomies early
        add_action('init', [$this->content_types, 'register_post_types'], 5);
        add_action('init', [$this->taxonomies, 'register_taxonomies'], 5);

        // Register ACF fields
        add_action('acf/init', [$this->fields, 'register_field_groups']);

        // Enqueue frontend CSS (priority 20 to run after theme styles)
        add_action('wp_enqueue_scripts', [$this->css, 'enqueue_styles'], 20);

        // Output page-specific CSS in head
        add_action('wp_head', [$this, 'output_page_styles'], 999);

        // Output local fonts (GDPR-compliant)
        add_action('wp_head', [$this->fonts, 'output_font_preloads'], 5);
        add_action('wp_enqueue_scripts', [$this->fonts, 'enqueue_fonts'], 25);

        // Add body classes
        add_filter('body_class', [$this, 'add_page_body_classes']);

        // Add body inline styles
        add_action('wp_head', [$this, 'output_body_styles'], 999);

        // Output page-specific JavaScript in footer
        add_action('wp_footer', [$this, 'output_page_scripts'], 999);

        // Register webhook endpoint
        add_action('rest_api_init', [$this->webhooks, 'register_endpoint']);

        // AJAX handlers
        add_action('wp_ajax_unicorn_studio_sync', [$this->sync, 'ajax_sync']);
        add_action('wp_ajax_unicorn_studio_test_connection', [$this->api, 'ajax_test_connection']);
    }

    /**
     * Load plugin translations
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            'unicorn-studio',
            false,
            dirname(UNICORN_STUDIO_PLUGIN_BASENAME) . '/languages/'
        );
    }

    /**
     * Output page-specific JavaScript in footer
     * This outputs JS that was extracted from synced Unicorn Studio pages
     */
    public function output_page_scripts() {
        // Only on singular pages
        if (!is_singular('page')) {
            return;
        }

        global $post;
        if (!$post) {
            return;
        }

        // Check if this is a Unicorn Studio page
        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        if (!$unicorn_id) {
            return;
        }

        // Get the extracted JS
        $js = get_post_meta($post->ID, '_unicorn_studio_js', true);
        if (empty($js)) {
            return;
        }

        // Output the JS
        echo "\n<script id=\"unicorn-studio-page-js\">\n";
        echo $js;
        echo "\n</script>\n";
    }

    /**
     * Output page-specific CSS in head
     */
    public function output_page_styles() {
        if (!is_singular('page')) {
            return;
        }

        global $post;
        if (!$post) {
            return;
        }

        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        if (!$unicorn_id) {
            return;
        }

        $css = get_post_meta($post->ID, '_unicorn_studio_css', true);
        if (empty($css)) {
            return;
        }

        echo "\n<style id=\"unicorn-studio-page-css\">\n";
        echo $css;
        echo "\n</style>\n";
    }

    /**
     * Output page-specific fonts in head
     * DEPRECATED: Fonts are now loaded locally via Font Manager for GDPR compliance
     * This method is kept for backwards compatibility but does nothing
     */
    public function output_page_fonts() {
        // GDPR-compliant: Fonts are now loaded locally via Font Manager
        // See Unicorn_Studio_Font_Manager::enqueue_fonts()
        // This prevents external requests to Google Fonts CDN
    }

    /**
     * Add body classes from Unicorn Studio page
     */
    public function add_page_body_classes($classes) {
        if (!is_singular('page')) {
            return $classes;
        }

        global $post;
        if (!$post) {
            return $classes;
        }

        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        if (!$unicorn_id) {
            return $classes;
        }

        $body_classes = get_post_meta($post->ID, '_unicorn_studio_body_classes', true);
        if (!empty($body_classes)) {
            // Split and add each class
            $custom_classes = explode(' ', $body_classes);
            foreach ($custom_classes as $class) {
                $class = trim($class);
                if (!empty($class)) {
                    $classes[] = sanitize_html_class($class);
                }
            }
        }

        return $classes;
    }

    /**
     * Output body inline styles
     */
    public function output_body_styles() {
        if (!is_singular('page')) {
            return;
        }

        global $post;
        if (!$post) {
            return;
        }

        $unicorn_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        if (!$unicorn_id) {
            return;
        }

        $body_styles = get_post_meta($post->ID, '_unicorn_studio_body_styles', true);
        if (empty($body_styles)) {
            return;
        }

        // Also check for CSS that might have body styles
        $css = get_post_meta($post->ID, '_unicorn_studio_css', true);

        // Extract body background-color from custom CSS if present
        $body_bg = '';
        if (!empty($css) && preg_match('/body\s*\{[^}]*background(?:-color)?\s*:\s*([^;]+)/i', $css, $matches)) {
            $body_bg = trim($matches[1]);
        }

        echo "\n<style id=\"unicorn-studio-body-styles\">\n";
        echo "body {\n";
        if (!empty($body_styles)) {
            echo "    " . esc_html($body_styles) . "\n";
        }
        if (!empty($body_bg)) {
            echo "    background-color: " . esc_html($body_bg) . ";\n";
        }
        echo "}\n";
        echo "</style>\n";
    }

    /**
     * Get plugin option
     */
    public static function get_option($key, $default = null) {
        $options = get_option('unicorn_studio_settings', []);
        return $options[$key] ?? $default;
    }

    /**
     * Update plugin option
     */
    public static function update_option($key, $value) {
        $options = get_option('unicorn_studio_settings', []);
        $options[$key] = $value;
        update_option('unicorn_studio_settings', $options);
    }

    /**
     * Check if connected to Unicorn Studio
     */
    public static function is_connected() {
        return !empty(get_option('unicorn_studio_api_key')) &&
               !empty(get_option('unicorn_studio_site_id'));
    }

    /**
     * Get API Key
     */
    public static function get_api_key() {
        return get_option('unicorn_studio_api_key', '');
    }

    /**
     * Get Site ID
     */
    public static function get_site_id() {
        return get_option('unicorn_studio_site_id', '');
    }
}

/**
 * Initialize plugin
 */
function unicorn_studio() {
    return Unicorn_Studio::instance();
}

// Start the plugin
add_action('plugins_loaded', 'unicorn_studio');

/**
 * Activation hook
 */
register_activation_hook(__FILE__, function() {
    // Set default options
    add_option('unicorn_studio_api_key', '');
    add_option('unicorn_studio_site_id', '');
    add_option('unicorn_studio_webhook_secret', wp_generate_password(32, false));
    add_option('unicorn_studio_css_version', '0');
    add_option('unicorn_studio_last_sync', '');
    add_option('unicorn_studio_content_types', []);
    add_option('unicorn_studio_taxonomies', []);

    // Default settings
    add_option('unicorn_studio_settings', [
        'auto_sync' => true,
        'sync_content_types' => true,
        'sync_entries' => true,
        'sync_taxonomies' => true,
        'sync_pages' => true,
        'sync_media' => true,
        'sync_css' => true,
        'field_backend' => 'acf',
        'cpt_prefix' => 'us_',
    ]);

    // Create CSS and fonts directories
    $upload_dir = wp_upload_dir();
    $css_dir = $upload_dir['basedir'] . '/unicorn-studio/';
    $fonts_dir = $upload_dir['basedir'] . '/unicorn-studio/fonts/';
    if (!file_exists($css_dir)) {
        wp_mkdir_p($css_dir);
    }
    if (!file_exists($fonts_dir)) {
        wp_mkdir_p($fonts_dir);
    }

    // Flush rewrite rules
    flush_rewrite_rules();
});

/**
 * Deactivation hook
 */
register_deactivation_hook(__FILE__, function() {
    flush_rewrite_rules();
});

/**
 * Uninstall hook (in separate uninstall.php for security)
 */
