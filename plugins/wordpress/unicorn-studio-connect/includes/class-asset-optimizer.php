<?php
/**
 * Asset Optimizer
 *
 * Removes conflicting CSS/JS on Unicorn Studio pages for optimal performance
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Asset Optimizer Class
 */
class Unicorn_Studio_Asset_Optimizer {

    /**
     * Whether current page is a Unicorn page
     */
    private $is_unicorn_page = false;

    /**
     * Styles to remove (handle patterns)
     */
    private $remove_styles = [
        // Page Builders
        'elementor-*',
        'divi-*',
        'et-*',
        'et_*',
        'wpb-*',
        'vc_*',
        'fl-*',
        'oxygen-*',
        'bricks-*',
        'brizy-*',

        // WordPress Core
        'wp-block-library',
        'wp-block-library-theme',
        'global-styles',
        'classic-theme-styles',
        'core-block-supports',

        // Plugins
        'woocommerce-*',
        'wc-*',
        'contact-form-7',
        'wpforms-*',
        'jetpack-*',
        'yoast-*',
        'wp-seo-*',
        'rank-math-*',
        'cookie-*',
        'gdpr-*',

        // Themes (common patterns)
        'twenty*-style',
        'astra-*',
        'generatepress-*',
        'kadence-*',
        'theme-*',
        'flavor-*',
        'flavor_*',
        'flavor/*',
        'flavor',
        'flavor-flavor',
        'flavor-flavor-*',
    ];

    /**
     * Scripts to remove (handle patterns)
     */
    private $remove_scripts = [
        // jQuery (optional - only in aggressive mode)
        'jquery',
        'jquery-core',
        'jquery-migrate',

        // Page Builders
        'elementor-*',
        'divi-*',
        'et-*',
        'et_*',
        'oxygen-*',
        'bricks-*',
        'brizy-*',

        // Plugins
        'woocommerce-*',
        'wc-*',
        'contact-form-7',
        'jetpack-*',
    ];

    /**
     * Styles to always keep
     */
    private $keep_styles = [
        'unicorn-studio-*',
        'unicorn-*',
        'admin-bar',
        'dashicons',
    ];

    /**
     * Scripts to always keep
     */
    private $keep_scripts = [
        'unicorn-studio-*',
        'unicorn-*',
        'admin-bar',
    ];

    /**
     * Constructor
     */
    public function __construct() {
        // Only run if enabled
        if (!Unicorn_Studio::get_option('asset_optimizer', false)) {
            return;
        }

        add_action('wp', [$this, 'detect_unicorn_page']);
        add_action('wp_enqueue_scripts', [$this, 'remove_assets'], 9999);
        add_action('wp_head', [$this, 'cleanup_head'], 1);
        add_action('wp_footer', [$this, 'cleanup_footer'], 1);

        // Aggressive mode: also remove inline styles
        if (Unicorn_Studio::get_option('aggressive_mode', false)) {
            add_filter('style_loader_tag', [$this, 'filter_style_tag'], 10, 4);
            add_filter('script_loader_tag', [$this, 'filter_script_tag'], 10, 3);
        }
    }

    /**
     * Detect if current page is a Unicorn Studio page
     */
    public function detect_unicorn_page() {
        global $post;

        // 1. Custom Post Type with us_ prefix
        if (is_singular()) {
            $post_type = get_post_type();
            if ($post_type && strpos($post_type, 'us_') === 0) {
                $this->is_unicorn_page = true;
                return;
            }
        }

        // 2. Archive of us_* CPTs
        if (is_post_type_archive()) {
            $post_type = get_query_var('post_type');
            if (is_string($post_type) && strpos($post_type, 'us_') === 0) {
                $this->is_unicorn_page = true;
                return;
            }
        }

        // 3. Taxonomy of us_* CPTs
        if (is_tax()) {
            $queried = get_queried_object();
            if ($queried && isset($queried->taxonomy) && strpos($queried->taxonomy, 'us_') === 0) {
                $this->is_unicorn_page = true;
                return;
            }
        }

        // 4. Page with Unicorn meta
        if (is_page() && $post) {
            if (get_post_meta($post->ID, '_unicorn_studio_id', true)) {
                $this->is_unicorn_page = true;
                return;
            }
        }

        // 5. Frontpage if Unicorn-marked
        if (is_front_page()) {
            $front_page_id = get_option('page_on_front');
            if ($front_page_id && get_post_meta($front_page_id, '_unicorn_studio_id', true)) {
                $this->is_unicorn_page = true;
                return;
            }
        }

        $this->is_unicorn_page = false;
    }

    /**
     * Check if this is a Unicorn page
     *
     * @return bool
     */
    public function is_unicorn_page(): bool {
        return $this->is_unicorn_page;
    }

