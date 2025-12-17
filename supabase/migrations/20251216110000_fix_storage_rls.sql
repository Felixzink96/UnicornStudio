-- Fix Storage RLS policies for site-assets bucket
-- Allow uploads by authenticated users who have access to the site

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload to site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update site-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from site-assets" ON storage.objects;

-- Create more permissive upload policy
-- Users can upload to sites/{siteId}/* paths where they have access
CREATE POLICY "Authenticated users can upload to their sites"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'site-assets'
    AND (
        -- Allow uploads to site-specific paths
        (storage.foldername(name))[1] = 'sites'
        AND EXISTS (
            SELECT 1 FROM public.sites s
            JOIN public.profiles p ON p.organization_id = s.organization_id
            WHERE s.id::text = (storage.foldername(name))[2]
            AND p.id = auth.uid()
            AND p.role IN ('owner', 'admin', 'editor')
        )
    )
);

-- Create more permissive update policy
CREATE POLICY "Authenticated users can update their sites assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'site-assets'
    AND (
        (storage.foldername(name))[1] = 'sites'
        AND EXISTS (
            SELECT 1 FROM public.sites s
            JOIN public.profiles p ON p.organization_id = s.organization_id
            WHERE s.id::text = (storage.foldername(name))[2]
            AND p.id = auth.uid()
            AND p.role IN ('owner', 'admin', 'editor')
        )
    )
);

-- Create more permissive delete policy
CREATE POLICY "Authenticated users can delete their sites assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'site-assets'
    AND (
        (storage.foldername(name))[1] = 'sites'
        AND EXISTS (
            SELECT 1 FROM public.sites s
            JOIN public.profiles p ON p.organization_id = s.organization_id
            WHERE s.id::text = (storage.foldername(name))[2]
            AND p.id = auth.uid()
            AND p.role IN ('owner', 'admin', 'editor')
        )
    )
);
