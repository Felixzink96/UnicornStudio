import { createClient } from '@/lib/supabase/client'
import type { Page } from '@/types/database'

export async function getPages(siteId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getPage(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getPageBySlug(siteId: string, slug: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', slug)
    .single()

  if (error) throw error
  return data
}

// Default HTML for new pages (empty - AI will generate content)
// Uses bg-background which references the CSS variable from design tokens
const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-background text-foreground">
</body>
</html>`

export async function createPage(page: {
  site_id: string
  name: string
  slug: string
  is_home?: boolean
}) {
  const supabase = createClient()

  // If this is the home page, unset any existing home page
  if (page.is_home) {
    await supabase
      .from('pages')
      .update({ is_home: false })
      .eq('site_id', page.site_id)
      .eq('is_home', true)
  }

  const { data, error } = await supabase
    .from('pages')
    .insert({
      ...page,
      html_content: DEFAULT_HTML,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePage(id: string, updates: Partial<Page>) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePageHtml(id: string, htmlContent: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pages')
    .update({
      html_content: htmlContent,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePage(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('pages').delete().eq('id', id)

  if (error) throw error
}

export async function duplicatePage(id: string, newName: string, newSlug: string) {
  const supabase = createClient()

  // Get the original page
  const { data: original, error: fetchError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Create a copy
  const { data, error } = await supabase
    .from('pages')
    .insert({
      site_id: original.site_id,
      name: newName,
      slug: newSlug,
      html_content: original.html_content,
      settings: original.settings,
      seo: original.seo,
      is_home: false,
      is_published: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
