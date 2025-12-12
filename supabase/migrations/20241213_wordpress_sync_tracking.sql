-- ============================================
-- WORDPRESS SYNC TRACKING
-- Tracking für WordPress Push-Status
-- ============================================

-- Neue Spalte für letzten WordPress Push
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS last_pushed_to_wordpress_at timestamptz DEFAULT NULL;

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_sites_last_pushed_to_wordpress
ON public.sites(last_pushed_to_wordpress_at);

-- Kommentar zur Dokumentation
COMMENT ON COLUMN public.sites.last_pushed_to_wordpress_at IS
'Timestamp des letzten erfolgreichen WordPress Push. Wird mit updated_at verglichen für Change Detection.';
