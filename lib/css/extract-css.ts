/**
 * CSS Extraction and Filtering for Post-Processing
 *
 * Extracts CSS from AI-generated HTML and filters out design token variables.
 * Design tokens are managed separately in the design_variables table.
 */

export interface ExtractedCSS {
  /** Custom CSS to save (keyframes, classes, etc.) - without design tokens */
  customCSS: string
  /** HTML with <style> tags removed */
  cleanedHTML: string
  /** Design token variables that were filtered out (for logging/debugging) */
  filteredTokens: string[]
}

/**
 * Design token variable patterns to filter out from :root
 * These are managed globally in design_variables table
 */
const DESIGN_TOKEN_PATTERNS = [
  /--color-brand-\w+/,
  /--color-neutral-\w+/,
  /--color-semantic-\w+/,
  /--color-custom-\w+/,
  /--font-heading/,
  /--font-body/,
  /--font-mono/,
]

/**
 * Check if a CSS property is a design token
 */
function isDesignToken(property: string): boolean {
  return DESIGN_TOKEN_PATTERNS.some(pattern => pattern.test(property))
}

/**
 * Filter :root block to remove design token variables
 * Returns the :root block with only non-design-token variables, or empty string if all were tokens
 */
function filterRootBlock(rootContent: string): { filtered: string; removedTokens: string[] } {
  const removedTokens: string[] = []
  const lines = rootContent.split('\n')
  const keptLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Check if line defines a CSS variable
    const varMatch = trimmed.match(/^(--[\w-]+)\s*:/)

    if (varMatch) {
      const varName = varMatch[1]
      if (isDesignToken(varName)) {
        removedTokens.push(varName)
        continue // Skip this line
      }
    }

    keptLines.push(line)
  }

  // Check if we have any non-empty content left
  const filtered = keptLines.join('\n').trim()
  const hasContent = keptLines.some(line => {
    const trimmed = line.trim()
    return trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('}') && trimmed !== ''
  })

  return {
    filtered: hasContent ? filtered : '',
    removedTokens,
  }
}

/**
 * Process CSS content to filter out design tokens from :root
 */
function processCSS(css: string): { processedCSS: string; removedTokens: string[] } {
  const removedTokens: string[] = []

  // Match :root blocks (handles multiline)
  // Using [\s\S] instead of . with 's' flag for cross-line matching
  const rootRegex = /:root\s*\{([\s\S]*?)\}/g

  let processedCSS = css.replace(rootRegex, (match, content) => {
    const { filtered, removedTokens: tokens } = filterRootBlock(content)
    removedTokens.push(...tokens)

    // If there's still content after filtering, keep the :root block
    if (filtered && filtered.replace(/[\s{}]/g, '').length > 0) {
      return `:root {\n${filtered}\n}`
    }

    // Otherwise remove the entire :root block
    return ''
  })

  // Clean up multiple empty lines
  processedCSS = processedCSS.replace(/\n{3,}/g, '\n\n').trim()

  return { processedCSS, removedTokens }
}

/**
 * Extract all CSS from HTML <style> tags
 */
function extractStyleTags(html: string): { css: string; htmlWithoutStyles: string } {
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  const cssBlocks: string[] = []

  const htmlWithoutStyles = html.replace(styleRegex, (match, content) => {
    cssBlocks.push(content.trim())
    return '' // Remove the style tag
  })

  return {
    css: cssBlocks.join('\n\n'),
    htmlWithoutStyles: htmlWithoutStyles.trim(),
  }
}

/**
 * Main function: Extract and filter CSS from HTML
 *
 * @param html - The AI-generated HTML with inline <style> tags
 * @returns ExtractedCSS with customCSS (to save), cleanedHTML (without styles), and filteredTokens (for logging)
 *
 * @example
 * const { customCSS, cleanedHTML, filteredTokens } = extractAndFilterCSS(aiGeneratedHtml)
 * // Save customCSS to pages.custom_css
 * // Save cleanedHTML to pages.html_content
 */
export function extractAndFilterCSS(html: string): ExtractedCSS {
  // Step 1: Extract all <style> content
  const { css, htmlWithoutStyles } = extractStyleTags(html)

  if (!css) {
    return {
      customCSS: '',
      cleanedHTML: htmlWithoutStyles,
      filteredTokens: [],
    }
  }

  // Step 2: Filter out design tokens from :root
  const { processedCSS, removedTokens } = processCSS(css)

  return {
    customCSS: processedCSS,
    cleanedHTML: htmlWithoutStyles,
    filteredTokens: removedTokens,
  }
}

/**
 * Check if HTML has inline styles that should be extracted
 */
export function hasInlineStyles(html: string): boolean {
  return /<style[^>]*>[\s\S]*?<\/style>/i.test(html)
}

/**
 * Utility: Combine multiple CSS strings, removing duplicates
 */
export function combineCSS(...cssBlocks: (string | null | undefined)[]): string {
  return cssBlocks
    .filter((css): css is string => !!css && css.trim().length > 0)
    .join('\n\n')
    .trim()
}
