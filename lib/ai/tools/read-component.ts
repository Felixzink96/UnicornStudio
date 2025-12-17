import { createClient } from '@/lib/supabase/server'

export interface ComponentData {
  id: string
  name: string
  html: string
  css: string | null
  js: string | null
  position: 'header' | 'footer'
}

/**
 * AI Tool: Read a global component (header/footer)
 */
export async function readComponent(componentId: string): Promise<ComponentData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('components')
    .select('id, name, html, css, js, position')
    .eq('id', componentId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
    html: data.html || '',
    css: data.css,
    js: data.js,
    position: data.position as 'header' | 'footer',
  }
}

/**
 * AI Tool: Get global header and footer for a site
 */
export async function getGlobalComponents(siteId: string): Promise<{
  header: ComponentData | null
  footer: ComponentData | null
}> {
  const supabase = await createClient()

  // Get site with component IDs
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('global_header_id, global_footer_id')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    return { header: null, footer: null }
  }

  let header: ComponentData | null = null
  let footer: ComponentData | null = null

  // Load header
  if (site.global_header_id) {
    header = await readComponent(site.global_header_id)
  }

  // Load footer
  if (site.global_footer_id) {
    footer = await readComponent(site.global_footer_id)
  }

  return { header, footer }
}

/**
 * AI Tool: List all components for a site
 */
export async function listComponents(siteId: string): Promise<Array<{
  id: string
  name: string
  position: string | null
}>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('components')
    .select('id, name, position')
    .eq('site_id', siteId)

  if (error || !data) {
    return []
  }

  return data.map(c => ({
    id: c.id,
    name: c.name,
    position: c.position,
  }))
}
