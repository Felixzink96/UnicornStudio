import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/types/database'

export async function getSites() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getSite(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createSite(site: {
  organization_id: string
  name: string
  slug: string
  description?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSite(id: string, updates: Partial<Site>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSite(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('sites').delete().eq('id', id)

  if (error) throw error
}
