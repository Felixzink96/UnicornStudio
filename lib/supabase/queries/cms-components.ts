import { createClient } from '@/lib/supabase/client'
import type {
  CMSComponent,
  CMSComponentInsert,
  CMSComponentType,
} from '@/types/cms'

// ============================================
// CMS COMPONENTS QUERIES
// ============================================

export interface GetComponentsOptions {
  siteId: string
  type?: CMSComponentType
  category?: string
  search?: string
  limit?: number
  offset?: number
}

/**
 * Get components with filtering
 */
export async function getComponents(options: GetComponentsOptions): Promise<{
  components: CMSComponent[]
  total: number
}> {
  const {
    siteId,
    type,
    category,
    search,
    limit = 50,
    offset = 0,
  } = options

  const supabase = createClient()

  let query = supabase
    .from('cms_components')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)

  if (type) {
    query = query.eq('type', type)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  query = query
    .order('usage_count', { ascending: false })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  return {
    components: data as CMSComponent[],
    total: count || 0,
  }
}

/**
 * Get all components for a site (simple list)
 */
export async function getAllComponents(siteId: string): Promise<CMSComponent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .select('*')
    .eq('site_id', siteId)
    .order('name', { ascending: true })

  if (error) throw error
  return data as CMSComponent[]
}

/**
 * Get component categories for a site
 */
export async function getComponentCategories(siteId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .select('category')
    .eq('site_id', siteId)
    .not('category', 'is', null)

  if (error) throw error

  // Get unique categories
  const categories = [...new Set(data.map((c) => c.category).filter(Boolean))]
  return categories.sort() as string[]
}

/**
 * Get a single component by ID
 */
export async function getComponent(id: string): Promise<CMSComponent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as CMSComponent
}

/**
 * Get a component by name within a site
 */
export async function getComponentByName(
  siteId: string,
  name: string
): Promise<CMSComponent | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .select('*')
    .eq('site_id', siteId)
    .eq('name', name)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as CMSComponent | null
}

/**
 * Create a new component
 */
export async function createComponent(
  component: CMSComponentInsert
): Promise<CMSComponent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .insert(component)
    .select()
    .single()

  if (error) throw error
  return data as CMSComponent
}

/**
 * Update a component
 */
export async function updateComponent(
  id: string,
  updates: Partial<CMSComponentInsert>
): Promise<CMSComponent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cms_components')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as CMSComponent
}

/**
 * Delete a component
 */
export async function deleteComponent(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('cms_components')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Duplicate a component
 */
export async function duplicateComponent(
  id: string,
  newName?: string
): Promise<CMSComponent> {
  const supabase = createClient()

  // Get the original component
  const { data: original, error: getError } = await supabase
    .from('cms_components')
    .select('*')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Create the duplicate
  const { id: _id, created_at, updated_at, usage_count, ...componentData } = original
  const { data, error } = await supabase
    .from('cms_components')
    .insert({
      ...componentData,
      name: newName || `${original.name}-copy`,
      usage_count: 0,
    })
    .select()
    .single()

  if (error) throw error
  return data as CMSComponent
}

/**
 * Increment usage count for a component
 */
export async function incrementComponentUsage(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('increment_component_usage', {
    component_id: id,
  })

  // If RPC doesn't exist, do it manually
  if (error && error.code === '42883') {
    const { data: component } = await supabase
      .from('cms_components')
      .select('usage_count')
      .eq('id', id)
      .single()

    if (component) {
      await supabase
        .from('cms_components')
        .update({ usage_count: (component.usage_count || 0) + 1 })
        .eq('id', id)
    }
  } else if (error) {
    throw error
  }
}
