import type { ComponentPosition, DetectedComponent } from '@/types/global-components'
import { analyzeHtmlForComponents, detectHeader, detectFooter } from './component-detection'
import type { DesignVariables } from '@/types/cms'

/**
 * Standard Animation Keyframes die von der KI verwendet werden können
 * Diese werden automatisch injiziert wenn sie im HTML verwendet aber nicht definiert sind
 */
const ANIMATION_KEYFRAMES: Record<string, string> = {
  fadeIn: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  fadeOut: `@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  fadeUp: `@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}`,
  fadeDown: `@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}`,
  fadeLeft: `@keyframes fadeLeft {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}`,
  fadeRight: `@keyframes fadeRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}`,
  slideUp: `@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}`,
  slideDown: `@keyframes slideDown {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}`,
  slideLeft: `@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}`,
  slideRight: `@keyframes slideRight {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}`,
  zoomIn: `@keyframes zoomIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}`,
  zoomOut: `@keyframes zoomOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.9); }
}`,
  scaleUp: `@keyframes scaleUp {
  from { transform: scale(0); }
  to { transform: scale(1); }
}`,
  scaleDown: `@keyframes scaleDown {
  from { transform: scale(1); }
  to { transform: scale(0); }
}`,
  rotateIn: `@keyframes rotateIn {
  from { opacity: 0; transform: rotate(-180deg); }
  to { opacity: 1; transform: rotate(0); }
}`,
  shake: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}`,
  wiggle: `@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}`,
  float: `@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}`,
  pulse: `@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}`,
  glow: `@keyframes glow {
  0%, 100% { box-shadow: 0 0 5px currentColor; }
  50% { box-shadow: 0 0 20px currentColor; }
}`,
}

/**
 * Erkennt verwendete Animationen im HTML und injiziert fehlende Keyframes
 */
export function injectAnimationKeyframes(html: string): string {
  // Finde alle animate-[name...] Klassen
  const animateRegex = /animate-\[([a-zA-Z]+)[_\s]/g
  const usedAnimations = new Set<string>()

  let match
  while ((match = animateRegex.exec(html)) !== null) {
    usedAnimations.add(match[1])
  }

  if (usedAnimations.size === 0) {
    return html
  }

  // Sammle fehlende keyframes
  const missingKeyframes: string[] = []

  for (const animName of usedAnimations) {
    // Prüfe ob keyframes bereits im HTML definiert sind
    const keyframeRegex = new RegExp(`@keyframes\\s+${animName}\\s*\\{`, 'i')
    if (!keyframeRegex.test(html) && ANIMATION_KEYFRAMES[animName]) {
      missingKeyframes.push(ANIMATION_KEYFRAMES[animName])
    }
  }

  if (missingKeyframes.length === 0) {
    return html
  }

  // Erstelle Style-Block mit den fehlenden keyframes
  const keyframesCSS = `<style id="auto-animations">
/* Auto-injected animation keyframes */
${missingKeyframes.join('\n\n')}
</style>`

  // Füge vor </head> ein, oder vor </body> wenn kein head
  if (html.includes('</head>')) {
    return html.replace('</head>', `${keyframesCSS}\n</head>`)
  } else if (html.includes('</body>')) {
    return html.replace('</body>', `${keyframesCSS}\n</body>`)
  }

  // Fallback: Am Ende anhängen
  return html + keyframesCSS
}

/**
 * Convert hex color to RGB values (space-separated for Tailwind opacity)
 */
function hexToRgb(hex: string): string | null {
  const cleanHex = hex.replace('#', '')
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex)
  if (!result) return null
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
}

/**
 * Inject CSS variables from design variables into HTML
 * Outputs BOTH hex and RGB versions of colors for Tailwind opacity support
 */
