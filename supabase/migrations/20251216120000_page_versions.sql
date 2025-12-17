-- Page Versions Table für Versionierung
-- Migration: 20251216120000_page_versions.sql

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.page_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  html_content text,
  content jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_summary text,
  UNIQUE(page_id, version_number)
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON public.page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_page_versions_created_at ON public.page_versions(created_at DESC);

-- Row Level Security aktivieren
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view versions of their pages" ON public.page_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.sites s ON p.site_id = s.id
      WHERE p.id = page_versions.page_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create versions of their pages" ON public.page_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.sites s ON p.site_id = s.id
      WHERE p.id = page_versions.page_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete versions of their pages" ON public.page_versions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.sites s ON p.site_id = s.id
      WHERE p.id = page_versions.page_id
      AND s.user_id = auth.uid()
    )
  );

-- Funktion zum automatischen Erstellen einer Version bei Page-Updates
CREATE OR REPLACE FUNCTION create_page_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version integer;
BEGIN
  -- Nächste Versionsnummer ermitteln
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.page_versions
  WHERE page_id = NEW.id;

  -- Nur Version erstellen wenn sich der Inhalt geändert hat
  IF OLD.html_content IS DISTINCT FROM NEW.html_content THEN
    INSERT INTO public.page_versions (page_id, version_number, html_content, content, created_by)
    VALUES (NEW.id, next_version, OLD.html_content, OLD.content, auth.uid());
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für automatische Versionierung
DROP TRIGGER IF EXISTS page_version_trigger ON public.pages;
CREATE TRIGGER page_version_trigger
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION create_page_version();

-- Funktion zum Wiederherstellen einer Version
CREATE OR REPLACE FUNCTION restore_page_version(p_page_id uuid, p_version_number integer)
RETURNS void AS $$
DECLARE
  v_html_content text;
  v_content jsonb;
BEGIN
  -- Version holen
  SELECT html_content, content INTO v_html_content, v_content
  FROM public.page_versions
  WHERE page_id = p_page_id AND version_number = p_version_number;

  IF v_html_content IS NULL THEN
    RAISE EXCEPTION 'Version nicht gefunden';
  END IF;

  -- Page aktualisieren (triggert automatisch neue Version der aktuellen Seite)
  UPDATE public.pages
  SET html_content = v_html_content,
      content = v_content,
      updated_at = now()
  WHERE id = p_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
