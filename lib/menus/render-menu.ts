/**
 * Menu Rendering Utilities
 *
 * Rendert Menus als HTML fuer Header/Footer Components
 */

import type { Menu, MenuItem, MenuWithItems } from '@/types/menu'

interface RenderOptions {
  containerClass?: string
  itemClass?: string
  linkClass?: string
  activeClass?: string
  dropdownClass?: string
  currentPath?: string
  includeDropdowns?: boolean
  linksOnly?: boolean // Wenn true, werden nur Links ohne Container gerendert
}

/**
 * Rendert ein Menu als HTML Navigation
 */
export function renderMenuHtml(menu: MenuWithItems, options: RenderOptions = {}): string {
  const {
    containerClass = 'flex items-center gap-6',
    itemClass = '',
    linkClass = 'text-[var(--color-neutral-foreground)] hover:text-[var(--color-brand-primary)] transition-colors',
    activeClass = 'text-[var(--color-brand-primary)] font-medium',
    currentPath = '/',
    includeDropdowns = true,
    linksOnly = false,
  } = options

  if (!menu.items || menu.items.length === 0) {
    return ''
  }

  // Gruppiere Items nach Parent
  const topLevelItems = menu.items.filter((item) => !item.parentId)
  const childItems = menu.items.filter((item) => item.parentId)

  const itemsHtml = topLevelItems
    .map((item) => {
      const children = childItems.filter((child) => child.parentId === item.id)
      return renderMenuItem(item, children, {
        itemClass,
        linkClass,
        activeClass,
        dropdownClass: options.dropdownClass,
        currentPath,
        includeDropdowns,
      })
    })
    .join('\n')

  // Wenn linksOnly, nur die Links ohne Container zurückgeben
  if (linksOnly) {
    return itemsHtml
  }

  return `<nav class="${containerClass}">\n${itemsHtml}\n</nav>`
}

/**
 * Rendert ein einzelnes Menu Item
 */
function renderMenuItem(
  item: MenuItem,
  children: MenuItem[],
  options: {
    itemClass?: string
    linkClass?: string
    activeClass?: string
    dropdownClass?: string
    currentPath?: string
    includeDropdowns?: boolean
  }
): string {
  const url = getItemUrl(item)
  const isActive = options.currentPath === url
  const linkClasses = isActive
    ? `${options.linkClass} ${options.activeClass}`
    : options.linkClass

  // Einfaches Item ohne Kinder
  if (children.length === 0 || !options.includeDropdowns) {
    return `  <a href="${url}" class="${linkClasses}"${item.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(item.label)}</a>`
  }

  // Item mit Dropdown
  const dropdownClass = options.dropdownClass || 'absolute top-full left-0 mt-2 py-2 bg-[var(--color-neutral-background)] rounded-lg shadow-lg border border-[var(--color-neutral-border)] min-w-[200px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all'

  const childrenHtml = children
    .map(
      (child) =>
        `      <a href="${getItemUrl(child)}" class="block px-4 py-2 text-sm text-[var(--color-neutral-foreground)] hover:bg-[var(--color-neutral-muted)] hover:text-[var(--color-brand-primary)]"${child.target === '_blank' ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(child.label)}</a>`
    )
    .join('\n')

  return `  <div class="relative group ${options.itemClass || ''}">
    <button class="${options.linkClass} flex items-center gap-1">
      ${escapeHtml(item.label)}
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
    </button>
    <div class="${dropdownClass}">
${childrenHtml}
    </div>
  </div>`
}

/**
 * Holt die URL eines Menu Items
 */
function getItemUrl(item: MenuItem): string {
  switch (item.linkType) {
    case 'page':
      return item.pageSlug ? `/${item.pageSlug}` : '/'
    case 'external':
      return item.externalUrl || '#'
    case 'anchor':
      return `#${item.anchor || ''}`
    case 'archive':
      return item.contentTypeSlug ? `/${item.contentTypeSlug}` : '#'
    default:
      return '#'
  }
}

/**
 * Escaped HTML fuer sichere Ausgabe
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Ersetzt Menu-Platzhalter im HTML
 *
 * Platzhalter-Format: {{menu:slug}} oder {{menu:position}}
 * Slugs können Bindestriche enthalten (z.B. header-menu, footer-menu)
 */
export function injectMenusIntoHtml(
  html: string,
  menus: MenuWithItems[],
  options: RenderOptions = {}
): string {
  let result = html

  // Ersetze {{menu:slug}} Platzhalter (slug kann Bindestriche enthalten!)
  const menuRegex = /\{\{menu:([\w-]+)\}\}/g
  let match

  while ((match = menuRegex.exec(html)) !== null) {
    const identifier = match[1]
    const menu = menus.find(
      (m) => m.slug === identifier || m.position === identifier
    )

    if (menu) {
      // Standardmäßig nur Links rendern (ohne Container),
      // da der Placeholder meist in einem existierenden Container liegt
      const menuHtml = renderMenuHtml(menu, {
        ...options,
        linksOnly: options.linksOnly !== false, // Default true für Injection
      })
      result = result.replace(match[0], menuHtml)
    } else {
      // Kein Menu gefunden - Placeholder entfernen damit kein broken HTML
      result = result.replace(match[0], '')
    }
  }

  return result
}

