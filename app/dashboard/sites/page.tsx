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

  // Load home page HTML for each site (for preview thumbnails)
  const sitesWithPreviews: SiteWithPreview[] = await Promise.all(
    (sites || []).map(async (site) => {
      const { data: homePage } = await supabase
        .from('pages')
        .select('html_content')
        .eq('site_id', site.id)
        .eq('is_home', true)
        .single()

      // Cast integrations from Json to expected type
      const integrations = site.integrations as SiteWithPreview['integrations']

      return {
        ...site,
        integrations,
        homePageHtml: homePage?.html_content || null,
      }
    })
  )

  return (
    <SitesList
      sites={sitesWithPreviews}
      organizationId={profile!.organization_id!}
    />
  )
}
