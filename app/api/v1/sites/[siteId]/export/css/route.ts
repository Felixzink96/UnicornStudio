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

interface TailwindCustomConfig {
  colors?: Record<string, string>
  fontFamily?: Record<string, string[]>
  keyframes?: Record<string, Record<string, Record<string, string>>>
  animation?: Record<string, string>
  backgroundImage?: Record<string, string>
}

// Cache the real Tailwind CSS source file content
let tailwindCSSContent: string | null = null

function getTailwindCSSContent(): string {
  if (tailwindCSSContent) return tailwindCSSContent

  try {
    // Read the REAL tailwindcss/index.css from node_modules
    const tailwindPath = join(process.cwd(), 'node_modules', 'tailwindcss', 'index.css')
    tailwindCSSContent = readFileSync(tailwindPath, 'utf-8')
    console.log(`[CSS Export] Loaded Tailwind CSS source: ${tailwindCSSContent.length} bytes`)
    return tailwindCSSContent
  } catch (error) {
    console.error('[CSS Export] Failed to load tailwindcss/index.css:', error)
    throw new Error('Could not load Tailwind CSS source file')
  }
}

/**
 * GET /api/v1/sites/:siteId/export/css
 * Export compiled CSS using real Tailwind v4 compiler
 * GDPR-compliant: This CSS should be hosted locally by the client
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('[CSS Export] Request received')

    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    console.log('[CSS Export] Auth result:', auth.success ? 'OK' : auth.error)
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

    // 4. Get Tailwind config from site settings (saved when page is saved)
    const tailwindConfig = (siteRes.data?.settings as Record<string, unknown>)?.tailwindConfig as TailwindCustomConfig | undefined
    if (tailwindConfig) {
      console.log('[CSS Export] Found Tailwind custom config in site settings:', Object.keys(tailwindConfig))
    }

    // 5. Collect all HTML content for Tailwind class extraction
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

    // 6. CMS Components
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

    // 7. Templates
    const { data: templates } = await supabase
      .from('templates')
      .select('html')
      .eq('site_id', siteId)

    templates?.forEach((tpl) => {
      allHtml += tpl.html || ''
    })

    // 8. Extract all CSS classes from HTML
    const extractedClasses = extractAllClasses(allHtml)

    // 9. Generate CSS Variables from design tokens
    const designVars = designVarsRes.data
    const siteSettings = siteRes.data?.settings as Record<string, unknown> | null
    const cssVariables = generateCSSVariables(designVars, siteSettings)

    // 10. Compile Tailwind CSS using v4 API with custom theme
    let tailwindCSS = ''
    try {
      tailwindCSS = await compileTailwindCSS(extractedClasses, tailwindConfig || undefined)
    } catch (tailwindError) {
      console.error('Tailwind compilation error:', tailwindError)
      // Fallback to basic utility generation if Tailwind compile fails
      tailwindCSS = generateFallbackCSS(extractedClasses)
    }

    // 11. Combine everything - NO manual CSS generation, Tailwind v4 @theme handles it all
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
   TAILWIND UTILITIES (includes custom @theme colors/fonts)
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
 * Build @theme CSS and keyframes from custom Tailwind config
 */
function buildThemeCSS(config: TailwindCustomConfig): string {
  const themeVars: string[] = []
  const keyframesCSS: string[] = []

  // Custom colors
  if (config.colors) {
    Object.entries(config.colors).forEach(([name, value]) => {
      themeVars.push(`  --color-${name}: ${value};`)
    })
  }

  // Custom font families (Tailwind v4 uses --font-{name}, not --font-family-{name})
  if (config.fontFamily) {
    Object.entries(config.fontFamily).forEach(([name, fonts]) => {
      const fontStack = fonts.map(f => f.includes(' ') ? `"${f}"` : f).join(', ')
      themeVars.push(`  --font-${name}: ${fontStack};`)
    })
  }

  // Custom animations (reference in @theme)
  if (config.animation) {
    Object.entries(config.animation).forEach(([name, value]) => {
      themeVars.push(`  --animate-${name}: ${value};`)
    })
  }

  // Build keyframes CSS (outside @theme)
  if (config.keyframes) {
    Object.entries(config.keyframes).forEach(([name, frames]) => {
      let kfCSS = `@keyframes ${name} {\n`
      Object.entries(frames).forEach(([frameKey, props]) => {
        kfCSS += `  ${frameKey} {\n`
        Object.entries(props).forEach(([prop, val]) => {
          kfCSS += `    ${prop}: ${val};\n`
        })
        kfCSS += `  }\n`
      })
      kfCSS += `}`
      keyframesCSS.push(kfCSS)
    })
  }

  let result = ''

  if (themeVars.length > 0) {
    result += `@theme {\n${themeVars.join('\n')}\n}\n\n`
  }

  if (keyframesCSS.length > 0) {
    result += keyframesCSS.join('\n\n')
  }

  return result
}

