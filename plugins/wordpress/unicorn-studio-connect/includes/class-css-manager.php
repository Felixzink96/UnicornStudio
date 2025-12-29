<?php
/**
 * CSS Manager
 *
 * Downloads and manages CSS from Unicorn Studio (GDPR compliant - local hosting)
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * CSS Manager Class
 */
class Unicorn_Studio_CSS_Manager {

    /**
     * API Client
     */
    private $api;

    /**
     * CSS directory path
     */
    private $css_dir;

    /**
     * CSS directory URL
     */
    private $css_url;

    /**
     * Constructor
     *
     * @param Unicorn_Studio_API_Client $api API client
     */
    public function __construct($api) {
        $this->api = $api;

        $upload_dir = wp_upload_dir();
        $this->css_dir = $upload_dir['basedir'] . '/unicorn-studio/';
        $this->css_url = $upload_dir['baseurl'] . '/unicorn-studio/';
    }

    /**
     * Enqueue CSS in frontend
     */
    public function enqueue_styles() {
        // Debug logging
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        if (!Unicorn_Studio::is_connected()) {
            if ($debug) {
                error_log('[Unicorn Studio CSS] Not connected - skipping CSS enqueue');
            }
            return;
        }

        if (!Unicorn_Studio::get_option('sync_css', true)) {
            if ($debug) {
                error_log('[Unicorn Studio CSS] sync_css option is disabled');
            }
            return;
        }

        $css_file = $this->css_dir . 'styles.css';
        $version = get_option('unicorn_studio_css_version', '1');

        if ($debug) {
            error_log('[Unicorn Studio CSS] Checking file: ' . $css_file);
            error_log('[Unicorn Studio CSS] File exists: ' . (file_exists($css_file) ? 'YES' : 'NO'));
            error_log('[Unicorn Studio CSS] CSS URL: ' . $this->css_url . 'styles.css');
        }

        if (file_exists($css_file)) {
            // Register the style but don't enqueue it yet
            wp_register_style(
                'unicorn-studio-styles',
                $this->css_url . 'styles.css',
                [],
                $version
            );

            // Load CSS with preload hint for faster loading
            add_action('wp_head', function() use ($version) {
                $css_url = $this->css_url . 'styles.css?ver=' . $version;
                // Preload hint for early fetch (optional optimization)
                echo '<link rel="preload" href="' . esc_url($css_url) . '" as="style">' . "\n";
                // Actually load the stylesheet (reliable method)
                echo '<link rel="stylesheet" href="' . esc_url($css_url) . '" id="unicorn-studio-styles">' . "\n";
            }, 5);

            if ($debug) {
                error_log('[Unicorn Studio CSS] Style preloaded for non-blocking render');
            }
        } else {
            if ($debug) {
                error_log('[Unicorn Studio CSS] File does not exist, cannot enqueue');
            }
        }
    }

    /**
     * Sync CSS from Unicorn Studio
     *
     * @return bool|WP_Error
     */
    public function sync_css() {
        // Get CSS from API
        $css = $this->api->get_css();

        if ($css === false) {
            return new WP_Error('css_fetch_failed', __('CSS konnte nicht abgerufen werden.', 'unicorn-studio'));
        }

        // Ensure directory exists
        if (!file_exists($this->css_dir)) {
            wp_mkdir_p($this->css_dir);
        }

        // Add .htaccess for security AND caching
        $htaccess = $this->css_dir . '.htaccess';
        $htaccess_content = <<<HTACCESS
Options -Indexes

# Cache Headers for CSS/Fonts (1 year, immutable)
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "\.(css|woff2?|ttf|otf)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
HTACCESS;
        file_put_contents($htaccess, $htaccess_content);

        // Minify CSS for smaller file size (PageSpeed optimization)
        $css = $this->minify_css($css);

        // Write CSS file
        $css_file = $this->css_dir . 'styles.css';
        $result = file_put_contents($css_file, $css);

        if ($result === false) {
            return new WP_Error('css_write_failed', __('CSS konnte nicht gespeichert werden.', 'unicorn-studio'));
        }

        // Update version for cache busting
        update_option('unicorn_studio_css_version', time());

        return true;
    }

