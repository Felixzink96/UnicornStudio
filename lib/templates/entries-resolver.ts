// ============================================
// ENTRIES RESOLVER
// Resolves {{#entries:content_type}}...{{/entries}} placeholders
// Renders entries server-side for SEO-friendly output
// ============================================

import { createClient } from '@/lib/supabase/server'
import Handlebars from 'handlebars'
import { registerHelpers } from './helpers'

// Register helpers for entry template rendering
registerHelpers(Handlebars)

export interface EntryData {
  id: string
  title: string
  slug: string
  content?: string
  excerpt?: string
  featured_image?: string
  featured_image_alt?: string
  author?: string
  published_at?: string
  url: string
  data: Record<string, unknown>
}

export interface EntriesResolveResult {
  html: string
  entriesUsed: Array<{
    contentType: string
    count: number
  }>
}

/**
 * Pattern to match entries block placeholders
 * Matches: {{#entries:vorstellung limit=4 sort="datum:desc"}}...{{/entries}}
 */
const ENTRIES_BLOCK_PATTERN = /\{\{#entries:([a-z0-9_-]+)(?:\s+([^}]*))?\}\}([\s\S]*?)\{\{\/entries\}\}/gi

/**
 * Pattern to match simple entries placeholder (auto-generates output)
 * Matches: {{entries:vorstellung limit=4}}
 */
const ENTRIES_SIMPLE_PATTERN = /\{\{entries:([a-z0-9_-]+)(?:\s+([^}]*))?\}\}/gi

/**
 * Parse options from placeholder string
 * e.g., 'limit=4 sort="datum:desc" class="grid"' -> { limit: 4, sort: "datum:desc", class: "grid" }
 */
function parseOptions(optionsStr: string | undefined): Record<string, string | number> {
  const options: Record<string, string | number> = {}
  if (!optionsStr) return options

  // Match key=value or key="value" or key='value'
  const optionPattern = /(\w+)=(?:"([^"]*)"|'([^']*)'|(\S+))/g
  let match

  while ((match = optionPattern.exec(optionsStr)) !== null) {
    const key = match[1]
    const value = match[2] ?? match[3] ?? match[4]

    // Convert numeric values
    if (key === 'limit' || key === 'offset') {
      options[key] = parseInt(value, 10)
    } else {
      options[key] = value
    }
  }

  return options
}

/**
 * Fetch entries for a content type
 */
async function fetchEntries(
  siteId: string,
  contentTypeName: string,
  options: Record<string, string | number>
): Promise<EntryData[]> {
  const supabase = await createClient()

  // Get content type
  const { data: contentType } = await supabase
    .from('content_types')
    .select('id, slug')
    .eq('site_id', siteId)
    .or(`name.eq.${contentTypeName},slug.eq.${contentTypeName}`)
    .single()

  console.log('[EntriesResolver] Looking for content type:', contentTypeName, 'in site:', siteId)
  console.log('[EntriesResolver] Content type query result:', contentType)

  if (!contentType) {
    console.warn(`Content type "${contentTypeName}" not found`)
    return []
  }

  // Build query
  let query = supabase
    .from('entries')
    .select(`
      id,
      title,
      slug,
      content,
      excerpt,
      data,
      published_at,
      featured_image:assets!featured_image_id (
        file_url,
        alt_text
      ),
      author:profiles!author_id (
        full_name
      )
    `)
    .eq('site_id', siteId)
    .eq('content_type_id', contentType.id)
    .eq('status', 'published')

  // Apply sorting
  const sortOption = options.sort as string | undefined
  if (sortOption) {
    const [field, order] = sortOption.split(':')
    const ascending = order === 'asc'

    if (field.startsWith('data.')) {
      // Sort by custom field
      const dataField = field.replace('data.', '')
      query = query.order(`data->${dataField}`, { ascending })
    } else {
      query = query.order(field, { ascending })
    }
  } else {
    // Default sort by published_at desc
    query = query.order('published_at', { ascending: false })
  }

  // Apply limit
  const limit = (options.limit as number) || 10
  query = query.limit(limit)

  // Apply offset
  const offset = options.offset as number
  if (offset) {
    query = query.range(offset, offset + limit - 1)
  }

  const { data: entries, error } = await query

  console.log('[EntriesResolver] Raw entries query result:', entries?.length, 'entries')
  if (entries && entries.length > 0) {
    console.log('[EntriesResolver] First entry raw data:', JSON.stringify(entries[0].data).slice(0, 500))
  }

  if (error) {
    console.error('Error fetching entries:', error)
    return []
  }

  // Format entries
  return (entries || []).map(entry => {
    const featuredImage = entry.featured_image as { file_url?: string; alt_text?: string } | null
    const author = entry.author as { full_name?: string } | null

    return {
      id: entry.id,
      title: entry.title || '',
      slug: entry.slug || '',
      content: entry.content || '',
      excerpt: entry.excerpt || '',
      featured_image: featuredImage?.file_url || '',
      featured_image_alt: featuredImage?.alt_text || entry.title || '',
      author: author?.full_name || '',
      published_at: entry.published_at || '',
      url: `/${contentType.slug}/${entry.slug}`,
      data: (entry.data as Record<string, unknown>) || {},
    }
  })
}

