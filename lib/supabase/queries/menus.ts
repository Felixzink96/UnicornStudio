/**
 * Menu Query Functions
 *
 * Supabase Queries für das Menu System
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Menu,
  MenuListItem,
  MenuItem,
  CreateMenuRequest,
  UpdateMenuRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  MenuForWordPress,
} from '@/types/menu'

// ============================================================================
// MENUS
// ============================================================================

/**
 * Alle Menüs einer Site abrufen (mit Item-Count)
 */
export async function getMenus(siteId: string): Promise<MenuListItem[]> {
  const supabase = createClient()

  console.log('[getMenus] Querying menus for site:', siteId)

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_site_menus', {
    p_site_id: siteId,
  })

  console.log('[getMenus] RPC response data:', JSON.stringify(data, null, 2))
  console.log('[getMenus] RPC error:', error)

  if (error) throw error

  return (data || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    siteId,
    name: m.name as string,
    slug: m.slug as string,
    description: m.description as string | undefined,
    position: (m.menu_position || 'custom') as Menu['position'],
    // Also include menu_position for dashboard compatibility
    menu_position: (m.menu_position || 'custom') as string,
    settings: (m.settings || {}) as Menu['settings'],
    itemCount: Number(m.item_count) || 0,
    item_count: Number(m.item_count) || 0,
    createdAt: m.created_at as string,
    updatedAt: m.updated_at as string,
  }))
}

/**
 * Einzelnes Menü mit allen Items abrufen
 */
export async function getMenu(menuId: string): Promise<Menu | null> {
  const supabase = createClient()

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_menu_with_items', {
    p_menu_id: menuId,
  })

  if (error) throw error
  if (!data) return null

  // Items hierarchisch aufbauen
  const items = (data.items || []) as Array<Record<string, unknown>>
  const topLevelItems = items.filter((i) => !i.parent_id)
  const childItems = items.filter((i) => i.parent_id)

  const buildTree = (item: Record<string, unknown>): MenuItem => {
    const children = childItems
      .filter((c) => c.parent_id === item.id)
      .sort((a, b) => (a.position as number) - (b.position as number))
      .map(buildTree)

    return {
      id: item.id as string,
      menuId: menuId,
      parentId: item.parent_id as string | null,
      linkType: item.link_type as MenuItem['linkType'],
      pageId: item.page_id as string | undefined,
      pageSlug: item.page_slug as string | undefined,
      pageName: item.page_name as string | undefined,
      externalUrl: item.external_url as string | undefined,
      anchor: item.anchor as string | undefined,
      contentTypeSlug: item.content_type_slug as string | undefined,
      label: item.label as string,
      icon: item.icon as string | undefined,
      description: item.description as string | undefined,
      imageUrl: item.image_url as string | undefined,
      target: (item.target || '_self') as '_self' | '_blank',
      cssClasses: item.css_classes as string | undefined,
      position: item.position as number,
      createdAt: '',
      updatedAt: '',
      resolvedUrl: resolveItemUrl(item),
      children: children.length > 0 ? children : undefined,
    }
  }

  const hierarchicalItems = topLevelItems
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map(buildTree)

  return {
    id: data.id,
    siteId: '', // Wird vom Caller gesetzt
    name: data.name,
    slug: data.slug,
    description: data.description,
    position: data.position || 'custom',
    settings: data.settings || {},
    items: hierarchicalItems,
    createdAt: '',
    updatedAt: '',
  }
}

/**
 * URL für Menu Item auflösen
 */
function resolveItemUrl(item: Record<string, unknown>): string {
  switch (item.link_type) {
    case 'page':
      return item.page_slug ? `/${item.page_slug}` : '#'
    case 'external':
      return (item.external_url as string) || '#'
    case 'anchor':
      return item.anchor ? `#${item.anchor}` : '#'
    case 'archive':
      return item.content_type_slug ? `/${item.content_type_slug}` : '#'
    default:
      return '#'
  }
}

/**
 * Neues Menü erstellen
 */
export async function createMenu(data: CreateMenuRequest): Promise<string> {
  const supabase = createClient()

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: menuId, error } = await (supabase as any).rpc('create_menu', {
    p_site_id: data.siteId,
    p_name: data.name,
    p_slug: data.slug,
    p_position: data.position || 'custom',
    p_description: data.description || null,
  })

  if (error) throw error
  return menuId
}

/**
 * Menü aktualisieren
 */
