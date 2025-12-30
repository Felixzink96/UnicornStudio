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
import { getStoredFonts, generateExportFontFaceCSS } from '@/lib/fonts/font-storage'
import { generateDesignTokensCSS } from '@/lib/css/design-tokens'
import type { DesignVariables } from '@/types/cms'
import postcss from 'postcss'
import postcssNesting from 'postcss-nesting'
import postcssCascadeLayers from '@csstools/postcss-cascade-layers'
import postcssMediaMinmax from 'postcss-media-minmax'
// JIT Browser Tailwind - generates CSS from HTML content using Tailwind JIT compiler
import { createTailwindcss, TailwindConfig } from '@mhsdesign/jit-browser-tailwindcss'

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

// Minimal Tailwind v4 source for fallback (if node_modules read fails)
const MINIMAL_TAILWIND_SOURCE = `
@layer theme, base, components, utilities;

@layer theme {
  :root, :host {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    --color-black: #000;
    --color-white: #fff;
    --spacing: 0.25rem;
    --default-font-family: var(--font-sans);
  }
}

@layer base {
  *, ::after, ::before, ::backdrop, ::file-selector-button {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0 solid;
  }
}
`

/**
 * Extract tailwind.config backgroundImage from HTML
 * Directly search for backgroundImage entries in the HTML
 */
