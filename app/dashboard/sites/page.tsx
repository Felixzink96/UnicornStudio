import { createClient } from '@/lib/supabase/server'
import { SitesList } from './SitesList'

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

  // Get all sites for the organization
  const { data: sites } = await supabase
    .from('sites')
    .select('*')
    .eq('organization_id', profile!.organization_id!)
    .order('updated_at', { ascending: false })

  return (
    <SitesList
      sites={sites || []}
      organizationId={profile!.organization_id!}
    />
  )
}
