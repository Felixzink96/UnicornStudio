// ============================================
// TEMPLATE RESOLVER
// Match templates to content based on conditions
// ============================================

import { createClient } from '@/lib/supabase/server'
import type { Template, TemplateType, TemplateCondition, Entry, ContentType } from '@/types/cms'

export interface ResolvedTemplate {
  template: Template
  type: TemplateType
  contentType?: ContentType
}

/**
 * Find the best matching template for a given route
 */
export async function resolveTemplate(
  siteId: string,
  slug: string
): Promise<{
  template: Template | null
  type: 'page' | 'archive' | 'single'
  contentType?: ContentType
  entry?: Entry
  entries?: Entry[]
  pagination?: {
    current: number
    total: number
    perPage: number
    prev: string | null
    next: string | null
  }
} | null> {
  const supabase = await createClient()

  // First, check if this is a static page
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (page) {
    // Find page template
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('site_id', siteId)
      .eq('type', 'page')
      .eq('is_default', true)
      .single()

    return {
      template: template as unknown as Template | null,
      type: 'page',
    }
  }

  // Check if this is a content type archive
  const { data: contentType } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .eq('has_archive', true)
    .single()

  if (contentType) {
    // Find archive template for this content type
    let template = await findMatchingTemplate(
      supabase,
      siteId,
      'archive',
      contentType.id
    )

    // Get entries for archive
    const { data: entries, count } = await supabase
      .from('entries')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .eq('content_type_id', contentType.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12)

    return {
      template: template as unknown as Template | null,
      type: 'archive',
      contentType: contentType as unknown as ContentType,
      entries: (entries || []) as unknown as Entry[],
      pagination: count ? {
        current: 1,
        total: Math.ceil(count / 12),
        perPage: 12,
        prev: null,
        next: count > 12 ? `/${slug}?page=2` : null,
      } : undefined,
    }
  }

  // Check if this is a single entry (format: /{content_type}/{entry_slug})
  const slugParts = slug.split('/')
  if (slugParts.length === 2) {
    const [ctSlug, entrySlug] = slugParts

    const { data: ct } = await supabase
      .from('content_types')
      .select('*')
      .eq('site_id', siteId)
      .eq('slug', ctSlug)
      .eq('has_single', true)
      .single()

    if (ct) {
      const { data: entry } = await supabase
        .from('entries')
        .select('*')
        .eq('site_id', siteId)
        .eq('content_type_id', ct.id)
        .eq('slug', entrySlug)
        .eq('status', 'published')
        .single()

      if (entry) {
        // Find single template for this content type
        let template = await findMatchingTemplate(
          supabase,
          siteId,
          'single',
          ct.id
        )

        return {
          template: template as unknown as Template | null,
          type: 'single',
          contentType: ct as unknown as ContentType,
          entry: entry as unknown as Entry,
        }
      }
    }
  }

  return null
}

/**
 * Find matching template based on conditions
 */
async function findMatchingTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  siteId: string,
  type: TemplateType,
  contentTypeId: string
): Promise<Template | null> {
  // First try to find template with matching content type condition
  const { data: templates } = await supabase
    .from('templates')
    .select('*')
    .eq('site_id', siteId)
    .eq('type', type)
    .order('priority', { ascending: false })
    .order('is_default', { ascending: false })

  if (!templates || templates.length === 0) {
    return null
  }

  // Score and rank templates
  for (const template of templates) {
    const conditions = template.conditions as TemplateCondition[] | null

    if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
      // Template with no conditions - use as fallback
      continue
    }

    // Check if all conditions match
    const allMatch = conditions.every((condition) => {
      if (condition.field === 'content_type_id' || condition.field === 'content_type') {
        return String(condition.value) === contentTypeId
      }
      return false
    })

    if (allMatch) {
      return template as unknown as Template
    }
  }

  // Return default template if no specific match
  const defaultTemplate = templates.find((t) => t.is_default)
  return (defaultTemplate || templates[0] || null) as unknown as Template | null
}

/**
 * Get related entries for a single template
 */
export async function getRelatedEntries(
  siteId: string,
  contentTypeId: string,
  currentEntryId: string,
  limit = 3
): Promise<Entry[]> {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('site_id', siteId)
    .eq('content_type_id', contentTypeId)
    .eq('status', 'published')
    .neq('id', currentEntryId)
    .order('published_at', { ascending: false })
    .limit(limit)

  return (entries || []) as unknown as Entry[]
}

/**
 * Get archive entries with pagination
 */
export async function getArchiveEntries(
  siteId: string,
  contentTypeId: string,
  page = 1,
  perPage = 12
): Promise<{
  entries: Entry[]
  pagination: {
    current: number
    total: number
    perPage: number
    hasMore: boolean
  }
}> {
  const supabase = await createClient()

  const offset = (page - 1) * perPage

  const { data: entries, count } = await supabase
    .from('entries')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .eq('content_type_id', contentTypeId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / perPage)

  return {
    entries: (entries || []) as unknown as Entry[],
    pagination: {
      current: page,
      total: totalPages,
      perPage,
      hasMore: page < totalPages,
    },
  }
}
