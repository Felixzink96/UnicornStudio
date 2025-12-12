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
 * GET /api/v1/sites/:siteId/content-types
 * Get all content types for a site with their fields
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

    // 3. Query content types with fields
    const supabase = createAPIClient()

    const { data: contentTypes, error } = await supabase
      .from('content_types')
      .select(`
        *,
        fields (*)
      `)
      .eq('site_id', siteId)
      .order('menu_position')

    if (error) {
      console.error('Content types query error:', error)
      return serverErrorResponse('Failed to fetch content types', error.message)
    }

    // 4. Get entry counts for each content type
    const { data: entryCounts } = await supabase
      .from('entries')
      .select('content_type_id')
      .eq('site_id', siteId)

    const countMap = (entryCounts || []).reduce((acc, entry) => {
      acc[entry.content_type_id] = (acc[entry.content_type_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // 5. Format response
    const formattedTypes = contentTypes?.map((ct) => ({
      id: ct.id,
      name: ct.name,
      label_singular: ct.label_singular,
      label_plural: ct.label_plural,
      slug: ct.slug,
      icon: ct.icon,
      description: ct.description,
      color: ct.color,
      features: {
        has_title: ct.has_title,
        has_slug: ct.has_slug,
        has_content: ct.has_content,
        has_excerpt: ct.has_excerpt,
        has_featured_image: ct.has_featured_image,
        has_author: ct.has_author,
        has_published_date: ct.has_published_date,
        has_seo: ct.has_seo,
        has_archive: ct.has_archive,
        has_single: ct.has_single,
      },
      default_sort: {
        field: ct.default_sort_field,
        order: ct.default_sort_order,
      },
      menu_position: ct.menu_position,
      show_in_menu: ct.show_in_menu,
      seo_template: ct.seo_template,
      entries_count: countMap[ct.id] || 0,
      fields: ((ct.fields as unknown as Array<{
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
      created_at: ct.created_at,
      updated_at: ct.updated_at,
    }))

    return successResponse(formattedTypes)
  } catch (error) {
    console.error('Content types API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
