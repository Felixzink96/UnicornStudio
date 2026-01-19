/**
 * Reference Operations
 *
 * Parst und verarbeitet Referenz-Updates aus AI-Antworten
 */

// Update-Typen
export type ReferenceUpdateType =
  | 'component'
  | 'section'
  | 'token'
  | 'menu'
  | 'entry'
  | 'page' // Normales Seiten-HTML (OPERATION)
  | 'save_component' // Speichert Section als wiederverwendbare Komponente

// Basis-Interface fuer alle Updates
export interface BaseReferenceUpdate {
  type: ReferenceUpdateType
  id: string
  message?: string
}

// Component Update (Header/Footer)
export interface ComponentUpdate extends BaseReferenceUpdate {
  type: 'component'
  componentType: 'header' | 'footer'
  html: string
}

// Section Update
export interface SectionUpdate extends BaseReferenceUpdate {
  type: 'section'
  selector: string
  html: string
}

// Token Update
export interface TokenUpdate extends BaseReferenceUpdate {
  type: 'token'
  value: string
}

// Menu Update
export interface MenuUpdate extends BaseReferenceUpdate {
  type: 'menu'
  action: 'add' | 'remove' | 'reorder' | 'update'
  items?: Array<{
    label: string
    page?: string
    url?: string
    position?: number
  }>
}

// Entry Update
export interface EntryUpdate extends BaseReferenceUpdate {
  type: 'entry'
  data: Record<string, unknown>
}

// Page Update (normales OPERATION Format)
export interface PageUpdate extends BaseReferenceUpdate {
  type: 'page'
  operation: 'add' | 'modify' | 'delete' | 'replace_all'
  position?: 'start' | 'end' | 'before' | 'after'
  selector?: string
  html: string
}

// Save Component Update (speichert Section als wiederverwendbare Komponente)
export interface SaveComponentUpdate extends BaseReferenceUpdate {
  type: 'save_component'
  sectionId: string
  componentName: string
  category: string
  html?: string
}

// Union Type
export type ReferenceUpdate =
  | ComponentUpdate
  | SectionUpdate
  | TokenUpdate
  | MenuUpdate
  | EntryUpdate
  | PageUpdate
  | SaveComponentUpdate

// Parse Result
export interface ParseResult {
  message: string
  updates: ReferenceUpdate[]
  hasReferenceUpdates: boolean
}

/**
 * Parst AI-Antwort und extrahiert alle Referenz-Updates
 */
export function parseReferenceUpdates(response: string): ParseResult {
  const updates: ReferenceUpdate[] = []
  let message = ''

  // Extrahiere MESSAGE Block
  const messageMatch = response.match(/MESSAGE:\s*([^\n]+(?:\n(?!---)[^\n]*)*)/i)
  if (messageMatch) {
    message = messageMatch[1].trim()
  }

  // Parse COMPONENT_UPDATE Bloecke
  const componentUpdates = parseComponentUpdates(response)
  updates.push(...componentUpdates)

  // Parse SECTION_UPDATE Bloecke
  const sectionUpdates = parseSectionUpdates(response)
  updates.push(...sectionUpdates)

  // Parse TOKEN_UPDATE Bloecke
  const tokenUpdates = parseTokenUpdates(response)
  updates.push(...tokenUpdates)

  // Parse MENU_UPDATE Bloecke
  const menuUpdates = parseMenuUpdates(response)
  updates.push(...menuUpdates)

  // Parse ENTRY_UPDATE Bloecke
  const entryUpdates = parseEntryUpdates(response)
  updates.push(...entryUpdates)

  // Falls keine Referenz-Updates, parse normales OPERATION Format
  const hasReferenceUpdates = updates.length > 0

  if (!hasReferenceUpdates) {
    const pageUpdate = parseOperationFormat(response)
    if (pageUpdate) {
      updates.push(pageUpdate)
    }
  }

  return {
    message,
    updates,
    hasReferenceUpdates,
  }
}

/**
 * Parse COMPONENT_UPDATE Bloecke
 */
