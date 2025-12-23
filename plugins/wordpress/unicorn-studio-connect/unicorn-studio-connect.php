<?php
/**
 * Plugin Name:       Unicorn Studio Connect
 * Plugin URI:        https://unicorn.studio
 * Description:       Verbindet WordPress mit Unicorn Studio - AI Website Builder & CMS. Synchronisiert Content Types, Entries und Design automatisch.
 * Version:           1.39.0
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
define('UNICORN_STUDIO_VERSION', '1.39.0');
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
    public $site_identity;
    public $seo;
    public $menus;
    public $forms;
    public $media_sync;
    public $scripts;

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
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-menus.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-site-identity.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-seo-manager.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-form-handler.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-media-sync.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-cms-components.php';
        require_once UNICORN_STUDIO_PLUGIN_DIR . 'includes/class-script-manager.php';

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
        $this->site_identity = new Unicorn_Studio_Site_Identity();
        $this->seo = new Unicorn_Studio_SEO_Manager($this->api);
        $this->seo->init();
        $this->menus = Unicorn_Studio_Menus::get_instance();
        $this->forms = new Unicorn_Studio_Form_Handler();
        $this->media_sync = new Unicorn_Studio_Media_Sync();
        $this->scripts = new Unicorn_Studio_Script_Manager();

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

        // Enqueue CMS component JavaScript (from Unicorn Studio components)
        add_action('wp_enqueue_scripts', ['Unicorn_Studio_CMS_Components', 'enqueue_scripts'], 30);

        // Add body classes
        add_filter('body_class', [$this, 'add_page_body_classes']);

        // Add body inline styles
        add_action('wp_head', [$this, 'output_body_styles'], 999);

        // Output page-specific JavaScript in footer
        add_action('wp_footer', [$this, 'output_page_scripts'], 999);

        // Register webhook endpoint
        add_action('rest_api_init', [$this->webhooks, 'register_endpoint']);
        add_action('rest_api_init', [$this->forms, 'register_endpoint']);
        add_action('rest_api_init', [$this->media_sync, 'register_endpoints']);

        // AJAX handlers
        add_action('wp_ajax_unicorn_studio_sync', [$this->sync, 'ajax_sync']);
        add_action('wp_ajax_unicorn_studio_test_connection', [$this->api, 'ajax_test_connection']);

        // Custom robots.txt content (priority 999 to override Yoast etc.)
        add_filter('robots_txt', [$this, 'custom_robots_txt'], 999, 2);

        // Sitemap rewrite rule
        add_action('init', [$this, 'register_sitemap_rewrite']);
        add_action('template_redirect', [$this, 'serve_sitemap']);

        // Optimize images (add srcset for Unsplash, add loading="lazy")
        add_filter('the_content', [$this, 'optimize_images'], 999);
    }

    /**
     * Custom robots.txt content from Unicorn Studio
     */
    public function custom_robots_txt($output, $public) {
        $custom_robots = get_option('unicorn_studio_robots_txt', '');
        if (!empty($custom_robots)) {
            return $custom_robots;
        }
        return $output;
    }

    /**
     * Register sitemap rewrite rule
     */
    public function register_sitemap_rewrite() {
        add_rewrite_rule('^sitemap\.xml$', 'index.php?unicorn_sitemap=1', 'top');
        add_rewrite_tag('%unicorn_sitemap%', '1');
    }

    /**
     * Serve sitemap.xml from uploads folder
     */
    public function serve_sitemap() {
        if (get_query_var('unicorn_sitemap') !== '1') {
            return;
        }

        $upload_dir = wp_upload_dir();
        $sitemap_path = $upload_dir['basedir'] . '/unicorn-studio/sitemap.xml';

        if (file_exists($sitemap_path)) {
            header('Content-Type: application/xml; charset=utf-8');
            header('X-Robots-Tag: noindex');
            readfile($sitemap_path);
            exit;
        }

        // Fallback: Generate sitemap dynamically if not cached
        status_header(404);
        echo '<?xml version="1.0" encoding="UTF-8"?>';
        echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
        exit;
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

        // Fix Tailwind class selectors in querySelectorAll/querySelector
        // Problem: '.group-hover\:scale-110' needs to be '.group-hover\\:scale-110' in JS
        // Single backslash is interpreted as escape char, need double backslash for literal
        $js = $this->fix_tailwind_selectors($js);

        // Output the JS
        echo "\n<script id=\"unicorn-studio-page-js\">\n";
        echo $js;
        echo "\n</script>\n";
    }

    /**
     * Fix Tailwind class selectors in JavaScript
     * Tailwind classes like 'hover:bg-white' need proper CSS escaping in JS selectors
     *
     * @param string $js JavaScript code
     * @return string Fixed JavaScript code
     */
    private function fix_tailwind_selectors($js) {
        // Pattern matches querySelectorAll('...') and querySelector('...')
        // Captures the selector string inside quotes
        $pattern = '/(querySelectorAll|querySelector)\s*\(\s*([\'"])(.+?)\2\s*\)/';

        return preg_replace_callback($pattern, function($matches) {
            $method = $matches[1];
            $quote = $matches[2];
            $selector = $matches[3];

            // Fix single backslash escapes to double backslash
            // e.g., '.group-hover\:scale-110' -> '.group-hover\\:scale-110'
            // But don't double-escape already escaped ones
            $fixed_selector = preg_replace('/(?<!\\\\)\\\\:/', '\\\\:', $selector);
            $fixed_selector = preg_replace('/(?<!\\\\)\\\\\\[/', '\\\\[', $fixed_selector);
            $fixed_selector = preg_replace('/(?<!\\\\)\\\\\\]/', '\\\\]', $fixed_selector);
            $fixed_selector = preg_replace('/(?<!\\\\)\\\\\\./', '\\\\.', $fixed_selector);
            $fixed_selector = preg_replace('/(?<!\\\\)\\\\\\//', '\\\\/', $fixed_selector);

            return $method . '(' . $quote . $fixed_selector . $quote . ')';
        }, $js);
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

        // Only output page-specific CSS if it exists
        // All Tailwind classes (including arbitrary values) are compiled by Tailwind v4
        // and included in the main styles.css - no duplicate generation needed
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
     * Optimize images in content
     * - Add srcset for Unsplash images (responsive images)
     * - Add loading="lazy" for below-fold images
     * - Add decoding="async" for non-blocking decode
     *
     * @param string $content Post content
     * @return string Optimized content
     */
    public function optimize_images($content) {
        if (empty($content)) {
            return $content;
        }

        // Find all img tags
        $pattern = '/<img([^>]*)>/i';

        return preg_replace_callback($pattern, function($matches) {
            $img_tag = $matches[0];
            $attributes = $matches[1];

            // Skip if already has srcset
            if (strpos($attributes, 'srcset') !== false) {
                return $img_tag;
            }

            // Extract src
            if (!preg_match('/src=["\']([^"\']+)["\']/', $attributes, $src_match)) {
                return $img_tag;
            }
            $src = $src_match[1];

            // Check if it's an Unsplash image
            if (strpos($src, 'images.unsplash.com') !== false) {
                $img_tag = $this->add_unsplash_srcset($img_tag, $src, $attributes);
            }

            // Add loading="lazy" if not present and not the first image (likely LCP)
            if (strpos($attributes, 'loading=') === false) {
                // Check if this might be above the fold (hero section)
                $is_hero = (
                    strpos($attributes, 'hero') !== false ||
                    strpos($attributes, 'id="hero') !== false ||
                    preg_match('/class=["\'][^"\']*object-cover[^"\']*["\']/', $attributes)
                );

                if (!$is_hero) {
                    $img_tag = str_replace('<img', '<img loading="lazy"', $img_tag);
                }
            }

            // Add decoding="async" if not present
            if (strpos($attributes, 'decoding=') === false) {
                $img_tag = str_replace('<img', '<img decoding="async"', $img_tag);
            }

            return $img_tag;
        }, $content);
    }

    /**
     * Add srcset for Unsplash images
     *
     * @param string $img_tag Original img tag
     * @param string $src Image URL
     * @param string $attributes Image attributes
     * @return string Modified img tag
     */
    private function add_unsplash_srcset($img_tag, $src, $attributes) {
        // Parse Unsplash URL to get base and parameters
        $url_parts = parse_url($src);
        if (!$url_parts) {
            return $img_tag;
        }

        $base_url = $url_parts['scheme'] . '://' . $url_parts['host'] . $url_parts['path'];

        // Parse existing query params
        $params = [];
        if (isset($url_parts['query'])) {
            parse_str(html_entity_decode($url_parts['query']), $params);
        }

        // Remove width param for base
        unset($params['w']);

        // Define responsive widths
        $widths = [400, 640, 800, 1024, 1280, 1600, 2048];

        // Build srcset
        $srcset_parts = [];
        foreach ($widths as $w) {
            $params['w'] = $w;
            $url = $base_url . '?' . http_build_query($params);
            $srcset_parts[] = esc_url($url) . ' ' . $w . 'w';
        }
        $srcset = implode(', ', $srcset_parts);

        // Default sizes attribute (can be overridden in HTML)
        $sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

        // Add srcset and sizes to img tag
        $img_tag = preg_replace(
            '/src=["\']([^"\']+)["\']/',
            'src="$1" srcset="' . esc_attr($srcset) . '" sizes="' . esc_attr($sizes) . '"',
            $img_tag
        );

        return $img_tag;
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
        'sync_fonts' => true,
        'field_backend' => 'acf',
        'cpt_prefix' => 'us_',
        'enable_gsap' => true,
        'enable_alpine' => true,
        'load_scripts_globally' => true,
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

    // Activate cache headers for static assets (PageSpeed optimization)
    if (class_exists('Unicorn_Studio_Site_Identity')) {
        Unicorn_Studio_Site_Identity::activate_cache_headers();
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
