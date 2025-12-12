import { createClient } from '@/lib/supabase/client'
import type {
  Taxonomy,
  TaxonomyInsert,
  Term,
  TermInsert,
  TermWithChildren,
} from '@/types/cms'

// ============================================
// TAXONOMIES QUERIES
// ============================================

/**
 * Get all taxonomies for a site
 */
export async function getTaxonomies(siteId: string): Promise<Taxonomy[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .order('name', { ascending: true })

  if (error) throw error
  return data as Taxonomy[]
}

/**
 * Get taxonomies that are linked to a specific content type
 */
export async function getTaxonomiesForContentType(
  siteId: string,
  contentTypeId: string
): Promise<Taxonomy[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .contains('content_type_ids', [contentTypeId])
    .order('name', { ascending: true })

  if (error) throw error
  return data as Taxonomy[]
}

/**
 * Get a single taxonomy by ID
 */
export async function getTaxonomy(id: string): Promise<Taxonomy> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Taxonomy
}

/**
 * Get a taxonomy by slug within a site
 */
export async function getTaxonomyBySlug(
  siteId: string,
  slug: string
): Promise<Taxonomy | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Taxonomy | null
}

/**
 * Create a new taxonomy
 */
export async function createTaxonomy(
  taxonomy: TaxonomyInsert
): Promise<Taxonomy> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .insert(taxonomy)
    .select()
    .single()

  if (error) throw error
  return data as Taxonomy
}

/**
 * Update a taxonomy
 */
export async function updateTaxonomy(
  id: string,
  updates: Partial<TaxonomyInsert>
): Promise<Taxonomy> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('taxonomies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Taxonomy
}

/**
 * Delete a taxonomy (and all its terms)
 */
export async function deleteTaxonomy(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('taxonomies').delete().eq('id', id)

  if (error) throw error
}

/**
 * Link a taxonomy to a content type
 */
export async function linkTaxonomyToContentType(
  taxonomyId: string,
  contentTypeId: string
): Promise<void> {
  const supabase = createClient()

  // Get current content_type_ids
  const { data: taxonomy, error: getError } = await supabase
    .from('taxonomies')
    .select('content_type_ids')
    .eq('id', taxonomyId)
    .single()

  if (getError) throw getError

  const currentIds = taxonomy?.content_type_ids || []
  if (!currentIds.includes(contentTypeId)) {
    const { error } = await supabase
      .from('taxonomies')
      .update({ content_type_ids: [...currentIds, contentTypeId] })
      .eq('id', taxonomyId)

    if (error) throw error
  }
}

/**
 * Unlink a taxonomy from a content type
 */
export async function unlinkTaxonomyFromContentType(
  taxonomyId: string,
  contentTypeId: string
): Promise<void> {
  const supabase = createClient()

  // Get current content_type_ids
  const { data: taxonomy, error: getError } = await supabase
    .from('taxonomies')
    .select('content_type_ids')
    .eq('id', taxonomyId)
    .single()

  if (getError) throw getError

  const currentIds = taxonomy?.content_type_ids || []
  const newIds = currentIds.filter((id: string) => id !== contentTypeId)

  const { error } = await supabase
    .from('taxonomies')
    .update({ content_type_ids: newIds })
    .eq('id', taxonomyId)

  if (error) throw error
}

// ============================================
// TERMS QUERIES
// ============================================

/**
 * Get all terms for a taxonomy
 */
export async function getTerms(taxonomyId: string): Promise<Term[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('taxonomy_id', taxonomyId)
    .order('position', { ascending: true })

  if (error) throw error
  return data as Term[]
}

/**
 * Get terms as a hierarchical tree (for hierarchical taxonomies)
 */
