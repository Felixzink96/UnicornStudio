<?php
/**
 * Fields Handler
 *
 * Generates ACF Field Groups from Unicorn Studio Fields
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Fields Class
 */
class Unicorn_Studio_Fields {

    /**
     * Stored content types with fields
     */
    private $content_types;

    /**
     * Constructor
     */
    public function __construct() {
        $this->content_types = get_option('unicorn_studio_content_types', []);
    }

    /**
     * Register ACF field groups for all content types
     */
    public function register_field_groups() {
        // Check if ACF is available
        if (!function_exists('acf_add_local_field_group')) {
            return;
        }

        foreach ($this->content_types as $type) {
            if (!empty($type['fields'])) {
                $this->register_field_group_for_type($type);
            }
        }
    }

    /**
     * Register field group for a content type
     *
     * @param array $type Content type data with fields
     */
    private function register_field_group_for_type($type) {
        $post_type = unicorn_studio()->content_types->get_post_type_name($type['name']);
        $fields = $this->convert_fields($type['fields'], 'field_us_' . $type['id']);

        acf_add_local_field_group([
            'key'                   => 'group_unicorn_' . $type['id'],
            'title'                 => sprintf(__('%s Felder', 'unicorn-studio'), $type['label_singular']),
            'fields'                => $fields,
            'location'              => [
                [
                    [
                        'param'    => 'post_type',
                        'operator' => '==',
                        'value'    => $post_type,
                    ],
                ],
            ],
            'menu_order'            => 0,
            'position'              => 'normal',
            'style'                 => 'default',
            'label_placement'       => 'top',
            'instruction_placement' => 'label',
            'active'                => true,
        ]);
    }

    /**
     * Convert Unicorn Studio fields to ACF fields
     *
     * @param array  $fields     Fields from Unicorn Studio
     * @param string $parent_key Parent key for nested fields
     * @return array ACF fields
     */
    private function convert_fields($fields, $parent_key = '') {
        $acf_fields = [];

        // Sort by position
        usort($fields, function($a, $b) {
            return ($a['position'] ?? 0) - ($b['position'] ?? 0);
        });

        foreach ($fields as $field) {
            $acf_field = $this->convert_single_field($field, $parent_key);
            if ($acf_field) {
                $acf_fields[] = $acf_field;
            }
        }

        return $acf_fields;
    }

