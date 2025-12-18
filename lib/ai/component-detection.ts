import type {
  ComponentPosition,
  ComponentDetectionResult,
  DetectedComponent,
} from '@/types/global-components'

/**
 * Header-Indikatoren für die automatische Erkennung
 */
const HEADER_INDICATORS = {
  // HTML Tags und Attribute
  tags: ['<header', 'role="banner"', '<nav'],
  // Klassen
  classes: [
    'navbar',
    'nav-bar',
    'navigation',
    'main-nav',
    'site-header',
    'top-bar',
    'header-',
    'fixed top-',
    'sticky top-',
  ],
  // IDs
  ids: ['header', 'navbar', 'navigation', 'main-header', 'site-header', 'top-nav'],
  // Content Keywords
  keywords: ['logo', 'menu', 'navigation', 'login', 'sign up', 'burger'],
}

/**
 * Footer-Indikatoren für die automatische Erkennung
 */
const FOOTER_INDICATORS = {
  // HTML Tags und Attribute
  tags: ['<footer', 'role="contentinfo"'],
  // Klassen
  classes: [
    'footer',
    'site-footer',
    'main-footer',
    'page-footer',
    'bottom-',
    'footer-',
  ],
  // IDs
  ids: ['footer', 'site-footer', 'main-footer', 'page-footer'],
  // Content Keywords
  keywords: [
    'copyright',
    '©',
    'all rights reserved',
    'datenschutz',
    'impressum',
    'privacy policy',
    'terms of service',
    'kontakt',
    'newsletter',
    'subscribe',
    'social media',
    'follow us',
  ],
}

/**
 * Erkennt ob ein HTML-String ein Header ist
 */
export function detectHeader(html: string): ComponentDetectionResult {
  const lowerHtml = html.toLowerCase()
  const indicators: string[] = []
  let score = 0

  // Check Tags
  for (const tag of HEADER_INDICATORS.tags) {
    if (lowerHtml.includes(tag.toLowerCase())) {
      score += 30
      indicators.push(`Tag: ${tag}`)
    }
  }

  // Check Classes
  for (const cls of HEADER_INDICATORS.classes) {
    if (lowerHtml.includes(cls.toLowerCase())) {
      score += 15
      indicators.push(`Class: ${cls}`)
    }
  }

  // Check IDs
  for (const id of HEADER_INDICATORS.ids) {
    if (lowerHtml.includes(`id="${id}"`) || lowerHtml.includes(`id='${id}'`)) {
      score += 25
      indicators.push(`ID: ${id}`)
    }
  }

  // Check Keywords
  for (const keyword of HEADER_INDICATORS.keywords) {
    if (lowerHtml.includes(keyword.toLowerCase())) {
      score += 5
      indicators.push(`Keyword: ${keyword}`)
    }
  }

  // Position Check - Header ist meist am Anfang
  const firstSectionMatch = html.match(/<(section|div|header)[^>]*>/i)
  if (firstSectionMatch && html.indexOf(firstSectionMatch[0]) < 500) {
    score += 10
    indicators.push('Position: Near top')
  }

  // Negative Indikatoren (zu lang für Header)
  const sectionCount = (html.match(/<section/gi) || []).length
  if (sectionCount > 2) {
    score -= 20
    indicators.push('Negative: Too many sections')
  }

  const confidence = Math.min(100, Math.max(0, score))

  return {
    isHeader: confidence >= 50,
    isFooter: false,
    confidence,
    indicators,
  }
}

/**
 * Erkennt ob ein HTML-String ein Footer ist
 */
export function detectFooter(html: string): ComponentDetectionResult {
  const lowerHtml = html.toLowerCase()
  const indicators: string[] = []
  let score = 0

  // Check Tags
  for (const tag of FOOTER_INDICATORS.tags) {
    if (lowerHtml.includes(tag.toLowerCase())) {
      score += 30
      indicators.push(`Tag: ${tag}`)
    }
  }

  // Check Classes
  for (const cls of FOOTER_INDICATORS.classes) {
    if (lowerHtml.includes(cls.toLowerCase())) {
      score += 15
      indicators.push(`Class: ${cls}`)
    }
  }

  // Check IDs
  for (const id of FOOTER_INDICATORS.ids) {
    if (lowerHtml.includes(`id="${id}"`) || lowerHtml.includes(`id='${id}'`)) {
      score += 25
      indicators.push(`ID: ${id}`)
    }
  }

  // Check Keywords
  for (const keyword of FOOTER_INDICATORS.keywords) {
    if (lowerHtml.includes(keyword.toLowerCase())) {
      score += 8
      indicators.push(`Keyword: ${keyword}`)
    }
  }

  const confidence = Math.min(100, Math.max(0, score))

  return {
    isHeader: false,
    isFooter: confidence >= 50,
    confidence,
    indicators,
  }
}