export function injectCSSVariables(html: string, designVariables: DesignVariables | null): string {
  if (!designVariables) return html

  let css = ':root {\n'

  // Brand colors - output BOTH hex and RGB versions
  if (designVariables.colors?.brand) {
    const brand = designVariables.colors.brand as Record<string, string>
    for (const [key, value] of Object.entries(brand)) {
      if (value) {
        css += `  --color-brand-${key}: ${value};\n`
        const rgb = hexToRgb(value)
        if (rgb) css += `  --color-brand-${key}-rgb: ${rgb};\n`
      }
    }
  }

  // Neutral colors - output BOTH hex and RGB versions
  if (designVariables.colors?.neutral) {
    const neutral = designVariables.colors.neutral as Record<string, string>
    for (const [key, value] of Object.entries(neutral)) {
      if (value) {
        css += `  --color-neutral-${key}: ${value};\n`
        const rgb = hexToRgb(value)
        if (rgb) css += `  --color-neutral-${key}-rgb: ${rgb};\n`
      }
    }
  }

  // Custom colors - output BOTH hex and RGB versions
  if (designVariables.customColors) {
    for (const [key, value] of Object.entries(designVariables.customColors)) {
      if (value) {
        css += `  --color-custom-${key}: ${value};\n`
        const rgb = hexToRgb(value)
        if (rgb) css += `  --color-custom-${key}-rgb: ${rgb};\n`
      }
    }
  }

  // Typography
  if (designVariables.typography) {
    if (designVariables.typography.fontHeading) {
      css += `  --font-heading: '${designVariables.typography.fontHeading}', sans-serif;\n`
    }
    if (designVariables.typography.fontBody) {
      css += `  --font-body: '${designVariables.typography.fontBody}', sans-serif;\n`
    }
    if (designVariables.typography.fontMono) {
      css += `  --font-mono: '${designVariables.typography.fontMono}', monospace;\n`
    }
  }

  // Gradients
  if (designVariables.gradients) {
    for (const [key, gradient] of Object.entries(designVariables.gradients)) {
      if (gradient && gradient.enabled) {
        const direction = gradient.direction?.replace('to-', 'to ') || 'to right'
        const via = gradient.via ? `, ${gradient.via}` : ''
        css += `  --gradient-${key}: linear-gradient(${direction}, ${gradient.from}${via}, ${gradient.to});\n`
        css += `  --gradient-${key}-from: ${gradient.from};\n`
        css += `  --gradient-${key}-to: ${gradient.to};\n`
        if (gradient.via) {
          css += `  --gradient-${key}-via: ${gradient.via};\n`
        }
      }
    }
  }

  css += '}\n'

  const styleTag = `<style id="design-variables">\n${css}</style>`

  // Check if already has design variables
  if (html.includes('id="design-variables"')) {
    // Replace existing
    return html.replace(/<style id="design-variables">[\s\S]*?<\/style>/i, styleTag)
  }

  // Insert in <head> before closing
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}\n</head>`)
  }

  // Fallback: insert at beginning
  return styleTag + '\n' + html
}

// Types for HTML operations
export interface ParsedOperation {
  message: string
  operation: 'add' | 'modify' | 'delete' | 'replace_all'
  position?: 'start' | 'end' | 'before' | 'after'
  target?: string
  selector?: string
  html: string
  // Global Component Detection
  componentType?: ComponentPosition
  componentName?: string
}

// Parse the streamed text format into operation
export function parseOperationFormat(content: string): ParsedOperation | null {
  try {
    // Extract MESSAGE
    const messageMatch = content.match(/MESSAGE:\s*([\s\S]+?)(?=\n---|\n\n)/)
    const message = messageMatch ? messageMatch[1].trim() : ''

    // Extract OPERATION
    const operationMatch = content.match(/OPERATION:\s*(add|modify|delete|replace_all)/i)
    const operation = operationMatch
      ? operationMatch[1].toLowerCase() as ParsedOperation['operation']
      : 'replace_all'

    // Extract POSITION (for add)
    const positionMatch = content.match(/POSITION:\s*(start|end|before|after)/i)
    const position = positionMatch
      ? positionMatch[1].toLowerCase() as ParsedOperation['position']
      : 'end'

    // Extract TARGET (for before/after)
    const targetMatch = content.match(/TARGET:\s*([^\n]+)/i)
    const target = targetMatch ? targetMatch[1].trim() : undefined

    // Extract SELECTOR (for modify/delete)
    const selectorMatch = content.match(/SELECTOR:\s*([^\n]+)/i)
    const selector = selectorMatch ? selectorMatch[1].trim() : undefined

    // Extract HTML - everything after the second ---
    const parts = content.split(/\n---\n/)
    let html = ''

    if (parts.length >= 3) {
      // HTML is in the third part
      html = parts.slice(2).join('\n---\n').trim()
    } else if (parts.length === 2) {
      // Maybe HTML is directly after operation block
      html = parts[1].replace(/^(MESSAGE|OPERATION|POSITION|TARGET|SELECTOR):[^\n]*\n/gim, '').trim()
    }

    // Clean up any remaining markdown code blocks
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()

    // Extract COMPONENT_TYPE (for global components)
    const componentTypeMatch = content.match(/COMPONENT_TYPE:\s*(header|footer|content)/i)
    const componentType = componentTypeMatch
      ? componentTypeMatch[1].toLowerCase() as ComponentPosition
      : undefined

    // Extract COMPONENT_NAME (for global components)
    const componentNameMatch = content.match(/COMPONENT_NAME:\s*([^\n]+)/i)
    const componentName = componentNameMatch ? componentNameMatch[1].trim() : undefined

    // Remove any operation metadata that may have leaked into HTML
    html = cleanOperationMetadataFromHtml(html)

    if (!html) return null

    return {
      message,
      operation,
      position,
      target,
      selector,
      html,
      componentType,
      componentName,
    }
  } catch (error) {
    console.error('Parse error:', error)
    return null
  }
}

// Extract HTML from streaming content for live preview
export function extractStreamingHtml(content: string): string | null {
  // Try to find HTML after the second ---
  const parts = content.split(/\n---\n/)

  if (parts.length >= 3) {
    let html = parts.slice(2).join('\n---\n')
    // Remove markdown code block markers
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '')
    // Clean operation metadata that may have leaked into HTML
    html = cleanOperationMetadataFromHtml(html)
    return html.trim() || null
  }

  // Fallback: look for HTML tags
  const htmlMatch = content.match(/<(!DOCTYPE|html|section|div|header|nav|main|footer|article)[^]*$/i)
  if (htmlMatch) {
    return cleanOperationMetadataFromHtml(htmlMatch[0])
  }

  return null
}

/**
 * Remove operation metadata that may have leaked into HTML content
 * This handles cases where AI doesn't properly separate metadata from HTML
 *
 * CRITICAL: This is the main failsafe against AI artifacts in HTML!
 */
export function cleanOperationMetadataFromHtml(html: string): string {
  if (!html) return html
  return html
    // === MESSAGE BLOCKS (CRITICAL - often leak into HTML) ===
    .replace(/^MESSAGE:.*$/gm, '')
    .replace(/MESSAGE:[\s\S]*?(?=\n---|\n\n|$)/g, '')
    // Remove MESSAGE...--- blocks that may span multiple lines (using [\s\S] instead of 's' flag)
    .replace(/MESSAGE:[\s\S]*?---/g, '')

    // === OPERATION METADATA ===
    // Remove operation block at start
    .replace(/^---\s*\nOPERATION:\s*\w+\s*\nPOSITION:\s*\w+\s*\n---\s*\n?/i, '')
    // Remove individual operation lines anywhere
    .replace(/\n?---\s*\n?OPERATION:\s*\w+\s*\n?/gi, '')
    .replace(/POSITION:\s*\w+\s*\n?---\s*\n?/gi, '')
    .replace(/^OPERATION:\s*\w+\s*$/gm, '')
    .replace(/^POSITION:\s*\w+\s*$/gm, '')
    .replace(/^TARGET:\s*[^\n]+$/gm, '')
    .replace(/^SELECTOR:\s*[^\n]+$/gm, '')
    .replace(/^COMPONENT_TYPE:\s*\w+\s*$/gm, '')
    .replace(/^COMPONENT_NAME:\s*[^\n]+$/gm, '')

    // === SEPARATORS ===
    // Remove stray --- separators (3 or more dashes)
    .replace(/^-{3,}\s*$/gm, '')
    .replace(/\n-{3,}\n/g, '\n')
    .replace(/^---\s*\n/gm, '')
    .replace(/\n---\s*$/gm, '')

    // === AI META-COMMENTS ===
    .replace(/<!--\s*Kein Code generiert[^>]*-->/gi, '')
    .replace(/<!--\s*No code generated[^>]*-->/gi, '')
    .replace(/<!--\s*Bitte wähle[^>]*-->/gi, '')
    .replace(/<!--\s*HEADER[^>]*-->/gi, '')
    .replace(/<!--\s*FOOTER[^>]*-->/gi, '')
    .replace(/<!--\s*(STORY|TEAM|ABOUT|CONTACT|SERVICES|FEATURES)\s*SECTION\s*-->/gi, '')
    .replace(/<!--\s*-->/g, '') // Empty comments

    // === CLEANUP ===
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Apply operation to existing HTML
export function applyOperation(existingHtml: string, op: ParsedOperation): string {
  let result: string

  // NOTE: We intentionally do NOT sanitize here because:
  // 1. The HTML comes from our AI (trusted source)
  // 2. It's displayed in a sandboxed iframe
  // 3. DOMPurify removes DOCTYPE, html/head/body structure, and script tags
  //    which breaks Tailwind and page structure
  // Sanitization should only be used for untrusted user input

  switch (op.operation) {
    case 'replace_all':
      result = op.html
      break

    case 'add':
      result = applyAddOperation(existingHtml, op)
      break

    case 'modify':
      result = applyModifyOperation(existingHtml, op)
      break

    case 'delete':
      result = applyDeleteOperation(existingHtml, op)
      break

    default:
      result = existingHtml
  }

  // FAILSAFE: Always clean the result to remove any AI artifacts
  return cleanOperationMetadataFromHtml(result)
}

function applyAddOperation(html: string, op: ParsedOperation): string {
  const position = op.position || 'end'
  let contentToAdd = op.html

  // SAFEGUARD: If AI gave full HTML document instead of just section, extract body content
  if (contentToAdd.includes('<!DOCTYPE') || contentToAdd.includes('<html')) {
    console.log('Add operation received full HTML - extracting body content only')
    const bodyMatch = contentToAdd.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (bodyMatch) {
      contentToAdd = bodyMatch[1].trim()
    } else {
      // Try to extract just the sections
      const sectionsMatch = contentToAdd.match(/<(section|header|footer|nav|main|article)[^>]*>[\s\S]*<\/\1>/gi)
      if (sectionsMatch) {
        contentToAdd = sectionsMatch.join('\n')
      }
    }
  }

  if (position === 'start') {
    return html.replace(
      /(<body[^>]*>)/i,
      `$1\n${contentToAdd}`
    )
  }

  if (position === 'end') {
    return html.replace(
      /(<\/body>)/i,
      `${contentToAdd}\n$1`
    )
  }

  // For before/after with target
  if (op.target && (position === 'before' || position === 'after')) {
    const targetRegex = createSelectorRegex(op.target)
    if (targetRegex) {
      const match = html.match(targetRegex)
      if (match && match.index !== undefined) {
        const elementHtml = findCompleteElement(html, match.index, match[0])
        if (elementHtml) {
          if (position === 'before') {
            return html.replace(elementHtml, `${contentToAdd}\n${elementHtml}`)
          } else {
            return html.replace(elementHtml, `${elementHtml}\n${contentToAdd}`)
          }
        }
      }
    }
  }

  // Fallback: add to end
  return html.replace(/(<\/body>)/i, `${contentToAdd}\n$1`)
}

function applyModifyOperation(html: string, op: ParsedOperation): string {
  if (!op.selector) {
    console.log('Modify: No selector provided')
    return html
  }

  const targetRegex = createSelectorRegex(op.selector)
  console.log('Modify selector:', op.selector, '-> Regex:', targetRegex)

  if (!targetRegex) {
    console.log('Modify: Could not create regex for selector')
    return html
  }

  const match = html.match(targetRegex)
  console.log('Modify: Match found?', !!match, match?.[0]?.substring(0, 100))

  if (!match || match.index === undefined) {
    console.log('Modify: No match found in HTML')
    return html
  }

  const elementHtml = findCompleteElement(html, match.index, match[0])
  console.log('Modify: Complete element found?', !!elementHtml, elementHtml?.substring(0, 100))

  if (elementHtml) {
    const newHtml = html.replace(elementHtml, op.html)
    console.log('Modify: Replacement done, HTML changed:', newHtml !== html)
    return newHtml
  }

  return html
}

function applyDeleteOperation(html: string, op: ParsedOperation): string {
  if (!op.selector) return html

  const targetRegex = createSelectorRegex(op.selector)
  if (!targetRegex) return html

  const match = html.match(targetRegex)
  if (!match || match.index === undefined) return html

  const elementHtml = findCompleteElement(html, match.index, match[0])
  if (elementHtml) {
    // Remove the element and any trailing newline
    return html.replace(elementHtml + '\n', '').replace(elementHtml, '')
  }

  return html
}

// Create regex to find element by CSS selector
function createSelectorRegex(selector: string): RegExp | null {
  // Handle combined selectors like "#hero h1" or "nav a.bg-blue-600"
  const parts = selector.trim().split(/\s+/)
  const lastPart = parts[parts.length - 1]

  // ID selector: #hero
  if (lastPart.startsWith('#')) {
    const id = lastPart.slice(1)
    return new RegExp(`<(\\w+)[^>]*\\bid=["']${id}["'][^>]*>`, 'i')
  }

  // Class selector: .hero-section
  if (lastPart.startsWith('.')) {
    const className = lastPart.slice(1)
    return new RegExp(`<(\\w+)[^>]*\\bclass=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'i')
  }

  // Tag with class: a.bg-blue-600, button.primary
  if (lastPart.includes('.')) {
    const [tag, ...classes] = lastPart.split('.')
    const classPattern = classes.map(c => `(?=.*\\b${c}\\b)`).join('')
    return new RegExp(`<${tag}[^>]*\\bclass=["']${classPattern}[^"']*["'][^>]*>`, 'i')
  }

  // Tag with ID: div#main
  if (lastPart.includes('#')) {
    const [tag, id] = lastPart.split('#')
    return new RegExp(`<${tag}[^>]*\\bid=["']${id}["'][^>]*>`, 'i')
  }

  // Tag selector: section, h1, etc.
  return new RegExp(`<(${lastPart})(?:\\s[^>]*)?>`, 'i')
}

// Find complete element including closing tag
function findCompleteElement(html: string, startIndex: number, openTag: string): string | null {
  const tagMatch = openTag.match(/<(\w+)/)
  if (!tagMatch) return null

  const tagName = tagMatch[1]

  // Self-closing tags
  if (openTag.endsWith('/>') || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName.toLowerCase())) {
    return openTag
  }

  // Find matching closing tag
  let depth = 1
  let pos = startIndex + openTag.length
  const openRegex = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'gi')
  const closeRegex = new RegExp(`</${tagName}>`, 'gi')

  while (depth > 0 && pos < html.length) {
    openRegex.lastIndex = pos
    closeRegex.lastIndex = pos

    const nextOpen = openRegex.exec(html)
    const nextClose = closeRegex.exec(html)

    if (!nextClose) break

    if (nextOpen && nextOpen.index < nextClose.index) {
      depth++
      pos = nextOpen.index + nextOpen[0].length
    } else {
      depth--
      if (depth === 0) {
        return html.slice(startIndex, nextClose.index + nextClose[0].length)
      }
      pos = nextClose.index + nextClose[0].length
    }
  }

  return null
}