    /**
     * Convert a single field to ACF format
     *
     * @param array  $field      Field data
     * @param string $parent_key Parent key
     * @return array|null ACF field or null
     */
    private function convert_single_field($field, $parent_key = '') {
        $key = $parent_key . '_' . sanitize_key($field['name']);
        $settings = $field['settings'] ?? [];

        $acf_field = [
            'key'          => $key,
            'label'        => $field['label'],
            'name'         => $field['name'],
            'required'     => $field['required'] ?? false,
            'instructions' => $field['instructions'] ?? '',
        ];

        // Handle width
        if (isset($field['width'])) {
            $width_map = [
                '100%' => 100,
                '50%'  => 50,
                '33%'  => 33,
                '25%'  => 25,
            ];
            $acf_field['wrapper'] = [
                'width' => $width_map[$field['width']] ?? 100,
            ];
        }

        // Convert by type
        switch ($field['type']) {
            // ========================================
            // TEXT FIELDS
            // ========================================
            case 'text':
                $acf_field['type'] = 'text';
                $acf_field['placeholder'] = $settings['placeholder'] ?? '';
                $acf_field['maxlength'] = $settings['maxLength'] ?? '';
                $acf_field['prepend'] = $settings['prefix'] ?? '';
                $acf_field['append'] = $settings['suffix'] ?? '';
                break;

            case 'textarea':
                $acf_field['type'] = 'textarea';
                $acf_field['placeholder'] = $settings['placeholder'] ?? '';
                $acf_field['rows'] = $settings['rows'] ?? 4;
                $acf_field['maxlength'] = $settings['maxLength'] ?? '';
                break;

            case 'richtext':
                $acf_field['type'] = 'wysiwyg';
                $acf_field['tabs'] = 'all';
                $acf_field['toolbar'] = 'full';
                $acf_field['media_upload'] = 1;
                break;

            // ========================================
            // NUMBER FIELDS
            // ========================================
            case 'number':
                $acf_field['type'] = 'number';
                $acf_field['min'] = $settings['min'] ?? '';
                $acf_field['max'] = $settings['max'] ?? '';
                $acf_field['step'] = $settings['step'] ?? 1;
                $acf_field['prepend'] = $settings['prefix'] ?? '';
                $acf_field['append'] = $settings['suffix'] ?? '';
                break;

            case 'range':
                $acf_field['type'] = 'range';
                $acf_field['min'] = $settings['min'] ?? 0;
                $acf_field['max'] = $settings['max'] ?? 100;
                $acf_field['step'] = $settings['step'] ?? 1;
                break;

            // ========================================
            // MEDIA FIELDS
            // ========================================
            case 'image':
                $acf_field['type'] = 'image';
                $acf_field['return_format'] = 'array';
                $acf_field['preview_size'] = 'medium';
                $acf_field['library'] = 'all';
                break;

            case 'gallery':
                $acf_field['type'] = 'gallery';
                $acf_field['return_format'] = 'array';
                $acf_field['preview_size'] = 'medium';
                $acf_field['library'] = 'all';
                $acf_field['min'] = $settings['minImages'] ?? '';
                $acf_field['max'] = $settings['maxImages'] ?? '';
                break;

            case 'file':
                $acf_field['type'] = 'file';
                $acf_field['return_format'] = 'array';
                $acf_field['library'] = 'all';
                if (!empty($settings['allowedTypes'])) {
                    $acf_field['mime_types'] = implode(',', $settings['allowedTypes']);
                }
                break;

            case 'video':
                $acf_field['type'] = 'oembed';
                break;

            // ========================================
            // CHOICE FIELDS
            // ========================================
            case 'select':
                $acf_field['type'] = 'select';
                $acf_field['choices'] = $this->convert_options($settings['options'] ?? []);
                $acf_field['multiple'] = $settings['multiple'] ?? false;
                $acf_field['ui'] = $settings['searchable'] ?? false;
                $acf_field['allow_null'] = !($field['required'] ?? false);
                break;

            case 'radio':
                $acf_field['type'] = 'radio';
                $acf_field['choices'] = $this->convert_options($settings['options'] ?? []);
                $acf_field['layout'] = ($settings['layout'] ?? 'vertical') === 'horizontal' ? 'horizontal' : 'vertical';
                break;

            case 'checkbox':
                $acf_field['type'] = 'checkbox';
                $acf_field['choices'] = $this->convert_options($settings['options'] ?? []);
                $acf_field['layout'] = ($settings['layout'] ?? 'vertical') === 'horizontal' ? 'horizontal' : 'vertical';
                break;

            case 'toggle':
                $acf_field['type'] = 'true_false';
                $acf_field['message'] = $settings['labelOn'] ?? '';
                $acf_field['ui'] = 1;
                break;

            // ========================================
            // DATE & TIME FIELDS
            // ========================================
            case 'date':
                $acf_field['type'] = 'date_picker';
                $acf_field['display_format'] = 'd.m.Y';
                $acf_field['return_format'] = 'Y-m-d';
                break;

            case 'datetime':
                $acf_field['type'] = 'date_time_picker';
                $acf_field['display_format'] = 'd.m.Y H:i';
                $acf_field['return_format'] = 'Y-m-d H:i:s';
                break;

            case 'time':
                $acf_field['type'] = 'time_picker';
                $acf_field['display_format'] = 'H:i';
                $acf_field['return_format'] = 'H:i:s';
                break;

            // ========================================
            // SPECIAL FIELDS
            // ========================================
            case 'color':
                $acf_field['type'] = 'color_picker';
                $acf_field['enable_opacity'] = $settings['alpha'] ?? false;
                break;

            case 'link':
                $acf_field['type'] = 'link';
                $acf_field['return_format'] = 'array';
                break;

            case 'email':
                $acf_field['type'] = 'email';
                break;

            case 'url':
                $acf_field['type'] = 'url';
                break;

            // ========================================
            // RELATIONAL FIELDS
            // ========================================
            case 'relation':
                $acf_field['type'] = 'relationship';
                $content_type_name = $settings['contentType'] ?? '';
                if ($content_type_name && function_exists('unicorn_studio')) {
                    $post_type = unicorn_studio()->content_types->get_post_type_name($content_type_name);
                    $acf_field['post_type'] = [$post_type];
                }
                $acf_field['multiple'] = ($settings['multiple'] ?? false) ? 1 : 0;
                $acf_field['return_format'] = 'object';
                $acf_field['filters'] = ['search'];
                break;

            case 'taxonomy':
                $acf_field['type'] = 'taxonomy';
                $taxonomy_name = $settings['taxonomy'] ?? '';
                if ($taxonomy_name && function_exists('unicorn_studio')) {
                    $taxonomy = unicorn_studio()->taxonomies->get_taxonomy_name($taxonomy_name);
                    $acf_field['taxonomy'] = $taxonomy;
                } else {
                    $acf_field['taxonomy'] = 'category';
                }
                $acf_field['field_type'] = ($settings['multiple'] ?? true) ? 'multi_select' : 'select';
                $acf_field['add_term'] = $settings['createNew'] ?? true;
                $acf_field['return_format'] = 'object';
                break;

            // ========================================
            // STRUCTURED FIELDS
            // ========================================
            case 'group':
                $acf_field['type'] = 'group';
                $acf_field['layout'] = 'block';
                if (!empty($field['sub_fields'])) {
                    $acf_field['sub_fields'] = $this->convert_fields($field['sub_fields'], $key);
                }
                break;

            case 'repeater':
                $acf_field['type'] = 'repeater';
                $acf_field['layout'] = 'block';
                $acf_field['button_label'] = $settings['buttonLabel'] ?? __('Eintrag hinzufügen', 'unicorn-studio');
                $acf_field['min'] = $settings['minRows'] ?? '';
                $acf_field['max'] = $settings['maxRows'] ?? '';
                if (!empty($field['sub_fields'])) {
                    $acf_field['sub_fields'] = $this->convert_fields($field['sub_fields'], $key);
                }
                break;

            case 'flexible':
                $acf_field['type'] = 'flexible_content';
                $acf_field['button_label'] = $settings['buttonLabel'] ?? __('Layout hinzufügen', 'unicorn-studio');
                if (!empty($field['layouts'])) {
                    $acf_field['layouts'] = $this->convert_layouts($field['layouts'], $key);
                }
                break;

            // ========================================
            // DEFAULT / UNKNOWN
            // ========================================
            default:
                // Unknown field type - use text as fallback
                $acf_field['type'] = 'text';
                $acf_field['instructions'] = sprintf(
                    __('(Ursprünglicher Feldtyp: %s)', 'unicorn-studio'),
                    $field['type']
                );
                break;
        }

        return $acf_field;
    }

