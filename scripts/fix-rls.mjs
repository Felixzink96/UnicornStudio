import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewlrsnkkgttjaofgunbo.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bHJzbmtrZ3R0amFvZmd1bmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTgwMSwiZXhwIjoyMDgxMDg3ODAxfQ.unEffe8PpQLjeDSmymOi_aQjs53UXpyyKdNAaSoUpto'
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bHJzbmtrZ3R0amFvZmd1bmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTE4MDEsImV4cCI6MjA4MTA4NzgwMX0.QkH4iL8MU2QnNs4Aw7cDrMxA4VDXMxXfMFJMvP6b8iY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const anonClient = createClient(supabaseUrl, anonKey)

async function testAccess() {
  // Get a share link first
  const { data: shareLink } = await supabase
    .from('share_links')
    .select('*')
    .limit(1)
    .single()

  console.log('Share link:', shareLink?.token, 'site_id:', shareLink?.site_id)

  // Test anon access to share_links
  console.log('\n1. Testing ANON access to share_links...')
  const { data: anonShareLink, error: e1 } = await anonClient
    .from('share_links')
    .select('*')
    .eq('token', shareLink?.token)
    .single()

  if (e1) console.log('❌ share_links:', e1.message)
  else console.log('✅ share_links: OK')

  // Test anon access to sites
  console.log('\n2. Testing ANON access to sites...')
  const { data: anonSite, error: e2 } = await anonClient
    .from('sites')
    .select('id, name')
    .eq('id', shareLink?.site_id)
    .single()

  if (e2) console.log('❌ sites:', e2.message)
  else console.log('✅ sites: OK -', anonSite?.name)

  // Test anon access to pages
  console.log('\n3. Testing ANON access to pages...')
  const { data: anonPages, error: e3 } = await anonClient
    .from('pages')
    .select('id, name')
    .eq('site_id', shareLink?.site_id)

  if (e3) console.log('❌ pages:', e3.message)
  else console.log('✅ pages: OK -', anonPages?.length, 'pages')

  // Summary
  console.log('\n--- REQUIRED SQL FIX ---')
  console.log('Run this in Supabase Dashboard SQL Editor:\n')

  console.log(`
-- Allow public access to sites via share link
DROP POLICY IF EXISTS "Anyone can view sites via share link" ON public.sites;
CREATE POLICY "Anyone can view sites via share link" ON public.sites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.share_links sl WHERE sl.site_id = sites.id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.organization_id = sites.organization_id
    AND p.id = auth.uid()
  )
);

-- Allow public access to pages via share link
DROP POLICY IF EXISTS "Anyone can view pages via share link" ON public.pages;
CREATE POLICY "Anyone can view pages via share link" ON public.pages FOR SELECT
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
  `)
}

testAccess()
