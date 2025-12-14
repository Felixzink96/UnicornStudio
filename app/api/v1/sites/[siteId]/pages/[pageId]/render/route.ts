import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  notFoundResponse,
} from '@/lib/api/responses'
import type { PageWithGlobals, RenderedPage } from '@/types/global-components'
import { injectMenusIntoHtml } from '@/lib/menus/render-menu'
import type { MenuWithItems, MenuItem } from '@/types/menu'

interface RouteParams {
  params: Promise<{ siteId: string; pageId: string }>
}

/**
 * GET /api/v1/sites/:siteId/pages/:pageId/render
 * Get a rendered page with header and footer
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, pageId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json | html

    const supabase = createAPIClient()

    // Fetch menus with items for menu placeholder injection
    // Note: menus table not in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: menusRaw } = await (supabase as any)
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
      .eq('site_id', siteId)

    // Type for raw menu item from database
    type RawMenuItem = {
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
    }

    // Type for raw menu from database
    type RawMenu = {
      id: string
      name: string
      slug: string
      position: string
      settings: Record<string, unknown> | null
      menu_items: RawMenuItem[]
    }

    // Convert to MenuWithItems format
    const menus: MenuWithItems[] = ((menusRaw || []) as RawMenu[]).map((menu) => {
      const rawItems = (menu.menu_items || []) as RawMenuItem[]
      const items: MenuItem[] = rawItems.map((item) => ({
        id: item.id,
        menuId: item.menu_id,
        parentId: item.parent_id,
        linkType: item.link_type as MenuItem['linkType'],
        pageId: item.page_id || undefined,
        externalUrl: item.external_url || undefined,
        anchor: item.anchor || undefined,
        contentTypeSlug: item.content_type_slug || undefined,
        label: item.label,
        icon: item.icon || undefined,
        description: item.description || undefined,
        target: (item.target || '_self') as '_self' | '_blank',
        position: item.position,
        createdAt: '',
        updatedAt: '',
        pageSlug: item.pages?.slug,
        pageName: item.pages?.name,
      }))
      return {
        id: menu.id,
        siteId,
        name: menu.name,
        slug: menu.slug,
        description: undefined,
        position: menu.position as MenuWithItems['position'],
        settings: (menu.settings || {}) as MenuWithItems['settings'],
        createdAt: '',
        updatedAt: '',
        items,
      }
    })

    // Use RPC function to get page with globals
    const { data, error } = await supabase.rpc('get_page_with_globals', {
      p_page_id: pageId,
    })

    if (error) {
      console.error('Get page with globals error:', error)
      // Fallback: try direct query
      return await fallbackRender(supabase, siteId, pageId, format, menus)
    }

    if (!data || data.length === 0) {
      return notFoundResponse('Page not found')
    }

    const pageData = data[0] as PageWithGlobals

    // Build rendered page with menu injection
    const rendered = buildRenderedPage(pageData, menus)

    if (format === 'html') {
      return new Response(rendered.html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      })
    }

    return successResponse(rendered)
  } catch (error) {
    console.error('Render page API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * Build the rendered page from page data with globals
 * Injects dynamic menus into header/footer placeholders
 */
function buildRenderedPage(pageData: PageWithGlobals, menus: MenuWithItems[] = []): RenderedPage {
  let css = ''
  let js = ''
  let html = ''

  // Collect CSS
  if (!pageData.hide_header && pageData.header_css) {
    css += pageData.header_css + '\n'
  }
  if (!pageData.hide_footer && pageData.footer_css) {
    css += pageData.footer_css + '\n'
  }

  // Collect JS
  if (!pageData.hide_header && pageData.header_js) {
    js += pageData.header_js + '\n'
  }
  if (!pageData.hide_footer && pageData.footer_js) {
    js += pageData.footer_js + '\n'
  }

  // Build HTML with menu injection
  // Header - inject menus into placeholders
  if (!pageData.hide_header && pageData.header_html) {
    const headerWithMenus = injectMenusIntoHtml(pageData.header_html, menus, {
      containerClass: 'flex items-center gap-6',
      linkClass: 'text-sm text-zinc-600 hover:text-zinc-900 transition-colors',
    })
    html += headerWithMenus + '\n'
  }

  // Page Content
  if (pageData.page_html) {
    html += pageData.page_html + '\n'
  }

  // Footer - inject menus into placeholders
  if (!pageData.hide_footer && pageData.footer_html) {
    const footerWithMenus = injectMenusIntoHtml(pageData.footer_html, menus, {
      containerClass: 'flex flex-wrap justify-center gap-6',
      linkClass: 'text-sm text-zinc-500 hover:text-zinc-700 transition-colors',
      includeDropdowns: false,
    })
    html += footerWithMenus + '\n'
  }

  // Wrap with CSS and JS
  const fullHtml = buildFullHtml(html, css, js, pageData)

  return {
    html: fullHtml,
    css,
    js,
    header: pageData.header_id
      ? {
          id: pageData.header_id,
          html: pageData.header_html || '',
        }
      : null,
    footer: pageData.footer_id
      ? {
          id: pageData.footer_id,
          html: pageData.footer_html || '',
        }
      : null,
  }
}

