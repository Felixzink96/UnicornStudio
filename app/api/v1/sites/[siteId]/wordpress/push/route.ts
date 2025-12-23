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
import { resolveEntriesInTemplate, hasEntriesPlaceholders } from '@/lib/templates/entries-resolver'

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
    templates?: { count: number; success: boolean; error?: string }
    fields?: { count: number; success: boolean; error?: string }
    cms_components?: { count: number; success: boolean; error?: string }
    css?: { success: boolean; error?: string }
    global_components?: {
      count: number
      success: boolean
      error?: string
      menus_found?: number
      header_had_placeholder?: boolean
      header_placeholder_replaced?: boolean
      footer_had_placeholder?: boolean
      footer_placeholder_replaced?: boolean
    }
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
          // Resolve entries placeholders in page HTML (server-side for SEO)
          let processedHtmlContent = page.html_content || ''
          if (processedHtmlContent && hasEntriesPlaceholders(processedHtmlContent)) {
            const { html: resolvedHtml } = await resolveEntriesInTemplate(
              processedHtmlContent,
              siteId
            )
            processedHtmlContent = resolvedHtml
          }

          // Include header/footer settings in page data
          await sendWebhook(webhookUrl, headers, {
            event: 'page.updated',
            site_id: siteId,
            data: {
              ...page,
              // Use processed HTML with resolved entries
              html_content: processedHtmlContent,
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

    // 7.5. Push Templates (Archive/Single)
    try {
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .eq('site_id', siteId)
        .in('type', ['archive', 'single'])

      if (templates && templates.length > 0) {
        for (const template of templates) {
          await sendWebhook(webhookUrl, headers, {
            event: 'template.updated',
            site_id: siteId,
            data: {
              id: template.id,
              name: template.name,
              type: template.type,
              html: template.html,
              conditions: template.conditions,
              is_default: template.is_default,
              priority: template.priority,
            },
          })
        }
        result.results.templates = { count: templates.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Templates sync failed'
      result.errors.push(msg)
      result.results.templates = { count: 0, success: false, error: msg }
    }

    // 7.6. Push Custom Fields (ACF-style fields)
    try {
      const { data: fields } = await supabase
        .from('fields')
        .select('*, content_type:content_types(slug)')
        .eq('site_id', siteId)
        .order('position', { ascending: true })

      if (fields && fields.length > 0) {
        // Group fields by content type
        const fieldsByContentType = fields.reduce((acc, field) => {
          const ctSlug = (field.content_type as { slug: string } | null)?.slug || 'unknown'
          if (!acc[ctSlug]) acc[ctSlug] = []
          acc[ctSlug].push({
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            settings: field.settings,
            sub_fields: field.sub_fields,
            position: field.position,
          })
          return acc
        }, {} as Record<string, unknown[]>)

        await sendWebhook(webhookUrl, headers, {
          event: 'fields.sync',
          site_id: siteId,
          data: {
            fields_by_content_type: fieldsByContentType,
            total_count: fields.length,
          },
        })
        result.results.fields = { count: fields.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fields sync failed'
      result.errors.push(msg)
      result.results.fields = { count: 0, success: false, error: msg }
    }

    // 7.7. Push CMS Components (with JavaScript)
    try {
      const { data: cmsComponents } = await supabase
        .from('cms_components')
        .select('id, name, slug, html, css, js, js_init, is_required')
        .eq('site_id', siteId)
        .not('js', 'is', null)

      if (cmsComponents && cmsComponents.length > 0) {
        // Send all components with JS in a single sync event
        await sendWebhook(webhookUrl, headers, {
          event: 'cms_components.sync',
          site_id: siteId,
          data: {
            components: cmsComponents.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              js: c.js,
              js_init: c.js_init || 'domready',
            })),
            total_count: cmsComponents.length,
          },
        })
        result.results.cms_components = { count: cmsComponents.length, success: true }
      } else {
        result.results.cms_components = { count: 0, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'CMS Components sync failed'
      result.errors.push(msg)
      result.results.cms_components = { count: 0, success: false, error: msg }
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
            css_classes,
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
        css_classes: string | null
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
          cssClasses: item.css_classes || undefined,
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
        // NOTE: We do NOT send individual component.updated events for header/footer
        // because global_components.sync sends the HTML with menu placeholders replaced.
        // Sending component.updated would overwrite with original HTML containing placeholders.

        // Inject menus into header/footer HTML before sending to WordPress
        // Check if header/footer have menu placeholders
        const headerHasPlaceholder = header?.html?.includes('{{menu:') || false
        const footerHasPlaceholder = footer?.html?.includes('{{menu:') || false

        // Log menu details for debugging
        console.log(`[WordPress Push] Menus available: ${menus.length}`)
        menus.forEach(m => {
          console.log(`[WordPress Push] Menu: slug="${m.slug}", position="${m.position}", items=${m.items?.length || 0}`)
        })
        console.log(`[WordPress Push] Header has placeholder: ${headerHasPlaceholder}`)
        console.log(`[WordPress Push] Footer has placeholder: ${footerHasPlaceholder}`)

        // Use menu.settings for classes, with fallbacks only if item has no cssClasses
        // Each menu item should use its own cssClasses first
        const headerHtmlWithMenus = header?.html ? injectMenusIntoHtml(header.html, menus, {
          // Fallback classes only used if menu item has no cssClasses
          linkClass: 'text-sm transition-colors hover:opacity-80',
        }) : null

        const footerHtmlWithMenus = footer?.html ? injectMenusIntoHtml(footer.html, menus, {
          // Fallback classes only used if menu item has no cssClasses
          linkClass: 'text-sm transition-colors hover:opacity-80',
          includeDropdowns: false,
        }) : null

        // Check if placeholders were replaced
        const headerPlaceholderReplaced = headerHasPlaceholder && !headerHtmlWithMenus?.includes('{{menu:')
        const footerPlaceholderReplaced = footerHasPlaceholder && !footerHtmlWithMenus?.includes('{{menu:')

        console.log(`[WordPress Push] Header placeholder replaced: ${headerPlaceholderReplaced}`)
        console.log(`[WordPress Push] Footer placeholder replaced: ${footerPlaceholderReplaced}`)

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

    // 10. Push Site Identity (Logo, Favicon, Tagline, OG Image) + SEO Settings
    try {
      // Site already loaded above, just send identity data
      // Include seo_settings for meta description, analytics, security headers, etc.
      const seoSettings = site.seo_settings as Record<string, unknown> | null

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
          // Include full SEO settings for PageSpeed optimization
          seo_settings: seoSettings ? {
            site_name: seoSettings.site_name || site.name,
            title_separator: seoSettings.title_separator || ' | ',
            title_format: seoSettings.title_format || '{{page_title}}{{separator}}{{site_name}}',
            default_meta_description: seoSettings.default_meta_description || site.tagline || '',
            default_og_image: seoSettings.default_og_image || site.og_image_url,
            favicon: seoSettings.favicon || site.favicon_url,
            apple_touch_icon: seoSettings.apple_touch_icon,
            google_verification: seoSettings.google_verification,
            bing_verification: seoSettings.bing_verification,
            google_analytics_id: seoSettings.google_analytics_id,
            google_tag_manager_id: seoSettings.google_tag_manager_id,
            facebook_pixel_id: seoSettings.facebook_pixel_id,
            custom_scripts_head: seoSettings.custom_scripts_head || '',
            custom_scripts_body: seoSettings.custom_scripts_body || '',
            robots_txt: seoSettings.robots_txt,
            sitemap_enabled: seoSettings.sitemap_enabled ?? true,
            social_profiles: seoSettings.social_profiles,
            local_business: seoSettings.local_business,
          } : null,
        },
      })
      result.results.site_identity = { success: true }
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
