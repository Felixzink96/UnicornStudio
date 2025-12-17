<?php
/**
 * Menu Sync Handler
 *
 * Synchronisiert Menus zwischen Unicorn Studio und WordPress
 *
 * @package Unicorn_Studio_Connect
 */

if (!defined('ABSPATH')) {
    exit;
}

class Unicorn_Studio_Menus {

    /**
     * Instance
     */
    private static $instance = null;

    /**
     * API Client
     */
    private $api_client;

    /**
     * Menu Location Mapping
     */
    private $location_map = array(
        'header' => 'unicorn-header',
        'footer' => 'unicorn-footer',
        'mobile' => 'unicorn-mobile',
    );

    /**
     * Get Instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        $this->api_client = Unicorn_Studio_API_Client::get_instance();
        $this->init_hooks();
    }

    /**
     * Initialize Hooks
     */
    private function init_hooks() {
        // Register menu locations
        add_action('after_setup_theme', array($this, 'register_menu_locations'));

        // Menu Sync Hooks
        add_action('unicorn_studio_sync_menus', array($this, 'sync_all_menus'));
        add_action('unicorn_studio_webhook_menu_updated', array($this, 'handle_menu_webhook'));
        add_action('unicorn_studio_webhook_menu_created', array($this, 'handle_menu_webhook'));
        add_action('unicorn_studio_webhook_menu_deleted', array($this, 'handle_menu_deleted_webhook'));
    }

    /**
     * Register Menu Locations
     */
    public function register_menu_locations() {
        register_nav_menus(array(
            'unicorn-header' => __('Unicorn Studio Header', 'unicorn-studio'),
            'unicorn-footer' => __('Unicorn Studio Footer', 'unicorn-studio'),
            'unicorn-mobile' => __('Unicorn Studio Mobile', 'unicorn-studio'),
        ));
    }

    /**
     * Sync All Menus from Unicorn Studio
     */
    public function sync_all_menus() {
        $site_id = get_option('unicorn_studio_site_id');
        if (empty($site_id)) {
            return new WP_Error('no_site_id', 'No site ID configured');
        }

        // Fetch menus from API
        $response = $this->api_client->get_menus();
        if (is_wp_error($response)) {
            return $response;
        }

        // Extract menus from response
        $menus = isset($response['data']) ? $response['data'] : $response;
        $results = array();

        foreach ($menus as $menu_data) {
            $result = $this->sync_single_menu($menu_data);
            $results[$menu_data['slug']] = $result;
        }

        return $results;
    }

    /**
     * Sync Single Menu
     */
    public function sync_single_menu($menu_data) {
        $menu_name = $menu_data['name'];
        $menu_slug = $menu_data['slug'];
        $menu_position = isset($menu_data['position']) ? $menu_data['position'] : 'custom';
        $items = isset($menu_data['items']) ? $menu_data['items'] : array();

        // Check if menu exists
        $existing_menu = wp_get_nav_menu_object($menu_slug);

        if ($existing_menu) {
            // Update existing menu
            $menu_id = $existing_menu->term_id;
            wp_update_nav_menu_object($menu_id, array(
                'menu-name' => $menu_name,
            ));

            // Remove existing items
            $existing_items = wp_get_nav_menu_items($menu_id);
            if ($existing_items) {
                foreach ($existing_items as $item) {
                    wp_delete_post($item->ID, true);
                }
            }
        } else {
            // Create new menu
            $menu_id = wp_create_nav_menu($menu_name);
            if (is_wp_error($menu_id)) {
                return $menu_id;
            }
        }

        // Add menu items
        $item_id_map = array(); // Map Unicorn ID to WP menu item ID

        // First pass: Add all items
        foreach ($items as $index => $item) {
            $wp_item_id = $this->add_menu_item($menu_id, $item, $index);
            if (!is_wp_error($wp_item_id)) {
                $item_id_map[$item['id']] = $wp_item_id;
            }
        }

        // Second pass: Set parent relationships
        foreach ($items as $item) {
            if (!empty($item['parent_id']) && isset($item_id_map[$item['parent_id']])) {
                $wp_item_id = $item_id_map[$item['id']];
                $parent_wp_id = $item_id_map[$item['parent_id']];

                wp_update_nav_menu_item($menu_id, $wp_item_id, array(
                    'menu-item-parent-id' => $parent_wp_id,
                ));
            }
        }

        // Assign menu to location
        if (isset($this->location_map[$menu_position])) {
            $locations = get_theme_mod('nav_menu_locations', array());
            $locations[$this->location_map[$menu_position]] = $menu_id;
            set_theme_mod('nav_menu_locations', $locations);
        }

        // Store mapping
        update_option("unicorn_menu_{$menu_data['id']}_wp_id", $menu_id);

        return array(
            'success' => true,
            'menu_id' => $menu_id,
            'items_count' => count($items),
        );
    }

