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

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId
 * Get detailed information about a specific site
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

    // 3. Fetch site with related counts
    const supabase = createAPIClient()

    const { data: site, error } = await supabase
      .from('sites')
      .select(`
        *,
        content_types (count),
        pages (count),
        entries (count),
        assets (count),
        design_variables (id)
      `)
      .eq('id', siteId)
      .single()

    if (error || !site) {
      return notFoundResponse('Site')
    }

    // 4. Format response
    const formattedSite = {
      id: site.id,
      name: site.name,
      slug: site.slug,
      description: site.description,
      thumbnail_url: site.thumbnail_url,
      subdomain: site.subdomain,
      custom_domain: site.custom_domain,
      settings: site.settings,
      seo: site.seo,
      seo_settings: site.seo_settings,
      integrations: site.integrations,
      status: site.status,
      published_at: site.published_at,
      created_at: site.created_at,
      updated_at: site.updated_at,
      stats: {
        content_types_count: (site.content_types as unknown as { count: number }[])?.length || 0,
        pages_count: (site.pages as unknown as { count: number }[])?.length || 0,
        entries_count: (site.entries as unknown as { count: number }[])?.length || 0,
        assets_count: (site.assets as unknown as { count: number }[])?.length || 0,
        has_design_variables: !!site.design_variables,
      },
    }

    return successResponse(formattedSite)
  } catch (error) {
    console.error('Site detail API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
