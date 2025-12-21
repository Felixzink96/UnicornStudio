<?php
/**
 * CMS Components Handler
 *
 * Handles synchronization of CMS component JavaScript from Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * CMS Components Class
 */
class Unicorn_Studio_CMS_Components {

    /**
     * Option name for storing components JS
     */
    const OPTION_NAME = 'unicorn_studio_cms_components_js';

    /**
     * JS file path relative to uploads directory
     */
    const JS_FILE_PATH = 'unicorn-studio/cms-components.js';

    /**
     * Sync JavaScript from CMS components
     *
     * @param array $components Array of components with JS
     * @return bool|WP_Error
     */
    public static function sync_js($components) {
        if (empty($components)) {
            // No components with JS, remove file if exists
            self::delete_js_file();
            return true;
        }

        // Build the JavaScript file content
        $js_content = self::build_js_content($components);

        // Write to file
        $result = self::write_js_file($js_content);

        if (is_wp_error($result)) {
            return $result;
        }

        // Store component data for reference
        update_option(self::OPTION_NAME, [
            'components' => $components,
            'synced_at' => current_time('mysql'),
            'file_path' => self::get_js_file_path(),
        ]);

        return true;
    }

    /**
     * Build JavaScript content from components
     *
     * @param array $components Components with JS
     * @return string Generated JavaScript
     */
    private static function build_js_content($components) {
        $js = "/**\n";
        $js .= " * Unicorn Studio CMS Components\n";
        $js .= " * Auto-generated - Do not edit manually\n";
        $js .= " * Generated: " . current_time('mysql') . "\n";
        $js .= " */\n\n";

        // Group components by init strategy
        $immediate = [];
        $domready = [];
        $scroll = [];
        $interaction = [];

        foreach ($components as $component) {
            $init = isset($component['js_init']) ? $component['js_init'] : 'domready';
            $js_code = isset($component['js']) ? trim($component['js']) : '';

            if (empty($js_code)) {
                continue;
            }

            switch ($init) {
                case 'immediate':
                    $immediate[] = [
                        'slug' => $component['slug'],
                        'name' => $component['name'],
                        'js' => $js_code,
                    ];
                    break;
                case 'scroll':
                    $scroll[] = [
                        'slug' => $component['slug'],
                        'name' => $component['name'],
                        'js' => $js_code,
                    ];
                    break;
                case 'interaction':
                    $interaction[] = [
                        'slug' => $component['slug'],
                        'name' => $component['name'],
                        'js' => $js_code,
                    ];
                    break;
                default: // domready
                    $domready[] = [
                        'slug' => $component['slug'],
                        'name' => $component['name'],
                        'js' => $js_code,
                    ];
                    break;
            }
        }

        // Immediate execution
        if (!empty($immediate)) {
            $js .= "// =================================\n";
            $js .= "// IMMEDIATE EXECUTION\n";
            $js .= "// =================================\n\n";

            foreach ($immediate as $comp) {
                $js .= "// Component: " . esc_js($comp['name']) . " (" . esc_js($comp['slug']) . ")\n";
                $js .= "(function() {\n";
                $js .= "  try {\n";
                $js .= self::indent_js($comp['js'], 4);
                $js .= "\n  } catch(e) {\n";
                $js .= "    console.error('[Unicorn] Component " . esc_js($comp['slug']) . " error:', e);\n";
                $js .= "  }\n";
                $js .= "})();\n\n";
            }
        }

        // DOMContentLoaded
        if (!empty($domready)) {
            $js .= "// =================================\n";
            $js .= "// DOM READY\n";
            $js .= "// =================================\n\n";
            $js .= "document.addEventListener('DOMContentLoaded', function() {\n";

            foreach ($domready as $comp) {
                $js .= "\n  // Component: " . esc_js($comp['name']) . " (" . esc_js($comp['slug']) . ")\n";
                $js .= "  try {\n";
                $js .= self::indent_js($comp['js'], 4);
                $js .= "\n  } catch(e) {\n";
                $js .= "    console.error('[Unicorn] Component " . esc_js($comp['slug']) . " error:', e);\n";
                $js .= "  }\n";
            }

            $js .= "});\n\n";
        }

        // Scroll-based initialization with IntersectionObserver
        if (!empty($scroll)) {
            $js .= "// =================================\n";
            $js .= "// SCROLL VISIBILITY\n";
            $js .= "// =================================\n\n";
            $js .= "document.addEventListener('DOMContentLoaded', function() {\n";
            $js .= "  var observer = new IntersectionObserver(function(entries) {\n";
            $js .= "    entries.forEach(function(entry) {\n";
            $js .= "      if (entry.isIntersecting && !entry.target._unicornInitialized) {\n";
            $js .= "        entry.target._unicornInitialized = true;\n";
            $js .= "        var componentSlug = entry.target.getAttribute('data-component');\n";
            $js .= "        if (componentSlug && window._unicornScrollComponents && window._unicornScrollComponents[componentSlug]) {\n";
            $js .= "          try {\n";
            $js .= "            window._unicornScrollComponents[componentSlug](entry.target);\n";
            $js .= "          } catch(e) {\n";
            $js .= "            console.error('[Unicorn] Scroll component error:', e);\n";
            $js .= "          }\n";
            $js .= "        }\n";
            $js .= "      }\n";
            $js .= "    });\n";
            $js .= "  }, { threshold: 0.1 });\n\n";

            $js .= "  window._unicornScrollComponents = {};\n\n";

            foreach ($scroll as $comp) {
                $js .= "  // Component: " . esc_js($comp['name']) . " (" . esc_js($comp['slug']) . ")\n";
                $js .= "  window._unicornScrollComponents['" . esc_js($comp['slug']) . "'] = function(el) {\n";
                $js .= self::indent_js($comp['js'], 4);
                $js .= "\n  };\n\n";
            }

            $js .= "  // Observe all scroll-init components\n";
            $js .= "  var slugs = Object.keys(window._unicornScrollComponents);\n";
            $js .= "  slugs.forEach(function(slug) {\n";
            $js .= "    document.querySelectorAll('[data-component=\"' + slug + '\"]').forEach(function(el) {\n";
            $js .= "      observer.observe(el);\n";
            $js .= "    });\n";
            $js .= "  });\n";
            $js .= "});\n\n";
        }

        // Interaction-based (first click)
        if (!empty($interaction)) {
            $js .= "// =================================\n";
            $js .= "// INTERACTION (FIRST CLICK)\n";
            $js .= "// =================================\n\n";
            $js .= "document.addEventListener('DOMContentLoaded', function() {\n";
            $js .= "  window._unicornInteractionComponents = {};\n\n";

            foreach ($interaction as $comp) {
                $js .= "  // Component: " . esc_js($comp['name']) . " (" . esc_js($comp['slug']) . ")\n";
                $js .= "  window._unicornInteractionComponents['" . esc_js($comp['slug']) . "'] = function(el) {\n";
                $js .= self::indent_js($comp['js'], 4);
                $js .= "\n  };\n\n";
            }

            $js .= "  // Add click handlers\n";
            $js .= "  var slugs = Object.keys(window._unicornInteractionComponents);\n";
            $js .= "  slugs.forEach(function(slug) {\n";
            $js .= "    document.querySelectorAll('[data-component=\"' + slug + '\"]').forEach(function(el) {\n";
            $js .= "      el.addEventListener('click', function handler() {\n";
            $js .= "        if (!el._unicornInitialized) {\n";
            $js .= "          el._unicornInitialized = true;\n";
            $js .= "          try {\n";
            $js .= "            window._unicornInteractionComponents[slug](el);\n";
            $js .= "          } catch(e) {\n";
            $js .= "            console.error('[Unicorn] Interaction component error:', e);\n";
            $js .= "          }\n";
            $js .= "        }\n";
            $js .= "      }, { once: false });\n";
            $js .= "    });\n";
            $js .= "  });\n";
            $js .= "});\n";
        }

        return $js;
    }

