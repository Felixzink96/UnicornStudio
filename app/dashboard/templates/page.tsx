import { createClient } from '@/lib/supabase/server'
import { TemplatesList } from './TemplatesList'

export default async function TemplatesPage() {
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
    .select('id, name')
    .eq('organization_id', profile!.organization_id!)

  const siteIds = sites?.map((s) => s.id) || []

  // Get all templates across all sites in the organization
  const { data: templates } = await supabase
    .from('templates')
    .select('*, sites!inner(name, slug)')
    .in('site_id', siteIds)
    .order('updated_at', { ascending: false })

  return (
    <TemplatesList
      templates={templates || []}
      organizationId={profile!.organization_id!}
    />
  )
}
