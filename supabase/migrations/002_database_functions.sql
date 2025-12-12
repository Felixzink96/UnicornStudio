-- ============================================
-- UNICORN STUDIO - DATABASE FUNCTIONS
-- ============================================

-- ============================================
-- 1. DUPLICATE PAGE (Seite kopieren)
-- ============================================
CREATE OR REPLACE FUNCTION public.duplicate_page(
  source_page_id uuid,
  new_name text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  new_page_id uuid;
  source_page pages%ROWTYPE;
BEGIN
  SELECT * INTO source_page FROM pages WHERE id = source_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found';
  END IF;

  new_page_id := gen_random_uuid();

  INSERT INTO pages (id, site_id, name, slug, content, settings, seo)
  VALUES (
    new_page_id,
    source_page.site_id,
    COALESCE(new_name, source_page.name || ' (Copy)'),
    source_page.slug || '-copy-' || floor(random() * 1000)::text,
    source_page.content,
    source_page.settings,
    source_page.seo
  );

  RETURN new_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. DUPLICATE SITE (Komplette Site kopieren)
-- ============================================
CREATE OR REPLACE FUNCTION public.duplicate_site(
  source_site_id uuid,
  new_name text,
  new_slug text
)
RETURNS uuid AS $$
DECLARE
  new_site_id uuid;
  source_site sites%ROWTYPE;
  page_record RECORD;
BEGIN
  SELECT * INTO source_site FROM sites WHERE id = source_site_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site not found';
  END IF;

  new_site_id := gen_random_uuid();

  INSERT INTO sites (id, organization_id, name, slug, settings, seo)
  VALUES (
    new_site_id,
    source_site.organization_id,
    new_name,
    new_slug,
    source_site.settings,
    source_site.seo
  );

  -- Alle Pages kopieren
  FOR page_record IN SELECT * FROM pages WHERE site_id = source_site_id
  LOOP
    INSERT INTO pages (site_id, name, slug, content, settings, seo, is_home)
    VALUES (
      new_site_id,
      page_record.name,
      page_record.slug,
      page_record.content,
      page_record.settings,
      page_record.seo,
      page_record.is_home
    );
  END LOOP;

  -- Alle Components kopieren
  INSERT INTO components (site_id, name, description, category, content)
  SELECT new_site_id, name, description, category, content
  FROM components WHERE site_id = source_site_id;

  RETURN new_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. GET SITE STATS (Statistiken)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_site_stats(target_site_id uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'pages_count', (SELECT COUNT(*) FROM pages WHERE site_id = target_site_id),
    'published_pages', (SELECT COUNT(*) FROM pages WHERE site_id = target_site_id AND is_published = true),
    'components_count', (SELECT COUNT(*) FROM components WHERE site_id = target_site_id),
    'assets_count', (SELECT COUNT(*) FROM assets WHERE site_id = target_site_id),
    'assets_size_bytes', (SELECT COALESCE(SUM(size_bytes), 0) FROM assets WHERE site_id = target_site_id),
    'form_submissions', (SELECT COUNT(*) FROM form_submissions WHERE site_id = target_site_id AND status = 'new'),
    'last_updated', (SELECT MAX(updated_at) FROM pages WHERE site_id = target_site_id)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. PUBLISH PAGE
-- ============================================
CREATE OR REPLACE FUNCTION public.publish_page(target_page_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE pages
  SET
    is_published = true,
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = target_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. UNPUBLISH PAGE
-- ============================================
CREATE OR REPLACE FUNCTION public.unpublish_page(target_page_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE pages
  SET
    is_published = false,
    updated_at = NOW()
  WHERE id = target_page_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. PUBLISH SITE (Alle Pages + Site Status)
-- ============================================
CREATE OR REPLACE FUNCTION public.publish_site(target_site_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE sites
  SET
    status = 'published',
    published_at = NOW(),
    updated_at = NOW()
  WHERE id = target_site_id;

  UPDATE pages
  SET
    is_published = true,
    published_at = NOW(),
    updated_at = NOW()
  WHERE site_id = target_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. UNPUBLISH SITE
-- ============================================
CREATE OR REPLACE FUNCTION public.unpublish_site(target_site_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE sites
  SET
    status = 'draft',
    updated_at = NOW()
  WHERE id = target_site_id;

  UPDATE pages
  SET
    is_published = false,
    updated_at = NOW()
  WHERE site_id = target_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. REORDER PAGES (Reihenfolge ändern)
-- ============================================
CREATE OR REPLACE FUNCTION public.reorder_pages(
  target_site_id uuid,
  page_order uuid[]
)
RETURNS void AS $$
DECLARE
  i integer := 0;
  page_id uuid;
BEGIN
  FOREACH page_id IN ARRAY page_order
  LOOP
    UPDATE pages
    SET sort_order = i
    WHERE id = page_id AND site_id = target_site_id;
    i := i + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. SET HOME PAGE
-- ============================================
CREATE OR REPLACE FUNCTION public.set_home_page(
  target_site_id uuid,
  target_page_id uuid
)
RETURNS void AS $$
BEGIN
  UPDATE pages
  SET is_home = false
  WHERE site_id = target_site_id;

  UPDATE pages
  SET
    is_home = true,
    slug = ''
  WHERE id = target_page_id AND site_id = target_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. DELETE SITE CASCADE (Site + alles löschen)
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_site_cascade(target_site_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM form_submissions WHERE site_id = target_site_id;
  DELETE FROM activity_log WHERE site_id = target_site_id;
  DELETE FROM assets WHERE site_id = target_site_id;
  DELETE FROM components WHERE site_id = target_site_id;
  DELETE FROM pages WHERE site_id = target_site_id;
  DELETE FROM sites WHERE id = target_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. LOG ACTIVITY (Aktivität loggen)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_activity(
  p_organization_id uuid,
  p_site_id uuid,
  p_page_id uuid,
  p_user_id uuid,
  p_action text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid AS $$
DECLARE
  new_id uuid;
BEGIN
  new_id := gen_random_uuid();

  INSERT INTO activity_log (id, organization_id, site_id, page_id, user_id, action, details)
  VALUES (new_id, p_organization_id, p_site_id, p_page_id, p_user_id, p_action, p_details);

  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. GET RECENT ACTIVITY
-- ============================================
CREATE OR REPLACE FUNCTION public.get_recent_activity(
  target_site_id uuid,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  action text,
  details jsonb,
  user_name text,
  user_avatar text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.action,
    a.details,
    p.full_name as user_name,
    p.avatar_url as user_avatar,
    a.created_at
  FROM activity_log a
  LEFT JOIN profiles p ON p.id = a.user_id
  WHERE a.site_id = target_site_id
  ORDER BY a.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. COUNT FORM SUBMISSIONS (Ungelesene)
-- ============================================
CREATE OR REPLACE FUNCTION public.count_unread_submissions(target_site_id uuid)
RETURNS integer AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM form_submissions
  WHERE site_id = target_site_id AND status = 'new';

  RETURN count_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. MARK SUBMISSIONS AS READ
-- ============================================
CREATE OR REPLACE FUNCTION public.mark_submissions_read(submission_ids uuid[])
RETURNS void AS $$
BEGIN
  UPDATE form_submissions
  SET status = 'read'
  WHERE id = ANY(submission_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ZUSÄTZLICHE SPALTE FÜR SORT ORDER
-- ============================================
ALTER TABLE pages ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_pages_sort ON pages(site_id, sort_order);

-- ============================================
-- GRANTS (RLS-kompatibel)
-- ============================================
GRANT EXECUTE ON FUNCTION public.duplicate_page TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_site TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_page TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_page TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_site TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_site TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_pages TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_home_page TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_site_cascade TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_unread_submissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_submissions_read TO authenticated;
