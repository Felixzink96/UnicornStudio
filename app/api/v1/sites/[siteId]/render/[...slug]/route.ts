// ============================================
// DYNAMIC CONTENT RENDERING API
// Renders archive/single pages with templates
// ============================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderTemplateWithComponents, type RenderContext } from '@/lib/templates/engine'
import { resolveTemplate, getRelatedEntries } from '@/lib/templates/resolver'
import type { ContentType, Entry, Template, CMSComponent } from '@/types/cms'

interface RouteParams {
  params: Promise<{
    siteId: string
    slug: string[]
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId, slug } = await params
    const fullSlug = slug.join('/')
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1')

    const supabase = await createClient()

    // Resolve the template and content
    const resolved = await resolveTemplate(siteId, fullSlug)

    if (!resolved) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    const { template, type, contentType, entry, entries, pagination } = resolved

    if (!template?.html) {
      return NextResponse.json(
        { error: 'No template found for this content' },
        { status: 404 }
      )
    }

    // Get site info
    const { data: site } = await supabase
      .from('sites')
      .select('name')
      .eq('id', siteId)
      .single()

    // Get design variables
    const { data: designVars } = await supabase
      .from('design_variables')
      .select('*')
      .eq('site_id', siteId)
      .single()

    // Build render context
    const context: RenderContext = {
      site: site ? {
        name: site.name || '',
        url: '/',
      } : undefined,
    }

    // Add entry data for single templates
    if (type === 'single' && entry && contentType) {
      const relatedEntries = await getRelatedEntries(
        siteId,
        contentType.id,
        entry.id,
        3
      )

      // Collect all image IDs to resolve
      const imageIds = [
        entry.featured_image_id,
        ...relatedEntries.map(e => e.featured_image_id)
      ].filter(Boolean) as string[]

      // Resolve image URLs from assets table
      const imageUrlMap = new Map<string, string>()
      if (imageIds.length > 0) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, file_url')
          .in('id', imageIds)

        assets?.forEach(a => {
          if (a.file_url) imageUrlMap.set(a.id, a.file_url)
        })
      }

      context.entry = {
        title: entry.title || '',
        slug: entry.slug || '',
        content: entry.content || '',
        excerpt: entry.excerpt || undefined,
        featured_image: entry.featured_image_id ? imageUrlMap.get(entry.featured_image_id) : undefined,
        author: 'Author', // TODO: Resolve author name
        published_at: entry.published_at || undefined,
        url: `/${contentType.slug}/${entry.slug}`,
        data: (entry.data as Record<string, unknown>) || {},
      }

