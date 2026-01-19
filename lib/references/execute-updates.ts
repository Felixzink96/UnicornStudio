/**
 * Execute Reference Updates
 *
 * Fuehrt Referenz-Updates aus und speichert in der Datenbank
 */

import { createClient } from '@/lib/supabase/client'
import type {
  ReferenceUpdate,
  ComponentUpdate,
  SectionUpdate,
  TokenUpdate,
  MenuUpdate,
  EntryUpdate,
  PageUpdate,
} from '@/lib/ai/reference-operations'
import { ensureLogoInHeader } from '@/lib/ai/reference-operations'

export interface ExecuteResult {
  success: boolean
  message: string
  updatedId?: string
  error?: string
}

/**
 * Fuehrt alle Updates aus
 */
export async function executeReferenceUpdates(
  updates: ReferenceUpdate[],
  context: {
    siteId: string
    currentHtml?: string
  }
): Promise<{ results: ExecuteResult[]; allSuccess: boolean }> {
  const results: ExecuteResult[] = []

  for (const update of updates) {
    const result = await executeSingleUpdate(update, context)
    results.push(result)
  }

  const allSuccess = results.every(r => r.success)

  return { results, allSuccess }
}

/**
 * Fuehrt ein einzelnes Update aus
 */
async function executeSingleUpdate(
  update: ReferenceUpdate,
  context: { siteId: string; currentHtml?: string }
): Promise<ExecuteResult> {
  try {
    switch (update.type) {
      case 'component':
        return await executeComponentUpdate(update as ComponentUpdate, context.siteId)

      case 'section':
        return await executeSectionUpdate(update as SectionUpdate, context)

      case 'token':
        return await executeTokenUpdate(update as TokenUpdate, context.siteId)

      case 'menu':
        return await executeMenuUpdate(update as MenuUpdate, context.siteId)

      case 'entry':
        return await executeEntryUpdate(update as EntryUpdate)

      case 'page':
        // Page updates werden ueber den normalen Editor-Flow behandelt
        return {
          success: true,
          message: 'Seiten-HTML Update wird ueber Editor angewendet',
        }

      default:
        return {
          success: false,
          message: 'Unbekannter Update-Typ',
          error: `Typ ${(update as ReferenceUpdate).type} nicht unterstuetzt`,
        }
    }
  } catch (error) {
    return {
      success: false,
      message: 'Fehler beim Ausfuehren des Updates',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }
  }
}

/**
 * Component Update (Header/Footer)
 */
async function executeComponentUpdate(
  update: ComponentUpdate,
  siteId: string
): Promise<ExecuteResult> {
  const supabase = createClient()

  // Logo-Validierung für Header
  let finalHtml = update.html

  if (update.componentType === 'header') {
    // Lade Logo-URL von der Site
    const { data: site } = await supabase
      .from('sites')
      .select('logo_url, name')
      .eq('id', siteId)
      .single()

    if (site?.logo_url) {
      const { html: validatedHtml, wasInjected } = ensureLogoInHeader(
        update.html,
        site.logo_url,
        site.name
      )
      finalHtml = validatedHtml

      if (wasInjected) {
        console.log('[Logo-Validation] Logo wurde automatisch in Header eingefügt')
      }
    }
  }

  const { data, error } = await supabase
    .from('components')
    .update({
      html: finalHtml,
      updated_at: new Date().toISOString(),
    })
    .eq('id', update.id)
    .select('id, name')
    .single()

  if (error) {
    return {
      success: false,
      message: `Fehler beim Aktualisieren des ${update.componentType}`,
      error: error.message,
    }
  }

  return {
    success: true,
    message: `${update.componentType === 'header' ? 'Header' : 'Footer'} "${data.name}" wurde aktualisiert`,
    updatedId: data.id,
  }
}

/**
 * Section Update (im Seiten-HTML)
 */
async function executeSectionUpdate(
  update: SectionUpdate,
  context: { siteId: string; currentHtml?: string }
): Promise<ExecuteResult> {
  // Section Updates muessen ueber den Editor-Store laufen
  // da sie das aktuelle HTML aendern
  // Das wird in ChatPanel behandelt

  return {
    success: true,
    message: `Section ${update.selector} wurde aktualisiert`,
    updatedId: update.id,
  }
}

