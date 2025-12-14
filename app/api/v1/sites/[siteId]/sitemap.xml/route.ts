import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

/**
 * GET /api/v1/sites/:siteId/sitemap.xml
 * Generate XML Sitemap for a site
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId } = await params
    const supabase = await createClient()

    // Get site with WordPress config to determine base URL
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, slug, custom_domain, subdomain, integrations')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return new Response('Site not found', { status: 404 })
    }

    // Determine base URL from WordPress config or custom domain
    const integrations = site.integrations as { wordpress?: { domain?: string } } | null
    const wpDomain = integrations?.wordpress?.domain
    const baseUrl = wpDomain
      ? `https://${wpDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : site.custom_domain
        ? `https://${site.custom_domain}`
        : `https://${site.subdomain || site.slug}.example.com`

    const urls: SitemapUrl[] = []

    // 1. Get all published pages
    const { data: pages } = await supabase
      .from('pages')
      .select('id, slug, is_home, updated_at')
      .eq('site_id', siteId)
      .eq('is_published', true)
      .order('is_home', { ascending: false })
      .order('sort_order', { ascending: true })

    if (pages) {
      for (const page of pages) {
        const pageUrl = page.is_home ? '/' : `/${page.slug}`
        urls.push({
          loc: `${baseUrl}${pageUrl}`,
          lastmod: page.updated_at ? new Date(page.updated_at).toISOString().split('T')[0] : undefined,
          changefreq: page.is_home ? 'daily' : 'weekly',
          priority: page.is_home ? 1.0 : 0.8,
        })
      }
    }

    // 2. Get all published entries (CMS content)
    const { data: entries } = await supabase
      .from('entries')
      .select(`
        id,
        slug,
        updated_at,
        content_type:content_types(slug, has_single)
      `)
      .eq('site_id', siteId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (entries) {
      for (const entry of entries) {
        const contentType = entry.content_type as { slug: string; has_single: boolean } | null

        // Only include entries that have single pages
        if (contentType?.has_single && entry.slug) {
          const entryUrl = `/${contentType.slug}/${entry.slug}`
          urls.push({
            loc: `${baseUrl}${entryUrl}`,
            lastmod: entry.updated_at ? new Date(entry.updated_at).toISOString().split('T')[0] : undefined,
            changefreq: 'weekly',
            priority: 0.6,
          })
        }
      }
    }

    // 3. Generate XML
    const xml = generateSitemapXml(urls)

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * Generate XML sitemap string
 */
function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlElements = urls.map(url => {
    let urlXml = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`

    if (url.lastmod) {
      urlXml += `\n    <lastmod>${url.lastmod}</lastmod>`
    }
    if (url.changefreq) {
      urlXml += `\n    <changefreq>${url.changefreq}</changefreq>`
    }
    if (url.priority !== undefined) {
      urlXml += `\n    <priority>${url.priority.toFixed(1)}</priority>`
    }

    urlXml += '\n  </url>'
    return urlXml
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
