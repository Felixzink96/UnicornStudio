-- ============================================
-- UNICORN STUDIO - IMAGE & FORM SYSTEM
-- Migration für Bild-Management und Formulare
-- ============================================

-- ============================================
-- 1. SITE IMAGES (Bild-Verwaltung)
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,

    -- Storage Info
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,

    -- File Info
    filename TEXT NOT NULL,
    original_filename TEXT,
    alt_text TEXT,

    -- Dimensions & Size
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    mime_type TEXT,

    -- Organization
    tags TEXT[] DEFAULT '{}',
    folder TEXT DEFAULT '/',

    -- WordPress Sync
    wp_attachment_id INTEGER,
    wp_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for site_images
CREATE INDEX IF NOT EXISTS idx_site_images_site ON public.site_images(site_id);
CREATE INDEX IF NOT EXISTS idx_site_images_folder ON public.site_images(site_id, folder);
CREATE INDEX IF NOT EXISTS idx_site_images_created ON public.site_images(created_at DESC);

-- RLS for site_images
ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view images of their organization's sites"
ON public.site_images FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = site_images.site_id
        AND p.id = auth.uid()
    )
);

CREATE POLICY "Users can insert images to their organization's sites"
ON public.site_images FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = site_images.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

CREATE POLICY "Users can update images of their organization's sites"
ON public.site_images FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = site_images.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

CREATE POLICY "Users can delete images from their organization's sites"
ON public.site_images FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = site_images.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

-- ============================================
-- 2. FORM CONFIG (Erweitert components Tabelle)
-- ============================================
ALTER TABLE public.components
ADD COLUMN IF NOT EXISTS form_config JSONB;

COMMENT ON COLUMN public.components.form_config IS 'Formular-Konfiguration: {recipient_email, subject, success_message, error_message, cc, bcc, reply_to, fields}';

-- ============================================
-- 3. FORM SUBMISSIONS (Formular-Einreichungen)
-- ============================================
-- Drop existing table if it exists (from previous migration)
DROP TABLE IF EXISTS public.form_submissions CASCADE;

CREATE TABLE public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.components(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,

    -- Submission Data
    data JSONB NOT NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,  -- IP, User-Agent, Referrer, etc.

    -- Status
    is_spam BOOLEAN DEFAULT false,
    is_read BOOLEAN DEFAULT false,

    -- WordPress Sync
    wp_synced BOOLEAN DEFAULT false,
    wp_synced_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for form_submissions
CREATE INDEX idx_submissions_site ON public.form_submissions(site_id);
CREATE INDEX idx_submissions_form ON public.form_submissions(form_id);
CREATE INDEX idx_submissions_created ON public.form_submissions(created_at DESC);
CREATE INDEX idx_submissions_is_read ON public.form_submissions(site_id, is_read);

-- RLS for form_submissions
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view submissions of their organization's sites"
ON public.form_submissions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = form_submissions.site_id
        AND p.id = auth.uid()
    )
);

-- Public kann Submissions erstellen (Formular wird von Besuchern ausgefüllt)
CREATE POLICY "Anyone can create form submissions"
ON public.form_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update submissions of their organization's sites"
ON public.form_submissions FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = form_submissions.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

CREATE POLICY "Users can delete submissions from their organization's sites"
ON public.form_submissions FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = form_submissions.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
);

-- ============================================
-- 4. SHARE LINKS (Preview-Links)
-- ============================================
CREATE TABLE IF NOT EXISTS public.share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,  -- NULL = ganzes Projekt

    -- Access Token
    token TEXT UNIQUE NOT NULL,

    -- Security
    password_hash TEXT,
    expires_at TIMESTAMPTZ,

    -- Stats
    view_count INTEGER DEFAULT 0,

    -- Settings
    allow_comments BOOLEAN DEFAULT true,

    -- Creator
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for share_links
CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_site ON public.share_links(site_id);

-- RLS for share_links
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view share links of their organization's sites"
ON public.share_links FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = share_links.site_id
        AND p.id = auth.uid()
    )
);

CREATE POLICY "Users can create share links for their organization's sites"
ON public.share_links FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = share_links.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

CREATE POLICY "Users can delete share links from their organization's sites"
ON public.share_links FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = share_links.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
);

