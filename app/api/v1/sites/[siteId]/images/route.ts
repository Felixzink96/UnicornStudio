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
  serverErrorResponse,
  validationErrorResponse,
  calculatePagination,
  parsePaginationParams,
} from '@/lib/api/responses'
import { nanoid } from 'nanoid'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/images
 * Get all images for a site
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

    const { searchParams } = new URL(request.url)
    const { page, perPage } = parsePaginationParams(searchParams)
    const offset = (page - 1) * perPage

    const folder = searchParams.get('folder')
    const search = searchParams.get('search')

    const supabase = createAPIClient()

    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)
      .eq('file_type', 'image')

    if (folder) {
      query = query.eq('folder', folder)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,alt_text.ilike.%${search}%`)
    }

    const { data: images, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      console.error('Images query error:', error)
      return serverErrorResponse('Failed to fetch images', error.message)
    }

    return successResponse(images, calculatePagination(count || 0, page, perPage))
  } catch (error) {
    console.error('Images API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * POST /api/v1/sites/:siteId/images
 * Upload a new image
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    if (!hasPermission(auth, 'write')) {
      return forbiddenResponse('Write permission required')
    }

    const { siteId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || '/'
    const altText = formData.get('alt_text') as string | null

    if (!file) {
      return validationErrorResponse('No file provided')
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return validationErrorResponse('File must be an image')
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return validationErrorResponse('File size must be less than 10MB')
    }

    const supabase = createAPIClient()

    // Generate unique filename
    const timestamp = Date.now()
    const random = nanoid(6)
    const ext = file.name.split('.').pop() || 'jpg'
    const baseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50)
    const filename = `${baseName}-${timestamp}-${random}.${ext}`

    // Construct storage path
    const storagePath = `sites/${siteId}/images${folder === '/' ? '' : folder}/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(storagePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return serverErrorResponse('Failed to upload file', uploadError.message)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('site-assets')
      .getPublicUrl(storagePath)

    // Get image dimensions (if possible via fetch and decode)
    let width: number | null = null
    let height: number | null = null

    // Create asset record
    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        site_id: siteId,
        uploaded_by: null,  // API key auth doesn't have userId
        name: file.name,
        file_path: storagePath,
        file_url: urlData.publicUrl,
        file_type: 'image',
        mime_type: file.type,
        size_bytes: file.size,
        width,
        height,
        alt_text: altText || null,
        folder,
        tags: [],
        original_filename: file.name,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up uploaded file
      await supabase.storage.from('site-assets').remove([storagePath])
      return serverErrorResponse('Failed to save image record', dbError.message)
    }

    return successResponse(asset, undefined, 201)
  } catch (error) {
    console.error('Image upload error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * DELETE /api/v1/sites/:siteId/images
 * Bulk delete images (pass IDs in request body)
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

    const { siteId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const body = await request.json()
    const { ids } = body as { ids: string[] }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return validationErrorResponse('No image IDs provided')
    }

    const supabase = createAPIClient()

    // Get file paths first
    const { data: images, error: fetchError } = await supabase
      .from('assets')
      .select('id, file_path')
      .eq('site_id', siteId)
      .in('id', ids)

    if (fetchError) {
      console.error('Fetch images error:', fetchError)
      return serverErrorResponse('Failed to fetch images', fetchError.message)
    }

    if (!images || images.length === 0) {
      return validationErrorResponse('No images found with provided IDs')
    }

    // Delete from storage
    const paths = images.map(img => img.file_path)
    const { error: storageError } = await supabase.storage
      .from('site-assets')
      .remove(paths)

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue to delete records even if storage delete fails
    }

    // Delete records
    const imageIds = images.map(img => img.id)
    const { error: dbError } = await supabase
      .from('assets')
      .delete()
      .in('id', imageIds)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return serverErrorResponse('Failed to delete images', dbError.message)
    }

    return successResponse({ deleted: imageIds.length })
  } catch (error) {
    console.error('Image delete error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
