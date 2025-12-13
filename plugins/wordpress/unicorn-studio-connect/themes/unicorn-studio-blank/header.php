<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<?php
// Render Global Header Component
if (class_exists('Unicorn_Studio_Global_Components')) {
    Unicorn_Studio_Global_Components::render_header();
}
?>

<div id="page" class="site">
