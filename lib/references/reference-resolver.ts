/**
 * Reference Resolver
 *
 * Lädt alle referenzierbaren Elemente für eine Site
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Reference,
  ReferenceGroup,
  PageReference,
  MenuReference,
  ComponentReference,
  SectionReference,
  EntryReference,
  TokenReference,
  ReferenceDataForAI,
  REFERENCE_CATEGORIES,
} from './reference-types'

interface ResolverOptions {
  siteId: string
  currentPageHtml?: string // Für Section-Extraktion
  includeCategories?: Array<keyof typeof REFERENCE_CATEGORIES>
}

/**
 * Lädt alle Referenzen für eine Site
 */
export async function loadAllReferences(options: ResolverOptions): Promise<ReferenceGroup[]> {
  const { siteId, currentPageHtml, includeCategories } = options
  const supabase = createClient()

  const groups: ReferenceGroup[] = []

  // Parallel alle Daten laden
  const [
    pagesResult,
    menusResult,
    componentsResult,
    cmsComponentsResult,
    entriesResult,
    tokensResult,
  ] = await Promise.all([
    // Seiten
    (!includeCategories || includeCategories.includes('page'))
      ? supabase
          .from('pages')
          .select('id, name, slug, is_home')
          .eq('site_id', siteId)
          .order('name')
      : Promise.resolve({ data: null }),

    // Menüs - menus table exists but types not generated
    (!includeCategories || includeCategories.includes('menu'))
      ? (supabase.from('menus' as 'pages') as any)
          .select('id, name, slug, position')
          .eq('site_id', siteId)
          .order('name')
      : Promise.resolve({ data: null }),

    // Components (Header/Footer) - Legacy
    (!includeCategories || includeCategories.includes('component'))
      ? supabase
          .from('components')
          .select('id, name, position, html')
          .eq('site_id', siteId)
          .in('position', ['header', 'footer'])
          .order('position')
      : Promise.resolve({ data: null }),

    // CMS Components (TOC, Reading Progress, etc.)
    (!includeCategories || includeCategories.includes('component'))
      ? supabase
          .from('cms_components')
          .select('id, name, slug, type, html, css, js, description')
          .eq('site_id', siteId)
          .not('slug', 'is', null)
          .order('name')
      : Promise.resolve({ data: null }),

    // Entries
    (!includeCategories || includeCategories.includes('entry'))
      ? supabase
          .from('entries')
          .select('id, title, slug, status, content_type_id, content_types(name, label_singular)')
          .eq('site_id', siteId)
          .order('title')
          .limit(50)
      : Promise.resolve({ data: null }),

    // Design Tokens
    (!includeCategories || includeCategories.includes('token'))
      ? supabase
          .from('design_variables')
          .select('*')
          .eq('site_id', siteId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  // Seiten verarbeiten
  if (pagesResult.data && pagesResult.data.length > 0) {
    const pageRefs: PageReference[] = pagesResult.data.map((page) => ({
      id: page.id,
      name: page.name,
      displayName: page.name,
      category: 'page' as const,
      icon: 'file-text',
      slug: page.slug || '',
      isHome: page.is_home || false,
    }))

    groups.push({
      category: 'page',
      label: 'Seiten',
      icon: 'file-text',
      items: pageRefs,
    })
  }

  // Menüs verarbeiten
  if (menusResult.data && menusResult.data.length > 0) {
    const menuRefs: MenuReference[] = (menusResult.data as Array<{ id: string; name: string; slug: string; position: string }>).map((menu) => ({
      id: menu.id,
      name: menu.name,
      displayName: menu.name,
      category: 'menu' as const,
      icon: 'menu',
      slug: menu.slug,
      position: menu.position,
      itemCount: 0, // TODO: Count items
    }))

    groups.push({
      category: 'menu',
      label: 'Menüs',
      icon: 'menu',
      items: menuRefs,
    })
  }

  // Components verarbeiten (Header/Footer + CMS Components)
  const allComponentRefs: ComponentReference[] = []

  // Legacy Header/Footer
  if (componentsResult.data && componentsResult.data.length > 0) {
    componentsResult.data.forEach((comp) => {
      allComponentRefs.push({
        id: comp.id,
        name: comp.name,
        displayName: `${comp.position === 'header' ? '🔝' : '🔻'} ${comp.name}`,
        category: 'component' as const,
        icon: 'component',
        position: comp.position as 'header' | 'footer' | 'content',
        html: comp.html || undefined,
      })
    })
  }

  // CMS Components (TOC, Reading Progress, etc.)
  if (cmsComponentsResult.data && cmsComponentsResult.data.length > 0) {
    cmsComponentsResult.data.forEach((comp) => {
      allComponentRefs.push({
        id: `cms_${comp.id}`, // Prefix to distinguish from legacy
        name: comp.name,
        displayName: `🧩 ${comp.name}`,
        category: 'component' as const,
        icon: 'puzzle',
        position: 'content' as const,
        html: comp.html || undefined,
      })
    })
  }

  if (allComponentRefs.length > 0) {
    groups.push({
      category: 'component',
      label: 'Components',
      icon: 'component',
      items: allComponentRefs,
    })
  }

  // Sections aus aktuellem HTML extrahieren
  if (currentPageHtml && (!includeCategories || includeCategories.includes('section'))) {
    const sections = extractSectionsFromHtml(currentPageHtml)
    if (sections.length > 0) {
      groups.push({
        category: 'section',
        label: 'Sections',
        icon: 'square',
        items: sections,
      })
    }
  }

  // Entries verarbeiten
  if (entriesResult.data && entriesResult.data.length > 0) {
    const entryRefs: EntryReference[] = entriesResult.data.map((entry) => {
      const contentType = entry.content_types as { name: string; label_singular: string } | null
      const title = entry.title || 'Untitled'
      return {
        id: entry.id,
        name: title,
        displayName: contentType ? `${contentType.label_singular}: ${title}` : title,
        category: 'entry' as const,
        icon: 'file',
        contentType: contentType?.name || '',
        contentTypeLabel: contentType?.label_singular || '',
        slug: entry.slug || '',
        status: entry.status || 'draft',
      }
    })

    groups.push({
      category: 'entry',
      label: 'Einträge',
      icon: 'file',
      items: entryRefs,
    })
  }

  // Design Tokens verarbeiten
  if (tokensResult.data) {
    const tokenRefs = extractTokensFromDesignVariables(tokensResult.data)
    if (tokenRefs.length > 0) {
      groups.push({
        category: 'token',
        label: 'Design Tokens',
        icon: 'palette',
        items: tokenRefs,
      })
    }
  }

  return groups
}

/**
 * Extrahiert Sections mit IDs aus HTML
 */
function extractSectionsFromHtml(html: string): SectionReference[] {
  const sections: SectionReference[] = []
  const seenIds = new Set<string>()

  // Verbesserte Regex - id kann überall im Tag stehen
  const idRegex = /<(section|div|article|main|aside)[^>]*\bid=["']([^"']+)["'][^>]*>/gi
  let match

  while ((match = idRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase()
    const id = match[2]

    // Skip wenn ID schon gesehen (vermeidet Duplikate)
    if (seenIds.has(id)) continue
    seenIds.add(id)

    // Skip generische IDs
    if (id === 'mobile-menu' || id === 'menu-icon' || id === 'close-icon') continue

    // Extrahiere den gesamten Element-Content (vereinfacht)
    const startIndex = match.index
    const endTag = `</${tagName}>`
    const endIndex = html.indexOf(endTag, startIndex)

    sections.push({
      id,
      name: id,
      displayName: `#${id}`,
      category: 'section',
      icon: 'square',
      tagName,
      html: endIndex > startIndex ? html.slice(startIndex, endIndex + endTag.length) : undefined,
    })
  }

  return sections
}

/**
 * Extrahiert Tokens aus Design Variables (für Dropdown-Anzeige)
 */
function extractTokensFromDesignVariables(designVars: Record<string, unknown>): TokenReference[] {
  const tokens: TokenReference[] = []

  // Farben
  const colors = designVars.colors as Record<string, Record<string, string>> | undefined
  if (colors) {
    // Brand Colors
    if (colors.brand) {
      Object.entries(colors.brand).forEach(([key, value]) => {
        if (value) {
          tokens.push({
            id: `color-brand-${key}`,
            name: key,
            displayName: `${key.charAt(0).toUpperCase() + key.slice(1)}Color`,
            category: 'token',
            icon: 'palette',
            tokenType: 'color',
            value: value,
          })
        }
      })
    }

    // Neutral Colors
    if (colors.neutral) {
      Object.entries(colors.neutral).forEach(([key, value]) => {
        if (value) {
          tokens.push({
            id: `color-neutral-${key}`,
            name: `neutral-${key}`,
            displayName: `Neutral${key}`,
            category: 'token',
            icon: 'palette',
            tokenType: 'color',
            value: value,
          })
        }
      })
    }
  }

  // Custom Colors
  const customColors = designVars.customColors as Record<string, string> | undefined
  if (customColors) {
    Object.entries(customColors).forEach(([key, value]) => {
      if (value) {
        tokens.push({
          id: `color-custom-${key}`,
          name: `custom-${key}`,
          displayName: `Custom: ${key}`,
          category: 'token',
          icon: 'palette',
          tokenType: 'color',
          value: value,
        })
      }
    })
  }

  // Gradients
  const gradients = designVars.gradients as Record<string, { from: string; to: string; via?: string; direction?: string }> | undefined
  if (gradients) {
    Object.entries(gradients).forEach(([key, value]) => {
      if (value?.from && value?.to) {
        const gradientValue = value.via
          ? `${value.from} → ${value.via} → ${value.to}`
          : `${value.from} → ${value.to}`
        tokens.push({
          id: `gradient-${key}`,
          name: `gradient-${key}`,
          displayName: `Gradient: ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          category: 'token',
          icon: 'palette',
          tokenType: 'gradient',
          value: gradientValue,
        })
      }
    })
  }

  // Typography
  const typography = designVars.typography as Record<string, string> | undefined
  if (typography) {
    if (typography.fontHeading) {
      tokens.push({
        id: 'font-heading',
        name: 'fontHeading',
        displayName: 'HeadingFont',
        category: 'token',
        icon: 'type',
        tokenType: 'font',
        value: typography.fontHeading,
      })
    }
    if (typography.fontBody) {
      tokens.push({
        id: 'font-body',
        name: 'fontBody',
        displayName: 'BodyFont',
        category: 'token',
        icon: 'type',
        tokenType: 'font',
        value: typography.fontBody,
      })
    }
    if (typography.fontMono) {
      tokens.push({
        id: 'font-mono',
        name: 'fontMono',
        displayName: 'MonoFont',
        category: 'token',
        icon: 'type',
        tokenType: 'font',
        value: typography.fontMono,
      })
    }
  }

  return tokens
}

/**
 * Loest Referenzen auf und gibt Daten fuer AI zurueck (mit IDs fuer Updates)
 */
export async function resolveReferencesForAI(
  siteId: string,
  selectedReferences: Array<{ category: string; id: string }>,
  currentPageHtml?: string
): Promise<ReferenceDataForAI> {
  const supabase = createClient()
  const result: ReferenceDataForAI = {}

  // Gruppiere nach Kategorie
  const byCategory = selectedReferences.reduce((acc, ref) => {
    if (!acc[ref.category]) acc[ref.category] = []
    acc[ref.category].push(ref.id)
    return acc
  }, {} as Record<string, string[]>)

  // Parallel laden
  const promises: PromiseLike<void>[] = []

  // Seiten (mit HTML als Style-Referenz)
  if (byCategory.page) {
    promises.push(
      supabase
        .from('pages')
        .select('id, name, slug, is_home, html_content')
        .in('id', byCategory.page)
        .then(({ data }) => {
          if (data) {
            result.pages = data.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug || '',
              isHome: p.is_home || false,
              html: p.html_content || undefined,
            }))
          }
        })
    )
  }

  // Menus mit Items (mit IDs) - menus table exists but types not generated
  if (byCategory.menu) {
    promises.push(
      (supabase.from('menus' as 'pages') as any)
        .select(`
          id, name, slug, position,
          menu_items (
            id,
            label,
            link_type,
            page_id,
            external_url,
            anchor,
            position,
            parent_id,
            pages (slug)
          )
        `)
        .in('id', byCategory.menu)
        .then(({ data }: { data: any }) => {
          if (data) {
            result.menus = data.map((menu: any) => {
              const items = (menu.menu_items || []) as Array<{
                id: string
                label: string
                link_type: string
                page_id: string | null
                external_url: string | null
                anchor: string | null
                position: number
                parent_id: string | null
                pages: { slug: string } | null
              }>

              // Hierarchie aufbauen
              const topLevel = items
                .filter((i) => !i.parent_id)
                .sort((a, b) => a.position - b.position)

              return {
                id: menu.id,
                name: menu.name,
                slug: menu.slug,
                position: menu.position,
                items: topLevel.map((item) => {
                  const url = resolveMenuItemUrl(item)
                  const children = items
                    .filter((i) => i.parent_id === item.id)
                    .sort((a, b) => a.position - b.position)
                    .map((child) => ({
                      id: child.id,
                      label: child.label,
                      url: resolveMenuItemUrl(child),
                    }))

                  return {
                    id: item.id,
                    label: item.label,
                    url,
                    linkType: item.link_type,
                    pageId: item.page_id || undefined,
                    ...(children.length > 0 ? { children } : {}),
                  }
                }),
              }
            })
          }
        })
    )
  }

  // Components (mit ID, CSS, JS) - Legacy + CMS
  if (byCategory.component) {
    // Split IDs into legacy and CMS
    const legacyIds = byCategory.component.filter(id => !id.startsWith('cms_'))
    const cmsIds = byCategory.component.filter(id => id.startsWith('cms_')).map(id => id.replace('cms_', ''))

    // Legacy components
    if (legacyIds.length > 0) {
      promises.push(
        supabase
          .from('components')
          .select('id, name, position, html, css, js')
          .in('id', legacyIds)
          .then(({ data }) => {
            if (data) {
              result.components = (result.components || []).concat(data.map((c) => ({
                id: c.id,
                name: c.name,
                position: c.position || 'content',
                html: c.html || '',
                css: c.css || undefined,
                js: c.js || undefined,
              })))
            }
          })
      )
    }

    // CMS Components
    if (cmsIds.length > 0) {
      promises.push(
        supabase
          .from('cms_components')
          .select('id, name, slug, html, css, js')
          .in('id', cmsIds)
          .then(({ data }) => {
            if (data) {
              result.components = (result.components || []).concat(data.map((c) => ({
                id: `cms_${c.id}`,
                name: c.name,
                position: 'content',
                html: c.html || '',
                css: c.css || undefined,
                js: c.js || undefined,
              })))
            }
          })
      )
    }
  }

  // Sections (aus aktuellem HTML)
  if (byCategory.section && currentPageHtml) {
    const allSections = extractSectionsFromHtml(currentPageHtml)
    result.sections = allSections
      .filter((s) => byCategory.section!.includes(s.id))
      .map((s) => ({
        id: s.id,
        selector: `#${s.id}`,
        tagName: s.tagName,
        html: s.html || '',
      }))
  }

  // Entries (mit ID und content_type_id)
  if (byCategory.entry) {
    promises.push(
      supabase
        .from('entries')
        .select('id, title, slug, data, content_type_id, content_types(name)')
        .in('id', byCategory.entry)
        .then(({ data }) => {
          if (data) {
            result.entries = data.map((e) => ({
              id: e.id,
              title: e.title || 'Untitled',
              slug: e.slug || '',
              contentType: (e.content_types as { name: string } | null)?.name || '',
              contentTypeId: e.content_type_id,
              data: (e.data as Record<string, unknown>) || {},
            }))
          }
        })
    )
  }

  // Design Tokens (komplettes Type System)
  if (byCategory.token) {
    promises.push(
      supabase
        .from('design_variables')
        .select('id, colors, typography, spacing, "customColors", gradients')
        .eq('site_id', siteId)
        .single()
        .then(({ data }) => {
          if (data) {
            const tokens = extractAllTokens(data as any, byCategory.token!)
            result.tokens = tokens
          }
        })
    )
  }

  await Promise.all(promises)

  return result
}

/**
 * Extrahiert alle Tokens aus Design Variables (komplettes Type System)
 */
function extractAllTokens(
  data: { id: string; colors?: unknown; typography?: unknown; spacing?: unknown; customColors?: unknown; gradients?: unknown },
  requestedIds: string[]
): ReferenceDataForAI['tokens'] {
  const tokens: ReferenceDataForAI['tokens'] = []

  const colors = data.colors as Record<string, Record<string, string>> | undefined
  const typography = data.typography as Record<string, unknown> | undefined
  const spacing = data.spacing as Record<string, string> | undefined
  const customColors = data.customColors as Record<string, string> | undefined
  const gradients = data.gradients as Record<string, { from: string; to: string; via?: string; direction?: string }> | undefined

  // Farben - Brand
  if (colors?.brand) {
    Object.entries(colors.brand).forEach(([key, value]) => {
      const tokenId = `color-brand-${key}`
      if (requestedIds.includes(tokenId)) {
        tokens.push({
          id: tokenId,
          name: `colors.brand.${key}`,
          displayName: `${key.charAt(0).toUpperCase() + key.slice(1)}Color`,
          type: 'color',
          value: value,
          category: 'colors',
        })
      }
    })
  }

  // Farben - Neutral
  if (colors?.neutral) {
    Object.entries(colors.neutral).forEach(([key, value]) => {
      const tokenId = `color-neutral-${key}`
      if (requestedIds.includes(tokenId)) {
        tokens.push({
          id: tokenId,
          name: `colors.neutral.${key}`,
          displayName: `Neutral${key}`,
          type: 'color',
          value: value,
          category: 'colors',
        })
      }
    })
  }

  // Custom Colors
  if (customColors) {
    Object.entries(customColors).forEach(([key, value]) => {
      const tokenId = `color-custom-${key}`
      if (requestedIds.includes(tokenId)) {
        tokens.push({
          id: tokenId,
          name: `customColors.${key}`,
          displayName: `Custom: ${key}`,
          type: 'color',
          value: value,
          category: 'customColors',
        })
      }
    })
  }

  // Gradients
  if (gradients) {
    Object.entries(gradients).forEach(([key, value]) => {
      const tokenId = `gradient-${key}`
      if (requestedIds.includes(tokenId) && value?.from && value?.to) {
        const gradientValue = JSON.stringify(value)
        tokens.push({
          id: tokenId,
          name: `gradients.${key}`,
          displayName: `Gradient: ${key.charAt(0).toUpperCase() + key.slice(1)}`,
          type: 'gradient',
          value: gradientValue,
          category: 'gradients',
        })
      }
    })
  }

  // Font-Familien
  if (typography) {
    const fontProps = ['fontHeading', 'fontBody', 'fontMono'] as const
    fontProps.forEach((prop) => {
      const value = typography[prop] as string | undefined
      if (value) {
        const tokenId = `font-${prop.replace('font', '').toLowerCase()}`
        if (requestedIds.includes(tokenId)) {
          tokens.push({
            id: tokenId,
            name: `typography.${prop}`,
            displayName: prop.replace('font', '') + 'Font',
            type: 'font',
            value: value,
            category: 'typography',
          })
        }
      }
    })

    // Font Sizes
    const fontSizes = typography.fontSizes as Record<string, string> | undefined
    if (fontSizes) {
      Object.entries(fontSizes).forEach(([key, value]) => {
        const tokenId = `fontSize-${key}`
        if (requestedIds.includes(tokenId)) {
          tokens.push({
            id: tokenId,
            name: `typography.fontSizes.${key}`,
            displayName: `FontSize${key.charAt(0).toUpperCase() + key.slice(1)}`,
            type: 'fontSize',
            value: value,
            category: 'typography',
          })
        }
      })
    }

    // Line Heights
    const lineHeights = typography.lineHeights as Record<string, string> | undefined
    if (lineHeights) {
      Object.entries(lineHeights).forEach(([key, value]) => {
        const tokenId = `lineHeight-${key}`
        if (requestedIds.includes(tokenId)) {
          tokens.push({
            id: tokenId,
            name: `typography.lineHeights.${key}`,
            displayName: `LineHeight${key.charAt(0).toUpperCase() + key.slice(1)}`,
            type: 'lineHeight',
            value: value,
            category: 'typography',
          })
        }
      })
    }

    // Letter Spacings
    const letterSpacings = typography.letterSpacings as Record<string, string> | undefined
    if (letterSpacings) {
      Object.entries(letterSpacings).forEach(([key, value]) => {
        const tokenId = `letterSpacing-${key}`
        if (requestedIds.includes(tokenId)) {
          tokens.push({
            id: tokenId,
            name: `typography.letterSpacings.${key}`,
            displayName: `LetterSpacing${key.charAt(0).toUpperCase() + key.slice(1)}`,
            type: 'letterSpacing',
            value: value,
            category: 'typography',
          })
        }
      })
    }

    // Font Weights
    const fontWeights = typography.fontWeights as Record<string, string> | undefined
    if (fontWeights) {
      Object.entries(fontWeights).forEach(([key, value]) => {
        const tokenId = `fontWeight-${key}`
        if (requestedIds.includes(tokenId)) {
          tokens.push({
            id: tokenId,
            name: `typography.fontWeights.${key}`,
            displayName: `FontWeight${key.charAt(0).toUpperCase() + key.slice(1)}`,
            type: 'fontWeight',
            value: value,
            category: 'typography',
          })
        }
      })
    }
  }

  // Spacing
  if (spacing) {
    Object.entries(spacing).forEach(([key, value]) => {
      const tokenId = `spacing-${key}`
      if (requestedIds.includes(tokenId)) {
        tokens.push({
          id: tokenId,
          name: `spacing.${key}`,
          displayName: `Spacing${key.charAt(0).toUpperCase() + key.slice(1)}`,
          type: 'spacing',
          value: value,
          category: 'spacing',
        })
      }
    })
  }

  return tokens
}

/**
 * Hilfsfunktion: Menu Item URL auflösen
 */
function resolveMenuItemUrl(item: {
  link_type: string
  pages?: { slug: string } | null
  external_url?: string | null
  anchor?: string | null
}): string {
  switch (item.link_type) {
    case 'page':
      return item.pages?.slug ? `/${item.pages.slug}` : '#'
    case 'external':
      return item.external_url || '#'
    case 'anchor':
      return item.anchor ? `#${item.anchor}` : '#'
    default:
      return '#'
  }
}

/**
 * Sucht Referenzen basierend auf Suchbegriff
 */
export function searchReferences(groups: ReferenceGroup[], query: string): ReferenceGroup[] {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return groups
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.displayName.toLowerCase().includes(normalizedQuery)
      ),
    }))
    .filter((group) => group.items.length > 0)
}
