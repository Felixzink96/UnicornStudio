<?php
/**
 * CSS Debug Page
 * Shows comparison between Unicorn Studio and WordPress CSS
 */

defined('ABSPATH') || exit;

$api_url = Unicorn_Studio::get_option('api_url', '');
$site_id = Unicorn_Studio::get_site_id();
$api_key = Unicorn_Studio::get_api_key();
$is_connected = Unicorn_Studio::is_connected();

// Get current page content for analysis
$css_file = wp_upload_dir()['basedir'] . '/unicorn-studio/styles.css';
$css_exists = file_exists($css_file);
$css_content = $css_exists ? file_get_contents($css_file) : '';
$css_size = $css_exists ? size_format(filesize($css_file)) : '0 KB';

// Extract classes from header and footer (stored in unicorn_studio_global_components)
$global_components = get_option('unicorn_studio_global_components', []);
$header = $global_components['header'] ?? null;
$footer = $global_components['footer'] ?? null;
$header_html = $header['html'] ?? '';
$footer_html = $footer['html'] ?? '';

// Get all Unicorn Studio pages
$pages = get_posts([
    'post_type' => 'page',
    'posts_per_page' => -1,
    'meta_query' => [
        [
            'key' => '_unicorn_studio_id',
            'compare' => 'EXISTS',
        ],
    ],
]);

// Extract all classes
function extract_classes_from_html($html) {
    $classes = [];
    preg_match_all('/class=["\']([^"\']+)["\']/', $html, $matches);
    foreach ($matches[1] as $class_string) {
        $parts = preg_split('/\s+/', $class_string);
        foreach ($parts as $cls) {
            $cls = trim($cls);
            if ($cls && !str_starts_with($cls, '{')) {
                $classes[] = $cls;
            }
        }
    }
    return array_unique($classes);
}

$all_classes = [];
$sources = [];

// Header classes
if ($header_html) {
    $header_classes = extract_classes_from_html($header_html);
    $all_classes = array_merge($all_classes, $header_classes);
    $sources['Header'] = count($header_classes);
}

// Footer classes
if ($footer_html) {
    $footer_classes = extract_classes_from_html($footer_html);
    $all_classes = array_merge($all_classes, $footer_classes);
    $sources['Footer'] = count($footer_classes);
}

// Page classes
foreach ($pages as $page) {
    $html = get_post_meta($page->ID, '_unicorn_studio_html', true);
    if (!$html) $html = $page->post_content;
    $page_classes = extract_classes_from_html($html);
    $all_classes = array_merge($all_classes, $page_classes);
    $sources[$page->post_title] = count($page_classes);
}

$all_classes = array_unique($all_classes);
sort($all_classes);

// Check which classes have CSS
function check_class_in_css($class, $css) {
    // Escape for CSS selector
    $escaped = preg_replace_callback('/([:\[\]\/\\\\.\-\(\)\,\'\"\#])/', function($m) {
        return '\\' . $m[1];
    }, $class);
    return strpos($css, '.' . $escaped) !== false || strpos($css, '.' . $class) !== false;
}

$classes_with_css = [];
$classes_without_css = [];
$arbitrary_classes = [];

foreach ($all_classes as $cls) {
    if (strpos($cls, '[') !== false && strpos($cls, ']') !== false) {
        $arbitrary_classes[] = $cls;
    }

    if (check_class_in_css($cls, $css_content)) {
        $classes_with_css[] = $cls;
    } else {
        $classes_without_css[] = $cls;
    }
}
?>

