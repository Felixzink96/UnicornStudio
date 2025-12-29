<?php
/**
 * Global Components Handler
 *
 * Manages global header and footer components from Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Global Components Class
 */
class Unicorn_Studio_Global_Components {

    /**
     * Option name for storing global components
     */
    const OPTION_NAME = 'unicorn_studio_global_components';

    /**
     * Collected CSS from components
     *
     * @var string
     */
    private static $collected_css = '';

    /**
     * Collected JS from components
     *
     * @var string
     */
    private static $collected_js = '';

    /**
     * Track if header/footer have been rendered to prevent duplicates
     */
    private static $header_rendered = false;
    private static $footer_rendered = false;

    /**
     * Initialize hooks
     */
    public function init() {
        // Output collected CSS in wp_head
        add_action('wp_head', [$this, 'output_collected_css'], 999);

        // Output collected JS in wp_footer
        add_action('wp_footer', [$this, 'output_collected_js'], 999);

        // Auto-render header/footer for ALL themes
        // Header: Use wp_body_open (WordPress 5.2+)
        add_action('wp_body_open', [$this, 'auto_render_header'], 1);

        // Footer: Render before wp_footer scripts
        add_action('wp_footer', [$this, 'auto_render_footer'], 1);
    }

    /**
     * Check if Unicorn Studio blank theme is active
     *
     * @return bool
     */
    private function is_unicorn_theme_active(): bool {
        $theme = wp_get_theme();
        $theme_slug = $theme->get_stylesheet();
        return strpos($theme_slug, 'unicorn-studio') !== false;
    }

    /**
     * Auto-render header for non-Unicorn themes
     */
    public function auto_render_header(): void {
        self::render_header(true);
    }

    /**
     * Auto-render footer for non-Unicorn themes
     */
    public function auto_render_footer(): void {
        self::render_footer(true);
    }

    /**
     * Get all global components
     *
     * @return array
     */
    public static function get_components(): array {
        $components = get_option(self::OPTION_NAME, []);
        return is_array($components) ? $components : [];
    }

    /**
     * Get global header
     *
     * @return array|null
     */
    public static function get_global_header(): ?array {
        $components = self::get_components();
        return $components['header'] ?? null;
    }

    /**
     * Get global footer
     *
     * @return array|null
     */
    public static function get_global_footer(): ?array {
        $components = self::get_components();
        return $components['footer'] ?? null;
    }

    /**
     * Save a global component
     *
     * @param string $type     Component type (header|footer)
     * @param array  $component Component data with html, css, js
     * @return bool
     */
    public static function save_component(string $type, array $component): bool {
        if (!in_array($type, ['header', 'footer'], true)) {
            return false;
        }

        $components = self::get_components();
        $components[$type] = [
            'id'         => $component['id'] ?? '',
            'name'       => $component['name'] ?? '',
            'html'       => $component['html'] ?? '',
            'css'        => $component['css'] ?? '',
            'js'         => $component['js'] ?? '',
            'updated_at' => current_time('mysql'),
        ];

        return update_option(self::OPTION_NAME, $components);
    }

    /**
     * Delete a global component
     *
     * @param string $type Component type (header|footer)
     * @return bool
     */
    public static function delete_component(string $type): bool {
        $components = self::get_components();

        if (isset($components[$type])) {
            unset($components[$type]);
            return update_option(self::OPTION_NAME, $components);
        }

        return false;
    }

