<?php
/**
 * Form Handler
 *
 * Handles form submissions from Unicorn Studio pages
 * Sends emails via wp_mail() using WordPress SMTP settings
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Form Handler Class
 */
class Unicorn_Studio_Form_Handler {

    /**
     * Register REST API endpoint for form submissions
     */
    public function register_endpoint() {
        register_rest_route('unicorn-studio/v1', '/form-submit', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handle_form_submit'],
            'permission_callback' => [$this, 'verify_request'],
        ]);
    }

    /**
     * Verify form submission request
     *
     * @param WP_REST_Request $request Request object
     * @return bool|WP_Error
     */
    public function verify_request($request) {
        // Check Bearer token
        $auth_header = $request->get_header('Authorization');
        if ($auth_header && strpos($auth_header, 'Bearer ') === 0) {
            $token = substr($auth_header, 7);
            $stored_api_key = Unicorn_Studio::get_api_key();

            if ($token && $stored_api_key && hash_equals($stored_api_key, $token)) {
                return true;
            }
        }

        return new WP_Error(
            'unauthorized',
            'Unauthorized request',
            ['status' => 401]
        );
    }

    /**
     * Handle form submission
     *
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response
     */
    public function handle_form_submit($request) {
        $params = $request->get_json_params();

        $to = sanitize_email($params['to'] ?? '');
        $subject = sanitize_text_field($params['subject'] ?? 'Neue Formular-Nachricht');
        $form_name = sanitize_text_field($params['form_name'] ?? 'Kontaktformular');
        $form_data = $params['form_data'] ?? [];
        $submission_id = sanitize_text_field($params['submission_id'] ?? '');
        $cc = array_map('sanitize_email', $params['cc'] ?? []);
        $bcc = array_map('sanitize_email', $params['bcc'] ?? []);
        $reply_to = sanitize_email($params['reply_to'] ?? '');

        if (empty($to)) {
            return new WP_REST_Response([
                'success' => false,
                'error' => 'No recipient email provided',
            ], 400);
        }

        // Build email body
        $body = $this->build_email_body($form_name, $form_data, $submission_id);

        // Build headers
        $headers = ['Content-Type: text/html; charset=UTF-8'];

        if (!empty($reply_to)) {
            $headers[] = 'Reply-To: ' . $reply_to;
        }

        if (!empty($cc)) {
            foreach ($cc as $email) {
                if (!empty($email)) {
                    $headers[] = 'Cc: ' . $email;
                }
            }
        }

        if (!empty($bcc)) {
            foreach ($bcc as $email) {
                if (!empty($email)) {
                    $headers[] = 'Bcc: ' . $email;
                }
            }
        }

        // Send email using wp_mail (uses WordPress SMTP settings)
        $sent = wp_mail($to, $subject, $body, $headers);

        if ($sent) {
            // Log successful submission
            $this->log_submission($submission_id, $form_name, $to, 'sent');

            return new WP_REST_Response([
                'success' => true,
                'message' => 'Email sent successfully',
            ], 200);
        } else {
            // Log failed submission
            $this->log_submission($submission_id, $form_name, $to, 'failed');

            return new WP_REST_Response([
                'success' => false,
                'error' => 'Failed to send email',
            ], 500);
        }
    }

    /**
     * Build HTML email body
     *
     * @param string $form_name Form name
     * @param array  $form_data Form data
     * @param string $submission_id Submission ID
     * @return string HTML email body
     */
    private function build_email_body($form_name, $form_data, $submission_id) {
        $site_name = get_bloginfo('name');
        $site_url = get_site_url();

        ob_start();
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; padding: 24px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
                .content { padding: 24px; }
                .field { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
                .field:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
                .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 4px; }
                .field-value { font-size: 15px; color: #333; word-break: break-word; }
                .footer { background: #f9fafb; padding: 16px 24px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
                .footer a { color: #6366f1; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1><?php echo esc_html($form_name); ?></h1>
                    <p>Neue Nachricht von <?php echo esc_html($site_name); ?></p>
                </div>
                <div class="content">
                    <?php foreach ($form_data as $key => $value): ?>
                        <?php if (!empty($value) && !str_starts_with($key, '_')): ?>
                            <div class="field">
                                <div class="field-label"><?php echo esc_html($this->format_field_label($key)); ?></div>
                                <div class="field-value"><?php echo nl2br(esc_html($value)); ?></div>
                            </div>
                        <?php endif; ?>
                    <?php endforeach; ?>
                </div>
                <div class="footer">
                    <p>Diese Nachricht wurde über das Kontaktformular auf <a href="<?php echo esc_url($site_url); ?>"><?php echo esc_html($site_name); ?></a> gesendet.</p>
                    <?php if (!empty($submission_id)): ?>
                        <p>Referenz: <?php echo esc_html($submission_id); ?></p>
                    <?php endif; ?>
                </div>
            </div>
        </body>
        </html>
        <?php
        return ob_get_clean();
    }

    /**
     * Format field label for display
     *
     * @param string $key Field key
     * @return string Formatted label
     */
    private function format_field_label($key) {
        // Replace underscores and dashes with spaces
        $label = str_replace(['_', '-'], ' ', $key);
        // Capitalize first letter of each word
        return ucwords($label);
    }

    /**
     * Log form submission
     *
     * @param string $submission_id Submission ID
     * @param string $form_name Form name
     * @param string $to Recipient email
     * @param string $status Status (sent/failed)
     */
    private function log_submission($submission_id, $form_name, $to, $status) {
        $log = get_option('unicorn_studio_form_log', []);

        $log[] = [
            'submission_id' => $submission_id,
            'form_name' => $form_name,
            'to' => $to,
            'status' => $status,
            'timestamp' => current_time('mysql'),
        ];

        // Keep only last 100 entries
        if (count($log) > 100) {
            $log = array_slice($log, -100);
        }

        update_option('unicorn_studio_form_log', $log);
    }
}
