import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type {
  Template,
  TemplateInsert,
  TemplateType,
} from '@/types/cms'

// Type for template conditions
interface TemplateConditions {
  content_type_id?: string
  taxonomy_id?: string
  slugs?: string[]
}

// ============================================
// TEMPLATES QUERIES
// ============================================

/**
 * Get all templates for a site
 */
export async function getTemplates(siteId: string): Promise<Template[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('site_id', siteId)
    .order('type', { ascending: true })
    .order('priority', { ascending: false })

  if (error) throw error
  return data as Template[]
}

/**
 * Get templates by type
 */
export async function getTemplatesByType(
  siteId: string,
  type: TemplateType
): Promise<Template[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('site_id', siteId)
    .eq('type', type)
    .order('priority', { ascending: false })

  if (error) throw error
  return data as Template[]
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<Template> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Template
}

/**
 * Get the default template for a type
 */
export async function getDefaultTemplate(
  siteId: string,
  type: TemplateType
): Promise<Template | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('site_id', siteId)
    .eq('type', type)
    .eq('is_default', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Template | null
}

/**
 * Get the best matching template for a content type
 */
export async function getMatchingTemplate(
  siteId: string,
  type: TemplateType,
  contentTypeId?: string,
  taxonomyId?: string,
  slug?: string
): Promise<Template | null> {
  const templates = await getTemplatesByType(siteId, type)

  // Find the best match
  for (const template of templates) {
    const conditions = (template.conditions || {}) as TemplateConditions

    // Check content type match
    if (conditions.content_type_id && contentTypeId) {
      if (conditions.content_type_id === contentTypeId) {
        // Check slug match if specified
        if (conditions.slugs && slug) {
          if (conditions.slugs.includes(slug)) {
            return template
          }
        } else if (!conditions.slugs) {
          return template
        }
      }
      continue
    }

    // Check taxonomy match
    if (conditions.taxonomy_id && taxonomyId) {
      if (conditions.taxonomy_id === taxonomyId) {
        return template
      }
      continue
    }

    // Default template (no specific conditions)
    if (!conditions.content_type_id && !conditions.taxonomy_id && !conditions.slugs) {
      if (template.is_default) {
        return template
      }
    }
  }

  // Return any default template as fallback
  return templates.find((t) => t.is_default) || templates[0] || null
}

/**
 * Create a new template
 */
export async function createTemplate(
  template: TemplateInsert
): Promise<Template> {
  const supabase = createClient()

  // If this is set as default, unset other defaults of same type
  if (template.is_default) {
    await supabase
      .from('templates')
      .update({ is_default: false })
      .eq('site_id', template.site_id)
      .eq('type', template.type)
  }

  const { data, error } = await supabase
    .from('templates')
    .insert(template as unknown as Database['public']['Tables']['templates']['Insert'])
    .select()
    .single()

  if (error) throw error
  return data as Template
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  updates: Partial<TemplateInsert>
): Promise<Template> {
  const supabase = createClient()

  // Get current template for site_id and type
  if (updates.is_default) {
    const { data: current } = await supabase
      .from('templates')
      .select('site_id, type')
      .eq('id', id)
      .single()

    if (current) {
      await supabase
        .from('templates')
        .update({ is_default: false })
        .eq('site_id', current.site_id)
        .eq('type', current.type)
        .neq('id', id)
    }
  }

  const { data, error } = await supabase
    .from('templates')
    .update(updates as unknown as Database['public']['Tables']['templates']['Update'])
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Template
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('templates').delete().eq('id', id)

  if (error) throw error
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(
  id: string,
  newName?: string
): Promise<Template> {
  const supabase = createClient()

  // Get the original template
  const { data: original, error: getError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Create the duplicate
  const { id: _id, created_at, updated_at, ...templateData } = original
  const { data, error } = await supabase
    .from('templates')
    .insert({
      ...templateData,
      name: newName || `${original.name} (Kopie)`,
      is_default: false,
    } as unknown as Database['public']['Tables']['templates']['Insert'])
    .select()
    .single()

  if (error) throw error
  return data as Template
}

/**
 * Set a template as the default for its type
 */
export async function setDefaultTemplate(id: string): Promise<void> {
  const supabase = createClient()

  // Get template info
  const { data: template, error: getError } = await supabase
    .from('templates')
    .select('site_id, type')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Unset other defaults
  const { error: updateError } = await supabase
    .from('templates')
    .update({ is_default: false })
    .eq('site_id', template.site_id)
    .eq('type', template.type)

  if (updateError) throw updateError

  // Set this one as default
  const { error } = await supabase
    .from('templates')
    .update({ is_default: true })
    .eq('id', id)

  if (error) throw error
}
