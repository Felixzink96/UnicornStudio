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
import { readFileSync } from 'fs'
import { join } from 'path'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

// Cache the Tailwind CSS source to avoid repeated file reads
let tailwindCSSSource: string | null = null

function getTailwindCSSSource(): string {
  if (tailwindCSSSource) return tailwindCSSSource

  try {
    // Try to load from node_modules
    const tailwindPath = join(process.cwd(), 'node_modules', 'tailwindcss', 'index.css')
    tailwindCSSSource = readFileSync(tailwindPath, 'utf-8')
    return tailwindCSSSource
  } catch {
    console.warn('Could not load Tailwind CSS source from node_modules')
    // Return minimal Tailwind CSS structure
    return `
@layer theme, base, components, utilities;
@layer theme {
  @theme default {
    --font-sans: ui-sans-serif, system-ui, sans-serif;
    --font-serif: ui-serif, Georgia, serif;
    --font-mono: ui-monospace, monospace;
  }
}
@layer base;
@layer components;
@layer utilities;
`
  }
}

/**
 * GET /api/v1/sites/:siteId/export/css
 * Export compiled CSS using real Tailwind v4 compiler
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

    const [designVarsRes, siteRes] = await Promise.all([
      supabase.from('design_variables').select('*').eq('site_id', siteId).single(),
      supabase.from('sites').select('settings').eq('id', siteId).single(),
    ])

    // 4. Collect all HTML content for Tailwind class extraction
    let allHtml = ''

    // Pages - include both html_content and content JSON
    const { data: pagesWithHtml } = await supabase
      .from('pages')
      .select('html_content, content')
      .eq('site_id', siteId)

    pagesWithHtml?.forEach((page) => {
      if (page.html_content) {
        allHtml += page.html_content
      }
      allHtml += JSON.stringify(page.content || {})
    })

    // CMS Components
    const { data: components } = await supabase
      .from('cms_components')
      .select('html, variants')
      .eq('site_id', siteId)

    components?.forEach((comp) => {
      allHtml += comp.html || ''
      if (comp.variants && Array.isArray(comp.variants)) {
        (comp.variants as Array<{ html?: string }>).forEach((v) => {
          allHtml += v.html || ''
        })
      }
    })

    // Templates
    const { data: templates } = await supabase
      .from('templates')
      .select('html')
      .eq('site_id', siteId)

    templates?.forEach((tpl) => {
      allHtml += tpl.html || ''
    })

    // 5. Extract all CSS classes from HTML
    const extractedClasses = extractAllClasses(allHtml)

    // 6. Generate CSS Variables from design tokens
    const designVars = designVarsRes.data
    const siteSettings = siteRes.data?.settings as Record<string, unknown> | null
    const cssVariables = generateCSSVariables(designVars, siteSettings)

    // 7. Compile Tailwind CSS using v4 API
    let tailwindCSS = ''
    try {
      tailwindCSS = await compileTailwindCSS(extractedClasses)
    } catch (tailwindError) {
      console.error('Tailwind compilation error:', tailwindError)
      // Fallback to basic utility generation if Tailwind compile fails
      tailwindCSS = generateFallbackCSS(extractedClasses)
    }

    // 8. Combine everything
    const fullCSS = `
/* ==================================================================
   UNICORN STUDIO - Generated CSS
   Site ID: ${siteId}
   Generated: ${new Date().toISOString()}
   Classes found: ${extractedClasses.size}

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
   TAILWIND UTILITIES
   Compiled from ${extractedClasses.size} classes found in your content
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
 * Compile Tailwind CSS using v4 API
 */
