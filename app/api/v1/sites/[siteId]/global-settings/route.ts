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
  badRequestResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/global-settings
 * Get site's global header and footer settings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const supabase = createAPIClient()

    // Get site with global header and footer
    const { data: site, error } = await supabase
      .from('sites')
      .select(`
        id,
        global_header_id,
        global_footer_id,
        global_header:components!sites_global_header_id_fkey(id, name, html, css, js, position),
        global_footer:components!sites_global_footer_id_fkey(id, name, html, css, js, position)
      `)
      .eq('id', siteId)
      .single()

    if (error) {
      console.error('Get global settings error:', error)
      // Fallback query without joins if foreign key doesn't exist yet
      const { data: simpleSite, error: simpleError } = await supabase
        .from('sites')
        .select('id, global_header_id, global_footer_id')
        .eq('id', siteId)
        .single()

      if (simpleError) {
        return serverErrorResponse('Failed to fetch global settings', simpleError.message)
      }

      return successResponse({
        global_header_id: simpleSite?.global_header_id || null,
        global_footer_id: simpleSite?.global_footer_id || null,
        global_header: null,
        global_footer: null,
      })
    }

    return successResponse({
      global_header_id: site.global_header_id,
      global_footer_id: site.global_footer_id,
      global_header: site.global_header,
      global_footer: site.global_footer,
    })
  } catch (error) {
    console.error('Get global settings API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * PUT /api/v1/sites/:siteId/global-settings
 * Update site's global header and footer
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    const access = await validateSiteAccess(auth, siteId, ['write'])
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const body = await request.json()
    const { global_header_id, global_footer_id } = body

    const supabase = createAPIClient()

    // Validate header if provided
    if (global_header_id !== undefined && global_header_id !== null) {
      const { data: header, error: headerError } = await supabase
        .from('components')
        .select('id, position')
        .eq('id', global_header_id)
        .eq('site_id', siteId)
        .single()

      if (headerError || !header) {
        return badRequestResponse('Invalid header component ID')
      }

      if (header.position !== 'header') {
        return badRequestResponse('Selected component is not a header')
      }
    }

    // Validate footer if provided
    if (global_footer_id !== undefined && global_footer_id !== null) {
      const { data: footer, error: footerError } = await supabase
        .from('components')
        .select('id, position')
        .eq('id', global_footer_id)
        .eq('site_id', siteId)
        .single()

      if (footerError || !footer) {
        return badRequestResponse('Invalid footer component ID')
      }

      if (footer.position !== 'footer') {
        return badRequestResponse('Selected component is not a footer')
      }
    }

    // Update site
    const updateData: Record<string, string | null> = {}
    if (global_header_id !== undefined) {
      updateData.global_header_id = global_header_id
    }
    if (global_footer_id !== undefined) {
      updateData.global_footer_id = global_footer_id
    }

    const { data: site, error } = await supabase
      .from('sites')
      .update(updateData)
      .eq('id', siteId)
      .select('id, global_header_id, global_footer_id')
      .single()

    if (error) {
      console.error('Update global settings error:', error)
      return serverErrorResponse('Failed to update global settings', error.message)
    }

    return successResponse(site)
  } catch (error) {
    console.error('Update global settings API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