export async function updateMenu(
  menuId: string,
  data: UpdateMenuRequest
): Promise<void> {
  const supabase = createClient()

  // Menu tables exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('menus')
    .update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.settings !== undefined && { settings: data.settings }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', menuId)

  if (error) throw error
}

/**
 * Menü löschen
 */
export async function deleteMenu(menuId: string): Promise<void> {
  const supabase = createClient()

  // Menu tables exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('menus').delete().eq('id', menuId)

  if (error) throw error
}

// ============================================================================
// MENU ITEMS
// ============================================================================

/**
 * Menu Item hinzufügen
 */
export async function addMenuItem(data: CreateMenuItemRequest): Promise<string> {
  const supabase = createClient()

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: itemId, error } = await (supabase as any).rpc('add_menu_item', {
    p_menu_id: data.menuId,
    p_label: data.label,
    p_link_type: data.linkType || 'page',
    p_page_id: data.pageId || null,
    p_external_url: data.externalUrl || null,
    p_anchor: data.anchor || null,
    p_content_type_slug: data.contentTypeSlug || null,
    p_parent_id: data.parentId || null,
    p_position: data.position ?? null,
    p_icon: data.icon || null,
    p_description: data.description || null,
    p_target: data.target || '_self',
  })

  if (error) throw error
  return itemId
}

/**
 * Menu Item aktualisieren
 */
export async function updateMenuItem(
  itemId: string,
  data: UpdateMenuItemRequest
): Promise<void> {
  const supabase = createClient()

  // Menu tables exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('menu_items')
    .update({
      ...(data.label !== undefined && { label: data.label }),
      ...(data.linkType !== undefined && { link_type: data.linkType }),
      ...(data.pageId !== undefined && { page_id: data.pageId || null }),
      ...(data.externalUrl !== undefined && { external_url: data.externalUrl || null }),
      ...(data.anchor !== undefined && { anchor: data.anchor || null }),
      ...(data.contentTypeSlug !== undefined && { content_type_slug: data.contentTypeSlug || null }),
      ...(data.parentId !== undefined && { parent_id: data.parentId || null }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.icon !== undefined && { icon: data.icon || null }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.imageUrl !== undefined && { image_url: data.imageUrl || null }),
      ...(data.target !== undefined && { target: data.target }),
      ...(data.cssClasses !== undefined && { css_classes: data.cssClasses || null }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (error) throw error
}

/**
 * Menu Item löschen
 */
export async function deleteMenuItem(itemId: string): Promise<void> {
  const supabase = createClient()

  // Menu tables exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('menu_items').delete().eq('id', itemId)

  if (error) throw error
}

/**
 * Menu Items neu ordnen
 */
export async function reorderMenuItems(
  menuId: string,
  itemOrder: string[]
): Promise<void> {
  const supabase = createClient()

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('reorder_menu_items', {
    p_menu_id: menuId,
    p_item_order: itemOrder,
  })

  if (error) throw error
}

/**
 * Menu Item verschieben (Parent + Position ändern)
 */
export async function moveMenuItem(
  itemId: string,
  newParentId: string | null,
  newPosition: number
): Promise<void> {
  const supabase = createClient()

  // Menu RPC functions exist but types not generated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('move_menu_item', {
    p_item_id: itemId,
    p_new_parent_id: newParentId,
    p_new_position: newPosition,
  })

  if (error) throw error
}

// ============================================================================
// EXPORT FOR WORDPRESS
// ============================================================================

/**
 * Menüs für WordPress Export aufbereiten
 */
export async function getMenusForWordPress(siteId: string): Promise<MenuForWordPress[]> {
  const menuList = await getMenus(siteId)
  const result: MenuForWordPress[] = []

  for (const menuListItem of menuList) {
    const menu = await getMenu(menuListItem.id)
    if (!menu) continue

    // Flatten items für WordPress (mit Parent-Position)
    const flatItems: MenuForWordPress['items'] = []

    const flattenItems = (
      items: MenuItem[],
      parentPosition?: number
    ) => {
      items.forEach((item, index) => {
        flatItems.push({
          label: item.label,
          linkType: item.linkType,
          pageSlug: item.pageSlug,
          externalUrl: item.externalUrl,
          anchor: item.anchor,
          target: item.target,
          position: item.position,
          parentPosition,
          icon: item.icon,
          description: item.description,
        })

        if (item.children) {
          flattenItems(item.children, item.position)
        }
      })
    }

    flattenItems(menu.items)

    result.push({
      id: menu.id,
      name: menu.name,
      slug: menu.slug,
      position: menu.position,
      items: flatItems,
    })
  }

  return result
}
