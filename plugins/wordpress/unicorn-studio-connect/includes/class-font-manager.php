<?php
/**
 * Font Manager
 *
 * Downloads and manages fonts locally for GDPR compliance.
 * Instead of loading from Google Fonts CDN, fonts are stored locally.
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Font Manager Class
 */
class Unicorn_Studio_Font_Manager {

    /**
     * API Client
     */
    private $api;

    /**
     * Fonts directory path
     */
    private $fonts_dir;

    /**
     * Fonts directory URL
     */
    private $fonts_url;

    /**
     * Constructor
     *
     * @param Unicorn_Studio_API_Client $api API client
     */
    public function __construct($api) {
        $this->api = $api;

        $upload_dir = wp_upload_dir();
        $this->fonts_dir = $upload_dir['basedir'] . '/unicorn-studio/fonts/';
        $this->fonts_url = $upload_dir['baseurl'] . '/unicorn-studio/fonts/';
    }

    /**
     * Enqueue font styles in frontend
     * Outputs @font-face CSS for locally stored fonts
     */
    public function enqueue_fonts() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        // Get stored fonts data
        $fonts = get_option('unicorn_studio_fonts', []);

        if (empty($fonts)) {
            return;
        }

        // Generate @font-face CSS
        $font_face_css = $this->generate_font_face_css($fonts);

