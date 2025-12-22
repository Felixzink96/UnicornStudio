/**
 * Reference System Types
 *
 * Ermöglicht @-Mentions im Chat für Seiten, Menüs, Components, Sections, Entries, Design Tokens
 */

// Referenz-Kategorien
export type ReferenceCategory =
  | 'page'
  | 'menu'
  | 'component'
  | 'section'
  | 'entry'
  | 'token'
  | 'content_type'

// Basis-Interface für alle Referenzen
export interface BaseReference {
  id: string
  name: string
  category: ReferenceCategory
  icon: string
  displayName: string
}

// Seiten-Referenz
export interface PageReference extends BaseReference {
  category: 'page'
  slug: string
  isHome: boolean
}

// Menü-Referenz
export interface MenuReference extends BaseReference {
  category: 'menu'
  slug: string
  position: string
  itemCount: number
}

// Component-Referenz (Header, Footer)
export interface ComponentReference extends BaseReference {
  category: 'component'
  position: 'header' | 'footer' | 'content'
  html?: string
}

// Section-Referenz (Sections auf der aktuellen Seite)
export interface SectionReference extends BaseReference {
  category: 'section'
  tagName: string
  html?: string
}

// Entry-Referenz (CMS Einträge)
export interface EntryReference extends BaseReference {
  category: 'entry'
  contentType: string
  contentTypeLabel: string
  slug: string
  status: string
}

// Design Token-Referenz
export interface TokenReference extends BaseReference {
  category: 'token'
  tokenType: 'color' | 'font' | 'spacing' | 'border' | 'gradient'
  value: string
}

// Content Type-Referenz (für dynamische Entries)
export interface ContentTypeReference extends BaseReference {
  category: 'content_type'
  slug: string
  labelSingular: string
  labelPlural: string
  entryCount: number
  fields: Array<{
    name: string
    label: string
    type: string
    required: boolean
  }>
}

// Union Type für alle Referenzen
export type Reference =
  | PageReference
  | MenuReference
  | ComponentReference
  | SectionReference
  | EntryReference
  | TokenReference
  | ContentTypeReference

// Gruppierte Referenzen für das Dropdown
export interface ReferenceGroup {
  category: ReferenceCategory
  label: string
  icon: string
  items: Reference[]
}

// Kategorien-Konfiguration
export const REFERENCE_CATEGORIES: Record<ReferenceCategory, { label: string; icon: string }> = {
  page: { label: 'Seiten', icon: 'file-text' },
  menu: { label: 'Menus', icon: 'menu' },
  component: { label: 'Components', icon: 'component' },
  section: { label: 'Sections', icon: 'square' },
  entry: { label: 'Eintraege', icon: 'file' },
  token: { label: 'Design Tokens', icon: 'palette' },
  content_type: { label: 'Content Types', icon: 'database' },
}

// Ausgewählte Referenz im Chat
export interface SelectedReference {
  reference: Reference
  startIndex: number
  endIndex: number
  rawText: string // z.B. "@Hauptmenü"
}

// Daten die an AI gesendet werden (mit IDs fuer Updates)
export interface ReferenceDataForAI {
  pages?: Array<{
    id: string
    name: string
    slug: string
    isHome: boolean
    html?: string // Nur wenn als Style-Referenz
  }>
  menus?: Array<{
    id: string
    name: string
    slug: string
    position: string
    items: Array<{
      id: string
      label: string
      url: string
      linkType: string
      pageId?: string
      children?: Array<{ id: string; label: string; url: string }>
    }>
  }>
  components?: Array<{
    id: string
    name: string
    position: string
    html: string
    css?: string
    js?: string
  }>
  sections?: Array<{
    id: string
    selector: string
    tagName: string
    html: string
  }>
  entries?: Array<{
    id: string
    title: string
    slug: string
    contentType: string
    contentTypeId: string
    data: Record<string, unknown>
  }>
  tokens?: Array<{
    id: string
    name: string
    displayName: string
    type: 'color' | 'font' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontWeight' | 'spacing' | 'gradient'
    value: string
    category: string
  }>
  contentTypes?: Array<{
    id: string
    name: string
    slug: string
    labelSingular: string
    labelPlural: string
    entryCount: number
    fields: Array<{
      name: string
      label: string
      type: string
      required: boolean
      instructions?: string
    }>
    // API endpoint for fetching entries
    apiEndpoint: string
    // Handlebars syntax example
    syntaxExample: string
  }>
}

// Token Kategorien fuer das komplette Type System
export type TokenType =
  | 'color'
  | 'font'
  | 'fontSize'
  | 'lineHeight'
  | 'letterSpacing'
  | 'fontWeight'
  | 'spacing'

// Design Variables Struktur aus der Datenbank
export interface DesignVariablesData {
  colors?: {
    brand?: Record<string, string>
    neutral?: Record<string, string>
  }
  typography?: {
    fontHeading?: string
    fontBody?: string
    fontMono?: string
    fontSizes?: Record<string, string>
    lineHeights?: Record<string, string>
    letterSpacings?: Record<string, string>
    fontWeights?: Record<string, string>
  }
  spacing?: Record<string, string>
}
