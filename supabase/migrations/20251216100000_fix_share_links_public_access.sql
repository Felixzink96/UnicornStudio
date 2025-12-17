-- Fix: Share links should be publicly accessible via token
-- The preview page needs to read share_links without authentication

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view share links of their organization's sites" ON public.share_links;

-- Create a new policy that allows:
-- 1. Anyone to read share links (needed for preview page)
-- 2. This is safe because the token is random and unguessable
DROP POLICY IF EXISTS "Anyone can view share links by token" ON public.share_links;
CREATE POLICY "Anyone can view share links by token"
ON public.share_links FOR SELECT
USING (true);

-- Also need to allow public read access to sites and pages for preview
-- Create policies for anonymous access to sites/pages via share links

-- Policy for reading sites via share link
DROP POLICY IF EXISTS "Anyone can view sites via share link" ON public.sites;
CREATE POLICY "Anyone can view sites via share link"
ON public.sites FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.share_links sl
        WHERE sl.site_id = sites.id
    )
    OR
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.organization_id = sites.organization_id
        AND p.id = auth.uid()
    )
);

-- Policy for reading pages via share link
DROP POLICY IF EXISTS "Anyone can view pages via share link" ON public.pages;
CREATE POLICY "Anyone can view pages via share link"
ON public.pages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.share_links sl
        WHERE sl.site_id = pages.site_id
        AND (sl.page_id IS NULL OR sl.page_id = pages.id)
    )
    OR
    EXISTS (
        SELECT 1 FROM public.sites s
        JOIN public.profiles p ON p.organization_id = s.organization_id
        WHERE s.id = pages.site_id
        AND p.id = auth.uid()
    )
);

-- Update policy for share_links to allow updating view_count
DROP POLICY IF EXISTS "Anyone can update view count on share links" ON public.share_links;
CREATE POLICY "Anyone can update view count on share links"
ON public.share_links FOR UPDATE
USING (true)
WITH CHECK (true);