    /**
     * Add Menu Item
     */
    private function add_menu_item($menu_id, $item, $position) {
        $item_data = array(
            'menu-item-title' => $item['label'],
            'menu-item-position' => $position,
            'menu-item-status' => 'publish',
        );

        // Set URL based on link type
        switch ($item['link_type']) {
            case 'page':
                $page_slug = isset($item['page_slug']) ? $item['page_slug'] : '';
                $wp_page = $this->find_wp_page_by_slug($page_slug);

                if ($wp_page) {
                    $item_data['menu-item-type'] = 'post_type';
                    $item_data['menu-item-object'] = 'page';
                    $item_data['menu-item-object-id'] = $wp_page->ID;
                } else {
                    $item_data['menu-item-type'] = 'custom';
                    $item_data['menu-item-url'] = home_url('/' . $page_slug);
                }
                break;

            case 'external':
                $item_data['menu-item-type'] = 'custom';
                $item_data['menu-item-url'] = isset($item['external_url']) ? $item['external_url'] : '#';
                break;

            case 'anchor':
                $item_data['menu-item-type'] = 'custom';
                $anchor = isset($item['anchor']) ? $item['anchor'] : '';
                $item_data['menu-item-url'] = '#' . ltrim($anchor, '#');
                break;

            case 'archive':
                $archive_type = isset($item['archive_type']) ? $item['archive_type'] : 'post';
                $item_data['menu-item-type'] = 'post_type_archive';
                $item_data['menu-item-object'] = $archive_type;
                break;

            default:
                $item_data['menu-item-type'] = 'custom';
                $item_data['menu-item-url'] = '#';
        }

        // Target
        if (isset($item['target']) && $item['target'] === '_blank') {
            $item_data['menu-item-target'] = '_blank';
        }

        // CSS Classes
        if (!empty($item['css_classes'])) {
            $item_data['menu-item-classes'] = $item['css_classes'];
        }

        // Description (for mega menus)
        if (!empty($item['description'])) {
            $item_data['menu-item-description'] = $item['description'];
        }

        return wp_update_nav_menu_item($menu_id, 0, $item_data);
    }

    /**
     * Find WordPress Page by Slug
     */
    private function find_wp_page_by_slug($slug) {
        if (empty($slug)) {
            return get_page_by_path('/');
        }

        $page = get_page_by_path($slug);
        if ($page) {
            return $page;
        }

        // Try to find by unicorn slug meta
        $pages = get_posts(array(
            'post_type' => 'page',
            'meta_key' => '_unicorn_slug',
            'meta_value' => $slug,
            'posts_per_page' => 1,
        ));

        return !empty($pages) ? $pages[0] : null;
    }

    /**
     * Handle Menu Webhook (Create/Update)
     */
    public function handle_menu_webhook($payload) {
        if (empty($payload['menu'])) {
            return;
        }

        $menu_data = $payload['menu'];
        return $this->sync_single_menu($menu_data);
    }

    /**
     * Handle Menu Deleted Webhook
     */
    public function handle_menu_deleted_webhook($payload) {
        if (empty($payload['menu_id'])) {
            return;
        }

        $unicorn_menu_id = $payload['menu_id'];
        $wp_menu_id = get_option("unicorn_menu_{$unicorn_menu_id}_wp_id");

        if ($wp_menu_id) {
            wp_delete_nav_menu($wp_menu_id);
            delete_option("unicorn_menu_{$unicorn_menu_id}_wp_id");
        }
    }

    /**
     * Get Menu HTML by Position
     */
    public function get_menu_html($position, $args = array()) {
        $location = isset($this->location_map[$position]) ? $this->location_map[$position] : 'unicorn-header';

        $default_args = array(
            'theme_location' => $location,
            'container' => 'nav',
            'container_class' => 'unicorn-nav',
            'menu_class' => 'unicorn-menu',
            'echo' => false,
            'fallback_cb' => '__return_empty_string',
        );

        $args = wp_parse_args($args, $default_args);

        return wp_nav_menu($args);
    }

    /**
     * Render Menu (Echo)
     */
    public function render_menu($position, $args = array()) {
        echo $this->get_menu_html($position, $args);
    }

    /**
     * Export WordPress Menus to Unicorn Studio Format
     */
    public function export_wp_menus() {
        $exported = array();
        $locations = get_nav_menu_locations();

        foreach ($this->location_map as $unicorn_pos => $wp_location) {
            if (!isset($locations[$wp_location])) {
                continue;
            }

            $menu = wp_get_nav_menu_object($locations[$wp_location]);
            if (!$menu) {
                continue;
            }

            $items = wp_get_nav_menu_items($menu->term_id);
            $exported_items = array();

            if ($items) {
                foreach ($items as $item) {
                    $exported_items[] = array(
                        'label' => $item->title,
                        'link_type' => $this->get_link_type_from_wp($item),
                        'external_url' => $item->type === 'custom' ? $item->url : null,
                        'page_slug' => $item->type === 'post_type' ? get_post_field('post_name', $item->object_id) : null,
                        'target' => $item->target ?: '_self',
                        'css_classes' => implode(' ', (array) $item->classes),
                        'description' => $item->description,
                        'parent_wp_id' => $item->menu_item_parent,
                        'position' => $item->menu_order,
                    );
                }
            }

            $exported[] = array(
                'name' => $menu->name,
                'slug' => $menu->slug,
                'position' => $unicorn_pos,
                'items' => $exported_items,
            );
        }

        return $exported;
    }

    /**
     * Get Link Type from WordPress Menu Item
     */
    private function get_link_type_from_wp($item) {
        if ($item->type === 'post_type') {
            return 'page';
        }

        if ($item->type === 'custom') {
            $url = $item->url;
            if (strpos($url, '#') === 0) {
                return 'anchor';
            }
            if (strpos($url, home_url()) === 0) {
                return 'page';
            }
            return 'external';
        }

        if ($item->type === 'post_type_archive') {
            return 'archive';
        }

        return 'external';
    }
}

// Initialize
Unicorn_Studio_Menus::get_instance();
