import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'

export async function getOrganization() {
  const supabase = createClient()

  // First get the user's profile to find their organization
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Not authenticated')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError) throw profileError
  if (!profile.organization_id) throw new Error('No organization found')

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  if (error) throw error
  return data
}

export async function updateOrganization(
  id: string,
  updates: {
    name?: string
    logo_url?: string | null
    settings?: Json
  }
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}
