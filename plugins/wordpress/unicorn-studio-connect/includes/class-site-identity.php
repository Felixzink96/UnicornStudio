<?php
/**
 * Site Identity Manager
 *
 * Manages Logo, Favicon, OG Image, Tagline and SEO Settings from Unicorn Studio
 * Includes PageSpeed optimizations: Meta-Tags, Analytics, Cache-Headers, Security Headers
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Site Identity Class
 */
class Unicorn_Studio_Site_Identity {

    /**
     * Constructor - Register hooks
     */
    public function __construct() {
        // Output SEO meta tags in wp_head (priority 1 = early)
        add_action('wp_head', [$this, 'output_head_meta'], 1);

        // Output Analytics scripts (priority 2 = after meta)
        add_action('wp_head', [$this, 'output_analytics_scripts'], 2);

        // Output verification meta tags
        add_action('wp_head', [$this, 'output_verification_meta'], 3);

        // Output custom head scripts from SEO settings
        add_action('wp_head', [$this, 'output_custom_head_scripts'], 999);

        // Output custom body scripts
        add_action('wp_footer', [$this, 'output_custom_body_scripts'], 999);

        // Add theme support for custom logo
        add_action('after_setup_theme', [$this, 'add_theme_support']);

        // Add Security Headers (via .htaccess or send_headers)
        add_action('send_headers', [$this, 'add_security_headers']);

        // Add Cache Headers for static assets
        add_filter('mod_rewrite_rules', [$this, 'add_cache_rules']);

        // Preload LCP image hint
        add_action('wp_head', [$this, 'output_lcp_preload'], 1);
    }

    /**
     * Add theme support for custom logo
     */
    public function add_theme_support() {
        add_theme_support('custom-logo', [
            'height'      => 100,
            'width'       => 400,
            'flex-height' => true,
            'flex-width'  => true,
        ]);
    }

    /**
     * Output head meta tags (favicon, og:image, meta description)
     */
    public function output_head_meta() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $seo = self::get_seo_settings();
        $favicon_url = $seo['favicon'] ?? get_option('unicorn_studio_favicon_url', '');
        $apple_touch_icon = $seo['apple_touch_icon'] ?? '';
        $og_image_url = $seo['default_og_image'] ?? get_option('unicorn_studio_og_image_url', '');
        $meta_description = self::get_current_meta_description();
        $site_name = $seo['site_name'] ?? get_bloginfo('name');

        echo "\n<!-- Unicorn Studio SEO -->\n";

        // Favicon
        if (!empty($favicon_url)) {
            echo '<link rel="icon" href="' . esc_url($favicon_url) . '" type="image/x-icon">' . "\n";
            echo '<link rel="shortcut icon" href="' . esc_url($favicon_url) . '">' . "\n";
        }

        // Apple Touch Icon
        if (!empty($apple_touch_icon)) {
            echo '<link rel="apple-touch-icon" href="' . esc_url($apple_touch_icon) . '">' . "\n";
        } elseif (!empty($favicon_url)) {
            echo '<link rel="apple-touch-icon" href="' . esc_url($favicon_url) . '">' . "\n";
        }

        // Meta Description (only if no SEO plugin is handling this)
        if (!empty($meta_description) && !$this->has_seo_plugin()) {
            echo '<meta name="description" content="' . esc_attr($meta_description) . '">' . "\n";
        }

        // Open Graph Meta Tags
        echo '<meta property="og:site_name" content="' . esc_attr($site_name) . '">' . "\n";
        echo '<meta property="og:type" content="website">' . "\n";
        echo '<meta property="og:title" content="' . esc_attr(wp_get_document_title()) . '">' . "\n";

        if (!empty($meta_description)) {
            echo '<meta property="og:description" content="' . esc_attr($meta_description) . '">' . "\n";
        }

        echo '<meta property="og:url" content="' . esc_url(get_permalink()) . '">' . "\n";

