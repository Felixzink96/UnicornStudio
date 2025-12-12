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

        // Add floating button on frontend
        add_action('wp_footer', [$this, 'render_floating_button']);

        // Add to WordPress admin bar
        add_action('admin_bar_menu', [$this, 'add_admin_bar_item'], 100);

        // Enqueue styles
        add_action('wp_enqueue_scripts', [$this, 'enqueue_styles']);
    }

    /**
     * Check if current user can edit with Unicorn Studio
     */
    private function can_edit(): bool {
        return current_user_can('edit_posts') || current_user_can('edit_pages');
    }

    /**
     * Get edit URL for current page
     */
    private function get_edit_url(): ?string {
        global $post;

        if (!$post) {
            return null;
        }

        // Get Unicorn Studio IDs from post meta
        // Note: _unicorn_studio_id is the page ID in Unicorn Studio (set by sync)
        $unicorn_page_id = get_post_meta($post->ID, '_unicorn_studio_id', true);
        $unicorn_site_id = get_option('unicorn_studio_site_id');

        if (!$unicorn_site_id) {
            return null;
        }

        // If we have a specific page ID, link to that page in editor
        if ($unicorn_page_id) {
            return sprintf(
                '%s/editor/%s/%s',
                rtrim($this->app_url, '/'),
                $unicorn_site_id,
                $unicorn_page_id
            );
        }

        // Otherwise link to site dashboard
        return sprintf(
            '%s/dashboard/sites/%s',
            rtrim($this->app_url, '/'),
            $unicorn_site_id
        );
    }

    /**
     * Render the floating edit button
     */
    public function render_floating_button() {
        if (!$this->can_edit()) {
            return;
        }

        // Only show on Unicorn Studio pages
        if (!function_exists('unicorn_is_unicorn_page') || !unicorn_is_unicorn_page()) {
            // Still show for all pages if site is connected
            $site_id = get_option('unicorn_studio_site_id');
            if (!$site_id) {
                return;
            }
        }

        $edit_url = $this->get_edit_url();
        if (!$edit_url) {
            return;
        }

        // Check if floating button is enabled (default: true)
        $enabled = Unicorn_Studio::get_option('show_floating_button', true);
        if (!$enabled) {
            return;
        }

        ?>
        <div id="unicorn-studio-floating-btn" class="unicorn-floating-btn">
            <a href="<?php echo esc_url($edit_url); ?>"
               target="_blank"
               rel="noopener noreferrer"
               class="unicorn-floating-btn-link"
               title="Mit Unicorn Studio bearbeiten">
                <svg class="unicorn-floating-btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="unicorn-floating-btn-text">Unicorn Studio</span>
            </a>
            <button class="unicorn-floating-btn-close" onclick="document.getElementById('unicorn-studio-floating-btn').style.display='none'" title="Ausblenden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
            </button>
        </div>
        <?php
    }

    /**
     * Add item to WordPress admin bar
     */
    public function add_admin_bar_item($admin_bar) {
        if (!$this->can_edit()) {
            return;
        }

        $edit_url = $this->get_edit_url();
        $site_id = get_option('unicorn_studio_site_id');

        // Main menu item
        $admin_bar->add_menu([
            'id'    => 'unicorn-studio',
            'title' => '<span class="ab-icon dashicons dashicons-editor-code"></span> Unicorn Studio',
            'href'  => $edit_url ?: sprintf('%s/dashboard', $this->app_url),
            'meta'  => [
                'title'  => 'Unicorn Studio',
                'target' => '_blank',
                'class'  => 'unicorn-studio-admin-bar',
            ],
        ]);

        // Sub-menu: Edit this page
        if ($edit_url) {
            $admin_bar->add_menu([
                'parent' => 'unicorn-studio',
                'id'     => 'unicorn-studio-edit',
                'title'  => 'Diese Seite bearbeiten',
                'href'   => $edit_url,
                'meta'   => [
                    'target' => '_blank',
                ],
            ]);
        }

        // Sub-menu: Dashboard
        if ($site_id) {
            $admin_bar->add_menu([
                'parent' => 'unicorn-studio',
                'id'     => 'unicorn-studio-dashboard',
                'title'  => 'Site Dashboard',
                'href'   => sprintf('%s/dashboard/sites/%s', $this->app_url, $site_id),
                'meta'   => [
                    'target' => '_blank',
                ],
            ]);

            // Sub-menu: Pages
            $admin_bar->add_menu([
                'parent' => 'unicorn-studio',
                'id'     => 'unicorn-studio-pages',
                'title'  => 'Alle Seiten',
                'href'   => sprintf('%s/dashboard/sites/%s', $this->app_url, $site_id),
                'meta'   => [
                    'target' => '_blank',
                ],
            ]);

            // Sub-menu: Components
            $admin_bar->add_menu([
                'parent' => 'unicorn-studio',
                'id'     => 'unicorn-studio-components',
                'title'  => 'Global Components',
                'href'   => sprintf('%s/dashboard/sites/%s/components', $this->app_url, $site_id),
                'meta'   => [
                    'target' => '_blank',
                ],
            ]);
        }

        // Sub-menu: Sync
        $admin_bar->add_menu([
            'parent' => 'unicorn-studio',
            'id'     => 'unicorn-studio-sync',
            'title'  => 'Sync Status',
            'href'   => admin_url('admin.php?page=unicorn-studio-sync'),
        ]);
    }

    /**
     * Enqueue floating button styles
     */
    public function enqueue_styles() {
        if (!$this->can_edit()) {
            return;
        }

        // Inline styles for the floating button
        $css = '
        .unicorn-floating-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .unicorn-floating-btn-link {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
            color: white !important;
            text-decoration: none !important;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
            transition: all 0.2s ease;
        }

        .unicorn-floating-btn-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
            color: white !important;
        }

        .unicorn-floating-btn-icon {
            width: 20px;
            height: 20px;
        }

        .unicorn-floating-btn-text {
            white-space: nowrap;
        }

        .unicorn-floating-btn-close {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            padding: 0;
            background: rgba(0, 0, 0, 0.6);
            border: none;
            border-radius: 50%;
            color: white;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .unicorn-floating-btn:hover .unicorn-floating-btn-close {
            opacity: 1;
        }

        .unicorn-floating-btn-close:hover {
            background: rgba(0, 0, 0, 0.8);
        }

        .unicorn-floating-btn-close svg {
            width: 14px;
            height: 14px;
        }

        /* Mobile: Icon only */
        @media (max-width: 600px) {
            .unicorn-floating-btn-link {
                padding: 14px;
                border-radius: 50%;
            }
            .unicorn-floating-btn-text {
                display: none;
            }
        }

        /* Admin bar icon */
        #wp-admin-bar-unicorn-studio .ab-icon {
            margin-right: 4px;
        }

        #wp-admin-bar-unicorn-studio .ab-icon:before {
            content: "\\f475";
            top: 2px;
        }
        ';

        wp_add_inline_style('admin-bar', $css);

        // Also add to head for non-admin pages
        if (!is_admin_bar_showing()) {
            echo '<style>' . $css . '</style>';
        }
    }
}
