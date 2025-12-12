import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import crypto from 'crypto'

interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
  [key: string]: unknown
}

interface SiteIntegrations {
  wordpress?: WordPressConfig
}

interface Webhook {
  id: string
  url: string
  secret: string
  is_active: boolean
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

// Check if URL looks like a WordPress webhook
function isWordPressWebhook(url: string): boolean {
  return url.includes('wp-json') || url.includes('wordpress') || url.includes('/unicorn-studio/')
}

// Generate HMAC signature for webhook
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

/**
 * POST /api/internal/wordpress/push
 * Push data to WordPress via webhooks (uses session auth)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Parse body
    const body = await request.json()
    const { siteId, pageId } = body

    if (!siteId) {
      return Response.json({ success: false, error: { message: 'Site ID is required' } }, { status: 400 })
    }

    // If pageId is provided, only push that specific page
    const pushSinglePage = !!pageId

    // Get site with integrations (RLS will handle access control)
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return Response.json({ success: false, error: { message: 'Site not found' } }, { status: 404 })
    }

    // Try to find WordPress webhook
    const { data: webhooks } = await supabase
      .from('webhooks')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)

    const wpWebhook = (webhooks as Webhook[] | null)?.find((w) => isWordPressWebhook(w.url))

    // Check if we have a way to push (either via integrations config or webhook)
    const integrations = site.integrations as SiteIntegrations | null
    const wpConfig = integrations?.wordpress

    // Determine webhook URL and auth method
    let webhookUrl: string
    let authHeaders: Record<string, string>
    let useHmac = false
    let hmacSecret = ''

    if (wpConfig?.enabled && wpConfig?.api_url && wpConfig?.api_key) {
      // Use configured API key method
      webhookUrl = `${wpConfig.api_url.replace(/\/$/, '')}/webhook`
      authHeaders = {
        'Authorization': `Bearer ${wpConfig.api_key}`,
        'Content-Type': 'application/json',
      }
    } else if (wpWebhook) {
      // Use webhook with HMAC signature
      webhookUrl = wpWebhook.url
      useHmac = true
      hmacSecret = wpWebhook.secret
      authHeaders = {
        'Content-Type': 'application/json',
      }
    } else {
      return Response.json({
        success: false,
        error: { message: 'Keine WordPress-Verbindung gefunden. Bitte Webhook einrichten oder in Site Settings konfigurieren.' },
      }, { status: 400 })
    }

    const result: PushResult = {
      success: true,
      pushed_at: new Date().toISOString(),
      results: {},
      errors: [],
    }

    // Helper function to send webhook
    const sendWebhook = async (event: string, data: unknown) => {
      const payload = JSON.stringify({
        event,
        site_id: siteId,
        data,
        timestamp: new Date().toISOString(),
      })

      const headers = { ...authHeaders }
      if (useHmac) {
        headers['X-Unicorn-Signature'] = generateSignature(payload, hmacSecret)
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payload,
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Webhook failed: ${response.status} - ${errorText}`)
      }

      // Update webhook stats if using webhook method
      if (wpWebhook) {
        await supabase.rpc('update_webhook_stats', {
          target_webhook_id: wpWebhook.id,
          was_success: true,
          http_status: response.status,
        })
      }
    }

    // Skip content types and entries when pushing single page
    if (!pushSinglePage) {
      // Push Content Types
      try {
        const { data: contentTypes } = await supabase
          .from('content_types')
          .select('*')
          .eq('site_id', siteId)

        if (contentTypes && contentTypes.length > 0) {
          for (const ct of contentTypes) {
            await sendWebhook('content_type.updated', ct)
          }
          result.results.content_types = { count: contentTypes.length, success: true }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Content Types sync failed'
        result.errors.push(msg)
        result.results.content_types = { count: 0, success: false, error: msg }
      }

      // Push Entries (only published)
      try {
        const { data: entries } = await supabase
          .from('entries')
          .select('*, content_type:content_types(name, slug)')
          .eq('site_id', siteId)
          .eq('status', 'published')

        if (entries && entries.length > 0) {
          for (const entry of entries) {
            await sendWebhook('entry.published', entry)
          }
          result.results.entries = { count: entries.length, success: true }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Entries sync failed'
        result.errors.push(msg)
        result.results.entries = { count: 0, success: false, error: msg }
      }
    }

    // Push Pages (single page if pageId provided, otherwise all pages)
    try {
      let pagesQuery = supabase
        .from('pages')
        .select('*')
        .eq('site_id', siteId)

      if (pushSinglePage) {
        pagesQuery = pagesQuery.eq('id', pageId)
      }

      const { data: pages } = await pagesQuery

      if (pages && pages.length > 0) {
        for (const page of pages) {
          // Map fields for WordPress compatibility
          const wpPage = {
            ...page,
            html: page.html_content, // WordPress expects 'html', DB has 'html_content'
            title: page.name,        // WordPress can use 'title' or 'name'
          }
          await sendWebhook('page.updated', wpPage)
        }
        result.results.pages = { count: pages.length, success: true }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Pages sync failed'
      result.errors.push(msg)
      result.results.pages = { count: 0, success: false, error: msg }
    }

    // Skip taxonomies and CSS when pushing single page
    if (!pushSinglePage) {
      // Push Taxonomies and Terms
      try {
        const { data: taxonomies } = await supabase
          .from('taxonomies')
          .select('*, terms(*)')
          .eq('site_id', siteId)

        if (taxonomies && taxonomies.length > 0) {
          for (const tax of taxonomies) {
            await sendWebhook('taxonomy.updated', tax)
          }
          result.results.taxonomies = { count: taxonomies.length, success: true }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Taxonomies sync failed'
        result.errors.push(msg)
        result.results.taxonomies = { count: 0, success: false, error: msg }
      }

      // Push CSS/Design Variables
      try {
        const { data: designVars } = await supabase
          .from('design_variables')
          .select('*')
          .eq('site_id', siteId)
          .single()

        if (designVars) {
          await sendWebhook('css.updated', {
            variables: designVars,
            settings: site.settings,
          })
          result.results.css = { success: true }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'CSS sync failed'
        result.errors.push(msg)
        result.results.css = { success: false, error: msg }
      }
    }

    // Update last_pushed_to_wordpress_at timestamp
    result.success = result.errors.length === 0

    await supabase
      .from('sites')
      .update({
        last_pushed_to_wordpress_at: result.pushed_at,
      })
      .eq('id', siteId)

    return Response.json({ success: true, data: result })
  } catch (error) {
    console.error('WordPress push error:', error)
    return Response.json({
      success: false,
      error: { message: 'Ein unerwarteter Fehler ist aufgetreten' },
    }, { status: 500 })
  }
}
