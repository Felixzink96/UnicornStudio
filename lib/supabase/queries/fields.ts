import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { Field, FieldInsert } from '@/types/cms'

// ============================================
// FIELDS QUERIES
// ============================================

/**
 * Get all fields for a content type (ordered by position)
 */
export async function getFields(contentTypeId: string): Promise<Field[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('content_type_id', contentTypeId)
    .order('position', { ascending: true })

  if (error) throw error
  return data as Field[]
}

/**
 * Get a single field by ID
 */
export async function getField(id: string): Promise<Field> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Field
}

/**
 * Get a field by name within a content type
 */
export async function getFieldByName(
  contentTypeId: string,
  name: string
): Promise<Field | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('content_type_id', contentTypeId)
    .eq('name', name)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Field | null
}

/**
 * Create a new field
 */
export async function createField(field: FieldInsert): Promise<Field> {
  const supabase = createClient()

  // Get the next position
  const { data: existingFields } = await supabase
    .from('fields')
    .select('position')
    .eq('content_type_id', field.content_type_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingFields && existingFields.length > 0
    ? (existingFields[0].position || 0) + 1
    : 0

  const { data, error } = await supabase
    .from('fields')
    .insert({
      ...field,
      position: field.position ?? nextPosition,
    } as unknown as Database['public']['Tables']['fields']['Insert'])
    .select()
    .single()

  if (error) throw error
  return data as Field
}

/**
 * Create multiple fields at once
 */
export async function createFields(fields: FieldInsert[]): Promise<Field[]> {
  const supabase = createClient()

  // Assign positions if not provided
  const fieldsWithPositions = fields.map((field, index) => ({
    ...field,
    position: field.position ?? index,
  }))

  const { data, error } = await supabase
    .from('fields')
    .insert(fieldsWithPositions as unknown as Database['public']['Tables']['fields']['Insert'][])
    .select()

  if (error) throw error
  return data as Field[]
}

/**
 * Update a field
 */
export async function updateField(
  id: string,
  updates: Partial<FieldInsert>
): Promise<Field> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fields')
    .update(updates as unknown as Database['public']['Tables']['fields']['Update'])
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Field
}

/**
 * Delete a field
 */
export async function deleteField(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('fields').delete().eq('id', id)

  if (error) throw error
}

/**
 * Delete multiple fields
 */
export async function deleteFields(ids: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('fields').delete().in('id', ids)

  if (error) throw error
}

/**
 * Reorder fields within a content type
 */
export async function reorderFields(
  contentTypeId: string,
  fieldOrder: string[]
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reorder_fields', {
    target_content_type_id: contentTypeId,
    field_order: fieldOrder,
  })

  if (error) throw error
}

/**
 * Duplicate a field
 */
export async function duplicateField(
  id: string,
  newName?: string
): Promise<Field> {
  const supabase = createClient()

  // Get the original field
  const { data: original, error: getError } = await supabase
    .from('fields')
    .select('*')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Get the next position
  const { data: existingFields } = await supabase
    .from('fields')
    .select('position')
    .eq('content_type_id', original.content_type_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingFields && existingFields.length > 0
    ? (existingFields[0].position || 0) + 1
    : 0

  // Create the duplicate
  const { id: _id, created_at, updated_at, ...fieldData } = original
  const { data, error } = await supabase
    .from('fields')
    .insert({
      ...fieldData,
      name: newName || `${original.name}_copy`,
      label: `${original.label} (Kopie)`,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) throw error
  return data as Field
}

/**
 * Check if a field name is unique within a content type
 */
export async function isFieldNameUnique(
  contentTypeId: string,
  name: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient()
  let query = supabase
    .from('fields')
    .select('id')
    .eq('content_type_id', contentTypeId)
    .eq('name', name)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return data.length === 0
}

/**
 * Get all fields for a site (across all content types)
 */
export async function getAllSiteFields(siteId: string): Promise<Field[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('fields')
    .select('*')
    .eq('site_id', siteId)
    .order('position', { ascending: true })

  if (error) throw error
  return data as Field[]
}