/**
 * Generate default HTML for entries (when no template block is provided)
 */
function generateDefaultEntryHtml(entry: EntryData, options: Record<string, string | number>): string {
  const wrapperClass = options.class || 'entry-item'

  return `
    <article class="${wrapperClass}" data-entry-id="${entry.id}">
      ${entry.featured_image ? `
        <img src="${entry.featured_image}" alt="${entry.featured_image_alt}" class="entry-image">
      ` : ''}
      <h3 class="entry-title">${entry.title}</h3>
      ${entry.excerpt ? `<p class="entry-excerpt">${entry.excerpt}</p>` : ''}
      ${entry.published_at ? `<time class="entry-date">${new Date(entry.published_at).toLocaleDateString('de-DE')}</time>` : ''}
      <a href="${entry.url}" class="entry-link">Mehr lesen</a>
    </article>
  `.trim()
}

/**
 * Render entry template with Handlebars
 */
function renderEntryTemplate(template: string, entry: EntryData, index: number): string {
  try {
    // Create context with entry data and helpers
    const context = {
      ...entry,
      index,
      isFirst: index === 0,
      isLast: false, // Will be set by caller if needed
      isEven: index % 2 === 0,
      isOdd: index % 2 === 1,
    }

    console.log('[EntriesResolver] Rendering entry:', entry.title)
    console.log('[EntriesResolver] Entry data structure:', JSON.stringify(entry.data, null, 2).slice(0, 1000))

    const compiled = Handlebars.compile(template)
    const rendered = compiled(context)

    console.log('[EntriesResolver] Rendered HTML preview (first 300 chars):', rendered.slice(0, 300))

    return rendered
  } catch (error) {
    console.error('Error rendering entry template:', error)
    return `<!-- Error rendering entry ${entry.id} -->`
  }
}

/**
 * Resolve all entries placeholders in HTML
 */
