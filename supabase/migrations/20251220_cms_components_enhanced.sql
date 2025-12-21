-- ============================================
-- CMS COMPONENTS ENHANCED
-- Add CSS, JS, slug, is_required, content_type_ids, ai_prompt
-- For consistent AI-generated content with interactive components
-- ============================================

-- Add new columns to cms_components
ALTER TABLE public.cms_components
  ADD COLUMN IF NOT EXISTS css TEXT,
  ADD COLUMN IF NOT EXISTS js TEXT,
  ADD COLUMN IF NOT EXISTS js_init TEXT DEFAULT 'domready' CHECK (js_init IN ('immediate', 'domready', 'scroll', 'interaction')),
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_type_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT;

-- Create unique index for slug per site (only for non-null slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_components_slug
  ON public.cms_components(site_id, slug)
  WHERE slug IS NOT NULL;

-- Create index for finding required components
CREATE INDEX IF NOT EXISTS idx_cms_components_required
  ON public.cms_components(site_id, is_required)
  WHERE is_required = true;

-- Create index for finding components by content type
CREATE INDEX IF NOT EXISTS idx_cms_components_content_types
  ON public.cms_components USING GIN (content_type_ids);

-- Function to get components for a specific content type (including global ones)
CREATE OR REPLACE FUNCTION public.get_components_for_content_type(
  target_site_id UUID,
  target_content_type_id UUID
)
RETURNS SETOF public.cms_components AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.cms_components
  WHERE site_id = target_site_id
    AND (
      -- Global components (no specific content types)
      content_type_ids = '{}'
      OR content_type_ids IS NULL
      -- Or components for this specific content type
      OR target_content_type_id = ANY(content_type_ids)
    )
  ORDER BY is_required DESC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get required components for a content type
CREATE OR REPLACE FUNCTION public.get_required_components(
  target_site_id UUID,
  target_content_type_id UUID
)
RETURNS SETOF public.cms_components AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.cms_components
  WHERE site_id = target_site_id
    AND is_required = true
    AND (
      content_type_ids = '{}'
      OR content_type_ids IS NULL
      OR target_content_type_id = ANY(content_type_ids)
    )
  ORDER BY name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on new columns
COMMENT ON COLUMN public.cms_components.css IS 'Separate CSS for this component, will be included in exported CSS';
COMMENT ON COLUMN public.cms_components.js IS 'JavaScript code for interactive functionality';
COMMENT ON COLUMN public.cms_components.js_init IS 'When to initialize JS: immediate, domready, scroll, or interaction';
COMMENT ON COLUMN public.cms_components.slug IS 'Unique identifier for AI reference, e.g. "toc", "accordion"';
COMMENT ON COLUMN public.cms_components.is_required IS 'If true, AI must include this component in every entry';
COMMENT ON COLUMN public.cms_components.content_type_ids IS 'Array of content type IDs this component is available for. Empty = all content types';
COMMENT ON COLUMN public.cms_components.ai_prompt IS 'Instructions for AI on when/how to use this component';
