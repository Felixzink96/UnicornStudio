<?php
/**
 * Template Converter
 *
 * Converts Unicorn Studio template syntax (Handlebars-like) to WordPress/ACF PHP
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Template Converter Class
 */
class Unicorn_Studio_Template_Converter {

    /**
     * Available filters
     */
    private $filters = [
        'date'      => 'date_i18n("d.m.Y", strtotime(%s))',
        'datetime'  => 'date_i18n("d.m.Y H:i", strtotime(%s))',
        'time'      => 'date_i18n("H:i", strtotime(%s))',
        'currency'  => 'number_format(%s, 2, ",", ".") . " €"',
        'number'    => 'number_format(%s, 0, ",", ".")',
        'uppercase' => 'strtoupper(%s)',
        'lowercase' => 'strtolower(%s)',
        'ucfirst'   => 'ucfirst(%s)',
        'trim'      => 'trim(%s)',
        'strip_tags'=> 'strip_tags(%s)',
        'nl2br'     => 'nl2br(%s)',
        'escape'    => 'esc_html(%s)',
        'raw'       => '%s',
    ];

    /**
     * Context for current conversion
     */
    private $context = [];

    /**
     * Convert Unicorn template to WordPress PHP
     *
     * @param string $template Template string
     * @param array $context Additional context
     * @return string PHP template
     */
    public function convert(string $template, array $context = []): string {
        $this->context = $context;

        // Order matters! Process in correct sequence
        $template = $this->convert_comments($template);
        $template = $this->convert_components($template);
        $template = $this->convert_each_loops($template);
        $template = $this->convert_conditionals($template);
        $template = $this->convert_entry_variables($template);
        $template = $this->convert_site_variables($template);
        $template = $this->convert_filters($template);

        return $template;
    }

    /**
     * Convert comments
     * {{! comment }} or {{!-- comment --}}
     *
     * @param string $template
     * @return string
     */
    private function convert_comments(string $template): string {
        // Block comments {{!-- ... --}}
        $template = preg_replace('/\{\{!--[\s\S]*?--\}\}/', '', $template);

        // Inline comments {{! ... }}
        $template = preg_replace('/\{\{![^}]*\}\}/', '', $template);

        return $template;
    }

    /**
     * Convert entry variables
     * {{entry.title}}, {{entry.content}}, {{entry.data.fieldname}}
     *
     * @param string $template
     * @return string
     */
    private function convert_entry_variables(string $template): string {
        // Built-in WordPress fields
        $wp_fields = [
            '{{entry.title}}'           => '<?php the_title(); ?>',
            '{{entry.content}}'         => '<?php the_content(); ?>',
            '{{entry.excerpt}}'         => '<?php the_excerpt(); ?>',
            '{{entry.id}}'              => '<?php the_ID(); ?>',
            '{{entry.slug}}'            => '<?php echo get_post_field("post_name"); ?>',
            '{{entry.status}}'          => '<?php echo get_post_status(); ?>',
            '{{entry.type}}'            => '<?php echo get_post_type(); ?>',
            '{{entry.author}}'          => '<?php the_author(); ?>',
            '{{entry.author_id}}'       => '<?php echo get_the_author_meta("ID"); ?>',
            '{{entry.date}}'            => '<?php echo get_the_date(); ?>',
            '{{entry.time}}'            => '<?php echo get_the_time(); ?>',
            '{{entry.modified}}'        => '<?php echo get_the_modified_date(); ?>',
            '{{entry.permalink}}'       => '<?php the_permalink(); ?>',
            '{{entry.featured_image}}'  => '<?php the_post_thumbnail(); ?>',
        ];

        $template = str_replace(array_keys($wp_fields), array_values($wp_fields), $template);

        // Featured image with size: {{entry.featured_image.large}}
        $template = preg_replace_callback(
            '/\{\{entry\.featured_image\.(\w+)\}\}/',
            function($matches) {
                $size = $matches[1];
                return "<?php the_post_thumbnail('{$size}'); ?>";
            },
            $template
        );

        // Featured image URL: {{entry.featured_image_url}}
        $template = str_replace(
            '{{entry.featured_image_url}}',
            '<?php echo get_the_post_thumbnail_url(null, "full"); ?>',
            $template
        );

        // ACF fields: {{entry.data.fieldname}}
        $template = preg_replace_callback(
            '/\{\{entry\.data\.([a-zA-Z0-9_]+)\}\}/',
            function($matches) {
                $field = $matches[1];
                return "<?php echo esc_html(get_field('{$field}')); ?>";
            },
            $template
        );

        // ACF field properties: {{entry.data.image.url}}, {{entry.data.image.alt}}
        $template = preg_replace_callback(
            '/\{\{entry\.data\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}/',
            function($matches) {
                $field = $matches[1];
                $prop = $matches[2];
                return "<?php \$_{$field} = get_field('{$field}'); echo esc_attr(\$_{$field}['{$prop}'] ?? ''); ?>";
            },
            $template
        );

        // ACF sub-field (inside repeater): {{this.fieldname}}
        $template = preg_replace_callback(
            '/\{\{this\.([a-zA-Z0-9_]+)\}\}/',
            function($matches) {
                $field = $matches[1];
                return "<?php echo esc_html(get_sub_field('{$field}')); ?>";
            },
            $template
        );

        // ACF sub-field properties: {{this.image.url}}
        $template = preg_replace_callback(
            '/\{\{this\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\}\}/',
            function($matches) {
                $field = $matches[1];
                $prop = $matches[2];
                return "<?php \$_{$field} = get_sub_field('{$field}'); echo esc_attr(\$_{$field}['{$prop}'] ?? ''); ?>";
            },
            $template
        );

        // Loop index: {{@index}}, {{@first}}, {{@last}}
        $template = str_replace('{{@index}}', '<?php echo get_row_index() - 1; ?>', $template);
        $template = str_replace('{{@number}}', '<?php echo get_row_index(); ?>', $template);

        return $template;
    }

