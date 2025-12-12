<?php
/**
 * Single Post Template
 *
 * @package Unicorn_Studio_Blank
 */

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

            <?php if (has_post_thumbnail()) : ?>
                <div class="post-thumbnail">
                    <?php the_post_thumbnail('large'); ?>
                </div>
            <?php endif; ?>

            <div class="entry-content">
                <?php the_content(); ?>
            </div>

            <footer class="entry-footer">
                <?php
                // Entry meta (categories, tags, etc.)
                $categories = get_the_category_list(', ');
                if ($categories) {
                    echo '<span class="cat-links">' . $categories . '</span>';
                }
                ?>
            </footer>
        </article>
        <?php
    endwhile;
    ?>
</main>

<?php
unicorn_get_footer();
