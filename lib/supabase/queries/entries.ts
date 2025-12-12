import { createClient } from '@/lib/supabase/client'
import type {
  Entry,
  EntryInsert,
  EntryWithRelations,
  EntryStatus,
} from '@/types/cms'

// ============================================
// ENTRIES QUERIES
// ============================================

export interface GetEntriesOptions {
  contentTypeId: string
  status?: EntryStatus | EntryStatus[]
  search?: string
  termIds?: string[]
  authorId?: string
  limit?: number
  offset?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Get entries with filtering, pagination and sorting
 */
export async function getEntries(options: GetEntriesOptions): Promise<{
  entries: EntryWithRelations[]
  total: number
}> {
  const {
    contentTypeId,
    status,
    search,
    termIds,
    authorId,
    limit = 20,
    offset = 0,
    sortField = 'created_at',
    sortOrder = 'desc',
  } = options

  const supabase = createClient()

  // Build query with relations
  let query = supabase
    .from('entries')
    .select(`
      *,
      content_type:content_types(*),
      author:profiles(id, full_name, avatar_url),
      featured_image:assets(id, file_url, alt_text)
    `, { count: 'exact' })
    .eq('content_type_id', contentTypeId)

  // Filter by status
  if (status) {
    if (Array.isArray(status)) {
      query = query.in('status', status)
    } else {
      query = query.eq('status', status)
    }
  }

  // Search in title
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  // Filter by author
  if (authorId) {
    query = query.eq('author_id', authorId)
  }

  // Sorting
  query = query.order(sortField, { ascending: sortOrder === 'asc' })

  // Pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) throw error

  // If filtering by terms, we need to do additional filtering
  let entries = data as EntryWithRelations[]

  if (termIds && termIds.length > 0) {
    // Get entry IDs that have the specified terms
    const { data: entryTerms } = await supabase
      .from('entry_terms')
      .select('entry_id')
      .in('term_id', termIds)

    if (entryTerms) {
      const entryIds = new Set(entryTerms.map((et) => et.entry_id))
      entries = entries.filter((e) => entryIds.has(e.id))
    }
  }

  // Load terms for entries
  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id)
    const { data: entryTermsData } = await supabase
      .from('entry_terms')
      .select(`
        entry_id,
        term:terms(*)
      `)
      .in('entry_id', entryIds)

    if (entryTermsData) {
      const termsMap = new Map<string, typeof entryTermsData[0]['term'][]>()
      for (const et of entryTermsData) {
        if (!termsMap.has(et.entry_id)) {
          termsMap.set(et.entry_id, [])
        }
        if (et.term) {
          termsMap.get(et.entry_id)!.push(et.term)
        }
      }

      entries = entries.map((entry) => ({
        ...entry,
        terms: termsMap.get(entry.id) || [],
      })) as unknown as EntryWithRelations[]
    }
  }

  return {
    entries,
    total: count || 0,
  }
}

/**
 * Get all entries for a site
 */
export async function getSiteEntries(siteId: string): Promise<Entry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Entry[]
}

/**
 * Get a single entry by ID with relations
 */
export async function getEntry(id: string): Promise<EntryWithRelations> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      content_type:content_types(*),
      author:profiles(id, full_name, avatar_url),
      featured_image:assets(id, file_url, alt_text)
    `)
    .eq('id', id)
    .single()

  if (error) throw error

  // Get terms
  const { data: entryTerms } = await supabase
    .from('entry_terms')
    .select(`
      term:terms(*)
    `)
    .eq('entry_id', id)

  const entry = data as EntryWithRelations
  entry.terms = (entryTerms?.map((et) => et.term).filter(Boolean) || []) as unknown as EntryWithRelations['terms']

  return entry
}

/**
 * Get an entry by slug within a content type
 */
export async function getEntryBySlug(
  siteId: string,
  contentTypeId: string,
  slug: string
): Promise<EntryWithRelations | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      content_type:content_types(*),
      author:profiles(id, full_name, avatar_url),
      featured_image:assets(id, file_url, alt_text)
    `)
    .eq('site_id', siteId)
    .eq('content_type_id', contentTypeId)
    .eq('slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null

  // Get terms
  const { data: entryTerms } = await supabase
    .from('entry_terms')
    .select(`
      term:terms(*)
    `)
    .eq('entry_id', data.id)

  const entry = data as EntryWithRelations
  entry.terms = (entryTerms?.map((et) => et.term).filter(Boolean) || []) as unknown as EntryWithRelations['terms']

  return entry
}