export async function getTermsTree(
  taxonomyId: string
): Promise<TermWithChildren[]> {
  const terms = await getTerms(taxonomyId)

  // Build tree structure
  const termMap = new Map<string, TermWithChildren>()
  const roots: TermWithChildren[] = []

  // First pass: create map entries
  for (const term of terms) {
    termMap.set(term.id, { ...term, children: [] })
  }

  // Second pass: build tree
  for (const term of terms) {
    const node = termMap.get(term.id)!
    if (term.parent_id) {
      const parent = termMap.get(term.parent_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    } else {
      roots.push(node)
    }
  }

  return roots
}

/**
 * Get a single term by ID
 */
export async function getTerm(id: string): Promise<Term> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Term
}

/**
 * Get a term by slug within a taxonomy
 */
export async function getTermBySlug(
  taxonomyId: string,
  slug: string
): Promise<Term | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('taxonomy_id', taxonomyId)
    .eq('slug', slug)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as Term | null
}

/**
 * Create a new term
 */
export async function createTerm(term: TermInsert): Promise<Term> {
  const supabase = createClient()

  // Get the next position
  const { data: existingTerms } = await supabase
    .from('terms')
    .select('position')
    .eq('taxonomy_id', term.taxonomy_id)
    .eq('parent_id', term.parent_id || null)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existingTerms && existingTerms.length > 0
    ? (existingTerms[0].position || 0) + 1
    : 0

  const { data, error } = await supabase
    .from('terms')
    .insert({
      ...term,
      position: term.position ?? nextPosition,
    })
    .select()
    .single()

  if (error) throw error
  return data as Term
}

/**
 * Update a term
 */
export async function updateTerm(
  id: string,
  updates: Partial<TermInsert>
): Promise<Term> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('terms')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Term
}

/**
 * Delete a term (and reassign children to parent or root)
 */
export async function deleteTerm(id: string): Promise<void> {
  const supabase = createClient()

  // Get the term to find its parent
  const { data: term, error: getError } = await supabase
    .from('terms')
    .select('parent_id')
    .eq('id', id)
    .single()

  if (getError) throw getError

  // Reassign children to the term's parent
  const { error: updateError } = await supabase
    .from('terms')
    .update({ parent_id: term.parent_id })
    .eq('parent_id', id)

  if (updateError) throw updateError

  // Delete the term
  const { error } = await supabase.from('terms').delete().eq('id', id)

  if (error) throw error
}

/**
 * Reorder terms within a taxonomy (same parent level)
 */
export async function reorderTerms(
  taxonomyId: string,
  termOrder: string[],
  parentId?: string
): Promise<void> {
  const supabase = createClient()

  const updates = termOrder.map((id, index) =>
    supabase
      .from('terms')
      .update({ position: index })
      .eq('id', id)
      .eq('taxonomy_id', taxonomyId)
  )

  const results = await Promise.all(updates)
  const errors = results.filter((r) => r.error)

  if (errors.length > 0) {
    throw errors[0].error
  }
}

/**
 * Move a term to a new parent
 */
export async function moveTerm(
  id: string,
  newParentId: string | null
): Promise<Term> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('terms')
    .update({ parent_id: newParentId })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Term
}

/**
 * Get entries count for a term
 */
export async function getTermEntriesCount(termId: string): Promise<number> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('entry_terms')
    .select('*', { count: 'exact', head: true })
    .eq('term_id', termId)

  if (error) throw error
  return count || 0
}

/**
 * Search terms across taxonomies in a site
 */
export async function searchTerms(
  siteId: string,
  query: string,
  taxonomyId?: string
): Promise<Term[]> {
  const supabase = createClient()

  // First get taxonomy IDs for the site
  const { data: taxonomies, error: taxError } = await supabase
    .from('taxonomies')
    .select('id')
    .eq('site_id', siteId)

  if (taxError) throw taxError

  const taxonomyIds = taxonomyId
    ? [taxonomyId]
    : taxonomies.map((t) => t.id)

  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .in('taxonomy_id', taxonomyIds)
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(20)

  if (error) throw error
  return data as Term[]
}
