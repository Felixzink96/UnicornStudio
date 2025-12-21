<?php
/**
 * Script Manager
 *
 * Manages frontend JavaScript libraries (GSAP, Alpine.js)
 * All scripts are bundled locally for GDPR compliance - no external CDNs
 *
 * @package Unicorn_Studio
 */

defined('ABSPATH') || exit;

/**
 * Script Manager Class
 */
class Unicorn_Studio_Script_Manager {

    /**
     * Plugin assets URL
     */
    private $assets_url;

    /**
     * Plugin assets path
     */
    private $assets_path;

    /**
     * Script versions for cache busting
     */
    private $versions = [
        'gsap'           => '3.12.5',
        'scrolltrigger'  => '3.12.5',
        'alpine'         => '3.14.3',
    ];

    /**
     * Constructor
     */
    public function __construct() {
        $this->assets_url = UNICORN_STUDIO_PLUGIN_URL . 'assets/js/vendor/';
        $this->assets_path = UNICORN_STUDIO_PLUGIN_DIR . 'assets/js/vendor/';

        // Register scripts early
        add_action('wp_enqueue_scripts', [$this, 'register_scripts'], 5);

        // Enqueue on Unicorn pages
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts'], 15);

        // Add init script in footer
        add_action('wp_footer', [$this, 'print_init_script'], 100);
    }

    /**
     * Register all vendor scripts
     */
    public function register_scripts() {
        // GSAP Core
        wp_register_script(
            'unicorn-gsap',
            $this->assets_url . 'gsap.min.js',
            [],
            $this->versions['gsap'],
            true
        );

        // GSAP ScrollTrigger
        wp_register_script(
            'unicorn-scrolltrigger',
            $this->assets_url . 'ScrollTrigger.min.js',
            ['unicorn-gsap'],
            $this->versions['scrolltrigger'],
            true
        );

        // Alpine.js
        wp_register_script(
            'unicorn-alpine',
            $this->assets_url . 'alpine.min.js',
            [],
            $this->versions['alpine'],
            true
        );

        // Add defer attribute to Alpine.js
        add_filter('script_loader_tag', [$this, 'add_defer_attribute'], 10, 2);
    }

    /**
     * Add defer attribute to Alpine.js script
     */
    public function add_defer_attribute($tag, $handle) {
        if ($handle === 'unicorn-alpine') {
            return str_replace(' src', ' defer src', $tag);
        }
        return $tag;
    }

    /**
     * Enqueue scripts on Unicorn pages
     */
    public function enqueue_scripts() {
        if (!$this->is_unicorn_page()) {
            return;
        }

        $enable_gsap = Unicorn_Studio::get_option('enable_gsap', true);
        $enable_alpine = Unicorn_Studio::get_option('enable_alpine', true);

        if ($enable_alpine) {
            wp_enqueue_script('unicorn-alpine');
        }

        if ($enable_gsap) {
            wp_enqueue_script('unicorn-gsap');
            wp_enqueue_script('unicorn-scrolltrigger');
        }
    }

