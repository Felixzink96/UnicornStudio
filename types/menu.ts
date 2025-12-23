/**
 * Menu System Types
 *
 * Dynamische Navigation für Unicorn Studio
 */

// Link-Typen für Menü-Einträge
export type MenuItemLinkType =
  | 'page'       // Interne Seite
  | 'external'   // Externe URL
  | 'anchor'     // Anker auf der Seite (#section)
  | 'archive'    // Content Type Archiv
  | 'taxonomy'   // Taxonomy Term

// Menu Positionen
export type MenuPosition =
  | 'header'     // Hauptnavigation
  | 'footer'     // Footer Links
  | 'mobile'     // Mobile Navigation
  | 'custom'     // Benutzerdefiniert

// Menu-Einstellungen
export interface MenuSettings {
  // Styling
  style?: 'horizontal' | 'vertical' | 'dropdown' | 'mega'
  alignment?: 'left' | 'center' | 'right'
  spacing?: 'tight' | 'normal' | 'loose'

  // CSS Classes for rendered menu items (used as defaults if item has no cssClasses)
  linkClass?: string
  containerClass?: string
  itemClass?: string
  activeClass?: string

  // Verhalten
  showIcons?: boolean
  showDescriptions?: boolean
  collapseOnMobile?: boolean
  stickyOnScroll?: boolean
}

// Menu Item Basis
export interface MenuItemBase {
  id: string
  menuId: string
  parentId: string | null

  // Link
  linkType: MenuItemLinkType
  pageId?: string
  entryId?: string
  termId?: string
  contentTypeSlug?: string
  externalUrl?: string
  anchor?: string

  // Anzeige
  label: string
  icon?: string
  description?: string
  imageUrl?: string

  // Attribute
  target: '_self' | '_blank'
  cssClasses?: string

  // Sortierung
  position: number

  // Timestamps
  createdAt: string
  updatedAt: string
}

// Menu Item mit aufgelösten Daten
export interface MenuItem extends MenuItemBase {
  // Aufgelöste Daten
  pageSlug?: string
  pageName?: string
  resolvedUrl?: string

  // Hierarchie (für Dropdowns)
  children?: MenuItem[]
}

// Menu Basis
export interface MenuBase {
  id: string
  siteId: string
  name: string
  slug: string
  description?: string
  position: MenuPosition
  settings: MenuSettings

  // Timestamps
  createdAt: string
  updatedAt: string
}

// Menu mit Items
export interface Menu extends MenuBase {
  items: MenuItem[]
  itemCount?: number
}

// Menu Liste Item (ohne Items, für Übersichten)
// Hinweis: API gibt snake_case zurück (menu_position, item_count)
export interface MenuListItem {
  id: string
  name: string
  slug: string
  description?: string
  position: MenuPosition
  menu_position?: string  // Alias von API View
  item_count?: number     // Von API View
  itemCount?: number      // Alternative
  settings?: MenuSettings
  createdAt?: string
  updatedAt?: string
}

// Alias für Menu mit Items (für Kompatibilität)
export type MenuWithItems = Menu

// ============================================================================
// API Request/Response Types
// ============================================================================

// Neues Menu erstellen
export interface CreateMenuRequest {
  siteId: string
  name: string
  slug: string
  position?: MenuPosition
  description?: string
  settings?: MenuSettings
}

// Menu aktualisieren
export interface UpdateMenuRequest {
  name?: string
  slug?: string
  position?: MenuPosition
  description?: string
  settings?: MenuSettings
}

// Neues Menu Item erstellen
export interface CreateMenuItemRequest {
  menuId: string
  label: string
  linkType?: MenuItemLinkType
  pageId?: string
  externalUrl?: string
  anchor?: string
  contentTypeSlug?: string
  parentId?: string
  position?: number
  icon?: string
  description?: string
  target?: '_self' | '_blank'
}

// Menu Item aktualisieren
export interface UpdateMenuItemRequest {
  label?: string
  linkType?: MenuItemLinkType
  pageId?: string
  externalUrl?: string
  anchor?: string
  contentTypeSlug?: string
  parentId?: string
  position?: number
  icon?: string
  description?: string
  imageUrl?: string
  target?: '_self' | '_blank'
  cssClasses?: string
}

// Menu Items neu ordnen
export interface ReorderMenuItemsRequest {
  itemOrder: string[] // Array von Item IDs in neuer Reihenfolge
}

// Menu Item verschieben
export interface MoveMenuItemRequest {
  itemId: string
  newParentId: string | null
  newPosition: number
}

// ============================================================================
// AI Integration Types
// ============================================================================

// Menu Update Operation (von AI generiert)
export interface MenuUpdateOperation {
  menu: string // "@Hauptmenü"
  action: 'add' | 'remove' | 'reorder' | 'update' | 'create'
  items?: Array<{
    label: string
    page?: string // "@Kontakt"
    url?: string
    anchor?: string
    icon?: string
    parentLabel?: string
  }>
  settings?: Partial<MenuSettings>
}

// Menu-Daten für AI System Prompt
export interface MenuContextForAI {
  menus: Array<{
    name: string
    slug: string
    position: string
    items: Array<{
      label: string
      url: string
      children?: Array<{
        label: string
        url: string
      }>
    }>
  }>
  availablePages: Array<{
    name: string
    slug: string
    isHome: boolean
  }>
}

// ============================================================================
// WordPress Sync Types
// ============================================================================

// Menu für WordPress Export
export interface MenuForWordPress {
  id: string
  name: string
  slug: string
  position: MenuPosition
  settings?: MenuSettings
  items: Array<{
    label: string
    linkType: MenuItemLinkType
    pageSlug?: string
    externalUrl?: string
    anchor?: string
    target: string
    position: number
    parentPosition?: number // Für Hierarchie
    icon?: string
    description?: string
    cssClasses?: string // CSS classes for styling the menu item
  }>
}

// ============================================================================
// Helper Types
// ============================================================================

// Flaches Menu Item (ohne Hierarchie) für Drag & Drop
export interface FlatMenuItem extends MenuItemBase {
  depth: number
  pageSlug?: string
  pageName?: string
}

// Menu Item mit Breadcrumb für Navigation
export interface MenuItemWithBreadcrumb extends MenuItem {
  breadcrumb: string[]
}

// Validierung
export function isValidMenuPosition(position: string): position is MenuPosition {
  return ['header', 'footer', 'mobile', 'custom'].includes(position)
}

export function isValidLinkType(type: string): type is MenuItemLinkType {
  return ['page', 'external', 'anchor', 'archive', 'taxonomy'].includes(type)
}