    /**
     * Render global header
     *
     * Outputs the header HTML and collects CSS/JS for later output
     *
     * @param bool $echo Whether to echo the output
     * @return string|null
     */
    public static function render_header(bool $echo = true): ?string {
        // Prevent duplicate rendering
        if (self::$header_rendered) {
            return null;
        }
        self::$header_rendered = true;

        // Debug logging
        if (defined('WP_DEBUG') && WP_DEBUG) {
            $all_components = self::get_components();
            error_log('[Unicorn Header] All components: ' . print_r($all_components, true));
        }

        // Check if header is hidden for this page
        if (self::is_header_hidden()) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[Unicorn Header] Header is hidden for this page');
            }
            return null;
        }

        // Check for custom header first
        $header = self::get_custom_header_for_page();

        // Fall back to global header
        if (!$header) {
            $header = self::get_global_header();
        }

        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log('[Unicorn Header] Header data: ' . print_r($header, true));
        }

        if (!$header || empty($header['html'])) {
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log('[Unicorn Header] No header HTML found');
            }
            if ($echo) {
                echo "\n<!-- Unicorn Header: No HTML found. Check wp_options -> unicorn_studio_global_components -->\n";
            }
            return null;
        }

        // Collect CSS and JS
        if (!empty($header['css'])) {
            self::$collected_css .= "\n/* Global Header CSS */\n" . $header['css'];
        }
        if (!empty($header['js'])) {
            self::$collected_js .= "\n// Global Header JS\n" . $header['js'];
        }

        $html = $header['html'];

        // Replace menu placeholders
        $html = self::replace_menu_placeholders($html);

        // Auto-fix: Add x-data if header has Alpine directives but missing x-data
        $html = self::ensure_alpine_xdata($html, 'header');

        // Auto-fix: Add x-cloak to mobile menu to prevent FOUC (Flash of Unstyled Content)
        $html = self::ensure_mobile_menu_cloak($html);

        // Optimize images (srcset, lazy loading)
        $html = self::optimize_component_images($html);

        if ($echo) {
            echo $html;
            return null;
        }

        return $html;
    }

    /**
     * Ensure Alpine.js x-data attribute exists on elements that need it
     *
     * If an element has @click, x-show, or :class but is missing x-data,
     * automatically add the required x-data attribute.
     *
     * @param string $html The HTML content
     * @param string $tag  The tag to check (header, nav, etc.)
     * @return string Fixed HTML
     */
    private static function ensure_alpine_xdata(string $html, string $tag = 'header'): string {
        // Check if HTML has Alpine directives
        $has_alpine_directives = (
            strpos($html, '@click') !== false ||
            strpos($html, 'x-show') !== false ||
            strpos($html, 'x-transition') !== false ||
            strpos($html, ':class') !== false ||
            strpos($html, '@scroll') !== false
        );

        if (!$has_alpine_directives) {
            return $html;
        }

        // Check if HTML starts with a wrapper div (from fixMobileMenuInHeader)
        // If so, we need to ensure the wrapper has all needed variables
        if (preg_match('/^(\s*<div)([^>]*x-data=["\'])(\{[^"\']*\})(["\'][^>]*>)/i', $html, $wrapperMatch)) {
            $existingXdata = $wrapperMatch[3];
            $needsScrolled = strpos($html, 'scrolled') !== false && strpos($existingXdata, 'scrolled') === false;
            $needsMobileOpen = strpos($html, 'mobileOpen') !== false && strpos($existingXdata, 'mobileOpen') === false;

            if ($needsScrolled || $needsMobileOpen) {
                // Parse existing x-data and add missing vars
                $newVars = [];
                if ($needsScrolled) $newVars[] = 'scrolled: false';
                if ($needsMobileOpen) $newVars[] = 'mobileOpen: false';

                // Insert new vars into existing x-data object
                $newXdata = preg_replace('/\}\s*$/', ', ' . implode(', ', $newVars) . ' }', $existingXdata);
                $html = preg_replace(
                    '/^(\s*<div)([^>]*x-data=["\'])\{[^"\']*\}(["\'][^>]*>)/i',
                    '$1$2' . $newXdata . '$3',
                    $html,
                    1
                );

                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[Unicorn] Added missing vars to wrapper x-data: ' . implode(', ', $newVars));
                }
            }
            return $html;
        }

        // Check if x-data already exists on the root element (original logic)
        $pattern = '/^(\s*<' . $tag . ')([^>]*)(>)/i';
        if (preg_match($pattern, $html, $matches)) {
            $tag_content = $matches[2];

            // If x-data is missing, add it
            if (strpos($tag_content, 'x-data') === false) {
                // Build x-data based on directives found in HTML
                $vars = [];

                // Check for mobileOpen (mobile menu)
                if (strpos($html, 'mobileOpen') !== false) {
                    $vars[] = 'mobileOpen: false';
                }

                // Check for scrolled (scroll-based header changes)
                if (strpos($html, 'scrolled') !== false) {
                    $vars[] = 'scrolled: false';
                }

                // Check for other common patterns
                if (strpos($html, 'dropdownOpen') !== false) {
                    $vars[] = 'dropdownOpen: false';
                }
                if (strpos($html, 'searchOpen') !== false) {
                    $vars[] = 'searchOpen: false';
                }

                // Default to mobileOpen if no patterns found
                if (empty($vars)) {
                    $vars[] = 'mobileOpen: false';
                }

                $xdata = '{ ' . implode(', ', $vars) . ' }';

                $html = preg_replace(
                    $pattern,
                    '$1 x-data="' . $xdata . '"$2$3',
                    $html,
                    1
                );

                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[Unicorn] Auto-added x-data to ' . $tag);
                }
            }
        }

        return $html;
    }

    /**
     * Ensure mobile menu has x-cloak to prevent Flash of Unstyled Content
     *
     * x-cloak hides elements until Alpine.js initializes and removes the attribute.
     * This prevents the mobile menu from briefly appearing on page load.
     *
     * @param string $html The HTML content
     * @return string Fixed HTML
     */
    private static function ensure_mobile_menu_cloak(string $html): string {
        // Find x-show="mobileOpen" divs that don't have x-cloak
        if (strpos($html, 'x-show="mobileOpen"') !== false || strpos($html, "x-show='mobileOpen'") !== false) {
            // Add x-cloak if not present
            if (strpos($html, 'x-cloak') === false) {
                // Add x-cloak to the mobile menu div
                $html = preg_replace(
                    '/(<div[^>]*x-show=["\']mobileOpen["\'])([^>]*>)/i',
                    '$1 x-cloak$2',
                    $html
                );

                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log('[Unicorn] Auto-added x-cloak to mobile menu');
                }
            }
        }

        return $html;
    }

    /**
     * Render global footer
     *
     * Outputs the footer HTML and collects CSS/JS for later output
     *
     * @param bool $echo Whether to echo the output
     * @return string|null
     */
    public static function render_footer(bool $echo = true): ?string {
        // Prevent duplicate rendering
        if (self::$footer_rendered) {
            return null;
        }
        self::$footer_rendered = true;

        // Check if footer is hidden for this page
        if (self::is_footer_hidden()) {
            return null;
        }

        // Check for custom footer first
        $footer = self::get_custom_footer_for_page();

        // Fall back to global footer
        if (!$footer) {
            $footer = self::get_global_footer();
        }

        if (!$footer || empty($footer['html'])) {
            if ($echo) {
                echo "\n<!-- Unicorn Footer: No HTML found. Check wp_options -> unicorn_studio_global_components -->\n";
            }
            return null;
        }

        // Collect CSS and JS
        if (!empty($footer['css'])) {
            self::$collected_css .= "\n/* Global Footer CSS */\n" . $footer['css'];
        }
        if (!empty($footer['js'])) {
            self::$collected_js .= "\n// Global Footer JS\n" . $footer['js'];
        }

        $html = $footer['html'];

        // Replace menu placeholders
        $html = self::replace_menu_placeholders($html);

        // Optimize images (srcset, lazy loading)
        $html = self::optimize_component_images($html);

        if ($echo) {
            echo $html;
            return null;
        }

        return $html;
    }

    /**
     * Optimize images in component HTML
     * Adds srcset for Unsplash images, lazy loading, and async decoding
     *
     * @param string $html HTML content
     * @return string Optimized HTML
     */
    private static function optimize_component_images(string $html): string {
        if (empty($html)) {
            return $html;
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
                $img_tag = self::add_unsplash_srcset($img_tag, $src);
            }

            // Add loading="lazy" if not present (components are usually below fold)
            if (strpos($attributes, 'loading=') === false) {
                $img_tag = str_replace('<img', '<img loading="lazy"', $img_tag);
            }

            // Add decoding="async" if not present
            if (strpos($attributes, 'decoding=') === false) {
                $img_tag = str_replace('<img', '<img decoding="async"', $img_tag);
            }

            return $img_tag;
        }, $html);
    }

    /**
     * Add srcset for Unsplash images
     *
     * @param string $img_tag Original img tag
     * @param string $src Image URL
     * @return string Modified img tag
     */
    private static function add_unsplash_srcset(string $img_tag, string $src): string {
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
        $widths = [400, 640, 800, 1024, 1280, 1600];

        // Build srcset
        $srcset_parts = [];
        foreach ($widths as $w) {
            $params['w'] = $w;
            $url = $base_url . '?' . http_build_query($params);
            $srcset_parts[] = esc_url($url) . ' ' . $w . 'w';
        }
        $srcset = implode(', ', $srcset_parts);

        // Default sizes
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
     * Check if header is hidden for current page
     *
     * @return bool
     */
    public static function is_header_hidden(): bool {
        global $post;

        if (!$post) {
            return false;
        }

        return (bool) get_post_meta($post->ID, '_unicorn_hide_header', true);
    }

    /**
     * Check if footer is hidden for current page
     *
     * @return bool
     */
    public static function is_footer_hidden(): bool {
        global $post;

        if (!$post) {
            return false;
        }

        return (bool) get_post_meta($post->ID, '_unicorn_hide_footer', true);
    }

    /**
     * Get custom header for current page
     *
     * @return array|null
     */
    public static function get_custom_header_for_page(): ?array {
        global $post;

        if (!$post) {
            return null;
        }

        $custom_header_id = get_post_meta($post->ID, '_unicorn_custom_header_id', true);

        if (!$custom_header_id) {
            return null;
        }

        // Get from stored components
        $components = get_option('unicorn_studio_components', []);
        return $components[$custom_header_id] ?? null;
    }

    /**
     * Get custom footer for current page
     *
     * @return array|null
     */
    public static function get_custom_footer_for_page(): ?array {
        global $post;

        if (!$post) {
            return null;
        }

        $custom_footer_id = get_post_meta($post->ID, '_unicorn_custom_footer_id', true);

        if (!$custom_footer_id) {
            return null;
        }

        // Get from stored components
        $components = get_option('unicorn_studio_components', []);
        return $components[$custom_footer_id] ?? null;
    }

    /**
     * Output collected CSS in wp_head
     */
    public function output_collected_css() {
        // Always output x-cloak CSS to prevent FOUC with Alpine.js
        // This must be present before Alpine initializes
        $base_css = "/* Alpine.js x-cloak - prevent FOUC */\n[x-cloak] { display: none !important; }\n";

        echo "\n<style id=\"unicorn-global-components-css\">\n";
        echo $base_css;
        // Also output component-specific CSS if it exists
        if (!empty(self::$collected_css)) {
            echo self::$collected_css;
        }
        echo "\n</style>\n";
    }

    /**
     * Output collected JS in wp_footer
     */
    public function output_collected_js() {
        if (empty(self::$collected_js)) {
            return;
        }

        echo "\n<script id=\"unicorn-global-components-js\">\n";
        echo self::$collected_js;
        echo "\n</script>\n";
    }

    /**
     * Sync components from Unicorn Studio
     *
     * @param array $components_data Array of component data from API
     * @return bool
     */
    public static function sync_from_api(array $components_data): bool {
        $all_components = get_option('unicorn_studio_components', []);

        foreach ($components_data as $component) {
            $id = $component['id'] ?? '';
            // Handle both field names: component_position (from RPC) and position (from direct query)
            $position = $component['component_position'] ?? $component['position'] ?? 'content';
            $is_global = $component['is_global'] ?? false;

            // Get HTML and rewrite image URLs
            $html = $component['component_html'] ?? $component['html'] ?? '';
            if (function_exists('unicorn_studio') && unicorn_studio()->media_sync) {
                $html = unicorn_studio()->media_sync->rewrite_supabase_urls($html);
            }

            // Normalize the component data
            $normalized = [
                'id'       => $id,
                'name'     => $component['component_name'] ?? $component['name'] ?? '',
                'html'     => $html,
                'css'      => $component['component_css'] ?? $component['css'] ?? '',
                'js'       => $component['component_js'] ?? $component['js'] ?? '',
                'position' => $position,
            ];

            // Store in general components storage
            $all_components[$id] = $normalized;

            // If it's a global header or footer, also store in global components
            // Accept components that are marked as global OR are in header/footer position
            if ($is_global || in_array($position, ['header', 'footer'], true)) {
                if ($position === 'header') {
                    self::save_component('header', $normalized);
                } elseif ($position === 'footer') {
                    self::save_component('footer', $normalized);
                }
            }
        }

        update_option('unicorn_studio_components', $all_components);

        return true;
    }

    /**
     * Get all stored components (for library display)
     *
     * @return array
     */
    public static function get_all_stored_components(): array {
        return get_option('unicorn_studio_components', []);
    }

    /**
     * Get a specific component by ID
     *
     * @param string $component_id Component ID
     * @return array|null
     */
    public static function get_component_by_id(string $component_id): ?array {
        $components = self::get_all_stored_components();
        return $components[$component_id] ?? null;
    }

    /**
     * Replace menu placeholders in HTML with actual WordPress menu content
     *
     * Placeholders format: {{menu:slug}} where slug is the menu slug (e.g., header-menu, footer-menu)
     *
     * @param string $html HTML containing menu placeholders
     * @return string HTML with menu placeholders replaced
     */
    public static function replace_menu_placeholders(string $html): string {
        // Pattern to match {{menu:slug}} where slug can contain letters, numbers, and hyphens
        $pattern = '/\{\{menu:([\w-]+)\}\}/';

        return preg_replace_callback($pattern, function($matches) {
            $menu_slug = $matches[1];
            $derived_position = preg_replace('/-menu$/', '', $menu_slug); // 'header-menu' -> 'header'

            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log("[Unicorn Menu] Looking for menu: slug={$menu_slug}, position={$derived_position}");
            }

            // FIRST: Try to use synced Unicorn Studio menus (preferred)
            $unicorn_menus = get_option('unicorn_studio_menus', []);
            $unicorn_menu = null;

            if (!empty($unicorn_menus) && is_array($unicorn_menus)) {
                foreach ($unicorn_menus as $menu) {
                    // Match by slug or position
                    if (
                        ($menu['slug'] ?? '') === $menu_slug ||
                        ($menu['position'] ?? '') === $menu_slug ||
                        ($menu['position'] ?? '') === $derived_position
                    ) {
                        $unicorn_menu = $menu;
                        break;
                    }
                }
            }

            // If we found a Unicorn menu with items, use it directly
            if ($unicorn_menu && !empty($unicorn_menu['items'])) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log("[Unicorn Menu] Found Unicorn menu: " . ($unicorn_menu['name'] ?? 'unknown') . " with " . count($unicorn_menu['items']) . " items");
                }

                // Default link classes - only used if item has no cssClasses
                $default_classes = 'text-sm transition-colors hover:opacity-80';

                // Check menu settings for linkClass override
                $menu_settings = $unicorn_menu['settings'] ?? [];
                if (!empty($menu_settings['linkClass'])) {
                    $default_classes = $menu_settings['linkClass'];
                }

                $output = '';
                foreach ($unicorn_menu['items'] as $item) {
                    // Build URL based on link type
                    $url = '/';
                    $link_type = $item['linkType'] ?? 'page';

                    if ($link_type === 'page') {
                        $page_slug = $item['pageSlug'] ?? '';
                        $url = $page_slug ? '/' . ltrim($page_slug, '/') : '/';
                    } elseif ($link_type === 'external') {
                        $url = $item['externalUrl'] ?? '#';
                    } elseif ($link_type === 'anchor') {
                        $url = '#' . ($item['anchor'] ?? '');
                    }

                    $label = $item['label'] ?? '';
                    $target = ($item['target'] ?? '_self') === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : '';

                    // Use item-specific cssClasses if available, otherwise default
                    // Check both cssClasses (camelCase from API) and css_classes (snake_case)
                    $link_class = $item['cssClasses'] ?? $item['css_classes'] ?? $default_classes;

                    $output .= '<a href="' . esc_url($url) . '" class="' . esc_attr($link_class) . '"' . $target . '>' . esc_html($label) . '</a>' . "\n";
                }

                return $output;
            }

            // FALLBACK: Try WordPress native menus
            $location_map = [
                'header-menu' => 'unicorn-header',
                'header'      => 'unicorn-header',
                'footer-menu' => 'unicorn-footer',
                'footer'      => 'unicorn-footer',
                'mobile-menu' => 'unicorn-mobile',
                'mobile'      => 'unicorn-mobile',
            ];

            if (!isset($location_map[$derived_position])) {
                $location_map[$derived_position] = 'unicorn-' . $derived_position;
            }

            // Try to get menu by slug first
            $menu = wp_get_nav_menu_object($menu_slug);

            // If not found, try mapped location
            if (!$menu && isset($location_map[$menu_slug])) {
                $locations = get_nav_menu_locations();
                $location = $location_map[$menu_slug];
                if (isset($locations[$location])) {
                    $menu = wp_get_nav_menu_object($locations[$location]);
                }
            }

            // If still not found, try derived position
            if (!$menu && isset($location_map[$derived_position])) {
                $locations = get_nav_menu_locations();
                $location = $location_map[$derived_position];
                if (isset($locations[$location])) {
                    $menu = wp_get_nav_menu_object($locations[$location]);
                }
            }

            if (!$menu) {
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log("[Unicorn Menu] No menu found for slug: {$menu_slug} (no Unicorn menu, no WP menu)");
                }
                return '';
            }

            // Get menu items from WordPress
            $menu_items = wp_get_nav_menu_items($menu->term_id);

            if (empty($menu_items)) {
                return '';
            }

            // Render menu items as simple links
            $output = '';
            foreach ($menu_items as $item) {
                if ($item->menu_item_parent != 0) {
                    continue;
                }

                $url = $item->url;
                $label = $item->title;
                $target = $item->target ? ' target="' . esc_attr($item->target) . '"' : '';
                $classes = !empty($item->classes) ? ' class="' . esc_attr(implode(' ', array_filter($item->classes))) . '"' : '';

                $output .= '<a href="' . esc_url($url) . '"' . $target . $classes . '>' . esc_html($label) . '</a>' . "\n";
            }

            return $output;
        }, $html);
    }

    /**
     * Save page-specific component settings
     *
     * @param int   $post_id Post ID
     * @param array $settings Settings array
     * @return void
     */
    public static function save_page_settings(int $post_id, array $settings): void {
        if (isset($settings['hide_header'])) {
            update_post_meta($post_id, '_unicorn_hide_header', (bool) $settings['hide_header']);
        }

        if (isset($settings['hide_footer'])) {
            update_post_meta($post_id, '_unicorn_hide_footer', (bool) $settings['hide_footer']);
        }

        if (isset($settings['custom_header_id'])) {
            if ($settings['custom_header_id']) {
                update_post_meta($post_id, '_unicorn_custom_header_id', $settings['custom_header_id']);
            } else {
                delete_post_meta($post_id, '_unicorn_custom_header_id');
            }
        }

        if (isset($settings['custom_footer_id'])) {
            if ($settings['custom_footer_id']) {
                update_post_meta($post_id, '_unicorn_custom_footer_id', $settings['custom_footer_id']);
            } else {
                delete_post_meta($post_id, '_unicorn_custom_footer_id');
            }
        }
    }
}
