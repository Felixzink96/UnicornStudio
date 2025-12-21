<?php
/**
 * Webhook Handler
 *
 * Receives and processes webhooks from Unicorn Studio
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Webhook Handler Class
 */
class Unicorn_Studio_Webhook_Handler {

    /**
     * Register REST API endpoint for webhooks
     */
    public function register_endpoint() {
        register_rest_route('unicorn-studio/v1', '/webhook', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle_webhook'],
            'permission_callback' => [$this, 'verify_signature'],
        ]);
    }

    /**
     * Verify webhook authentication
     *
     * Accepts either:
     * 1. Bearer token (for pushes from Unicorn Studio server)
     * 2. HMAC signature (for traditional webhooks)
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    public function verify_signature($request) {
        // Method 1: Check Bearer token (used by Push from Unicorn Studio)
        $auth_header = $request->get_header('Authorization');
        if ($auth_header && strpos($auth_header, 'Bearer ') === 0) {
            $token = substr($auth_header, 7);
            $stored_api_key = Unicorn_Studio::get_api_key();

            if ($token && $stored_api_key && hash_equals($stored_api_key, $token)) {
                return true;
            }
        }

        // Method 2: Check HMAC signature (traditional webhook signature)
        $signature = $request->get_header('X-Unicorn-Signature');
        $secret = get_option('unicorn_studio_webhook_secret');

        if ($signature && $secret) {
            $payload = $request->get_body();
            $expected = hash_hmac('sha256', $payload, $secret);

            if (hash_equals($expected, $signature)) {
                return true;
            }
        }

        // Neither method succeeded
        return new WP_Error(
            'invalid_auth',
            __('Ungültige Webhook-Authentifizierung.', 'unicorn-studio'),
            ['status' => 401]
        );
    }

    /**
     * Handle incoming webhook
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function handle_webhook($request) {
        $event = $request->get_param('event');
        $data = $request->get_param('data');
        $site_id = $request->get_param('site_id');

        // Verify site ID matches
        $expected_site_id = Unicorn_Studio::get_site_id();
        if ($site_id !== $expected_site_id) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'Site ID mismatch',
                'debug' => [
                    'received_site_id' => $site_id,
                    'expected_site_id' => $expected_site_id,
                ],
            ], 400);
        }

        // Log webhook
        $this->log_webhook($event, $data);

        // Check if auto-sync is enabled
        if (!Unicorn_Studio::get_option('auto_sync', true)) {
            return new WP_REST_Response(['success' => true, 'message' => 'Auto-sync disabled'], 200);
        }

        // Process based on event type
        $result = $this->process_event($event, $data);

        if (is_wp_error($result)) {
            return new WP_REST_Response([
                'success' => false,
                'error'   => $result->get_error_message(),
                'debug'   => [
                    'event' => $event,
                    'data'  => $data,
                ],
            ], 500);
        }

        // Return detailed result for debugging
        $response_data = ['success' => true, 'event' => $event];
        if (is_array($result)) {
            $response_data['result'] = $result;
        }

        return new WP_REST_Response($response_data, 200);
    }

    /**
     * Process webhook event
     *
     * @param string $event Event type
     * @param array  $data  Event data
     * @return bool|WP_Error
     */
    private function process_event($event, $data) {
        switch ($event) {
            // ========================================
            // Entry Events
            // ========================================
            case 'entry.created':
                return unicorn_studio()->entries->create_post($data);

            case 'entry.updated':
                return unicorn_studio()->entries->update_post($data);

            case 'entry.deleted':
                return unicorn_studio()->entries->delete_post($data['id']);

            case 'entry.published':
                return unicorn_studio()->entries->publish_post($data['id']);

            case 'entry.unpublished':
                // Set post to draft
                $post_id = unicorn_studio()->entries->get_post_by_entry_id($data['id']);
                if ($post_id) {
                    return wp_update_post(['ID' => $post_id, 'post_status' => 'draft'], true);
                }
                return true;

            // ========================================
            // Structure Events
            // ========================================
            case 'content_type.created':
            case 'content_type.updated':
            case 'content_type.deleted':
            case 'field.created':
            case 'field.updated':
            case 'field.deleted':
                // Re-sync entire structure
                return unicorn_studio()->sync->sync_structure();

            // ========================================
            // Taxonomy Events
            // ========================================
            case 'taxonomy.created':
            case 'taxonomy.updated':
            case 'taxonomy.deleted':
            case 'term.created':
            case 'term.updated':
            case 'term.deleted':
                // Re-sync taxonomies
                return unicorn_studio()->sync->sync_taxonomies();

            // ========================================
            // Page Events
            // ========================================
            case 'page.created':
            case 'page.updated':
                return unicorn_studio()->pages->sync_single_page_from_webhook($data);

            case 'page.deleted':
                return unicorn_studio()->pages->delete_page_by_unicorn_id($data['id']);

            // ========================================
            // Design Events
            // ========================================
            case 'variables.updated':
            case 'template.updated':
            case 'css.updated':
                // Re-sync CSS
                return unicorn_studio()->css->sync_css();

            // ========================================
            // Global Component Events
            // ========================================
            case 'component.created':
            case 'component.updated':
                // Sync component and CSS
                if (isset($data['position']) && in_array($data['position'], ['header', 'footer'], true)) {
                    // Save as global header/footer
                    Unicorn_Studio_Global_Components::save_component($data['position'], $data);
                }
                return unicorn_studio()->css->sync_css();

            case 'component.deleted':
                // Remove if it was a global component
                if (isset($data['position']) && in_array($data['position'], ['header', 'footer'], true)) {
                    Unicorn_Studio_Global_Components::delete_component($data['position']);
                }
                return unicorn_studio()->css->sync_css();

            case 'global_components.sync':
                // Full sync of global components
                // Handle both formats: { components: [...] } or { header: {...}, footer: {...} }
                if (isset($data['components']) && is_array($data['components'])) {
                    return Unicorn_Studio_Global_Components::sync_from_api($data['components']);
                }

                // New format: separate header and footer objects
                $synced = false;
                if (isset($data['header']) && is_array($data['header'])) {
                    Unicorn_Studio_Global_Components::save_component('header', $data['header']);
                    $synced = true;
                }
                if (isset($data['footer']) && is_array($data['footer'])) {
                    Unicorn_Studio_Global_Components::save_component('footer', $data['footer']);
                    $synced = true;
                }

                // Also sync CSS after global components update
                if ($synced) {
                    unicorn_studio()->css->sync_css();
                }

                return $synced;

            // ========================================
            // CMS Components Events (JavaScript)
            // ========================================
            case 'cms_components.sync':
                // Sync CMS components JavaScript
                if (isset($data['components']) && is_array($data['components'])) {
                    return Unicorn_Studio_CMS_Components::sync_js($data['components']);
                }
                return true;

            // ========================================
            // Full Sync Event
            // ========================================
            case 'sync.full':
                // Trigger a full sync just like clicking "Sync" button
                return unicorn_studio()->sync->sync_all();

            case 'sync.pages':
                // Sync pages - single page if pageId provided, otherwise all
                error_log('[Unicorn Studio DEBUG] sync.pages event received');
                error_log('[Unicorn Studio DEBUG] Data: ' . print_r($data, true));

                if (!empty($data['pageId'])) {
                    error_log('[Unicorn Studio DEBUG] Syncing single page: ' . $data['pageId']);
                    $result = unicorn_studio()->pages->sync_page_by_id($data['pageId']);
                    error_log('[Unicorn Studio DEBUG] sync_page_by_id result: ' . print_r($result, true));
                    return $result;
                }
                error_log('[Unicorn Studio DEBUG] Syncing all pages');
                return unicorn_studio()->pages->sync_pages();

            case 'sync.css':
                // Sync only CSS
                return unicorn_studio()->css->sync_css();

            // ========================================
            // Site Identity Event
            // ========================================
            case 'site_identity.updated':
                // Sync Logo, Favicon, Tagline, OG Image
                return Unicorn_Studio_Site_Identity::sync($data);

            // ========================================
            // Unknown Event
            // ========================================
            default:
                // Log unknown event
                if (defined('WP_DEBUG') && WP_DEBUG) {
                    error_log(sprintf(
                        '[Unicorn Studio] Unknown webhook event: %s',
                        $event
                    ));
                }
                return true;
        }
    }

    /**
     * Log webhook event
     *
     * @param string $event Event type
     * @param array  $data  Event data
     */
    private function log_webhook($event, $data) {
        if (!defined('WP_DEBUG') || !WP_DEBUG) {
            return;
        }

        error_log(sprintf(
            '[Unicorn Studio] Webhook received: %s - %s',
            $event,
            wp_json_encode($data)
        ));
    }

    /**
     * Get webhook URL for this site
     *
     * @return string
     */
    public static function get_webhook_url() {
        return rest_url('unicorn-studio/v1/webhook');
    }

    /**
     * Get webhook secret
     *
     * @return string
     */
    public static function get_webhook_secret() {
        $secret = get_option('unicorn_studio_webhook_secret');

        if (!$secret) {
            $secret = wp_generate_password(32, false);
            update_option('unicorn_studio_webhook_secret', $secret);
        }

        return $secret;
    }

    /**
     * Regenerate webhook secret
     *
     * @return string New secret
     */
    public static function regenerate_secret() {
        $secret = wp_generate_password(32, false);
        update_option('unicorn_studio_webhook_secret', $secret);
        return $secret;
    }
}
