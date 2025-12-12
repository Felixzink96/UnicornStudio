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
 * GET /api/v1/sites/:siteId/pages
 * Get all pages for a site with their HTML content
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

    // 3. Query pages
    const supabase = createAPIClient()

    const { data: pages, error } = await supabase
      .from('pages')
      .select('*')
      .eq('site_id', siteId)
      .order('name')

    if (error) {
      console.error('Pages query error:', error)
      return serverErrorResponse('Failed to fetch pages', error.message)
    }

    // 4. Format response
    const formattedPages = pages?.map((page) => ({
      id: page.id,
      name: page.name,
      slug: page.slug,
      path: `/${page.slug}`, // Generate path from slug
      title: page.name, // Use name as title
      html: page.html_content || '',
      content: page.content,
      is_home: page.is_home,
      is_published: page.is_published,
      seo: page.seo,
      settings: page.settings,
      sort_order: page.sort_order,
      created_at: page.created_at,
      updated_at: page.updated_at,
    }))

    return successResponse(formattedPages)
  } catch (error) {
    console.error('Pages API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
