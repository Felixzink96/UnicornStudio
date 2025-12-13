// ============================================
// FONT DETECTOR
// Detects fonts used in HTML and extracts metadata
// ============================================

export interface DetectedFont {
  name: string
  weights: number[]
  styles: ('normal' | 'italic')[]
  source: 'google' | 'system' | 'custom'
  googleUrl?: string
}

// Common system fonts that don't need to be downloaded
const SYSTEM_FONTS = new Set([
  'system-ui',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Roboto',
  'Helvetica Neue',
  'Arial',
  'Noto Sans',
  'sans-serif',
  'serif',
  'monospace',
  'cursive',
  'fantasy',
  'Georgia',
  'Times New Roman',
  'Times',
  'Courier New',
  'Courier',
  'Verdana',
  'Geneva',
  'Tahoma',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Lucida Console',
  'Monaco',
])

// Common Google Fonts for validation
const POPULAR_GOOGLE_FONTS = new Set([
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Source Sans Pro', 'Oswald', 'Raleway', 'Merriweather', 'PT Sans',
  'Nunito', 'Ubuntu', 'Playfair Display', 'Rubik', 'Work Sans',
  'DM Sans', 'Mulish', 'Quicksand', 'Josefin Sans', 'Barlow',
  'Nunito Sans', 'Fira Sans', 'Manrope', 'Outfit', 'Space Grotesk',
  'Plus Jakarta Sans', 'Lexend', 'Sora', 'Albert Sans', 'Figtree',
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono',
  'Inconsolata', 'Roboto Mono', 'Ubuntu Mono',
])

/**
 * Parse Google Fonts URL to extract font details
 */
function parseGoogleFontsUrl(url: string): DetectedFont | null {
  try {
    // Handle both formats:
    // https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
    // https://fonts.googleapis.com/css?family=Inter:400,500,600,700

    const familyMatch = url.match(/family=([^&]+)/)
    if (!familyMatch) return null

    const familyPart = decodeURIComponent(familyMatch[1]).replace(/\+/g, ' ')

    // Handle multiple families separated by |
    const families = familyPart.split('|')
    const firstFamily = families[0]

    // Parse font name and weights
    let fontName: string
    const weights: number[] = []
    const styles: ('normal' | 'italic')[] = ['normal']

    if (firstFamily.includes(':')) {
      const [name, weightPart] = firstFamily.split(':')
      fontName = name

      // Parse weights from various formats
      // :wght@400;500;600;700
      // :400,500,600,700
      // :ital,wght@0,400;0,500;1,400;1,500

      if (weightPart.includes('wght@')) {
        const weightsStr = weightPart.split('wght@')[1]
        weightsStr.split(';').forEach(w => {
          if (w.includes(',')) {
            // Format: ital,wght@0,400;1,400
            const parts = w.split(',')
            const weight = parseInt(parts[parts.length - 1])
            const isItalic = parts[0] === '1'
            if (!isNaN(weight) && !weights.includes(weight)) {
              weights.push(weight)
            }
            if (isItalic && !styles.includes('italic')) {
              styles.push('italic')
            }
          } else {
            const weight = parseInt(w)
            if (!isNaN(weight) && !weights.includes(weight)) {
              weights.push(weight)
            }
          }
        })
      } else {
        // Old format: :400,500,600,700 or :400italic,700
        weightPart.split(',').forEach(w => {
          const weightMatch = w.match(/(\d+)/)
          if (weightMatch) {
            const weight = parseInt(weightMatch[1])
            if (!isNaN(weight) && !weights.includes(weight)) {
              weights.push(weight)
            }
          }
          if (w.includes('italic') && !styles.includes('italic')) {
            styles.push('italic')
          }
        })
      }
    } else {
      fontName = firstFamily
    }

    // Default weights if none specified
    if (weights.length === 0) {
      weights.push(400)
    }

    return {
      name: fontName,
      weights: weights.sort((a, b) => a - b),
      styles,
      source: 'google',
      googleUrl: url,
    }
  } catch {
    return null
  }
}

/**
 * Detect all fonts from HTML content
 */
