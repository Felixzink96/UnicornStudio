<?php
/**
 * Taxonomies Handler
 *
 * Registers Custom Taxonomies based on Unicorn Studio Taxonomies
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Taxonomies Class
 */
class Unicorn_Studio_Taxonomies {

    /**
     * Taxonomy prefix
     */
    private $prefix;

    /**
     * Stored taxonomies
     */
    private $taxonomies = [];

    /**
     * Constructor
     */
    public function __construct() {
        $this->prefix = Unicorn_Studio::get_option('cpt_prefix', 'us_');
        $this->taxonomies = get_option('unicorn_studio_taxonomies', []);
    }

    /**
     * Register all taxonomies
     */
    public function register_taxonomies() {
        foreach ($this->taxonomies as $taxonomy) {
            $this->register_single_taxonomy($taxonomy);
        }
    }

    /**
     * Register a single taxonomy
     *
     * @param array $taxonomy Taxonomy data
     */
    private function register_single_taxonomy($taxonomy) {
        $tax_name = $this->get_taxonomy_name($taxonomy['name']);

        // Get associated post types
        $post_types = [];
        if (!empty($taxonomy['content_types'])) {
            foreach ($taxonomy['content_types'] as $ct) {
                $post_types[] = unicorn_studio()->content_types->get_post_type_name($ct['name'] ?? $ct);
            }
        }

        $labels = [
            'name'              => $taxonomy['label_plural'],
            'singular_name'     => $taxonomy['label_singular'],
            'search_items'      => sprintf(__('%s suchen', 'unicorn-studio'), $taxonomy['label_plural']),
            'all_items'         => sprintf(__('Alle %s', 'unicorn-studio'), $taxonomy['label_plural']),
            'parent_item'       => sprintf(__('Übergeordnete %s', 'unicorn-studio'), $taxonomy['label_singular']),
            'parent_item_colon' => sprintf(__('Übergeordnete %s:', 'unicorn-studio'), $taxonomy['label_singular']),
            'edit_item'         => sprintf(__('%s bearbeiten', 'unicorn-studio'), $taxonomy['label_singular']),
            'update_item'       => sprintf(__('%s aktualisieren', 'unicorn-studio'), $taxonomy['label_singular']),
            'add_new_item'      => sprintf(__('Neue %s hinzufügen', 'unicorn-studio'), $taxonomy['label_singular']),
            'new_item_name'     => sprintf(__('Neuer %s Name', 'unicorn-studio'), $taxonomy['label_singular']),
            'menu_name'         => $taxonomy['label_plural'],
        ];

        $args = [
            'labels'            => $labels,
            'hierarchical'      => $taxonomy['hierarchical'] ?? false,
            'public'            => true,
            'show_ui'           => true,
            'show_admin_column' => true,
            'show_in_nav_menus' => true,
            'show_tagcloud'     => true,
            'show_in_rest'      => true,
            'rewrite'           => [
                'slug'         => $taxonomy['slug'] ?? $taxonomy['name'],
                'with_front'   => false,
                'hierarchical' => $taxonomy['hierarchical'] ?? false,
            ],
        ];

        register_taxonomy($tax_name, $post_types, $args);
    }

    /**
     * Sync taxonomies from API
     *
     * @param array $taxonomies Taxonomies from API
     */
    public function sync_from_api($taxonomies) {
        $this->taxonomies = $taxonomies;
        update_option('unicorn_studio_taxonomies', $taxonomies);

        // Re-register taxonomies
        foreach ($taxonomies as $taxonomy) {
            $this->register_single_taxonomy($taxonomy);
        }

        // Flush rewrite rules
        flush_rewrite_rules();
    }

    /**
     * Sync terms for a taxonomy
     *
     * @param string $taxonomy_id Unicorn Studio taxonomy ID
     * @param array  $terms       Terms from API
     */
    public function sync_terms($taxonomy_id, $terms) {
        // Find taxonomy
        $taxonomy_data = null;
        foreach ($this->taxonomies as $tax) {
            if ($tax['id'] === $taxonomy_id) {
                $taxonomy_data = $tax;
                break;
            }
        }

        if (!$taxonomy_data) {
            return;
        }

        $tax_name = $this->get_taxonomy_name($taxonomy_data['name']);

        foreach ($terms as $term) {
            $this->sync_single_term($tax_name, $term, $taxonomy_data['hierarchical'] ?? false);
        }
    }

    /**
     * Sync a single term
     *
     * @param string $taxonomy     WordPress taxonomy name
     * @param array  $term         Term data
     * @param bool   $hierarchical Is taxonomy hierarchical
     */
    private function sync_single_term($taxonomy, $term, $hierarchical = false) {
        $existing = get_term_by('slug', $term['slug'], $taxonomy);

        $args = [
            'description' => $term['description'] ?? '',
            'slug'        => $term['slug'],
        ];

        // Handle parent for hierarchical taxonomies
        if ($hierarchical && !empty($term['parent_id'])) {
            // Find parent term by Unicorn Studio ID (stored in meta)
            $parent_term = $this->get_term_by_unicorn_id($term['parent_id'], $taxonomy);
            if ($parent_term) {
                $args['parent'] = $parent_term->term_id;
            }
        }

        if ($existing) {
            wp_update_term($existing->term_id, $taxonomy, $args);
            $term_id = $existing->term_id;
        } else {
            $result = wp_insert_term($term['name'], $taxonomy, $args);
            if (is_wp_error($result)) {
                return;
            }
            $term_id = $result['term_id'];
        }

        // Store Unicorn Studio term ID
        update_term_meta($term_id, '_unicorn_studio_term_id', $term['id']);

        // Handle nested children
        if (!empty($term['children'])) {
            foreach ($term['children'] as $child) {
                $child['parent_id'] = $term['id'];
                $this->sync_single_term($taxonomy, $child, $hierarchical);
            }
        }
    }

    /**
     * Get term by Unicorn Studio ID
     *
     * @param string $unicorn_id Unicorn Studio term ID
     * @param string $taxonomy   Taxonomy name
     * @return WP_Term|false
     */
    private function get_term_by_unicorn_id($unicorn_id, $taxonomy) {
        $terms = get_terms([
            'taxonomy'   => $taxonomy,
            'hide_empty' => false,
            'meta_key'   => '_unicorn_studio_term_id',
            'meta_value' => $unicorn_id,
        ]);

        return !empty($terms) ? $terms[0] : false;
    }

    /**
     * Get taxonomy name with prefix
     *
     * @param string $taxonomy_name Taxonomy name from Unicorn Studio
     * @return string WordPress taxonomy name
     */
    public function get_taxonomy_name($taxonomy_name) {
        $name = $this->prefix . sanitize_key($taxonomy_name);
        // Taxonomy names max 32 chars
        return substr($name, 0, 32);
    }

    /**
     * Get taxonomy by name
     *
     * @param string $name Taxonomy name
     * @return array|null Taxonomy data
     */
    public function get_taxonomy($name) {
        foreach ($this->taxonomies as $tax) {
            if ($tax['name'] === $name) {
                return $tax;
            }
        }
        return null;
    }

    /**
     * Get all stored taxonomies
     *
     * @return array
     */
    public function get_all() {
        return $this->taxonomies;
    }
}
