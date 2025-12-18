/**
 * Menu API Routes
 *
 * GET  /api/v1/sites/:siteId/menus - Alle Menüs abrufen
 * POST /api/v1/sites/:siteId/menus - Neues Menü erstellen
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMenus, getMenusForWordPress, createMenu } from '@/lib/supabase/queries/menus'
import {
  authenticateAPIRequest,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/responses'
import type { CreateMenuRequest } from '@/types/menu'

interface RouteContext {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/menus
 * Alle Menüs einer Site abrufen
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await context.params

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // Check if this is a WordPress sync request (needs full items)
    const includeItems = request.nextUrl.searchParams.get('includeItems') === 'true'

    // Debug: Log the raw URL and query params
    console.log('[Menus API] Full URL:', request.url)
    console.log('[Menus API] Query param includeItems:', request.nextUrl.searchParams.get('includeItems'))

    let menus
    if (includeItems) {
      // For WordPress sync: include all menu items
      console.log('[Menus API] Calling getMenusForWordPress...')
      menus = await getMenusForWordPress(siteId)
      console.log('[Menus API] getMenusForWordPress returned:', menus.length, 'menus')
      // Log items count for each menu
      menus.forEach((m, i) => {
        console.log(`[Menus API] Menu ${i}: "${m.name}" has ${m.items?.length || 0} items`)
      })
    } else {
      // For dashboard/list view: just metadata
      console.log('[Menus API] Calling getMenus (no items)...')
      menus = await getMenus(siteId)
    }

    // Debug logging
    console.log('[Menus API] Site ID:', siteId)
    console.log('[Menus API] Include items:', includeItems)
    console.log('[Menus API] Menus count:', menus.length)

    // Return menus directly - successResponse wraps in { success: true, data: ... }
    return successResponse(menus)
  } catch (error) {
    console.error('Error fetching menus:', error)
    return serverErrorResponse('Failed to fetch menus')
  }
}

/**
 * POST /api/v1/sites/:siteId/menus
 * Neues Menü erstellen
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { siteId } = await context.params
    const body = await request.json()

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }

    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const menuData: CreateMenuRequest = {
      siteId,
      name: body.name,
      slug: body.slug,
      position: body.position || 'custom',
      description: body.description,
      settings: body.settings,
    }

    const menuId = await createMenu(menuData)

    // Return menu object directly (frontend expects { id: ... })
    return NextResponse.json({ id: menuId })
  } catch (error) {
    console.error('Error creating menu:', error)
    return NextResponse.json(
      { error: 'Failed to create menu', details: String(error) },
      { status: 500 }
    )
  }
}
