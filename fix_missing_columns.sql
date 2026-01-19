-- Fix missing columns in sites table
-- Run this in Supabase Dashboard → SQL Editor

-- robots_txt column
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS robots_txt TEXT;

-- Site identity columns
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS logo_dark_url TEXT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Set default robots.txt for existing sites
UPDATE public.sites
SET robots_txt = 'User-agent: *
Allow: /

# Sitemap will be automatically added'
WHERE robots_txt IS NULL;

-- Comments
COMMENT ON COLUMN public.sites.robots_txt IS 'Custom robots.txt content';
COMMENT ON COLUMN public.sites.logo_dark_url IS 'Logo for dark backgrounds';
COMMENT ON COLUMN public.sites.favicon_url IS 'Favicon URL';
COMMENT ON COLUMN public.sites.tagline IS 'Site tagline/slogan';
COMMENT ON COLUMN public.sites.og_image_url IS 'Default Open Graph image';
