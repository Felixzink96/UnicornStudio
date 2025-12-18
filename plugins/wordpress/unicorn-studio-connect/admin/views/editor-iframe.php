<?php
/**
 * Editor Iframe Page - Elementor-style fullscreen editor
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

// Get parameters
$post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
$unicorn_id = get_post_meta($post_id, '_unicorn_studio_id', true);
$site_id = get_option('unicorn_studio_site_id');
$api_url = get_option('unicorn_studio_api_url', 'http://localhost:3000/api/v1');
$api_key = get_option('unicorn_studio_api_key', '');

// Validate
if (!$post_id || !$unicorn_id || !$site_id) {
    wp_die(__('Ungültige Seite oder fehlende Konfiguration.', 'unicorn-studio'));
}

// Get base URL from API URL (remove /api/v1)
$base_url = preg_replace('/\/api\/v1\/?$/', '', $api_url);

// Build return URL
$return_url = admin_url('edit.php?post_type=page');

// Create WordPress auth token
$wp_token = '';
if (!empty($api_key)) {
    $wp_token = base64_encode(json_encode([
        'key' => $api_key,
        'site' => $site_id,
        'page' => $unicorn_id,
        'exp' => time() + 3600, // 1 hour
        'wp_user' => get_current_user_id(),
        'wp_site' => home_url(),
    ]));
}

// Build editor URL with token
$editor_url = $base_url . '/editor/' . $site_id . '/' . $unicorn_id;
$editor_params = [
    'returnUrl' => $return_url,
    'embedded' => 'true',
];
if ($wp_token) {
    $editor_params['wpToken'] = $wp_token;
}
$editor_url .= '?' . http_build_query($editor_params);

// Get page title
$page_title = get_the_title($post_id);
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo esc_html($page_title); ?> - Unicorn Studio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #0a0a0a;
        }

        /* Loading Screen */
        .unicorn-loader {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        }

        .unicorn-loader.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        .unicorn-loader-logo {
            width: 80px;
            height: 80px;
            margin-bottom: 30px;
            animation: pulse 2s ease-in-out infinite;
        }

        .unicorn-loader-logo svg {
            width: 100%;
            height: 100%;
            color: #9333ea;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }

        .unicorn-loader-text {
            color: #ffffff;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .unicorn-loader-bar {
            width: 200px;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        .unicorn-loader-progress {
            height: 100%;
            background: linear-gradient(90deg, #9333ea, #c084fc);
            border-radius: 3px;
            animation: loading 1.5s ease-in-out infinite;
        }

        @keyframes loading {
            0% { width: 0%; margin-left: 0; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
        }

        /* Top Bar */
        .unicorn-topbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 44px;
            background: #18181b;
            border-bottom: 1px solid #27272a;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 100;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .unicorn-topbar-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .unicorn-topbar-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-weight: 600;
            font-size: 14px;
        }

        .unicorn-topbar-logo svg {
            width: 20px;
            height: 20px;
            color: #9333ea;
        }

        .unicorn-topbar-divider {
            width: 1px;
            height: 20px;
            background: #3f3f46;
        }

        .unicorn-topbar-title {
            color: #a1a1aa;
            font-size: 13px;
        }

        .unicorn-close-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            background: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 6px;
            color: #ffffff;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .unicorn-close-btn:hover {
            background: #3f3f46;
            border-color: #52525b;
        }

        .unicorn-close-btn svg {
            width: 16px;
            height: 16px;
        }

        /* Editor Frame */
        .unicorn-editor-frame {
            position: fixed;
            top: 44px;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: calc(100% - 44px);
            border: none;
            background: #0a0a0a;
        }
    </style>
</head>
<body>
    <!-- Loading Screen -->
    <div class="unicorn-loader" id="loader">
        <div class="unicorn-loader-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
            </svg>
        </div>
        <div class="unicorn-loader-text">Editor wird geladen...</div>
        <div class="unicorn-loader-bar">
            <div class="unicorn-loader-progress"></div>
        </div>
    </div>

    <!-- Top Bar -->
    <div class="unicorn-topbar">
        <div class="unicorn-topbar-left">
            <div class="unicorn-topbar-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
                Unicorn Studio
            </div>
            <div class="unicorn-topbar-divider"></div>
            <div class="unicorn-topbar-title"><?php echo esc_html($page_title); ?></div>
        </div>
        <a href="<?php echo esc_url($return_url); ?>" class="unicorn-close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 19l-7-7 7-7"/>
            </svg>
            Zurück zu WordPress
        </a>
    </div>

    <!-- Editor Iframe -->
    <iframe
        id="editor-frame"
        class="unicorn-editor-frame"
        src="<?php echo esc_url($editor_url); ?>"
        allow="clipboard-read; clipboard-write"
    ></iframe>

    <script>
        const iframe = document.getElementById('editor-frame');
        const loader = document.getElementById('loader');

        // Hide loader when iframe loads
        iframe.addEventListener('load', function() {
            setTimeout(function() {
                loader.classList.add('hidden');
            }, 300);
        });

        // Fallback: Hide loader after 15 seconds
        setTimeout(function() {
            loader.classList.add('hidden');
        }, 15000);

        // Listen for close message from editor
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'unicorn-close') {
                window.location.href = '<?php echo esc_js($return_url); ?>';
            }
        });
    </script>
</body>
</html>
