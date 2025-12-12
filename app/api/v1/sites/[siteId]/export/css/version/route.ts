import { NextRequest } from 'next/server'
import crypto from 'crypto'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/export/css/version
 * Get CSS version hash for cache busting
 * Returns a hash that changes when CSS-relevant content changes
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

    // 3. Fetch timestamps of CSS-relevant tables
    const supabase = createAPIClient()

    const [designVarsRes, componentsRes, templatesRes, pagesRes] = await Promise.all([
      supabase
        .from('design_variables')
        .select('updated_at')
        .eq('site_id', siteId)
        .single(),
      supabase
        .from('cms_components')
        .select('updated_at')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('templates')
        .select('updated_at')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('pages')
        .select('updated_at')
        .eq('site_id', siteId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    // 4. Calculate version hash from latest update times
    const timestamps = [
      designVarsRes.data?.updated_at,
      componentsRes.data?.updated_at,
      templatesRes.data?.updated_at,
      pagesRes.data?.updated_at,
    ]
      .filter(Boolean)
      .sort()
      .reverse()

    const latestUpdate = timestamps[0] || new Date().toISOString()

    // Create a hash from site ID and latest timestamp
    const versionInput = `${siteId}-${latestUpdate}`
    const version = crypto.createHash('md5').update(versionInput).digest('hex').substring(0, 12)

    // 5. Return version info
    return successResponse({
      version,
      version_long: crypto.createHash('sha256').update(versionInput).digest('hex'),
      last_updated: latestUpdate,
      cache_url: `/api/v1/sites/${siteId}/export/css?v=${version}`,
    })
  } catch (error) {
    console.error('CSS version API error:', error)
    return serverErrorResponse('Failed to get CSS version')
  }
}