    /**
     * Minify CSS by removing comments, whitespace, and line breaks
     *
     * @param string $css CSS content
     * @return string Minified CSS
     */
    private function minify_css($css) {
        // Remove comments
        $css = preg_replace('!/\*[^*]*\*+([^/][^*]*\*+)*/!', '', $css);

        // REMOVED: Single-line comment removal was breaking URLs like http://
        // CSS doesn't actually support // comments, so this was unnecessary
        // and was breaking data-URLs containing http://

        // Remove whitespace around special characters
        $css = preg_replace('/\s*([{}:;,>+~])\s*/', '$1', $css);

        // Remove multiple spaces
        $css = preg_replace('/\s+/', ' ', $css);

        // Remove spaces around selectors
        $css = preg_replace('/\s*{\s*/', '{', $css);
        $css = preg_replace('/\s*}\s*/', '}', $css);

        // Remove last semicolon before }
        $css = preg_replace('/;+}/', '}', $css);

        // Remove newlines and tabs
        $css = str_replace(["\r\n", "\r", "\n", "\t"], '', $css);

        // Trim
        $css = trim($css);

        return $css;
    }

    /**
     * Check if CSS update is available
     *
     * @return bool
     */
    public function check_for_updates() {
        $local_version = get_option('unicorn_studio_css_version', '0');
        $response = $this->api->get_css_version();

        if (is_wp_error($response)) {
            return false;
        }

        $remote_version = $response['data']['version'] ?? '0';

        return $remote_version > $local_version;
    }

    /**
     * Get CSS file path
     *
     * @return string
     */
    public function get_css_path() {
        return $this->css_dir . 'styles.css';
    }

    /**
     * Get CSS file URL
     *
     * @return string
     */
    public function get_css_url() {
        return $this->css_url . 'styles.css';
    }

    /**
     * Check if CSS file exists
     *
     * @return bool
     */
    public function css_exists() {
        return file_exists($this->get_css_path());
    }

    /**
     * Get CSS file size
     *
     * @return string Human readable size
     */
    public function get_css_size() {
        $path = $this->get_css_path();

        if (!file_exists($path)) {
            return '0 KB';
        }

        $size = filesize($path);
        return size_format($size);
    }

    /**
     * Get last modified time
     *
     * @return string|false Formatted date or false
     */
    public function get_last_modified() {
        $path = $this->get_css_path();

        if (!file_exists($path)) {
            return false;
        }

        return date_i18n(get_option('date_format') . ' ' . get_option('time_format'), filemtime($path));
    }

    /**
     * Delete CSS file
     *
     * @return bool
     */
    public function delete_css() {
        $path = $this->get_css_path();

        if (file_exists($path)) {
            return unlink($path);
        }

        return true;
    }

    /**
     * Generate CSS for arbitrary Tailwind values found in HTML
     *
     * @deprecated 1.35.0 No longer needed - Tailwind v4 compiles all classes correctly.
     *             This function was generating duplicate CSS that conflicted with Tailwind's output.
     *
     * @param string $html HTML content to scan
     * @return string Empty string (function deprecated)
     */
    public static function generate_arbitrary_css($html) {
        // DEPRECATED: Tailwind v4 compiles all arbitrary values correctly.
        // Generating CSS here creates duplicates that can conflict with Tailwind's
        // native CSS Nesting output, breaking animations and transitions.
        return '';

        // Original code kept for reference but never executed:
        $css_rules = [];

        // Extract all classes from HTML
        preg_match_all('/class=["\']([^"\']+)["\']/', $html, $matches);
        $all_classes = [];

        foreach ($matches[1] as $class_string) {
            $classes = preg_split('/\s+/', $class_string);
            $all_classes = array_merge($all_classes, $classes);
        }

        $all_classes = array_unique($all_classes);

        foreach ($all_classes as $cls) {
            $cls = trim($cls);
            if (empty($cls) || strpos($cls, '[') === false) {
                continue;
            }

            $rule = self::parse_arbitrary_class($cls);
            if ($rule) {
                $css_rules[] = $rule;
            }
        }

        if (empty($css_rules)) {
            return '';
        }

        return "\n/* Arbitrary Values (auto-generated) */\n" . implode("\n", array_unique($css_rules)) . "\n";
    }

