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

// Get base URL from API URL (remove /api/v1)
$base_url = preg_replace('/\/api\/v1\/?$/', '', $api_url);

// Build editor URL
$return_url = admin_url('post.php?post=' . $post_id . '&action=edit');
$editor_url = $base_url . '/editor/' . $site_id . '/' . $unicorn_id . '?returnUrl=' . urlencode($return_url) . '&embedded=true';

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

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
            background: #0a0a0a;
            overflow: hidden;
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
            animation: loading 2s ease-in-out infinite;
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
            height: 40px;
            background: #18181b;
            border-bottom: 1px solid #27272a;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 16px;
            z-index: 100;
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

        .unicorn-topbar-title {
            color: #a1a1aa;
            font-size: 13px;
            padding-left: 12px;
            border-left: 1px solid #27272a;
        }

        .unicorn-close-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: transparent;
            border: 1px solid #27272a;
            border-radius: 6px;
            color: #a1a1aa;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .unicorn-close-btn:hover {
            background: #27272a;
            color: #ffffff;
            border-color: #3f3f46;
        }

        .unicorn-close-btn svg {
            width: 16px;
            height: 16px;
        }

        /* Editor Frame */
        .unicorn-editor-frame {
            position: fixed;
            top: 40px;
            left: 0;
            right: 0;
            bottom: 0;
            border: none;
            background: #0a0a0a;
        }
    </style>
</head>
<body>
    <!-- Loading Screen -->
    <div class="unicorn-loader" id="loader">
        <div class="unicorn-loader-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: #9333ea;">
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
            <div class="unicorn-topbar-title"><?php echo esc_html($page_title); ?></div>
        </div>
        <a href="<?php echo esc_url($return_url); ?>" class="unicorn-close-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            Schließen
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
        // Hide loader when iframe loads
        const iframe = document.getElementById('editor-frame');
        const loader = document.getElementById('loader');

        iframe.addEventListener('load', function() {
            // Small delay for smoother transition
            setTimeout(function() {
                loader.classList.add('hidden');
            }, 500);
        });

        // Fallback: Hide loader after 10 seconds max
        setTimeout(function() {
            loader.classList.add('hidden');
        }, 10000);

        // Listen for messages from the editor (e.g., close request)
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'unicorn-close') {
                window.location.href = '<?php echo esc_js($return_url); ?>';
            }
        });
    </script>
</body>
</html>