export function detectFontsFromHtml(html: string): DetectedFont[] {
  const fonts = new Map<string, DetectedFont>()

  // 1. Extract from Google Fonts <link> tags
  const linkRegex = /<link[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/gi
  let match

  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1]
    const font = parseGoogleFontsUrl(url)
    if (font) {
      const existing = fonts.get(font.name)
      if (existing) {
        // Merge weights
        font.weights.forEach(w => {
          if (!existing.weights.includes(w)) {
            existing.weights.push(w)
            existing.weights.sort((a, b) => a - b)
          }
        })
        font.styles.forEach(s => {
          if (!existing.styles.includes(s)) {
            existing.styles.push(s)
          }
        })
      } else {
        fonts.set(font.name, font)
      }
    }
  }

  // 2. Extract from @import statements
  const importRegex = /@import\s+url\(['"]?([^'")\s]*fonts\.googleapis\.com[^'")\s]*)['"]?\)/gi
  while ((match = importRegex.exec(html)) !== null) {
    const url = match[1]
    const font = parseGoogleFontsUrl(url)
    if (font && !fonts.has(font.name)) {
      fonts.set(font.name, font)
    }
  }

  // 3. Extract from inline font-family styles
  const fontFamilyRegex = /font-family:\s*['"]?([^;'"]+)['"]?/gi
  while ((match = fontFamilyRegex.exec(html)) !== null) {
    const fontStack = match[1]
    const primaryFont = fontStack.split(',')[0].trim().replace(/['"]/g, '')

    if (!fonts.has(primaryFont) && !SYSTEM_FONTS.has(primaryFont)) {
      // Check if it's likely a Google Font
      const isGoogleFont = POPULAR_GOOGLE_FONTS.has(primaryFont)

      fonts.set(primaryFont, {
        name: primaryFont,
        weights: [400, 500, 600, 700], // Default weights
        styles: ['normal'],
        source: isGoogleFont ? 'google' : 'custom',
      })
    }
  }

  // 4. Check Tailwind font classes
  const tailwindFontRegex = /font-\[['"]?([^'"\]]+)['"]?\]/g
  while ((match = tailwindFontRegex.exec(html)) !== null) {
    const fontName = match[1].split(',')[0].trim().replace(/_/g, ' ')

    if (!fonts.has(fontName) && !SYSTEM_FONTS.has(fontName)) {
      const isGoogleFont = POPULAR_GOOGLE_FONTS.has(fontName)

      fonts.set(fontName, {
        name: fontName,
        weights: [400, 500, 600, 700],
        styles: ['normal'],
        source: isGoogleFont ? 'google' : 'custom',
      })
    }
  }

  return Array.from(fonts.values())
}

/**
 * Get only Google Fonts from detected fonts
 */
export function getGoogleFonts(fonts: DetectedFont[]): DetectedFont[] {
  return fonts.filter(f => f.source === 'google')
}

/**
 * Build a Google Fonts URL for multiple fonts
 */
export function buildGoogleFontsUrl(fonts: DetectedFont[]): string {
  const googleFonts = fonts.filter(f => f.source === 'google')

  if (googleFonts.length === 0) return ''

  const families = googleFonts.map(font => {
    const weightsStr = font.weights.join(';')
    const fontName = font.name.replace(/ /g, '+')

    if (font.styles.includes('italic')) {
      // Include italic variants
      const variants = font.weights.flatMap(w => [
        `0,${w}`,
        `1,${w}`,
      ]).join(';')
      return `family=${fontName}:ital,wght@${variants}`
    }

    return `family=${fontName}:wght@${weightsStr}`
  })

  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

/**
 * Get recommended weights for a font type
 */
export function getRecommendedWeights(type: 'heading' | 'body' | 'mono'): number[] {
  switch (type) {
    case 'heading':
      return [500, 600, 700, 800]
    case 'body':
      return [400, 500, 600]
    case 'mono':
      return [400, 500]
    default:
      return [400, 500, 600, 700]
  }
}

/**
 * Normalize font name for file naming
 */
export function normalizeFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

/**
 * Get CSS weight name from numeric weight
 */
export function getWeightName(weight: number): string {
  const weightNames: Record<number, string> = {
    100: 'thin',
    200: 'extralight',
    300: 'light',
    400: 'regular',
    500: 'medium',
    600: 'semibold',
    700: 'bold',
    800: 'extrabold',
    900: 'black',
  }
  return weightNames[weight] || `weight-${weight}`
}
