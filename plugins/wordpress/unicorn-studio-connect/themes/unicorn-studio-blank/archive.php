<?php
/**
 * Archive Template
 *
 * @package Unicorn_Studio_Blank
 */

unicorn_get_header();
?>

<main id="main" class="site-main">
    <header class="page-header">
        <?php
        the_archive_title('<h1 class="page-title">', '</h1>');
        the_archive_description('<div class="archive-description">', '</div>');
        ?>
    </header>

    <?php
    if (have_posts()) :
        while (have_posts()) :
            the_post();
            ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <header class="entry-header">
                    <?php the_title(sprintf('<h2 class="entry-title"><a href="%s">', esc_url(get_permalink())), '</a></h2>'); ?>
                </header>

                <?php if (has_post_thumbnail()) : ?>
                    <div class="post-thumbnail">
                        <a href="<?php the_permalink(); ?>">
                            <?php the_post_thumbnail('medium'); ?>
                        </a>
                    </div>
                <?php endif; ?>

                <div class="entry-summary">
                    <?php the_excerpt(); ?>
                </div>
            </article>
            <?php
        endwhile;

        // Pagination
        the_posts_pagination([
            'prev_text' => '&laquo;',
            'next_text' => '&raquo;',
        ]);

    else :
        ?>
        <p><?php esc_html_e('Keine Inhalte gefunden.', 'unicorn-studio-blank'); ?></p>
        <?php
    endif;
    ?>
</main>

<?php
unicorn_get_footer();
