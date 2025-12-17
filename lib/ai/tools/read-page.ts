import { createClient } from '@/lib/supabase/server'

export interface PageData {
  id: string
  name: string
  slug: string
  html_content: string
  is_home: boolean
}

/**
 * AI Tool: Read a specific page's HTML content
 * Used by AI to access page content on-demand
 */
export async function readPage(siteId: string, pageSlug: string): Promise<PageData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pages')
    .select('id, name, slug, html_content, is_home')
    .eq('site_id', siteId)
    .eq('slug', pageSlug)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug || '',
    html_content: data.html_content as string || '',
    is_home: data.is_home || false,
  }
}

/**
 * AI Tool: List all pages for a site
 * Returns summary without full HTML (for efficiency)
 */
export async function listPages(siteId: string): Promise<Array<{
  id: string
  name: string
  slug: string
  is_home: boolean
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pages')
    .select('id, name, slug, is_home')
    .eq('site_id', siteId)
    .order('created_at')

  if (error || !data) {
    return []
  }

  return data.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug || '',
    is_home: p.is_home || false,
  }))
}
