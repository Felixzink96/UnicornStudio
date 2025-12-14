/**
 * Menu System Prompt
 *
 * Erweitert den AI System Prompt um Menu-Kontext und Befehle
 */

import type { Menu, MenuItem } from '@/types/menu'

interface PageInfo {
  id: string
  name: string
  slug: string
  is_home?: boolean
}

/**
 * Baut den Menu-Kontext für den AI System Prompt
 */
export function buildMenuContext(menus: Menu[], pages: PageInfo[]): string {
  if (menus.length === 0 && pages.length === 0) {
    return ''
  }

  const parts: string[] = []

  // Verfügbare Seiten
  if (pages.length > 0) {
    parts.push(`## VERFUEGBARE SEITEN
${pages.map(p => `- "${p.name}" -> /${p.slug || ''}${p.is_home ? ' (Homepage)' : ''}`).join('\n')}`)
  }

  // Verfügbare Menüs
  if (menus.length > 0) {
    parts.push(`## VERFUEGBARE MENUS
${menus.map(menu => {
  const items = menu.items || []
  const itemList = items.length > 0
    ? items.map(i => `  - ${i.label} -> ${formatMenuItemUrl(i)}`).join('\n')
    : '  (keine Items)'
  return `### @${menu.name} (${menu.position || 'custom'})
${itemList}`
}).join('\n\n')}`)
  }

  // Menu-Befehle
  parts.push(`## MENU-BEFEHLE
Du kannst Menus bearbeiten mit folgendem Format:

MENU_UPDATE:
menu: "@MenuName"
action: "add" | "remove" | "reorder" | "update" | "create"
items:
  - label: "Label"
    page: "@SeitenName"
    position: 0
---

Beispiele:
- "Fuege @Kontakt zum @Hauptmenu hinzu" -> add item
- "Entferne Services aus @Hauptmenu" -> remove item
- "Erstelle ein Footer-Menu mit @Impressum und @Datenschutz" -> create menu
- "Sortiere @Hauptmenu: Home, Services, Kontakt" -> reorder`)

  return parts.join('\n\n')
}

/**
 * Formatiert die URL eines Menu-Items
 */
function formatMenuItemUrl(item: MenuItem): string {
  switch (item.linkType) {
    case 'page':
      return item.pageSlug ? `/${item.pageSlug}` : '#'
    case 'external':
      return item.externalUrl || '#'
    case 'anchor':
      return `#${item.anchor || ''}`
    case 'archive':
      return `/archive/${item.contentTypeSlug || ''}`
    default:
      return '#'
  }
}

/**
 * Parst MENU_UPDATE Befehle aus der AI-Antwort
 */
export interface MenuOperation {
  menu: string
  action: 'add' | 'remove' | 'reorder' | 'update' | 'create'
  items?: MenuOperationItem[]
  newName?: string
  position?: string
}

export interface MenuOperationItem {
  label: string
  page?: string
  url?: string
  anchor?: string
  position?: number
  parentLabel?: string
}

/**
 * Extrahiert Menu-Operationen aus AI-Antwort
 */
export function parseMenuOperations(response: string): MenuOperation[] {
  const operations: MenuOperation[] = []

  // Suche nach MENU_UPDATE Blöcken
  const menuUpdateRegex = /MENU_UPDATE:\s*\n([\s\S]*?)(?=---|\n\n[A-Z]|$)/g
  let match

  while ((match = menuUpdateRegex.exec(response)) !== null) {
    const block = match[1]
    const operation = parseMenuBlock(block)
    if (operation) {
      operations.push(operation)
    }
  }

  return operations
}

/**
 * Parst einen einzelnen MENU_UPDATE Block
 */
