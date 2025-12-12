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
 * GET /api/v1/sites/:siteId/taxonomies
 * Get all taxonomies for a site with term counts
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

    // 3. Query taxonomies
    const supabase = createAPIClient()

    const { data: taxonomies, error } = await supabase
      .from('taxonomies')
      .select(`
        *,
        terms (count)
      `)
      .eq('site_id', siteId)
      .order('name')

    if (error) {
      console.error('Taxonomies query error:', error)
      return serverErrorResponse('Failed to fetch taxonomies', error.message)
    }

    // 4. Get associated content types
    const { data: contentTypes } = await supabase
      .from('content_types')
      .select('id, name, label_singular')
      .eq('site_id', siteId)

    const ctMap = new Map(contentTypes?.map((ct) => [ct.id, ct]) || [])

    // 5. Format response
    const formattedTaxonomies = taxonomies?.map((tax) => ({
      id: tax.id,
      name: tax.name,
      label_singular: tax.label_singular,
      label_plural: tax.label_plural,
      slug: tax.slug,
      hierarchical: tax.hierarchical,
      terms_count: (tax.terms as unknown as { count: number }[])?.length || 0,
      content_types: (tax.content_type_ids || [])
        .map((id: string) => ctMap.get(id))
        .filter(Boolean)
        .map((ct) => ({
          id: ct!.id,
          name: ct!.name,
          label: ct!.label_singular,
        })),
      created_at: tax.created_at,
      updated_at: tax.updated_at,
    }))

    return successResponse(formattedTaxonomies)
  } catch (error) {
    console.error('Taxonomies API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