// ============================================
// GLOBAL COMPONENTS EXTRACTION
// ============================================

export interface ExtractedGlobalComponents {
  header: DetectedComponent | null
  footer: DetectedComponent | null
  contentHtml: string // HTML with header/footer removed
  originalHtml: string
}

/**
 * Extract header and footer from HTML and return content-only HTML
 * Used after AI generation to detect global components
 */
export function extractGlobalComponents(html: string): ExtractedGlobalComponents {
  let contentHtml = html
  let header: DetectedComponent | null = null
  let footer: DetectedComponent | null = null

  // Use the existing detection from component-detection.ts
  const detected = analyzeHtmlForComponents(html)

  for (const component of detected) {
    if (component.type === 'header' && component.confidence >= 50) {
      header = component
    }
    if (component.type === 'footer' && component.confidence >= 50) {
      footer = component
    }
  }

  // Extract header from HTML
  if (header) {
    const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i)
    if (headerMatch) {
      // Remove header from content HTML
      contentHtml = contentHtml.replace(headerMatch[0], '').trim()
    }
  }

  // Extract footer from HTML
  if (footer) {
    const footerMatch = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/i)
    if (footerMatch) {
      // Remove footer from content HTML
      contentHtml = contentHtml.replace(footerMatch[0], '').trim()
    }
  }

  // Clean up any empty lines left behind
  contentHtml = contentHtml.replace(/\n\s*\n\s*\n/g, '\n\n')

  return {
    header,
    footer,
    contentHtml,
    originalHtml: html,
  }
}

