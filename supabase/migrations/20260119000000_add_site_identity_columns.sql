-- Add missing site identity columns
-- These columns are needed for the Site Identity settings page

ALTER TABLE sites ADD COLUMN IF NOT EXISTS logo_dark_url text;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS tagline text;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS og_image_url text;

-- Add comments for documentation
COMMENT ON COLUMN sites.logo_url IS 'Primary logo URL for light backgrounds';
COMMENT ON COLUMN sites.logo_dark_url IS 'Logo URL for dark backgrounds (dark mode)';
COMMENT ON COLUMN sites.favicon_url IS 'Favicon URL (recommended: 512x512 PNG or SVG)';
COMMENT ON COLUMN sites.tagline IS 'Site tagline/slogan for SEO';
COMMENT ON COLUMN sites.og_image_url IS 'Default Open Graph image for social sharing (1200x630)';