function extractTailwindConfigFromHTML(html: string): TailwindCustomConfig | null {
  if (!html) return null

  // Check if backgroundImage exists
  if (!html.includes('backgroundImage')) {
    return null
  }

  const result: TailwindCustomConfig = {}
  const backgroundImage: Record<string, string> = {}

  // Find the backgroundImage section and extract entries
  // Pattern: 'name': "value" where value can be complex (urls, gradients)
  // We look for patterns like: 'grid-pattern': "linear-gradient(...)"

  // Match each entry: 'name': "..."  (handles escaped quotes in value)
  const entryRegex = /['"]([a-zA-Z0-9_-]+)['"]\s*:\s*"((?:[^"\\]|\\.)*)"/g
  let match

  // Only search in the backgroundImage section
  const bgStartIndex = html.indexOf('backgroundImage')
  if (bgStartIndex === -1) return null

  // Get a chunk of HTML starting from backgroundImage (enough to capture the entries)
  const searchChunk = html.substring(bgStartIndex, bgStartIndex + 2000)

  while ((match = entryRegex.exec(searchChunk)) !== null) {
    const name = match[1]
    let value = match[2]

    // Unescape the value
    value = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')

    // Skip if this looks like a color or font entry (not backgroundImage)
    if (['primary', 'secondary', 'accent', 'background', 'foreground', 'muted', 'border', 'heading', 'body', 'mono'].includes(name)) {
      continue
    }

    // Only include if it looks like a background value
    if (value.includes('url(') || value.includes('gradient') || value.includes('linear-') || value.includes('radial-')) {
      backgroundImage[name] = value
      console.log(`[CSS Export] Found backgroundImage: ${name} = ${value.substring(0, 50)}...`)
    }
  }

  if (Object.keys(backgroundImage).length > 0) {
    result.backgroundImage = backgroundImage
    console.log('[CSS Export] Extracted backgroundImages:', Object.keys(backgroundImage))
    return result
  }

  return null
}

/**
 * Extract CSS from <style> tags in HTML
 * This captures custom CSS like .bg-grid-pattern that AI generates inline
 */
function extractStyleTagsCSS(html: string): string {
  if (!html) return ''

  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
  let css = ''
  let match

  while ((match = styleRegex.exec(html)) !== null) {
    const styleContent = match[1].trim()
    // Skip Tailwind config scripts and design tokens (these are handled separately)
    if (styleContent.includes('tailwind.config') ||
        styleContent.includes('--color-brand-primary') ||
        styleContent.includes('@import') ||
        styleContent.includes('@tailwind')) {
      continue
    }
    css += styleContent + '\n\n'
  }

  return css
}

function getTailwindCSSContent(): string {
  if (tailwindCSSContent) return tailwindCSSContent

  // Try multiple paths to find tailwindcss/index.css
  const possiblePaths = [
    join(process.cwd(), 'node_modules', 'tailwindcss', 'index.css'),
    join(__dirname, '..', '..', '..', '..', '..', 'node_modules', 'tailwindcss', 'index.css'),
    '/var/task/node_modules/tailwindcss/index.css', // Vercel path
  ]

  for (const tailwindPath of possiblePaths) {
    try {
      tailwindCSSContent = readFileSync(tailwindPath, 'utf-8')
      console.log(`[CSS Export] Loaded Tailwind CSS source from ${tailwindPath}: ${tailwindCSSContent.length} bytes`)
      return tailwindCSSContent
    } catch (e) {
      console.log(`[CSS Export] Could not load from ${tailwindPath}`)
    }
  }

  // Fallback to minimal source
  console.warn('[CSS Export] Using minimal Tailwind source as fallback')
  tailwindCSSContent = MINIMAL_TAILWIND_SOURCE
  return tailwindCSSContent
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
    let tailwindConfig = (siteRes.data?.settings as Record<string, unknown>)?.tailwindConfig as TailwindCustomConfig | undefined
    if (tailwindConfig) {
      console.log('[CSS Export] Found Tailwind custom config in site settings:', Object.keys(tailwindConfig))
    }

    // 5. Collect all HTML content for Tailwind class extraction
    let allHtml = ''

    // Pages - include html_content, content JSON, and custom_css
    const { data: pagesWithHtml } = await supabase
      .from('pages')
      .select('html_content, content, custom_css')
      .eq('site_id', siteId)

    // Collect custom CSS from all pages (keyframes, custom classes, etc.)
    let pagesCustomCSS = ''
    // Type assertion needed because custom_css column may not exist in older schemas
    const pages = pagesWithHtml as Array<{
      html_content: string | null
      content: unknown
      custom_css?: string | null
    }> | null

    // Also extract tailwind.config from HTML (AI generates this inline)
    let extractedTailwindConfig: TailwindCustomConfig | null = null

    pages?.forEach((page) => {
      if (page.html_content) {
        allHtml += page.html_content
        // Extract CSS from <style> tags in HTML
        const extractedCSS = extractStyleTagsCSS(page.html_content)
        if (extractedCSS) {
          pagesCustomCSS += `/* Extracted from page HTML */\n${extractedCSS}\n`
        }
        // Extract tailwind.config from HTML (e.g. backgroundImage: { 'grid-pattern': '...' })
        if (!extractedTailwindConfig) {
          extractedTailwindConfig = extractTailwindConfigFromHTML(page.html_content)
          if (extractedTailwindConfig) {
            console.log('[CSS Export] Extracted tailwind.config from HTML:', Object.keys(extractedTailwindConfig))
          }
        }
      }
      allHtml += JSON.stringify(page.content || {})
      // Collect custom CSS field from each page
      if (page.custom_css) {
        pagesCustomCSS += page.custom_css + '\n\n'
      }
    })

    // Merge extracted tailwind config with site settings config
    if (extractedTailwindConfig) {
      const base: TailwindCustomConfig = tailwindConfig || {}
      const extracted: TailwindCustomConfig = extractedTailwindConfig

      tailwindConfig = {
        colors: extracted.colors || base.colors,
        fontFamily: extracted.fontFamily || base.fontFamily,
        backgroundImage: { ...base.backgroundImage, ...extracted.backgroundImage },
        keyframes: { ...base.keyframes, ...extracted.keyframes },
        animation: { ...base.animation, ...extracted.animation },
      }
      console.log('[CSS Export] Merged tailwind config, backgroundImage keys:', Object.keys(tailwindConfig.backgroundImage || {}))
    }

    // 6. CMS Components (including custom CSS)
    const { data: cmsComponents } = await supabase
      .from('cms_components')
      .select('html, css, variants')
      .eq('site_id', siteId)

    let cmsComponentsCSS = ''
    cmsComponents?.forEach((comp) => {
      allHtml += comp.html || ''
      // Collect component CSS
      if (comp.css) {
        cmsComponentsCSS += `/* Component CSS */\n${comp.css}\n\n`
      }
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

    // 7.5. Global Components (Header/Footer) - IMPORTANT: These must be included!
    // Components are linked via site.global_header_id and global_footer_id
    const { data: siteData } = await supabase
      .from('sites')
      .select('global_header_id, global_footer_id')
      .eq('id', siteId)
      .single()

    let componentsExtractedCSS = ''

    if (siteData?.global_header_id) {
      const { data: headerComp } = await supabase
        .from('components')
        .select('html, css, js')
        .eq('id', siteData.global_header_id)
        .single()

      if (headerComp) {
        allHtml += headerComp.html || ''
        allHtml += headerComp.css || ''
        // Extract CSS from <style> tags in header HTML
        const extractedCSS = extractStyleTagsCSS(headerComp.html || '')
        if (extractedCSS) {
          componentsExtractedCSS += `/* Header CSS */\n${extractedCSS}\n`
        }
      }
    }

    if (siteData?.global_footer_id) {
      const { data: footerComp } = await supabase
        .from('components')
        .select('html, css, js')
        .eq('id', siteData.global_footer_id)
        .single()

      if (footerComp) {
        allHtml += footerComp.html || ''
        allHtml += footerComp.css || ''
        // Extract CSS from <style> tags in footer HTML
        const extractedCSS = extractStyleTagsCSS(footerComp.html || '')
        if (extractedCSS) {
          componentsExtractedCSS += `/* Footer CSS */\n${extractedCSS}\n`
        }
      }
    }

    // Also check for components with site_id (fallback)
    const { data: siteComponents } = await supabase
      .from('components')
      .select('html, css, js')
      .eq('site_id', siteId)

    siteComponents?.forEach((comp) => {
      allHtml += comp.html || ''
      allHtml += comp.css || ''
    })

    // 8. Extract all CSS classes from HTML
    const extractedClasses = extractAllClasses(allHtml)

    // 9. Generate CSS Variables from design tokens (using central function)
    const designVars = designVarsRes.data as DesignVariables | null
    console.log('[CSS Export] designVars exists:', !!designVars)
    const cssVariables = generateDesignTokensCSS(designVars)
    console.log('[CSS Export] cssVariables length:', cssVariables.length)
    console.log('[CSS Export] cssVariables contains hover:bg-primary:', cssVariables.includes('hover\\\\:bg-primary'))

    // 9.5. Get stored fonts and generate @font-face CSS
    let fontFaceCSS = ''
    try {
      const storedFonts = await getStoredFonts(siteId)
      if (storedFonts.length > 0) {
        fontFaceCSS = generateExportFontFaceCSS(storedFonts, './fonts')
        console.log(`[CSS Export] Generated @font-face CSS for ${storedFonts.length} font files`)
      }
    } catch (fontError) {
      console.error('[CSS Export] Error loading fonts:', fontError)
    }

    // 10. Compile Tailwind CSS using JIT Browser library (primary) or v4 API (fallback)
    let tailwindCSS = ''
    let keyframesCSS = ''
    try {
      // PRIMARY: Use JIT Browser library - scans HTML directly for ALL Tailwind classes
      // This is more reliable than manual class extraction
      tailwindCSS = await compileTailwindCSSFromHTML(allHtml, tailwindConfig || undefined)
      console.log('[CSS Export] JIT compilation successful')
    } catch (jitError) {
      console.error('[CSS Export] JIT compilation failed, trying Tailwind v4 API:', jitError)
      try {
        // FALLBACK: Use Tailwind v4 API with extracted classes
        tailwindCSS = await compileTailwindCSS(extractedClasses, tailwindConfig || undefined)

        // Flatten CSS Nesting and @layer for browser compatibility
        tailwindCSS = await flattenCSS(tailwindCSS)

        // REMOVE the problematic :not(#\#) reset rules that override our colors
        tailwindCSS = stripTailwindResets(tailwindCSS)
      } catch (tailwindError) {
        console.error('[CSS Export] Tailwind v4 also failed:', tailwindError)
        // Ultimate fallback: basic utility generation
        tailwindCSS = generateFallbackCSS(extractedClasses)
      }
    }

    // Get keyframes separately - they need to be added AFTER Tailwind compilation
    if (tailwindConfig?.keyframes) {
      keyframesCSS = buildKeyframesCSS(tailwindConfig.keyframes)
    }

    // 11. Build custom utilities (Tailwind v4 @theme doesn't auto-generate these classes)
    let customUtilities = ''
    if (tailwindConfig?.animation) {
      customUtilities += buildAnimationUtilities(tailwindConfig.animation) + '\n\n'
    }
    if (tailwindConfig?.backgroundImage) {
      customUtilities += buildBackgroundImageUtilities(tailwindConfig.backgroundImage) + '\n\n'
    }

    // 11b. REMOVED: Arbitrary value fallback generation
    // Tailwind v4 compiles all arbitrary values correctly.
    // The fallback was causing selector bugs (space before :hover) and duplicate CSS.

    // 12. Combine everything
    // IMPORTANT: Design Tokens CSS must come AFTER Tailwind CSS!
    // Tailwind v4 uses @layer utilities, and CSS outside @layer always wins.
    // This allows our hover:bg-primary etc. to override Tailwind's .bg-white
    const fullCSS = `
/* ==================================================================
   UNICORN STUDIO - Generated CSS
   Site ID: ${siteId}
   Generated: ${new Date().toISOString()}
   Classes found: ${extractedClasses.size}

   DSGVO-KONFORM: Diese Datei lokal hosten!
   Host this file locally for GDPR compliance.
   ================================================================== */

${fontFaceCSS ? `/* ----------------------------------------------------------------
   LOCAL FONTS (@font-face)
   These fonts are hosted locally for GDPR compliance.
   Make sure to copy the font files to the ./fonts/ directory.
   ---------------------------------------------------------------- */
${fontFaceCSS}
` : ''}
/* ----------------------------------------------------------------
   TAILWIND UTILITIES (includes custom @theme colors/fonts)
   Compiled from ${extractedClasses.size} classes found in your content
   Note: These are in @layer utilities, so Design Tokens below will override
   ---------------------------------------------------------------- */
${tailwindCSS}

/* ----------------------------------------------------------------
   CUSTOM KEYFRAMES (from Tailwind config)
   ---------------------------------------------------------------- */
${keyframesCSS}

/* ----------------------------------------------------------------
   CUSTOM UTILITIES (animations, background-images, etc.)
   ---------------------------------------------------------------- */
${customUtilities}

/* ----------------------------------------------------------------
   CMS COMPONENTS CSS (custom component styles)
   ---------------------------------------------------------------- */
${cmsComponentsCSS}

/* ----------------------------------------------------------------
   PAGE CUSTOM CSS (extracted from AI-generated pages)
   Includes: @keyframes, custom utility classes, page-specific styles
   ---------------------------------------------------------------- */
${pagesCustomCSS}

/* ----------------------------------------------------------------
   COMPONENT CUSTOM CSS (extracted from Header/Footer)
   ---------------------------------------------------------------- */
${componentsExtractedCSS}

/* ----------------------------------------------------------------
   DESIGN TOKENS (CSS Variables + Utility Classes)
   IMPORTANT: This comes LAST and is NOT in @layer, so it always wins
   over Tailwind's layered utilities (hover states, colors, etc.)
   ---------------------------------------------------------------- */
${cssVariables}
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
 * Build @theme CSS from custom Tailwind config (colors, fonts, animation vars)
 * Note: Keyframes are built separately via buildKeyframesCSS()
 */
function buildThemeCSS(config: TailwindCustomConfig): string {
  const themeVars: string[] = []

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

  // Custom animation variables (for reference, though we generate utilities manually)
  if (config.animation) {
    Object.entries(config.animation).forEach(([name, value]) => {
      themeVars.push(`  --animate-${name}: ${value};`)
    })
  }

  if (themeVars.length === 0) {
    return ''
  }

  return `@theme {\n${themeVars.join('\n')}\n}\n`
}

/**
 * Build @keyframes CSS from config
 */
function buildKeyframesCSS(keyframes: Record<string, Record<string, Record<string, string>>>): string {
  const keyframeRules: string[] = []

  Object.entries(keyframes).forEach(([name, frames]) => {
    let kfCSS = `@keyframes ${name} {\n`
    Object.entries(frames).forEach(([frameKey, props]) => {
      kfCSS += `  ${frameKey} {\n`
      Object.entries(props).forEach(([prop, val]) => {
        kfCSS += `    ${prop}: ${val};\n`
      })
      kfCSS += `  }\n`
    })
    kfCSS += `}`
    keyframeRules.push(kfCSS)
  })

  return keyframeRules.join('\n\n')
}

/**
 * Build .animate-* utility classes from config
 * Tailwind v4 @theme defines --animate-* vars but doesn't auto-generate the classes
 */
function buildAnimationUtilities(animations: Record<string, string>): string {
  const rules: string[] = []

  Object.entries(animations).forEach(([name, value]) => {
    rules.push(`.animate-${name} { animation: ${value}; }`)
  })

  return rules.join('\n')
}

/**
 * Build .bg-* utility classes for custom background images/gradients
 */
function buildBackgroundImageUtilities(backgroundImages: Record<string, string>): string {
  const rules: string[] = []

  Object.entries(backgroundImages).forEach(([name, value]) => {
    rules.push(`.bg-${name} { background-image: ${value}; }`)
  })

  return rules.join('\n')
}

/**
 * Compile Tailwind CSS using JIT Browser library
 * This is MORE RELIABLE than manual class extraction because:
 * 1. Uses the same algorithm as Tailwind CDN
 * 2. Automatically finds ALL classes including arbitrary values
 * 3. Supports custom config (colors, fonts, backgroundImage)
 */
async function compileTailwindCSSFromHTML(htmlContent: string, customConfig?: TailwindCustomConfig): Promise<string> {
  try {
    console.log(`[CSS Export] Compiling CSS from ${htmlContent.length} bytes of HTML using JIT`)

    // Build Tailwind config for JIT compiler
    const jitConfig: TailwindConfig = {
      corePlugins: {
        preflight: true, // Include CSS reset
      },
      theme: {
        extend: {
          // Add custom colors
          ...(customConfig?.colors && { colors: customConfig.colors }),
          // Add custom font families
          ...(customConfig?.fontFamily && { fontFamily: customConfig.fontFamily }),
          // Add custom background images (e.g., bg-grid-pattern)
          ...(customConfig?.backgroundImage && { backgroundImage: customConfig.backgroundImage }),
          // Add custom keyframes
          ...(customConfig?.keyframes && { keyframes: customConfig.keyframes }),
          // Add custom animations
          ...(customConfig?.animation && { animation: customConfig.animation }),
        },
      },
    }

    // Log what we're adding
    if (customConfig?.colors) {
      console.log('[CSS Export] Added custom colors:', Object.keys(customConfig.colors))
    }
    if (customConfig?.fontFamily) {
      console.log('[CSS Export] Added custom fonts:', Object.keys(customConfig.fontFamily))
    }
    if (customConfig?.backgroundImage) {
      console.log('[CSS Export] Added custom backgroundImages:', Object.keys(customConfig.backgroundImage))
    }

    // Create JIT Tailwind instance
    const tailwindcss = createTailwindcss({
      tailwindConfig: jitConfig,
    })

    // Generate CSS from HTML content
    // The library scans HTML and generates CSS for ALL found Tailwind classes
    const css = await tailwindcss.generateStylesFromContent(
      `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      [htmlContent]
    )

    console.log(`[CSS Export] JIT generated ${css.length} bytes of CSS`)

    // Log some stats
    const arbitraryMatches = htmlContent.match(/class="[^"]*\[[^\]]+\][^"]*"/g)
    if (arbitraryMatches) {
      console.log(`[CSS Export] Found ${arbitraryMatches.length} elements with arbitrary values`)
    }

    return css
  } catch (error) {
    console.error('[CSS Export] JIT compile error:', error)
    throw error
  }
}

/**
 * Legacy Tailwind v4 compile function (kept as fallback)
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

    // Compile using Tailwind v4 API WITH PREFLIGHT (full reset)
    const cssInput = `@import "tailwindcss";\n\n${themeCSS}`

    const compiler = await compile(cssInput, {
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
    const css = compiler.build(classArray)

    console.log(`[CSS Export] Tailwind generated ${css.length} bytes of CSS`)

    // Log stats for debugging (no fallback generation - trust Tailwind)
    const arbitraryClasses = classArray.filter(cls => cls.includes('[') && cls.includes(']'))
    if (arbitraryClasses.length > 0) {
      console.log(`[CSS Export] Arbitrary values: ${arbitraryClasses.length}`)
    }

    return css
  } catch (error) {
    console.error('Tailwind v4 compile error:', error)
    throw error
  }
}

/**
 * Transform CSS for maximum browser compatibility
 * 1. postcss-nesting: Flatten `&:hover` to `.class:hover`
 * 2. postcss-cascade-layers: Remove @layer wrappers (emulates specificity)
 * 3. postcss-media-minmax: Convert `(width >= 64rem)` to `(min-width: 64rem)`
 */
async function flattenCSS(css: string): Promise<string> {
  try {
    const result = await postcss([
      postcssNesting,
      postcssCascadeLayers,
      postcssMediaMinmax,
    ]).process(css, { from: undefined })
    console.log(`[CSS Export] Transformed CSS for compatibility: ${css.length} -> ${result.css.length} bytes`)
    return result.css
  } catch (error) {
    console.error('[CSS Export] PostCSS transform failed:', error)
    // Return original CSS if transformation fails
    return css
  }
}

/**
 * Remove Tailwind v4's specificity hack :not(#\#) from all selectors.
 * This reduces Tailwind's specificity so our Design Tokens (which come after)
 * can override using normal CSS cascade rules - no !important needed.
 */
function stripTailwindResets(css: string): string {
  // Remove the :not(#\#) specificity hack pattern
  const result = css.replace(/:not\(#\\#\)/g, '')
  console.log(`[CSS Export] Removed specificity hacks from Tailwind CSS`)
  return result
}

/**
 * Post-process Tailwind CSS to fix empty rules for opacity colors
 * Tailwind v4 sometimes generates empty rules for border-color/5, etc.
 */
function postProcessTailwindCSS(css: string, classes: string[]): string {
  // Find classes that need fixing (opacity variants)
  const opacityClasses = classes.filter(cls =>
    cls.match(/^(border|bg|text)-(white|black)\/\d+$/)
  )

  for (const cls of opacityClasses) {
    const escapedCls = cls.replace(/\//g, '\\/')
    const emptyRulePattern = new RegExp(`\\.${escapedCls}\\s*\\{\\s*\\}`, 'g')

    // Check if rule is empty
    if (emptyRulePattern.test(css)) {
      const match = cls.match(/^(border|bg|text)-(white|black)\/(\d+)$/)
      if (match) {
        const [, type, color, opacity] = match
        const baseColor = color === 'white' ? '255, 255, 255' : '0, 0, 0'
        const opacityValue = parseInt(opacity) / 100

        let cssValue = ''
        if (type === 'border') {
          cssValue = `border-color: rgba(${baseColor}, ${opacityValue});`
        } else if (type === 'bg') {
          cssValue = `background-color: rgba(${baseColor}, ${opacityValue});`
        } else if (type === 'text') {
          cssValue = `color: rgba(${baseColor}, ${opacityValue});`
        }

        // Replace empty rule with actual CSS
        css = css.replace(emptyRulePattern, `.${escapedCls} { ${cssValue} }`)
      }
    }
  }

  return css
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

  // Extract classes from Alpine.js :class bindings
  // Pattern 1: :class="condition ? 'classes' : 'classes'"
  const alpineTernaryPattern = /:class=["'][^"']*\?\s*['"]([^'"]+)['"][^:]*:\s*['"]([^'"]*)['"]/gi
  while ((match = alpineTernaryPattern.exec(html)) !== null) {
    // Extract classes from both sides of ternary
    const trueClasses = match[1] || ''
    const falseClasses = match[2] || ''
    ;[trueClasses, falseClasses].forEach((classStr) => {
      classStr.split(/\s+/).forEach((cls) => {
        const trimmed = cls.trim()
        if (trimmed && !trimmed.includes('{') && !trimmed.includes('(')) {
          classes.add(trimmed)
        }
      })
    })
  }

  // Pattern 2: :class="{ 'class': condition }" - object syntax
  const alpineObjectPattern = /:class=["']\{([^}]+)\}["']/gi
  while ((match = alpineObjectPattern.exec(html)) !== null) {
    const objectContent = match[1]
    // Extract class names from object keys: 'rotate-45': condition
    const classKeyPattern = /['"]([^'"]+)['"]\s*:/g
    let classMatch
    while ((classMatch = classKeyPattern.exec(objectContent)) !== null) {
      const className = classMatch[1].trim()
      if (className && !className.includes('{') && !className.includes('(')) {
        classes.add(className)
      }
    }
  }

  // Pattern 3: Simple :class="'classes'" or x-bind:class="'classes'"
  const alpineSimplePattern = /(?::|x-bind:)class=["']['"]([^'"]+)['"]["']/gi
  while ((match = alpineSimplePattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed) {
        classes.add(trimmed)
      }
    })
  }

  // Pattern 4: Extract any quoted strings that look like Tailwind classes within :class
  // This catches: :class="mobileMenuOpen ? 'rotate-45 translate-y-2.5 bg-red-500' : ''"
  const alpineQuotedClassPattern = /:class=["'][^"']*['"]([a-z][\w\-\[\]\.\/\:]+(?:\s+[a-z][\w\-\[\]\.\/\:]+)*)['"][^"']*["']/gi
  while ((match = alpineQuotedClassPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed && /^[a-z]/.test(trimmed)) {
        classes.add(trimmed)
      }
    })
  }

  // =====================================================
  // ALPINE.JS COMPREHENSIVE CLASS EXTRACTION
  // Catches ALL Alpine attributes that might contain CSS classes
  // =====================================================

  // Pattern 5: ALL x-* attributes (x-transition, x-show, x-bind, etc.)
  // This is a catch-all for any Alpine directive that might contain class names
  const allAlpinePattern = /(?:x-[a-z:.-]+|@[a-z]+|:[a-z]+)=["']([^"']+)["']/gi
  while ((match = allAlpinePattern.exec(html)) !== null) {
    const attrValue = match[1]

    // Extract all quoted strings within the attribute value
    const quotedStrings = attrValue.match(/['"]([^'"]+)['"]/g) || []
    quotedStrings.forEach((quoted) => {
      // Remove quotes
      const content = quoted.slice(1, -1)
      // Split by spaces and check if they look like Tailwind classes
      content.split(/\s+/).forEach((cls) => {
        const trimmed = cls.trim()
        // Valid Tailwind class: starts with letter or -, contains alphanumeric, -, [, ], :, /, .
        if (trimmed && /^-?[a-z][\w\-\[\]:\/.]*$/i.test(trimmed)) {
          classes.add(trimmed)
        }
      })
    })

    // Also check for unquoted class-like values (for simple x-transition="transition")
    const unquotedClasses = attrValue.split(/\s+/)
    unquotedClasses.forEach((cls) => {
      const trimmed = cls.trim()
      // Skip JavaScript expressions
      if (trimmed && /^-?[a-z][\w-]*$/i.test(trimmed) && !trimmed.includes('(') && !trimmed.includes('?') && !trimmed.includes('!')) {
        classes.add(trimmed)
      }
    })
  }

  // Pattern 6: Vue.js style bindings (v-bind:class, :style with classes)
  const vueBindPattern = /v-bind:[a-z]+="[^"]*['"]([^'"]+)['"][^"]*"/gi
  while ((match = vueBindPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed && /^-?[a-z][\w-]*$/i.test(trimmed)) {
        classes.add(trimmed)
      }
    })
  }

  // Pattern 7: Data attributes that might contain classes (data-class, data-hover-class, etc.)
  const dataClassPattern = /data-[a-z-]*class=["']([^"']+)["']/gi
  while ((match = dataClassPattern.exec(html)) !== null) {
    const classString = match[1]
    classString.split(/\s+/).forEach((cls) => {
      const trimmed = cls.trim()
      if (trimmed && /^-?[a-z]/.test(trimmed)) {
        classes.add(trimmed)
      }
    })
  }

  return classes
}

/**
 * Fallback CSS generator if Tailwind compilation fails
 * This generates CSS for common Tailwind classes
 */
function generateFallbackCSS(classes: Set<string>): string {
  const cssRules: string[] = []
  const responsiveRules: { sm: string[]; md: string[]; lg: string[]; xl: string[]; '2xl': string[] } = {
    sm: [], md: [], lg: [], xl: [], '2xl': []
  }

  // Helper to add rule with optional responsive prefix
  const addRule = (prefix: string | null, selector: string, css: string) => {
    const rule = `.${escapeClassName(selector)} { ${css} }`
    if (prefix && prefix in responsiveRules) {
      responsiveRules[prefix as keyof typeof responsiveRules].push(rule)
    } else {
      cssRules.push(rule)
    }
  }

  // Helper to parse responsive prefix
  const parsePrefix = (cls: string): { prefix: string | null; base: string } => {
    const match = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/)
    if (match) {
      return { prefix: match[1], base: match[2] }
    }
    return { prefix: null, base: cls }
  }

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

    // Border with direction (border-t, border-r, border-b, border-l)
    const borderDirMatch = cls.match(/^border-(t|r|b|l)$/)
    if (borderDirMatch) {
      const dirMap: Record<string, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' }
      cssRules.push(`.${escapeClassName(cls)} { border-${dirMap[borderDirMatch[1]]}-width: 1px; border-style: solid; }`)
      return
    }

    // Border color with opacity (border-white/10, border-black/20, etc.)
    const borderOpacityMatch = cls.match(/^border-(white|black)\/(\d+)$/)
    if (borderOpacityMatch) {
      const [, color, opacity] = borderOpacityMatch
      const baseColor = color === 'white' ? '255, 255, 255' : '0, 0, 0'
      const opacityValue = parseInt(opacity) / 100
      cssRules.push(`.${escapeClassName(cls)} { border-color: rgba(${baseColor}, ${opacityValue}) !important; }`)
      return
    }

    // Also handle color with opacity for any color (e.g., border-gray-500/50)
    const borderColorOpacityMatch = cls.match(/^border-(slate|gray|zinc|red|orange|yellow|green|blue|indigo|purple|pink)-(\d+)\/(\d+)$/)
    if (borderColorOpacityMatch) {
      const [, colorName, shade, opacity] = borderColorOpacityMatch
      const colorValue = colors[colorName]?.[shade]
      if (colorValue) {
        // Convert hex to rgba
        const hex = colorValue.replace('#', '')
        const r = parseInt(hex.substring(0, 2), 16)
        const g = parseInt(hex.substring(2, 4), 16)
        const b = parseInt(hex.substring(4, 6), 16)
        const opacityValue = parseInt(opacity) / 100
        cssRules.push(`.${escapeClassName(cls)} { border-color: rgba(${r}, ${g}, ${b}, ${opacityValue}) !important; }`)
      }
      return
    }

    // Text color with opacity (text-white/50, text-gray-400, etc.)
    const textOpacityMatch = cls.match(/^text-(white|black)\/(\d+)$/)
    if (textOpacityMatch) {
      const [, color, opacity] = textOpacityMatch
      const baseColor = color === 'white' ? '255, 255, 255' : '0, 0, 0'
      const opacityValue = parseInt(opacity) / 100
      cssRules.push(`.${escapeClassName(cls)} { color: rgba(${baseColor}, ${opacityValue}); }`)
      return
    }

    // Tracking (letter-spacing)
    const trackingMatch = cls.match(/^tracking-(tighter|tight|normal|wide|wider|widest)$/)
    if (trackingMatch) {
      const trackingMap: Record<string, string> = {
        tighter: '-0.05em', tight: '-0.025em', normal: '0em',
        wide: '0.025em', wider: '0.05em', widest: '0.1em'
      }
      cssRules.push(`.${escapeClassName(cls)} { letter-spacing: ${trackingMap[trackingMatch[1]]}; }`)
      return
    }

    // Leading (line-height)
    const leadingMatch = cls.match(/^leading-(\d+)$/)
    if (leadingMatch) {
      cssRules.push(`.${escapeClassName(cls)} { line-height: ${parseInt(leadingMatch[1]) * 0.25}rem; }`)
      return
    }

    // Grid columns
    const gridColsMatch = cls.match(/^grid-cols-(\d+)$/)
    if (gridColsMatch) {
      cssRules.push(`.${escapeClassName(cls)} { grid-template-columns: repeat(${gridColsMatch[1]}, minmax(0, 1fr)); }`)
      return
    }

    // Col span
    const colSpanMatch = cls.match(/^col-span-(\d+)$/)
    if (colSpanMatch) {
      cssRules.push(`.${escapeClassName(cls)} { grid-column: span ${colSpanMatch[1]} / span ${colSpanMatch[1]}; }`)
      return
    }

    // Space utilities (space-y-4, space-x-2, etc.)
    const spaceMatch = cls.match(/^space-(x|y)-(\d+)$/)
    if (spaceMatch) {
      const [, dir, value] = spaceMatch
      const size = spacingScale[value] || `${parseInt(value) * 0.25}rem`
      const prop = dir === 'x' ? 'margin-left' : 'margin-top'
      cssRules.push(`.${escapeClassName(cls)} > :not([hidden]) ~ :not([hidden]) { ${prop}: ${size}; }`)
      return
    }

    // Max-width with size (max-w-sm, max-w-md, etc.)
    const maxWMatch = cls.match(/^max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl)$/)
    if (maxWMatch) {
      const maxWMap: Record<string, string> = {
        xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem',
        '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem'
      }
      cssRules.push(`.${escapeClassName(cls)} { max-width: ${maxWMap[maxWMatch[1]]}; }`)
      return
    }

    // Handle responsive prefixes (md:, lg:, etc.) - recurse without prefix
    const { prefix, base } = parsePrefix(cls)
    if (prefix && base !== cls) {
      // Generate the base rule
      const baseRules: string[] = []
      const tempClasses = new Set([base])
      // Re-process the base class to get its CSS (simplified approach)
      // For now, we'll handle common responsive patterns directly

      // Common responsive patterns
      if (patterns[base]) {
        addRule(prefix, cls, patterns[base])
        return
      }

      // Responsive spacing
      const respSpacingMatch = base.match(/^(m|p)(t|r|b|l|x|y)?-(\d+|auto|px)$/)
      if (respSpacingMatch) {
        const [, type, dir, value] = respSpacingMatch
        const prop = type === 'm' ? 'margin' : 'padding'
        const size = value === 'auto' ? 'auto' : value === 'px' ? '1px' : spacingScale[value] || `${parseInt(value) * 0.25}rem`
        const directions: Record<string, string[]> = {
          't': ['top'], 'r': ['right'], 'b': ['bottom'], 'l': ['left'],
          'x': ['left', 'right'], 'y': ['top', 'bottom'],
          '': ['top', 'right', 'bottom', 'left'],
        }
        const props = (directions[dir || ''] || directions['']).map((d) => `${prop}-${d}: ${size}`).join('; ')
        addRule(prefix, cls, props + ';')
        return
      }

      // Responsive grid columns
      const respGridMatch = base.match(/^grid-cols-(\d+)$/)
      if (respGridMatch) {
        addRule(prefix, cls, `grid-template-columns: repeat(${respGridMatch[1]}, minmax(0, 1fr));`)
        return
      }

      // Responsive col-span
      const respColSpanMatch = base.match(/^col-span-(\d+)$/)
      if (respColSpanMatch) {
        addRule(prefix, cls, `grid-column: span ${respColSpanMatch[1]} / span ${respColSpanMatch[1]};`)
        return
      }

      // Responsive flex direction
      if (base === 'flex-row') {
        addRule(prefix, cls, 'flex-direction: row;')
        return
      }
      if (base === 'flex-col') {
        addRule(prefix, cls, 'flex-direction: column;')
        return
      }

      // Responsive gap
      const respGapMatch = base.match(/^gap-(\d+)$/)
      if (respGapMatch) {
        const size = spacingScale[respGapMatch[1]] || `${parseInt(respGapMatch[1]) * 0.25}rem`
        addRule(prefix, cls, `gap: ${size};`)
        return
      }

      // Responsive justify/items
      const respJustifyMatch = base.match(/^(justify|items)-(center|start|end|between|around)$/)
      if (respJustifyMatch) {
        const propMap: Record<string, string> = { justify: 'justify-content', items: 'align-items' }
        const valueMap: Record<string, string> = {
          center: 'center', start: 'flex-start', end: 'flex-end',
          between: 'space-between', around: 'space-around'
        }
        addRule(prefix, cls, `${propMap[respJustifyMatch[1]]}: ${valueMap[respJustifyMatch[2]]};`)
        return
      }
    }

    // ==========================================
    // ARBITRARY VALUES SUPPORT
    // Handle Tailwind arbitrary value syntax: property-[value]
    // Including state prefixes: hover:, focus:, active:, group-hover:
    // ==========================================

    // Parse state prefix (hover:, focus:, active:, group-hover:, etc.)
    const stateMatch = cls.match(/^(hover|focus|active|group-hover|focus-within|focus-visible|disabled):(.+)$/)
    if (stateMatch) {
      const [, state, baseClass] = stateMatch

      // Handle arbitrary value in the base class
      const arbitraryMatch = baseClass.match(/^([\w-]+)-\[([^\]]+)\]$/)
      if (arbitraryMatch) {
        const [, property, rawValue] = arbitraryMatch
        const value = rawValue.replace(/_/g, ' ')

        // Map property to CSS
        const propertyMap: Record<string, string> = {
          'text': value.startsWith('var(') || value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') ? 'color' : 'font-size',
          'bg': value.startsWith('url(') || value.startsWith('linear-gradient') || value.startsWith('radial-gradient') ? 'background-image' : 'background-color',
          'border': 'border-color',
          'shadow': 'box-shadow',
          'opacity': 'opacity',
          'scale': 'transform',
          'rotate': 'transform',
          'translate': 'transform',
        }

        const cssProp = propertyMap[property] || property
        let cssValue = value

        // Handle transform values
        if (property === 'scale') cssValue = `scale(${value})`
        if (property === 'rotate') cssValue = `rotate(${value})`

        // Generate pseudo-class selector
        const stateMap: Record<string, string> = {
          'hover': ':hover',
          'focus': ':focus',
          'active': ':active',
          'focus-within': ':focus-within',
          'focus-visible': ':focus-visible',
          'disabled': ':disabled',
          'group-hover': '', // Special case
        }

        const pseudoClass = stateMap[state] || `:${state}`

        if (state === 'group-hover') {
          cssRules.push(`.group:hover .${escapeClassName(cls)} { ${cssProp}: ${cssValue}; }`)
        } else {
          cssRules.push(`.${escapeClassName(cls)}${pseudoClass} { ${cssProp}: ${cssValue}; }`)
        }
        return
      }
    }

    // Handle arbitrary shadow values: shadow-[10px_10px_0px_0px_rgba(255,255,255,1)]
    const arbitraryShadowMatch = cls.match(/^shadow-\[([^\]]+)\]$/)
    if (arbitraryShadowMatch) {
      const value = arbitraryShadowMatch[1].replace(/_/g, ' ')
      cssRules.push(`.${escapeClassName(cls)} { box-shadow: ${value}; }`)
      return
    }

    // Handle arbitrary font: font-['Anton'] or font-["Anton"]
    const arbitraryFontMatch = cls.match(/^font-\[['"]?([^'"\]]+)['"]?\]$/)
    if (arbitraryFontMatch) {
      const fontName = arbitraryFontMatch[1]
      cssRules.push(`.${escapeClassName(cls)} { font-family: '${fontName}', sans-serif; }`)
      return
    }

    // Handle arbitrary text size/color: text-[12vw], text-[#fff], text-[var(--color)]
    const arbitraryTextMatch = cls.match(/^text-\[([^\]]+)\]$/)
    if (arbitraryTextMatch) {
      const value = arbitraryTextMatch[1]
      // Check if it's a color (starts with #, rgb, hsl, or var)
      if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl') || value.startsWith('var(')) {
        cssRules.push(`.${escapeClassName(cls)} { color: ${value}; }`)
      } else {
        cssRules.push(`.${escapeClassName(cls)} { font-size: ${value}; }`)
      }
      return
    }

    // Handle arbitrary leading: leading-[0.8], leading-[1.5rem]
    const arbitraryLeadingMatch = cls.match(/^leading-\[([^\]]+)\]$/)
    if (arbitraryLeadingMatch) {
      cssRules.push(`.${escapeClassName(cls)} { line-height: ${arbitraryLeadingMatch[1]}; }`)
      return
    }

    // Handle arbitrary tracking: tracking-[0.1em]
    const arbitraryTrackingMatch = cls.match(/^tracking-\[([^\]]+)\]$/)
    if (arbitraryTrackingMatch) {
      cssRules.push(`.${escapeClassName(cls)} { letter-spacing: ${arbitraryTrackingMatch[1]}; }`)
      return
    }

    // Handle arbitrary width: w-[100px], w-[50%]
    const arbitraryWidthMatch = cls.match(/^w-\[([^\]]+)\]$/)
    if (arbitraryWidthMatch) {
      cssRules.push(`.${escapeClassName(cls)} { width: ${arbitraryWidthMatch[1]}; }`)
      return
    }

    // Handle arbitrary height: h-[100px], h-[50vh]
    const arbitraryHeightMatch = cls.match(/^h-\[([^\]]+)\]$/)
    if (arbitraryHeightMatch) {
      cssRules.push(`.${escapeClassName(cls)} { height: ${arbitraryHeightMatch[1]}; }`)
      return
    }

    // Handle arbitrary margin: m-[10px], mx-[auto], mt-[2rem]
    const arbitraryMarginMatch = cls.match(/^m([tlbrxy])?-\[([^\]]+)\]$/)
    if (arbitraryMarginMatch) {
      const [, dir, value] = arbitraryMarginMatch
      const directions: Record<string, string[]> = {
        't': ['top'], 'r': ['right'], 'b': ['bottom'], 'l': ['left'],
        'x': ['left', 'right'], 'y': ['top', 'bottom'],
        '': ['top', 'right', 'bottom', 'left'],
      }
      const props = (directions[dir || ''] || directions['']).map(d => `margin-${d}: ${value}`).join('; ')
      cssRules.push(`.${escapeClassName(cls)} { ${props}; }`)
      return
    }

    // Handle arbitrary padding: p-[10px], px-[2rem], pt-[5%]
    const arbitraryPaddingMatch = cls.match(/^p([tlbrxy])?-\[([^\]]+)\]$/)
    if (arbitraryPaddingMatch) {
      const [, dir, value] = arbitraryPaddingMatch
      const directions: Record<string, string[]> = {
        't': ['top'], 'r': ['right'], 'b': ['bottom'], 'l': ['left'],
        'x': ['left', 'right'], 'y': ['top', 'bottom'],
        '': ['top', 'right', 'bottom', 'left'],
      }
      const props = (directions[dir || ''] || directions['']).map(d => `padding-${d}: ${value}`).join('; ')
      cssRules.push(`.${escapeClassName(cls)} { ${props}; }`)
      return
    }

    // Handle arbitrary gap: gap-[20px], gap-x-[1rem]
    const arbitraryGapMatch = cls.match(/^gap(-[xy])?-\[([^\]]+)\]$/)
    if (arbitraryGapMatch) {
      const [, dir, value] = arbitraryGapMatch
      if (dir === '-x') {
        cssRules.push(`.${escapeClassName(cls)} { column-gap: ${value}; }`)
      } else if (dir === '-y') {
        cssRules.push(`.${escapeClassName(cls)} { row-gap: ${value}; }`)
      } else {
        cssRules.push(`.${escapeClassName(cls)} { gap: ${value}; }`)
      }
      return
    }

    // Handle arbitrary rounded: rounded-[10px], rounded-[50%]
    const arbitraryRoundedMatch = cls.match(/^rounded(-[tlbr]{1,2})?-\[([^\]]+)\]$/)
    if (arbitraryRoundedMatch) {
      const [, corner, value] = arbitraryRoundedMatch
      if (!corner) {
        cssRules.push(`.${escapeClassName(cls)} { border-radius: ${value}; }`)
      } else {
        // Handle corner-specific: rounded-tl-[10px], rounded-tr-[10px]
        const cornerMap: Record<string, string> = {
          '-t': 'border-top-left-radius: VAL; border-top-right-radius: VAL;',
          '-b': 'border-bottom-left-radius: VAL; border-bottom-right-radius: VAL;',
          '-l': 'border-top-left-radius: VAL; border-bottom-left-radius: VAL;',
          '-r': 'border-top-right-radius: VAL; border-bottom-right-radius: VAL;',
          '-tl': 'border-top-left-radius: VAL;',
          '-tr': 'border-top-right-radius: VAL;',
          '-bl': 'border-bottom-left-radius: VAL;',
          '-br': 'border-bottom-right-radius: VAL;',
        }
        const cssValue = (cornerMap[corner] || `border-radius: VAL;`).replace(/VAL/g, value)
        cssRules.push(`.${escapeClassName(cls)} { ${cssValue} }`)
      }
      return
    }

    // Handle arbitrary background: bg-[#ff0000], bg-[url('...')], bg-[linear-gradient(...)]
    const arbitraryBgMatch = cls.match(/^bg-\[([^\]]+)\]$/)
    if (arbitraryBgMatch) {
      const value = arbitraryBgMatch[1].replace(/_/g, ' ')
      if (value.startsWith('url(') || value.startsWith('linear-gradient') || value.startsWith('radial-gradient')) {
        cssRules.push(`.${escapeClassName(cls)} { background-image: ${value}; }`)
      } else {
        cssRules.push(`.${escapeClassName(cls)} { background-color: ${value}; }`)
      }
      return
    }

    // Handle arbitrary border: border-[2px], border-[#fff]
    const arbitraryBorderMatch = cls.match(/^border(-[tlbrxy])?-\[([^\]]+)\]$/)
    if (arbitraryBorderMatch) {
      const [, dir, value] = arbitraryBorderMatch
      // Determine if it's a width or color
      const isWidth = /^\d/.test(value) || value.includes('px') || value.includes('rem')
      const prop = isWidth ? 'border-width' : 'border-color'

      if (!dir) {
        cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${value}; }`)
      } else {
        const dirMap: Record<string, string> = { '-t': 'top', '-r': 'right', '-b': 'bottom', '-l': 'left' }
        const side = dirMap[dir] || ''
        if (side) {
          cssRules.push(`.${escapeClassName(cls)} { border-${side}-${isWidth ? 'width' : 'color'}: ${value}; }`)
        }
      }
      return
    }

    // Handle arbitrary inset: top-[10px], left-[50%], inset-[0]
    const arbitraryInsetMatch = cls.match(/^(top|right|bottom|left|inset)-\[([^\]]+)\]$/)
    if (arbitraryInsetMatch) {
      const [, prop, value] = arbitraryInsetMatch
      if (prop === 'inset') {
        cssRules.push(`.${escapeClassName(cls)} { top: ${value}; right: ${value}; bottom: ${value}; left: ${value}; }`)
      } else {
        cssRules.push(`.${escapeClassName(cls)} { ${prop}: ${value}; }`)
      }
      return
    }

    // Handle arbitrary z-index: z-[999], z-[9999]
    const arbitraryZMatch = cls.match(/^z-\[([^\]]+)\]$/)
    if (arbitraryZMatch) {
      cssRules.push(`.${escapeClassName(cls)} { z-index: ${arbitraryZMatch[1]}; }`)
      return
    }

    // Handle arbitrary opacity: opacity-[0.5], opacity-[75%]
    const arbitraryOpacityMatch = cls.match(/^opacity-\[([^\]]+)\]$/)
    if (arbitraryOpacityMatch) {
      let value = arbitraryOpacityMatch[1]
      if (value.endsWith('%')) {
        value = String(parseFloat(value) / 100)
      }
      cssRules.push(`.${escapeClassName(cls)} { opacity: ${value}; }`)
      return
    }

    // Handle arbitrary max-width: max-w-[500px], max-w-[80%]
    const arbitraryMaxWMatch = cls.match(/^max-w-\[([^\]]+)\]$/)
    if (arbitraryMaxWMatch) {
      cssRules.push(`.${escapeClassName(cls)} { max-width: ${arbitraryMaxWMatch[1]}; }`)
      return
    }

    // Handle arbitrary min-width: min-w-[100px]
    const arbitraryMinWMatch = cls.match(/^min-w-\[([^\]]+)\]$/)
    if (arbitraryMinWMatch) {
      cssRules.push(`.${escapeClassName(cls)} { min-width: ${arbitraryMinWMatch[1]}; }`)
      return
    }

    // Handle arbitrary max-height: max-h-[500px]
    const arbitraryMaxHMatch = cls.match(/^max-h-\[([^\]]+)\]$/)
    if (arbitraryMaxHMatch) {
      cssRules.push(`.${escapeClassName(cls)} { max-height: ${arbitraryMaxHMatch[1]}; }`)
      return
    }

    // Handle arbitrary min-height: min-h-[100px]
    const arbitraryMinHMatch = cls.match(/^min-h-\[([^\]]+)\]$/)
    if (arbitraryMinHMatch) {
      cssRules.push(`.${escapeClassName(cls)} { min-height: ${arbitraryMinHMatch[1]}; }`)
      return
    }

    // Handle arbitrary grid-cols: grid-cols-[repeat(auto-fill,minmax(200px,1fr))]
    const arbitraryGridColsMatch = cls.match(/^grid-cols-\[([^\]]+)\]$/)
    if (arbitraryGridColsMatch) {
      const value = arbitraryGridColsMatch[1].replace(/_/g, ' ')
      cssRules.push(`.${escapeClassName(cls)} { grid-template-columns: ${value}; }`)
      return
    }

    // Handle arbitrary aspect ratio: aspect-[16/9], aspect-[4/3]
    const arbitraryAspectMatch = cls.match(/^aspect-\[([^\]]+)\]$/)
    if (arbitraryAspectMatch) {
      cssRules.push(`.${escapeClassName(cls)} { aspect-ratio: ${arbitraryAspectMatch[1]}; }`)
      return
    }
  })

  // Build final CSS with media queries
  let result = cssRules.join('\n')

  const breakpoints: Record<string, string> = {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px'
  }

  for (const [bp, rules] of Object.entries(responsiveRules)) {
    if (rules.length > 0) {
      result += `\n\n@media (min-width: ${breakpoints[bp]}) {\n  ${rules.join('\n  ')}\n}`
    }
  }

  return result
}

/**
 * Escape class name for CSS selector
 * Handles all special characters including those in arbitrary values
 */
function escapeClassName(cls: string): string {
  // Escape: : [ ] / \ . - ( ) , ' "
  return cls.replace(/([:\[\]\/\\.\-\(\)\,\'\"#])/g, '\\$1')
}

/**
 * Generate fallback CSS specifically for arbitrary values with CSS variables
 * Tailwind v4 may not compile these correctly, so we generate them manually
 */
function generateArbitraryValuesFallback(classes: Set<string>): string {
  const cssRules: string[] = []
  const responsiveRules: Record<string, string[]> = { sm: [], md: [], lg: [], xl: [], '2xl': [] }
  const hoverRules: string[] = []

  const breakpoints: Record<string, string> = {
    sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px'
  }

  classes.forEach((cls) => {
    // Only process arbitrary values (classes with [...])
    if (!cls.includes('[') || !cls.includes(']')) return

    // Extract responsive/state prefix
    let baseClass = cls
    let responsivePrefix = ''
    let isHover = false

    const responsiveMatch = cls.match(/^(sm|md|lg|xl|2xl):(.+)$/)
    if (responsiveMatch) {
      responsivePrefix = responsiveMatch[1]
      baseClass = responsiveMatch[2]
    }

    if (baseClass.startsWith('hover:')) {
      isHover = true
      baseClass = baseClass.replace('hover:', '')
    }

    // Extract the value from [...]
    const valueMatch = baseClass.match(/\[([^\]]+)\]/)
    if (!valueMatch) return
    const value = valueMatch[1].replace(/_/g, ' ')

    let cssRule = ''
    const escaped = escapeClassName(cls)

    // Background color
    if (baseClass.match(/^bg-\[/)) {
      cssRule = `.${escaped} { background-color: ${value}; }`
    }
    // Text color
    else if (baseClass.match(/^text-\[/) && !value.match(/^\d/)) {
      cssRule = `.${escaped} { color: ${value}; }`
    }
    // Border color
    else if (baseClass.match(/^border-\[/) && !value.match(/^\d/)) {
      cssRule = `.${escaped} { border-color: ${value}; }`
    }
    else if (baseClass.match(/^border-[tlbr]-\[/) && !value.match(/^\d/)) {
      const side = baseClass.match(/border-([tlbr])-/)?.[1]
      const sideMap: Record<string, string> = { t: 'top', r: 'right', b: 'bottom', l: 'left' }
      cssRule = `.${escaped} { border-${sideMap[side || ''] || ''}-color: ${value}; }`
    }
    // Font family
    else if (baseClass.match(/^font-\[/)) {
      const fontName = value.replace(/['"]/g, '')
      cssRule = `.${escaped} { font-family: '${fontName}', sans-serif; }`
    }
    // Shadow
    else if (baseClass.match(/^shadow-\[/)) {
      cssRule = `.${escaped} { box-shadow: ${value}; }`
    }
    // Z-index
    else if (baseClass.match(/^z-\[/)) {
      cssRule = `.${escaped} { z-index: ${value}; }`
    }
    // Width
    else if (baseClass.match(/^w-\[/)) {
      cssRule = `.${escaped} { width: ${value}; }`
    }
    // Height
    else if (baseClass.match(/^h-\[/)) {
      cssRule = `.${escaped} { height: ${value}; }`
    }
    // Min/Max width/height
    else if (baseClass.match(/^min-w-\[/)) {
      cssRule = `.${escaped} { min-width: ${value}; }`
    }
    else if (baseClass.match(/^max-w-\[/)) {
      cssRule = `.${escaped} { max-width: ${value}; }`
    }
    else if (baseClass.match(/^min-h-\[/)) {
      cssRule = `.${escaped} { min-height: ${value}; }`
    }
    else if (baseClass.match(/^max-h-\[/)) {
      cssRule = `.${escaped} { max-height: ${value}; }`
    }
    // Padding
    else if (baseClass.match(/^p-\[/)) {
      cssRule = `.${escaped} { padding: ${value}; }`
    }
    else if (baseClass.match(/^p[xytblr]-\[/)) {
      const dir = baseClass.match(/p([xytblr])-/)?.[1]
      const propMap: Record<string, string> = {
        x: 'padding-left: VAL; padding-right: VAL',
        y: 'padding-top: VAL; padding-bottom: VAL',
        t: 'padding-top: VAL', b: 'padding-bottom: VAL',
        l: 'padding-left: VAL', r: 'padding-right: VAL'
      }
      cssRule = `.${escaped} { ${(propMap[dir || ''] || '').replace(/VAL/g, value)}; }`
    }
    // Margin
    else if (baseClass.match(/^-?m-\[/)) {
      const isNeg = baseClass.startsWith('-')
      cssRule = `.${escaped} { margin: ${isNeg ? '-' : ''}${value}; }`
    }
    else if (baseClass.match(/^-?m[xytblr]-\[/)) {
      const isNeg = baseClass.startsWith('-')
      const dir = baseClass.match(/m([xytblr])-/)?.[1]
      const propMap: Record<string, string> = {
        x: 'margin-left: VAL; margin-right: VAL',
        y: 'margin-top: VAL; margin-bottom: VAL',
        t: 'margin-top: VAL', b: 'margin-bottom: VAL',
        l: 'margin-left: VAL', r: 'margin-right: VAL'
      }
      cssRule = `.${escaped} { ${(propMap[dir || ''] || '').replace(/VAL/g, (isNeg ? '-' : '') + value)}; }`
    }
    // Gap
    else if (baseClass.match(/^gap-\[/)) {
      cssRule = `.${escaped} { gap: ${value}; }`
    }
    // Top/Right/Bottom/Left
    else if (baseClass.match(/^(top|right|bottom|left|inset)-\[/)) {
      const prop = baseClass.match(/^(top|right|bottom|left|inset)-/)?.[1]
      if (prop === 'inset') {
        cssRule = `.${escaped} { top: ${value}; right: ${value}; bottom: ${value}; left: ${value}; }`
      } else {
        cssRule = `.${escaped} { ${prop}: ${value}; }`
      }
    }
    // Text size (only if it looks like a size)
    else if (baseClass.match(/^text-\[/) && value.match(/^\d|^var/)) {
      cssRule = `.${escaped} { font-size: ${value}; }`
    }
    // Leading (line-height)
    else if (baseClass.match(/^leading-\[/)) {
      cssRule = `.${escaped} { line-height: ${value}; }`
    }
    // Tracking (letter-spacing)
    else if (baseClass.match(/^tracking-\[/)) {
      cssRule = `.${escaped} { letter-spacing: ${value}; }`
    }
    // Rounded
    else if (baseClass.match(/^rounded-\[/)) {
      cssRule = `.${escaped} { border-radius: ${value}; }`
    }
    // Opacity
    else if (baseClass.match(/^opacity-\[/)) {
      cssRule = `.${escaped} { opacity: ${value}; }`
    }
    // Translate
    else if (baseClass.match(/^translate-[xy]-\[/)) {
      const axis = baseClass.includes('-x-') ? 'X' : 'Y'
      cssRule = `.${escaped} { transform: translate${axis}(${value}); }`
    }
    else if (baseClass.match(/^-translate-[xy]-\[/)) {
      const axis = baseClass.includes('-x-') ? 'X' : 'Y'
      cssRule = `.${escaped} { transform: translate${axis}(-${value}); }`
    }
    // Scale
    else if (baseClass.match(/^scale-\[/)) {
      cssRule = `.${escaped} { transform: scale(${value}); }`
    }
    // Rotate
    else if (baseClass.match(/^rotate-\[/)) {
      cssRule = `.${escaped} { transform: rotate(${value}); }`
    }
    // Duration
    else if (baseClass.match(/^duration-\[/)) {
      cssRule = `.${escaped} { transition-duration: ${value}; }`
    }
    // Grid
    else if (baseClass.match(/^grid-cols-\[/)) {
      cssRule = `.${escaped} { grid-template-columns: ${value}; }`
    }
    else if (baseClass.match(/^grid-rows-\[/)) {
      cssRule = `.${escaped} { grid-template-rows: ${value}; }`
    }
    else if (baseClass.match(/^col-span-\[/)) {
      cssRule = `.${escaped} { grid-column: span ${value} / span ${value}; }`
    }
    else if (baseClass.match(/^row-span-\[/)) {
      cssRule = `.${escaped} { grid-row: span ${value} / span ${value}; }`
    }
    // Aspect ratio
    else if (baseClass.match(/^aspect-\[/)) {
      cssRule = `.${escaped} { aspect-ratio: ${value}; }`
    }

    if (!cssRule) return

    // Add hover pseudo-class if needed
    if (isHover) {
      cssRule = cssRule.replace(' {', ':hover {')
    }

    // Add to appropriate bucket
    if (responsivePrefix && breakpoints[responsivePrefix]) {
      responsiveRules[responsivePrefix].push(cssRule)
    } else {
      cssRules.push(cssRule)
    }
  })

  // Build final CSS
  let result = cssRules.join('\n')

  for (const [bp, rules] of Object.entries(responsiveRules)) {
    if (rules.length > 0) {
      result += `\n\n@media (min-width: ${breakpoints[bp]}) {\n  ${rules.join('\n  ')}\n}`
    }
  }

  return result
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