    /**
     * Parse a single arbitrary Tailwind class and return CSS rule
     *
     * @param string $cls The class name
     * @return string|null CSS rule or null
     */
    private static function parse_arbitrary_class($cls) {
        // Remove responsive/state prefixes for parsing, but keep for selector
        $base_cls = preg_replace('/^(sm:|md:|lg:|xl:|2xl:|hover:|focus:|active:|group-hover:)+/', '', $cls);

        // Extract the arbitrary value
        if (!preg_match('/\[([^\]]+)\]/', $base_cls, $value_match)) {
            return null;
        }

        $value = $value_match[1];
        // Replace underscores with spaces (Tailwind convention)
        $value = str_replace('_', ' ', $value);

        $escaped = self::escape_class_name($cls);
        $css = null;

        // Border color: border-[...] or border-x-[...]
        if (preg_match('/^border(-[tlbrxy])?-\[/', $base_cls)) {
            $is_width = preg_match('/^\d/', $value) || strpos($value, 'px') !== false || strpos($value, 'rem') !== false;
            $prop = $is_width ? 'border-width' : 'border-color';

            if (preg_match('/^border-([tlbr])-\[/', $base_cls, $dir_match)) {
                $dir_map = ['t' => 'top', 'r' => 'right', 'b' => 'bottom', 'l' => 'left'];
                $side = $dir_map[$dir_match[1]] ?? '';
                if ($side) {
                    $css = ".{$escaped} { border-{$side}-" . ($is_width ? 'width' : 'color') . ": {$value}; }";
                }
            } else {
                $css = ".{$escaped} { {$prop}: {$value}; }";
            }
        }
        // Background: bg-[...]
        elseif (preg_match('/^bg-\[/', $base_cls)) {
            $css = ".{$escaped} { background-color: {$value}; }";
        }
        // Text color: text-[...]
        elseif (preg_match('/^text-\[/', $base_cls)) {
            // Could be color or size
            $is_size = preg_match('/^\d/', $value) || strpos($value, 'px') !== false || strpos($value, 'rem') !== false || strpos($value, 'vw') !== false;
            $prop = $is_size ? 'font-size' : 'color';
            $css = ".{$escaped} { {$prop}: {$value}; }";
        }
        // Width: w-[...]
        elseif (preg_match('/^w-\[/', $base_cls)) {
            $css = ".{$escaped} { width: {$value}; }";
        }
        // Height: h-[...]
        elseif (preg_match('/^h-\[/', $base_cls)) {
            $css = ".{$escaped} { height: {$value}; }";
        }
        // Min/Max width/height
        elseif (preg_match('/^(min|max)-(w|h)-\[/', $base_cls, $m)) {
            $prop = ($m[1] === 'min' ? 'min-' : 'max-') . ($m[2] === 'w' ? 'width' : 'height');
            $css = ".{$escaped} { {$prop}: {$value}; }";
        }
        // Padding: p-[...], px-[...], py-[...], pt-[...], etc.
        elseif (preg_match('/^p([xytblr])?-\[/', $base_cls, $m)) {
            $dir = $m[1] ?? '';
            $prop_map = [
                '' => 'padding',
                'x' => 'padding-left: %s; padding-right',
                'y' => 'padding-top: %s; padding-bottom',
                't' => 'padding-top',
                'b' => 'padding-bottom',
                'l' => 'padding-left',
                'r' => 'padding-right',
            ];
            if ($dir === 'x' || $dir === 'y') {
                $css = ".{$escaped} { " . sprintf($prop_map[$dir], $value) . ": {$value}; }";
            } else {
                $css = ".{$escaped} { {$prop_map[$dir]}: {$value}; }";
            }
        }
        // Margin: m-[...], mx-[...], my-[...], mt-[...], etc.
        elseif (preg_match('/^-?m([xytblr])?-\[/', $base_cls, $m)) {
            $dir = $m[1] ?? '';
            $is_negative = strpos($base_cls, '-m') === 0;
            $val = $is_negative ? "-{$value}" : $value;
            $prop_map = [
                '' => 'margin',
                'x' => 'margin-left: %s; margin-right',
                'y' => 'margin-top: %s; margin-bottom',
                't' => 'margin-top',
                'b' => 'margin-bottom',
                'l' => 'margin-left',
                'r' => 'margin-right',
            ];
            if ($dir === 'x' || $dir === 'y') {
                $css = ".{$escaped} { " . sprintf($prop_map[$dir], $val) . ": {$val}; }";
            } else {
                $css = ".{$escaped} { {$prop_map[$dir]}: {$val}; }";
            }
        }
        // Gap: gap-[...]
        elseif (preg_match('/^gap-\[/', $base_cls)) {
            $css = ".{$escaped} { gap: {$value}; }";
        }
        // Font: font-[...]
        elseif (preg_match('/^font-\[/', $base_cls)) {
            // Remove quotes if present
            $font = trim($value, "\"'");
            $css = ".{$escaped} { font-family: '{$font}', sans-serif; }";
        }
        // Leading (line-height): leading-[...]
        elseif (preg_match('/^leading-\[/', $base_cls)) {
            $css = ".{$escaped} { line-height: {$value}; }";
        }
        // Tracking (letter-spacing): tracking-[...]
        elseif (preg_match('/^tracking-\[/', $base_cls)) {
            $css = ".{$escaped} { letter-spacing: {$value}; }";
        }
        // Shadow: shadow-[...]
        elseif (preg_match('/^shadow-\[/', $base_cls)) {
            $css = ".{$escaped} { box-shadow: {$value}; }";
        }
        // Rounded: rounded-[...]
        elseif (preg_match('/^rounded(-[tlbr]{1,2})?-\[/', $base_cls)) {
            $css = ".{$escaped} { border-radius: {$value}; }";
        }
        // Inset: top-[...], left-[...], right-[...], bottom-[...], inset-[...]
        elseif (preg_match('/^(top|right|bottom|left|inset)-\[/', $base_cls, $m)) {
            $css = ".{$escaped} { {$m[1]}: {$value}; }";
        }
        // Z-index: z-[...]
        elseif (preg_match('/^z-\[/', $base_cls)) {
            $css = ".{$escaped} { z-index: {$value}; }";
        }
        // Opacity: opacity-[...]
        elseif (preg_match('/^opacity-\[/', $base_cls)) {
            $css = ".{$escaped} { opacity: {$value}; }";
        }
        // Transform: scale-[...], translate-x-[...], rotate-[...]
        elseif (preg_match('/^(scale|rotate)-\[/', $base_cls, $m)) {
            $fn = $m[1];
            $css = ".{$escaped} { transform: {$fn}({$value}); }";
        }
        elseif (preg_match('/^translate-([xy])-\[/', $base_cls, $m)) {
            $axis = $m[1] === 'x' ? 'X' : 'Y';
            $css = ".{$escaped} { transform: translate{$axis}({$value}); }";
        }
        // Duration: duration-[...]
        elseif (preg_match('/^duration-\[/', $base_cls)) {
            $css = ".{$escaped} { transition-duration: {$value}; }";
        }
        // Grid cols/rows: grid-cols-[...], grid-rows-[...]
        elseif (preg_match('/^grid-(cols|rows)-\[/', $base_cls, $m)) {
            $prop = $m[1] === 'cols' ? 'grid-template-columns' : 'grid-template-rows';
            $css = ".{$escaped} { {$prop}: {$value}; }";
        }
        // Col/Row span: col-span-[...], row-span-[...]
        elseif (preg_match('/^(col|row)-span-\[/', $base_cls, $m)) {
            $prop = $m[1] === 'col' ? 'grid-column' : 'grid-row';
            $css = ".{$escaped} { {$prop}: span {$value} / span {$value}; }";
        }

        // Handle responsive prefixes
        if ($css && preg_match('/^(sm|md|lg|xl|2xl):/', $cls, $prefix_match)) {
            $breakpoints = [
                'sm' => '640px',
                'md' => '768px',
                'lg' => '1024px',
                'xl' => '1280px',
                '2xl' => '1536px',
            ];
            $bp = $breakpoints[$prefix_match[1]] ?? null;
            if ($bp) {
                $css = "@media (min-width: {$bp}) { {$css} }";
            }
        }

        // Handle hover prefix
        if ($css && strpos($cls, 'hover:') !== false) {
            $css = str_replace('.', '.', $css); // Keep as is, add :hover
            $css = preg_replace('/\.([^ ]+) \{/', '.$1:hover {', $css);
        }

        return $css;
    }

    /**
     * Escape class name for CSS selector
     *
     * @param string $cls Class name
     * @return string Escaped class name
     */
    private static function escape_class_name($cls) {
        // Escape special CSS characters
        return preg_replace_callback('/([:\[\]\/\\\\.\-\(\)\,\'\"\#\%])/', function($m) {
            return '\\' . $m[1];
        }, $cls);
    }
}