    /**
     * Remove conflicting CSS/JS assets
     */
    public function remove_assets() {
        if (!$this->is_unicorn_page) {
            return;
        }

        global $wp_styles, $wp_scripts;

        $aggressive = Unicorn_Studio::get_option('aggressive_mode', false);

        // Remove styles
        if ($wp_styles && isset($wp_styles->registered)) {
            foreach ($wp_styles->registered as $handle => $style) {
                // Check if should keep
                if ($this->should_keep($handle, $this->keep_styles)) {
                    continue;
                }

                // In aggressive mode, remove everything except keep list
                if ($aggressive) {
                    wp_dequeue_style($handle);
                    wp_deregister_style($handle);
                    continue;
                }

                // Normal mode: only remove matching patterns
                if ($this->matches_pattern($handle, $this->remove_styles)) {
                    wp_dequeue_style($handle);
                    wp_deregister_style($handle);
                }
            }
        }

        // Remove scripts
        if ($wp_scripts && isset($wp_scripts->registered)) {
            foreach ($wp_scripts->registered as $handle => $script) {
                // Check if should keep
                if ($this->should_keep($handle, $this->keep_scripts)) {
                    continue;
                }

                // In aggressive mode, remove everything except keep list
                // But be careful with jQuery - many things depend on it
                if ($aggressive) {
                    // Keep jQuery unless explicitly in remove list and aggressive mode
                    if (strpos($handle, 'jquery') === 0 && !Unicorn_Studio::get_option('remove_jquery', false)) {
                        continue;
                    }
                    wp_dequeue_script($handle);
                    wp_deregister_script($handle);
                    continue;
                }

                // Normal mode: only remove matching patterns (but not jQuery)
                if ($this->matches_pattern($handle, $this->remove_scripts)) {
                    // Don't remove jQuery in normal mode
                    if (strpos($handle, 'jquery') === 0) {
                        continue;
                    }
                    wp_dequeue_script($handle);
                    wp_deregister_script($handle);
                }
            }
        }
    }

    /**
     * Check if handle matches any pattern in list
     *
     * @param string $handle Handle to check
     * @param array $patterns Patterns to match against
     * @return bool
     */
    private function matches_pattern(string $handle, array $patterns): bool {
        foreach ($patterns as $pattern) {
            // Exact match
            if ($handle === $pattern) {
                return true;
            }

            // Wildcard match (pattern ends with *)
            if (substr($pattern, -1) === '*') {
                $prefix = substr($pattern, 0, -1);
                if (strpos($handle, $prefix) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if handle should be kept
     *
     * @param string $handle Handle to check
     * @param array $keep_list List of handles to keep
     * @return bool
     */
    private function should_keep(string $handle, array $keep_list): bool {
        return $this->matches_pattern($handle, $keep_list);
    }

    /**
     * Cleanup unnecessary items from <head>
     */
    public function cleanup_head() {
        if (!$this->is_unicorn_page) {
            return;
        }

        // Emojis
        remove_action('wp_head', 'print_emoji_detection_script', 7);
        remove_action('wp_print_styles', 'print_emoji_styles');
        remove_action('admin_print_scripts', 'print_emoji_detection_script');
        remove_action('admin_print_styles', 'print_emoji_styles');
        remove_filter('the_content_feed', 'wp_staticize_emoji');
        remove_filter('comment_text_rss', 'wp_staticize_emoji');
        remove_filter('wp_mail', 'wp_staticize_emoji_for_email');

        // oEmbed
        remove_action('wp_head', 'wp_oembed_add_discovery_links');
        remove_action('wp_head', 'wp_oembed_add_host_js');

        // REST API
        remove_action('wp_head', 'rest_output_link_wp_head');

        // Generator meta tag
        remove_action('wp_head', 'wp_generator');

        // Windows Live Writer
        remove_action('wp_head', 'wlwmanifest_link');

        // RSD link
        remove_action('wp_head', 'rsd_link');

        // Shortlink
        remove_action('wp_head', 'wp_shortlink_wp_head');

        // RSS feed links
        remove_action('wp_head', 'feed_links', 2);
        remove_action('wp_head', 'feed_links_extra', 3);

        // Adjacent posts links
        remove_action('wp_head', 'adjacent_posts_rel_link_wp_head');

        // DNS prefetch
        remove_action('wp_head', 'wp_resource_hints', 2);

        // Gutenberg global styles
        remove_action('wp_enqueue_scripts', 'wp_enqueue_global_styles');
        remove_action('wp_body_open', 'wp_global_styles_render_svg_filters');
    }

    /**
     * Cleanup footer
     */
    public function cleanup_footer() {
        if (!$this->is_unicorn_page) {
            return;
        }

        // Remove embed script
        wp_dequeue_script('wp-embed');
    }

    /**
     * Filter style tags (aggressive mode)
     *
     * @param string $html Style tag HTML
     * @param string $handle Handle
     * @param string $href URL
     * @param string $media Media type
     * @return string
     */
    public function filter_style_tag(string $html, string $handle, string $href, string $media): string {
        if (!$this->is_unicorn_page) {
            return $html;
        }

        // Keep unicorn and admin styles
        if ($this->should_keep($handle, $this->keep_styles)) {
            return $html;
        }

        // In aggressive mode, remove everything else
        return '';
    }

    /**
     * Filter script tags (aggressive mode)
     *
     * @param string $tag Script tag HTML
     * @param string $handle Handle
     * @param string $src URL
     * @return string
     */
    public function filter_script_tag(string $tag, string $handle, string $src): string {
        if (!$this->is_unicorn_page) {
            return $tag;
        }

        // Keep unicorn and admin scripts
        if ($this->should_keep($handle, $this->keep_scripts)) {
            return $tag;
        }

        // In aggressive mode, remove everything else
        return '';
    }

    /**
     * Get list of removed assets (for debugging)
     *
     * @return array
     */
    public function get_removed_assets(): array {
        return [
            'styles' => $this->remove_styles,
            'scripts' => $this->remove_scripts,
        ];
    }
}
