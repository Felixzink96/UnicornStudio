<?php
/**
 * Admin Bar / Floating Edit Button
 *
 * Shows a floating "Edit with Unicorn Studio" button for admins
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Admin Bar Class
 */
class Unicorn_Studio_Admin_Bar {

    /**
     * Unicorn Studio App URL
     */
    private string $app_url;

    /**
     * Constructor
     */
    public function __construct() {
        // Get app URL from settings or use default
        $this->app_url = get_option('unicorn_studio_app_url', 'https://app.unicorn.studio');
    }

    /**
     * Initialize hooks
     */
    public function init() {
        // Only for logged-in users who can edit
        if (!is_user_logged_in()) {
            return;
        }

        // Add to WordPress admin bar (frontend view)
        add_action('admin_bar_menu', [$this, 'add_admin_bar_item'], 100);

        // Enqueue styles
        add_action('wp_enqueue_scripts', [$this, 'enqueue_styles']);
        add_action('wp_head', [$this, 'admin_bar_inline_styles']);
    }

    /**
     * Check if current user can edit with Unicorn Studio
     */
    private function can_edit(): bool {
        return current_user_can('edit_posts') || current_user_can('edit_pages');
    }

    /**
     * Get edit URL for current page (uses WordPress admin iframe editor)
     */
    private function get_edit_url(): ?string {
        global $post;

        if (!$post) {
            return null;
        }

        // Get Unicorn Studio IDs from post meta
        $unicorn_page_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        $unicorn_site_id = get_option('unicorn_studio_site_id');

        if (!$unicorn_site_id || !$unicorn_page_id) {
            return null;
        }

        // Return WordPress admin iframe editor URL
        return admin_url('admin.php?page=unicorn-studio-editor&post_id=' . $post->ID);
    }

    /**
     * Add item to WordPress admin bar (frontend)
     * Shows a styled button for Unicorn Studio pages
     */
    public function add_admin_bar_item($admin_bar) {
        if (!$this->can_edit()) {
            return;
        }

        $edit_url = $this->get_edit_url();

        // Only show the edit button if we have a valid URL
        if (!$edit_url) {
            return;
        }

        // Add the main styled button (like Elementor)
        $admin_bar->add_node([
            'id'    => 'unicorn-studio-edit',
            'title' => '<span class="ab-icon"></span><span class="ab-label">' . __('Mit Unicorn Studio bearbeiten', 'unicorn-studio') . '</span>',
            'href'  => $edit_url,
            'meta'  => [
                'class' => 'unicorn-studio-admin-bar-button',
                'title' => __('Diese Seite mit Unicorn Studio bearbeiten', 'unicorn-studio'),
            ],
        ]);
    }

    /**
     * Enqueue admin bar styles
     */
    public function enqueue_styles() {
        if (!$this->can_edit()) {
            return;
        }

        // Add admin bar styles
        wp_add_inline_style('admin-bar', $this->get_admin_bar_css());
    }

    /**
     * Output inline styles for admin bar
     */
    public function admin_bar_inline_styles() {
        if (!$this->can_edit() || !is_admin_bar_showing()) {
            return;
        }
        ?>
        <style>
            <?php echo $this->get_admin_bar_css(); ?>
        </style>
        <?php
    }

    /**
     * Get admin bar CSS
     */
    private function get_admin_bar_css(): string {
        return '
            #wpadminbar .unicorn-studio-admin-bar-button > a {
                background: linear-gradient(135deg, #9333ea 0%, #c084fc 100%) !important;
                color: #ffffff !important;
            }
            #wpadminbar .unicorn-studio-admin-bar-button > a:hover {
                background: linear-gradient(135deg, #7e22ce 0%, #a855f7 100%) !important;
            }
            #wpadminbar .unicorn-studio-admin-bar-button .ab-icon::before {
                content: "\\f116";
                top: 3px;
                font-family: dashicons;
            }
            #wpadminbar .unicorn-studio-admin-bar-button .ab-label {
                margin-left: 4px;
            }
            @media screen and (max-width: 782px) {
                #wpadminbar .unicorn-studio-admin-bar-button .ab-label {
                    display: none;
                }
            }
        ';
    }
}
