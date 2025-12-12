-- ============================================
-- UNICORN STUDIO - GLOBAL COMPONENTS SYSTEM
-- Migration 006
-- ============================================

-- ============================================
-- 1. ERWEITERE COMPONENTS TABELLE
-- ============================================

-- HTML Markup der Component (separiert von content JSON)
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS html TEXT;

-- CSS Styles (optional, meistens leer weil Tailwind)
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS css TEXT;

-- JavaScript Code (optional, für Interaktivität)
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS js TEXT;

-- Ist diese Component global (auf allen Seiten)?
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Automatisch einbinden (für Header/Footer)
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS auto_include BOOLEAN DEFAULT false;

-- Position der Component
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS "position" TEXT DEFAULT 'content'
    CHECK ("position" IN ('header', 'footer', 'content'));

-- Usage Counter
ALTER TABLE public.components ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- ============================================
-- 2. ERWEITERE SITES TABELLE
-- ============================================

-- Global Header Reference
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS global_header_id UUID REFERENCES public.components(id) ON DELETE SET NULL;

-- Global Footer Reference
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS global_footer_id UUID REFERENCES public.components(id) ON DELETE SET NULL;

-- ============================================
-- 3. ERWEITERE PAGES TABELLE
-- ============================================

-- Header auf dieser Seite ausblenden
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS hide_header BOOLEAN DEFAULT false;

-- Footer auf dieser Seite ausblenden
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS hide_footer BOOLEAN DEFAULT false;

-- Alternativer Header nur für diese Seite
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS custom_header_id UUID REFERENCES public.components(id) ON DELETE SET NULL;

-- Alternativer Footer nur für diese Seite
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS custom_footer_id UUID REFERENCES public.components(id) ON DELETE SET NULL;

-- ============================================
-- 4. NEUE TABELLE: COMPONENT_USAGE
-- Tracking welche Components wo verwendet werden
-- ============================================

CREATE TABLE IF NOT EXISTS public.component_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    component_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    position_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Verhindert Duplikate
    UNIQUE(component_id, page_id)
);