/**
 * Create a new entry
 */
export async function createEntry(entry: EntryInsert): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .insert(entry)
    .select()
    .single()

  if (error) throw error
  return data as Entry
}

/**
 * Update an entry
 */
export async function updateEntry(
  id: string,
  updates: Partial<EntryInsert>
): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Entry
}

/**
 * Delete an entry
 */
export async function deleteEntry(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('entries').delete().eq('id', id)

  if (error) throw error
}

/**
 * Delete multiple entries
 */
export async function deleteEntries(ids: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('entries').delete().in('id', ids)

  if (error) throw error
}

/**
 * Publish an entry
 */
export async function publishEntry(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('publish_entry', {
    target_entry_id: id,
  })

  if (error) throw error
}

/**
 * Unpublish an entry
 */
export async function unpublishEntry(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('unpublish_entry', {
    target_entry_id: id,
  })

  if (error) throw error
}

/**
 * Schedule an entry for publishing
 */
export async function scheduleEntry(
  id: string,
  scheduledAt: string
): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .update({
      status: 'scheduled',
      scheduled_at: scheduledAt,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Entry
}

/**
 * Archive an entry
 */
export async function archiveEntry(id: string): Promise<Entry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entries')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Entry
}

/**
 * Duplicate an entry
 */
export async function duplicateEntry(
  id: string,
  newSlug?: string
): Promise<Entry> {
  const supabase = createClient()

  // Get the original entry
  const { data: original, error: getError } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Create the duplicate
  const { id: _id, created_at, updated_at, published_at, scheduled_at, ...entryData } = original
  const { data, error } = await supabase
    .from('entries')
    .insert({
      ...entryData,
      title: `${original.title} (Kopie)`,
      slug: newSlug || `${original.slug}-copy-${Date.now()}`,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error

  // Copy entry terms
  const { data: terms } = await supabase
    .from('entry_terms')
    .select('term_id')
    .eq('entry_id', id)

  if (terms && terms.length > 0) {
    await supabase.from('entry_terms').insert(
      terms.map((t) => ({
        entry_id: data.id,
        term_id: t.term_id,
      }))
    )
  }

  return data as Entry
}

/**
 * Check if an entry slug is unique within a content type
 */
export async function isEntrySlugUnique(
  siteId: string,
  contentTypeId: string,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = createClient()
  let query = supabase
    .from('entries')
    .select('id')
    .eq('site_id', siteId)
    .eq('content_type_id', contentTypeId)
    .eq('slug', slug)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data, error } = await query

  if (error) throw error
  return data.length === 0
}

// ============================================
// ENTRY TERMS (Taxonomy Relations)
// ============================================

/**
 * Set terms for an entry (replaces existing)
 */
export async function setEntryTerms(
  entryId: string,
  termIds: string[]
): Promise<void> {
  const supabase = createClient()

  // Delete existing terms
  const { error: deleteError } = await supabase
    .from('entry_terms')
    .delete()
    .eq('entry_id', entryId)

  if (deleteError) throw deleteError

  // Insert new terms
  if (termIds.length > 0) {
    const { error: insertError } = await supabase
      .from('entry_terms')
      .insert(termIds.map((termId) => ({ entry_id: entryId, term_id: termId })))

    if (insertError) throw insertError
  }
}

/**
 * Add a term to an entry
 */
export async function addEntryTerm(
  entryId: string,
  termId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('entry_terms')
    .insert({ entry_id: entryId, term_id: termId })

  if (error && error.code !== '23505') throw error // Ignore duplicate key errors
}

/**
 * Remove a term from an entry
 */
export async function removeEntryTerm(
  entryId: string,
  termId: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('entry_terms')
    .delete()
    .eq('entry_id', entryId)
    .eq('term_id', termId)

  if (error) throw error
}

/**
 * Get all term IDs for an entry
 */
export async function getEntryTermIds(entryId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('entry_terms')
    .select('term_id')
    .eq('entry_id', entryId)

  if (error) throw error
  return data.map((et) => et.term_id)
}
