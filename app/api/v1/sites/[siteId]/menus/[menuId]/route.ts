/**
 * Single Menu API Routes
 *
 * GET    /api/v1/sites/:siteId/menus/:menuId - Menü mit Items abrufen
 * PUT    /api/v1/sites/:siteId/menus/:menuId - Menü aktualisieren
 * DELETE /api/v1/sites/:siteId/menus/:menuId - Menü löschen
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMenu, updateMenu, deleteMenu } from '@/lib/supabase/queries/menus'
import type { UpdateMenuRequest } from '@/types/menu'

interface RouteContext {
  params: Promise<{ siteId: string; menuId: string }>
}

/**
 * GET /api/v1/sites/:siteId/menus/:menuId
 * Einzelnes Menü mit allen Items abrufen
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { siteId, menuId } = await context.params

    if (!siteId || !menuId) {
      return NextResponse.json(
        { error: 'Site ID and Menu ID required' },
        { status: 400 }
      )
    }

    const menu = await getMenu(menuId)

    if (!menu) {
      return NextResponse.json({ error: 'Menu not found' }, { status: 404 })
    }

    // Site ID setzen
    menu.siteId = siteId

    return NextResponse.json({
      success: true,
      data: menu,
    })
  } catch (error) {
    console.error('Error fetching menu:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/sites/:siteId/menus/:menuId
 * Menü aktualisieren
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { menuId } = await context.params
    const body = await request.json()

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID required' }, { status: 400 })
    }

    const updateData: UpdateMenuRequest = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.slug !== undefined) updateData.slug = body.slug
    if (body.position !== undefined) updateData.position = body.position
    if (body.description !== undefined) updateData.description = body.description
    if (body.settings !== undefined) updateData.settings = body.settings

    await updateMenu(menuId, updateData)

    return NextResponse.json({
      success: true,
      message: 'Menu updated successfully',
    })
  } catch (error) {
    console.error('Error updating menu:', error)
    return NextResponse.json(
      { error: 'Failed to update menu', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/sites/:siteId/menus/:menuId
 * Menü löschen
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { menuId } = await context.params

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID required' }, { status: 400 })
    }

    await deleteMenu(menuId)

    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting menu:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu', details: String(error) },
      { status: 500 }
    )
  }
}
