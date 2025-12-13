<?php
/**
 * Design & Components Page Template
 *
 * Shows Global Components (Header/Footer) and Design System
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

// Get global components
$global_components = get_option('unicorn_studio_global_components', []);
$header = $global_components['header'] ?? null;
$footer = $global_components['footer'] ?? null;

// Get design variables (CSS)
$css_file = WP_CONTENT_DIR . '/uploads/unicorn-studio/styles.css';
$css_exists = file_exists($css_file);
$css_content = $css_exists ? file_get_contents($css_file) : '';

// Extract CSS variables from content
$design_tokens = [];
if ($css_content) {
    // Extract :root variables
    if (preg_match('/:root\s*\{([^}]+)\}/s', $css_content, $matches)) {
        $vars_block = $matches[1];
        preg_match_all('/--([a-zA-Z0-9-]+):\s*([^;]+);/', $vars_block, $var_matches, PREG_SET_ORDER);
        foreach ($var_matches as $match) {
            $design_tokens[$match[1]] = trim($match[2]);
        }
    }
}

// Group design tokens
$colors = [];
$fonts = [];
$spacing = [];
$other = [];

foreach ($design_tokens as $name => $value) {
    if (strpos($name, 'color') !== false || strpos($name, 'primary') !== false ||
        strpos($name, 'secondary') !== false || strpos($name, 'accent') !== false ||
        strpos($name, 'background') !== false || strpos($name, 'foreground') !== false ||
        strpos($name, 'muted') !== false || strpos($name, 'border') !== false ||
        preg_match('/^#[0-9a-fA-F]{3,6}$/', $value) || strpos($value, 'rgb') !== false) {
        $colors[$name] = $value;
    } elseif (strpos($name, 'font') !== false || strpos($name, 'heading') !== false ||
              strpos($name, 'body') !== false || strpos($name, 'mono') !== false) {
        $fonts[$name] = $value;
    } elseif (strpos($name, 'spacing') !== false || strpos($name, 'radius') !== false ||
              strpos($name, 'shadow') !== false) {
        $spacing[$name] = $value;
    } else {
        $other[$name] = $value;
    }
}

$is_connected = Unicorn_Studio::is_connected();
?>

<div class="wrap unicorn-studio-admin unicorn-design-page">
    <h1>
        <span class="dashicons dashicons-art" style="font-size: 30px; margin-right: 10px;"></span>
        <?php esc_html_e('Design & Komponenten', 'unicorn-studio'); ?>
    </h1>

    <p class="description" style="font-size: 14px; margin-bottom: 20px;">
        <?php esc_html_e('Hier siehst du alle Design-Einstellungen und globalen Komponenten, die von Unicorn Studio synchronisiert wurden.', 'unicorn-studio'); ?>
    </p>

    <?php if (!$is_connected) : ?>
        <div class="unicorn-status-banner disconnected">
            <span class="dashicons dashicons-warning"></span>
            <?php esc_html_e('Nicht mit Unicorn Studio verbunden. Design-Daten werden nach dem ersten Sync angezeigt.', 'unicorn-studio'); ?>
        </div>
    <?php endif; ?>

    <div class="unicorn-design-grid">
        <!-- Global Header -->
        <div class="unicorn-card unicorn-component-card">
            <h2>
                <span class="dashicons dashicons-arrow-up-alt" style="color: #3b82f6;"></span>
                <?php esc_html_e('Global Header', 'unicorn-studio'); ?>
            </h2>

            <?php if ($header) : ?>
                <div class="unicorn-component-info">
                    <table class="unicorn-info-table">
                        <tr>
                            <th><?php esc_html_e('Name:', 'unicorn-studio'); ?></th>
                            <td><strong><?php echo esc_html($header['name'] ?? 'Header'); ?></strong></td>
                        </tr>
                        <tr>
                            <th><?php esc_html_e('ID:', 'unicorn-studio'); ?></th>
                            <td><code><?php echo esc_html($header['id'] ?? '-'); ?></code></td>
                        </tr>
                        <?php if (!empty($header['updated_at'])) : ?>
                        <tr>
                            <th><?php esc_html_e('Aktualisiert:', 'unicorn-studio'); ?></th>
                            <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($header['updated_at']))); ?></td>
                        </tr>
                        <?php endif; ?>
                    </table>
                </div>

                <div class="unicorn-component-preview">
                    <h4><?php esc_html_e('HTML Vorschau', 'unicorn-studio'); ?></h4>
                    <div class="unicorn-preview-frame">
                        <?php echo $header['html'] ?? ''; ?>
                    </div>
                    <details class="unicorn-code-details">
                        <summary><?php esc_html_e('HTML Code anzeigen', 'unicorn-studio'); ?></summary>
                        <pre><code><?php echo esc_html($header['html'] ?? ''); ?></code></pre>
                    </details>
                    <?php if (!empty($header['css'])) : ?>
                    <details class="unicorn-code-details">
                        <summary><?php esc_html_e('CSS Code anzeigen', 'unicorn-studio'); ?></summary>
                        <pre><code><?php echo esc_html($header['css']); ?></code></pre>
                    </details>
                    <?php endif; ?>
                </div>
            <?php else : ?>
                <div class="unicorn-empty-state">
                    <span class="dashicons dashicons-minus"></span>
                    <p><?php esc_html_e('Kein globaler Header vorhanden.', 'unicorn-studio'); ?></p>
                    <p class="description"><?php esc_html_e('Erstelle einen Header in Unicorn Studio und pushe ihn zu WordPress.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Global Footer -->
        <div class="unicorn-card unicorn-component-card">
            <h2>
                <span class="dashicons dashicons-arrow-down-alt" style="color: #3b82f6;"></span>
                <?php esc_html_e('Global Footer', 'unicorn-studio'); ?>
            </h2>

            <?php if ($footer) : ?>
                <div class="unicorn-component-info">
                    <table class="unicorn-info-table">
                        <tr>
                            <th><?php esc_html_e('Name:', 'unicorn-studio'); ?></th>
                            <td><strong><?php echo esc_html($footer['name'] ?? 'Footer'); ?></strong></td>
                        </tr>
                        <tr>
                            <th><?php esc_html_e('ID:', 'unicorn-studio'); ?></th>
                            <td><code><?php echo esc_html($footer['id'] ?? '-'); ?></code></td>
                        </tr>
                        <?php if (!empty($footer['updated_at'])) : ?>
                        <tr>
                            <th><?php esc_html_e('Aktualisiert:', 'unicorn-studio'); ?></th>
                            <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($footer['updated_at']))); ?></td>
                        </tr>
                        <?php endif; ?>
                    </table>
                </div>

                <div class="unicorn-component-preview">
                    <h4><?php esc_html_e('HTML Vorschau', 'unicorn-studio'); ?></h4>
                    <div class="unicorn-preview-frame">
                        <?php echo $footer['html'] ?? ''; ?>
                    </div>
                    <details class="unicorn-code-details">
                        <summary><?php esc_html_e('HTML Code anzeigen', 'unicorn-studio'); ?></summary>
                        <pre><code><?php echo esc_html($footer['html'] ?? ''); ?></code></pre>
                    </details>
                    <?php if (!empty($footer['css'])) : ?>
                    <details class="unicorn-code-details">
                        <summary><?php esc_html_e('CSS Code anzeigen', 'unicorn-studio'); ?></summary>
                        <pre><code><?php echo esc_html($footer['css']); ?></code></pre>
                    </details>
                    <?php endif; ?>
                </div>
            <?php else : ?>
                <div class="unicorn-empty-state">
                    <span class="dashicons dashicons-minus"></span>
                    <p><?php esc_html_e('Kein globaler Footer vorhanden.', 'unicorn-studio'); ?></p>
                    <p class="description"><?php esc_html_e('Erstelle einen Footer in Unicorn Studio und pushe ihn zu WordPress.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Design System - Colors -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-admin-appearance" style="color: #8b5cf6;"></span>
                <?php esc_html_e('Farben', 'unicorn-studio'); ?>
            </h2>

            <?php if (!empty($colors)) : ?>
                <div class="unicorn-color-grid">
                    <?php foreach ($colors as $name => $value) : ?>
                        <div class="unicorn-color-item">
                            <div class="unicorn-color-swatch" style="background: <?php echo esc_attr($value); ?>;"></div>
                            <div class="unicorn-color-info">
                                <code>--<?php echo esc_html($name); ?></code>
                                <span class="unicorn-color-value"><?php echo esc_html($value); ?></span>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else : ?>
                <div class="unicorn-empty-state small">
                    <p><?php esc_html_e('Keine Farben definiert.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Design System - Fonts -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-editor-textcolor" style="color: #8b5cf6;"></span>
                <?php esc_html_e('Schriftarten', 'unicorn-studio'); ?>
            </h2>

            <?php if (!empty($fonts)) : ?>
                <div class="unicorn-fonts-list">
                    <?php foreach ($fonts as $name => $value) : ?>
                        <div class="unicorn-font-item">
                            <code>--<?php echo esc_html($name); ?></code>
                            <span class="unicorn-font-value" style="font-family: <?php echo esc_attr($value); ?>;">
                                <?php echo esc_html($value); ?>
                            </span>
                            <span class="unicorn-font-preview" style="font-family: <?php echo esc_attr($value); ?>;">
                                The quick brown fox jumps over the lazy dog
                            </span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else : ?>
                <div class="unicorn-empty-state small">
                    <p><?php esc_html_e('Keine Schriftarten definiert.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Design System - Spacing & Other -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-editor-expand" style="color: #8b5cf6;"></span>
                <?php esc_html_e('Abstände & Radien', 'unicorn-studio'); ?>
            </h2>

            <?php if (!empty($spacing)) : ?>
                <div class="unicorn-tokens-list">
                    <?php foreach ($spacing as $name => $value) : ?>
                        <div class="unicorn-token-item">
                            <code>--<?php echo esc_html($name); ?></code>
                            <span><?php echo esc_html($value); ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else : ?>
                <div class="unicorn-empty-state small">
                    <p><?php esc_html_e('Keine Abstände definiert.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- CSS File Status -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-media-code" style="color: #22c55e;"></span>
                <?php esc_html_e('CSS Datei', 'unicorn-studio'); ?>
            </h2>

            <?php if ($css_exists) : ?>
                <div class="unicorn-status-ok" style="margin-bottom: 15px;">
                    <span class="dashicons dashicons-yes"></span>
                    <?php esc_html_e('CSS-Datei vorhanden', 'unicorn-studio'); ?>
                </div>
                <table class="unicorn-info-table">
                    <tr>
                        <th><?php esc_html_e('Pfad:', 'unicorn-studio'); ?></th>
                        <td><code>/wp-content/uploads/unicorn-studio/styles.css</code></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Größe:', 'unicorn-studio'); ?></th>
                        <td><?php echo esc_html(size_format(filesize($css_file))); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Geändert:', 'unicorn-studio'); ?></th>
                        <td><?php echo esc_html(date_i18n(get_option('date_format') . ' ' . get_option('time_format'), filemtime($css_file))); ?></td>
                    </tr>
                    <tr>
                        <th><?php esc_html_e('Variablen:', 'unicorn-studio'); ?></th>
                        <td><?php echo count($design_tokens); ?> <?php esc_html_e('CSS Variables', 'unicorn-studio'); ?></td>
                    </tr>
                </table>
                <details class="unicorn-code-details" style="margin-top: 15px;">
                    <summary><?php esc_html_e('Vollständiges CSS anzeigen', 'unicorn-studio'); ?></summary>
                    <pre style="max-height: 300px; overflow: auto;"><code><?php echo esc_html($css_content); ?></code></pre>
                </details>
            <?php else : ?>
                <div class="unicorn-empty-state small">
                    <span class="dashicons dashicons-warning" style="color: #f59e0b;"></span>
                    <p><?php esc_html_e('Keine CSS-Datei vorhanden.', 'unicorn-studio'); ?></p>
                    <p class="description"><?php esc_html_e('Die CSS-Datei wird beim ersten Sync erstellt.', 'unicorn-studio'); ?></p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Quick Info -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-info" style="color: #3b82f6;"></span>
                <?php esc_html_e('Info', 'unicorn-studio'); ?>
            </h2>
            <div class="unicorn-info-box">
                <h4><?php esc_html_e('Wie funktioniert es?', 'unicorn-studio'); ?></h4>
                <ul>
                    <li><?php esc_html_e('Header & Footer werden automatisch auf allen Seiten eingefügt', 'unicorn-studio'); ?></li>
                    <li><?php esc_html_e('CSS Variables stehen global zur Verfügung', 'unicorn-studio'); ?></li>
                    <li><?php esc_html_e('Änderungen in Unicorn Studio werden per Push synchronisiert', 'unicorn-studio'); ?></li>
                    <li><?php esc_html_e('Fonts werden DSGVO-konform lokal gehostet', 'unicorn-studio'); ?></li>
                </ul>

                <h4 style="margin-top: 20px;"><?php esc_html_e('Pro Seite überschreiben', 'unicorn-studio'); ?></h4>
                <p class="description">
                    <?php esc_html_e('Du kannst Header/Footer pro Seite ein-/ausblenden. Bearbeite eine Seite und nutze die Meta-Box "Unicorn Studio Einstellungen".', 'unicorn-studio'); ?>
                </p>
            </div>
        </div>
    </div>
</div>

<style>
.unicorn-design-page .unicorn-design-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.unicorn-design-page .unicorn-card {
    background: #fff;
    padding: 20px;
    border: 1px solid #ccd0d4;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}

.unicorn-design-page .unicorn-card h2 {
    margin-top: 0;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.unicorn-design-page .unicorn-component-card {
    grid-column: span 1;
}

.unicorn-design-page .unicorn-info-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
}

.unicorn-design-page .unicorn-info-table th {
    text-align: left;
    padding: 8px 10px 8px 0;
    width: 100px;
    color: #666;
    font-weight: normal;
}

.unicorn-design-page .unicorn-info-table td {
    padding: 8px 0;
}

.unicorn-design-page .unicorn-preview-frame {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    background: #f9f9f9;
    max-height: 200px;
    overflow: auto;
    margin: 10px 0;
}

.unicorn-design-page .unicorn-code-details {
    margin-top: 10px;
}

.unicorn-design-page .unicorn-code-details summary {
    cursor: pointer;
    color: #0073aa;
    font-size: 13px;
}

.unicorn-design-page .unicorn-code-details pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 15px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 12px;
    margin-top: 10px;
    max-height: 200px;
}

.unicorn-design-page .unicorn-empty-state {
    text-align: center;
    padding: 30px;
    color: #666;
}

.unicorn-design-page .unicorn-empty-state.small {
    padding: 15px;
}

.unicorn-design-page .unicorn-empty-state .dashicons {
    font-size: 40px;
    width: 40px;
    height: 40px;
    color: #ccc;
}

/* Colors */
.unicorn-design-page .unicorn-color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
}

