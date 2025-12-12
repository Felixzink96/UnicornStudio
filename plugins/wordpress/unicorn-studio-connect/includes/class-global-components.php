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
        // Check if header is hidden for this page
        if (self::is_header_hidden()) {
            return null;
        }

        // Check for custom header first
        $header = self::get_custom_header_for_page();

        // Fall back to global header
        if (!$header) {
            $header = self::get_global_header();
        }

        if (!$header || empty($header['html'])) {
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
            $position = $component['position'] ?? 'content';

            // Store in general components storage
            $all_components[$id] = [
                'id'       => $id,
                'name'     => $component['name'] ?? '',
                'html'     => $component['html'] ?? '',
                'css'      => $component['css'] ?? '',
                'js'       => $component['js'] ?? '',
                'position' => $position,
            ];

            // If it's a global header or footer, also store in global components
            if ($component['is_global'] ?? false) {
                if ($position === 'header' && ($component['set_as_default'] ?? true)) {
                    self::save_component('header', $component);
                } elseif ($position === 'footer' && ($component['set_as_default'] ?? true)) {
                    self::save_component('footer', $component);
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
