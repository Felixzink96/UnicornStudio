<?php
/**
 * Sync Status Page Template
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

$status = Unicorn_Studio_Sync_Manager::get_status();
$content_types = unicorn_studio()->content_types->get_all();
$taxonomies = unicorn_studio()->taxonomies->get_all();
?>

<div class="wrap unicorn-studio-admin">
    <h1>
        <span class="dashicons dashicons-update"></span>
        <?php esc_html_e('Sync Status', 'unicorn-studio'); ?>
    </h1>

    <?php if (!$status['connected']) : ?>
        <div class="notice notice-warning">
            <p>
                <?php
                printf(
                    esc_html__('Bitte verbinde WordPress zuerst mit Unicorn Studio in den %sEinstellungen%s.', 'unicorn-studio'),
                    '<a href="' . admin_url('admin.php?page=unicorn-studio') . '">',
                    '</a>'
                );
                ?>
            </p>
        </div>
    <?php endif; ?>

    <div class="unicorn-sync-grid">
        <!-- Sync Overview -->
        <div class="unicorn-card unicorn-sync-overview">
            <h2>
                <?php esc_html_e('Übersicht', 'unicorn-studio'); ?>
                <span style="font-size: 12px; font-weight: normal; color: #666; margin-left: 10px;">
                    v<?php echo esc_html(UNICORN_STUDIO_VERSION); ?>
                </span>
            </h2>

            <div class="unicorn-stats">
                <div class="unicorn-stat">
                    <span class="unicorn-stat-value"><?php echo count($content_types); ?></span>
                    <span class="unicorn-stat-label"><?php esc_html_e('Content Types', 'unicorn-studio'); ?></span>
                </div>
                <div class="unicorn-stat">
                    <span class="unicorn-stat-value"><?php echo count($taxonomies); ?></span>
                    <span class="unicorn-stat-label"><?php esc_html_e('Taxonomies', 'unicorn-studio'); ?></span>
                </div>
                <div class="unicorn-stat">
                    <span class="unicorn-stat-value"><?php echo $status['css_exists'] ? $status['css_size'] : '-'; ?></span>
                    <span class="unicorn-stat-label"><?php esc_html_e('CSS', 'unicorn-studio'); ?></span>
                </div>
                <div class="unicorn-stat">
                    <span class="unicorn-stat-value"><?php echo $status['fonts_count'] ?: '0'; ?></span>
                    <span class="unicorn-stat-label"><?php esc_html_e('Fonts (lokal)', 'unicorn-studio'); ?></span>
                </div>
                <div class="unicorn-stat">
                    <span class="unicorn-stat-value">
                        <?php
                        $comp_count = ($status['has_header'] ? 1 : 0) + ($status['has_footer'] ? 1 : 0);
                        echo $comp_count;
                        ?>
                    </span>
                    <span class="unicorn-stat-label"><?php esc_html_e('Header/Footer', 'unicorn-studio'); ?></span>
                </div>
            </div>

            <p class="unicorn-last-sync">
                <?php if ($status['last_sync']) : ?>
                    <?php printf(esc_html__('Letzte Synchronisierung: %s', 'unicorn-studio'), $status['last_sync']); ?>
                <?php else : ?>
                    <?php esc_html_e('Noch nie synchronisiert', 'unicorn-studio'); ?>
                <?php endif; ?>
            </p>
        </div>

        <!-- Manual Sync -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Manuelle Synchronisierung', 'unicorn-studio'); ?></h2>
            <p class="description">
                <?php esc_html_e('Synchronisiere Daten manuell von Unicorn Studio.', 'unicorn-studio'); ?>
            </p>

            <div class="unicorn-sync-buttons">
                <button type="button" class="button button-primary button-hero unicorn-sync-btn" data-type="all" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                    <span class="dashicons dashicons-update"></span>
                    <?php esc_html_e('Alles synchronisieren', 'unicorn-studio'); ?>
                </button>

                <div class="unicorn-sync-individual">
                    <button type="button" class="button unicorn-sync-btn" data-type="structure" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Content Types & Fields', 'unicorn-studio'); ?>
                    </button>
                    <button type="button" class="button unicorn-sync-btn" data-type="taxonomies" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Taxonomies & Terms', 'unicorn-studio'); ?>
                    </button>
                    <button type="button" class="button unicorn-sync-btn" data-type="entries" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Alle Entries', 'unicorn-studio'); ?>
                    </button>
                    <button type="button" class="button unicorn-sync-btn" data-type="css" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('CSS aktualisieren', 'unicorn-studio'); ?>
                    </button>
                    <button type="button" class="button unicorn-sync-btn" data-type="fonts" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Fonts herunterladen', 'unicorn-studio'); ?>
                    </button>
                    <button type="button" class="button unicorn-sync-btn" data-type="global_components" <?php echo !$status['connected'] ? 'disabled' : ''; ?>>
                        <?php esc_html_e('Header/Footer', 'unicorn-studio'); ?>
                    </button>
                </div>
            </div>

            <div id="unicorn-sync-progress" class="hidden">
                <div class="unicorn-progress-bar">
                    <div class="unicorn-progress-fill"></div>
                </div>
                <p class="unicorn-progress-text"></p>
            </div>

            <div id="unicorn-sync-result" class="hidden"></div>
        </div>

        <!-- Content Types List -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Synchronisierte Content Types', 'unicorn-studio'); ?></h2>

            <?php if (empty($content_types)) : ?>
                <p class="description"><?php esc_html_e('Noch keine Content Types synchronisiert.', 'unicorn-studio'); ?></p>
            <?php else : ?>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Name', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Slug', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Felder', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Features', 'unicorn-studio'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($content_types as $type) : ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($type['label_singular']); ?></strong>
                                    <br><small><?php echo esc_html($type['name']); ?></small>
                                </td>
                                <td><code><?php echo esc_html($type['slug']); ?></code></td>
                                <td><?php echo count($type['fields'] ?? []); ?></td>
                                <td>
                                    <?php
                                    $features = [];
                                    $feat = $type['features'] ?? [];
                                    if ($feat['has_title'] ?? false) $features[] = 'Titel';
                                    if ($feat['has_content'] ?? false) $features[] = 'Content';
                                    if ($feat['has_featured_image'] ?? false) $features[] = 'Bild';
                                    if ($feat['has_seo'] ?? false) $features[] = 'SEO';
                                    echo esc_html(implode(', ', $features) ?: '-');
                                    ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <!-- Global Components (Header/Footer) -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-layout"></span>
                <?php esc_html_e('Globale Komponenten', 'unicorn-studio'); ?>
            </h2>

            <div class="unicorn-components-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                <!-- Header Status -->
                <div class="unicorn-component-item" style="padding: 15px; background: <?php echo $status['has_header'] ? '#d4edda' : '#fff3cd'; ?>; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span class="dashicons dashicons-<?php echo $status['has_header'] ? 'yes-alt' : 'warning'; ?>" style="color: <?php echo $status['has_header'] ? '#28a745' : '#856404'; ?>;"></span>
                        <strong><?php esc_html_e('Header', 'unicorn-studio'); ?></strong>
                    </div>
                    <?php if ($status['has_header']) : ?>
                        <p style="margin: 0; font-size: 13px; color: #155724;">
                            <?php echo esc_html($status['header_name'] ?: 'Global Header'); ?>
                        </p>
                    <?php else : ?>
                        <p style="margin: 0; font-size: 13px; color: #856404;">
                            <?php esc_html_e('Nicht synchronisiert', 'unicorn-studio'); ?>
                        </p>
                    <?php endif; ?>
                </div>

                <!-- Footer Status -->
                <div class="unicorn-component-item" style="padding: 15px; background: <?php echo $status['has_footer'] ? '#d4edda' : '#fff3cd'; ?>; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <span class="dashicons dashicons-<?php echo $status['has_footer'] ? 'yes-alt' : 'warning'; ?>" style="color: <?php echo $status['has_footer'] ? '#28a745' : '#856404'; ?>;"></span>
                        <strong><?php esc_html_e('Footer', 'unicorn-studio'); ?></strong>
                    </div>
                    <?php if ($status['has_footer']) : ?>
                        <p style="margin: 0; font-size: 13px; color: #155724;">
                            <?php echo esc_html($status['footer_name'] ?: 'Global Footer'); ?>
                        </p>
                    <?php else : ?>
                        <p style="margin: 0; font-size: 13px; color: #856404;">
                            <?php esc_html_e('Nicht synchronisiert', 'unicorn-studio'); ?>
                        </p>
                    <?php endif; ?>
                </div>
            </div>

            <?php if (!$status['has_header'] && !$status['has_footer']) : ?>
                <div class="notice notice-warning inline" style="margin-top: 15px;">
                    <p>
                        <span class="dashicons dashicons-info"></span>
                        <?php esc_html_e('Klicke auf "Header/Footer" um globale Komponenten aus Unicorn Studio zu synchronisieren.', 'unicorn-studio'); ?>
                    </p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Local Fonts (GDPR) -->
        <div class="unicorn-card">
            <h2>
                <span class="dashicons dashicons-editor-textcolor"></span>
                <?php esc_html_e('Lokale Fonts (DSGVO-konform)', 'unicorn-studio'); ?>
            </h2>

            <?php if ($status['fonts_count'] > 0) : ?>
                <div class="unicorn-gdpr-badge">
                    <span class="dashicons dashicons-yes-alt"></span>
                    <?php esc_html_e('DSGVO-konform: Fonts werden lokal gehostet', 'unicorn-studio'); ?>
                </div>

                <table class="widefat" style="margin-top: 15px;">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Font Family', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Speicherort', 'unicorn-studio'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($status['fonts_families'] as $family) : ?>
                            <tr>
                                <td><strong><?php echo esc_html($family); ?></strong></td>
                                <td><code>wp-content/uploads/unicorn-studio/fonts/</code></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

                <p class="description" style="margin-top: 15px;">
                    <strong><?php esc_html_e('Gesamtgröße:', 'unicorn-studio'); ?></strong> <?php echo esc_html($status['fonts_size']); ?>
                    <?php if ($status['fonts_synced']) : ?>
                        <br><strong><?php esc_html_e('Letzte Aktualisierung:', 'unicorn-studio'); ?></strong> <?php echo esc_html($status['fonts_synced']); ?>
                    <?php endif; ?>
                </p>
            <?php else : ?>
                <p class="description">
                    <?php esc_html_e('Noch keine Fonts lokal gespeichert. Klicke auf "Fonts herunterladen" um Google Fonts lokal zu speichern.', 'unicorn-studio'); ?>
                </p>
                <div class="notice notice-warning inline" style="margin-top: 10px;">
                    <p>
                        <span class="dashicons dashicons-warning"></span>
                        <?php esc_html_e('Ohne lokale Fonts werden keine Schriftarten vom Google CDN geladen. Fonts müssen synchronisiert werden.', 'unicorn-studio'); ?>
                    </p>
                </div>
            <?php endif; ?>
        </div>

        <!-- Taxonomies List -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Synchronisierte Taxonomies', 'unicorn-studio'); ?></h2>

            <?php if (empty($taxonomies)) : ?>
                <p class="description"><?php esc_html_e('Noch keine Taxonomies synchronisiert.', 'unicorn-studio'); ?></p>
            <?php else : ?>
                <table class="widefat">
                    <thead>
                        <tr>
                            <th><?php esc_html_e('Name', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Slug', 'unicorn-studio'); ?></th>
                            <th><?php esc_html_e('Hierarchisch', 'unicorn-studio'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($taxonomies as $tax) : ?>
                            <tr>
                                <td>
                                    <strong><?php echo esc_html($tax['label_singular']); ?></strong>
                                    <br><small><?php echo esc_html($tax['name']); ?></small>
                                </td>
                                <td><code><?php echo esc_html($tax['slug']); ?></code></td>
                                <td><?php echo ($tax['hierarchical'] ?? false) ? __('Ja', 'unicorn-studio') : __('Nein', 'unicorn-studio'); ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
.unicorn-sync-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-top: 20px;
}
.unicorn-sync-overview .unicorn-stats {
    display: flex;
    gap: 30px;
    margin: 20px 0;
}
.unicorn-stat {
    text-align: center;
}
.unicorn-stat-value {
    display: block;
    font-size: 36px;
    font-weight: bold;
    color: #7c3aed;
}
.unicorn-stat-label {
    color: #666;
}
.unicorn-last-sync {
    color: #666;
    font-style: italic;
}
.unicorn-sync-buttons {
    margin: 20px 0;
}
.unicorn-sync-individual {
    margin-top: 15px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.unicorn-progress-bar {
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
    margin: 15px 0;
}
.unicorn-progress-fill {
    height: 100%;
    background: #7c3aed;
    width: 0%;
    transition: width 0.3s;
}
.unicorn-progress-text {
    text-align: center;
    color: #666;
}
#unicorn-sync-result {
    padding: 15px;
    border-radius: 4px;
    margin-top: 15px;
}
#unicorn-sync-result.success {
    background: #d4edda;
    color: #155724;
}
#unicorn-sync-result.error {
    background: #f8d7da;
    color: #721c24;
}
.unicorn-gdpr-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: #d4edda;
    color: #155724;
    padding: 8px 15px;
    border-radius: 4px;
    font-weight: 500;
}
.unicorn-gdpr-badge .dashicons {
    color: #28a745;
}
</style>
