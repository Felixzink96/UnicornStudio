import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
  hasPermission,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api/responses'
import type { Json } from '@/types/database'
import { injectMenusIntoHtml } from '@/lib/menus/render-menu'
import type { MenuWithItems, MenuItem } from '@/types/menu'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
}

interface SiteIntegrations {
  wordpress?: WordPressConfig
}

interface PushResult {
  success: boolean
  pushed_at: string
  results: {
    content_types?: { count: number; success: boolean; error?: string }
    entries?: { count: number; success: boolean; error?: string }
    pages?: { count: number; success: boolean; error?: string }
    taxonomies?: { count: number; success: boolean; error?: string }
    css?: { success: boolean; error?: string }
    global_components?: { count: number; success: boolean; error?: string }
    site_identity?: { success: boolean; error?: string }
  }
  errors: string[]
}

/**
 * POST /api/v1/sites/:siteId/wordpress/push
 * Push data to WordPress
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    // Check write permission
    if (!hasPermission(auth, 'write')) {
      return forbiddenResponse('Write permission required')
    }

    const { siteId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Get site with integrations
    const supabase = createAPIClient()
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return notFoundResponse('Site')
    }

    const integrations = site.integrations as SiteIntegrations | null
    const wpConfig = integrations?.wordpress

    if (!wpConfig?.enabled || !wpConfig?.api_url || !wpConfig?.api_key) {
      return validationErrorResponse('WordPress ist nicht konfiguriert')
    }

    const result: PushResult = {
      success: true,
      pushed_at: new Date().toISOString(),
      results: {},
      errors: [],
    }

    const webhookUrl = `${wpConfig.api_url.replace(/\/$/, '')}/webhook`
    const headers = {
      'Authorization': `Bearer ${wpConfig.api_key}`,
      'Content-Type': 'application/json',
    }

    // 4. Push Content Types
    try {
      const { data: contentTypes } = await supabase
        .from('content_types')
        .select('*')
        .eq('site_id', siteId)

      if (contentTypes && contentTypes.length > 0) {
        for (const ct of contentTypes) {
          await sendWebhook(webhookUrl, headers, {
            event: 'content_type.updated',
            site_id: siteId,
            data: ct,
          })
        }
        result.results.content_types = { count: contentTypes.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Content Types sync failed'
      result.errors.push(msg)
      result.results.content_types = { count: 0, success: false, error: msg }
    }

    // 5. Push Entries (only published)
    try {
      const { data: entries } = await supabase
        .from('entries')
        .select('*, content_type:content_types(name, slug)')
        .eq('site_id', siteId)
        .eq('status', 'published')

      if (entries && entries.length > 0) {
        for (const entry of entries) {
          await sendWebhook(webhookUrl, headers, {
            event: 'entry.published',
            site_id: siteId,
            data: entry,
          })
        }
        result.results.entries = { count: entries.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Entries sync failed'
      result.errors.push(msg)
      result.results.entries = { count: 0, success: false, error: msg }
    }

    // 6. Push Pages (only published) with header/footer settings
    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('*, custom_header:components!pages_custom_header_id_fkey(id, name, html, css, js), custom_footer:components!pages_custom_footer_id_fkey(id, name, html, css, js)')
        .eq('site_id', siteId)
        .eq('is_published', true)

      if (pages && pages.length > 0) {
        for (const page of pages) {
          // Include header/footer settings in page data
          await sendWebhook(webhookUrl, headers, {
            event: 'page.updated',
            site_id: siteId,
            data: {
              ...page,
              // Explicitly include header/footer control fields
              header_footer_settings: {
                hide_header: page.hide_header || false,
                hide_footer: page.hide_footer || false,
                custom_header_id: page.custom_header_id,
                custom_footer_id: page.custom_footer_id,
                custom_header: page.custom_header || null,
                custom_footer: page.custom_footer || null,
              },
            },
          })
        }
        result.results.pages = { count: pages.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pages sync failed'
      result.errors.push(msg)
      result.results.pages = { count: 0, success: false, error: msg }
    }

    // 7. Push Taxonomies and Terms
    try {
      const { data: taxonomies } = await supabase
        .from('taxonomies')
        .select('*, terms(*)')
        .eq('site_id', siteId)

      if (taxonomies && taxonomies.length > 0) {
        for (const tax of taxonomies) {
          await sendWebhook(webhookUrl, headers, {
            event: 'taxonomy.updated',
            site_id: siteId,
            data: tax,
          })
        }
        result.results.taxonomies = { count: taxonomies.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Taxonomies sync failed'
      result.errors.push(msg)
      result.results.taxonomies = { count: 0, success: false, error: msg }
    }

    // 8. Push CSS/Design Variables
    try {
      const { data: designVars } = await supabase
        .from('design_variables')
        .select('*')
        .eq('site_id', siteId)
        .single()

      if (designVars) {
        await sendWebhook(webhookUrl, headers, {
          event: 'css.updated',
          site_id: siteId,
          data: {
            variables: designVars,
            settings: site.settings,
          },
        })
        result.results.css = { success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'CSS sync failed'
      result.errors.push(msg)
      result.results.css = { success: false, error: msg }
    }

    // 9. Push Global Components (Header/Footer) with dynamic menus
    try {
      // Fetch menus with items for menu placeholder injection
      // Note: menus table not in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: menusRaw, error: menusError } = await (supabase as any)
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

      // Log menu query results for debugging
      if (menusError) {
        console.error('Menu query error:', menusError)
      }
      console.log(`[WordPress Push] Found ${menusRaw?.length || 0} menus for site ${siteId}`)

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

      let header = null
      let footer = null
      let componentCount = 0

      // First, try to get components from site.global_header_id and global_footer_id
      if (site.global_header_id) {
        const { data: headerComponent } = await supabase
          .from('components')
          .select('*')
          .eq('id', site.global_header_id)
          .single()

        if (headerComponent) {
          header = headerComponent
          componentCount++
        }
      }

      if (site.global_footer_id) {
        const { data: footerComponent } = await supabase
          .from('components')
          .select('*')
          .eq('id', site.global_footer_id)
          .single()

        if (footerComponent) {
          footer = footerComponent
          componentCount++
        }
      }

      // Fallback: Query for is_global components if not found via site references
      if (!header || !footer) {
        const { data: globalComponents } = await supabase
          .from('components')
          .select('*')
          .eq('site_id', siteId)
          .in('position', ['header', 'footer'])
          .eq('is_global', true)

        if (globalComponents) {
          if (!header) {
            header = globalComponents.find((c) => c.position === 'header') || null
            if (header) componentCount++
          }
          if (!footer) {
            footer = globalComponents.find((c) => c.position === 'footer') || null
            if (footer) componentCount++
          }
        }
      }

      // Send components if found
      if (header || footer) {
        // Send individual component events
        if (header) {
          await sendWebhook(webhookUrl, headers, {
            event: 'component.updated',
            site_id: siteId,
            data: header,
          })
        }
        if (footer) {
          await sendWebhook(webhookUrl, headers, {
            event: 'component.updated',
            site_id: siteId,
            data: footer,
          })
        }

        // Inject menus into header/footer HTML before sending to WordPress
        // Check if header/footer have menu placeholders
        const headerHasPlaceholder = header?.html?.includes('{{menu:') || false
        const footerHasPlaceholder = footer?.html?.includes('{{menu:') || false

        const headerHtmlWithMenus = header?.html ? injectMenusIntoHtml(header.html, menus, {
          containerClass: 'flex items-center gap-6',
          linkClass: 'text-sm text-zinc-600 hover:text-zinc-900 transition-colors',
        }) : null

        const footerHtmlWithMenus = footer?.html ? injectMenusIntoHtml(footer.html, menus, {
          containerClass: 'flex flex-wrap justify-center gap-6',
          linkClass: 'text-sm text-zinc-500 hover:text-zinc-700 transition-colors',
          includeDropdowns: false,
        }) : null

        // Check if placeholders were replaced
        const headerPlaceholderReplaced = headerHasPlaceholder && !headerHtmlWithMenus?.includes('{{menu:')
        const footerPlaceholderReplaced = footerHasPlaceholder && !footerHtmlWithMenus?.includes('{{menu:')

        // Send global_components.sync event with all components grouped
        await sendWebhook(webhookUrl, headers, {
          event: 'global_components.sync',
          site_id: siteId,
          data: {
            global_header_id: site.global_header_id,
            global_footer_id: site.global_footer_id,
            header: header
              ? {
                  id: header.id,
                  name: header.name,
                  html: headerHtmlWithMenus || header.html,
                  css: header.css,
                  js: header.js,
                  position: 'header',
                }
              : null,
            footer: footer
              ? {
                  id: footer.id,
                  name: footer.name,
                  html: footerHtmlWithMenus || footer.html,
                  css: footer.css,
                  js: footer.js,
                  position: 'footer',
                }
              : null,
          },
        })

        result.results.global_components = {
          count: componentCount,
          success: true,
          menus_found: menus.length,
          header_had_placeholder: headerHasPlaceholder,
          header_placeholder_replaced: headerPlaceholderReplaced,
          footer_had_placeholder: footerHasPlaceholder,
          footer_placeholder_replaced: footerPlaceholderReplaced,
        }
      } else {
        result.results.global_components = {
          count: 0,
          success: true,
          menus_found: menus.length,
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Global Components sync failed'
      result.errors.push(msg)
      result.results.global_components = { count: 0, success: false, error: msg }
    }

    // 10. Push Site Identity (Logo, Favicon, Tagline, OG Image)
    try {
      // Site already loaded above, just send identity data
      if (site.logo_url || site.favicon_url || site.tagline || site.og_image_url) {
        await sendWebhook(webhookUrl, headers, {
          event: 'site_identity.updated',
          site_id: siteId,
          data: {
            logo_url: site.logo_url,
            logo_dark_url: site.logo_dark_url,
            favicon_url: site.favicon_url,
            tagline: site.tagline,
            og_image_url: site.og_image_url,
            site_name: site.name,
          },
        })
        result.results.site_identity = { success: true }
      } else {
        result.results.site_identity = { success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Site Identity sync failed'
      result.errors.push(msg)
      result.results.site_identity = { success: false, error: msg }
    }

    // 11. Update last_pushed_to_wordpress_at timestamp
    result.success = result.errors.length === 0

    if (result.success) {
      const successIntegrations = {
        ...integrations,
        wordpress: {
          ...wpConfig,
          connection_status: 'connected' as const,
        },
      } as { [key: string]: Json | undefined }

      await supabase
        .from('sites')
        .update({
          last_pushed_to_wordpress_at: result.pushed_at,
          integrations: successIntegrations,
        })
        .eq('id', siteId)
    } else {
      // Update connection status to error if push failed
      const errorIntegrations = {
        ...integrations,
        wordpress: {
          ...wpConfig,
          connection_status: 'error' as const,
        },
      } as { [key: string]: Json | undefined }

      await supabase
        .from('sites')
        .update({
          integrations: errorIntegrations,
        })
        .eq('id', siteId)
    }

    return successResponse(result)
  } catch (error) {
    console.error('WordPress push error:', error)
    return serverErrorResponse('Ein unerwarteter Fehler ist aufgetreten')
  }
}

/**
 * Send webhook to WordPress
 */
async function sendWebhook(
  url: string,
  headers: Record<string, string>,
  payload: { event: string; site_id: string; data: unknown }
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000), // 30 second timeout
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Webhook failed: ${response.status} - ${errorText}`)
  }
}
