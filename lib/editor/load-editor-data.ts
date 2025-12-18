/**
 * Server-side data loader for the editor
 * Used for WordPress iframe embedding where client-side Supabase auth isn't available
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service client that bypasses RLS
function getServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface EditorInitialData {
  site: {
    id: string
    name: string
    settings: Record<string, unknown> | null
    global_header_id: string | null
    global_footer_id: string | null
  } | null
  page: {
    id: string
    name: string
    slug: string | null
    html_content: string | null
    is_home: boolean | null
  } | null
  pages: Array<{
    id: string
    name: string
    slug: string | null
    html_content: string | null
    is_home: boolean | null
  }>
  chatHistory: Array<{
    id: string
    role: string
    content: string
    generated_html: string | null
    model: string | null
    tokens_used: number | null
    created_at: string | null
  }>
  designVariables: Record<string, unknown> | null
  menus: Array<{
    id: string
    name: string
    slug: string
    position: string | null
    settings: Record<string, unknown> | null
    menu_items: Array<{
      id: string
      menu_id: string
      parent_id: string | null
      link_type: string
      page_id: string | null
      external_url: string | null
      anchor: string | null
      content_type_slug: string | null
      label: string
      icon: string | null
      description: string | null
      target: string
      position: number
      pages: { slug: string; name: string } | null
    }>
  }>
  globalHeader: {
    id: string
    html: string | null
    css: string | null
    js: string | null
  } | null
  globalFooter: {
    id: string
    html: string | null
    css: string | null
    js: string | null
  } | null
}

export async function loadEditorData(siteId: string, pageId: string): Promise<EditorInitialData> {
  const supabase = getServiceClient()

  // Load ALL data in parallel
  const [
    { data: site },
    { data: page },
    { data: pages },
    { data: chatHistory },
    { data: designVars },
    { data: menusData },
  ] = await Promise.all([
    // Site with global component IDs
    supabase
      .from('sites')
      .select('id, name, settings, global_header_id, global_footer_id')
      .eq('id', siteId)
      .single(),
    // Current page
    supabase
      .from('pages')
      .select('id, name, slug, html_content, is_home')
      .eq('id', pageId)
      .single(),
    // All pages for this site
    supabase
      .from('pages')
      .select('id, name, slug, html_content, is_home')
      .eq('site_id', siteId)
      .order('created_at'),
    // Chat history
    supabase
      .from('chat_messages')
      .select('id, role, content, generated_html, model, tokens_used, created_at')
      .eq('page_id', pageId)
      .order('created_at'),
    // Design variables
    supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single(),
    // Menus with items (table not in generated types yet)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('menus')
      .select(`
        id,
        name,
        slug,
        position,
        settings,
        menu_items (
          id,
          menu_id,
          parent_id,
          link_type,
          page_id,
          external_url,
          anchor,
          content_type_slug,
          label,
          icon,
          description,
          target,
          position,
          pages:page_id (slug, name)
        )
      `)
      .eq('site_id', siteId),
  ])

  // Load global components if they exist
  let globalHeader = null
  let globalFooter = null

  if (site?.global_header_id) {
    const { data: header } = await supabase
      .from('components')
      .select('id, html, css, js')
      .eq('id', site.global_header_id)
      .single()
    globalHeader = header
  }

  if (site?.global_footer_id) {
    const { data: footer } = await supabase
      .from('components')
      .select('id, html, css, js')
      .eq('id', site.global_footer_id)
      .single()
    globalFooter = footer
  }

  return {
    site: site as EditorInitialData['site'],
    page: page as EditorInitialData['page'],
    pages: (pages || []) as EditorInitialData['pages'],
    chatHistory: (chatHistory || []) as EditorInitialData['chatHistory'],
    designVariables: designVars as Record<string, unknown> | null,
    menus: (menusData || []) as EditorInitialData['menus'],
    globalHeader,
    globalFooter,
  }
}
