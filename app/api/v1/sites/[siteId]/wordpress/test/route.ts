import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
  hasPermission,
} from '@/lib/api/auth'
import type { Json } from '@/types/database'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  validationErrorResponse,
} from '@/lib/api/responses'

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
  [key: string]: unknown // Index signature for JSON compatibility
}

interface SiteIntegrations {
  wordpress?: WordPressConfig
}

/**
 * GET /api/v1/sites/:siteId/wordpress/test
 * Test WordPress connection
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
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

    // 3. Get site with integrations
    const supabase = createAPIClient()
    const { data: site, error } = await supabase
      .from('sites')
      .select('id, integrations')
      .eq('id', siteId)
      .single()

    if (error || !site) {
      return notFoundResponse('Site')
    }

    const integrations = site.integrations as SiteIntegrations | null
    const wpConfig = integrations?.wordpress

    if (!wpConfig?.enabled || !wpConfig?.api_url || !wpConfig?.api_key) {
      return validationErrorResponse('WordPress ist nicht konfiguriert')
    }

    // 4. Test connection to WordPress
    let connectionStatus: 'connected' | 'error' = 'error'
    let errorMessage: string | null = null

    try {
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
      errorMessage = err instanceof Error ? err.message : 'Verbindungsfehler'
    }

    // 5. Update connection status in database
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

    // 6. Return result
    return successResponse({
      status: connectionStatus,
      domain: wpConfig.domain,
      tested_at: updatedConfig.last_connection_test,
      error: errorMessage,
    })
  } catch (error) {
    console.error('WordPress test connection error:', error)
    return serverErrorResponse('Ein unerwarteter Fehler ist aufgetreten')
  }
}
