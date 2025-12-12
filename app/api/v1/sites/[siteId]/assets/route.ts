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
  calculatePagination,
  parsePaginationParams,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/assets
 * Get all assets (media) for a site
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

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const { page, perPage } = parsePaginationParams(searchParams)
    const offset = (page - 1) * perPage

    // Filters
    const fileType = searchParams.get('file_type')
    const folder = searchParams.get('folder')
    const search = searchParams.get('search')

    // 4. Query assets
    const supabase = createAPIClient()

    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .eq('site_id', siteId)

    if (fileType) {
      query = query.eq('file_type', fileType)
    }

    if (folder) {
      query = query.eq('folder', folder)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,alt_text.ilike.%${search}%`)
    }

    const { data: assets, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1)

    if (error) {
      console.error('Assets query error:', error)
      return serverErrorResponse('Failed to fetch assets', error.message)
    }

    // 5. Format response
    const formattedAssets = assets?.map((asset) => ({
      id: asset.id,
      name: asset.name,
      file_path: asset.file_path,
      file_url: asset.file_url,
      file_type: asset.file_type,
      mime_type: asset.mime_type,
      size_bytes: asset.size_bytes,
      width: asset.width,
      height: asset.height,
      alt_text: asset.alt_text,
      folder: asset.folder,
      tags: asset.tags,
      created_at: asset.created_at,
    }))

    return successResponse(
      formattedAssets,
      calculatePagination(count || 0, page, perPage)
    )
  } catch (error) {
    console.error('Assets API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