/**
 * Build full HTML document
 */
function buildFullHtml(
  bodyHtml: string,
  css: string,
  js: string,
  pageData: PageWithGlobals
): string {
  const seo = pageData.page_seo as Record<string, string> | null

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo?.title || pageData.page_name}</title>
  ${seo?.description ? `<meta name="description" content="${seo.description}">` : ''}
  <script src="https://cdn.tailwindcss.com"></script>
  ${css ? `<style>\n${css}\n</style>` : ''}
</head>
<body>
${bodyHtml}
${js ? `<script>\n${js}\n</script>` : ''}
</body>
</html>`
}

/**
 * Fallback render if RPC function doesn't exist yet
 */
async function fallbackRender(
  supabase: ReturnType<typeof createAPIClient>,
  siteId: string,
  pageId: string,
  format: string,
  menus: MenuWithItems[] = []
) {
  // Get page
  const { data: page, error: pageError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .single()

  if (pageError || !page) {
    return notFoundResponse('Page not found')
  }

  // Get site with global header/footer
  const { data: site } = await supabase
    .from('sites')
    .select('global_header_id, global_footer_id')
    .eq('id', siteId)
    .single()

  let headerHtml = ''
  let footerHtml = ''
  let headerCss = ''
  let footerCss = ''
  let headerJs = ''
  let footerJs = ''

  // Get header component if exists and not hidden
  const headerId = page.custom_header_id || site?.global_header_id
  if (headerId && !page.hide_header) {
    const { data: header } = await supabase
      .from('components')
      .select('html, css, js')
      .eq('id', headerId)
      .single()

    if (header) {
      headerHtml = header.html || ''
      headerCss = header.css || ''
      headerJs = header.js || ''
    }
  }

  // Get footer component if exists and not hidden
  const footerId = page.custom_footer_id || site?.global_footer_id
  if (footerId && !page.hide_footer) {
    const { data: footer } = await supabase
      .from('components')
      .select('html, css, js')
      .eq('id', footerId)
      .single()

    if (footer) {
      footerHtml = footer.html || ''
      footerCss = footer.css || ''
      footerJs = footer.js || ''
    }
  }

  // Inject menus into header/footer placeholders
  const headerWithMenus = headerHtml ? injectMenusIntoHtml(headerHtml, menus, {
    containerClass: 'flex items-center gap-6',
    linkClass: 'text-sm text-zinc-600 hover:text-zinc-900 transition-colors',
  }) : ''

  const footerWithMenus = footerHtml ? injectMenusIntoHtml(footerHtml, menus, {
    containerClass: 'flex flex-wrap justify-center gap-6',
    linkClass: 'text-sm text-zinc-500 hover:text-zinc-700 transition-colors',
    includeDropdowns: false,
  }) : ''

  // Build page
  const css = [headerCss, footerCss].filter(Boolean).join('\n')
  const js = [headerJs, footerJs].filter(Boolean).join('\n')
  const bodyHtml = [headerWithMenus, page.html_content || '', footerWithMenus]
    .filter(Boolean)
    .join('\n')

  const seo = page.seo as Record<string, string> | null
  const fullHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo?.title || page.name}</title>
  ${seo?.description ? `<meta name="description" content="${seo.description}">` : ''}
  <script src="https://cdn.tailwindcss.com"></script>
  ${css ? `<style>\n${css}\n</style>` : ''}
</head>
<body>
${bodyHtml}
${js ? `<script>\n${js}\n</script>` : ''}
</body>
</html>`

  if (format === 'html') {
    return new Response(fullHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  }

  return successResponse({
    html: fullHtml,
    css,
    js,
    header: headerId ? { id: headerId, html: headerHtml } : null,
    footer: footerId ? { id: footerId, html: footerHtml } : null,
  })
}