async function compileTailwindCSS(classes: Set<string>): Promise<string> {
  try {
    // Dynamic import to avoid build issues
    const { compile } = await import('tailwindcss')

    // Get the actual Tailwind CSS source
    const tailwindSource = getTailwindCSSSource()

    // Compile using Tailwind v4 API with real stylesheet
    const compiler = await compile(`@import "tailwindcss";`, {
      loadStylesheet: async (id: string, base: string) => {
        if (id === 'tailwindcss') {
          return {
            path: 'node_modules/tailwindcss/index.css',
            base,
            content: tailwindSource,
          }
        }
        throw new Error(`Cannot load stylesheet: ${id}`)
      },
    })

    // Build CSS from the extracted classes
    const classArray = Array.from(classes)
    console.log(`[CSS Export] Compiling ${classArray.length} classes with Tailwind v4`)

    const css = compiler.build(classArray)

    if (!css || css.trim().length === 0) {
      console.warn('[CSS Export] Tailwind returned empty CSS, using fallback')
      throw new Error('Tailwind returned empty CSS')
    }

    console.log(`[CSS Export] Tailwind compiled ${css.length} bytes of CSS`)
    return css
  } catch (error) {
    console.error('Tailwind v4 compile error:', error)
    throw error
  }
}

/**
 * Extract all CSS classes from HTML content
 */
function extractAllClasses(html: string): Set<string> {
  const classes = new Set<string>()

  // Pattern to match class attributes in HTML
  const classPattern = /class(?:Name)?=["']([^"']+)["']/gi
  let match

  while ((match = classPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed && !trimmed.startsWith('{')) {
        classes.add(trimmed)
      }
    })
  }

  // Also check for classes in JSON content (className properties)
  const jsonClassPattern = /"className":\s*"([^"]+)"/gi
  while ((match = jsonClassPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed) {
        classes.add(trimmed)
      }
    })
  }

  return classes
}

/**
 * Generate CSS Variables from design tokens
 */
