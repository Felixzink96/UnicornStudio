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
     * Initialize hooks
     */
    public function init() {
        // Output collected CSS in wp_head
        add_action('wp_head', [$this, 'output_collected_css'], 999);

        // Output collected JS in wp_footer
        add_action('wp_footer', [$this, 'output_collected_js'], 999);

        // Auto-render header/footer for all themes (not just Unicorn Studio theme)
        // Only if not using the Unicorn Studio blank theme (which handles it manually)
        if (!$this->is_unicorn_theme_active()) {
            // Header: Use wp_body_open (WordPress 5.2+) or fallback
            add_action('wp_body_open', [$this, 'auto_render_header'], 1);

            // Footer: Render before wp_footer scripts
            add_action('wp_footer', [$this, 'auto_render_footer'], 1);
        }
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

        if ($echo) {
            echo $html;
            return null;
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

        if ($echo) {
            echo $html;
            return null;
        }

        return $html;
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
        if (empty(self::$collected_css)) {
            return;
        }

        echo "\n<style id=\"unicorn-global-components-css\">\n";
        echo self::$collected_css;
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

            // Normalize the component data
            $normalized = [
                'id'       => $id,
                'name'     => $component['component_name'] ?? $component['name'] ?? '',
                'html'     => $component['component_html'] ?? $component['html'] ?? '',
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
