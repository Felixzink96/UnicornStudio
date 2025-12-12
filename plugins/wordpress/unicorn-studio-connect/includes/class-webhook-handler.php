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
     * Verify webhook signature
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    public function verify_signature($request) {
        $signature = $request->get_header('X-Unicorn-Signature');
        $secret = get_option('unicorn_studio_webhook_secret');

        if (!$signature || !$secret) {
            return new WP_Error(
                'invalid_signature',
                __('Ungültige Webhook-Signatur.', 'unicorn-studio'),
                ['status' => 401]
            );
        }

        $payload = $request->get_body();
        $expected = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expected, $signature)) {
            return new WP_Error(
                'invalid_signature',
                __('Ungültige Webhook-Signatur.', 'unicorn-studio'),
                ['status' => 401]
            );
        }

        return true;
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
        if ($site_id !== Unicorn_Studio::get_site_id()) {
            return new WP_REST_Response(['success' => false, 'error' => 'Site ID mismatch'], 400);
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
            ], 500);
        }

        return new WP_REST_Response(['success' => true], 200);
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
            // Design Events
            // ========================================
            case 'variables.updated':
            case 'component.created':
            case 'component.updated':
            case 'component.deleted':
            case 'template.updated':
            case 'css.updated':
                // Re-sync CSS
                return unicorn_studio()->css->sync_css();

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
