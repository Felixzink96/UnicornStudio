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

    // Helper function to send webhook - returns WordPress response for debugging
    const sendWebhook = async (event: string, data: unknown): Promise<Record<string, unknown>> => {
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

      // Parse response body
      const responseBody = await response.json().catch(() => ({ raw: response.statusText }))

      if (!response.ok) {
        const errorMsg = responseBody?.error || responseBody?.message || response.statusText
        throw new Error(`Webhook failed: ${response.status} - ${errorMsg}`)
      }

      // Update webhook stats if using webhook method
      if (wpWebhook) {
        await supabase.rpc('update_webhook_stats', {
          target_webhook_id: wpWebhook.id,
          was_success: true,
          http_status: response.status,
        })
      }

      return responseBody as Record<string, unknown>
    }

    // Use simplified sync approach - tell WordPress to fetch from API
    // This ensures WordPress gets the exact same data as when clicking "Sync"
    if (pushSinglePage) {
      // Single page: ONLY sync this one page, nothing else
      console.log('[WordPress Push] Single page mode, pageId:', pageId)
      try {
        console.log('[WordPress Push] Sending sync.pages with pageId:', pageId)
        const wpResponse = await sendWebhook('sync.pages', { pageId })
        console.log('[WordPress Push] WordPress response:', JSON.stringify(wpResponse))

        // Extract debug info from WordPress response
        const wpResult = wpResponse.result as Record<string, unknown> | undefined
        const wpDebug = wpResult?.debug as Record<string, unknown> | undefined

        result.results.pages = {
          count: 1,
          success: wpResult?.success !== false,
          error: wpResult?.error as string | undefined,
        }

        // Add WordPress debug info to result
        ;(result as Record<string, unknown>).wordpress_debug = {
          event: wpResponse.event,
          result: wpResult,
          debug: wpDebug,
        }

        // Check if WordPress actually updated the page
        if (wpDebug?.wordpress_page_found === false) {
          result.errors.push('WordPress-Seite nicht gefunden (unicorn_studio_id nicht gefunden)')
        }
        if (wpDebug?.step === 'page_not_found') {
          result.errors.push('Seite nicht in API-Antwort gefunden')
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Page sync failed'
        console.error('[WordPress Push] sync.pages failed:', msg)
        result.errors.push(msg)
        result.results.pages = { count: 0, success: false, error: msg }
      }
      // No CSS sync for single page - only the page content
    } else {
      // Full sync: tell WordPress to do a complete sync
      try {
        await sendWebhook('sync.full', {})
        result.results.pages = { count: 0, success: true } // WordPress handles counting
        result.results.entries = { count: 0, success: true }
        result.results.content_types = { count: 0, success: true }
        result.results.css = { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Full sync failed'
        result.errors.push(msg)
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