function parseMenuBlock(block: string): MenuOperation | null {
  const lines = block.split('\n').filter(l => l.trim())

  let menu = ''
  let action: MenuOperation['action'] = 'add'
  let items: MenuOperationItem[] = []
  let newName = ''
  let position = ''

  let inItems = false
  let currentItem: MenuOperationItem | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    // Menu Name
    const menuMatch = trimmed.match(/^menu:\s*"?@?([^"]+)"?/)
    if (menuMatch) {
      menu = menuMatch[1]
      continue
    }

    // Action
    const actionMatch = trimmed.match(/^action:\s*"?(\w+)"?/)
    if (actionMatch) {
      action = actionMatch[1] as MenuOperation['action']
      continue
    }

    // New Name (für rename)
    const nameMatch = trimmed.match(/^newName:\s*"?([^"]+)"?/)
    if (nameMatch) {
      newName = nameMatch[1]
      continue
    }

    // Position (für create)
    const posMatch = trimmed.match(/^position:\s*"?(\w+)"?/)
    if (posMatch) {
      position = posMatch[1]
      continue
    }

    // Items Start
    if (trimmed === 'items:') {
      inItems = true
      continue
    }

    // Item Entry
    if (inItems && trimmed.startsWith('-')) {
      // Speichere vorheriges Item
      if (currentItem) {
        items.push(currentItem)
      }

      // Inline Item: - label: "Name", page: "@Page"
      const inlineMatch = trimmed.match(/^-\s*label:\s*"?([^",]+)"?(?:,\s*page:\s*"?@?([^",]+)"?)?(?:,\s*url:\s*"?([^",]+)"?)?(?:,\s*position:\s*(\d+))?/)
      if (inlineMatch) {
        currentItem = {
          label: inlineMatch[1],
          page: inlineMatch[2],
          url: inlineMatch[3],
          position: inlineMatch[4] ? parseInt(inlineMatch[4]) : undefined
        }
      } else {
        // Simple: - label: "Name"
        const simpleMatch = trimmed.match(/^-\s*label:\s*"?([^"]+)"?/)
        if (simpleMatch) {
          currentItem = { label: simpleMatch[1] }
        }
      }
      continue
    }

    // Item Properties (wenn nicht inline)
    if (inItems && currentItem) {
      const pageMatch = trimmed.match(/^page:\s*"?@?([^"]+)"?/)
      if (pageMatch) {
        currentItem.page = pageMatch[1]
        continue
      }

      const urlMatch = trimmed.match(/^url:\s*"?([^"]+)"?/)
      if (urlMatch) {
        currentItem.url = urlMatch[1]
        continue
      }

      const anchorMatch = trimmed.match(/^anchor:\s*"?#?([^"]+)"?/)
      if (anchorMatch) {
        currentItem.anchor = anchorMatch[1]
        continue
      }

      const positionMatch = trimmed.match(/^position:\s*(\d+)/)
      if (positionMatch) {
        currentItem.position = parseInt(positionMatch[1])
        continue
      }

      const parentMatch = trimmed.match(/^parent:\s*"?([^"]+)"?/)
      if (parentMatch) {
        currentItem.parentLabel = parentMatch[1]
        continue
      }
    }
  }

  // Letztes Item hinzufügen
  if (currentItem) {
    items.push(currentItem)
  }

  if (!menu) {
    return null
  }

  return {
    menu,
    action,
    items: items.length > 0 ? items : undefined,
    newName: newName || undefined,
    position: position || undefined
  }
}

/**
 * Führt Menu-Operationen aus
 */
export async function executeMenuOperations(
  operations: MenuOperation[],
  siteId: string,
  pages: PageInfo[],
  executeOperation: (op: MenuOperation, siteId: string, pages: PageInfo[]) => Promise<void>
): Promise<{ success: boolean; results: string[] }> {
  const results: string[] = []

  for (const op of operations) {
    try {
      await executeOperation(op, siteId, pages)
      results.push(`Menu "${op.menu}": ${op.action} erfolgreich`)
    } catch (error) {
      results.push(`Menu "${op.menu}": Fehler - ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  return {
    success: results.every(r => r.includes('erfolgreich')),
    results
  }
}