        // OG Image
        if (has_post_thumbnail()) {
            echo '<meta property="og:image" content="' . esc_url(get_the_post_thumbnail_url(null, 'large')) . '">' . "\n";
        } elseif (!empty($og_image_url)) {
            echo '<meta property="og:image" content="' . esc_url($og_image_url) . '">' . "\n";
        }

        // Twitter Card
        echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr(wp_get_document_title()) . '">' . "\n";

        if (!empty($meta_description)) {
            echo '<meta name="twitter:description" content="' . esc_attr($meta_description) . '">' . "\n";
        }

        if (has_post_thumbnail()) {
            echo '<meta name="twitter:image" content="' . esc_url(get_the_post_thumbnail_url(null, 'large')) . '">' . "\n";
        } elseif (!empty($og_image_url)) {
            echo '<meta name="twitter:image" content="' . esc_url($og_image_url) . '">' . "\n";
        }

        echo "<!-- /Unicorn Studio SEO -->\n";
    }

    /**
     * Get the current page's meta description
     */
    private static function get_current_meta_description() {
        global $post;

        // 1. Check for page-specific SEO meta description
        if ($post && is_singular()) {
            $page_seo = get_post_meta($post->ID, '_unicorn_studio_seo', true);
            if (!empty($page_seo)) {
                $seo_data = maybe_unserialize($page_seo);
                if (!empty($seo_data['meta_description'])) {
                    return $seo_data['meta_description'];
                }
            }
        }

        // 2. Fallback to global default_meta_description
        $seo = self::get_seo_settings();
        if (!empty($seo['default_meta_description'])) {
            return $seo['default_meta_description'];
        }

        // 3. Fallback to tagline
        return get_option('unicorn_studio_tagline', '');
    }

    /**
     * Output Analytics scripts (Google Analytics, GTM, Facebook Pixel)
     */
    public function output_analytics_scripts() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $seo = self::get_seo_settings();

        // Google Tag Manager
        if (!empty($seo['google_tag_manager_id'])) {
            $gtm_id = sanitize_text_field($seo['google_tag_manager_id']);
            echo "\n<!-- Google Tag Manager -->\n";
            echo "<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','" . esc_js($gtm_id) . "');</script>\n";
            echo "<!-- End Google Tag Manager -->\n";
        }

        // Google Analytics 4 (only if GTM not set)
        if (empty($seo['google_tag_manager_id']) && !empty($seo['google_analytics_id'])) {
            $ga_id = sanitize_text_field($seo['google_analytics_id']);
            echo "\n<!-- Google Analytics 4 -->\n";
            echo '<script async src="https://www.googletagmanager.com/gtag/js?id=' . esc_attr($ga_id) . '"></script>' . "\n";
            echo "<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '" . esc_js($ga_id) . "');
</script>\n";
            echo "<!-- End Google Analytics 4 -->\n";
        }

        // Facebook Pixel
        if (!empty($seo['facebook_pixel_id'])) {
            $pixel_id = sanitize_text_field($seo['facebook_pixel_id']);
            echo "\n<!-- Facebook Pixel -->\n";
            echo "<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '" . esc_js($pixel_id) . "');
fbq('track', 'PageView');
</script>\n";
            echo '<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' . esc_attr($pixel_id) . '&ev=PageView&noscript=1"/></noscript>' . "\n";
            echo "<!-- End Facebook Pixel -->\n";
        }
    }

    /**
     * Output verification meta tags (Google, Bing)
     */
    public function output_verification_meta() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $seo = self::get_seo_settings();

        if (!empty($seo['google_verification'])) {
            echo '<meta name="google-site-verification" content="' . esc_attr($seo['google_verification']) . '">' . "\n";
        }

        if (!empty($seo['bing_verification'])) {
            echo '<meta name="msvalidate.01" content="' . esc_attr($seo['bing_verification']) . '">' . "\n";
        }
    }

    /**
     * Output custom head scripts
     */
    public function output_custom_head_scripts() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $seo = self::get_seo_settings();

        if (!empty($seo['custom_scripts_head'])) {
            echo "\n<!-- Unicorn Studio Custom Head Scripts -->\n";
            echo $seo['custom_scripts_head'];
            echo "\n<!-- End Custom Head Scripts -->\n";
        }
    }

    /**
     * Output custom body scripts (before </body>)
     */
    public function output_custom_body_scripts() {
        if (!Unicorn_Studio::is_connected()) {
            return;
        }

        $seo = self::get_seo_settings();

        // GTM noscript fallback
        if (!empty($seo['google_tag_manager_id'])) {
            $gtm_id = sanitize_text_field($seo['google_tag_manager_id']);
            echo "\n<!-- Google Tag Manager (noscript) -->\n";
            echo '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr($gtm_id) . '" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>' . "\n";
            echo "<!-- End Google Tag Manager (noscript) -->\n";
        }

        if (!empty($seo['custom_scripts_body'])) {
            echo "\n<!-- Unicorn Studio Custom Body Scripts -->\n";
            echo $seo['custom_scripts_body'];
            echo "\n<!-- End Custom Body Scripts -->\n";
        }
    }

    /**
     * Add Security Headers
     */
    public function add_security_headers() {
        // Don't add headers in admin or for AJAX requests
        if (is_admin() || wp_doing_ajax()) {
            return;
        }

        // X-Content-Type-Options - Prevent MIME sniffing
        header('X-Content-Type-Options: nosniff');

        // X-Frame-Options - Prevent clickjacking (SAMEORIGIN allows same-domain framing)
        header('X-Frame-Options: SAMEORIGIN');

        // Referrer-Policy - Control referrer information
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Permissions-Policy - Control browser features
        header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

        // X-XSS-Protection - Enable XSS filtering (legacy browsers)
        header('X-XSS-Protection: 1; mode=block');

        // Note: HSTS and CSP should be configured at server level for production
        // HSTS requires HTTPS and should only be enabled on production servers
        // CSP depends on what external resources are used
    }

    /**
     * Add cache rules to .htaccess for static assets
     *
     * @param string $rules Current rules
     * @return string Modified rules
     */
    public function add_cache_rules($rules) {
        $cache_rules = <<<HTACCESS

# BEGIN Unicorn Studio Cache Headers
<IfModule mod_expires.c>
    ExpiresActive On

    # CSS and JavaScript - 1 year (immutable with version query strings)
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/javascript "access plus 1 year"

    # Fonts - 1 year
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType font/ttf "access plus 1 year"
    ExpiresByType font/otf "access plus 1 year"
    ExpiresByType application/x-font-ttf "access plus 1 year"
    ExpiresByType application/x-font-otf "access plus 1 year"

    # Images - 1 month
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/webp "access plus 1 month"
    ExpiresByType image/svg+xml "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 month"
</IfModule>

<IfModule mod_headers.c>
    # CSS/JS - Immutable caching
    <FilesMatch "\.(css|js)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Fonts - Immutable caching
    <FilesMatch "\.(woff2?|ttf|otf|eot)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Images - Long cache
    <FilesMatch "\.(jpg|jpeg|png|gif|webp|svg|ico)$">
        Header set Cache-Control "public, max-age=2592000"
    </FilesMatch>
</IfModule>
# END Unicorn Studio Cache Headers

HTACCESS;

        return $cache_rules . $rules;
    }

    /**
     * Output LCP image preload hint
     * Preloads the hero/LCP image for faster loading
     */
    public function output_lcp_preload() {
        if (!is_singular('page')) {
            return;
        }

        global $post;
        if (!$post) {
            return;
        }

        // Check for hero section with background image in the page content
        $content = $post->post_content ?? '';
        $html = get_post_meta($post->ID, '_unicorn_studio_html', true);

        // Try to find background-image in hero section
        $lcp_image = null;

        // Pattern 1: background-image: url(...)
        if (preg_match('/id=["\']hero["\'][^>]*style=["\'][^"\']*background-image:\s*url\(["\']?([^"\')\s]+)["\']?\)/i', $html ?: $content, $matches)) {
            $lcp_image = $matches[1];
        }

        // Pattern 2: First large image in content
        if (!$lcp_image && preg_match('/<img[^>]+src=["\']([^"\']+)["\'][^>]*>/i', $html ?: $content, $matches)) {
            $lcp_image = $matches[1];
        }

        // Pattern 3: Featured image
        if (!$lcp_image && has_post_thumbnail($post->ID)) {
            $lcp_image = get_the_post_thumbnail_url($post->ID, 'large');
        }

        if ($lcp_image) {
            echo '<link rel="preload" as="image" href="' . esc_url($lcp_image) . '" fetchpriority="high">' . "\n";
        }
    }

    /**
     * Check if a SEO plugin is active
     */
    private function has_seo_plugin() {
        return (
            defined('WPSEO_VERSION') || // Yoast SEO
            defined('RANK_MATH_VERSION') || // RankMath
            class_exists('All_in_One_SEO_Pack') || // AIOSEO
            defined('JETRANKINGS_VERSION') // JetRankings
        );
    }

    /**
     * Get SEO settings from options
     *
     * @return array SEO settings
     */
    public static function get_seo_settings() {
        return get_option('unicorn_studio_seo_settings', []);
    }

    /**
     * Get logo URL
     *
     * @return string Logo URL or empty string
     */
    public static function get_logo_url() {
        return get_option('unicorn_studio_logo_url', '');
    }

    /**
     * Get logo dark URL
     *
     * @return string Logo dark URL or empty string
     */
    public static function get_logo_dark_url() {
        return get_option('unicorn_studio_logo_dark_url', '');
    }

    /**
     * Get favicon URL
     *
     * @return string Favicon URL or empty string
     */
    public static function get_favicon_url() {
        return get_option('unicorn_studio_favicon_url', '');
    }

    /**
     * Get OG image URL
     *
     * @return string OG image URL or empty string
     */
    public static function get_og_image_url() {
        return get_option('unicorn_studio_og_image_url', '');
    }

    /**
     * Get tagline
     *
     * @return string Tagline or empty string
     */
    public static function get_tagline() {
        return get_option('unicorn_studio_tagline', '');
    }

    /**
     * Update site identity from sync data
     *
     * @param array $data Site identity data
     * @return bool Success
     */
    public static function sync($data) {
        $debug = defined('WP_DEBUG') && WP_DEBUG;

        if ($debug) {
            error_log('[Unicorn Studio Site Identity] Syncing: ' . print_r($data, true));
        }

        // Logo
        if (isset($data['logo_url'])) {
            update_option('unicorn_studio_logo_url', sanitize_url($data['logo_url']));
        }

        // Logo Dark
        if (isset($data['logo_dark_url'])) {
            update_option('unicorn_studio_logo_dark_url', sanitize_url($data['logo_dark_url']));
        }

        // Favicon
        if (isset($data['favicon_url'])) {
            update_option('unicorn_studio_favicon_url', sanitize_url($data['favicon_url']));
        }

        // OG Image
        if (isset($data['og_image_url'])) {
            update_option('unicorn_studio_og_image_url', sanitize_url($data['og_image_url']));
        }

        // Tagline
        if (isset($data['tagline'])) {
            update_option('unicorn_studio_tagline', sanitize_text_field($data['tagline']));
        }

        // SEO Settings (full settings for PageSpeed optimization)
        if (isset($data['seo_settings']) && is_array($data['seo_settings'])) {
            $seo = $data['seo_settings'];
            $sanitized_seo = [
                'site_name' => sanitize_text_field($seo['site_name'] ?? ''),
                'title_separator' => sanitize_text_field($seo['title_separator'] ?? ' | '),
                'title_format' => sanitize_text_field($seo['title_format'] ?? ''),
                'default_meta_description' => sanitize_textarea_field($seo['default_meta_description'] ?? ''),
                'default_og_image' => sanitize_url($seo['default_og_image'] ?? ''),
                'favicon' => sanitize_url($seo['favicon'] ?? ''),
                'apple_touch_icon' => sanitize_url($seo['apple_touch_icon'] ?? ''),
                'google_verification' => sanitize_text_field($seo['google_verification'] ?? ''),
                'bing_verification' => sanitize_text_field($seo['bing_verification'] ?? ''),
                'google_analytics_id' => sanitize_text_field($seo['google_analytics_id'] ?? ''),
                'google_tag_manager_id' => sanitize_text_field($seo['google_tag_manager_id'] ?? ''),
                'facebook_pixel_id' => sanitize_text_field($seo['facebook_pixel_id'] ?? ''),
                'custom_scripts_head' => $seo['custom_scripts_head'] ?? '', // Allow HTML/JS
                'custom_scripts_body' => $seo['custom_scripts_body'] ?? '', // Allow HTML/JS
                'robots_txt' => sanitize_textarea_field($seo['robots_txt'] ?? ''),
                'sitemap_enabled' => (bool) ($seo['sitemap_enabled'] ?? true),
                'social_profiles' => is_array($seo['social_profiles'] ?? null) ? array_map('sanitize_url', $seo['social_profiles']) : [],
                'local_business' => $seo['local_business'] ?? null,
            ];

            update_option('unicorn_studio_seo_settings', $sanitized_seo);

            // Also update robots.txt if provided
            if (!empty($sanitized_seo['robots_txt'])) {
                update_option('unicorn_studio_robots_txt', $sanitized_seo['robots_txt']);
            }

            if ($debug) {
                error_log('[Unicorn Studio Site Identity] SEO Settings saved: ' . print_r($sanitized_seo, true));
            }
        }

        if ($debug) {
            error_log('[Unicorn Studio Site Identity] Sync complete');
        }

        return true;
    }

    /**
     * Get logo HTML for use in templates
     *
     * @param string $class CSS classes
     * @param bool $link Wrap in link to home
     * @return string HTML
     */
    public static function get_logo_html($class = 'h-8 w-auto', $link = true) {
        $logo_url = self::get_logo_url();

        if (empty($logo_url)) {
            return '';
        }

        $site_name = get_bloginfo('name');
        $img = '<img src="' . esc_url($logo_url) . '" alt="' . esc_attr($site_name) . '" class="' . esc_attr($class) . '">';

        if ($link) {
            return '<a href="' . esc_url(home_url('/')) . '" class="flex items-center">' . $img . '</a>';
        }

        return $img;
    }

    /**
     * Clear all site identity options
     */
    public static function clear() {
        delete_option('unicorn_studio_logo_url');
        delete_option('unicorn_studio_logo_dark_url');
        delete_option('unicorn_studio_favicon_url');
        delete_option('unicorn_studio_og_image_url');
        delete_option('unicorn_studio_tagline');
        delete_option('unicorn_studio_seo_settings');
    }

    /**
     * Write cache headers to .htaccess on plugin activation
     */
    public static function activate_cache_headers() {
        // Write cache rules to uploads folder .htaccess
        $upload_dir = wp_upload_dir();
        $htaccess_path = $upload_dir['basedir'] . '/unicorn-studio/.htaccess';

        $cache_rules = <<<HTACCESS
# Unicorn Studio Cache Headers
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
</IfModule>

<IfModule mod_headers.c>
    <FilesMatch "\.(css|js|woff2?|ttf|otf)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
</IfModule>
HTACCESS;

        // Only write if directory exists
        if (file_exists(dirname($htaccess_path))) {
            file_put_contents($htaccess_path, $cache_rules);
        }
    }
}
