/**
 * Menu Setup Functions
 *
 * Erstellt Menus und Header/Footer für das Site-Setup.
 */

import { createClient } from '@/lib/supabase/client'
import { createMenu, addMenuItem, getMenu } from '@/lib/supabase/queries/menus'
import { generateHeaderWithMenu, generateFooterWithMenu } from './render-menu'
import type { PageSuggestion } from '@/lib/ai/page-suggestions'
import type { Menu, MenuItem } from '@/types/menu'

export interface SetupMenusResult {
  headerMenuId: string
  footerMenuId: string
  headerMenu: Menu
  footerMenu: Menu
  headerHtml: string
  footerHtml: string
}

export interface MenuItemForSetup {
  label: string
  slug: string
  pageId?: string
}

/**
 * Erstellt das Header-Menu für eine Site
 */
export async function createHeaderMenu(
  siteId: string,
  items: MenuItemForSetup[]
): Promise<string> {
  // Menu erstellen
  const menuId = await createMenu({
    siteId,
    name: 'Hauptmenü',
    slug: 'header-menu',
    position: 'header',
    description: 'Hauptnavigation im Header',
  })

  // Items hinzufügen
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await addMenuItem({
      menuId,
      label: item.label,
      linkType: 'page',
      pageId: item.pageId,
      position: i,
    })
  }

  return menuId
}

/**
 * Erstellt das Footer-Menu für eine Site
 */
export async function createFooterMenu(
  siteId: string,
  items: MenuItemForSetup[]
): Promise<string> {
  // Menu erstellen
  const menuId = await createMenu({
    siteId,
    name: 'Footer-Links',
    slug: 'footer-menu',
    position: 'footer',
    description: 'Links im Footer',
  })

  // Items hinzufügen
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    await addMenuItem({
      menuId,
      label: item.label,
      linkType: 'page',
      pageId: item.pageId,
      position: i,
    })
  }

  return menuId
}

/**
 * Erstellt alle Seiten basierend auf den ausgewählten PageSuggestions
 */
