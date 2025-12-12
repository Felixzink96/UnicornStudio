import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/export/css
 * Export compiled CSS (design variables + Tailwind classes)
 * GDPR-compliant: This CSS should be hosted locally by the client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Fetch all data needed for CSS generation
    const supabase = createAPIClient()

    const [designVarsRes, pagesRes, componentsRes, templatesRes, siteRes] = await Promise.all([
      supabase.from('design_variables').select('*').eq('site_id', siteId).single(),
      supabase.from('pages').select('content').eq('site_id', siteId),
      supabase.from('cms_components').select('html, variants').eq('site_id', siteId),
      supabase.from('templates').select('html').eq('site_id', siteId),
      supabase.from('sites').select('settings').eq('id', siteId).single(),
    ])

    // 4. Generate CSS Variables from design tokens
    const designVars = designVarsRes.data
    const siteSettings = siteRes.data?.settings as Record<string, unknown> | null

    const cssVariables = generateCSSVariables(designVars, siteSettings)

    // 5. Collect all HTML content for Tailwind class extraction
    let allHtml = ''

    // Pages
    pagesRes.data?.forEach((page) => {
      allHtml += JSON.stringify(page.content || {})
    })

    // CMS Components
    componentsRes.data?.forEach((comp) => {
      allHtml += comp.html || ''
      if (comp.variants && Array.isArray(comp.variants)) {
        (comp.variants as Array<{ html?: string }>).forEach((v) => {
          allHtml += v.html || ''
        })
      }
    })

    // Templates
    templatesRes.data?.forEach((tpl) => {
      allHtml += tpl.html || ''
    })

    // 6. Extract Tailwind classes from HTML
    const tailwindClasses = extractTailwindClasses(allHtml)

    // 7. Generate Tailwind CSS (without external CDN)
    const tailwindCSS = generateTailwindCSS(tailwindClasses, designVars)

    // 8. Combine everything
    const fullCSS = `
/* ==================================================================
   UNICORN STUDIO - Generated CSS
   Site ID: ${siteId}
   Generated: ${new Date().toISOString()}

   DSGVO-KONFORM: Diese Datei lokal hosten!
   Host this file locally for GDPR compliance.
   ================================================================== */

/* ----------------------------------------------------------------
   CSS VARIABLES (Design Tokens)
   ---------------------------------------------------------------- */
${cssVariables}

/* ----------------------------------------------------------------
   BASE STYLES
   ---------------------------------------------------------------- */
${generateBaseStyles()}

/* ----------------------------------------------------------------
   UTILITY CLASSES (Tailwind-compatible)
   Only classes actually used in your content
   ---------------------------------------------------------------- */
${tailwindCSS}
`.trim()

    // 9. Return CSS with proper headers
    return new Response(fullCSS, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('CSS export error:', error)
    return serverErrorResponse('Failed to generate CSS')
  }
}

/**
 * Generate CSS Variables from design tokens
 */