      context.related_entries = relatedEntries.map((e) => ({
        title: e.title || '',
        slug: e.slug || '',
        excerpt: e.excerpt || undefined,
        featured_image: e.featured_image_id ? imageUrlMap.get(e.featured_image_id) : undefined,
        url: `/${contentType.slug}/${e.slug}`,
      }))
    }

    // Add entries data for archive templates
    if (type === 'archive' && entries && contentType) {
      // Resolve image URLs for archive entries
      const archiveImageIds = entries
        .map((e: Entry) => e.featured_image_id)
        .filter(Boolean) as string[]

      const archiveImageUrlMap = new Map<string, string>()
      if (archiveImageIds.length > 0) {
        const { data: assets } = await supabase
          .from('assets')
          .select('id, file_url')
          .in('id', archiveImageIds)

        assets?.forEach(a => {
          if (a.file_url) archiveImageUrlMap.set(a.id, a.file_url)
        })
      }

      context.entries = entries.map((e: Entry) => ({
        title: e.title || '',
        slug: e.slug || '',
        excerpt: e.excerpt || undefined,
        featured_image: e.featured_image_id ? archiveImageUrlMap.get(e.featured_image_id) : undefined,
        author: 'Author',
        published_at: e.published_at || undefined,
        url: `/${contentType.slug}/${e.slug}`,
        data: (e.data as Record<string, unknown>) || {},
      }))

      if (pagination) {
        context.pagination = {
          current: pagination.current,
          total: pagination.total,
          prev: page > 1 ? `/${contentType.slug}?page=${page - 1}` : null,
          next: page < pagination.total ? `/${contentType.slug}?page=${page + 1}` : null,
          pages: Array.from({ length: pagination.total }, (_, i) => i + 1),
        }
      }
    }

    // Load CMS components for this site
    const { data: cmsComponents } = await supabase
      .from('cms_components')
      .select('*')
      .eq('site_id', siteId)
      .not('slug', 'is', null)

    // Render the template with component resolution
    const { html: renderedHtml, components: usedComponents } = renderTemplateWithComponents(
      template.html,
      context,
      (cmsComponents || []) as CMSComponent[]
    )

    // Get global components (header/footer)
    const { data: siteGlobals } = await supabase
      .from('sites')
      .select('global_header_id, global_footer_id')
      .eq('id', siteId)
      .single()

    let globalHeader: { html: string | null } | null = null
    let globalFooter: { html: string | null } | null = null

    if (siteGlobals?.global_header_id) {
      const { data } = await supabase
        .from('components')
        .select('html')
        .eq('id', siteGlobals.global_header_id)
        .single()
      globalHeader = data
    }

    if (siteGlobals?.global_footer_id) {
      const { data } = await supabase
        .from('components')
        .select('html')
        .eq('id', siteGlobals.global_footer_id)
        .single()
      globalFooter = data
    }

    // Build CSS variables (full generation like in EntryEditorAI)
    const buildCssVariables = () => {
      const dv = designVars as Record<string, unknown> | undefined
      if (!dv) return ''

      const colors = dv.colors as Record<string, Record<string, string>> | undefined
      const typography = dv.typography as Record<string, string> | undefined
      const customColors = dv.customColors as Record<string, string> | undefined

      let css = ':root {\n'

      // Brand colors - with fallbacks
      const brandColors = colors?.brand || {}
      css += `  --color-brand-primary: ${brandColors.primary || '#8b5cf6'};\n`
      css += `  --color-brand-secondary: ${brandColors.secondary || '#06b6d4'};\n`
      css += `  --color-brand-accent: ${brandColors.accent || '#f59e0b'};\n`

      Object.entries(brandColors).forEach(([key, value]) => {
        if (value && !['primary', 'secondary', 'accent'].includes(key)) {
          css += `  --color-brand-${key}: ${value};\n`
        }
      })

      // Neutral colors
      const neutralColors = colors?.neutral || {}
      Object.entries(neutralColors).forEach(([key, value]) => {
        if (value) {
          css += `  --color-neutral-${key}: ${value};\n`
        }
      })

      // Custom colors
      if (customColors) {
        Object.entries(customColors).forEach(([key, value]) => {
          if (value) {
            css += `  --color-${key}: ${value};\n`
          }
        })
      }

      // Typography
      const fontHeading = typography?.fontHeading || 'Inter'
      const fontBody = typography?.fontBody || 'Inter'
      const fontMono = typography?.fontMono || 'monospace'

      css += `  --font-heading: '${fontHeading}', system-ui, sans-serif;\n`
      css += `  --font-body: '${fontBody}', system-ui, sans-serif;\n`
      css += `  --font-mono: '${fontMono}', monospace;\n`

      css += '}\n\n'

      // Utility classes
      css += '.font-heading { font-family: var(--font-heading); }\n'
      css += '.font-body { font-family: var(--font-body); }\n'
      css += '.font-mono { font-family: var(--font-mono); }\n'
      css += '.text-brand-primary { color: var(--color-brand-primary); }\n'
      css += '.text-brand-secondary { color: var(--color-brand-secondary); }\n'
      css += '.bg-brand-primary { background-color: var(--color-brand-primary); }\n'
      css += '.bg-brand-secondary { background-color: var(--color-brand-secondary); }\n'

      return css
    }

    const cssVariables = buildCssVariables()

    // Get fonts for Google Fonts
    const typography = designVars?.typography as Record<string, string> | undefined
    const fontHeading = typography?.fontHeading || 'Inter'
    const fontBody = typography?.fontBody || 'Inter'
    const fonts = [...new Set([fontHeading, fontBody])].filter(f => f && f !== 'system-ui')
    const googleFontsUrl = fonts.length > 0
      ? `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`
      : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

    // Collect CSS and JS from used components
    const componentCss = usedComponents
      .map(c => c.css || '')
      .filter(Boolean)
      .join('\n\n')

    const componentJs = usedComponents
      .filter(c => c.js)
      .map(c => {
        // Wrap in IIFE and handle init timing
        const initType = c.js_init || 'domready'
        if (initType === 'immediate') {
          return c.js
        } else {
          return `document.addEventListener('DOMContentLoaded', function() {\n${c.js}\n});`
        }
      })
      .join('\n\n')

    // Assemble full page HTML
    const fullHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${entry?.title || contentType?.label_plural || 'Page'} - ${site?.name || 'Site'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">
  <style>
    ${cssVariables}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-body); background: var(--color-neutral-background, #0a0a0a); color: var(--color-neutral-foreground, #fafafa); }
    img { max-width: 100%; height: auto; }
    ${componentCss}
  </style>
</head>
<body>
  ${globalHeader?.html || ''}
  ${renderedHtml}
  ${globalFooter?.html || ''}
  ${componentJs ? `<script>\n${componentJs}\n</script>` : ''}
</body>
</html>
`

    return new NextResponse(fullHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('Render error:', error)
    return NextResponse.json(
      {
        error: 'Failed to render page',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
