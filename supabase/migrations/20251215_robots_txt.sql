-- ============================================
-- UNICORN STUDIO - ROBOTS.TXT FIELD
-- Migration: Add robots_txt field to sites
-- Date: 2024-12-14
-- ============================================

-- Add robots_txt column to sites
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS robots_txt TEXT;

-- Set default robots.txt template for existing sites
UPDATE public.sites
SET robots_txt = 'User-agent: *
Allow: /

# Sitemap will be automatically added by WordPress plugin'
WHERE robots_txt IS NULL;

-- Comment
COMMENT ON COLUMN public.sites.robots_txt IS 'Custom robots.txt content for the site';
