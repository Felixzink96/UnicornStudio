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
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/responses'
import type { Json } from '@/types/database'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * POST /api/v1/sites/:siteId/wordpress/register
 * Called by WordPress plugin to register itself with Unicorn Studio
 * This creates the webhook automatically!
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate via API Key
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Parse body - WordPress sends its webhook URL and secret
    const body = await request.json()
    const { webhook_url, site_url, plugin_version, webhook_secret } = body

    if (!webhook_url || !site_url) {
      return serverErrorResponse('webhook_url and site_url are required')
    }

    if (!webhook_secret) {
      return serverErrorResponse('webhook_secret is required for HMAC verification')
    }

    const supabase = createAPIClient()

    // 4. Get site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('integrations')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return notFoundResponse('Site')
    }

    // 5. Extract domain from site_url
    let domain = ''
    try {
      domain = new URL(site_url).hostname
    } catch {
      domain = site_url
    }

    // 6. Update site integrations with WordPress config
    const currentIntegrations = (site.integrations || {}) as Record<string, unknown>
    const updatedIntegrations = {
      ...currentIntegrations,
      wordpress: {
        enabled: true,
        api_url: webhook_url.replace(/\/webhook\/?$/, ''),
        api_key: '', // Not needed when using webhooks
        domain: domain,
        connection_status: 'connected',
        last_connection_test: new Date().toISOString(),
        plugin_version: plugin_version || 'unknown',
        registered_at: new Date().toISOString(),
      },
    }

    await supabase
      .from('sites')
      .update({
        integrations: updatedIntegrations as unknown as Json,
      })
      .eq('id', siteId)

    // 7. Create or update webhook
    // Check if webhook already exists
    const { data: existingWebhooks } = await supabase
      .from('webhooks')
      .select('id')
      .eq('site_id', siteId)
      .ilike('url', `%${domain}%`)

    if (!existingWebhooks || existingWebhooks.length === 0) {
      // Create new webhook using WordPress's secret for HMAC verification
      await supabase.from('webhooks').insert({
        site_id: siteId,
        url: webhook_url,
        secret: webhook_secret, // Use the secret from WordPress!
        events: [
          'entry.created',
          'entry.updated',
          'entry.deleted',
          'entry.published',
          'entry.unpublished',
          'content_type.created',
          'content_type.updated',
          'content_type.deleted',
          'page.created',
          'page.updated',
          'page.deleted',
          'taxonomy.created',
          'taxonomy.updated',
          'taxonomy.deleted',
          'term.created',
          'term.updated',
          'term.deleted',
          'css.updated',
        ],
        is_active: true,
      })
    } else {
      // Update existing webhook with new secret and URL
      await supabase
        .from('webhooks')
        .update({
          url: webhook_url,
          secret: webhook_secret,
          is_active: true,
        })
        .eq('id', existingWebhooks[0].id)
    }

    // 8. Return success
    return successResponse({
      registered: true,
      domain: domain,
      message: 'WordPress erfolgreich verbunden!',
    })
  } catch (error) {
    console.error('WordPress register error:', error)
    return serverErrorResponse('Ein unerwarteter Fehler ist aufgetreten')
  }
}