/**
 * Remove header and/or footer from HTML and return content only
 * Used when global components already exist
 */
export function removeHeaderFooterFromHtml(
  html: string,
  options: { removeHeader?: boolean; removeFooter?: boolean }
): string {
  let result = html

  if (options.removeHeader) {
    // Remove <header>...</header>
    result = result.replace(/<header[^>]*>[\s\S]*?<\/header>/i, '')
    // Also remove nav at the top that might be acting as header
    const navAtTopMatch = result.match(/^(\s*<body[^>]*>\s*)(<nav[^>]*>[\s\S]*?<\/nav>)/i)
    if (navAtTopMatch) {
      const navHtml = navAtTopMatch[2]
      if (detectHeader(navHtml).isHeader) {
        result = result.replace(navHtml, '')
      }
    }
  }

  if (options.removeFooter) {
    // Remove <footer>...</footer>
    result = result.replace(/<footer[^>]*>[\s\S]*?<\/footer>/i, '')
  }

  // Clean up empty lines
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n')

  return result
}

/**
 * FAILSAFE: Sanitize AI-generated HTML when global components exist
 * Removes any header/footer/separators that AI might have generated despite instructions
 */
export function sanitizeHtmlForGlobalComponents(
  html: string,
  options: { hasGlobalHeader: boolean; hasGlobalFooter: boolean }
): string {
  let result = html

  // 1. Remove "------" separators (AI sometimes adds these)
  result = result.replace(/^-{3,}\s*$/gm, '')
  result = result.replace(/\n-{3,}\n/g, '\n')

  // 2. Remove header/footer placeholder comments
  result = result.replace(/<!--\s*HEADER[^>]*-->/gi, '')
  result = result.replace(/<!--\s*FOOTER[^>]*-->/gi, '')
  result = result.replace(/<!--\s*NAVIGATION[^>]*-->/gi, '')

  // 3. Remove empty section comments
  result = result.replace(/<!--\s*(STORY|TEAM|ABOUT|CONTACT|SERVICES|FEATURES)\s*SECTION\s*-->\s*/gi, '')

  // 4. Remove actual <header> and <footer> tags if global components exist
  if (options.hasGlobalHeader) {
    // Remove <header>...</header> including all content
    result = result.replace(/<header[^>]*>[\s\S]*?<\/header>\s*/gi, '')
    // Remove standalone nav at very start that acts as header
    result = result.replace(/^(\s*<body[^>]*>\s*)(<nav[^>]*class="[^"]*fixed[^"]*"[^>]*>[\s\S]*?<\/nav>\s*)/i, '$1')
  }

  if (options.hasGlobalFooter) {
    // Remove <footer>...</footer> including all content
    result = result.replace(/\s*<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
  }

  // 5. Clean up multiple empty lines
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n')

  // 6. Clean up empty space before </body>
  result = result.replace(/\n\s*\n\s*(<\/body>)/gi, '\n$1')

  return result.trim()
}

/**
 * Insert global header and footer into page HTML
 * Used in editor preview to show complete page
 */
export function insertGlobalComponents(
  pageHtml: string,
  header: { html: string } | null,
  footer: { html: string } | null
): string {
  let result = pageHtml

  // Insert header after <body>
  if (header?.html) {
    const bodyMatch = result.match(/(<body[^>]*>)/i)
    if (bodyMatch) {
      result = result.replace(bodyMatch[0], `${bodyMatch[0]}\n${header.html}`)
    }
  }

  // Insert footer before </body>
  if (footer?.html) {
    result = result.replace(/<\/body>/i, `${footer.html}\n</body>`)
  }

  return result
}
