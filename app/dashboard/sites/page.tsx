import { createClient } from '@/lib/supabase/server'
import { SitesList } from './SitesList'
import type { SiteWithPreview } from '@/components/dashboard/SiteCard'

export default async function SitesPage() {
  const supabase = await createClient()

  // Get user's profile to get organization_id
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  // Get all sites for the organization (including integrations for WP status)
  const { data: sites } = await supabase
    .from('sites')
    .select('*, integrations')
    .eq('organization_id', profile!.organization_id!)
    .order('updated_at', { ascending: false })

  // Load ALL home pages in ONE query (statt N+1 Queries)
  const siteIds = (sites || []).map(s => s.id)
  const { data: homePages } = siteIds.length > 0
    ? await supabase
        .from('pages')
        .select('site_id, html_content')
        .in('site_id', siteIds)
        .eq('is_home', true)
    : { data: [] }

  // Map home pages by site_id for O(1) lookup
  const homePageMap = new Map(
    (homePages || []).map(p => [p.site_id, p.html_content])
  )

  // Combine sites with their home page HTML
  const sitesWithPreviews: SiteWithPreview[] = (sites || []).map((site) => ({
    ...site,
    integrations: site.integrations as SiteWithPreview['integrations'],
    homePageHtml: homePageMap.get(site.id) || null,
  }))

  return (
    <SitesList
      sites={sitesWithPreviews}
      organizationId={profile!.organization_id!}
    />
  )
}