<div class="wrap">
    <h1>CSS Debug - Unicorn Studio</h1>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
        <!-- Summary Card -->
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0;">Zusammenfassung</h2>
            <table class="widefat" style="margin-top: 10px;">
                <tr><td><strong>CSS Datei</strong></td><td><?php echo $css_exists ? 'Vorhanden' : 'Fehlt!'; ?></td></tr>
                <tr><td><strong>CSS Größe</strong></td><td><?php echo esc_html($css_size); ?></td></tr>
                <tr><td><strong>Gefundene Klassen</strong></td><td><?php echo count($all_classes); ?></td></tr>
                <tr><td><strong>Mit CSS</strong></td><td style="color: green;"><?php echo count($classes_with_css); ?></td></tr>
                <tr><td><strong>Ohne CSS</strong></td><td style="color: <?php echo count($classes_without_css) > 0 ? 'red' : 'green'; ?>;"><?php echo count($classes_without_css); ?></td></tr>
                <tr><td><strong>Arbitrary Values</strong></td><td><?php echo count($arbitrary_classes); ?></td></tr>
            </table>
        </div>

        <!-- Sources Card -->
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin-top: 0;">Quellen</h2>
            <table class="widefat" style="margin-top: 10px;">
                <thead><tr><th>Quelle</th><th>Klassen</th></tr></thead>
                <tbody>
                <?php foreach ($sources as $source => $count): ?>
                    <tr><td><?php echo esc_html($source); ?></td><td><?php echo $count; ?></td></tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <?php if (count($classes_without_css) > 0): ?>
    <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #856404;">Fehlende CSS Regeln (<?php echo count($classes_without_css); ?>)</h2>
        <p>Diese Klassen werden im HTML verwendet, haben aber keine CSS-Regel in der styles.css:</p>
        <div style="max-height: 300px; overflow-y: auto; background: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
            <?php
            $missing_grouped = [];
            foreach ($classes_without_css as $cls) {
                $prefix = explode('-', $cls)[0];
                if (strpos($cls, ':') !== false) {
                    $prefix = explode(':', $cls)[0];
                }
                $missing_grouped[$prefix][] = $cls;
            }
            ksort($missing_grouped);

            foreach ($missing_grouped as $prefix => $classes): ?>
                <div style="margin-bottom: 10px;">
                    <strong><?php echo esc_html($prefix); ?>:</strong>
                    <span style="color: #dc3545;"><?php echo esc_html(implode(', ', $classes)); ?></span>
                </div>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <?php if (count($arbitrary_classes) > 0): ?>
    <div style="background: #cce5ff; border: 1px solid #007bff; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0; color: #004085;">Arbitrary Values (<?php echo count($arbitrary_classes); ?>)</h2>
        <p>Diese Klassen verwenden Tailwind Arbitrary Values. Sie sollten Fallback-CSS haben:</p>
        <div style="max-height: 200px; overflow-y: auto; background: white; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
            <?php foreach ($arbitrary_classes as $cls):
                $has_css = in_array($cls, $classes_with_css);
            ?>
                <span style="display: inline-block; margin: 2px 4px; padding: 2px 6px; border-radius: 3px; background: <?php echo $has_css ? '#d4edda' : '#f8d7da'; ?>;">
                    <?php echo esc_html($cls); ?>
                    <?php echo $has_css ? '✓' : '✗'; ?>
                </span>
            <?php endforeach; ?>
        </div>
    </div>
    <?php endif; ?>

    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0;">
        <h2 style="margin-top: 0;">Aktionen</h2>
        <p>
            <a href="<?php echo admin_url('admin.php?page=unicorn-studio-sync'); ?>" class="button button-primary">
                CSS neu synchronisieren
            </a>
            <?php if ($is_connected && $site_id): ?>
            <a href="<?php echo esc_url($api_url . '/sites/' . $site_id . '/export/css/debug'); ?>"
               class="button" target="_blank">
                API Debug Endpunkt öffnen
            </a>
            <?php endif; ?>
        </p>
    </div>

    <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0;">
        <h2 style="margin-top: 0;">Alle Klassen (<?php echo count($all_classes); ?>)</h2>
        <div style="max-height: 400px; overflow-y: auto; font-family: monospace; font-size: 11px;">
            <?php foreach ($all_classes as $cls):
                $has_css = in_array($cls, $classes_with_css);
                $is_arbitrary = strpos($cls, '[') !== false;
            ?>
                <span style="display: inline-block; margin: 1px 2px; padding: 1px 4px; border-radius: 2px;
                    background: <?php echo $has_css ? '#e8f5e9' : '#ffebee'; ?>;
                    <?php echo $is_arbitrary ? 'border: 1px solid #2196f3;' : ''; ?>">
                    <?php echo esc_html($cls); ?>
                </span>
            <?php endforeach; ?>
        </div>
        <p style="margin-top: 10px; font-size: 12px; color: #666;">
            <span style="display: inline-block; width: 12px; height: 12px; background: #e8f5e9; border-radius: 2px;"></span> = Hat CSS &nbsp;
            <span style="display: inline-block; width: 12px; height: 12px; background: #ffebee; border-radius: 2px;"></span> = Fehlt CSS &nbsp;
            <span style="display: inline-block; width: 12px; height: 12px; background: #e3f2fd; border: 1px solid #2196f3; border-radius: 2px;"></span> = Arbitrary Value
        </p>
    </div>
</div>
