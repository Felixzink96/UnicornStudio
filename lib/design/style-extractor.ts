// ============================================
// STYLE EXTRACTOR
// Extracts design tokens from generated HTML
// ============================================

// Tailwind color name to hex mapping
const TAILWIND_COLORS: Record<string, Record<string, string>> = {
  slate: {
    '50': '#f8fafc', '100': '#f1f5f9', '200': '#e2e8f0', '300': '#cbd5e1',
    '400': '#94a3b8', '500': '#64748b', '600': '#475569', '700': '#334155',
    '800': '#1e293b', '900': '#0f172a', '950': '#020617',
  },
  gray: {
    '50': '#f9fafb', '100': '#f3f4f6', '200': '#e5e7eb', '300': '#d1d5db',
    '400': '#9ca3af', '500': '#6b7280', '600': '#4b5563', '700': '#374151',
    '800': '#1f2937', '900': '#111827', '950': '#030712',
  },
  zinc: {
    '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
    '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
    '800': '#27272a', '900': '#18181b', '950': '#09090b',
  },
  neutral: {
    '50': '#fafafa', '100': '#f5f5f5', '200': '#e5e5e5', '300': '#d4d4d4',
    '400': '#a3a3a3', '500': '#737373', '600': '#525252', '700': '#404040',
    '800': '#262626', '900': '#171717', '950': '#0a0a0a',
  },
  stone: {
    '50': '#fafaf9', '100': '#f5f5f4', '200': '#e7e5e4', '300': '#d6d3d1',
    '400': '#a8a29e', '500': '#78716c', '600': '#57534e', '700': '#44403c',
    '800': '#292524', '900': '#1c1917', '950': '#0c0a09',
  },
  red: {
    '50': '#fef2f2', '100': '#fee2e2', '200': '#fecaca', '300': '#fca5a5',
    '400': '#f87171', '500': '#ef4444', '600': '#dc2626', '700': '#b91c1c',
    '800': '#991b1b', '900': '#7f1d1d', '950': '#450a0a',
  },
  orange: {
    '50': '#fff7ed', '100': '#ffedd5', '200': '#fed7aa', '300': '#fdba74',
    '400': '#fb923c', '500': '#f97316', '600': '#ea580c', '700': '#c2410c',
    '800': '#9a3412', '900': '#7c2d12', '950': '#431407',
  },
  amber: {
    '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
    '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
    '800': '#92400e', '900': '#78350f', '950': '#451a03',
  },
  yellow: {
    '50': '#fefce8', '100': '#fef9c3', '200': '#fef08a', '300': '#fde047',
    '400': '#facc15', '500': '#eab308', '600': '#ca8a04', '700': '#a16207',
    '800': '#854d0e', '900': '#713f12', '950': '#422006',
  },
  lime: {
    '50': '#f7fee7', '100': '#ecfccb', '200': '#d9f99d', '300': '#bef264',
    '400': '#a3e635', '500': '#84cc16', '600': '#65a30d', '700': '#4d7c0f',
    '800': '#3f6212', '900': '#365314', '950': '#1a2e05',
  },
  green: {
    '50': '#f0fdf4', '100': '#dcfce7', '200': '#bbf7d0', '300': '#86efac',
    '400': '#4ade80', '500': '#22c55e', '600': '#16a34a', '700': '#15803d',
    '800': '#166534', '900': '#14532d', '950': '#052e16',
  },
  emerald: {
    '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b7',
    '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857',
    '800': '#065f46', '900': '#064e3b', '950': '#022c22',
  },
  teal: {
    '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4',
    '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e',
    '800': '#115e59', '900': '#134e4a', '950': '#042f2e',
  },
  cyan: {
    '50': '#ecfeff', '100': '#cffafe', '200': '#a5f3fc', '300': '#67e8f9',
    '400': '#22d3ee', '500': '#06b6d4', '600': '#0891b2', '700': '#0e7490',
    '800': '#155e75', '900': '#164e63', '950': '#083344',
  },
  sky: {
    '50': '#f0f9ff', '100': '#e0f2fe', '200': '#bae6fd', '300': '#7dd3fc',
    '400': '#38bdf8', '500': '#0ea5e9', '600': '#0284c7', '700': '#0369a1',
    '800': '#075985', '900': '#0c4a6e', '950': '#082f49',
  },
  blue: {
    '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
    '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8',
    '800': '#1e40af', '900': '#1e3a8a', '950': '#172554',
  },
  indigo: {
    '50': '#eef2ff', '100': '#e0e7ff', '200': '#c7d2fe', '300': '#a5b4fc',
    '400': '#818cf8', '500': '#6366f1', '600': '#4f46e5', '700': '#4338ca',
    '800': '#3730a3', '900': '#312e81', '950': '#1e1b4b',
  },
  violet: {
    '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
    '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9',
    '800': '#5b21b6', '900': '#4c1d95', '950': '#2e1065',
  },
  purple: {
    '50': '#faf5ff', '100': '#f3e8ff', '200': '#e9d5ff', '300': '#d8b4fe',
    '400': '#c084fc', '500': '#a855f7', '600': '#9333ea', '700': '#7e22ce',
    '800': '#6b21a8', '900': '#581c87', '950': '#3b0764',
  },
  fuchsia: {
    '50': '#fdf4ff', '100': '#fae8ff', '200': '#f5d0fe', '300': '#f0abfc',
    '400': '#e879f9', '500': '#d946ef', '600': '#c026d3', '700': '#a21caf',
    '800': '#86198f', '900': '#701a75', '950': '#4a044e',
  },
  pink: {
    '50': '#fdf2f8', '100': '#fce7f3', '200': '#fbcfe8', '300': '#f9a8d4',
    '400': '#f472b6', '500': '#ec4899', '600': '#db2777', '700': '#be185d',
    '800': '#9d174d', '900': '#831843', '950': '#500724',
  },
  rose: {
    '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
    '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
    '800': '#9f1239', '900': '#881337', '950': '#4c0519',
  },
}