/**
 * Token Update (Design Variable)
 */
async function executeTokenUpdate(
  update: TokenUpdate,
  siteId: string
): Promise<ExecuteResult> {
  const supabase = createClient()

  // Token ID Format: "color-brand-primary", "font-heading", etc.
  const idParts = update.id.split('-')
  const tokenType = idParts[0] // "color", "font", "fontSize", etc.

  // Lade aktuelle Design Variables
  const { data: current, error: fetchError } = await supabase
    .from('design_variables')
    .select('id, colors, typography, spacing')
    .eq('site_id', siteId)
    .single()

  if (fetchError || !current) {
    return {
      success: false,
      message: 'Design Variables nicht gefunden',
      error: fetchError?.message || 'Nicht gefunden',
    }
  }

  // Update den entsprechenden Wert
  const updateData: Record<string, unknown> = {}

  if (tokenType === 'color') {
    // Format: color-brand-primary, color-neutral-100
    const category = idParts[1] // "brand" oder "neutral"
    const colorName = idParts.slice(2).join('-') // "primary" oder "100"

    const colors = (current.colors || {}) as Record<string, Record<string, string>>
    if (!colors[category]) colors[category] = {}
    colors[category][colorName] = update.value
    updateData.colors = colors
  } else if (tokenType === 'font') {
    // Format: font-heading, font-body
    const fontType = idParts.slice(1).join('')
    const fontKey = 'font' + fontType.charAt(0).toUpperCase() + fontType.slice(1)

    const typography = (current.typography || {}) as Record<string, unknown>
    typography[fontKey] = update.value
    updateData.typography = typography
  } else if (tokenType === 'fontSize' || tokenType === 'lineHeight' || tokenType === 'letterSpacing' || tokenType === 'fontWeight') {
    // Format: fontSize-lg, lineHeight-normal, etc.
    const sizeName = idParts.slice(1).join('-')

    const typography = (current.typography || {}) as Record<string, unknown>
    const subCategory = tokenType + 's' as string // fontSizes, lineHeights, etc.
    if (!typography[subCategory]) typography[subCategory] = {}
    ;(typography[subCategory] as Record<string, string>)[sizeName] = update.value
    updateData.typography = typography
  } else if (tokenType === 'spacing') {
    // Format: spacing-sm, spacing-lg
    const spacingName = idParts.slice(1).join('-')

    const spacing = (current.spacing || {}) as Record<string, string>
    spacing[spacingName] = update.value
    updateData.spacing = spacing
  }

  // Speichern
  const { error: updateError } = await supabase
    .from('design_variables')
    .update({
      ...updateData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id)

  if (updateError) {
    return {
      success: false,
      message: 'Fehler beim Aktualisieren des Design Tokens',
      error: updateError.message,
    }
  }

  return {
    success: true,
    message: `Design Token wurde auf "${update.value}" geaendert`,
    updatedId: update.id,
  }
}

/**
 * Menu Update
 */
async function executeMenuUpdate(
  update: MenuUpdate,
  siteId: string
): Promise<ExecuteResult> {
  const supabase = createClient()

  switch (update.action) {
    case 'add':
      if (!update.items || update.items.length === 0) {
        return { success: false, message: 'Keine Items zum Hinzufuegen', error: 'items leer' }
      }

      // Items hinzufuegen
      for (const item of update.items) {
        // Page ID ermitteln wenn page angegeben
        let pageId: string | null = null
        if (item.page) {
          const pageName = item.page.replace(/^@/, '')
          const { data: page } = await supabase
            .from('pages')
            .select('id')
            .eq('site_id', siteId)
            .ilike('name', pageName)
            .single()

          if (page) {
            pageId = page.id
          }
        }

        // Menu items table exists but types not generated - use type assertion
        await (supabase.from('menu_items' as 'pages') as unknown as ReturnType<typeof supabase.from>).insert({
          menu_id: update.id,
          label: item.label,
          link_type: pageId ? 'page' : item.url ? 'external' : 'custom',
          page_id: pageId,
          external_url: item.url || null,
          position: item.position || 0,
        } as Record<string, unknown>)
      }

      return {
        success: true,
        message: `${update.items.length} Item(s) zum Menu hinzugefuegt`,
        updatedId: update.id,
      }

    case 'remove':
      if (!update.items || update.items.length === 0) {
        return { success: false, message: 'Keine Items zum Entfernen', error: 'items leer' }
      }

      for (const item of update.items) {
        // Menu items table exists but types not generated
        await (supabase.from('menu_items' as 'pages') as any)
          .delete()
          .eq('menu_id', update.id)
          .eq('label', item.label)
      }

      return {
        success: true,
        message: `${update.items.length} Item(s) aus Menu entfernt`,
        updatedId: update.id,
      }

    case 'reorder':
      if (!update.items) {
        return { success: false, message: 'Keine Reihenfolge angegeben', error: 'items leer' }
      }

      for (let i = 0; i < update.items.length; i++) {
        const item = update.items[i]
        // Menu items table exists but types not generated
        await (supabase.from('menu_items' as 'pages') as any)
          .update({ position: i })
          .eq('menu_id', update.id)
          .eq('label', item.label)
      }

      return {
        success: true,
        message: 'Menu wurde neu sortiert',
        updatedId: update.id,
      }

    case 'update':
      // Update existing items
      if (update.items) {
        for (const item of update.items) {
          // Menu items table exists but types not generated
          await (supabase.from('menu_items' as 'pages') as any)
            .update({
              label: item.label,
              position: item.position,
            })
            .eq('menu_id', update.id)
            .eq('label', item.label)
        }
      }

      return {
        success: true,
        message: 'Menu wurde aktualisiert',
        updatedId: update.id,
      }

    default:
      return {
        success: false,
        message: 'Unbekannte Menu-Aktion',
        error: `Aktion "${update.action}" nicht unterstuetzt`,
      }
  }
}

/**
 * Entry Update
 */
async function executeEntryUpdate(update: EntryUpdate): Promise<ExecuteResult> {
  const supabase = createClient()

  // Lade aktuellen Entry
  const { data: current, error: fetchError } = await supabase
    .from('entries')
    .select('id, data')
    .eq('id', update.id)
    .single()

  if (fetchError || !current) {
    return {
      success: false,
      message: 'Entry nicht gefunden',
      error: fetchError?.message || 'Nicht gefunden',
    }
  }

  // Merge neue Daten mit bestehenden
  const currentData = (current.data || {}) as Record<string, unknown>
  const mergedData = {
    ...currentData,
    ...update.data,
  }

  // Speichern
  const { error: updateError } = await supabase
    .from('entries')
    .update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: mergedData as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', update.id)

  if (updateError) {
    return {
      success: false,
      message: 'Fehler beim Aktualisieren des Entries',
      error: updateError.message,
    }
  }

  return {
    success: true,
    message: 'Entry wurde aktualisiert',
    updatedId: update.id,
  }
}

/**
 * Aktualisiert Section im Seiten-HTML
 */
export function applySectionUpdate(
  currentHtml: string,
  update: SectionUpdate
): string {
  const { selector, html: newHtml } = update

  // Finde und ersetze die Section
  const selectorWithoutHash = selector.replace(/^#/, '')

  // Regex um das Element mit der ID zu finden
  const regex = new RegExp(
    `(<(?:section|div|article|main|aside)[^>]*\\s+id=["']${selectorWithoutHash}["'][^>]*>)[\\s\\S]*?(<\\/(?:section|div|article|main|aside)>)`,
    'i'
  )

  if (regex.test(currentHtml)) {
    // Ersetze nur den Inhalt zwischen den Tags
    return currentHtml.replace(regex, newHtml)
  }

  // Fallback: Fuege am Ende des body ein
  return currentHtml.replace(/<\/body>/i, `${newHtml}\n</body>`)
}
