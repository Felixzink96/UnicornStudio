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
  badRequestResponse,
} from '@/lib/api/responses'
import type { GlobalComponentUpdate, ComponentPosition } from '@/types/global-components'

interface RouteParams {
  params: Promise<{ siteId: string; componentId: string }>
}

/**
 * GET /api/v1/sites/:siteId/global-components/:componentId
 * Get a single global component with usage count
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, componentId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const supabase = createAPIClient()

    // Fetch component
    const { data: component, error } = await supabase
      .from('components')
      .select('*')
      .eq('id', componentId)
      .eq('site_id', siteId)
      .single()

    if (error || !component) {
      return notFoundResponse('Component not found')
    }

    // Get usage count via RPC function
    const { data: usageCount } = await supabase.rpc('get_component_usage_count', {
      p_component_id: componentId,
    })

    return successResponse({
      ...component,
      usage_count: usageCount || 0,
    })
  } catch (error) {
    console.error('Get global component API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * PUT /api/v1/sites/:siteId/global-components/:componentId
 * Update a global component
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, componentId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const body = (await request.json()) as GlobalComponentUpdate

    // Validate position if provided
    const validPositions: ComponentPosition[] = ['header', 'footer', 'content']
    if (body.position && !validPositions.includes(body.position)) {
      return badRequestResponse('Invalid position. Must be header, footer, or content')
    }

    const supabase = createAPIClient()

    // Check component exists and belongs to site
    const { data: existing, error: checkError } = await supabase
      .from('components')
      .select('id, position')
      .eq('id', componentId)
      .eq('site_id', siteId)
      .single()

    if (checkError || !existing) {
      return notFoundResponse('Component not found')
    }

    // Build update object - only include fields that are provided
    const updateData: Record<string, unknown> = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.html !== undefined) updateData.html = body.html
    if (body.css !== undefined) updateData.css = body.css
    if (body.js !== undefined) updateData.js = body.js
    if (body.thumbnail_url !== undefined) updateData.thumbnail_url = body.thumbnail_url

    // Handle position change
    if (body.position !== undefined) {
      updateData.position = body.position
      // If changing to header or footer, automatically set as global
      if (body.position === 'header' || body.position === 'footer') {
        updateData.is_global = true
        updateData.auto_include = true
      }
    }

    // Handle explicit is_global and auto_include
    if (body.is_global !== undefined) updateData.is_global = body.is_global
    if (body.auto_include !== undefined) updateData.auto_include = body.auto_include

    // Update component
    const { data: component, error } = await supabase
      .from('components')
      .update(updateData)
      .eq('id', componentId)
      .select()
      .single()

    if (error) {
      console.error('Update global component error:', error)
      return serverErrorResponse('Failed to update component', error.message)
    }

    return successResponse(component)
  } catch (error) {
    console.error('Update global component API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * DELETE /api/v1/sites/:siteId/global-components/:componentId
 * Delete a global component
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, componentId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const supabase = createAPIClient()

    // Check component exists and belongs to site
    const { data: existing, error: checkError } = await supabase
      .from('components')
      .select('id, position')
      .eq('id', componentId)
      .eq('site_id', siteId)
      .single()

    if (checkError || !existing) {
      return notFoundResponse('Component not found')
    }

    // If it's a global header/footer, remove from site
    if (existing.position === 'header') {
      await supabase
        .from('sites')
        .update({ global_header_id: null })
        .eq('id', siteId)
        .eq('global_header_id', componentId)
    } else if (existing.position === 'footer') {
      await supabase
        .from('sites')
        .update({ global_footer_id: null })
        .eq('id', siteId)
        .eq('global_footer_id', componentId)
    }

    // Also remove from any pages that use it as custom header/footer
    await supabase
      .from('pages')
      .update({ custom_header_id: null })
      .eq('site_id', siteId)
      .eq('custom_header_id', componentId)

    await supabase
      .from('pages')
      .update({ custom_footer_id: null })
      .eq('site_id', siteId)
      .eq('custom_footer_id', componentId)

    // Delete the component
    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', componentId)

    if (error) {
      console.error('Delete global component error:', error)
      return serverErrorResponse('Failed to delete component', error.message)
    }

    return successResponse({ message: 'Component deleted successfully' })
  } catch (error) {
    console.error('Delete global component API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
