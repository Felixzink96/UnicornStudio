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
  serverErrorResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/components
 * Get all CMS components for a site
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

    // 3. Parse filters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')

    // 4. Query components
    const supabase = createAPIClient()

    let query = supabase
      .from('cms_components')
      .select('*')
      .eq('site_id', siteId)

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data: components, error } = await query.order('name')

    if (error) {
      console.error('Components query error:', error)
      return serverErrorResponse('Failed to fetch components', error.message)
    }

    // 5. Format response
    const formattedComponents = components?.map((comp) => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      type: comp.type,
      category: comp.category,
      tags: comp.tags,
      html: comp.html,
      variants: comp.variants,
      default_variant: comp.default_variant,
      props: comp.props,
      thumbnail_url: comp.thumbnail_url,
      usage_count: comp.usage_count,
      created_at: comp.created_at,
      updated_at: comp.updated_at,
    }))

    return successResponse(formattedComponents)
  } catch (error) {
    console.error('Components API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