export async function resolveEntriesInTemplate(
  html: string,
  siteId: string
): Promise<EntriesResolveResult> {
  const entriesUsed: Array<{ contentType: string; count: number }> = []
  let resultHtml = html

  // Reset regex lastIndex (important for global patterns)
  ENTRIES_BLOCK_PATTERN.lastIndex = 0
  ENTRIES_SIMPLE_PATTERN.lastIndex = 0

  // Process block patterns first: {{#entries:type}}...{{/entries}}
  const blockMatches = [...html.matchAll(ENTRIES_BLOCK_PATTERN)]

  console.log('[EntriesResolver] Block matches found:', blockMatches.length)
  console.log('[EntriesResolver] SiteId:', siteId)

  for (const match of blockMatches) {
    const [fullMatch, contentType, optionsStr, innerTemplate] = match
    const options = parseOptions(optionsStr)

    console.log('[EntriesResolver] Processing content type:', contentType)
    console.log('[EntriesResolver] Options:', options)

    const entries = await fetchEntries(siteId, contentType, options)
    console.log('[EntriesResolver] Entries found:', entries.length)
    if (entries.length > 0) {
      console.log('[EntriesResolver] First entry data keys:', Object.keys(entries[0].data || {}))
    }
    entriesUsed.push({ contentType, count: entries.length })

    if (entries.length === 0) {
      // No entries found - replace with empty or fallback
      const emptyMessage = options.empty as string || ''
      resultHtml = resultHtml.replace(fullMatch, emptyMessage ? `<p class="entries-empty">${emptyMessage}</p>` : '<!-- No entries found -->')
      continue
    }

    // Render each entry with the inner template
    const renderedEntries = entries.map((entry, index) => {
      const entryHtml = renderEntryTemplate(innerTemplate.trim(), entry, index)
      return `<!-- Entry: ${entry.slug} -->\n${entryHtml}\n<!-- /Entry -->`
    }).join('\n')

    // Wrap in container if wrapper option is set
    const wrapper = options.wrapper as string
    const wrapperClass = options.wrapperClass as string || 'entries-list'

    const finalHtml = wrapper
      ? `<${wrapper} class="${wrapperClass}">\n${renderedEntries}\n</${wrapper}>`
      : renderedEntries

    resultHtml = resultHtml.replace(fullMatch, finalHtml)
  }

  // Process simple patterns: {{entries:type limit=4}}
  const simpleMatches = [...resultHtml.matchAll(ENTRIES_SIMPLE_PATTERN)]

  for (const match of simpleMatches) {
    const [fullMatch, contentType, optionsStr] = match
    const options = parseOptions(optionsStr)

    const entries = await fetchEntries(siteId, contentType, options)
    entriesUsed.push({ contentType, count: entries.length })

    if (entries.length === 0) {
      resultHtml = resultHtml.replace(fullMatch, '<!-- No entries found -->')
      continue
    }

    // Generate default HTML for each entry
    const renderedEntries = entries.map(entry => generateDefaultEntryHtml(entry, options)).join('\n')

    // Wrap in container
    const wrapperClass = options.wrapperClass as string || 'entries-grid'
    const finalHtml = `<div class="${wrapperClass}">\n${renderedEntries}\n</div>`

    resultHtml = resultHtml.replace(fullMatch, finalHtml)
  }

  return {
    html: resultHtml,
    entriesUsed,
  }
}

/**
 * Check if HTML contains any entries placeholders
 */
export function hasEntriesPlaceholders(html: string): boolean {
  // Use includes() instead of regex.test() to avoid lastIndex issues with global flag
  return html.includes('{{#entries:') || html.includes('{{entries:')
}

/**
 * Extract content types used in entries placeholders
 */
export function extractEntriesContentTypes(html: string): string[] {
  const contentTypes = new Set<string>()

  // Reset regex lastIndex
  ENTRIES_BLOCK_PATTERN.lastIndex = 0
  ENTRIES_SIMPLE_PATTERN.lastIndex = 0

  let match
  while ((match = ENTRIES_BLOCK_PATTERN.exec(html)) !== null) {
    contentTypes.add(match[1].toLowerCase())
  }

  ENTRIES_BLOCK_PATTERN.lastIndex = 0

  while ((match = ENTRIES_SIMPLE_PATTERN.exec(html)) !== null) {
    contentTypes.add(match[1].toLowerCase())
  }

  ENTRIES_SIMPLE_PATTERN.lastIndex = 0

  return Array.from(contentTypes)
}