/**
 * Compile Tailwind CSS using v4 API with REAL tailwindcss/index.css and custom theme
 */
async function compileTailwindCSS(classes: Set<string>, customConfig?: TailwindCustomConfig): Promise<string> {
  try {
    // Dynamic import to avoid build issues
    const { compile } = await import('tailwindcss')

    // Get the REAL Tailwind CSS source file content
    const tailwindSource = getTailwindCSSContent()

    // Build custom theme CSS
    const themeCSS = customConfig ? buildThemeCSS(customConfig) : ''
    if (themeCSS) {
      console.log('[CSS Export] Custom theme:', themeCSS.substring(0, 200) + '...')
    }

    const classArray = Array.from(classes)
    console.log(`[CSS Export] Compiling ${classArray.length} classes with Tailwind v4`)

    // Compile using Tailwind v4 API with the REAL stylesheet + custom theme
    const cssInput = `@import "tailwindcss";\n\n${themeCSS}`

    const compiler = await compile(cssInput, {
      loadStylesheet: async (id: string, base: string) => {
        if (id === 'tailwindcss') {
          // Return the REAL tailwindcss/index.css content!
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
    const css = compiler.build(classArray)

    console.log(`[CSS Export] Tailwind generated ${css.length} bytes of CSS`)

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
 * Fallback CSS generator if Tailwind compilation fails
 * This generates CSS for common Tailwind classes
 */
function generateFallbackCSS(classes: Set<string>): string {
  const cssRules: string[] = []

  // Common patterns
  const patterns: Record<string, string> = {
    'flex': 'display: flex;',
    'inline-flex': 'display: inline-flex;',
    'block': 'display: block;',
    'inline-block': 'display: inline-block;',
    'hidden': 'display: none;',
    'grid': 'display: grid;',
    'flex-row': 'flex-direction: row;',
    'flex-col': 'flex-direction: column;',
    'flex-wrap': 'flex-wrap: wrap;',
    'items-center': 'align-items: center;',
    'items-start': 'align-items: flex-start;',
    'items-end': 'align-items: flex-end;',
    'justify-center': 'justify-content: center;',
    'justify-start': 'justify-content: flex-start;',
    'justify-end': 'justify-content: flex-end;',
    'justify-between': 'justify-content: space-between;',
    'justify-around': 'justify-content: space-around;',
    'relative': 'position: relative;',
    'absolute': 'position: absolute;',
    'fixed': 'position: fixed;',
    'sticky': 'position: sticky;',
    'w-full': 'width: 100%;',
    'h-full': 'height: 100%;',
    'w-screen': 'width: 100vw;',
    'h-screen': 'height: 100vh;',
    'min-h-screen': 'min-height: 100vh;',
    'text-center': 'text-align: center;',
    'text-left': 'text-align: left;',
    'text-right': 'text-align: right;',
    'font-bold': 'font-weight: 700;',
    'font-semibold': 'font-weight: 600;',
    'font-medium': 'font-weight: 500;',
    'font-normal': 'font-weight: 400;',
    'uppercase': 'text-transform: uppercase;',
    'lowercase': 'text-transform: lowercase;',
    'capitalize': 'text-transform: capitalize;',
    'bg-white': 'background-color: #ffffff;',
    'bg-black': 'background-color: #000000;',
    'bg-transparent': 'background-color: transparent;',
    'text-white': 'color: #ffffff;',
    'text-black': 'color: #000000;',
    'border': 'border-width: 1px;',
    'border-0': 'border-width: 0;',
    'rounded': 'border-radius: 0.25rem;',
    'rounded-lg': 'border-radius: 0.5rem;',
    'rounded-xl': 'border-radius: 0.75rem;',
    'rounded-2xl': 'border-radius: 1rem;',
    'rounded-full': 'border-radius: 9999px;',
    'shadow': 'box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);',
    'shadow-lg': 'box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);',
    'shadow-xl': 'box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);',
    'overflow-hidden': 'overflow: hidden;',
    'overflow-auto': 'overflow: auto;',
    'cursor-pointer': 'cursor: pointer;',
    'transition': 'transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);',
    'transition-all': 'transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);',
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

  // Colors (Tailwind default palette)
  const colors: Record<string, Record<string, string>> = {
    'slate': { '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1', '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155', '800': '#1e293b', '900': '#0f172a', '950': '#020617' },
    'gray': { '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db', '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151', '800': '#1f2937', '900': '#111827', '950': '#030712' },
    'zinc': { '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8', '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46', '800': '#27272a', '900': '#18181b', '950': '#09090b' },
    'red': { '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5', '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c', '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a' },
    'orange': { '50': '#fff7ed', '100': '#ffedd5', '200': '#fed7aa', '300': '#fdba74', '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c', '800': '#9a3412', '900': '#7c2d12', '950': '#431407' },
    'yellow': { '50': '#fefce8', '100': '#fef9c3', '200': '#fef08a', '300': '#fde047', '400': '#facc15', '500': '#eab308', '600': '#ca8a04', '700': '#a16207', '800': '#854d0e', '900': '#713f12', '950': '#422006' },
    'green': { '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac', '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d', '800': '#166534', '900': '#14532d', '950': '#052e16' },
    'blue': { '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd', '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8', '800': '#1e40af', '900': '#1e3a8a', '950': '#172554' },
    'indigo': { '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc', '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca', '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b' },
    'purple': { '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe', '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce', '800': '#6b21a8', '900': '#581c87', '950': '#3b0764' },
    'pink': { '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4', '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d', '800': '#9d174d', '900': '#831843', '950': '#500724' },
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

/**
 * Generate CSS utilities from custom Tailwind config (from site settings)
 */
function generateCustomTailwindCSS(config: TailwindCustomConfig): string {
  const rules: string[] = []

  // Generate color utilities with all variants
  if (config.colors) {
    Object.entries(config.colors).forEach(([name, value]) => {
      // Base utilities
      rules.push(`.bg-${name} { background-color: ${value}; }`)
      rules.push(`.text-${name} { color: ${value}; }`)
      rules.push(`.border-${name} { border-color: ${value}; }`)
      rules.push(`.ring-${name} { --tw-ring-color: ${value}; }`)
      rules.push(`.divide-${name} > :not([hidden]) ~ :not([hidden]) { border-color: ${value}; }`)
      rules.push(`.shadow-${name} { --tw-shadow-color: ${value}; }`)
      rules.push(`.accent-${name} { accent-color: ${value}; }`)
      rules.push(`.caret-${name} { caret-color: ${value}; }`)
      rules.push(`.fill-${name} { fill: ${value}; }`)
      rules.push(`.stroke-${name} { stroke: ${value}; }`)
      rules.push(`.outline-${name} { outline-color: ${value}; }`)
      rules.push(`.decoration-${name} { text-decoration-color: ${value}; }`)

      // Hover variants
      rules.push(`.hover\\:bg-${name}:hover { background-color: ${value}; }`)
      rules.push(`.hover\\:text-${name}:hover { color: ${value}; }`)
      rules.push(`.hover\\:border-${name}:hover { border-color: ${value}; }`)

      // Focus variants
      rules.push(`.focus\\:bg-${name}:focus { background-color: ${value}; }`)
      rules.push(`.focus\\:text-${name}:focus { color: ${value}; }`)
      rules.push(`.focus\\:border-${name}:focus { border-color: ${value}; }`)
      rules.push(`.focus\\:ring-${name}:focus { --tw-ring-color: ${value}; }`)

      // Active variants
      rules.push(`.active\\:bg-${name}:active { background-color: ${value}; }`)
      rules.push(`.active\\:text-${name}:active { color: ${value}; }`)

      // Group hover variants
      rules.push(`.group:hover .group-hover\\:bg-${name} { background-color: ${value}; }`)
      rules.push(`.group:hover .group-hover\\:text-${name} { color: ${value}; }`)
      rules.push(`.group:hover .group-hover\\:border-${name} { border-color: ${value}; }`)

      // Selection
      rules.push(`.selection\\:bg-${name} ::selection { background-color: ${value}; }`)
      rules.push(`.selection\\:text-${name} ::selection { color: ${value}; }`)

      // Opacity variants for bg
      rules.push(`.bg-${name}\\/5 { background-color: ${value}; opacity: 0.05; }`)
      rules.push(`.bg-${name}\\/10 { background-color: ${value}; opacity: 0.1; }`)
      rules.push(`.bg-${name}\\/20 { background-color: ${value}; opacity: 0.2; }`)
      rules.push(`.bg-${name}\\/30 { background-color: ${value}; opacity: 0.3; }`)
      rules.push(`.bg-${name}\\/40 { background-color: ${value}; opacity: 0.4; }`)
      rules.push(`.bg-${name}\\/50 { background-color: ${value}; opacity: 0.5; }`)
      rules.push(`.bg-${name}\\/60 { background-color: ${value}; opacity: 0.6; }`)
      rules.push(`.bg-${name}\\/70 { background-color: ${value}; opacity: 0.7; }`)
      rules.push(`.bg-${name}\\/80 { background-color: ${value}; opacity: 0.8; }`)
      rules.push(`.bg-${name}\\/90 { background-color: ${value}; opacity: 0.9; }`)

      // Text opacity variants
      rules.push(`.text-${name}\\/50 { color: ${value}; opacity: 0.5; }`)
      rules.push(`.text-${name}\\/70 { color: ${value}; opacity: 0.7; }`)
      rules.push(`.text-${name}\\/80 { color: ${value}; opacity: 0.8; }`)

      // Border opacity variants
      rules.push(`.border-${name}\\/20 { border-color: ${value}; opacity: 0.2; }`)
      rules.push(`.border-${name}\\/50 { border-color: ${value}; opacity: 0.5; }`)

      // Placeholder
      rules.push(`.placeholder\\:text-${name}::placeholder { color: ${value}; }`)

      // Before/After
      rules.push(`.before\\:bg-${name}::before { background-color: ${value}; }`)
      rules.push(`.after\\:bg-${name}::after { background-color: ${value}; }`)
    })
  }

  // Generate font family utilities
  if (config.fontFamily) {
    Object.entries(config.fontFamily).forEach(([name, fonts]) => {
      const fontStack = fonts.join(', ')
      rules.push(`.font-${name} { font-family: ${fontStack}; }`)
    })
  }

  // Generate keyframes
  if (config.keyframes) {
    Object.entries(config.keyframes).forEach(([name, frames]) => {
      let keyframeCSS = `@keyframes ${name} {\n`
      Object.entries(frames).forEach(([frameKey, props]) => {
        keyframeCSS += `  ${frameKey} {\n`
        Object.entries(props).forEach(([prop, val]) => {
          keyframeCSS += `    ${prop}: ${val};\n`
        })
        keyframeCSS += `  }\n`
      })
      keyframeCSS += `}`
      rules.push(keyframeCSS)
    })
  }

  // Generate animation utilities
  if (config.animation) {
    Object.entries(config.animation).forEach(([name, value]) => {
      rules.push(`.animate-${name} { animation: ${value}; }`)
    })
  }

  // Generate background image utilities
  if (config.backgroundImage) {
    Object.entries(config.backgroundImage).forEach(([name, value]) => {
      rules.push(`.bg-${name} { background-image: ${value}; }`)
    })
  }

  return rules.join('\n')
}
