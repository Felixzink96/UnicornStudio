/**
 * Menu Operations
 *
 * Fuehrt Menu-Operationen aus, die von der AI generiert werden
 */

import type { MenuOperation, MenuOperationItem } from './menu-system-prompt'
import type { CreateMenuRequest, CreateMenuItemRequest } from '@/types/menu'

interface PageInfo {
  id: string
  name: string
  slug: string
}

interface MenuInfo {
  id: string
  name: string
  slug: string
}

/**
 * Fuehrt eine Menu-Operation aus
 */
export async function executeMenuOperation(
  operation: MenuOperation,
  siteId: string,
  pages: PageInfo[],
  menus: MenuInfo[]
): Promise<{ success: boolean; message: string }> {
  try {
    switch (operation.action) {
      case 'create':
        return await createMenu(operation, siteId)

      case 'add':
        return await addMenuItems(operation, siteId, pages, menus)

      case 'remove':
        return await removeMenuItems(operation, siteId, menus)

      case 'reorder':
        return await reorderMenuItems(operation, siteId, menus)

      case 'update':
        return await updateMenu(operation, siteId, menus)

      default:
        return { success: false, message: `Unbekannte Aktion: ${operation.action}` }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler'
    }
  }
}

/**
 * Erstellt ein neues Menu
 */
async function createMenu(
  operation: MenuOperation,
  siteId: string
): Promise<{ success: boolean; message: string }> {
  const slug = operation.menu.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  const request: CreateMenuRequest = {
    siteId,
    name: operation.menu,
    slug,
    position: (operation.position as 'header' | 'footer' | 'mobile' | 'custom') || 'custom',
    description: `Menu erstellt von AI`
  }

  const response = await fetch(`/api/v1/sites/${siteId}/menus`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Menu konnte nicht erstellt werden')
  }

  return { success: true, message: `Menu "${operation.menu}" erstellt` }
}

/**
 * Fuegt Items zu einem Menu hinzu
 */
async function addMenuItems(
  operation: MenuOperation,
  siteId: string,
  pages: PageInfo[],
  menus: MenuInfo[]
): Promise<{ success: boolean; message: string }> {
  // Menu finden
  const menu = findMenu(operation.menu, menus)
  if (!menu) {
    throw new Error(`Menu "${operation.menu}" nicht gefunden`)
  }

  if (!operation.items || operation.items.length === 0) {
    throw new Error('Keine Items zum Hinzufuegen angegeben')
  }

  const results: string[] = []

  for (const item of operation.items) {
    const menuItem = convertToMenuItemRequest(item, pages)

    const response = await fetch(`/api/v1/sites/${siteId}/menus/${menu.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(menuItem)
    })

    if (response.ok) {
      results.push(item.label)
    }
  }

  return {
    success: results.length > 0,
    message: `${results.length} Item(s) zu "${operation.menu}" hinzugefuegt: ${results.join(', ')}`
  }
}

/**
 * Entfernt Items aus einem Menu
 */
async function removeMenuItems(
  operation: MenuOperation,
  siteId: string,
  menus: MenuInfo[]
): Promise<{ success: boolean; message: string }> {
  // Menu finden
  const menu = findMenu(operation.menu, menus)
  if (!menu) {
    throw new Error(`Menu "${operation.menu}" nicht gefunden`)
  }

  // Menu mit Items laden
  const menuResponse = await fetch(`/api/v1/sites/${siteId}/menus/${menu.id}`)
  if (!menuResponse.ok) {
    throw new Error('Menu konnte nicht geladen werden')
  }

  const menuData = await menuResponse.json()
  const menuItems = menuData.items || []

  if (!operation.items || operation.items.length === 0) {
    throw new Error('Keine Items zum Entfernen angegeben')
  }

  const results: string[] = []

  for (const item of operation.items) {
    // Item anhand des Labels finden
    const existingItem = menuItems.find(
      (mi: { label: string; id: string }) =>
        mi.label.toLowerCase() === item.label.toLowerCase()
    )

    if (existingItem) {
      const response = await fetch(
        `/api/v1/sites/${siteId}/menus/${menu.id}/items?itemId=${existingItem.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        results.push(item.label)
      }
    }
  }

  return {
    success: results.length > 0,
    message: `${results.length} Item(s) aus "${operation.menu}" entfernt: ${results.join(', ')}`
  }
}

/**
 * Sortiert Menu-Items neu
 */