    /**
     * Indent JavaScript code
     *
     * @param string $js JavaScript code
     * @param int $spaces Number of spaces to indent
     * @return string Indented JavaScript
     */
    private static function indent_js($js, $spaces = 2) {
        $indent = str_repeat(' ', $spaces);
        $lines = explode("\n", $js);
        $indented = [];

        foreach ($lines as $line) {
            $indented[] = $indent . $line;
        }

        return implode("\n", $indented);
    }

    /**
     * Write JavaScript to file
     *
     * @param string $content JavaScript content
     * @return bool|WP_Error
     */
    private static function write_js_file($content) {
        $upload_dir = wp_upload_dir();
        $file_path = $upload_dir['basedir'] . '/' . self::JS_FILE_PATH;
        $dir_path = dirname($file_path);

        // Create directory if not exists
        if (!file_exists($dir_path)) {
            if (!wp_mkdir_p($dir_path)) {
                return new WP_Error(
                    'mkdir_failed',
                    __('Konnte Verzeichnis für JS-Datei nicht erstellen.', 'unicorn-studio')
                );
            }
        }

        // Write file
        $result = file_put_contents($file_path, $content);

        if ($result === false) {
            return new WP_Error(
                'write_failed',
                __('Konnte JS-Datei nicht schreiben.', 'unicorn-studio')
            );
        }

        return true;
    }

    /**
     * Delete JavaScript file
     */
    private static function delete_js_file() {
        $file_path = self::get_js_file_path();
        if (file_exists($file_path)) {
            @unlink($file_path);
        }
        delete_option(self::OPTION_NAME);
    }

    /**
     * Get JavaScript file path
     *
     * @return string Full file path
     */
    public static function get_js_file_path() {
        $upload_dir = wp_upload_dir();
        return $upload_dir['basedir'] . '/' . self::JS_FILE_PATH;
    }

    /**
     * Get JavaScript file URL
     *
     * @return string|null File URL or null if not exists
     */
    public static function get_js_file_url() {
        $file_path = self::get_js_file_path();
        if (!file_exists($file_path)) {
            return null;
        }

        $upload_dir = wp_upload_dir();
        return $upload_dir['baseurl'] . '/' . self::JS_FILE_PATH;
    }

    /**
     * Enqueue the components JavaScript
     */
    public static function enqueue_scripts() {
        $js_url = self::get_js_file_url();
        if ($js_url) {
            wp_enqueue_script(
                'unicorn-studio-cms-components',
                $js_url,
                [], // No dependencies
                filemtime(self::get_js_file_path()), // Cache busting
                true // In footer
            );
        }
    }

    /**
     * Get stored component data
     *
     * @return array|null
     */
    public static function get_stored_data() {
        return get_option(self::OPTION_NAME, null);
    }
}
