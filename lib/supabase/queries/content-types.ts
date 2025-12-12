import { createClient } from '@/lib/supabase/client'
import type {
  ContentType,
  ContentTypeInsert,
  ContentTypeUpdate,
} from '@/types/cms'

// ============================================
// CONTENT TYPES QUERIES
// ============================================

/**
 * Get all content types for a site
 */
export async function getContentTypes(siteId: string): Promise<ContentType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .order('menu_position', { ascending: true })

  if (error) throw error
  return data as ContentType[]
}

/**
 * Get content types that should appear in the menu
 */
export async function getMenuContentTypes(siteId: string): Promise<ContentType[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .eq('show_in_menu', true)
    .order('menu_position', { ascending: true })

  if (error) throw error
  return data as ContentType[]
}

/**
 * Get a single content type by ID
 */
export async function getContentType(id: string): Promise<ContentType> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as ContentType
}

/**
 * Get a content type by its slug within a site
 */
export async function getContentTypeBySlug(
  siteId: string,
  slug: string
): Promise<ContentType | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as ContentType | null
}

/**
 * Create a new content type
 */
export async function createContentType(
  contentType: ContentTypeInsert
): Promise<ContentType> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .insert(contentType)
    .select()
    .single()

  if (error) throw error
  return data as ContentType
}

/**
 * Update a content type
 */
export async function updateContentType(
  id: string,
  updates: Partial<ContentTypeInsert>
): Promise<ContentType> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('content_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as ContentType
}

/**
 * Delete a content type
 */
export async function deleteContentType(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('content_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Duplicate a content type with all its fields
 */
export async function duplicateContentType(
  id: string,
  newName: string,
  newSlug: string
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('duplicate_content_type', {
    source_content_type_id: id,
    new_name: newName,
    new_slug: newSlug,
  })

  if (error) throw error
  return data as string
}

/**
 * Get the count of entries for a content type
 */
export async function getContentTypeEntriesCount(
  contentTypeId: string
): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_entries_count', {
    target_content_type_id: contentTypeId,
  })

  if (error) throw error
  return data as number
}

/**
 * Reorder content types in the menu
 */
export async function reorderContentTypes(
  siteId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = createClient()

  // Update menu_position for each content type
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('content_types')
      .update({ menu_position: index })
      .eq('id', id)
      .eq('site_id', siteId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw errors[0].error
  }
}

/**
 * Check if a content type name is unique within a site
 */
export async function isContentTypeNameUnique(
  siteId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient()
  let query = supabase
    .from('content_types')
    .select('id')
    .eq('site_id', siteId)
    .eq('name', name)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return data.length === 0
}
