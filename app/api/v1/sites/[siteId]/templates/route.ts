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
 * GET /api/v1/sites/:siteId/templates
 * Get all templates for a site
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

    // 4. Query templates
    const supabase = createAPIClient()

    let query = supabase
      .from('templates')
      .select('*')
      .eq('site_id', siteId)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: templates, error } = await query.order('priority', { ascending: false })

    if (error) {
      console.error('Templates query error:', error)
      return serverErrorResponse('Failed to fetch templates', error.message)
    }

    // 5. Format response
    const formattedTemplates = templates?.map((tpl) => ({
      id: tpl.id,
      name: tpl.name,
      description: tpl.description,
      type: tpl.type,
      conditions: tpl.conditions,
      html: tpl.html,
      priority: tpl.priority,
      is_default: tpl.is_default,
      created_at: tpl.created_at,
      updated_at: tpl.updated_at,
    }))

    return successResponse(formattedTemplates)
  } catch (error) {
    console.error('Templates API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