// Neutral color families for grayscale detection
const NEUTRAL_FAMILIES = ['slate', 'gray', 'zinc', 'neutral', 'stone']

// Accent color families
const ACCENT_FAMILIES = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose'
]

export interface ExtractedStyles {
  colors: {
    backgrounds: string[]
    texts: string[]
    borders: string[]
    gradients: string[]
    suggestedPrimary: string | null
    suggestedPrimaryHex: string | null
    suggestedSecondary: string | null
    suggestedSecondaryHex: string | null
    suggestedBackground: string
    suggestedForeground: string
  }
  fonts: {
    googleFonts: string[]
    fontFamilies: string[]
    googleFontUrls: string[]
  }
  spacing: {
    sectionPaddings: string[]
    containerWidths: string[]
    gaps: string[]
  }
  radii: string[]
  shadows: string[]
}

export interface SuggestedTokens {
  colors: {
    primary: string
    primaryHover: string
    secondary: string
    accent: string
    background: string
    foreground: string
    muted: string
    border: string
  }
  fonts: {
    heading: string
    body: string
    mono: string
  }
  spacing: {
    section: string
    container: string
    cardGap: string
  }
  radii: {
    default: string
    lg: string
  }
}

/**
 * Extract all Tailwind classes from HTML
 */
function extractTailwindClasses(html: string): string[] {
  const classRegex = /class=["']([^"']+)["']/g
  const classes: string[] = []

  let match
  while ((match = classRegex.exec(html)) !== null) {
    const classList = match[1].split(/\s+/)
    classes.push(...classList)
  }

  return [...new Set(classes)]
}

/**
 * Extract Tailwind config fontFamily definitions from HTML
 * Parses the tailwind.config script block
 */