function generateCSSVariables(
  designVars: Record<string, unknown> | null,
  siteSettings: Record<string, unknown> | null
): string {
  let css = ':root {\n'

  // Default values
  const defaults = {
    colors: {
      brand: { primary: '#3b82f6', secondary: '#64748b', accent: '#f59e0b' },
      semantic: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    },
    typography: { fontHeading: 'Inter', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
    spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem' },
    borders: { sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem' },
  }

  // Colors
  const colors = (designVars?.colors as Record<string, Record<string, string>>) || defaults.colors

  // Brand colors
  if (colors.brand) {
    Object.entries(colors.brand).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`
    })
  }

  // Semantic colors
  if (colors.semantic) {
    Object.entries(colors.semantic).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`
    })
  }

  // Neutral colors
  if (colors.neutral) {
    Object.entries(colors.neutral).forEach(([key, value]) => {
      css += `  --color-neutral-${key}: ${value};\n`
    })
  }

  // Site settings colors (legacy support)
  if (siteSettings?.colors) {
    const settingsColors = siteSettings.colors as Record<string, string>
    Object.entries(settingsColors).forEach(([key, value]) => {
      css += `  --site-${key}: ${value};\n`
    })
  }

  // Typography
  const typography = (designVars?.typography as Record<string, unknown>) || defaults.typography
  css += `\n  /* Typography */\n`
  css += `  --font-heading: ${typography.fontHeading || 'Inter'}, system-ui, sans-serif;\n`
  css += `  --font-body: ${typography.fontBody || 'Inter'}, system-ui, sans-serif;\n`
  css += `  --font-mono: ${typography.fontMono || 'JetBrains Mono'}, monospace;\n`

  // Font sizes
  const fontSizes = (typography.fontSizes as Record<string, string>) || {}
  Object.entries(fontSizes).forEach(([key, value]) => {
    css += `  --font-size-${key}: ${value};\n`
  })

  // Spacing
  const spacing = (designVars?.spacing as Record<string, Record<string, string>>) || { scale: defaults.spacing }
  css += `\n  /* Spacing */\n`
  if (spacing.scale) {
    Object.entries(spacing.scale).forEach(([key, value]) => {
      css += `  --spacing-${key}: ${value};\n`
    })
  }

  // Container widths
  if (spacing.containerWidths) {
    Object.entries(spacing.containerWidths).forEach(([key, value]) => {
      css += `  --container-${key}: ${value};\n`
    })
  }

  // Border radius
  const borders = (designVars?.borders as Record<string, Record<string, string>>) || { radius: defaults.borders }
  css += `\n  /* Border Radius */\n`
  if (borders.radius) {
    Object.entries(borders.radius).forEach(([key, value]) => {
      css += `  --radius-${key}: ${value};\n`
    })
  }

  // Shadows
  const shadows = (designVars?.shadows as Record<string, string>) || {}
  css += `\n  /* Shadows */\n`
  Object.entries(shadows).forEach(([key, value]) => {
    css += `  --shadow-${key}: ${value};\n`
  })

  css += '}\n'

  return css
}

/**
 * Generate base styles
 */
function generateBaseStyles(): string {
  return `
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  font-feature-settings: normal;
  font-variation-settings: normal;
  tab-size: 4;
}

body {
  margin: 0;
  line-height: inherit;
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

code, pre {
  font-family: var(--font-mono);
}

img, video {
  max-width: 100%;
  height: auto;
}

a {
  color: inherit;
  text-decoration: inherit;
}
`.trim()
}

/**
 * Extract Tailwind classes from HTML content
 */
function extractTailwindClasses(html: string): Set<string> {
  const classes = new Set<string>()

  // Pattern to match class attributes
  const classPattern = /class(?:Name)?=["']([^"']+)["']/gi
  let match

  while ((match = classPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim())
      }
    })
  }

  // Also check for Tailwind classes in JSON content (for page builder)
  const jsonClassPattern = /"className":\s*"([^"]+)"/gi
  while ((match = jsonClassPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim())
      }
    })
  }

  return classes
}

/**
 * Generate Tailwind CSS for extracted classes
 * This is a simplified implementation - for production, use the full Tailwind compiler
 */