-- RLS für component_usage
ALTER TABLE public.component_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Can view component_usage of accessible sites"
    ON public.component_usage FOR SELECT
    USING (
        page_id IN (
            SELECT p.id FROM public.pages p
            JOIN public.sites s ON s.id = p.site_id
            JOIN public.profiles pr ON pr.organization_id = s.organization_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "Can insert component_usage of accessible sites"
    ON public.component_usage FOR INSERT
    WITH CHECK (
        page_id IN (
            SELECT p.id FROM public.pages p
            JOIN public.sites s ON s.id = p.site_id
            JOIN public.profiles pr ON pr.organization_id = s.organization_id
            WHERE pr.id = auth.uid()
            AND pr.role IN ('owner', 'admin', 'editor')
        )
    );

CREATE POLICY "Can delete component_usage of accessible sites"
    ON public.component_usage FOR DELETE
    USING (
        page_id IN (
            SELECT p.id FROM public.pages p
            JOIN public.sites s ON s.id = p.site_id
            JOIN public.profiles pr ON pr.organization_id = s.organization_id
            WHERE pr.id = auth.uid()
            AND pr.role IN ('owner', 'admin', 'editor')
        )
    );

-- ============================================
-- 5. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_components_is_global ON public.components(site_id, is_global);
CREATE INDEX IF NOT EXISTS idx_components_position ON public.components(site_id, "position");
CREATE INDEX IF NOT EXISTS idx_component_usage_component ON public.component_usage(component_id);
CREATE INDEX IF NOT EXISTS idx_component_usage_page ON public.component_usage(page_id);
CREATE INDEX IF NOT EXISTS idx_sites_global_header ON public.sites(global_header_id);
CREATE INDEX IF NOT EXISTS idx_sites_global_footer ON public.sites(global_footer_id);

-- ============================================
-- 6. DATABASE FUNCTIONS
-- ============================================

-- ============================================
-- 6.1 CREATE GLOBAL COMPONENT
-- Erstellt eine Component und setzt sie optional als Global Header/Footer
-- ============================================
CREATE OR REPLACE FUNCTION public.create_global_component(
    p_site_id UUID,
    p_name TEXT,
    p_html TEXT,
    p_css TEXT DEFAULT NULL,
    p_js TEXT DEFAULT NULL,
    p_position TEXT DEFAULT 'content',
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_set_as_site_default BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    new_component_id UUID;
    is_header_or_footer BOOLEAN;
BEGIN
    -- Prüfe ob es Header oder Footer ist
    is_header_or_footer := p_position IN ('header', 'footer');

    -- Erstelle Component
    INSERT INTO public.components (
        site_id,
        name,
        html,
        css,
        js,
        "position",
        is_global,
        auto_include,
        description,
        category,
        content
    )
    VALUES (
        p_site_id,
        p_name,
        p_html,
        p_css,
        p_js,
        p_position,
        is_header_or_footer, -- Header/Footer sind automatisch global
        is_header_or_footer, -- Header/Footer werden automatisch included
        p_description,
        COALESCE(p_category, p_position),
        '{}'::jsonb -- Legacy content field
    )
    RETURNING id INTO new_component_id;

    -- Wenn Header/Footer und set_as_site_default, dann als Site-Default setzen
    IF p_set_as_site_default AND p_position = 'header' THEN
        UPDATE public.sites
        SET global_header_id = new_component_id
        WHERE id = p_site_id;
    ELSIF p_set_as_site_default AND p_position = 'footer' THEN
        UPDATE public.sites
        SET global_footer_id = new_component_id
        WHERE id = p_site_id;
    END IF;

    RETURN new_component_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.2 GET PAGE WITH GLOBALS
-- Holt eine Seite mit Header und Footer
-- ============================================
CREATE OR REPLACE FUNCTION public.get_page_with_globals(
    p_page_id UUID
)
RETURNS TABLE (
    page_id UUID,
    page_name TEXT,
    page_slug TEXT,
    page_html TEXT,
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

-- ============================================
-- 6.3 GET COMPONENT LIBRARY
-- Holt alle Components einer Site für die Library
-- ============================================
CREATE OR REPLACE FUNCTION public.get_component_library(
    p_site_id UUID
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    component_position TEXT,
    is_global BOOLEAN,
    auto_include BOOLEAN,
    usage_count INTEGER,
    thumbnail_url TEXT,
    html TEXT,
    css TEXT,
    js TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.description,
        c.category,
        c."position" AS component_position,
        c.is_global,
        c.auto_include,
        COALESCE(c.usage_count, 0) AS usage_count,
        c.thumbnail_url,
        c.html,
        c.css,
        c.js,
        c.created_at,
        c.updated_at
    FROM public.components c
    WHERE c.site_id = p_site_id
    ORDER BY
        -- Header zuerst, dann Footer, dann Rest
        CASE c."position"
            WHEN 'header' THEN 1
            WHEN 'footer' THEN 2
            ELSE 3
        END,
        c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.4 GET COMPONENT USAGE COUNT
-- Zählt auf wie vielen Seiten eine Component verwendet wird
-- ============================================
CREATE OR REPLACE FUNCTION public.get_component_usage_count(
    p_component_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    usage_count INTEGER;
    component_record RECORD;
BEGIN
    -- Hole Component Info
    SELECT * INTO component_record FROM public.components WHERE id = p_component_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Zähle direkte Verwendungen
    SELECT COUNT(*) INTO usage_count
    FROM public.component_usage
    WHERE component_id = p_component_id;

    -- Wenn Global Header/Footer, zähle auch alle Seiten der Site
    IF component_record.is_global AND component_record."position" IN ('header', 'footer') THEN
        SELECT COUNT(*) INTO usage_count
        FROM public.pages p
        JOIN public.sites s ON s.id = p.site_id
        WHERE p.site_id = component_record.site_id
        AND (
            (component_record."position" = 'header' AND s.global_header_id = p_component_id AND COALESCE(p.hide_header, false) = false)
            OR
            (component_record."position" = 'footer' AND s.global_footer_id = p_component_id AND COALESCE(p.hide_footer, false) = false)
        );
    END IF;

    RETURN usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.5 SET SITE GLOBAL HEADER
-- Setzt den Global Header einer Site
-- ============================================
CREATE OR REPLACE FUNCTION public.set_site_global_header(
    p_site_id UUID,
    p_component_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Validiere dass Component zur Site gehört und ein Header ist
    IF NOT EXISTS (
        SELECT 1 FROM public.components
        WHERE id = p_component_id
        AND site_id = p_site_id
        AND "position" = 'header'
    ) THEN
        RAISE EXCEPTION 'Component is not a valid header for this site';
    END IF;

    UPDATE public.sites
    SET global_header_id = p_component_id
    WHERE id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.6 SET SITE GLOBAL FOOTER
-- Setzt den Global Footer einer Site
-- ============================================
CREATE OR REPLACE FUNCTION public.set_site_global_footer(
    p_site_id UUID,
    p_component_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Validiere dass Component zur Site gehört und ein Footer ist
    IF NOT EXISTS (
        SELECT 1 FROM public.components
        WHERE id = p_component_id
        AND site_id = p_site_id
        AND "position" = 'footer'
    ) THEN
        RAISE EXCEPTION 'Component is not a valid footer for this site';
    END IF;

    UPDATE public.sites
    SET global_footer_id = p_component_id
    WHERE id = p_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.7 RENDER PAGE WITH COMPONENTS
-- Gibt das komplette HTML einer Seite mit Header/Footer zurück
-- ============================================
CREATE OR REPLACE FUNCTION public.render_page_with_components(
    p_page_id UUID
)
RETURNS TEXT AS $$
DECLARE
    page_data RECORD;
    rendered_html TEXT;
    all_css TEXT := '';
    all_js TEXT := '';
BEGIN
    -- Hole Page mit Globals
    SELECT * INTO page_data FROM public.get_page_with_globals(p_page_id);

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Sammle CSS
    IF page_data.header_css IS NOT NULL AND NOT page_data.hide_header THEN
        all_css := all_css || page_data.header_css || E'\n';
    END IF;
    IF page_data.footer_css IS NOT NULL AND NOT page_data.hide_footer THEN
        all_css := all_css || page_data.footer_css || E'\n';
    END IF;

    -- Sammle JS
    IF page_data.header_js IS NOT NULL AND NOT page_data.hide_header THEN
        all_js := all_js || page_data.header_js || E'\n';
    END IF;
    IF page_data.footer_js IS NOT NULL AND NOT page_data.hide_footer THEN
        all_js := all_js || page_data.footer_js || E'\n';
    END IF;

    -- Baue HTML zusammen
    rendered_html := '';

    -- Header
    IF NOT page_data.hide_header AND page_data.header_html IS NOT NULL THEN
        rendered_html := rendered_html || page_data.header_html || E'\n';
    END IF;

    -- Page Content
    IF page_data.page_html IS NOT NULL THEN
        rendered_html := rendered_html || page_data.page_html || E'\n';
    END IF;

    -- Footer
    IF NOT page_data.hide_footer AND page_data.footer_html IS NOT NULL THEN
        rendered_html := rendered_html || page_data.footer_html || E'\n';
    END IF;

    -- Füge CSS am Anfang ein (für <head>)
    IF all_css != '' THEN
        rendered_html := '<style>' || all_css || '</style>' || E'\n' || rendered_html;
    END IF;

    -- Füge JS am Ende ein (vor </body>)
    IF all_js != '' THEN
        rendered_html := rendered_html || E'\n<script>' || all_js || '</script>';
    END IF;

    RETURN rendered_html;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6.8 UPDATE COMPONENT USAGE COUNT TRIGGER
-- Aktualisiert usage_count wenn component_usage geändert wird
-- ============================================
CREATE OR REPLACE FUNCTION public.update_component_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.components
        SET usage_count = COALESCE(usage_count, 0) + 1
        WHERE id = NEW.component_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.components
        SET usage_count = GREATEST(COALESCE(usage_count, 0) - 1, 0)
        WHERE id = OLD.component_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS on_component_usage_change ON public.component_usage;
CREATE TRIGGER on_component_usage_change
    AFTER INSERT OR DELETE ON public.component_usage
    FOR EACH ROW EXECUTE FUNCTION public.update_component_usage_count();

-- ============================================
-- 7. GRANTS
-- ============================================
GRANT EXECUTE ON FUNCTION public.create_global_component TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_page_with_globals TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_component_library TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_component_usage_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_site_global_header TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_site_global_footer TO authenticated;
GRANT EXECUTE ON FUNCTION public.render_page_with_components TO authenticated;
