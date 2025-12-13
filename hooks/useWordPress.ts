'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
}

export type WordPressStatus = 'current' | 'outdated' | 'error' | 'not_configured'

export interface WordPressDebugInfo {
  event?: string
  result?: {
    success?: boolean
    action?: string
    post_id?: number
    error?: string
    debug?: {
      step?: string
      page_id_received?: string
      timestamp?: string
      api_response_keys?: string[] | string
      api_response_success?: boolean | string
      api_config?: {
        base_url?: string
        site_id?: string
        api_key_set?: boolean
      }
      error_code?: string
      error_data?: {
        url?: string
        status?: number
        wp_error?: string
        raw_body?: string
        [key: string]: unknown
      }
      page_data?: {
        id?: string
        name?: string
        slug?: string
        title?: string
        html_length?: number
        is_published?: boolean | string
        has_content?: boolean
      }
      wordpress_lookup?: {
        searched_unicorn_id?: string
        found?: boolean
        wp_post_id?: number | null
        wp_post_title?: string | null
        wp_post_status?: string | null
      }
      wordpress_page_found?: number | false
      wordpress_page_title?: string | null
      action_taken?: string
      resulting_post_id?: number | null
    }
  }
  debug?: Record<string, unknown>
}

export interface PushResult {
  success: boolean
  message: string
  details?: {
    content_types?: { count: number; success: boolean; error?: string }
    entries?: { count: number; success: boolean; error?: string }
    pages?: { count: number; success: boolean; error?: string }
    taxonomies?: { count: number; success: boolean; error?: string }
    css?: { success: boolean; error?: string }
  }
  errors?: string[]
  wordpressDebug?: WordPressDebugInfo
}

interface SiteIntegrations {
  wordpress?: WordPressConfig
}

interface Webhook {
  id: string
  url: string
  is_active: boolean
  last_triggered_at: string | null
  last_status_code: number | null
  success_count: number
  failure_count: number
}

interface UseWordPressReturn {
  config: WordPressConfig | null
  status: WordPressStatus
  lastPushedAt: string | null
  isPublishing: boolean
  publishToWordPress: (pageId?: string) => Promise<PushResult>
  refresh: () => Promise<void>
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return ''
  }
}

// Check if URL looks like a WordPress webhook
function isWordPressWebhook(url: string): boolean {
  return url.includes('wp-json') || url.includes('wordpress') || url.includes('/unicorn-studio/')
}

export function useWordPress(siteId: string | null): UseWordPressReturn {
  const [config, setConfig] = useState<WordPressConfig | null>(null)
  const [lastPushedAt, setLastPushedAt] = useState<string | null>(null)
  const [siteUpdatedAt, setSiteUpdatedAt] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)

  // Calculate status
  const getStatus = useCallback((): WordPressStatus => {
    if (!config?.enabled) return 'not_configured'
    if (config.connection_status === 'error') return 'error'
    if (!lastPushedAt) return 'outdated'
    if (siteUpdatedAt && new Date(siteUpdatedAt) > new Date(lastPushedAt)) return 'outdated'
    return 'current'
  }, [config, lastPushedAt, siteUpdatedAt])

  // Load WordPress config from site OR detect from webhooks
  const refresh = useCallback(async () => {
    if (!siteId) return

    const supabase = createClient()

    // Load site data
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('integrations, updated_at, last_pushed_to_wordpress_at')
      .eq('id', siteId)
      .single()

    if (siteError || !site) return

    const integrations = site.integrations as SiteIntegrations | null
    setLastPushedAt((site as { last_pushed_to_wordpress_at?: string | null }).last_pushed_to_wordpress_at || null)
    setSiteUpdatedAt(site.updated_at || null)

    // If WordPress is already configured in integrations, use that
    if (integrations?.wordpress?.enabled) {
      setConfig(integrations.wordpress)
      return
    }

    // Otherwise, check for active WordPress webhooks
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)

    if (webhooksError || !webhooks || webhooks.length === 0) {
      setConfig(null)
      return
    }

    // Find WordPress webhook
    const wpWebhook = (webhooks as Webhook[]).find((w) => isWordPressWebhook(w.url))

    if (wpWebhook) {
      // Auto-detect WordPress connection from webhook
      const domain = extractDomain(wpWebhook.url)
      const hasRecentSuccess = wpWebhook.last_status_code === 200 || (wpWebhook.success_count ?? 0) > 0
      const hasRecentFailure = (wpWebhook.failure_count ?? 0) > 3

      setConfig({
        enabled: true,
        api_url: wpWebhook.url.replace(/\/webhook\/?$/, ''), // Remove /webhook from end
        api_key: '', // Not stored in webhook
        domain: domain,
        connection_status: hasRecentFailure ? 'error' : (hasRecentSuccess ? 'connected' : 'untested'),
        last_connection_test: wpWebhook.last_triggered_at,
      })
    } else {
      setConfig(null)
    }
  }, [siteId])

  // Load on mount and when siteId changes
  useEffect(() => {
    refresh()
  }, [refresh])

  // Publish to WordPress
  const publishToWordPress = useCallback(async (pageId?: string): Promise<PushResult> => {
    if (!siteId || !config?.enabled) {
      return {
        success: false,
        message: 'Keine WordPress-Verbindung konfiguriert',
      }
    }

    setIsPublishing(true)
    try {
      const response = await fetch('/api/internal/wordpress/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, pageId }), // Optional: only push specific page
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Refresh to get updated timestamps
        await refresh()

        const results = data.data.results || {}
        const pageCount = results.pages?.count || 0
        const entryCount = results.entries?.count || 0
        const errors = data.data.errors || []
        const wpDebug = data.data.wordpress_debug as WordPressDebugInfo | undefined

        // Log debug info to console for easier debugging
        if (wpDebug) {
          console.log('[WordPress Push Debug]', JSON.stringify(wpDebug, null, 2))
        }

        return {
          success: errors.length === 0,
          message: errors.length === 0
            ? `Erfolgreich gepusht: ${pageCount} Seiten, ${entryCount} Einträge`
            : `Push mit Fehlern: ${errors.join(', ')}`,
          details: results,
          errors: errors,
          wordpressDebug: wpDebug,
        }
      } else {
        const errorMsg = data.error?.message || 'Unbekannter Fehler'
        console.error('WordPress push failed:', data.error)
        return {
          success: false,
          message: `Push fehlgeschlagen: ${errorMsg}`,
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Netzwerkfehler'
      console.error('WordPress push error:', error)
      return {
        success: false,
        message: `Verbindungsfehler: ${errorMsg}`,
      }
    } finally {
      setIsPublishing(false)
    }
  }, [siteId, config, refresh])

  return {
    config,
    status: getStatus(),
    lastPushedAt,
    isPublishing,
    publishToWordPress,
    refresh,
  }
}