function generateTailwindCSS(
  classes: Set<string>,
  designVars: Record<string, unknown> | null
): string {
  const cssRules: string[] = []

  // Common Tailwind class patterns
  const patterns: Record<string, (value: string) => string> = {
    // Layout
    'flex': () => 'display: flex;',
    'inline-flex': () => 'display: inline-flex;',
    'block': () => 'display: block;',
    'inline-block': () => 'display: inline-block;',
    'hidden': () => 'display: none;',
    'grid': () => 'display: grid;',
    'inline-grid': () => 'display: inline-grid;',

    // Flex
    'flex-row': () => 'flex-direction: row;',
    'flex-col': () => 'flex-direction: column;',
    'flex-wrap': () => 'flex-wrap: wrap;',
    'flex-nowrap': () => 'flex-wrap: nowrap;',
    'items-center': () => 'align-items: center;',
    'items-start': () => 'align-items: flex-start;',
    'items-end': () => 'align-items: flex-end;',
    'items-stretch': () => 'align-items: stretch;',
    'justify-center': () => 'justify-content: center;',
    'justify-start': () => 'justify-content: flex-start;',
    'justify-end': () => 'justify-content: flex-end;',
    'justify-between': () => 'justify-content: space-between;',
    'justify-around': () => 'justify-content: space-around;',
    'justify-evenly': () => 'justify-content: space-evenly;',

    // Positioning
    'relative': () => 'position: relative;',
    'absolute': () => 'position: absolute;',
    'fixed': () => 'position: fixed;',
    'sticky': () => 'position: sticky;',

    // Sizing
    'w-full': () => 'width: 100%;',
    'w-screen': () => 'width: 100vw;',
    'w-auto': () => 'width: auto;',
    'h-full': () => 'height: 100%;',
    'h-screen': () => 'height: 100vh;',
    'h-auto': () => 'height: auto;',
    'min-h-screen': () => 'min-height: 100vh;',
    'max-w-full': () => 'max-width: 100%;',

    // Text
    'text-center': () => 'text-align: center;',
    'text-left': () => 'text-align: left;',
    'text-right': () => 'text-align: right;',
    'text-justify': () => 'text-align: justify;',
    'font-bold': () => 'font-weight: 700;',
    'font-semibold': () => 'font-weight: 600;',
    'font-medium': () => 'font-weight: 500;',
    'font-normal': () => 'font-weight: 400;',
    'font-light': () => 'font-weight: 300;',
    'italic': () => 'font-style: italic;',
    'underline': () => 'text-decoration: underline;',
    'line-through': () => 'text-decoration: line-through;',
    'no-underline': () => 'text-decoration: none;',
    'uppercase': () => 'text-transform: uppercase;',
    'lowercase': () => 'text-transform: lowercase;',
    'capitalize': () => 'text-transform: capitalize;',

    // Background
    'bg-transparent': () => 'background-color: transparent;',
    'bg-white': () => 'background-color: #ffffff;',
    'bg-black': () => 'background-color: #000000;',

    // Border
    'border': () => 'border-width: 1px;',
    'border-0': () => 'border-width: 0;',
    'border-2': () => 'border-width: 2px;',
    'border-4': () => 'border-width: 4px;',
    'border-solid': () => 'border-style: solid;',
    'border-dashed': () => 'border-style: dashed;',
    'border-dotted': () => 'border-style: dotted;',
    'border-none': () => 'border-style: none;',

    // Effects
    'opacity-0': () => 'opacity: 0;',
    'opacity-50': () => 'opacity: 0.5;',
    'opacity-100': () => 'opacity: 1;',
    'shadow': () => 'box-shadow: var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1));',
    'shadow-sm': () => 'box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));',
    'shadow-lg': () => 'box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));',
    'shadow-xl': () => 'box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1));',
    'shadow-none': () => 'box-shadow: none;',

    // Overflow
    'overflow-hidden': () => 'overflow: hidden;',
    'overflow-auto': () => 'overflow: auto;',
    'overflow-scroll': () => 'overflow: scroll;',
    'overflow-visible': () => 'overflow: visible;',

    // Cursor
    'cursor-pointer': () => 'cursor: pointer;',
    'cursor-default': () => 'cursor: default;',
    'cursor-not-allowed': () => 'cursor: not-allowed;',

    // Transition
    'transition': () => 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-none': () => 'transition-property: none;',
  }

  // Process each class
  classes.forEach((cls) => {
    // Direct match
    if (patterns[cls]) {
      cssRules.push(`.${escapeClassName(cls)} { ${patterns[cls](cls)} }`)
      return
    }

    // Dynamic patterns

    // Spacing (margin, padding)
    const spacingMatch = cls.match(/^(m|p)(t|r|b|l|x|y)?-(\d+|auto)$/)
    if (spacingMatch) {
      const [, type, dir, value] = spacingMatch
      const prop = type === 'm' ? 'margin' : 'padding'
      const rem = value === 'auto' ? 'auto' : `${parseInt(value) * 0.25}rem`

      const directions: Record<string, string[]> = {
        t: ['top'],
        r: ['right'],
        b: ['bottom'],
        l: ['left'],
        x: ['left', 'right'],
        y: ['top', 'bottom'],
        '': ['top', 'right', 'bottom', 'left'],
      }

      const props = (directions[dir || ''] || directions['']).map((d) => `${prop}-${d}: ${rem}`).join('; ')
      cssRules.push(`.${escapeClassName(cls)} { ${props}; }`)
      return
    }

    // Gap
    const gapMatch = cls.match(/^gap-(\d+)$/)
    if (gapMatch) {
      const rem = `${parseInt(gapMatch[1]) * 0.25}rem`
      cssRules.push(`.${escapeClassName(cls)} { gap: ${rem}; }`)
      return
    }

    // Width/Height with numbers
    const sizeMatch = cls.match(/^(w|h)-(\d+)$/)
    if (sizeMatch) {
      const [, type, value] = sizeMatch
      const prop = type === 'w' ? 'width' : 'height'
      const rem = `${parseInt(value) * 0.25}rem`
      cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${rem}; }`)
      return
    }

    // Font size
    const fontSizeMatch = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)$/)
    if (fontSizeMatch) {
      const sizes: Record<string, string> = {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
      }
      cssRules.push(`.${escapeClassName(cls)} { font-size: var(--font-size-${fontSizeMatch[1]}, ${sizes[fontSizeMatch[1]]}); }`)
      return
    }

    // Border radius
    const radiusMatch = cls.match(/^rounded(-none|-sm|-md|-lg|-xl|-2xl|-full)?$/)
    if (radiusMatch) {
      const radii: Record<string, string> = {
        '': '0.25rem',
        '-none': '0',
        '-sm': '0.125rem',
        '-md': '0.375rem',
        '-lg': '0.5rem',
        '-xl': '0.75rem',
        '-2xl': '1rem',
        '-full': '9999px',
      }
      const key = radiusMatch[1] || ''
      cssRules.push(`.${escapeClassName(cls)} { border-radius: var(--radius${key.replace('-', '-')}, ${radii[key]}); }`)
      return
    }

    // Colors (bg, text, border)
    const colorMatch = cls.match(/^(bg|text|border)-(primary|secondary|accent|success|warning|error|info)$/)
    if (colorMatch) {
      const [, type, color] = colorMatch
      const prop = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : 'border-color'
      cssRules.push(`.${escapeClassName(cls)} { ${prop}: var(--color-${color}); }`)
      return
    }

    // Neutral colors
    const neutralMatch = cls.match(/^(bg|text|border)-neutral-(\d{2,3})$/)
    if (neutralMatch) {
      const [, type, shade] = neutralMatch
      const prop = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : 'border-color'
      cssRules.push(`.${escapeClassName(cls)} { ${prop}: var(--color-neutral-${shade}); }`)
      return
    }

    // Max width
    const maxWMatch = cls.match(/^max-w-(sm|md|lg|xl|2xl|full|screen)$/)
    if (maxWMatch) {
      const widths: Record<string, string> = {
        sm: '24rem',
        md: '28rem',
        lg: '32rem',
        xl: '36rem',
        '2xl': '42rem',
        full: '100%',
        screen: '100vw',
      }
      cssRules.push(`.${escapeClassName(cls)} { max-width: var(--container-${maxWMatch[1]}, ${widths[maxWMatch[1]]}); }`)
      return
    }

    // Leading (line height)
    const leadingMatch = cls.match(/^leading-(none|tight|snug|normal|relaxed|loose|\d+)$/)
    if (leadingMatch) {
      const heights: Record<string, string> = {
        none: '1',
        tight: '1.25',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      }
      const value = heights[leadingMatch[1]] || `${parseInt(leadingMatch[1]) * 0.25}rem`
      cssRules.push(`.${escapeClassName(cls)} { line-height: ${value}; }`)
      return
    }
  })

  return cssRules.join('\n')
}

/**
 * Escape class name for CSS selector
 */
function escapeClassName(cls: string): string {
  return cls.replace(/([:\[\]\/\\.])/g, '\\$1')
}
