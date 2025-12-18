<?php
/**
 * Editor Redirect Page - Beautiful loading screen then redirect to Unicorn Studio
 *
 * Uses redirect instead of iframe because:
 * - Cross-origin authentication doesn't work in iframes (browser security)
 * - User stays logged in via normal browser session
 * - Much simpler and more reliable
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

// Get parameters
$post_id = isset($_GET['post_id']) ? intval($_GET['post_id']) : 0;
$unicorn_id = get_post_meta($post_id, '_unicorn_studio_id', true);
$site_id = get_option('unicorn_studio_site_id');
$api_url = get_option('unicorn_studio_api_url', 'http://localhost:3000/api/v1');

// Validate
if (!$post_id || !$unicorn_id || !$site_id) {
    wp_die(__('Ungültige Seite oder fehlende Konfiguration.', 'unicorn-studio'));
}

// Get base URL from API URL (remove /api/v1)
$base_url = preg_replace('/\/api\/v1\/?$/', '', $api_url);

// Build editor URL - goes directly to the page in editor
$return_url = admin_url('edit.php?post_type=page');
$editor_url = $base_url . '/editor/' . $site_id . '/' . $unicorn_id . '?returnUrl=' . urlencode($return_url);

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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .loader {
            text-align: center;
        }

        .loader-logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 30px;
            animation: pulse 2s ease-in-out infinite;
        }

        .loader-logo svg {
            width: 100%;
            height: 100%;
            color: #9333ea;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
        }

        .loader-text {
            color: #ffffff;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .loader-subtext {
            color: #a1a1aa;
            font-size: 14px;
            margin-bottom: 30px;
        }

        .loader-bar {
            width: 200px;
            height: 3px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
            margin: 0 auto;
        }

        .loader-progress {
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

        .cancel-link {
            margin-top: 40px;
            color: #71717a;
            font-size: 13px;
            text-decoration: none;
        }

        .cancel-link:hover {
            color: #a1a1aa;
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="loader-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
            </svg>
        </div>
        <div class="loader-text">Unicorn Studio wird geöffnet...</div>
        <div class="loader-subtext"><?php echo esc_html($page_title); ?></div>
        <div class="loader-bar">
            <div class="loader-progress"></div>
        </div>
        <a href="<?php echo esc_url($return_url); ?>" class="cancel-link">Abbrechen</a>
    </div>

    <script>
        // Redirect after a brief moment to show the loading animation
        setTimeout(function() {
            window.location.href = <?php echo wp_json_encode($editor_url); ?>;
        }, 800);
    </script>
</body>
</html>
