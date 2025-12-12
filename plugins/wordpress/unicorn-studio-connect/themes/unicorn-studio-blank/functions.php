<?php
/**
 * Unicorn Studio Blank Theme Functions
 *
 * Minimales Theme ohne eigenes CSS für Unicorn Studio
 *
 * @package Unicorn_Studio_Blank
 */

defined('ABSPATH') || exit;

/**
 * Theme Setup
 */
add_action('after_setup_theme', function() {
    // Let WordPress manage the document title
    add_theme_support('title-tag');

    // Enable post thumbnails
    add_theme_support('post-thumbnails');

    // HTML5 support
    add_theme_support('html5', [
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
        'style',
        'script',
    ]);

    // Custom logo
    add_theme_support('custom-logo');

    // Editor styles (none)
    add_theme_support('editor-styles');

    // Responsive embeds
    add_theme_support('responsive-embeds');

    // Disable core block patterns
    remove_theme_support('core-block-patterns');
});

/**
 * Remove WordPress default styles
 */
add_action('wp_enqueue_scripts', function() {
    // Block library styles
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');

    // Global styles (Gutenberg)
    wp_dequeue_style('global-styles');

    // Classic theme styles
    wp_dequeue_style('classic-theme-styles');

    // Core block supports
    wp_dequeue_style('core-block-supports');
}, 100);

/**
 * Cleanup wp_head
 */
add_action('after_setup_theme', function() {
    // Emojis
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('admin_print_scripts', 'print_emoji_detection_script');
    remove_action('admin_print_styles', 'print_emoji_styles');

    // Generator meta tag
    remove_action('wp_head', 'wp_generator');

    // Windows Live Writer
    remove_action('wp_head', 'wlwmanifest_link');

    // RSD link
    remove_action('wp_head', 'rsd_link');

    // Shortlink
    remove_action('wp_head', 'wp_shortlink_wp_head');

    // REST API link
    remove_action('wp_head', 'rest_output_link_wp_head');

    // RSS feed links
    remove_action('wp_head', 'feed_links', 2);
    remove_action('wp_head', 'feed_links_extra', 3);

    // oEmbed
    remove_action('wp_head', 'wp_oembed_add_discovery_links');
    remove_action('wp_head', 'wp_oembed_add_host_js');

    // Adjacent posts
    remove_action('wp_head', 'adjacent_posts_rel_link_wp_head');

    // DNS prefetch
    remove_action('wp_head', 'wp_resource_hints', 2);
});

/**
 * Remove Gutenberg inline styles
 */
add_action('wp_enqueue_scripts', function() {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('wc-blocks-style');
    wp_dequeue_style('global-styles');
}, 100);

/**
 * Remove global styles render
 */
remove_action('wp_enqueue_scripts', 'wp_enqueue_global_styles');
remove_action('wp_body_open', 'wp_global_styles_render_svg_filters');

/**
 * Check if current page is a Unicorn Studio page
 *
 * @return bool
 */
function unicorn_is_unicorn_page(): bool {
    global $post;

    // Custom Post Type with us_ prefix
    if (is_singular()) {
        $post_type = get_post_type();
        if ($post_type && strpos($post_type, 'us_') === 0) {
            return true;
        }
    }

    // Archive of us_* CPTs
    if (is_post_type_archive()) {
        $post_type = get_query_var('post_type');
        if (is_string($post_type) && strpos($post_type, 'us_') === 0) {
            return true;
        }
    }

    // Page with Unicorn meta
    if (is_page() && $post) {
        if (get_post_meta($post->ID, '_unicorn_studio_id', true)) {
            return true;
        }
    }

    // Frontpage if Unicorn-marked
    if (is_front_page()) {
        $front_page_id = get_option('page_on_front');
        if ($front_page_id && get_post_meta($front_page_id, '_unicorn_studio_id', true)) {
            return true;
        }
    }

    return false;
}

/**
 * Get appropriate header
 */
function unicorn_get_header(): void {
    if (unicorn_is_unicorn_page()) {
        get_header('unicorn');
    } else {
        get_header();
    }
}

/**
 * Get appropriate footer
 */
function unicorn_get_footer(): void {
    if (unicorn_is_unicorn_page()) {
        get_footer('unicorn');
    } else {
        get_footer();
    }
}
