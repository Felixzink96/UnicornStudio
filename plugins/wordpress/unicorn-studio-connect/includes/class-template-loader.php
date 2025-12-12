<?php
/**
 * Template Loader
 *
 * Loads converted Unicorn Studio templates for Custom Post Types
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Template Loader Class
 */
class Unicorn_Studio_Template_Loader {

    /**
     * Template directory
     */
    private $template_dir;

    /**
     * Template converter
     */
    private $converter;

    /**
     * Constructor
     */
    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->template_dir = $upload_dir['basedir'] . '/unicorn-templates/';
        $this->converter = new Unicorn_Studio_Template_Converter();

        // Create template directory
        if (!file_exists($this->template_dir)) {
            wp_mkdir_p($this->template_dir);
        }

        // Template filters
        add_filter('single_template', [$this, 'load_single_template']);
        add_filter('archive_template', [$this, 'load_archive_template']);
        add_filter('taxonomy_template', [$this, 'load_taxonomy_template']);
    }

    /**
     * Load single template for Unicorn CPTs
     *
     * @param string $template Current template
     * @return string
     */
    public function load_single_template(string $template): string {
        $post_type = get_post_type();

        // Only for Unicorn CPTs
        if (!$post_type || strpos($post_type, 'us_') !== 0) {
            return $template;
        }

        // Check for custom template
        $custom_template = $this->template_dir . "single-{$post_type}.php";
        if (file_exists($custom_template)) {
            return $custom_template;
        }

        // Check for stored template in API and convert
        $stored_template = $this->get_stored_template($post_type, 'single');
        if ($stored_template) {
            $converted = $this->converter->convert($stored_template);
            $this->save_template("single-{$post_type}", $converted);
            return $this->template_dir . "single-{$post_type}.php";
        }

        return $template;
    }

    /**
     * Load archive template for Unicorn CPTs
     *
     * @param string $template Current template
     * @return string
     */
    public function load_archive_template(string $template): string {
        if (!is_post_type_archive()) {
            return $template;
        }

        $post_type = get_query_var('post_type');
        if (!is_string($post_type) || strpos($post_type, 'us_') !== 0) {
            return $template;
        }

        // Check for custom template
        $custom_template = $this->template_dir . "archive-{$post_type}.php";
        if (file_exists($custom_template)) {
            return $custom_template;
        }

        // Check for stored template
        $stored_template = $this->get_stored_template($post_type, 'archive');
        if ($stored_template) {
            $converted = $this->converter->convert($stored_template);
            $this->save_template("archive-{$post_type}", $converted);
            return $this->template_dir . "archive-{$post_type}.php";
        }

        return $template;
    }

    /**
     * Load taxonomy template for Unicorn taxonomies
     *
     * @param string $template Current template
     * @return string
     */
    public function load_taxonomy_template(string $template): string {
        if (!is_tax()) {
            return $template;
        }

        $queried = get_queried_object();
        if (!$queried || !isset($queried->taxonomy)) {
            return $template;
        }

        $taxonomy = $queried->taxonomy;
        if (strpos($taxonomy, 'us_') !== 0) {
            return $template;
        }

        // Check for custom template
        $custom_template = $this->template_dir . "taxonomy-{$taxonomy}.php";
        if (file_exists($custom_template)) {
            return $custom_template;
        }

        return $template;
    }

    /**
     * Get stored template from Unicorn Studio
     *
     * @param string $post_type Post type
     * @param string $type Template type (single, archive)
     * @return string|null
     */
    private function get_stored_template(string $post_type, string $type): ?string {
        // Get content types from options
        $content_types = get_option('unicorn_studio_content_types', []);

        // Find the content type
        foreach ($content_types as $ct) {
            $ct_name = 'us_' . sanitize_key($ct['name'] ?? '');
            if ($ct_name === $post_type) {
                // Check for template
                $template_key = $type . '_template';
                if (!empty($ct[$template_key])) {
                    return $ct[$template_key];
                }
            }
        }

        return null;
    }

    /**
     * Save converted template to file
     *
     * @param string $name Template name
     * @param string $content PHP content
     * @return bool
     */
    public function save_template(string $name, string $content): bool {
        $file_path = $this->template_dir . "{$name}.php";

        // Add PHP header and wrapper
        $php_content = "<?php\n";
        $php_content .= "/**\n";
        $php_content .= " * Unicorn Studio Template: {$name}\n";
        $php_content .= " * Auto-generated - do not edit directly\n";
        $php_content .= " * Generated: " . date('Y-m-d H:i:s') . "\n";
        $php_content .= " */\n\n";
        $php_content .= "defined('ABSPATH') || exit;\n\n";

        // Check if theme has unicorn header
        if (function_exists('unicorn_get_header')) {
            $php_content .= "unicorn_get_header();\n";
        } else {
            $php_content .= "get_header();\n";
        }

        $php_content .= "?>\n\n";
        $php_content .= $content;
        $php_content .= "\n\n<?php\n";

        // Footer
        if (function_exists('unicorn_get_footer')) {
            $php_content .= "unicorn_get_footer();\n";
        } else {
            $php_content .= "get_footer();\n";
        }

        return (bool) file_put_contents($file_path, $php_content);
    }

    /**
     * Delete template file
     *
     * @param string $name Template name
     * @return bool
     */
    public function delete_template(string $name): bool {
        $file_path = $this->template_dir . "{$name}.php";
        if (file_exists($file_path)) {
            return unlink($file_path);
        }
        return true;
    }

    /**
     * Get all stored templates
     *
     * @return array
     */
    public function get_templates(): array {
        $templates = [];
        $files = glob($this->template_dir . '*.php');

        foreach ($files as $file) {
            $name = basename($file, '.php');
            $templates[] = [
                'name' => $name,
                'file' => $file,
                'modified' => filemtime($file),
            ];
        }

        return $templates;
    }

    /**
     * Clear all templates
     *
     * @return int Number of deleted files
     */
    public function clear_templates(): int {
        $count = 0;
        $files = glob($this->template_dir . '*.php');

        foreach ($files as $file) {
            if (unlink($file)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get template directory
     *
     * @return string
     */
    public function get_template_dir(): string {
        return $this->template_dir;
    }
}
