-- Add custom_css column to pages table
-- This stores page-specific CSS (keyframes, custom classes, etc.)
-- Design tokens are stored separately in design_variables

ALTER TABLE pages ADD COLUMN IF NOT EXISTS custom_css TEXT;

-- Add comment for documentation
COMMENT ON COLUMN pages.custom_css IS 'Page-specific CSS extracted from AI-generated HTML (keyframes, custom classes). Design tokens are in design_variables table.';

-- ============================================
-- Update get_page_with_globals function to include custom_css
-- ============================================
CREATE OR REPLACE FUNCTION public.get_page_with_globals(
    p_page_id UUID
)
RETURNS TABLE (
    page_id UUID,
    page_name TEXT,
    page_slug TEXT,
    page_html TEXT,
    page_custom_css TEXT,
    page_settings JSONB,
    page_seo JSONB,
    hide_header BOOLEAN,
    hide_footer BOOLEAN,
    -- Header
    header_id UUID,
    header_html TEXT,
    header_css TEXT,
    header_js TEXT,
    -- Footer
    footer_id UUID,
    footer_html TEXT,
    footer_css TEXT,
    footer_js TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS page_id,
        p.name AS page_name,
        p.slug AS page_slug,
        p.html_content AS page_html,
        p.custom_css AS page_custom_css,
        p.settings AS page_settings,
        p.seo AS page_seo,
        COALESCE(p.hide_header, false) AS hide_header,
        COALESCE(p.hide_footer, false) AS hide_footer,
        -- Header: Custom Header hat Priorität, sonst Global Header
        COALESCE(p.custom_header_id, s.global_header_id) AS header_id,
        h.html AS header_html,
        h.css AS header_css,
        h.js AS header_js,
        -- Footer: Custom Footer hat Priorität, sonst Global Footer
        COALESCE(p.custom_footer_id, s.global_footer_id) AS footer_id,
        f.html AS footer_html,
        f.css AS footer_css,
        f.js AS footer_js
    FROM public.pages p
    JOIN public.sites s ON s.id = p.site_id
    LEFT JOIN public.components h ON h.id = COALESCE(p.custom_header_id, s.global_header_id)
    LEFT JOIN public.components f ON f.id = COALESCE(p.custom_footer_id, s.global_footer_id)
    WHERE p.id = p_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
