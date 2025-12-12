<?php
/**
 * Settings Page Template
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

$api_key = get_option('unicorn_studio_api_key', '');
$site_id = get_option('unicorn_studio_site_id', '');
$api_url = get_option('unicorn_studio_api_url', 'http://localhost:3000/api/v1');
$settings = get_option('unicorn_studio_settings', []);
$is_connected = Unicorn_Studio::is_connected();
$webhook_url = Unicorn_Studio_Webhook_Handler::get_webhook_url();
$webhook_secret = Unicorn_Studio_Webhook_Handler::get_webhook_secret();
?>

<div class="wrap unicorn-studio-admin">
    <h1>
        <span class="dashicons dashicons-cloud" style="font-size: 30px; margin-right: 10px;"></span>
        <?php esc_html_e('Unicorn Studio', 'unicorn-studio'); ?>
    </h1>

    <!-- Connection Status Banner -->
    <div class="unicorn-status-banner <?php echo $is_connected ? 'connected' : 'disconnected'; ?>">
        <?php if ($is_connected) : ?>
            <span class="dashicons dashicons-yes-alt"></span>
            <?php esc_html_e('Verbunden mit Unicorn Studio', 'unicorn-studio'); ?>
        <?php else : ?>
            <span class="dashicons dashicons-warning"></span>
            <?php esc_html_e('Nicht verbunden', 'unicorn-studio'); ?>
        <?php endif; ?>
    </div>

    <div class="unicorn-settings-grid">
        <!-- Connection Settings -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Verbindung', 'unicorn-studio'); ?></h2>
            <p class="description">
                <?php esc_html_e('Verbinde WordPress mit deinem Unicorn Studio Account.', 'unicorn-studio'); ?>
            </p>

            <form method="post" action="options.php" id="unicorn-connection-form">
                <?php settings_fields('unicorn_studio_connection'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="unicorn_studio_api_url">
                                <?php esc_html_e('API URL', 'unicorn-studio'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="url"
                                   id="unicorn_studio_api_url"
                                   name="unicorn_studio_api_url"
                                   value="<?php echo esc_attr($api_url); ?>"
                                   class="regular-text"
                                   placeholder="http://localhost:3000/api/v1">
                            <p class="description">
                                <?php esc_html_e('URL deiner Unicorn Studio Installation (z.B. http://localhost:3000/api/v1 für lokale Entwicklung)', 'unicorn-studio'); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="unicorn_studio_api_key">
                                <?php esc_html_e('API Key', 'unicorn-studio'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="password"
                                   id="unicorn_studio_api_key"
                                   name="unicorn_studio_api_key"
                                   value="<?php echo esc_attr($api_key); ?>"
                                   class="regular-text"
                                   autocomplete="off">
                            <p class="description">
                                <?php esc_html_e('Erstelle einen API Key in Unicorn Studio unter Einstellungen → API Keys', 'unicorn-studio'); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="unicorn_studio_site_id">
                                <?php esc_html_e('Site ID', 'unicorn-studio'); ?>
                            </label>
                        </th>
                        <td>
                            <input type="text"
                                   id="unicorn_studio_site_id"
                                   name="unicorn_studio_site_id"
                                   value="<?php echo esc_attr($site_id); ?>"
                                   class="regular-text"
                                   placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
                            <p class="description">
                                <?php esc_html_e('Die Site ID findest du in Unicorn Studio in den Site-Einstellungen.', 'unicorn-studio'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <p class="submit">
                    <?php submit_button(__('Verbindung speichern', 'unicorn-studio'), 'primary', 'submit', false); ?>
                    <button type="button" id="unicorn-test-connection" class="button">
                        <?php esc_html_e('Verbindung testen', 'unicorn-studio'); ?>
                    </button>
                </p>

                <div id="unicorn-connection-result" class="hidden"></div>
            </form>
        </div>

        <!-- Sync Settings -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Synchronisierung', 'unicorn-studio'); ?></h2>
            <p class="description">
                <?php esc_html_e('Konfiguriere was automatisch synchronisiert werden soll.', 'unicorn-studio'); ?>
            </p>

            <form method="post" action="options.php">
                <?php settings_fields('unicorn_studio_options'); ?>

                <table class="form-table">
                    <tr>
                        <th scope="row"><?php esc_html_e('Auto-Sync', 'unicorn-studio'); ?></th>
                        <td>
                            <label>
                                <input type="checkbox"
                                       name="unicorn_studio_settings[auto_sync]"
                                       value="1"
                                       <?php checked($settings['auto_sync'] ?? true); ?>>
                                <?php esc_html_e('Änderungen automatisch synchronisieren (via Webhooks)', 'unicorn-studio'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('Was synchronisieren?', 'unicorn-studio'); ?></th>
                        <td>
                            <fieldset>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_content_types]"
                                           value="1"
                                           <?php checked($settings['sync_content_types'] ?? true); ?>>
                                    <?php esc_html_e('Content Types & Fields', 'unicorn-studio'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_entries]"
                                           value="1"
                                           <?php checked($settings['sync_entries'] ?? true); ?>>
                                    <?php esc_html_e('Entries (Inhalte)', 'unicorn-studio'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_taxonomies]"
                                           value="1"
                                           <?php checked($settings['sync_taxonomies'] ?? true); ?>>
                                    <?php esc_html_e('Taxonomies & Terms', 'unicorn-studio'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_pages]"
                                           value="1"
                                           <?php checked($settings['sync_pages'] ?? true); ?>>
                                    <?php esc_html_e('Seiten (HTML-Seiten aus dem Page Builder)', 'unicorn-studio'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_media]"
                                           value="1"
                                           <?php checked($settings['sync_media'] ?? true); ?>>
                                    <?php esc_html_e('Media/Assets', 'unicorn-studio'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox"
                                           name="unicorn_studio_settings[sync_css]"
                                           value="1"
                                           <?php checked($settings['sync_css'] ?? true); ?>>
                                    <?php esc_html_e('CSS & Design Variables (DSGVO-konform lokal)', 'unicorn-studio'); ?>
                                </label>
                            </fieldset>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php esc_html_e('CPT Prefix', 'unicorn-studio'); ?></th>
                        <td>
                            <input type="text"
                                   name="unicorn_studio_settings[cpt_prefix]"
                                   value="<?php echo esc_attr($settings['cpt_prefix'] ?? 'us_'); ?>"
                                   class="small-text">
                            <p class="description">
                                <?php esc_html_e('Prefix für Custom Post Types (z.B. us_produkt)', 'unicorn-studio'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(__('Einstellungen speichern', 'unicorn-studio')); ?>
            </form>
        </div>

        <!-- Webhook Info -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('Webhook Konfiguration', 'unicorn-studio'); ?></h2>
            <p class="description">
                <?php esc_html_e('Registriere diesen Webhook in Unicorn Studio für automatische Updates.', 'unicorn-studio'); ?>
            </p>

            <table class="form-table">
                <tr>
                    <th scope="row"><?php esc_html_e('Webhook URL', 'unicorn-studio'); ?></th>
                    <td>
                        <code id="webhook-url"><?php echo esc_url($webhook_url); ?></code>
                        <button type="button" class="button button-small unicorn-copy-btn" data-target="webhook-url">
                            <?php esc_html_e('Kopieren', 'unicorn-studio'); ?>
                        </button>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php esc_html_e('Webhook Secret', 'unicorn-studio'); ?></th>
                    <td>
                        <code id="webhook-secret"><?php echo esc_html($webhook_secret); ?></code>
                        <button type="button" class="button button-small unicorn-copy-btn" data-target="webhook-secret">
                            <?php esc_html_e('Kopieren', 'unicorn-studio'); ?>
                        </button>
                    </td>
                </tr>
            </table>

            <h4><?php esc_html_e('Events zum Abonnieren:', 'unicorn-studio'); ?></h4>
            <ul class="unicorn-events-list">
                <li><code>entry.created</code>, <code>entry.updated</code>, <code>entry.deleted</code>, <code>entry.published</code></li>
                <li><code>content_type.created</code>, <code>content_type.updated</code>, <code>content_type.deleted</code></li>
                <li><code>taxonomy.updated</code>, <code>term.created</code>, <code>term.updated</code>, <code>term.deleted</code></li>
                <li><code>css.updated</code>, <code>variables.updated</code></li>
            </ul>
        </div>

        <!-- ACF Status -->
        <div class="unicorn-card">
            <h2><?php esc_html_e('ACF Status', 'unicorn-studio'); ?></h2>

            <?php if (Unicorn_Studio_Fields::is_acf_available()) : ?>
                <div class="unicorn-status-ok">
                    <span class="dashicons dashicons-yes"></span>
                    <?php
                    if (Unicorn_Studio_Fields::is_acf_pro()) {
                        esc_html_e('ACF Pro ist installiert und aktiv.', 'unicorn-studio');
                    } else {
                        esc_html_e('ACF ist installiert und aktiv.', 'unicorn-studio');
                    }
                    ?>
                </div>
            <?php else : ?>
                <div class="unicorn-status-warning">
                    <span class="dashicons dashicons-warning"></span>
                    <?php esc_html_e('ACF ist nicht installiert.', 'unicorn-studio'); ?>
                </div>
                <p class="description">
                    <?php
                    printf(
                        esc_html__('Installiere %sAdvanced Custom Fields%s für die beste Unterstützung von benutzerdefinierten Feldern.', 'unicorn-studio'),
                        '<a href="https://www.advancedcustomfields.com/" target="_blank">',
                        '</a>'
                    );
                    ?>
                </p>
            <?php endif; ?>
        </div>
    </div>
</div>

<style>
.unicorn-studio-admin .unicorn-status-banner {
    padding: 15px 20px;
    border-radius: 4px;
    margin: 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}
.unicorn-studio-admin .unicorn-status-banner.connected {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}
.unicorn-studio-admin .unicorn-status-banner.disconnected {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
}
.unicorn-studio-admin .unicorn-settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
    gap: 20px;
    margin-top: 20px;
}
.unicorn-studio-admin .unicorn-card {
    background: #fff;
    padding: 20px;
    border: 1px solid #ccd0d4;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
}
.unicorn-studio-admin .unicorn-card h2 {
    margin-top: 0;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
}
.unicorn-studio-admin .unicorn-status-ok {
    color: #155724;
    display: flex;
    align-items: center;
    gap: 5px;
}
.unicorn-studio-admin .unicorn-status-warning {
    color: #856404;
    display: flex;
    align-items: center;
    gap: 5px;
}
.unicorn-studio-admin .unicorn-events-list {
    margin: 0;
    padding-left: 20px;
}
.unicorn-studio-admin .unicorn-events-list code {
    font-size: 12px;
}
.unicorn-studio-admin #unicorn-connection-result {
    padding: 10px;
    border-radius: 4px;
    margin-top: 15px;
}
.unicorn-studio-admin #unicorn-connection-result.success {
    background: #d4edda;
    color: #155724;
}
.unicorn-studio-admin #unicorn-connection-result.error {
    background: #f8d7da;
    color: #721c24;
}
.unicorn-studio-admin .hidden {
    display: none;
}
</style>
