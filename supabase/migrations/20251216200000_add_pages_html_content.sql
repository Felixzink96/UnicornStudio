-- ============================================
-- ADD html_content TO PAGES TABLE
-- Viele API Routes referenzieren diese Spalte
-- ============================================

-- Add html_content column to pages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'pages'
        AND column_name = 'html_content'
    ) THEN
        ALTER TABLE public.pages ADD COLUMN html_content TEXT;
    END IF;
END $$;

-- Create index for faster full-text searches if needed
CREATE INDEX IF NOT EXISTS idx_pages_html_content
ON public.pages USING gin(to_tsvector('german', COALESCE(html_content, '')));

-- Notify completion
COMMENT ON COLUMN public.pages.html_content IS 'Rendered HTML content of the page for preview and export';