    /**
     * Convert site variables
     * {{site.name}}, {{site.url}}, etc.
     *
     * @param string $template
     * @return string
     */
    private function convert_site_variables(string $template): string {
        $site_vars = [
            '{{site.name}}'         => '<?php bloginfo("name"); ?>',
            '{{site.description}}'  => '<?php bloginfo("description"); ?>',
            '{{site.url}}'          => '<?php echo home_url(); ?>',
            '{{site.admin_url}}'    => '<?php echo admin_url(); ?>',
            '{{site.language}}'     => '<?php echo get_locale(); ?>',
            '{{site.charset}}'      => '<?php bloginfo("charset"); ?>',
            '{{site.theme_url}}'    => '<?php echo get_template_directory_uri(); ?>',
            '{{site.uploads_url}}'  => '<?php echo wp_upload_dir()["baseurl"]; ?>',
            '{{current_year}}'      => '<?php echo date("Y"); ?>',
            '{{current_date}}'      => '<?php echo date_i18n(get_option("date_format")); ?>',
        ];

        return str_replace(array_keys($site_vars), array_values($site_vars), $template);
    }

    /**
     * Convert filters
     * {{value | filter}} or {{value | filter:"arg"}}
     *
     * @param string $template
     * @return string
     */
    private function convert_filters(string $template): string {
        // Pattern: {{something | filtername}} or {{something | filtername:"arg"}}
        return preg_replace_callback(
            '/\{\{([^}|]+)\s*\|\s*(\w+)(?::([^}]+))?\}\}/',
            function($matches) {
                $value = trim($matches[1]);
                $filter = $matches[2];
                $arg = isset($matches[3]) ? trim($matches[3], '"\'') : null;

                // Get the PHP value expression
                $php_value = $this->get_php_value($value);

                // Apply filter
                if (isset($this->filters[$filter])) {
                    $format = $this->filters[$filter];
                    $filtered = sprintf($format, $php_value);

                    // Special handling for date with custom format
                    if ($filter === 'date' && $arg) {
                        $filtered = "date_i18n(\"{$arg}\", strtotime({$php_value}))";
                    }

                    return "<?php echo {$filtered}; ?>";
                }

                // Unknown filter - output as-is with escaping
                return "<?php echo esc_html({$php_value}); ?>";
            },
            $template
        );
    }

    /**
     * Get PHP expression for a value path
     *
     * @param string $path Value path like "entry.data.price"
     * @return string PHP expression
     */
    private function get_php_value(string $path): string {
        $parts = explode('.', $path);

        if ($parts[0] === 'entry') {
            if (isset($parts[1]) && $parts[1] === 'data' && isset($parts[2])) {
                $field = $parts[2];
                if (isset($parts[3])) {
                    $prop = $parts[3];
                    return "get_field('{$field}')['{$prop}']";
                }
                return "get_field('{$field}')";
            }
            // Built-in fields
            switch ($parts[1] ?? '') {
                case 'title': return 'get_the_title()';
                case 'date': return 'get_the_date()';
                case 'excerpt': return 'get_the_excerpt()';
                default: return "get_post_field('{$parts[1]}')";
            }
        }

        if ($parts[0] === 'this') {
            $field = $parts[1] ?? '';
            if (isset($parts[2])) {
                $prop = $parts[2];
                return "get_sub_field('{$field}')['{$prop}']";
            }
            return "get_sub_field('{$field}')";
        }

        // Variable reference
        return '$' . str_replace('.', "['", $path) . (substr_count($path, '.') > 0 ? str_repeat("']", substr_count($path, '.')) : '');
    }