function generateCSSVariables(
  designVars: Record<string, unknown> | null,
  siteSettings: Record<string, unknown> | null
): string {
  let css = ':root {\n'

  const defaults = {
    colors: {
      brand: { primary: '#3b82f6', secondary: '#64748b', accent: '#f59e0b' },
      semantic: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
    },
    typography: { fontHeading: 'Inter', fontBody: 'Inter', fontMono: 'JetBrains Mono' },
  }

  // Colors
  const colors = (designVars?.colors as Record<string, Record<string, string>>) || defaults.colors

  if (colors.brand) {
    Object.entries(colors.brand).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`
    })
  }

  if (colors.semantic) {
    Object.entries(colors.semantic).forEach(([key, value]) => {
      css += `  --color-${key}: ${value};\n`
    })
  }

  if (colors.neutral) {
    Object.entries(colors.neutral).forEach(([key, value]) => {
      css += `  --color-neutral-${key}: ${value};\n`
    })
  }

  // Site settings colors
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
  tab-size: 4;
}

body {
  margin: 0;
  line-height: 1.5;
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
 * Fallback CSS generator if Tailwind compilation fails
 * This generates CSS for common Tailwind classes
 */
function generateFallbackCSS(classes: Set<string>): string {
  const cssRules: string[] = []

  // Common patterns
  const patterns: Record<string, string> = {
    // Display
    'flex': 'display: flex;',
    'inline-flex': 'display: inline-flex;',
    'block': 'display: block;',
    'inline-block': 'display: inline-block;',
    'inline': 'display: inline;',
    'hidden': 'display: none;',
    'grid': 'display: grid;',
    'contents': 'display: contents;',
    // Flex direction & wrap
    'flex-row': 'flex-direction: row;',
    'flex-row-reverse': 'flex-direction: row-reverse;',
    'flex-col': 'flex-direction: column;',
    'flex-col-reverse': 'flex-direction: column-reverse;',
    'flex-wrap': 'flex-wrap: wrap;',
    'flex-wrap-reverse': 'flex-wrap: wrap-reverse;',
    'flex-nowrap': 'flex-wrap: nowrap;',
    // Flex grow/shrink
    'flex-1': 'flex: 1 1 0%;',
    'flex-auto': 'flex: 1 1 auto;',
    'flex-initial': 'flex: 0 1 auto;',
    'flex-none': 'flex: none;',
    'grow': 'flex-grow: 1;',
    'grow-0': 'flex-grow: 0;',
    'shrink': 'flex-shrink: 1;',
    'shrink-0': 'flex-shrink: 0;',
    // Align items
    'items-center': 'align-items: center;',
    'items-start': 'align-items: flex-start;',
    'items-end': 'align-items: flex-end;',
    'items-baseline': 'align-items: baseline;',
    'items-stretch': 'align-items: stretch;',
    // Justify content
    'justify-center': 'justify-content: center;',
    'justify-start': 'justify-content: flex-start;',
    'justify-end': 'justify-content: flex-end;',
    'justify-between': 'justify-content: space-between;',
    'justify-around': 'justify-content: space-around;',
    'justify-evenly': 'justify-content: space-evenly;',
    // Self alignment
    'self-auto': 'align-self: auto;',
    'self-start': 'align-self: flex-start;',
    'self-end': 'align-self: flex-end;',
    'self-center': 'align-self: center;',
    'self-stretch': 'align-self: stretch;',
    // Position
    'relative': 'position: relative;',
    'absolute': 'position: absolute;',
    'fixed': 'position: fixed;',
    'sticky': 'position: sticky;',
    'static': 'position: static;',
    // Inset shortcuts
    'inset-0': 'top: 0; right: 0; bottom: 0; left: 0;',
    'inset-x-0': 'left: 0; right: 0;',
    'inset-y-0': 'top: 0; bottom: 0;',
    'top-0': 'top: 0;',
    'right-0': 'right: 0;',
    'bottom-0': 'bottom: 0;',
    'left-0': 'left: 0;',
    // Size
    'w-full': 'width: 100%;',
    'w-auto': 'width: auto;',
    'w-fit': 'width: fit-content;',
    'w-max': 'width: max-content;',
    'w-min': 'width: min-content;',
    'h-full': 'height: 100%;',
    'h-auto': 'height: auto;',
    'h-fit': 'height: fit-content;',
    'w-screen': 'width: 100vw;',
    'h-screen': 'height: 100vh;',
    'min-w-0': 'min-width: 0;',
    'min-w-full': 'min-width: 100%;',
    'min-h-0': 'min-height: 0;',
    'min-h-full': 'min-height: 100%;',
    'min-h-screen': 'min-height: 100vh;',
    'max-w-none': 'max-width: none;',
    'max-w-full': 'max-width: 100%;',
    'max-w-screen-sm': 'max-width: 640px;',
    'max-w-screen-md': 'max-width: 768px;',
    'max-w-screen-lg': 'max-width: 1024px;',
    'max-w-screen-xl': 'max-width: 1280px;',
    'max-w-screen-2xl': 'max-width: 1536px;',
    'max-w-xs': 'max-width: 20rem;',
    'max-w-sm': 'max-width: 24rem;',
    'max-w-md': 'max-width: 28rem;',
    'max-w-lg': 'max-width: 32rem;',
    'max-w-xl': 'max-width: 36rem;',
    'max-w-2xl': 'max-width: 42rem;',
    'max-w-3xl': 'max-width: 48rem;',
    'max-w-4xl': 'max-width: 56rem;',
    'max-w-5xl': 'max-width: 64rem;',
    'max-w-6xl': 'max-width: 72rem;',
    'max-w-7xl': 'max-width: 80rem;',
    // Text align
    'text-center': 'text-align: center;',
    'text-left': 'text-align: left;',
    'text-right': 'text-align: right;',
    'text-justify': 'text-align: justify;',
    // Font weight
    'font-thin': 'font-weight: 100;',
    'font-extralight': 'font-weight: 200;',
    'font-light': 'font-weight: 300;',
    'font-normal': 'font-weight: 400;',
    'font-medium': 'font-weight: 500;',
    'font-semibold': 'font-weight: 600;',
    'font-bold': 'font-weight: 700;',
    'font-extrabold': 'font-weight: 800;',
    'font-black': 'font-weight: 900;',
    // Font style
    'italic': 'font-style: italic;',
    'not-italic': 'font-style: normal;',
    // Text transform
    'uppercase': 'text-transform: uppercase;',
    'lowercase': 'text-transform: lowercase;',
    'capitalize': 'text-transform: capitalize;',
    'normal-case': 'text-transform: none;',
    // Text decoration
    'underline': 'text-decoration: underline;',
    'overline': 'text-decoration: overline;',
    'line-through': 'text-decoration: line-through;',
    'no-underline': 'text-decoration: none;',
    // Line height
    'leading-none': 'line-height: 1;',
    'leading-tight': 'line-height: 1.25;',
    'leading-snug': 'line-height: 1.375;',
    'leading-normal': 'line-height: 1.5;',
    'leading-relaxed': 'line-height: 1.625;',
    'leading-loose': 'line-height: 2;',
    // Letter spacing
    'tracking-tighter': 'letter-spacing: -0.05em;',
    'tracking-tight': 'letter-spacing: -0.025em;',
    'tracking-normal': 'letter-spacing: 0em;',
    'tracking-wide': 'letter-spacing: 0.025em;',
    'tracking-wider': 'letter-spacing: 0.05em;',
    'tracking-widest': 'letter-spacing: 0.1em;',
    // Colors
    'bg-white': 'background-color: #ffffff;',
    'bg-black': 'background-color: #000000;',
    'bg-transparent': 'background-color: transparent;',
    'text-white': 'color: #ffffff;',
    'text-black': 'color: #000000;',
    'text-transparent': 'color: transparent;',
    'border-white': 'border-color: #ffffff;',
    'border-black': 'border-color: #000000;',
    'border-transparent': 'border-color: transparent;',
    // Border width
    'border': 'border-width: 1px;',
    'border-0': 'border-width: 0px;',
    'border-2': 'border-width: 2px;',
    'border-4': 'border-width: 4px;',
    'border-8': 'border-width: 8px;',
    'border-t': 'border-top-width: 1px;',
    'border-r': 'border-right-width: 1px;',
    'border-b': 'border-bottom-width: 1px;',
    'border-l': 'border-left-width: 1px;',
    'border-t-0': 'border-top-width: 0px;',
    'border-r-0': 'border-right-width: 0px;',
    'border-b-0': 'border-bottom-width: 0px;',
    'border-l-0': 'border-left-width: 0px;',
    // Border style
    'border-solid': 'border-style: solid;',
    'border-dashed': 'border-style: dashed;',
    'border-dotted': 'border-style: dotted;',
    'border-none': 'border-style: none;',
    // Border radius
    'rounded-none': 'border-radius: 0;',
    'rounded-sm': 'border-radius: 0.125rem;',
    'rounded': 'border-radius: 0.25rem;',
    'rounded-md': 'border-radius: 0.375rem;',
    'rounded-lg': 'border-radius: 0.5rem;',
    'rounded-xl': 'border-radius: 0.75rem;',
    'rounded-2xl': 'border-radius: 1rem;',
    'rounded-3xl': 'border-radius: 1.5rem;',
    'rounded-full': 'border-radius: 9999px;',
    // Shadow
    'shadow-sm': 'box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);',
    'shadow': 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);',
    'shadow-md': 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);',
    'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);',
    'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);',
    'shadow-2xl': 'box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);',
    'shadow-inner': 'box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);',
    'shadow-none': 'box-shadow: none;',
    // Overflow
    'overflow-auto': 'overflow: auto;',
    'overflow-hidden': 'overflow: hidden;',
    'overflow-visible': 'overflow: visible;',
    'overflow-scroll': 'overflow: scroll;',
    'overflow-x-auto': 'overflow-x: auto;',
    'overflow-x-hidden': 'overflow-x: hidden;',
    'overflow-y-auto': 'overflow-y: auto;',
    'overflow-y-hidden': 'overflow-y: hidden;',
    // Cursor
    'cursor-auto': 'cursor: auto;',
    'cursor-default': 'cursor: default;',
    'cursor-pointer': 'cursor: pointer;',
    'cursor-wait': 'cursor: wait;',
    'cursor-text': 'cursor: text;',
    'cursor-move': 'cursor: move;',
    'cursor-not-allowed': 'cursor: not-allowed;',
    // Pointer events
    'pointer-events-none': 'pointer-events: none;',
    'pointer-events-auto': 'pointer-events: auto;',
    // Select
    'select-none': 'user-select: none;',
    'select-text': 'user-select: text;',
    'select-all': 'user-select: all;',
    'select-auto': 'user-select: auto;',
    // Transition
    'transition': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-all': 'transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-colors': 'transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-opacity': 'transition-property: opacity; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-shadow': 'transition-property: box-shadow; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-transform': 'transition-property: transform; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms;',
    'transition-none': 'transition-property: none;',
    // Duration
    'duration-75': 'transition-duration: 75ms;',
    'duration-100': 'transition-duration: 100ms;',
    'duration-150': 'transition-duration: 150ms;',
    'duration-200': 'transition-duration: 200ms;',
    'duration-300': 'transition-duration: 300ms;',
    'duration-500': 'transition-duration: 500ms;',
    'duration-700': 'transition-duration: 700ms;',
    'duration-1000': 'transition-duration: 1000ms;',
    // Ease
    'ease-linear': 'transition-timing-function: linear;',
    'ease-in': 'transition-timing-function: cubic-bezier(0.4, 0, 1, 1);',
    'ease-out': 'transition-timing-function: cubic-bezier(0, 0, 0.2, 1);',
    'ease-in-out': 'transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);',
    // Transform
    'transform': 'transform: translateX(var(--tw-translate-x)) translateY(var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));',
    'transform-none': 'transform: none;',
    // Object fit
    'object-contain': 'object-fit: contain;',
    'object-cover': 'object-fit: cover;',
    'object-fill': 'object-fit: fill;',
    'object-none': 'object-fit: none;',
    'object-scale-down': 'object-fit: scale-down;',
    // List style
    'list-none': 'list-style-type: none;',
    'list-disc': 'list-style-type: disc;',
    'list-decimal': 'list-style-type: decimal;',
    'list-inside': 'list-style-position: inside;',
    'list-outside': 'list-style-position: outside;',
    // Visibility
    'visible': 'visibility: visible;',
    'invisible': 'visibility: hidden;',
    // Whitespace
    'whitespace-normal': 'white-space: normal;',
    'whitespace-nowrap': 'white-space: nowrap;',
    'whitespace-pre': 'white-space: pre;',
    'whitespace-pre-line': 'white-space: pre-line;',
    'whitespace-pre-wrap': 'white-space: pre-wrap;',
    // Word break
    'break-normal': 'word-break: normal; overflow-wrap: normal;',
    'break-words': 'overflow-wrap: break-word;',
    'break-all': 'word-break: break-all;',
    // Text overflow
    'truncate': 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;',
    'text-ellipsis': 'text-overflow: ellipsis;',
    'text-clip': 'text-overflow: clip;',
    // Aspect ratio
    'aspect-auto': 'aspect-ratio: auto;',
    'aspect-square': 'aspect-ratio: 1 / 1;',
    'aspect-video': 'aspect-ratio: 16 / 9;',
    // Container
    'container': 'width: 100%; margin-left: auto; margin-right: auto;',
    // Mx auto
    'mx-auto': 'margin-left: auto; margin-right: auto;',
  }

  // Spacing scale
  const spacingScale: Record<string, string> = {
    '0': '0', '1': '0.25rem', '2': '0.5rem', '3': '0.75rem', '4': '1rem',
    '5': '1.25rem', '6': '1.5rem', '8': '2rem', '10': '2.5rem', '12': '3rem',
    '16': '4rem', '20': '5rem', '24': '6rem', '32': '8rem', '40': '10rem',
    '48': '12rem', '56': '14rem', '64': '16rem', '72': '18rem', '80': '20rem',
    '96': '24rem',
  }

  // Font sizes
  const fontSizes: Record<string, string> = {
    'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem',
    'xl': '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem',
    '5xl': '3rem', '6xl': '3.75rem', '7xl': '4.5rem', '8xl': '6rem', '9xl': '8rem',
  }

  // Colors (Tailwind default palette - comprehensive)
  const colors: Record<string, Record<string, string>> = {
    'slate': { '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155', '800': '#1e293b', '900': '#0f172a', '950': '#020617' },
    'gray': { '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db', '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151', '800': '#1f2937', '900': '#111827', '950': '#030712' },
    'zinc': { '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8', '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46', '800': '#27272a', '900': '#18181b', '950': '#09090b' },
    'neutral': { '50': '#fafafa', '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4', '400': '#a3a3a3', '500': '#737373', '600': '#525252', '700': '#404040', '800': '#262626', '900': '#171717', '950': '#0a0a0a' },
    'stone': { '50': '#fafaf9', '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1', '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c', '800': '#292524', '900': '#1c1917', '950': '#0c0a09' },
    'red': { '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5', '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c', '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a' },
    'orange': { '50': '#fff7ed', '100': '#ffedd5', '200': '#fed7aa', '300': '#fdba74', '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c', '800': '#9a3412', '900': '#7c2d12', '950': '#431407' },
    'amber': { '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d', '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309', '800': '#92400e', '900': '#78350f', '950': '#451a03' },
    'yellow': { '50': '#fefce8', '100': '#fef9c3', '200': '#fef08a', '300': '#fde047', '400': '#facc15', '500': '#eab308', '600': '#ca8a04', '700': '#a16207', '800': '#854d0e', '900': '#713f12', '950': '#422006' },
    'lime': { '50': '#f7fee7', '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264', '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f', '800': '#3f6212', '900': '#365314', '950': '#1a2e05' },
    'green': { '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac', '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d', '800': '#166534', '900': '#14532d', '950': '#052e16' },
    'emerald': { '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7', '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857', '800': '#065f46', '900': '#064e3b', '950': '#022c22' },
    'teal': { '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4', '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e', '800': '#115e59', '900': '#134e4a', '950': '#042f2e' },
    'cyan': { '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9', '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490', '800': '#155e75', '900': '#164e63', '950': '#083344' },
    'sky': { '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc', '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1', '800': '#075985', '900': '#0c4a6e', '950': '#082f49' },
    'blue': { '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a', '950': '#172554' },
    'indigo': { '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b' },
    'violet': { '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd', '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9', '800': '#5b21b6', '900': '#4c1d95', '950': '#2e1065' },
    'purple': { '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe', '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce', '800': '#6b21a8', '900': '#581c87', '950': '#3b0764' },
    'fuchsia': { '50': '#fdf4ff', '100': '#fae8ff', '200': '#f5d0fe', '300': '#f0abfc', '400': '#e879f9', '500': '#d946ef', '600': '#c026d3', '700': '#a21caf', '800': '#86198f', '900': '#701a75', '950': '#4a044e' },
    'pink': { '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4', '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d', '800': '#9d174d', '900': '#831843', '950': '#500724' },
    'rose': { '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af', '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c', '800': '#9f1239', '900': '#881337', '950': '#4c0519' },
  }

  classes.forEach((cls) => {
    // Direct pattern match
    if (patterns[cls]) {
      cssRules.push(`.${escapeClassName(cls)} { ${patterns[cls]} }`)
      return
    }

    // Spacing (margin, padding)
    const spacingMatch = cls.match(/^(m|p)(t|r|b|l|x|y)?-(\d+|auto|px)$/)
    if (spacingMatch) {
      const [, type, dir, value] = spacingMatch
      const prop = type === 'm' ? 'margin' : 'padding'
      const size = value === 'auto' ? 'auto' : value === 'px' ? '1px' : spacingScale[value] || `${parseInt(value) * 0.25}rem`

      const directions: Record<string, string[]> = {
        't': ['top'], 'r': ['right'], 'b': ['bottom'], 'l': ['left'],
        'x': ['left', 'right'], 'y': ['top', 'bottom'],
        '': ['top', 'right', 'bottom', 'left'],
      }

      const props = (directions[dir || ''] || directions['']).map((d) => `${prop}-${d}: ${size}`).join('; ')
      cssRules.push(`.${escapeClassName(cls)} { ${props}; }`)
      return
    }

    // Gap
    const gapMatch = cls.match(/^gap-(\d+)$/)
    if (gapMatch) {
      const size = spacingScale[gapMatch[1]] || `${parseInt(gapMatch[1]) * 0.25}rem`
      cssRules.push(`.${escapeClassName(cls)} { gap: ${size}; }`)
      return
    }

    // Width/Height
    const sizeMatch = cls.match(/^(w|h|min-w|min-h|max-w|max-h)-(\d+|full|screen|auto)$/)
    if (sizeMatch) {
      const [, type, value] = sizeMatch
      const prop = type.replace('-', '-')
        .replace('w', 'width')
        .replace('h', 'height')
      const size = value === 'full' ? '100%' : value === 'screen' ? (type.includes('w') ? '100vw' : '100vh') : value === 'auto' ? 'auto' : spacingScale[value] || `${parseInt(value) * 0.25}rem`
      cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${size}; }`)
      return
    }

    // Font size
    const fontSizeMatch = cls.match(/^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/)
    if (fontSizeMatch) {
      cssRules.push(`.${escapeClassName(cls)} { font-size: ${fontSizes[fontSizeMatch[1]]}; }`)
      return
    }

    // Colors (bg, text, border)
    const colorMatch = cls.match(/^(bg|text|border)-(slate|gray|zinc|red|orange|yellow|green|blue|indigo|purple|pink)-(\d{2,3})$/)
    if (colorMatch) {
      const [, type, color, shade] = colorMatch
      const colorValue = colors[color]?.[shade]
      if (colorValue) {
        const prop = type === 'bg' ? 'background-color' : type === 'text' ? 'color' : 'border-color'
        cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${colorValue}; }`)
      }
      return
    }

    // Inset (top, right, bottom, left)
    const insetMatch = cls.match(/^(top|right|bottom|left|inset)-(\d+|auto)$/)
    if (insetMatch) {
      const [, prop, value] = insetMatch
      const size = value === 'auto' ? 'auto' : spacingScale[value] || `${parseInt(value) * 0.25}rem`
      if (prop === 'inset') {
        cssRules.push(`.${escapeClassName(cls)} { top: ${size}; right: ${size}; bottom: ${size}; left: ${size}; }`)
      } else {
        cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${size}; }`)
      }
      return
    }

    // Z-index
    const zMatch = cls.match(/^z-(\d+|auto)$/)
    if (zMatch) {
      cssRules.push(`.${escapeClassName(cls)} { z-index: ${zMatch[1]}; }`)
      return
    }

    // Opacity
    const opacityMatch = cls.match(/^opacity-(\d+)$/)
    if (opacityMatch) {
      cssRules.push(`.${escapeClassName(cls)} { opacity: ${parseInt(opacityMatch[1]) / 100}; }`)
      return
    }
  })

  return cssRules.join('\n')
}

/**
 * Escape class name for CSS selector
 */
function escapeClassName(cls: string): string {
  return cls.replace(/([:\[\]\/\\.\-])/g, '\\$1')
}
