import { createClient } from '@/lib/supabase/server'

/**
 * AI Tool: List all images/assets for a site
 */
export async function listImages(siteId: string): Promise<Array<{
  id: string
  name: string
  file_url: string
  alt_text: string | null
  width: number | null
  height: number | null
  folder: string
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('assets')
    .select('id, name, file_url, alt_text, width, height, folder')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map(img => ({
    id: img.id,
    name: img.name,
    file_url: img.file_url,
    alt_text: img.alt_text,
    width: img.width,
    height: img.height,
    folder: img.folder || '/',
  }))
}

/**
 * AI Tool: List all templates for a site
 */
export async function listTemplates(siteId: string): Promise<Array<{
  id: string
  name: string
  category: string | null
  description: string | null
}>> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('templates')
    .select('id, name, category, description')
    .eq('site_id', siteId)

  if (error || !data) {
    return []
  }

  return data.map((t: { id: string; name: string; category?: string; description?: string }) => ({
    id: t.id,
    name: t.name,
    category: t.category || null,
    description: t.description || null,
  }))
}

/**
 * AI Tool: List all menus for a site
 */
export async function listMenus(siteId: string): Promise<Array<{
  id: string
  name: string
  slug: string
  position: string
  item_count: number
}>> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('menus')
    .select(`
      id,
      name,
      slug,
      position,
      menu_items (id)
    `)
    .eq('site_id', siteId)

  if (error || !data) {
    return []
  }

  return data.map((m: { id: string; name: string; slug: string; position: string; menu_items: { id: string }[] }) => ({
    id: m.id,
    name: m.name,
    slug: m.slug,
    position: m.position,
    item_count: m.menu_items?.length || 0,
  }))
}

/**
 * AI Tool: Get design variables for a site
 */
export async function getDesignVariables(siteId: string): Promise<{
  colors: {
    brand: { primary?: string; secondary?: string; accent?: string }
    neutral: Record<string, string>
  }
  typography: {
    fontHeading?: string
    fontBody?: string
    fontMono?: string
  }
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('design_variables')
    .select('*')
    .eq('site_id', siteId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    colors: (data as any).colors || {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typography: (data as any).typography || {},
  }
}

/**
 * AI Tool: Get form submissions summary
 */
export async function getFormSubmissions(
  siteId: string,
  formId?: string,
  limit = 10
): Promise<Array<{
  id: string
  form_name: string
  data: Record<string, unknown>
  created_at: string
  is_read: boolean
}>> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('form_submissions')
    .select(`
      id,
      data,
      created_at,
      is_read,
      components:form_id (name)
    `)
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (formId) {
    query = query.eq('form_id', formId)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((s: any) => ({
    id: s.id,
    form_name: s.components?.name || 'Unbekannt',
    data: s.data || {},
    created_at: s.created_at,
    is_read: s.is_read || false,
  }))
}