function extractTailwindFontConfig(html: string): Record<string, string> | null {
  // Look for tailwind.config = { ... fontFamily: { ... } }
  const configMatch = html.match(/tailwind\.config\s*=\s*\{[\s\S]*?fontFamily:\s*\{([^}]+)\}/i)
  if (!configMatch) return null

  const fontFamilyBlock = configMatch[1]
  const fontMap: Record<string, string> = {}

  // Parse entries like: 'serif': ['"Italiana"', 'serif'],
  const entryRegex = /['"]?(\w+)['"]?\s*:\s*\[([^\]]+)\]/g
  let match
  while ((match = entryRegex.exec(fontFamilyBlock)) !== null) {
    const key = match[1] // e.g., 'serif', 'tech', 'body'
    const fontsArray = match[2]

    // Extract the first font (primary font)
    const fontMatch = fontsArray.match(/['"]([\w\s]+)['"]/i)
    if (fontMatch) {
      fontMap[key] = fontMatch[1] // e.g., 'Italiana', 'Space Grotesk', 'Inter'
    }
  }

  return Object.keys(fontMap).length > 0 ? fontMap : null
}

/**
 * Extract Google Fonts from HTML
 */
function extractGoogleFonts(html: string): { fonts: string[], urls: string[], tailwindFontConfig: Record<string, string> | null } {
  const fonts: string[] = []
  const urls: string[] = []

  // Match Google Fonts link tags
  const linkRegex = /<link[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/gi
  let match

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1]
    urls.push(url)

    // Extract ALL font families from URL (there can be multiple family= params)
    const familyRegex = /family=([^&:]+)/gi
    let familyMatch
    while ((familyMatch = familyRegex.exec(url)) !== null) {
      const fontName = decodeURIComponent(familyMatch[1]).replace(/\+/g, ' ')
      if (!fonts.includes(fontName)) {
        fonts.push(fontName)
      }
    }
  }

  // Match @import statements for Google Fonts
  const importRegex = /@import\s+url\(['"]?([^'")\s]*fonts\.googleapis\.com[^'")\s]*)['"]?\)/gi
  while ((match = importRegex.exec(html)) !== null) {
    const url = match[1]
    if (!urls.includes(url)) {
      urls.push(url)

      const familyMatch = url.match(/family=([^&:]+)/i)
      if (familyMatch) {
        const fontName = decodeURIComponent(familyMatch[1]).replace(/\+/g, ' ')
        if (!fonts.includes(fontName)) {
          fonts.push(fontName)
        }
      }
    }
  }

  // Also check for font-family in inline styles
  const styleRegex = /font-family:\s*['"]?([^;'"]+)['"]?/gi
  while ((match = styleRegex.exec(html)) !== null) {
    const fontStack = match[1]
    const primaryFont = fontStack.split(',')[0].trim().replace(/['"]/g, '')

    // Check if it's a known Google Font
    if (!primaryFont.match(/^(system-ui|sans-serif|serif|monospace|cursive|fantasy|ui-sans-serif|ui-serif|ui-monospace)$/i)) {
      if (!fonts.includes(primaryFont)) {
        fonts.push(primaryFont)
      }
    }
  }

  return { fonts, urls }
}

/**
 * Get hex color from Tailwind class
 */
function getHexFromTailwindColor(colorClass: string): string | null {
  // Parse color class like bg-blue-600, text-slate-900
  const match = colorClass.match(/(?:bg|text|border|from|to|via)-(\w+)-(\d+)/)
  if (!match) return null

  const [, colorName, shade] = match
  const colorFamily = TAILWIND_COLORS[colorName]

  if (colorFamily && colorFamily[shade]) {
    return colorFamily[shade]
  }

  return null
}

/**
 * Check if a color is an accent (non-neutral) color
 */
function isAccentColor(colorClass: string): boolean {
  return ACCENT_FAMILIES.some(family => colorClass.includes(`-${family}-`))
}

/**
 * Check if a color is neutral (grayscale)
 */
function isNeutralColor(colorClass: string): boolean {
  return NEUTRAL_FAMILIES.some(family => colorClass.includes(`-${family}-`))
}

/**
 * Darken a hex color by a percentage
 */
export function darkenHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

/**
 * Lighten a hex color by a percentage
 */
export function lightenHex(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

/**
 * Extract all styles from HTML
 */
export function extractStylesFromHtml(html: string): ExtractedStyles {
  const classes = extractTailwindClasses(html)
  const googleFonts = extractGoogleFonts(html)

  // Categorize colors
  const backgrounds = classes.filter(c => c.startsWith('bg-') && !c.startsWith('bg-gradient'))
  const texts = classes.filter(c => c.startsWith('text-') && c.match(/text-\w+-\d+/))
  const borders = classes.filter(c => c.startsWith('border-') && c.match(/border-\w+-\d+/))
  const gradients = classes.filter(c =>
    c.startsWith('bg-gradient') || c.startsWith('from-') || c.startsWith('to-') || c.startsWith('via-')
  )

  // Find accent colors for primary/secondary suggestions
  const accentBgs = backgrounds.filter(isAccentColor)
  const accentColorCounts = new Map<string, number>()

  for (const bg of accentBgs) {
    const match = bg.match(/bg-(\w+-\d+)/)
    if (match) {
      const colorKey = match[1]
      accentColorCounts.set(colorKey, (accentColorCounts.get(colorKey) || 0) + 1)
    }
  }

  // Sort by frequency
  const sortedAccents = [...accentColorCounts.entries()].sort((a, b) => b[1] - a[1])

  const suggestedPrimary = sortedAccents[0] ? `bg-${sortedAccents[0][0]}` : null
  const suggestedPrimaryHex = suggestedPrimary ? getHexFromTailwindColor(suggestedPrimary) : null

  const suggestedSecondary = sortedAccents[1] ? `bg-${sortedAccents[1][0]}` : null
  const suggestedSecondaryHex = suggestedSecondary ? getHexFromTailwindColor(suggestedSecondary) : null

  // Find background color (most common light neutral)
  const neutralBgs = backgrounds.filter(isNeutralColor)
  let suggestedBackground = '#ffffff'
  for (const bg of neutralBgs) {
    const hex = getHexFromTailwindColor(bg)
    if (hex && (hex === '#ffffff' || hex.startsWith('#f'))) {
      suggestedBackground = hex
      break
    }
  }

  // Find foreground color (most common dark neutral text)
  const neutralTexts = texts.filter(isNeutralColor)
  let suggestedForeground = '#0f172a'
  for (const text of neutralTexts) {
    const hex = getHexFromTailwindColor(text)
    if (hex && hex.startsWith('#0') || hex?.startsWith('#1') || hex?.startsWith('#2')) {
      suggestedForeground = hex
      break
    }
  }

  // Extract font families
  const fontFamilies = classes.filter(c => c.startsWith('font-') && !c.match(/font-(normal|bold|medium|semibold|light|thin|extrabold|black)/))

  // Extract spacing
  const sectionPaddings = classes.filter(c => c.match(/^py-\d+/) || c.match(/^sm:py-\d+/) || c.match(/^lg:py-\d+/))
  const containerWidths = classes.filter(c => c.startsWith('max-w-'))
  const gaps = classes.filter(c => c.startsWith('gap-'))

  // Extract radii
  const radii = classes.filter(c => c.startsWith('rounded'))

  // Extract shadows
  const shadows = classes.filter(c => c.startsWith('shadow'))

  return {
    colors: {
      backgrounds: [...new Set(backgrounds)],
      texts: [...new Set(texts)],
      borders: [...new Set(borders)],
      gradients: [...new Set(gradients)],
      suggestedPrimary,
      suggestedPrimaryHex,
      suggestedSecondary,
      suggestedSecondaryHex,
      suggestedBackground,
      suggestedForeground,
    },
    fonts: {
      googleFonts: googleFonts.fonts,
      fontFamilies: [...new Set(fontFamilies)],
      googleFontUrls: googleFonts.urls,
    },
    spacing: {
      sectionPaddings: [...new Set(sectionPaddings)],
      containerWidths: [...new Set(containerWidths)],
      gaps: [...new Set(gaps)],
    },
    radii: [...new Set(radii)],
    shadows: [...new Set(shadows)],
  }
}

/**
 * Convert extracted styles to suggested design tokens
 */
export function suggestDesignTokens(extracted: ExtractedStyles): SuggestedTokens {
  // Primary color
  const primaryHex = extracted.colors.suggestedPrimaryHex || '#2563eb' // blue-600 default
  const primaryHoverHex = darkenHex(primaryHex, 10)

  // Secondary color
  const secondaryHex = extracted.colors.suggestedSecondaryHex || '#64748b' // slate-500 default

  // Accent (use primary or a complementary color)
  const accentHex = extracted.colors.suggestedSecondaryHex || '#f59e0b' // amber-500 default

  // Background and foreground
  const backgroundHex = extracted.colors.suggestedBackground
  const foregroundHex = extracted.colors.suggestedForeground

  // Muted colors
  const mutedHex = lightenHex(foregroundHex, 85) // Very light version of foreground
  const borderHex = lightenHex(foregroundHex, 75)

  // Font suggestions - try to intelligently assign fonts
  // Common serif fonts are usually for headings, sans-serif for body
  const serifFonts = ['Italiana', 'Playfair Display', 'Merriweather', 'Lora', 'Georgia', 'Cormorant', 'Libre Baskerville', 'EB Garamond', 'Crimson Text', 'Source Serif Pro']
  const monoFonts = ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Roboto Mono', 'IBM Plex Mono', 'Space Mono', 'Inconsolata', 'Monaco', 'Consolas']

  const fonts = extracted.fonts.googleFonts

  // Find fonts by category
  const foundSerifFont = fonts.find(f => serifFonts.some(sf => f.toLowerCase().includes(sf.toLowerCase())))
  const foundMonoFont = fonts.find(f => monoFonts.some(mf => f.toLowerCase().includes(mf.toLowerCase())))
  const foundSansFont = fonts.find(f =>
    !serifFonts.some(sf => f.toLowerCase().includes(sf.toLowerCase())) &&
    !monoFonts.some(mf => f.toLowerCase().includes(mf.toLowerCase()))
  )

  // Assign fonts intelligently:
  // - Serif font → heading (elegant headlines)
  // - Sans-serif font → body (readable text)
  // - If only one font, use it for both
  let headingFont: string
  let bodyFont: string

  if (foundSerifFont && foundSansFont) {
    // Have both serif and sans - use serif for headings, sans for body
    headingFont = foundSerifFont
    bodyFont = foundSansFont
  } else if (foundSerifFont) {
    // Only serif - use for heading, default for body
    headingFont = foundSerifFont
    bodyFont = fonts.find(f => f !== foundSerifFont) || 'Inter'
  } else if (foundSansFont) {
    // Only sans - use for both (common in modern designs)
    headingFont = foundSansFont
    bodyFont = foundSansFont
  } else if (fonts.length >= 2) {
    // Multiple fonts but can't categorize - first for heading, second for body
    headingFont = fonts[0]
    bodyFont = fonts[1]
  } else {
    // Fallback
    headingFont = fonts[0] || 'Inter'
    bodyFont = fonts[0] || 'Inter'
  }

  // Spacing suggestions
  let sectionSpacing = '6rem'
  if (extracted.spacing.sectionPaddings.some(p => p.includes('py-24') || p.includes('py-32'))) {
    sectionSpacing = '8rem'
  } else if (extracted.spacing.sectionPaddings.some(p => p.includes('py-12') || p.includes('py-16'))) {
    sectionSpacing = '4rem'
  }

  let containerWidth = '1280px'
  if (extracted.spacing.containerWidths.includes('max-w-6xl')) {
    containerWidth = '1152px'
  } else if (extracted.spacing.containerWidths.includes('max-w-5xl')) {
    containerWidth = '1024px'
  } else if (extracted.spacing.containerWidths.includes('max-w-4xl')) {
    containerWidth = '896px'
  }

  let cardGap = '2rem'
  if (extracted.spacing.gaps.includes('gap-6')) {
    cardGap = '1.5rem'
  } else if (extracted.spacing.gaps.includes('gap-4')) {
    cardGap = '1rem'
  }

  // Radius suggestions
  let defaultRadius = '0.5rem'
  let lgRadius = '0.75rem'
  if (extracted.radii.includes('rounded-xl') || extracted.radii.includes('rounded-2xl')) {
    defaultRadius = '0.75rem'
    lgRadius = '1rem'
  } else if (extracted.radii.includes('rounded-sm') || extracted.radii.includes('rounded')) {
    defaultRadius = '0.25rem'
    lgRadius = '0.5rem'
  }

  return {
    colors: {
      primary: primaryHex,
      primaryHover: primaryHoverHex,
      secondary: secondaryHex,
      accent: accentHex,
      background: backgroundHex,
      foreground: foregroundHex,
      muted: mutedHex,
      border: borderHex,
    },
    fonts: {
      heading: headingFont,
      body: bodyFont,
      mono: 'JetBrains Mono',
    },
    spacing: {
      section: sectionSpacing,
      container: containerWidth,
      cardGap: cardGap,
    },
    radii: {
      default: defaultRadius,
      lg: lgRadius,
    },
  }
}

/**
 * Check if design tokens are already configured for a site
 */
export function hasCustomTokens(variables: {
  colors: { brand: { primary: string } }
}): boolean {
  // Check if primary color has been changed from default
  const defaultPrimary = '#6366f1' // Default purple
  return variables.colors.brand.primary !== defaultPrimary
}
