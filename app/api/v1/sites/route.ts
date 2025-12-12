import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
  calculatePagination,
  parsePaginationParams,
} from '@/lib/api/responses'

/**
 * GET /api/v1/sites
 * List all sites the API key has access to
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success || !auth.organizationId) {
      return unauthorizedResponse(auth.error || 'Missing organization')
    }

    // 2. Parse pagination
    const { searchParams } = new URL(request.url)
    const { page, perPage } = parsePaginationParams(searchParams)
    const offset = (page - 1) * perPage

    // 3. Query sites
    const supabase = createAPIClient()

    let query = supabase
      .from('sites')
      .select('*', { count: 'exact' })
      .eq('organization_id', auth.organizationId)

    // Filter by allowed sites if restricted
    if (auth.allowedSites && auth.allowedSites.length > 0) {
      query = query.in('id', auth.allowedSites)
    }

    // Apply pagination
    const { data: sites, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      console.error('Sites query error:', error)
      return serverErrorResponse('Failed to fetch sites', error.message)
    }

    // 4. Format response
    const formattedSites = sites?.map((site) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      description: site.description,
      thumbnail_url: site.thumbnail_url,
      subdomain: site.subdomain,
      custom_domain: site.custom_domain,
      status: site.status,
      published_at: site.published_at,
      created_at: site.created_at,
      updated_at: site.updated_at,
    }))

    return successResponse(
      formattedSites,
      calculatePagination(count || 0, page, perPage)
    )
  } catch (error) {
    console.error('Sites API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
