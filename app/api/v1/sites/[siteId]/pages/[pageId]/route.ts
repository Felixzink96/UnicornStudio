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
  notFoundResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string; pageId: string }>
}

/**
 * GET /api/v1/sites/:siteId/pages/:pageId
 * Get a single page by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, pageId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Query single page
    const supabase = createAPIClient()

    const { data: page, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .eq('site_id', siteId)
      .single()

    if (error || !page) {
      return notFoundResponse('Page not found')
    }

    // 4. Format response (same format as pages list)
    const formattedPage = {
      id: page.id,
      name: page.name,
      slug: page.slug,
      path: `/${page.slug}`,
      title: page.name,
      html: page.html_content || '',
      content: page.content,
      is_home: page.is_home,
      is_published: page.is_published,
      seo: page.seo,
      settings: page.settings,
      sort_order: page.sort_order,
      created_at: page.created_at,
      updated_at: page.updated_at,
    }

    return successResponse(formattedPage)
  } catch (error) {
    console.error('Single page API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
