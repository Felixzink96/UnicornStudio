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

    // 6. Push Pages (only published)
    try {
      const { data: pages } = await supabase
        .from('pages')
        .select('*')
        .eq('site_id', siteId)
        .eq('is_published', true)

      if (pages && pages.length > 0) {
        for (const page of pages) {
          await sendWebhook(webhookUrl, headers, {
            event: 'page.updated',
            site_id: siteId,
            data: page,
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

    // 9. Update last_pushed_to_wordpress_at timestamp
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