export async function createPagesFromSuggestions(
  siteId: string,
  pages: PageSuggestion[]
): Promise<Map<string, string>> {
  const supabase = createClient()
  const pageIdMap = new Map<string, string>() // slug -> id

  for (const page of pages) {
    if (!page.selected) continue

    // Prüfe ob Seite bereits existiert
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('site_id', siteId)
      .eq('slug', page.slug)
      .single()

    if (existingPage) {
      pageIdMap.set(page.slug, existingPage.id)
      continue
    }

    // Neue Seite erstellen
    const { data: newPage, error } = await supabase
      .from('pages')
      .insert({
        site_id: siteId,
        name: page.name,
        slug: page.slug,
        is_home: page.slug === '',
        html_content: '', // Wird später von AI gefüllt
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Error creating page ${page.name}:`, error)
      continue
    }

    if (newPage) {
      pageIdMap.set(page.slug, newPage.id)
    }
  }

  return pageIdMap
}

/**
 * Erstellt NUR die Seiten (ohne Menus/Header/Footer)
 * Header/Footer werden von der KI generiert
 */
export async function createPagesOnly(
  siteId: string,
  pages: PageSuggestion[]
): Promise<{ pageCount: number; pageIds: Map<string, string> }> {
  const pageIdMap = await createPagesFromSuggestions(siteId, pages)

  return {
    pageCount: pageIdMap.size,
    pageIds: pageIdMap,
  }
}

/**
 * Erstellt Menus und generiert Header/Footer HTML für das Site-Setup
 */
export async function createSetupMenus(
  siteId: string,
  pages: PageSuggestion[],
  siteName: string,
  logoUrl?: string
): Promise<SetupMenusResult> {
  // 1. Zuerst alle Seiten erstellen
  const pageIdMap = await createPagesFromSuggestions(siteId, pages)

  // 2. Header-Menu Items (nur Hauptseiten, nicht Legal)
  const headerPages = pages.filter(p => p.selected && p.inHeader && !p.isLegalPage)
  const headerItems: MenuItemForSetup[] = headerPages.map(p => ({
    label: p.name,
    slug: p.slug,
    pageId: pageIdMap.get(p.slug),
  }))

  // 3. Footer-Menu Items (alle ausgewählten Seiten)
  const footerPages = pages.filter(p => p.selected && p.inFooter)
  const footerItems: MenuItemForSetup[] = footerPages.map(p => ({
    label: p.name,
    slug: p.slug,
    pageId: pageIdMap.get(p.slug),
  }))

  // 4. Menus erstellen
  const headerMenuId = await createHeaderMenu(siteId, headerItems)
  const footerMenuId = await createFooterMenu(siteId, footerItems)

  // 5. Menus laden für HTML-Generierung
  const headerMenu = await getMenu(headerMenuId)
  const footerMenu = await getMenu(footerMenuId)

  if (!headerMenu || !footerMenu) {
    throw new Error('Failed to load created menus')
  }

  // 6. Header/Footer HTML generieren
  // Finde die Kontakt-Seite für den CTA-Button
  const contactPage = pages.find(p => p.slug === 'kontakt' && p.selected)

  const headerHtml = generateHeaderWithMenu(
    siteName,
    logoUrl || null,
    {
      ...headerMenu,
      items: headerMenu.items.map(item => ({
        ...item,
        // Stelle sicher, dass resolvedUrl korrekt ist
        resolvedUrl: item.pageSlug !== undefined ? (item.pageSlug === '' ? '/' : `/${item.pageSlug}`) : '#',
      })),
    },
    {
      sticky: true,
      transparent: false,
      ctaButton: contactPage ? { label: 'Kontakt', url: '/kontakt' } : undefined,
    }
  )

  const footerHtml = generateFooterWithMenu(
    siteName,
    {
      ...footerMenu,
      items: footerMenu.items.map(item => ({
        ...item,
        resolvedUrl: item.pageSlug !== undefined ? (item.pageSlug === '' ? '/' : `/${item.pageSlug}`) : '#',
      })),
    },
    {
      copyright: `© ${new Date().getFullYear()} ${siteName}. Alle Rechte vorbehalten.`,
    }
  )

  return {
    headerMenuId,
    footerMenuId,
    headerMenu,
    footerMenu,
    headerHtml,
    footerHtml,
  }
}

/**
 * Generiert Header/Footer HTML Preview (ohne DB-Zugriff)
 */
export function generatePreviewMenus(
  pages: PageSuggestion[],
  siteName: string,
  logoUrl?: string
): { headerHtml: string; footerHtml: string } {
  // Header-Items
  const headerPages = pages.filter(p => p.selected && p.inHeader && !p.isLegalPage)
  const headerItems: MenuItem[] = headerPages.map((p, i) => ({
    id: `preview-header-${i}`,
    menuId: 'preview-header',
    parentId: null,
    linkType: 'page',
    label: p.name,
    pageSlug: p.slug,
    position: i,
    target: '_self',
    createdAt: '',
    updatedAt: '',
    resolvedUrl: p.slug === '' ? '/' : `/${p.slug}`,
  }))

  // Footer-Items
  const footerPages = pages.filter(p => p.selected && p.inFooter)
  const footerItems: MenuItem[] = footerPages.map((p, i) => ({
    id: `preview-footer-${i}`,
    menuId: 'preview-footer',
    parentId: null,
    linkType: 'page',
    label: p.name,
    pageSlug: p.slug,
    position: i,
    target: '_self',
    createdAt: '',
    updatedAt: '',
    resolvedUrl: p.slug === '' ? '/' : `/${p.slug}`,
  }))

  // Finde die Kontakt-Seite für den CTA-Button
  const contactPage = pages.find(p => p.slug === 'kontakt' && p.selected)

  const headerHtml = generateHeaderWithMenu(
    siteName,
    logoUrl || null,
    {
      id: 'preview-header',
      siteId: '',
      name: 'Preview Header',
      slug: 'preview-header',
      position: 'header',
      items: headerItems,
      settings: {},
      createdAt: '',
      updatedAt: '',
    },
    {
      sticky: true,
      transparent: false,
      ctaButton: contactPage ? { label: 'Kontakt', url: '/kontakt' } : undefined,
    }
  )

  const footerHtml = generateFooterWithMenu(
    siteName,
    {
      id: 'preview-footer',
      siteId: '',
      name: 'Preview Footer',
      slug: 'preview-footer',
      position: 'footer',
      items: footerItems,
      settings: {},
      createdAt: '',
      updatedAt: '',
    },
    {
      copyright: `© ${new Date().getFullYear()} ${siteName}. Alle Rechte vorbehalten.`,
    }
  )

  return { headerHtml, footerHtml }
}

/**
 * Speichert Header/Footer als Global Components
 */
export async function saveAsGlobalComponents(
  siteId: string,
  headerHtml: string,
  footerHtml: string
): Promise<{ headerId: string; footerId: string }> {
  const supabase = createClient()

  // Header als Global Component speichern
  const { data: headerId, error: headerError } = await supabase.rpc('create_global_component', {
    p_site_id: siteId,
    p_name: 'Main Header',
    p_html: headerHtml,
    p_position: 'header',
    p_description: 'Automatisch erstellter Header mit Navigation',
    p_category: 'header',
    p_set_as_site_default: true,
  })

  if (headerError) {
    console.error('Error saving header:', headerError)
    throw headerError
  }

  // Footer als Global Component speichern
  const { data: footerId, error: footerError } = await supabase.rpc('create_global_component', {
    p_site_id: siteId,
    p_name: 'Main Footer',
    p_html: footerHtml,
    p_position: 'footer',
    p_description: 'Automatisch erstellter Footer mit Navigation',
    p_category: 'footer',
    p_set_as_site_default: true,
  })

  if (footerError) {
    console.error('Error saving footer:', footerError)
    throw footerError
  }

  return { headerId, footerId }
}