.unicorn-design-page .unicorn-color-item {
    display: flex;
    align-items: center;
    gap: 10px;
}

.unicorn-design-page .unicorn-color-swatch {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.unicorn-design-page .unicorn-color-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.unicorn-design-page .unicorn-color-info code {
    font-size: 11px;
    color: #666;
}

.unicorn-design-page .unicorn-color-value {
    font-size: 12px;
    font-family: monospace;
}

/* Fonts */
.unicorn-design-page .unicorn-fonts-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.unicorn-design-page .unicorn-font-item {
    padding: 10px;
    background: #f9f9f9;
    border-radius: 4px;
}

.unicorn-design-page .unicorn-font-item code {
    display: block;
    font-size: 11px;
    color: #666;
    margin-bottom: 5px;
}

.unicorn-design-page .unicorn-font-value {
    font-size: 16px;
    font-weight: 500;
}

.unicorn-design-page .unicorn-font-preview {
    display: block;
    font-size: 14px;
    color: #888;
    margin-top: 5px;
}

/* Tokens */
.unicorn-design-page .unicorn-tokens-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
}

.unicorn-design-page .unicorn-token-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    background: #f9f9f9;
    border-radius: 4px;
}

.unicorn-design-page .unicorn-token-item code {
    font-size: 10px;
    color: #666;
}

.unicorn-design-page .unicorn-token-item span {
    font-family: monospace;
    font-size: 13px;
}

/* Info Box */
.unicorn-design-page .unicorn-info-box ul {
    margin: 10px 0;
    padding-left: 20px;
}

.unicorn-design-page .unicorn-info-box li {
    margin-bottom: 5px;
}

/* Status Banner */
.unicorn-design-page .unicorn-status-banner {
    padding: 15px 20px;
    border-radius: 4px;
    margin: 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.unicorn-design-page .unicorn-status-banner.disconnected {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
}

.unicorn-design-page .unicorn-status-ok {
    color: #155724;
    display: flex;
    align-items: center;
    gap: 5px;
}
</style>