/**
 * Generiert ein Standard Header HTML mit Menu-Placeholder
 * Das Menu wird später dynamisch via injectMenusIntoHtml() eingefügt
 *
 * @param usePlaceholder - true: verwendet {{menu:header}} Placeholder für dynamisches Menu
 *                         false: rendert Menu direkt (legacy)
 */
export function generateHeaderWithMenu(
  siteName: string,
  logoUrl: string | null,
  menu: MenuWithItems | null,
  options: {
    sticky?: boolean
    transparent?: boolean
    ctaButton?: { label: string; url: string }
    usePlaceholder?: boolean // NEU: Placeholder statt hartem Menu
    menuSlug?: string // NEU: Slug für Placeholder (default: 'header-menu')
  } = {}
): string {
  const { sticky = true, transparent = false, ctaButton, usePlaceholder = true, menuSlug = 'header-menu' } = options

  const headerClasses = [
    'w-full',
    sticky ? 'sticky top-0 z-50' : '',
    transparent ? 'bg-transparent' : 'bg-[var(--color-neutral-background)] border-b border-[var(--color-neutral-border)]',
  ]
    .filter(Boolean)
    .join(' ')

  // Entweder Placeholder oder direkt gerendertes Menu
  let menuHtml: string
  if (usePlaceholder) {
    // Placeholder wird später durch injectMenusIntoHtml() ersetzt
    menuHtml = `{{menu:${menuSlug}}}`
  } else if (menu) {
    // Legacy: direkt rendern
    menuHtml = renderMenuHtml(menu, {
      containerClass: 'hidden md:flex items-center gap-8',
      linkClass: 'text-sm text-[var(--color-neutral-foreground)] hover:text-[var(--color-brand-primary)] transition-colors',
    })
  } else {
    menuHtml = ''
  }

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${escapeHtml(siteName)}" class="h-8" />`
    : `<span class="text-xl font-bold text-[var(--color-neutral-foreground)]">${escapeHtml(siteName)}</span>`

  const ctaHtml = ctaButton
    ? `<a href="${ctaButton.url}" class="px-4 py-2 bg-[var(--color-brand-primary)] text-white text-sm rounded-lg hover:bg-[var(--color-brand-primaryHover)] transition-colors">${escapeHtml(ctaButton.label)}</a>`
    : ''

  return `<header class="${headerClasses}">
  <div class="container mx-auto px-4 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center">
      ${logoHtml}
    </a>
    <div class="hidden md:flex items-center gap-8">
      ${menuHtml}
    </div>
    <div class="flex items-center gap-4">
      ${ctaHtml}
      <button class="md:hidden p-2 text-[var(--color-neutral-foreground)] hover:text-[var(--color-brand-primary)]">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
    </div>
  </div>
</header>`
}

/**
 * Generiert ein Standard Footer HTML mit Menu-Placeholder
 * Das Menu wird später dynamisch via injectMenusIntoHtml() eingefügt
 */
export function generateFooterWithMenu(
  siteName: string,
  menu: MenuWithItems | null,
  options: {
    copyright?: string
    socialLinks?: Array<{ icon: string; url: string; label: string }>
    usePlaceholder?: boolean // NEU: Placeholder statt hartem Menu
    menuSlug?: string // NEU: Slug für Placeholder (default: 'footer-menu')
  } = {}
): string {
  const { copyright, socialLinks = [], usePlaceholder = true, menuSlug = 'footer-menu' } = options
  const year = new Date().getFullYear()
  const copyrightText = copyright || `${year} ${siteName}. Alle Rechte vorbehalten.`

  // Entweder Placeholder oder direkt gerendertes Menu
  let menuHtml: string
  if (usePlaceholder) {
    menuHtml = `{{menu:${menuSlug}}}`
  } else if (menu) {
    menuHtml = renderMenuHtml(menu, {
      containerClass: 'flex flex-wrap justify-center gap-6 mb-6',
      linkClass: 'text-sm text-[var(--color-neutral-foreground)]/70 hover:text-[var(--color-neutral-foreground)] transition-colors',
      includeDropdowns: false,
    })
  } else {
    menuHtml = ''
  }

  const socialHtml =
    socialLinks.length > 0
      ? `<div class="flex justify-center gap-4 mb-6">
${socialLinks.map((link) => `      <a href="${link.url}" class="text-[var(--color-neutral-foreground)]/50 hover:text-[var(--color-neutral-foreground)] transition-colors" aria-label="${escapeHtml(link.label)}">${link.icon}</a>`).join('\n')}
    </div>`
      : ''

  return `<footer class="bg-[var(--color-neutral-muted)] border-t border-[var(--color-neutral-border)]">
  <div class="container mx-auto px-4 py-12">
    <div class="flex flex-wrap justify-center gap-6 mb-6">
      ${menuHtml}
    </div>
    ${socialHtml}
    <p class="text-center text-sm text-[var(--color-neutral-foreground)]/50">${escapeHtml(copyrightText)}</p>
  </div>
</footer>`
}