/**
 * Erkennt automatisch den Typ einer Component
 */
export function detectComponentType(html: string): ComponentPosition {
  const headerResult = detectHeader(html)
  const footerResult = detectFooter(html)

  if (headerResult.isHeader && headerResult.confidence > footerResult.confidence) {
    return 'header'
  }

  if (footerResult.isFooter && footerResult.confidence > headerResult.confidence) {
    return 'footer'
  }

  return 'content'
}

/**
 * Analysiert HTML und extrahiert potentielle Global Components
 */
export function analyzeHtmlForComponents(html: string): DetectedComponent[] {
  const components: DetectedComponent[] = []

  // Helper: Find matching closing tag (handles nested tags)
  const findClosingTag = (content: string, tagName: string, startIndex: number): number => {
    let depth = 1
    const openTag = new RegExp(`<${tagName}[^>]*>`, 'gi')
    const closeTag = new RegExp(`</${tagName}>`, 'gi')

    let searchPos = startIndex
    while (depth > 0 && searchPos < content.length) {
      openTag.lastIndex = searchPos
      closeTag.lastIndex = searchPos

      const nextOpen = openTag.exec(content)
      const nextClose = closeTag.exec(content)

      if (!nextClose) break

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++
        searchPos = nextOpen.index + nextOpen[0].length
      } else {
        depth--
        if (depth === 0) {
          return nextClose.index + nextClose[0].length
        }
        searchPos = nextClose.index + nextClose[0].length
      }
    }
    return -1
  }

  // Header Detection - robust for nested elements
  const headerOpenMatch = html.match(/<header[^>]*>/i)
  if (headerOpenMatch) {
    const startIndex = headerOpenMatch.index! + headerOpenMatch[0].length
    const endIndex = findClosingTag(html, 'header', startIndex)
    if (endIndex > 0) {
      const headerHtml = html.substring(headerOpenMatch.index!, endIndex)
      console.log('[Component Detection] Found header, length:', headerHtml.length)
      components.push({
        type: 'header',
        confidence: detectHeader(headerHtml).confidence,
        html: headerHtml,
        suggestedName: 'Global Header',
      })
    }
  }

  // Footer Detection - robust for nested elements
  const footerOpenMatch = html.match(/<footer[^>]*>/i)
  if (footerOpenMatch) {
    const startIndex = footerOpenMatch.index! + footerOpenMatch[0].length
    const endIndex = findClosingTag(html, 'footer', startIndex)
    if (endIndex > 0) {
      const footerHtml = html.substring(footerOpenMatch.index!, endIndex)
      console.log('[Component Detection] Found footer, length:', footerHtml.length)
      components.push({
        type: 'footer',
        confidence: detectFooter(footerHtml).confidence,
        html: footerHtml,
        suggestedName: 'Global Footer',
      })
    }
  }

  // Nav Detection (falls kein header tag)
  if (!headerOpenMatch) {
    const navMatch = html.match(/<nav[^>]*>[\s\S]*?<\/nav>/i)
    if (navMatch) {
      const result = detectHeader(navMatch[0])
      if (result.isHeader) {
        components.push({
          type: 'header',
          confidence: result.confidence,
          html: navMatch[0],
          suggestedName: 'Navigation Header',
        })
      }
    }
  }

  return components
}

/**
 * Generiert einen Namen für eine erkannte Component
 */
export function generateComponentName(
  type: ComponentPosition,
  existingNames: string[]
): string {
  const baseName =
    type === 'header' ? 'Header' : type === 'footer' ? 'Footer' : 'Section'

  let name = baseName
  let counter = 1

  while (existingNames.includes(name)) {
    name = `${baseName} ${counter}`
    counter++
  }

  return name
}

/**
 * Prüft ob ein AI-Prompt nach einem Header/Footer fragt
 */
export function detectPromptIntent(prompt: string): {
  wantsHeader: boolean
  wantsFooter: boolean
} {
  const lowerPrompt = prompt.toLowerCase()

  const headerKeywords = [
    'header',
    'navigation',
    'navbar',
    'nav bar',
    'menü',
    'menu',
    'top bar',
    'kopfzeile',
  ]

  const footerKeywords = [
    'footer',
    'fußzeile',
    'fuß',
    'bottom',
    'copyright',
    'impressum',
  ]

  return {
    wantsHeader: headerKeywords.some((kw) => lowerPrompt.includes(kw)),
    wantsFooter: footerKeywords.some((kw) => lowerPrompt.includes(kw)),
  }
}
