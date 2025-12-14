/**
 * Menu Items API Routes
 *
 * POST /api/v1/sites/:siteId/menus/:menuId/items - Item hinzufügen
 * PUT  /api/v1/sites/:siteId/menus/:menuId/items - Items neu ordnen
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
  moveMenuItem,
} from '@/lib/supabase/queries/menus'
import type { CreateMenuItemRequest, UpdateMenuItemRequest } from '@/types/menu'

interface RouteContext {
  params: Promise<{ siteId: string; menuId: string }>
}

/**
 * POST /api/v1/sites/:siteId/menus/:menuId/items
 * Neues Item zum Menü hinzufügen
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { menuId } = await context.params
    const body = await request.json()

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID required' }, { status: 400 })
    }

    if (!body.label) {
      return NextResponse.json({ error: 'Label is required' }, { status: 400 })
    }

    const itemData: CreateMenuItemRequest = {
      menuId,
      label: body.label,
      linkType: body.linkType || 'page',
      pageId: body.pageId,
      externalUrl: body.externalUrl,
      anchor: body.anchor,
      contentTypeSlug: body.contentTypeSlug,
      parentId: body.parentId,
      position: body.position,
      icon: body.icon,
      description: body.description,
      target: body.target || '_self',
    }

    const itemId = await addMenuItem(itemData)

    return NextResponse.json({
      success: true,
      data: { id: itemId },
    })
  } catch (error) {
    console.error('Error adding menu item:', error)
    return NextResponse.json(
      { error: 'Failed to add menu item', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/sites/:siteId/menus/:menuId/items
 * Items neu ordnen (Bulk-Operation)
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { menuId } = await context.params
    const body = await request.json()

    if (!menuId) {
      return NextResponse.json({ error: 'Menu ID required' }, { status: 400 })
    }

    // Check for reorder operation
    if (body.itemOrder && Array.isArray(body.itemOrder)) {
      await reorderMenuItems(menuId, body.itemOrder)

      return NextResponse.json({
        success: true,
        message: 'Items reordered successfully',
      })
    }

    // Check for move operation
    if (body.itemId && body.newPosition !== undefined) {
      await moveMenuItem(body.itemId, body.newParentId || null, body.newPosition)

      return NextResponse.json({
        success: true,
        message: 'Item moved successfully',
      })
    }

    // Check for single item update
    if (body.itemId) {
      const updateData: UpdateMenuItemRequest = {}

      if (body.label !== undefined) updateData.label = body.label
      if (body.linkType !== undefined) updateData.linkType = body.linkType
      if (body.pageId !== undefined) updateData.pageId = body.pageId
      if (body.externalUrl !== undefined) updateData.externalUrl = body.externalUrl
      if (body.anchor !== undefined) updateData.anchor = body.anchor
      if (body.contentTypeSlug !== undefined) updateData.contentTypeSlug = body.contentTypeSlug
      if (body.parentId !== undefined) updateData.parentId = body.parentId
      if (body.position !== undefined) updateData.position = body.position
      if (body.icon !== undefined) updateData.icon = body.icon
      if (body.description !== undefined) updateData.description = body.description
      if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl
      if (body.target !== undefined) updateData.target = body.target
      if (body.cssClasses !== undefined) updateData.cssClasses = body.cssClasses

      await updateMenuItem(body.itemId, updateData)

      return NextResponse.json({
        success: true,
        message: 'Item updated successfully',
      })
    }

    return NextResponse.json(
      { error: 'Invalid request - provide itemOrder, itemId with newPosition, or itemId with update data' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating menu items:', error)
    return NextResponse.json(
      { error: 'Failed to update menu items', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/sites/:siteId/menus/:menuId/items
 * Item löschen (via Query Parameter)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required as query parameter' },
        { status: 400 }
      )
    }

    await deleteMenuItem(itemId)

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu item', details: String(error) },
      { status: 500 }
    )
  }
}
