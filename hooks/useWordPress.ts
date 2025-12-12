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
  publishToWordPress: () => Promise<void>
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
  const publishToWordPress = useCallback(async () => {
    if (!siteId || !config?.enabled) return

    setIsPublishing(true)
    try {
      const response = await fetch('/api/internal/wordpress/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh to get updated timestamps
        await refresh()
      } else {
        console.error('WordPress push failed:', data.error)
        // Optionally show toast notification here
      }
    } catch (error) {
      console.error('WordPress push error:', error)
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
