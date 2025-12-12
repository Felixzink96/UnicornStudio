<?php
/**
 * Page Template
 *
 * @package Unicorn_Studio_Blank
 */

// Check if this is a Unicorn Studio page
$is_unicorn = get_post_meta(get_the_ID(), '_unicorn_studio_id', true);

if ($is_unicorn) {
    // Minimal output for Unicorn pages - just the content
    unicorn_get_header();
    while (have_posts()) : the_post();
        the_content();
    endwhile;
    unicorn_get_footer();
} else {
    // Standard page layout
    unicorn_get_header();
    ?>
    <main id="main" class="site-main">
        <?php
        while (have_posts()) :
            the_post();
            ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <header class="entry-header">
                    <?php the_title('<h1 class="entry-title">', '</h1>'); ?>
                </header>

                <div class="entry-content">
                    <?php the_content(); ?>
                </div>
            </article>
            <?php
        endwhile;
        ?>
    </main>
    <?php
    unicorn_get_footer();
}
