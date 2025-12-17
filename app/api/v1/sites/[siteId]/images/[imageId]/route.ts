import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
  hasPermission,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string; imageId: string }>
}

/**
 * GET /api/v1/sites/:siteId/images/:imageId
 * Get a single image
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, imageId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const supabase = createAPIClient()

    const { data: image, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', imageId)
      .eq('site_id', siteId)
      .single()

    if (error || !image) {
      return notFoundResponse('Image')
    }

    return successResponse(image)
  } catch (error) {
    console.error('Get image error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * PATCH /api/v1/sites/:siteId/images/:imageId
 * Update image metadata
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    if (!hasPermission(auth, 'write')) {
      return forbiddenResponse('Write permission required')
    }

    const { siteId, imageId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const body = await request.json()
    const { name, alt_text, folder, tags } = body as {
      name?: string
      alt_text?: string
      folder?: string
      tags?: string[]
    }

    const supabase = createAPIClient()

    // Check if image exists
    const { data: existing, error: fetchError } = await supabase
      .from('assets')
      .select('id')
      .eq('id', imageId)
      .eq('site_id', siteId)
      .single()

    if (fetchError || !existing) {
      return notFoundResponse('Image')
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (alt_text !== undefined) updates.alt_text = alt_text
    if (folder !== undefined) updates.folder = folder
    if (tags !== undefined) updates.tags = tags

    if (Object.keys(updates).length === 0) {
      return successResponse(existing)
    }

    const { data: image, error: updateError } = await supabase
      .from('assets')
      .update(updates)
      .eq('id', imageId)
      .select()
      .single()

    if (updateError) {
      console.error('Update image error:', updateError)
      return serverErrorResponse('Failed to update image', updateError.message)
    }

    return successResponse(image)
  } catch (error) {
    console.error('Update image error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * DELETE /api/v1/sites/:siteId/images/:imageId
 * Delete an image
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    if (!hasPermission(auth, 'write')) {
      return forbiddenResponse('Write permission required')
    }

    const { siteId, imageId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const supabase = createAPIClient()

    // Get file path first
    const { data: image, error: fetchError } = await supabase
      .from('assets')
      .select('file_path')
      .eq('id', imageId)
      .eq('site_id', siteId)
      .single()

    if (fetchError || !image) {
      return notFoundResponse('Image')
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('site-assets')
      .remove([image.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete record even if storage delete fails
    }

    // Delete record
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return serverErrorResponse('Failed to delete image', deleteError.message)
    }

    return successResponse({ deleted: true })
  } catch (error) {
    console.error('Delete image error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
