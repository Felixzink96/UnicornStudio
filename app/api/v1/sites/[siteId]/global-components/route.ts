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
  createdResponse,
} from '@/lib/api/responses'
import type {
  GlobalComponentInsert,
  ComponentPosition,
} from '@/types/global-components'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/global-components
 * Get all global components (component library) for a site
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

    // Parse filters
    const { searchParams } = new URL(request.url)
    const position = searchParams.get('position') as ComponentPosition | null
    const isGlobal = searchParams.get('is_global')
    const category = searchParams.get('category')

    const supabase = createAPIClient()

    // Use RPC function for component library
    const { data: components, error } = await supabase.rpc(
      'get_component_library',
      { p_site_id: siteId }
    )

    if (error) {
      console.error('Global components query error:', error)
      return serverErrorResponse('Failed to fetch global components', error.message)
    }

    // Apply filters
    let filteredComponents = components || []

    if (position) {
      filteredComponents = filteredComponents.filter(
        (c: { component_position: string }) => c.component_position === position
      )
    }

    if (isGlobal !== null) {
      const globalFilter = isGlobal === 'true'
      filteredComponents = filteredComponents.filter(
        (c: { is_global: boolean }) => c.is_global === globalFilter
      )
    }

    if (category) {
      filteredComponents = filteredComponents.filter(
        (c: { category: string | null }) => c.category === category
      )
    }

    return successResponse(filteredComponents)
  } catch (error) {
    console.error('Global components API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * POST /api/v1/sites/:siteId/global-components
 * Create a new global component
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = (await request.json()) as GlobalComponentInsert & {
      set_as_site_default?: boolean
    }

    // Validate required fields
    if (!body.name || !body.html) {
      return badRequestResponse('Name and HTML are required')
    }

    // Validate position
    const validPositions: ComponentPosition[] = ['header', 'footer', 'content']
    if (body.position && !validPositions.includes(body.position)) {
      return badRequestResponse('Invalid position. Must be header, footer, or content')
    }

    const supabase = createAPIClient()

    // Use RPC function for creating global component
    const { data: componentId, error } = await supabase.rpc(
      'create_global_component',
      {
        p_site_id: siteId,
        p_name: body.name,
        p_html: body.html,
        p_css: body.css ?? undefined,
        p_js: body.js ?? undefined,
        p_position: body.position ?? 'content',
        p_description: body.description ?? undefined,
        p_category: body.category ?? undefined,
        p_set_as_site_default: body.set_as_site_default ?? false,
      }
    )

    if (error) {
      console.error('Create global component error:', error)
      return serverErrorResponse('Failed to create component', error.message)
    }

    // Fetch the created component
    const { data: component, error: fetchError } = await supabase
      .from('components')
      .select('*')
      .eq('id', componentId)
      .single()

    if (fetchError) {
      console.error('Fetch created component error:', fetchError)
      return serverErrorResponse('Component created but failed to fetch', fetchError.message)
    }

    return createdResponse(component)
  } catch (error) {
    console.error('Create global component API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
