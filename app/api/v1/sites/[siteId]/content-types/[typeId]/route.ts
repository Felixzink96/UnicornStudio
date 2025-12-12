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
  params: Promise<{ siteId: string; typeId: string }>
}

/**
 * GET /api/v1/sites/:siteId/content-types/:typeId
 * Get a single content type with all fields
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, typeId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Query content type with fields
    const supabase = createAPIClient()

    const { data: contentType, error } = await supabase
      .from('content_types')
      .select(`
        *,
        fields (*)
      `)
      .eq('id', typeId)
      .eq('site_id', siteId)
      .single()

    if (error || !contentType) {
      return notFoundResponse('Content Type')
    }

    // 4. Get entry count
    const { count: entriesCount } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', typeId)

    // 5. Format response
    const formattedType = {
      id: contentType.id,
      name: contentType.name,
      label_singular: contentType.label_singular,
      label_plural: contentType.label_plural,
      slug: contentType.slug,
      icon: contentType.icon,
      description: contentType.description,
      color: contentType.color,
      features: {
        has_title: contentType.has_title,
        has_slug: contentType.has_slug,
        has_content: contentType.has_content,
        has_excerpt: contentType.has_excerpt,
        has_featured_image: contentType.has_featured_image,
        has_author: contentType.has_author,
        has_published_date: contentType.has_published_date,
        has_seo: contentType.has_seo,
        has_archive: contentType.has_archive,
        has_single: contentType.has_single,
      },
      default_sort: {
        field: contentType.default_sort_field,
        order: contentType.default_sort_order,
      },
      menu_position: contentType.menu_position,
      show_in_menu: contentType.show_in_menu,
      seo_template: contentType.seo_template,
      entries_count: entriesCount || 0,
      fields: ((contentType.fields as unknown as Array<{
        id: string
        name: string
        label: string
        type: string
        instructions: string | null
        placeholder: string | null
        required: boolean
        settings: Record<string, unknown>
        sub_fields: unknown
        layouts: unknown
        conditions: unknown
        width: string
        position: number
      }>) || [])
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map((f) => ({
          id: f.id,
          name: f.name,
          label: f.label,
          type: f.type,
          instructions: f.instructions,
          placeholder: f.placeholder,
          required: f.required,
          settings: f.settings,
          sub_fields: f.sub_fields,
          layouts: f.layouts,
          conditions: f.conditions,
          width: f.width,
          position: f.position,
        })),
      created_at: contentType.created_at,
      updated_at: contentType.updated_at,
    }

    return successResponse(formattedType)
  } catch (error) {
    console.error('Content type detail API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
