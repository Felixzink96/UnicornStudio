import type { ComponentPosition } from '@/types/global-components'

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

    // Remove COMPONENT_TYPE and COMPONENT_NAME from html if they got included
    html = html
      .replace(/\n?---\n?COMPONENT_TYPE:[^\n]*/gi, '')
      .replace(/COMPONENT_NAME:[^\n]*/gi, '')
      .trim()

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
    return html.trim() || null
  }

  // Fallback: look for HTML tags
  const htmlMatch = content.match(/<(!DOCTYPE|html|section|div|header|nav|main|footer|article)[^]*$/i)
  if (htmlMatch) {
    return htmlMatch[0]
  }

  return null
}

// Apply operation to existing HTML
export function applyOperation(existingHtml: string, op: ParsedOperation): string {
  switch (op.operation) {
    case 'replace_all':
      return op.html

    case 'add':
      return applyAddOperation(existingHtml, op)

    case 'modify':
      return applyModifyOperation(existingHtml, op)

    case 'delete':
      return applyDeleteOperation(existingHtml, op)

    default:
      return existingHtml
  }
}

function applyAddOperation(html: string, op: ParsedOperation): string {
  const position = op.position || 'end'

  if (position === 'start') {
    return html.replace(
      /(<body[^>]*>)/i,
      `$1\n${op.html}`
    )
  }

  if (position === 'end') {
    return html.replace(
      /(<\/body>)/i,
      `${op.html}\n$1`
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
            return html.replace(elementHtml, `${op.html}\n${elementHtml}`)
          } else {
            return html.replace(elementHtml, `${elementHtml}\n${op.html}`)
          }
        }
      }
    }
  }

  // Fallback: add to end
  return html.replace(/(<\/body>)/i, `${op.html}\n$1`)
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
