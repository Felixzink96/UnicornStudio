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
  params: Promise<{ siteId: string; assetId: string }>
}

/**
 * GET /api/v1/sites/:siteId/assets/:assetId
 * Get a single asset with download URL
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, assetId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Fetch asset
    const supabase = createAPIClient()

    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        uploaded_by:profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('id', assetId)
      .eq('site_id', siteId)
      .single()

    if (error || !asset) {
      return notFoundResponse('Asset')
    }

    // 4. Format response with download URL
    const uploadedBy = asset.uploaded_by as Record<string, unknown> | null

    const formattedAsset = {
      id: asset.id,
      name: asset.name,
      file_path: asset.file_path,
      file_url: asset.file_url,
      download_url: asset.file_url, // Same as file_url for direct downloads
      file_type: asset.file_type,
      mime_type: asset.mime_type,
      size_bytes: asset.size_bytes,
      size_formatted: formatFileSize(asset.size_bytes || 0),
      width: asset.width,
      height: asset.height,
      dimensions: asset.width && asset.height ? `${asset.width}x${asset.height}` : null,
      alt_text: asset.alt_text,
      folder: asset.folder,
      tags: asset.tags,
      uploaded_by: uploadedBy
        ? {
            id: uploadedBy.id,
            name: uploadedBy.full_name,
            email: uploadedBy.email,
          }
        : null,
      created_at: asset.created_at,
    }

    return successResponse(formattedAsset)
  } catch (error) {
    console.error('Asset detail API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * Format file size in human readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