        if (!empty($font_face_css)) {
            // Output directly in <head> as inline style
            // Note: wp_add_inline_style() doesn't work here because the main
            // stylesheet uses preload for performance (not wp_enqueue_style)
            add_action('wp_head', function() use ($font_face_css) {
                echo "<style id=\"unicorn-studio-fonts\">\n" . $font_face_css . "</style>\n";
            }, 4); // Priority 4 = before the main CSS preload (priority 5)
        }
    }

    /**
     * Output font preloads in head
     * Preloads critical fonts for better performance
     */
    public function output_font_preloads() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $fonts = get_option('unicorn_studio_fonts', []);

        if (empty($fonts)) {
            return;
        }

        // Preload the most common weights (400, 700) for each font family
        $preloaded = [];
        foreach ($fonts as $font) {
            $key = $font['fontFamily'] . '-' . $font['weight'];
            if (in_array($font['weight'], [400, 700]) && !isset($preloaded[$key])) {
                $local_path = $this->fonts_dir . $font['filename'];
                if (file_exists($local_path)) {
                    $local_url = $this->fonts_url . $font['filename'];
                    echo '<link rel="preload" href="' . esc_url($local_url) . '" as="font" type="font/woff2" crossorigin>' . "\n";
                    $preloaded[$key] = true;
                }
            }
        }
    }

    /**
     * Sync fonts from Unicorn Studio
     * Downloads font files and stores them locally
     *
     * @return array|WP_Error Result with success status
     */
    public function sync_fonts() {
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        // First trigger font sync on the server (downloads from Google Fonts to Supabase)
        $sync_response = $this->api->request('/fonts/sync', 'POST');

        if (is_wp_error($sync_response)) {
            if ($debug) {
                error_log('[Unicorn Studio Fonts] Sync API error: ' . $sync_response->get_error_message());
            }
            // Continue anyway - fonts might already be stored
        } else {
            if ($debug) {
                error_log('[Unicorn Studio Fonts] Sync response: ' . print_r($sync_response, true));
            }
        }

        // Get fonts metadata from API
        $response = $this->api->request('/export/fonts');

        if (is_wp_error($response)) {
            if ($debug) {
                error_log('[Unicorn Studio Fonts] API error: ' . $response->get_error_message());
            }
            return $response;
        }

        $fonts_data = $response['data'] ?? [];
        $fonts = $fonts_data['fonts'] ?? [];

        if (empty($fonts)) {
            if ($debug) {
                error_log('[Unicorn Studio Fonts] No fonts to sync');
            }
            return [
                'success' => true,
                'count' => 0,
                'size' => 0,
                'message' => __('Keine Fonts gefunden.', 'unicorn-studio'),
            ];
        }

        // Ensure fonts directory exists
        if (!file_exists($this->fonts_dir)) {
            wp_mkdir_p($this->fonts_dir);
        }

        // Add .htaccess for proper MIME types
        $htaccess = $this->fonts_dir . '.htaccess';
        if (!file_exists($htaccess)) {
            $htaccess_content = "# Font MIME types\n";
            $htaccess_content .= "AddType font/woff2 .woff2\n";
            $htaccess_content .= "AddType font/woff .woff\n";
            $htaccess_content .= "AddType font/ttf .ttf\n";
            $htaccess_content .= "\n# Allow cross-origin font loading\n";
            $htaccess_content .= "<IfModule mod_headers.c>\n";
            $htaccess_content .= "    Header set Access-Control-Allow-Origin \"*\"\n";
            $htaccess_content .= "</IfModule>\n";
            file_put_contents($htaccess, $htaccess_content);
        }

        // Download each font file
        $downloaded = 0;
        $total_size = 0;
        $stored_fonts = [];
        $errors = [];

        foreach ($fonts as $font) {
            $download_url = $font['downloadUrl'] ?? '';
            $filename = $font['filename'] ?? '';

            if (empty($download_url) || empty($filename)) {
                continue;
            }

            $local_path = $this->fonts_dir . $filename;

            // Download font file
            $result = $this->download_font_file($download_url, $local_path);

            if (is_wp_error($result)) {
                $errors[] = sprintf(
                    __('Fehler beim Download von %s: %s', 'unicorn-studio'),
                    $filename,
                    $result->get_error_message()
                );
                continue;
            }

            $file_size = filesize($local_path);
            $total_size += $file_size;
            $downloaded++;

            // Store font metadata
            $stored_fonts[] = [
                'fontFamily' => $font['fontFamily'],
                'weight' => $font['weight'],
                'style' => $font['style'] ?? 'normal',
                'filename' => $filename,
                'size' => $file_size,
            ];

            if ($debug) {
                error_log(sprintf(
                    '[Unicorn Studio Fonts] Downloaded %s (%s)',
                    $filename,
                    size_format($file_size)
                ));
            }
        }

        // Save fonts metadata
        update_option('unicorn_studio_fonts', $stored_fonts);
        update_option('unicorn_studio_fonts_version', time());

        $result = [
            'success' => empty($errors),
            'count' => $downloaded,
            'size' => size_format($total_size),
            'errors' => $errors,
        ];

        if ($debug) {
            error_log(sprintf(
                '[Unicorn Studio Fonts] Sync complete: %d fonts, %s',
                $downloaded,
                size_format($total_size)
            ));
        }

        return $result;
    }

    /**
     * Download a font file
     *
     * @param string $url Remote URL
     * @param string $local_path Local file path
     * @return bool|WP_Error True on success
     */
    private function download_font_file($url, $local_path) {
        // Download with WordPress HTTP API
        $response = wp_remote_get($url, [
            'timeout' => 30,
            'stream' => true,
            'filename' => $local_path,
        ]);

        if (is_wp_error($response)) {
            return $response;
        }

        $status_code = wp_remote_retrieve_response_code($response);

        if ($status_code !== 200) {
            // Clean up failed download
            if (file_exists($local_path)) {
                unlink($local_path);
            }
            return new WP_Error(
                'download_failed',
                sprintf(__('HTTP Fehler %d', 'unicorn-studio'), $status_code)
            );
        }

        return true;
    }

    /**
     * Generate @font-face CSS from stored fonts
     *
     * @param array $fonts Stored fonts data
     * @return string CSS
     */
    private function generate_font_face_css($fonts) {
        if (empty($fonts)) {
            return '';
        }

        $css = "/* DSGVO-konform: Lokale Fonts */\n";

        foreach ($fonts as $font) {
            $local_path = $this->fonts_dir . $font['filename'];

            // Only include fonts that exist locally
            if (!file_exists($local_path)) {
                continue;
            }

            $local_url = $this->fonts_url . $font['filename'];

            $css .= sprintf(
                "@font-face {\n" .
                "  font-family: '%s';\n" .
                "  font-style: %s;\n" .
                "  font-weight: %d;\n" .
                "  font-display: swap;\n" .
                "  src: url('%s') format('woff2');\n" .
                "}\n\n",
                esc_attr($font['fontFamily']),
                esc_attr($font['style']),
                intval($font['weight']),
                esc_url($local_url)
            );
        }

        return $css;
    }

    /**
     * Get fonts directory path
     *
     * @return string
     */
    public function get_fonts_path() {
        return $this->fonts_dir;
    }

    /**
     * Get fonts directory URL
     *
     * @return string
     */
    public function get_fonts_url() {
        return $this->fonts_url;
    }

    /**
     * Check if fonts are stored locally
     *
     * @return bool
     */
    public function has_local_fonts() {
        $fonts = get_option('unicorn_studio_fonts', []);
        return !empty($fonts);
    }

    /**
     * Get stored fonts count
     *
     * @return int
     */
    public function get_fonts_count() {
        $fonts = get_option('unicorn_studio_fonts', []);
        return count($fonts);
    }

    /**
     * Get total fonts size
     *
     * @return string Human readable size
     */
    public function get_fonts_size() {
        $fonts = get_option('unicorn_studio_fonts', []);
        $total = 0;

        foreach ($fonts as $font) {
            $total += $font['size'] ?? 0;
        }

        return size_format($total);
    }

    /**
     * Get font families
     *
     * @return array Unique font family names
     */
    public function get_font_families() {
        $fonts = get_option('unicorn_studio_fonts', []);
        $families = [];

        foreach ($fonts as $font) {
            if (!in_array($font['fontFamily'], $families)) {
                $families[] = $font['fontFamily'];
            }
        }

        return $families;
    }

    /**
     * Delete all stored fonts
     *
     * @return bool
     */
    public function delete_fonts() {
        $fonts = get_option('unicorn_studio_fonts', []);

        // Delete font files
        foreach ($fonts as $font) {
            $local_path = $this->fonts_dir . $font['filename'];
            if (file_exists($local_path)) {
                unlink($local_path);
            }
        }

        // Clear options
        delete_option('unicorn_studio_fonts');
        delete_option('unicorn_studio_fonts_version');

        return true;
    }

    /**
     * Get last sync time
     *
     * @return string|false
     */
    public function get_last_sync() {
        $version = get_option('unicorn_studio_fonts_version');

        if (!$version) {
            return false;
        }

        return date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $version);
    }
}
