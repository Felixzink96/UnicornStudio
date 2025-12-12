<?php
/**
 * Content Types Handler
 *
 * Registers Custom Post Types based on Unicorn Studio Content Types
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Content Types Class
 */
class Unicorn_Studio_Content_Types {

    /**
     * CPT prefix
     */
    private $prefix;

    /**
     * Stored content types
     */
    private $content_types = [];

    /**
     * Constructor
     */
    public function __construct() {
        $this->prefix = Unicorn_Studio::get_option('cpt_prefix', 'us_');
        $this->content_types = get_option('unicorn_studio_content_types', []);
    }

    /**
     * Register all post types from stored content types
     */
    public function register_post_types() {
        foreach ($this->content_types as $type) {
            $this->register_single_post_type($type);
        }
    }

    /**
     * Register a single post type
     *
     * @param array $type Content type data
     */
    private function register_single_post_type($type) {
        $post_type = $this->get_post_type_name($type['name']);

        // Ensure post type name is valid (max 20 chars)
        if (strlen($post_type) > 20) {
            $post_type = substr($post_type, 0, 20);
        }

        $labels = [
            'name'               => $type['label_plural'],
            'singular_name'      => $type['label_singular'],
            'menu_name'          => $type['label_plural'],
            'add_new'            => __('Erstellen', 'unicorn-studio'),
            'add_new_item'       => sprintf(__('%s erstellen', 'unicorn-studio'), $type['label_singular']),
            'edit_item'          => sprintf(__('%s bearbeiten', 'unicorn-studio'), $type['label_singular']),
            'new_item'           => sprintf(__('Neue %s', 'unicorn-studio'), $type['label_singular']),
            'view_item'          => sprintf(__('%s ansehen', 'unicorn-studio'), $type['label_singular']),
            'search_items'       => sprintf(__('%s suchen', 'unicorn-studio'), $type['label_plural']),
            'not_found'          => sprintf(__('Keine %s gefunden', 'unicorn-studio'), $type['label_plural']),
            'not_found_in_trash' => sprintf(__('Keine %s im Papierkorb', 'unicorn-studio'), $type['label_plural']),
            'all_items'          => sprintf(__('Alle %s', 'unicorn-studio'), $type['label_plural']),
        ];

        // Build supports array
        $supports = ['custom-fields'];

        $features = $type['features'] ?? [];
        if ($features['has_title'] ?? true) {
            $supports[] = 'title';
        }
        if ($features['has_content'] ?? false) {
            $supports[] = 'editor';
        }
        if ($features['has_excerpt'] ?? false) {
            $supports[] = 'excerpt';
        }
        if ($features['has_featured_image'] ?? false) {
            $supports[] = 'thumbnail';
        }
        if ($features['has_author'] ?? false) {
            $supports[] = 'author';
        }

        $args = [
            'labels'              => $labels,
            'public'              => true,
            'publicly_queryable'  => $features['has_single'] ?? true,
            'show_ui'             => true,
            'show_in_menu'        => $type['show_in_menu'] ?? true,
            'show_in_nav_menus'   => true,
            'show_in_rest'        => true,
            'has_archive'         => $features['has_archive'] ?? true,
            'rewrite'             => [
                'slug'       => $type['slug'] ?? $type['name'],
                'with_front' => false,
            ],
            'supports'            => $supports,
            'menu_icon'           => $this->get_dashicon($type['icon'] ?? 'file-text'),
            'menu_position'       => 20 + ($type['menu_position'] ?? 0),
            'capability_type'     => 'post',
            'map_meta_cap'        => true,
        ];

        register_post_type($post_type, $args);
    }

    /**
     * Sync content types from API
     *
     * @param array $content_types Content types from API
     */
    public function sync_from_api($content_types) {
        $this->content_types = $content_types;
        update_option('unicorn_studio_content_types', $content_types);

        // Re-register post types
        foreach ($content_types as $type) {
            $this->register_single_post_type($type);
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Get post type name with prefix
     *
     * @param string $content_type_name Content type name
     * @return string Post type name
     */
    public function get_post_type_name($content_type_name) {
        return $this->prefix . sanitize_key($content_type_name);
    }

    /**
     * Get content type by name
     *
     * @param string $name Content type name
     * @return array|null Content type data or null
     */
    public function get_content_type($name) {
        foreach ($this->content_types as $type) {
            if ($type['name'] === $name) {
                return $type;
            }
        }
        return null;
    }

    /**
     * Get content type by post type
     *
     * @param string $post_type WordPress post type
     * @return array|null Content type data or null
     */
    public function get_content_type_by_post_type($post_type) {
        // Remove prefix
        $name = str_replace($this->prefix, '', $post_type);
        return $this->get_content_type($name);
    }

    /**
     * Get all stored content types
     *
     * @return array Content types
     */
    public function get_all() {
        return $this->content_types;
    }

    /**
     * Map Lucide icon to Dashicon
     *
     * @param string $lucide_icon Lucide icon name
     * @return string Dashicon name
     */
    private function get_dashicon($lucide_icon) {
        $map = [
            'file-text'        => 'dashicons-media-text',
            'package'          => 'dashicons-products',
            'users'            => 'dashicons-groups',
            'user'             => 'dashicons-admin-users',
            'calendar'         => 'dashicons-calendar-alt',
            'image'            => 'dashicons-format-image',
            'images'           => 'dashicons-format-gallery',
            'shopping-cart'    => 'dashicons-cart',
            'shopping-bag'     => 'dashicons-products',
            'star'             => 'dashicons-star-filled',
            'message-circle'   => 'dashicons-testimonial',
            'message-square'   => 'dashicons-admin-comments',
            'folder'           => 'dashicons-portfolio',
            'utensils'         => 'dashicons-food',
            'utensils-crossed' => 'dashicons-food',
            'home'             => 'dashicons-admin-home',
            'building'         => 'dashicons-building',
            'briefcase'        => 'dashicons-portfolio',
            'map-pin'          => 'dashicons-location',
            'tag'              => 'dashicons-tag',
            'tags'             => 'dashicons-tag',
            'bookmark'         => 'dashicons-bookmark',
            'heart'            => 'dashicons-heart',
            'award'            => 'dashicons-awards',
            'trophy'           => 'dashicons-awards',
            'clock'            => 'dashicons-clock',
            'video'            => 'dashicons-video-alt3',
            'music'            => 'dashicons-format-audio',
            'book'             => 'dashicons-book',
            'newspaper'        => 'dashicons-media-text',
            'mail'             => 'dashicons-email',
            'phone'            => 'dashicons-phone',
            'link'             => 'dashicons-admin-links',
            'globe'            => 'dashicons-admin-site',
            'settings'         => 'dashicons-admin-generic',
            'tool'             => 'dashicons-admin-tools',
            'truck'            => 'dashicons-car',
            'coffee'           => 'dashicons-coffee',
            'gift'             => 'dashicons-tickets',
            'smile'            => 'dashicons-smiley',
            'frown'            => 'dashicons-smiley',
            'check'            => 'dashicons-yes',
            'x'                => 'dashicons-no',
            'alert-circle'     => 'dashicons-warning',
            'info'             => 'dashicons-info',
            'help-circle'      => 'dashicons-editor-help',
        ];

        return $map[$lucide_icon] ?? 'dashicons-admin-post';
    }

    /**
     * Get prefix
     *
     * @return string CPT prefix
     */
    public function get_prefix() {
        return $this->prefix;
    }
}
