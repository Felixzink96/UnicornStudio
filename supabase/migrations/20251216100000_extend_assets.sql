-- ============================================
-- EXTEND ASSETS TABLE
-- Add WordPress sync fields and original filename
-- ============================================

-- Add missing columns to assets table
ALTER TABLE public.assets
ADD COLUMN IF NOT EXISTS original_filename TEXT,
ADD COLUMN IF NOT EXISTS wp_attachment_id INTEGER,
ADD COLUMN IF NOT EXISTS wp_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assets_updated_at ON public.assets;
CREATE TRIGGER trigger_assets_updated_at
    BEFORE UPDATE ON public.assets
    FOR EACH ROW
    EXECUTE FUNCTION update_assets_updated_at();