function parseComponentUpdates(response: string): ComponentUpdate[] {
  const updates: ComponentUpdate[] = []

  // Regex fuer COMPONENT_UPDATE Block
  const regex = /COMPONENT_UPDATE:\s*\n(?:id:\s*["']?([^"'\n]+)["']?\s*\n)?(?:type:\s*["']?(header|footer)["']?\s*\n)?---\s*\n([\s\S]*?)(?=\n---|\n\n[A-Z_]+:|$)/gi

  let match
  while ((match = regex.exec(response)) !== null) {
    const id = match[1]?.trim() || ''
    const componentType = (match[2]?.trim().toLowerCase() || 'header') as 'header' | 'footer'
    const html = cleanHtml(match[3] || '')

    if (html) {
      updates.push({
        type: 'component',
        id,
        componentType,
        html,
      })
    }
  }

  return updates
}

/**
 * Parse SECTION_UPDATE Bloecke
 */
function parseSectionUpdates(response: string): SectionUpdate[] {
  const updates: SectionUpdate[] = []

  const regex = /SECTION_UPDATE:\s*\n(?:selector:\s*["']?([^"'\n]+)["']?\s*\n)?---\s*\n([\s\S]*?)(?=\n---|\n\n[A-Z_]+:|$)/gi

  let match
  while ((match = regex.exec(response)) !== null) {
    const selector = match[1]?.trim() || ''
    const html = cleanHtml(match[2] || '')

    // ID aus Selector extrahieren
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/)
    const id = idMatch ? idMatch[1] : selector

    if (html) {
      updates.push({
        type: 'section',
        id,
        selector,
        html,
      })
    }
  }

  return updates
}

/**
 * Parse TOKEN_UPDATE Bloecke
 */
function parseTokenUpdates(response: string): TokenUpdate[] {
  const updates: TokenUpdate[] = []

  // More flexible regex that handles various formats:
  // TOKEN_UPDATE:
  // id: "color-brand-accent"
  // value: "#3b82f6"
  // ---
  const regex = /TOKEN_UPDATE:\s*\n\s*id:\s*["']?([^"'\n]+?)["']?\s*\n\s*value:\s*["']?([^"'\n]+?)["']?\s*(?:\n|---)/gi

  let match
  while ((match = regex.exec(response)) !== null) {
    const id = match[1]?.trim() || ''
    const value = match[2]?.trim() || ''

    if (id && value) {
      updates.push({
        type: 'token',
        id,
        value,
      })
    }
  }

  // Fallback: Try simpler pattern if nothing found
  if (updates.length === 0) {
    const simplifiedRegex = /TOKEN_UPDATE:[\s\S]*?id:\s*["']?([^"'\n]+?)["']?[\s\S]*?value:\s*["']?([^"'\n]+?)["']?/gi
    while ((match = simplifiedRegex.exec(response)) !== null) {
      const id = match[1]?.trim() || ''
      const value = match[2]?.trim() || ''

      if (id && value) {
        updates.push({
          type: 'token',
          id,
          value,
        })
      }
    }
  }

  return updates
}

/**
 * Parse MENU_UPDATE Bloecke
 */
function parseMenuUpdates(response: string): MenuUpdate[] {
  const updates: MenuUpdate[] = []

  const regex = /MENU_UPDATE:\s*\n(?:id:\s*["']?([^"'\n]+)["']?\s*\n)?(?:action:\s*["']?(add|remove|reorder|update)["']?\s*\n)?([\s\S]*?)(?=\n---|\n\n[A-Z_]+:|$)/gi

  let match
  while ((match = regex.exec(response)) !== null) {
    const id = match[1]?.trim() || ''
    const action = (match[2]?.trim().toLowerCase() || 'update') as MenuUpdate['action']
    const itemsBlock = match[3] || ''

    // Parse items
    const items: MenuUpdate['items'] = []
    const itemRegex = /-\s*label:\s*["']?([^"'\n,]+)["']?(?:,\s*page:\s*["']?@?([^"'\n,]+)["']?)?(?:,\s*url:\s*["']?([^"'\n,]+)["']?)?/gi

    let itemMatch
    while ((itemMatch = itemRegex.exec(itemsBlock)) !== null) {
      items.push({
        label: itemMatch[1]?.trim() || '',
        page: itemMatch[2]?.trim(),
        url: itemMatch[3]?.trim(),
      })
    }

    if (id) {
      updates.push({
        type: 'menu',
        id,
        action,
        items: items.length > 0 ? items : undefined,
      })
    }
  }

  return updates
}

/**
 * Parse ENTRY_UPDATE Bloecke
 */
function parseEntryUpdates(response: string): EntryUpdate[] {
  const updates: EntryUpdate[] = []

  const regex = /ENTRY_UPDATE:\s*\n(?:id:\s*["']?([^"'\n]+)["']?\s*\n)?(?:data:\s*\n)?([\s\S]*?)(?=\n---|\n\n[A-Z_]+:|$)/gi

  let match
  while ((match = regex.exec(response)) !== null) {
    const id = match[1]?.trim() || ''
    const dataBlock = match[2] || ''

    // Parse YAML-like data
    const data: Record<string, unknown> = {}
    const fieldRegex = /^\s+(\w+):\s*["']?(.+?)["']?\s*$/gm

    let fieldMatch
    while ((fieldMatch = fieldRegex.exec(dataBlock)) !== null) {
      const key = fieldMatch[1]
      let value: unknown = fieldMatch[2]

      // Try to parse as JSON/number/boolean
      try {
        value = JSON.parse(value as string)
      } catch {
        // Keep as string
      }

      data[key] = value
    }

    if (id && Object.keys(data).length > 0) {
      updates.push({
        type: 'entry',
        id,
        data,
      })
    }
  }

  return updates
}

/**
 * Parse normales OPERATION Format (fuer Seiten-HTML)
 */
function parseOperationFormat(response: string): PageUpdate | null {
  const operationMatch = response.match(/OPERATION:\s*(add|modify|delete|replace_all)/i)
  if (!operationMatch) {
    // Fallback: Suche nach HTML ohne OPERATION
    const htmlMatch = response.match(/```html\s*([\s\S]*?)```/)
    if (htmlMatch) {
      return {
        type: 'page',
        id: 'page',
        operation: 'replace_all',
        html: cleanHtml(htmlMatch[1]),
      }
    }
    return null
  }

  const operation = operationMatch[1].toLowerCase() as PageUpdate['operation']

  // Position
  const positionMatch = response.match(/POSITION:\s*(start|end|before|after)/i)
  const position = positionMatch ? positionMatch[1].toLowerCase() as PageUpdate['position'] : undefined

  // Selector
  const selectorMatch = response.match(/SELECTOR:\s*([^\n]+)/i)
  const selector = selectorMatch ? selectorMatch[1].trim() : undefined

  // HTML - nach dem letzten ---
  const parts = response.split('---')
  let html = ''

  if (parts.length >= 2) {
    // Letzter Teil nach ---
    const lastPart = parts[parts.length - 1]
    html = cleanHtml(lastPart)
  }

  if (!html && operation !== 'delete') {
    // Fallback: HTML aus Code-Block
    const htmlMatch = response.match(/```html\s*([\s\S]*?)```/)
    if (htmlMatch) {
      html = cleanHtml(htmlMatch[1])
    }
  }

  return {
    type: 'page',
    id: 'page',
    operation,
    position,
    selector,
    html,
  }
}

/**
 * Bereinigt HTML
 */
function cleanHtml(html: string): string {
  return html
    .replace(/```html\s*/gi, '')
    .replace(/```\s*/gi, '')
    .replace(/^\s*---\s*/gm, '')
    .trim()
}

/**
 * Findet aehnliche Referenzen (fuer Fehlerbehandlung)
 */
export function findSimilarReferences(
  query: string,
  availableReferences: Array<{ name: string; displayName: string; category: string }>
): Array<{ name: string; displayName: string; category: string; similarity: number }> {
  const normalizedQuery = query.toLowerCase().replace(/^@/, '')

  const withSimilarity = availableReferences.map(ref => {
    const name = ref.name.toLowerCase()
    const displayName = ref.displayName.toLowerCase()

    // Berechne Aehnlichkeit
    let similarity = 0

    // Exakter Match
    if (name === normalizedQuery || displayName === normalizedQuery) {
      similarity = 1
    }
    // Prefix Match
    else if (name.startsWith(normalizedQuery) || displayName.startsWith(normalizedQuery)) {
      similarity = 0.8
    }
    // Contains
    else if (name.includes(normalizedQuery) || displayName.includes(normalizedQuery)) {
      similarity = 0.6
    }
    // Levenshtein-basierte Aehnlichkeit
    else {
      const distance = levenshteinDistance(normalizedQuery, name)
      similarity = Math.max(0, 1 - distance / Math.max(normalizedQuery.length, name.length))
    }

    return { ...ref, similarity }
  })

  return withSimilarity
    .filter(r => r.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
}

/**
 * Levenshtein Distance fuer Aehnlichkeitsberechnung
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Prueft ob ein Update-Typ ein Referenz-Update ist
 */
export function isReferenceUpdate(update: ReferenceUpdate): boolean {
  return update.type !== 'page'
}

/**
 * Gruppiert Updates nach Typ
 */
export function groupUpdatesByType(updates: ReferenceUpdate[]): Record<ReferenceUpdateType, ReferenceUpdate[]> {
  const grouped: Record<ReferenceUpdateType, ReferenceUpdate[]> = {
    component: [],
    section: [],
    token: [],
    menu: [],
    entry: [],
    page: [],
    save_component: [],
  }

  for (const update of updates) {
    grouped[update.type].push(update)
  }

  return grouped
}

/**
 * Stellt sicher dass das Logo im Header HTML vorhanden ist
 * Falls nicht, wird es automatisch injiziert
 */
export function ensureLogoInHeader(
  html: string,
  logoUrl: string,
  siteName?: string
): { html: string; wasInjected: boolean } {
  // Prüfe ob die Logo-URL bereits im HTML vorhanden ist
  if (html.includes(logoUrl)) {
    return { html, wasInjected: false }
  }

  // Logo wurde nicht gefunden - injiziere es
  console.log('[Logo-Validation] Logo nicht gefunden, wird injiziert:', logoUrl)

  const logoHtml = `<a href="/" class="flex items-center">
  <img src="${logoUrl}" alt="${siteName || 'Logo'}" class="h-8 w-auto">
</a>`

  // Strategie 1: Ersetze Placeholder-Logos
  const placeholderPatterns = [
    /<img[^>]*src=["'](?:\/logo\.(?:png|svg|webp)|logo\.(?:png|svg|webp)|https?:\/\/(?:placeholder|via\.placeholder|placehold)[^"']*)[^>]*>/gi,
    /<img[^>]*alt=["'](?:Logo|Site Logo|Company Logo)[^"']*[^>]*src=["'](?!(?:https?:)?\/\/[a-z0-9-]+\.supabase)[^"']+[^>]*>/gi,
  ]

  let modifiedHtml = html
  let replaced = false

  for (const pattern of placeholderPatterns) {
    if (pattern.test(modifiedHtml)) {
      modifiedHtml = modifiedHtml.replace(pattern, `<img src="${logoUrl}" alt="${siteName || 'Logo'}" class="h-8 w-auto">`)
      replaced = true
      break
    }
  }

  if (replaced) {
    return { html: modifiedHtml, wasInjected: true }
  }

  // Strategie 2: Finde einen Link zur Startseite ohne Logo und füge das Logo hinzu
  const homeLinkPattern = /<a[^>]*href=["']\/["'][^>]*>\s*(?:<span[^>]*>)?([^<]+)(?:<\/span>)?\s*<\/a>/i
  const homeLinkMatch = modifiedHtml.match(homeLinkPattern)

  if (homeLinkMatch && homeLinkMatch[1] && !homeLinkMatch[0].includes('<img')) {
    const originalLink = homeLinkMatch[0]
    const linkText = homeLinkMatch[1].trim()

    // Ersetze den Text-Link durch Logo + Text
    const newLink = `<a href="/" class="flex items-center gap-2">
  <img src="${logoUrl}" alt="${siteName || 'Logo'}" class="h-8 w-auto">
  <span class="font-semibold">${linkText}</span>
</a>`
    modifiedHtml = modifiedHtml.replace(originalLink, newLink)
    return { html: modifiedHtml, wasInjected: true }
  }

  // Strategie 3: Finde den Header und füge das Logo am Anfang des ersten flex/nav Containers ein
  const headerMatch = modifiedHtml.match(/<header[^>]*>([\s\S]*?)<\/header>/i)

  if (headerMatch) {
    const headerContent = headerMatch[1]

    // Suche nach dem ersten Container im Header (div mit flex oder nav)
    const containerPattern = /(<(?:div|nav)[^>]*class=["'][^"']*(?:flex|container)[^"']*["'][^>]*>)/i
    const containerMatch = headerContent.match(containerPattern)

    if (containerMatch) {
      const originalContainer = containerMatch[1]
      const newHeaderContent = headerContent.replace(
        originalContainer,
        `${originalContainer}\n${logoHtml}`
      )
      modifiedHtml = modifiedHtml.replace(headerContent, newHeaderContent)
      return { html: modifiedHtml, wasInjected: true }
    }

    // Fallback: Füge direkt nach <header> ein
    modifiedHtml = modifiedHtml.replace(
      /<header([^>]*)>/i,
      `<header$1>\n<div class="flex items-center">${logoHtml}</div>`
    )
    return { html: modifiedHtml, wasInjected: true }
  }

  // Keine geeignete Stelle gefunden - gib original zurück
  console.log('[Logo-Validation] Konnte keine geeignete Stelle für Logo-Injection finden')
  return { html, wasInjected: false }
}