    /**
     * Convert options array to ACF choices format
     *
     * @param array $options Options from Unicorn Studio
     * @return array ACF choices
     */
    private function convert_options($options) {
        $choices = [];
        foreach ($options as $option) {
            $value = $option['value'] ?? $option['label'] ?? '';
            $label = $option['label'] ?? $value;
            $choices[$value] = $label;
        }
        return $choices;
    }

    /**
     * Convert flexible content layouts
     *
     * @param array  $layouts    Layouts from Unicorn Studio
     * @param string $parent_key Parent key
     * @return array ACF layouts
     */
    private function convert_layouts($layouts, $parent_key) {
        $acf_layouts = [];

        foreach ($layouts as $layout) {
            $layout_key = $parent_key . '_layout_' . sanitize_key($layout['name']);
            $acf_layouts[$layout['name']] = [
                'key'        => $layout_key,
                'name'       => $layout['name'],
                'label'      => $layout['label'],
                'display'    => 'block',
                'sub_fields' => !empty($layout['fields'])
                    ? $this->convert_fields($layout['fields'], $layout_key)
                    : [],
            ];
        }

        return $acf_layouts;
    }

    /**
     * Check if ACF Pro is available
     *
     * @return bool
     */
    public static function is_acf_available() {
        return function_exists('acf_add_local_field_group');
    }

    /**
     * Check if ACF Pro features are available
     *
     * @return bool
     */
    public static function is_acf_pro() {
        return class_exists('acf_pro');
    }
}