async function reorderMenuItems(
  operation: MenuOperation,
  siteId: string,
  menus: MenuInfo[]
): Promise<{ success: boolean; message: string }> {
  // Menu finden
  const menu = findMenu(operation.menu, menus)
  if (!menu) {
    throw new Error(`Menu "${operation.menu}" nicht gefunden`)
  }

  // Menu mit Items laden
  const menuResponse = await fetch(`/api/v1/sites/${siteId}/menus/${menu.id}`)
  if (!menuResponse.ok) {
    throw new Error('Menu konnte nicht geladen werden')
  }

  const menuData = await menuResponse.json()
  const menuItems = menuData.items || []

  if (!operation.items || operation.items.length === 0) {
    throw new Error('Keine Reihenfolge angegeben')
  }

  // Neue Reihenfolge erstellen
  const orderedIds: string[] = []

  for (const item of operation.items) {
    const existingItem = menuItems.find(
      (mi: { label: string; id: string }) =>
        mi.label.toLowerCase() === item.label.toLowerCase()
    )

    if (existingItem) {
      orderedIds.push(existingItem.id)
    }
  }

  // Reorder API aufrufen
  const response = await fetch(`/api/v1/sites/${siteId}/menus/${menu.id}/items`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds })
  })

  if (!response.ok) {
    throw new Error('Sortierung konnte nicht gespeichert werden')
  }

  return {
    success: true,
    message: `"${operation.menu}" neu sortiert`
  }
}

/**
 * Aktualisiert Menu-Eigenschaften
 */
async function updateMenu(
  operation: MenuOperation,
  siteId: string,
  menus: MenuInfo[]
): Promise<{ success: boolean; message: string }> {
  // Menu finden
  const menu = findMenu(operation.menu, menus)
  if (!menu) {
    throw new Error(`Menu "${operation.menu}" nicht gefunden`)
  }

  const updates: Record<string, string> = {}

  if (operation.newName) {
    updates.name = operation.newName
  }

  if (operation.position) {
    updates.position = operation.position
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('Keine Updates angegeben')
  }

  const response = await fetch(`/api/v1/sites/${siteId}/menus/${menu.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  })

  if (!response.ok) {
    throw new Error('Menu konnte nicht aktualisiert werden')
  }

  return {
    success: true,
    message: `"${operation.menu}" aktualisiert`
  }
}

/**
 * Findet ein Menu anhand des Namens
 */
function findMenu(name: string, menus: MenuInfo[]): MenuInfo | undefined {
  const normalizedName = name.toLowerCase().replace(/^@/, '')
  return menus.find(
    m =>
      m.name.toLowerCase() === normalizedName ||
      m.slug.toLowerCase() === normalizedName
  )
}

/**
 * Konvertiert ein Operation-Item zu einem API-Request
 */
function convertToMenuItemRequest(
  item: MenuOperationItem,
  pages: PageInfo[]
): CreateMenuItemRequest {
  // Page Reference
  if (item.page) {
    const pageName = item.page.replace(/^@/, '')
    const page = pages.find(
      p =>
        p.name.toLowerCase() === pageName.toLowerCase() ||
        p.slug.toLowerCase() === pageName.toLowerCase()
    )

    if (page) {
      return {
        menuId: '',  // Wird spaeter gesetzt
        label: item.label,
        linkType: 'page',
        pageId: page.id,
        position: item.position
      }
    }
  }

  // External URL
  if (item.url) {
    return {
      menuId: '',
      label: item.label,
      linkType: 'external',
      externalUrl: item.url,
      target: '_blank',
      position: item.position
    }
  }

  // Anchor
  if (item.anchor) {
    return {
      menuId: '',
      label: item.label,
      linkType: 'anchor',
      anchor: item.anchor,
      position: item.position
    }
  }

  // Fallback: External Link zu #
  return {
    menuId: '',
    label: item.label,
    linkType: 'external',
    externalUrl: '#',
    position: item.position
  }
}

/**
 * Verarbeitet Menu-Operationen aus einer AI-Antwort
 */
export async function processAIMenuOperations(
  operations: MenuOperation[],
  siteId: string,
  pages: PageInfo[],
  menus: MenuInfo[]
): Promise<{ processed: number; results: string[] }> {
  const results: string[] = []

  for (const operation of operations) {
    const result = await executeMenuOperation(operation, siteId, pages, menus)
    results.push(result.message)
  }

  return {
    processed: operations.length,
    results
  }
}