-- ============================================
-- 5. SHARE COMMENTS (Anmerkungen auf Preview)
-- ============================================
CREATE TABLE IF NOT EXISTS public.share_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_link_id UUID NOT NULL REFERENCES public.share_links(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE,

    -- Author (nicht-authentifiziert)
    author_name TEXT NOT NULL,
    author_email TEXT,

    -- Content
    content TEXT NOT NULL,

    -- Position (Pin auf Seite)
    position_x FLOAT NOT NULL,
    position_y FLOAT NOT NULL,

    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for share_comments
CREATE INDEX IF NOT EXISTS idx_share_comments_link ON public.share_comments(share_link_id);
CREATE INDEX IF NOT EXISTS idx_share_comments_page ON public.share_comments(page_id);

-- RLS for share_comments
ALTER TABLE public.share_comments ENABLE ROW LEVEL SECURITY;

-- Public kann Kommentare lesen (über Share-Link)
CREATE POLICY "Anyone can read comments for valid share links"
ON public.share_comments FOR SELECT
USING (true);

-- Public kann Kommentare erstellen
CREATE POLICY "Anyone can create comments on share links"
ON public.share_comments FOR INSERT
WITH CHECK (true);

-- Nur authentifizierte User können Status ändern
CREATE POLICY "Users can update comments on their organization's share links"
ON public.share_comments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.share_links sl
        JOIN public.sites s ON s.id = sl.site_id
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE sl.id = share_comments.share_link_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin', 'editor')
    )
);

-- ============================================
-- 6. TEMPLATE CATEGORIES (Template-Kategorien)
-- ============================================
CREATE TABLE IF NOT EXISTS public.template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,  -- NULL = global

    -- Info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    icon TEXT,  -- Lucide icon name

    -- Order
    sort_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: slug must be unique per site (or globally if site_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_categories_unique
ON public.template_categories(COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- RLS for template_categories
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template categories"
ON public.template_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage template categories"
ON public.template_categories FOR ALL
USING (
    site_id IS NULL OR EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = template_categories.site_id
        AND p.id = auth.uid()
        AND p.role IN ('owner', 'admin')
    )
);

-- ============================================
-- 7. ERWEITERE TEMPLATES TABELLE
-- ============================================
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- ============================================
-- 8. DEFAULT TEMPLATE CATEGORIES (Vordefiniert)
-- ============================================
INSERT INTO public.template_categories (site_id, name, slug, icon, sort_order)
VALUES
    (NULL, 'Hero', 'hero', 'Sparkles', 1),
    (NULL, 'Features', 'features', 'Grid3X3', 2),
    (NULL, 'Pricing', 'pricing', 'CreditCard', 3),
    (NULL, 'Testimonials', 'testimonials', 'MessageSquare', 4),
    (NULL, 'FAQ', 'faq', 'HelpCircle', 5),
    (NULL, 'CTA', 'cta', 'ArrowRight', 6),
    (NULL, 'Team', 'team', 'Users', 7),
    (NULL, 'Gallery', 'gallery', 'Image', 8),
    (NULL, 'Contact', 'contact', 'Mail', 9),
    (NULL, 'Stats', 'stats', 'BarChart', 10),
    (NULL, 'Footer', 'footer', 'PanelBottom', 11),
    (NULL, 'Header', 'header', 'PanelTop', 12)
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Function to get form submission stats
CREATE OR REPLACE FUNCTION get_form_stats(p_form_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total', COUNT(*),
        'unread', COUNT(*) FILTER (WHERE NOT is_read),
        'spam', COUNT(*) FILTER (WHERE is_spam),
        'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
        'this_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'this_month', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
    ) INTO result
    FROM public.form_submissions
    WHERE form_id = p_form_id;

    RETURN result;
END;
$$;

-- Function to increment share link view count
CREATE OR REPLACE FUNCTION increment_share_view(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.share_links
    SET view_count = view_count + 1
    WHERE token = p_token;
END;
$$;

-- Updated at trigger for site_images
CREATE OR REPLACE FUNCTION update_site_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_site_images_updated_at
    BEFORE UPDATE ON public.site_images
    FOR EACH ROW
    EXECUTE FUNCTION update_site_images_updated_at();