    /**
     * Convert each loops
     * {{#each entries}}...{{/each}}
     * {{#each entry.data.items}}...{{/each}}
     *
     * @param string $template
     * @return string
     */
    private function convert_each_loops(string $template): string {
        // Archive loop: {{#each entries}}
        $template = preg_replace_callback(
            '/\{\{#each\s+entries\s*\}\}([\s\S]*?)\{\{\/each\}\}/',
            function($matches) {
                $inner = $matches[1];
                return "<?php if (have_posts()): while (have_posts()): the_post(); ?>\n{$inner}\n<?php endwhile; endif; ?>";
            },
            $template
        );

        // ACF Repeater: {{#each entry.data.fieldname}}
        $template = preg_replace_callback(
            '/\{\{#each\s+entry\.data\.([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/',
            function($matches) {
                $field = $matches[1];
                $inner = $matches[2];
                return "<?php if (have_rows('{$field}')): while (have_rows('{$field}')): the_row(); ?>\n{$inner}\n<?php endwhile; endif; ?>";
            },
            $template
        );

        // Generic array loop: {{#each items}}
        $template = preg_replace_callback(
            '/\{\{#each\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/each\}\}/',
            function($matches) {
                $var = $matches[1];
                $inner = $matches[2];
                return "<?php foreach (\${$var} as \$item): ?>\n{$inner}\n<?php endforeach; ?>";
            },
            $template
        );

        return $template;
    }

    /**
     * Convert conditionals
     * {{#if condition}}...{{else}}...{{/if}}
     *
     * @param string $template
     * @return string
     */
    private function convert_conditionals(string $template): string {
        // {{#if entry.data.fieldname}}...{{else}}...{{/if}}
        $template = preg_replace_callback(
            '/\{\{#if\s+entry\.data\.([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/',
            function($matches) {
                $field = $matches[1];
                $if_block = $matches[2];
                $else_block = $matches[3] ?? '';

                $php = "<?php if (get_field('{$field}')): ?>\n{$if_block}\n";
                if ($else_block) {
                    $php .= "<?php else: ?>\n{$else_block}\n";
                }
                $php .= "<?php endif; ?>";

                return $php;
            },
            $template
        );

        // {{#if this.fieldname}} (inside repeater)
        $template = preg_replace_callback(
            '/\{\{#if\s+this\.([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/',
            function($matches) {
                $field = $matches[1];
                $if_block = $matches[2];
                $else_block = $matches[3] ?? '';

                $php = "<?php if (get_sub_field('{$field}')): ?>\n{$if_block}\n";
                if ($else_block) {
                    $php .= "<?php else: ?>\n{$else_block}\n";
                }
                $php .= "<?php endif; ?>";

                return $php;
            },
            $template
        );

        // {{#if entry.featured_image}}
        $template = preg_replace_callback(
            '/\{\{#if\s+entry\.featured_image\s*\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/',
            function($matches) {
                $if_block = $matches[1];
                $else_block = $matches[2] ?? '';

                $php = "<?php if (has_post_thumbnail()): ?>\n{$if_block}\n";
                if ($else_block) {
                    $php .= "<?php else: ?>\n{$else_block}\n";
                }
                $php .= "<?php endif; ?>";

                return $php;
            },
            $template
        );

        // {{#unless condition}} (negative)
        $template = preg_replace_callback(
            '/\{\{#unless\s+entry\.data\.([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/unless\}\}/',
            function($matches) {
                $field = $matches[1];
                $block = $matches[2];
                return "<?php if (!get_field('{$field}')): ?>\n{$block}\n<?php endif; ?>";
            },
            $template
        );

        return $template;
    }

    /**
     * Convert components
     * {{component "button" text="Click me" url="/link"}}
     *
     * @param string $template
     * @return string
     */
    private function convert_components(string $template): string {
        // {{component "name" attr="value" attr2="value2"}}
        return preg_replace_callback(
            '/\{\{component\s+"([^"]+)"([^}]*)\}\}/',
            function($matches) {
                $component = $matches[1];
                $attrs_str = trim($matches[2]);

                // Parse attributes
                $args = [];
                if ($attrs_str) {
                    preg_match_all('/(\w+)="([^"]*)"/', $attrs_str, $attr_matches, PREG_SET_ORDER);
                    foreach ($attr_matches as $attr) {
                        $args[] = "'{$attr[1]}' => '{$attr[2]}'";
                    }
                }

                $args_php = $args ? '[' . implode(', ', $args) . ']' : 'null';

                return "<?php get_template_part('components/{$component}', null, {$args_php}); ?>";
            },
            $template
        );
    }

    /**
     * Add custom filter
     *
     * @param string $name Filter name
     * @param string $format PHP format string with %s placeholder
     */
    public function add_filter(string $name, string $format): void {
        $this->filters[$name] = $format;
    }

    /**
     * Get all available filters
     *
     * @return array
     */
    public function get_filters(): array {
        return array_keys($this->filters);
    }
}
