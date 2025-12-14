<?php
/**
 * Site Identity Manager
 *
 * Manages Logo, Favicon, OG Image and Tagline from Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Site Identity Class
 */
class Unicorn_Studio_Site_Identity {

    /**
     * Constructor - Register hooks
     */
    public function __construct() {
        // Output logo, favicon, og:image in wp_head
        add_action('wp_head', [$this, 'output_head_meta'], 1);

        // Add theme support for custom logo
        add_action('after_setup_theme', [$this, 'add_theme_support']);
    }

    /**
     * Add theme support for custom logo
     */
    public function add_theme_support() {
        add_theme_support('custom-logo', [
            'height'      => 100,
            'width'       => 400,
            'flex-height' => true,
            'flex-width'  => true,
        ]);
    }

    /**
     * Output head meta tags (favicon, og:image)
     */
    public function output_head_meta() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $favicon_url = get_option('unicorn_studio_favicon_url', '');
        $og_image_url = get_option('unicorn_studio_og_image_url', '');
        $tagline = get_option('unicorn_studio_tagline', '');

        // Favicon
        if (!empty($favicon_url)) {
            echo "\n<!-- Unicorn Studio Favicon -->\n";
            echo '<link rel="icon" href="' . esc_url($favicon_url) . '" type="image/x-icon">' . "\n";
            echo '<link rel="shortcut icon" href="' . esc_url($favicon_url) . '">' . "\n";
            echo '<link rel="apple-touch-icon" href="' . esc_url($favicon_url) . '">' . "\n";
        }

        // Default OG Image (if post has no featured image)
        if (!empty($og_image_url) && !has_post_thumbnail()) {
            echo "\n<!-- Unicorn Studio Default OG Image -->\n";
            echo '<meta property="og:image" content="' . esc_url($og_image_url) . '">' . "\n";
            echo '<meta name="twitter:image" content="' . esc_url($og_image_url) . '">' . "\n";
        }

        // Tagline as fallback description
        if (!empty($tagline)) {
            // Only output if no SEO plugin is handling this
            if (!$this->has_seo_plugin()) {
                echo "\n<!-- Unicorn Studio Tagline -->\n";
                echo '<meta name="description" content="' . esc_attr($tagline) . '">' . "\n";
            }
        }
    }

    /**
     * Check if a SEO plugin is active
     */
    private function has_seo_plugin() {
        return (
            defined('WPSEO_VERSION') || // Yoast SEO
            defined('RANK_MATH_VERSION') || // RankMath
            class_exists('All_in_One_SEO_Pack') || // AIOSEO
            defined('JETRANKINGS_VERSION') // JetRankings
        );
    }

    /**
     * Get logo URL
     *
     * @return string Logo URL or empty string
     */
    public static function get_logo_url() {
        return get_option('unicorn_studio_logo_url', '');
    }

    /**
     * Get logo dark URL
     *
     * @return string Logo dark URL or empty string
     */
    public static function get_logo_dark_url() {
        return get_option('unicorn_studio_logo_dark_url', '');
    }

    /**
     * Get favicon URL
     *
     * @return string Favicon URL or empty string
     */
    public static function get_favicon_url() {
        return get_option('unicorn_studio_favicon_url', '');
    }

    /**
     * Get OG image URL
     *
     * @return string OG image URL or empty string
     */
    public static function get_og_image_url() {
        return get_option('unicorn_studio_og_image_url', '');
    }

    /**
     * Get tagline
     *
     * @return string Tagline or empty string
     */
    public static function get_tagline() {
        return get_option('unicorn_studio_tagline', '');
    }

    /**
     * Update site identity from sync data
     *
     * @param array $data Site identity data
     * @return bool Success
     */
    public static function sync($data) {
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        if ($debug) {
            error_log('[Unicorn Studio Site Identity] Syncing: ' . print_r($data, true));
        }

        // Logo
        if (isset($data['logo_url'])) {
            update_option('unicorn_studio_logo_url', sanitize_url($data['logo_url']));
        }

        // Logo Dark
        if (isset($data['logo_dark_url'])) {
            update_option('unicorn_studio_logo_dark_url', sanitize_url($data['logo_dark_url']));
        }

        // Favicon
        if (isset($data['favicon_url'])) {
            update_option('unicorn_studio_favicon_url', sanitize_url($data['favicon_url']));
        }

        // OG Image
        if (isset($data['og_image_url'])) {
            update_option('unicorn_studio_og_image_url', sanitize_url($data['og_image_url']));
        }

        // Tagline
        if (isset($data['tagline'])) {
            update_option('unicorn_studio_tagline', sanitize_text_field($data['tagline']));
        }

        if ($debug) {
            error_log('[Unicorn Studio Site Identity] Sync complete');
        }

        return true;
    }

    /**
     * Get logo HTML for use in templates
     *
     * @param string $class CSS classes
     * @param bool $link Wrap in link to home
     * @return string HTML
     */
    public static function get_logo_html($class = 'h-8 w-auto', $link = true) {
        $logo_url = self::get_logo_url();

        if (empty($logo_url)) {
            return '';
        }

        $site_name = get_bloginfo('name');
        $img = '<img src="' . esc_url($logo_url) . '" alt="' . esc_attr($site_name) . '" class="' . esc_attr($class) . '">';

        if ($link) {
            return '<a href="' . esc_url(home_url('/')) . '" class="flex items-center">' . $img . '</a>';
        }

        return $img;
    }

    /**
     * Clear all site identity options
     */
    public static function clear() {
        delete_option('unicorn_studio_logo_url');
        delete_option('unicorn_studio_logo_dark_url');
        delete_option('unicorn_studio_favicon_url');
        delete_option('unicorn_studio_og_image_url');
        delete_option('unicorn_studio_tagline');
    }
}