    /**
     * Print initialization script in footer
     */
    public function print_init_script() {
        if (!$this->is_unicorn_page()) {
            return;
        }

        $enable_gsap = Unicorn_Studio::get_option('enable_gsap', true);

        if (!$enable_gsap) {
            return;
        }

        ?>
        <script>
        (function() {
            'use strict';

            // GSAP Reveal Animations - Performance Optimized
            if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                gsap.registerPlugin(ScrollTrigger);

                // Animate elements with data-reveal attribute
                // Using fromTo() with autoAlpha to prevent invisible elements bug
                document.querySelectorAll('[data-reveal]').forEach(function(el) {
                    var direction = el.getAttribute('data-reveal') || 'up';
                    var delay = parseFloat(el.getAttribute('data-reveal-delay')) || 0;
                    var duration = parseFloat(el.getAttribute('data-reveal-duration')) || 0.6;

                    var x = 0, y = 0, scale = 1;

                    switch(direction) {
                        case 'up':
                            y = 30;
                            break;
                        case 'down':
                            y = -30;
                            break;
                        case 'left':
                            x = 30;
                            break;
                        case 'right':
                            x = -30;
                            break;
                        case 'scale':
                            scale = 0.95;
                            break;
                        case 'fade':
                            // Just fade, no movement
                            break;
                    }

                    gsap.fromTo(el,
                        // FROM (start state)
                        { autoAlpha: 0, x: x, y: y, scale: scale },
                        // TO (end state)
                        {
                            autoAlpha: 1,
                            x: 0,
                            y: 0,
                            scale: 1,
                            duration: duration,
                            delay: delay,
                            ease: 'power2.out',
                            force3D: true,
                            scrollTrigger: {
                                trigger: el,
                                start: 'top 88%',
                                toggleActions: 'play none none none'
                            }
                        }
                    );
                });

                // Stagger animations for groups
                document.querySelectorAll('[data-reveal-stagger]').forEach(function(container) {
                    var children = container.children;
                    var stagger = parseFloat(container.getAttribute('data-reveal-stagger')) || 0.1;

                    gsap.fromTo(children,
                        { autoAlpha: 0, y: 20 },
                        {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.5,
                            stagger: stagger,
                            ease: 'power2.out',
                            force3D: true,
                            scrollTrigger: {
                                trigger: container,
                                start: 'top 88%',
                                toggleActions: 'play none none none'
                            }
                        }
                    );
                });

                // Parallax effects - optimized with scrub smoothing
                document.querySelectorAll('[data-parallax]').forEach(function(el) {
                    var speed = parseFloat(el.getAttribute('data-parallax')) || 0.3;

                    gsap.to(el, {
                        yPercent: speed * 20,
                        ease: 'none',
                        force3D: true,
                        scrollTrigger: {
                            trigger: el.parentElement || el,
                            start: 'top bottom',
                            end: 'bottom top',
                            scrub: 0.5
                        }
                    });
                });

                // Horizontal scroll sections
                document.querySelectorAll('[data-horizontal-scroll]').forEach(function(section) {
                    var container = section.querySelector('[data-horizontal-container]');
                    if (!container) return;

                    gsap.to(container, {
                        x: function() { return -(container.scrollWidth - section.offsetWidth); },
                        ease: 'none',
                        force3D: true,
                        scrollTrigger: {
                            trigger: section,
                            start: 'top top',
                            end: function() { return '+=' + container.scrollWidth; },
                            scrub: 0.5,
                            pin: true,
                            anticipatePin: 1
                        }
                    });
                });
            }

        })();
        </script>
        <?php
    }

    /**
     * Check if current page is a Unicorn Studio page
     */
    private function is_unicorn_page() {
        if (!Unicorn_Studio::is_connected()) {
            return false;
        }

        global $post;

        // Custom Post Type with us_ prefix
        if (is_singular()) {
            $post_type = get_post_type();
            if ($post_type && strpos($post_type, 'us_') === 0) {
                return true;
            }
        }

        // Archive of us_* CPTs
        if (is_post_type_archive()) {
            $post_type = get_query_var('post_type');
            if (is_string($post_type) && strpos($post_type, 'us_') === 0) {
                return true;
            }
        }

        // Taxonomy of us_* CPTs
        if (is_tax()) {
            $queried = get_queried_object();
            if ($queried && isset($queried->taxonomy) && strpos($queried->taxonomy, 'us_') === 0) {
                return true;
            }
        }

        // Page with Unicorn meta
        if (is_page() && $post) {
            if (get_post_meta($post->ID, '_unicorn_studio_id', true)) {
                return true;
            }
        }

        // Frontpage if Unicorn-marked
        if (is_front_page()) {
            $front_page_id = get_option('page_on_front');
            if ($front_page_id && get_post_meta($front_page_id, '_unicorn_studio_id', true)) {
                return true;
            }
        }

        // Option to load on all pages
        if (Unicorn_Studio::get_option('load_scripts_globally', false)) {
            return true;
        }

        return false;
    }

    /**
     * Get script versions
     */
    public function get_versions() {
        return $this->versions;
    }

    /**
     * Check if vendor scripts exist
     */
    public function check_scripts() {
        return [
            'gsap' => file_exists($this->assets_path . 'gsap.min.js'),
            'scrolltrigger' => file_exists($this->assets_path . 'ScrollTrigger.min.js'),
            'alpine' => file_exists($this->assets_path . 'alpine.min.js'),
        ];
    }

    /**
     * Get total size of vendor scripts
     */
    public function get_total_size() {
        $total = 0;
        $files = ['gsap.min.js', 'ScrollTrigger.min.js', 'alpine.min.js'];

        foreach ($files as $file) {
            $path = $this->assets_path . $file;
            if (file_exists($path)) {
                $total += filesize($path);
            }
        }

        return size_format($total);
    }
}
