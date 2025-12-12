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

    // Use RPC function to get page with globals
    const { data, error } = await supabase.rpc('get_page_with_globals', {
      p_page_id: pageId,
    })

    if (error) {
      console.error('Get page with globals error:', error)
      // Fallback: try direct query
      return await fallbackRender(supabase, siteId, pageId, format)
    }

    if (!data || data.length === 0) {
      return notFoundResponse('Page not found')
    }

    const pageData = data[0] as PageWithGlobals

    // Build rendered page
    const rendered = buildRenderedPage(pageData)

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
 */
function buildRenderedPage(pageData: PageWithGlobals): RenderedPage {
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

  // Build HTML
  // Header
  if (!pageData.hide_header && pageData.header_html) {
    html += pageData.header_html + '\n'
  }

  // Page Content
  if (pageData.page_html) {
    html += pageData.page_html + '\n'
  }

  // Footer
  if (!pageData.hide_footer && pageData.footer_html) {
    html += pageData.footer_html + '\n'
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
  format: string
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

  // Build page
  const css = [headerCss, footerCss].filter(Boolean).join('\n')
  const js = [headerJs, footerJs].filter(Boolean).join('\n')
  const bodyHtml = [headerHtml, page.html_content || '', footerHtml]
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
