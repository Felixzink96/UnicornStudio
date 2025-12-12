import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
  [key: string]: unknown // Index signature for JSON compatibility
}

interface SiteIntegrations {
  wordpress?: WordPressConfig
}

/**
 * GET /api/internal/wordpress/test?siteId=:siteId
 * Test WordPress connection (uses session auth)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Get siteId from query
    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return Response.json({ success: false, error: { message: 'Site ID is required' } }, { status: 400 })
    }

    // Get site with integrations (RLS will handle access control)
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, integrations')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return Response.json({ success: false, error: { message: 'Site not found' } }, { status: 404 })
    }

    const integrations = site.integrations as SiteIntegrations | null
    const wpConfig = integrations?.wordpress

    if (!wpConfig?.enabled || !wpConfig?.api_url || !wpConfig?.api_key) {
      return Response.json({
        success: false,
        error: { message: 'WordPress ist nicht konfiguriert' },
      }, { status: 400 })
    }

    // Test connection to WordPress
    let connectionStatus: 'connected' | 'error' = 'error'
    let errorMessage: string | null = null

    try {
      // Try to reach the WordPress API test endpoint
      const testUrl = `${wpConfig.api_url.replace(/\/$/, '')}/test`
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${wpConfig.api_key}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })

      if (response.ok) {
        connectionStatus = 'connected'
      } else {
        const errorData = await response.json().catch(() => ({}))
        errorMessage = errorData.message || `HTTP ${response.status}`
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
          errorMessage = 'Zeituberschreitung - Server antwortet nicht'
        } else {
          errorMessage = err.message
        }
      } else {
        errorMessage = 'Verbindungsfehler'
      }
    }

    // Update connection status in database
    const updatedConfig: WordPressConfig = {
      ...wpConfig,
      connection_status: connectionStatus,
      last_connection_test: new Date().toISOString(),
    }

    const updatedIntegrations = {
      ...integrations,
      wordpress: updatedConfig,
    } as { [key: string]: Json | undefined }

    await supabase
      .from('sites')
      .update({
        integrations: updatedIntegrations,
      })
      .eq('id', siteId)

    // Return result
    return Response.json({
      success: true,
      data: {
        status: connectionStatus,
        domain: wpConfig.domain,
        tested_at: updatedConfig.last_connection_test,
        error: errorMessage,
      },
    })
  } catch (error) {
    console.error('WordPress test connection error:', error)
    return Response.json({
      success: false,
      error: { message: 'Ein unerwarteter Fehler ist aufgetreten' },
    }, { status: 500 })
  }
}
