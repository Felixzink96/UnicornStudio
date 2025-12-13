// ============================================
// GOOGLE FONTS API CLIENT
// Downloads fonts from Google Fonts for local hosting
// ============================================

import type { DetectedFont } from './font-detector'
import { normalizeFontName, getWeightName } from './font-detector'

export interface GoogleFontFile {
  fontFamily: string
  weight: number
  style: 'normal' | 'italic'
  woff2Url: string
  filename: string
}

export interface FontFaceDeclaration {
  fontFamily: string
  weight: number
  style: 'normal' | 'italic'
  localPath: string
  filename: string
}

/**
 * User agent that triggers WOFF2 response from Google Fonts
 * Using a modern browser UA ensures we get WOFF2 format
 */
const WOFF2_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Build Google Fonts CSS API URL
 */
function buildGoogleFontsCssUrl(fontName: string, weights: number[], styles: ('normal' | 'italic')[]): string {
  const encodedName = fontName.replace(/ /g, '+')

  if (styles.includes('italic') && styles.includes('normal')) {
    // Both normal and italic
    const variants = weights.flatMap(w => [
      `0,${w}`,  // normal
      `1,${w}`,  // italic
    ]).join(';')
    return `https://fonts.googleapis.com/css2?family=${encodedName}:ital,wght@${variants}&display=swap`
  } else if (styles.includes('italic')) {
    // Only italic
    const variants = weights.map(w => `1,${w}`).join(';')
    return `https://fonts.googleapis.com/css2?family=${encodedName}:ital,wght@${variants}&display=swap`
  } else {
    // Only normal
    const weightsStr = weights.join(';')
    return `https://fonts.googleapis.com/css2?family=${encodedName}:wght@${weightsStr}&display=swap`
  }
}

/**
 * Parse CSS response from Google Fonts to extract WOFF2 URLs
 */
function parseFontCss(css: string, fontFamily: string): GoogleFontFile[] {
  const files: GoogleFontFile[] = []

  // Match @font-face blocks
  const fontFaceRegex = /@font-face\s*\{([^}]+)\}/g
  let match

  while ((match = fontFaceRegex.exec(css)) !== null) {
    const block = match[1]

    // Extract font-weight
    const weightMatch = block.match(/font-weight:\s*(\d+)/)
    const weight = weightMatch ? parseInt(weightMatch[1]) : 400

    // Extract font-style
    const styleMatch = block.match(/font-style:\s*(\w+)/)
    const style: 'normal' | 'italic' = styleMatch && styleMatch[1] === 'italic' ? 'italic' : 'normal'

    // Extract WOFF2 URL
    const urlMatch = block.match(/url\(([^)]+\.woff2[^)]*)\)/)
    if (urlMatch) {
      let url = urlMatch[1].replace(/['"]/g, '')

      // Ensure URL is complete
      if (!url.startsWith('http')) {
        url = 'https:' + url
      }

      const normalizedName = normalizeFontName(fontFamily)
      const weightName = getWeightName(weight)
      const styleSuffix = style === 'italic' ? '-italic' : ''
      const filename = `${normalizedName}-${weightName}${styleSuffix}.woff2`

      files.push({
        fontFamily,
        weight,
        style,
        woff2Url: url,
        filename,
      })
    }
  }

  return files
}

/**
 * Fetch font files information from Google Fonts API
 */
export async function getFontFiles(font: DetectedFont): Promise<GoogleFontFile[]> {
  if (font.source !== 'google') {
    return []
  }

  const cssUrl = buildGoogleFontsCssUrl(font.name, font.weights, font.styles)

  try {
    const response = await fetch(cssUrl, {
      headers: {
        'User-Agent': WOFF2_USER_AGENT,
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch font CSS: ${response.status} ${response.statusText}`)
      return []
    }

    const css = await response.text()
    return parseFontCss(css, font.name)
  } catch (error) {
    console.error(`Error fetching font ${font.name}:`, error)
    return []
  }
}

/**
 * Fetch font files for multiple fonts
 */
export async function getMultipleFontFiles(fonts: DetectedFont[]): Promise<Map<string, GoogleFontFile[]>> {
  const results = new Map<string, GoogleFontFile[]>()

  // Process fonts in parallel with a limit
  const BATCH_SIZE = 3
  const googleFonts = fonts.filter(f => f.source === 'google')

  for (let i = 0; i < googleFonts.length; i += BATCH_SIZE) {
    const batch = googleFonts.slice(i, i + BATCH_SIZE)
    const promises = batch.map(async font => {
      const files = await getFontFiles(font)
      return { name: font.name, files }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ name, files }) => {
      if (files.length > 0) {
        results.set(name, files)
      }
    })
  }

  return results
}

/**
 * Download a single font file
 */
export async function downloadFontFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download font: ${response.status} ${response.statusText}`)
  }

  return response.arrayBuffer()
}

/**
 * Build @font-face CSS for locally hosted fonts
 */
export function buildFontFaceCSS(declarations: FontFaceDeclaration[]): string {
  return declarations.map(decl => `
@font-face {
  font-family: '${decl.fontFamily}';
  font-style: ${decl.style};
  font-weight: ${decl.weight};
  font-display: swap;
  src: url('${decl.localPath}/${decl.filename}') format('woff2');
}
`).join('\n')
}

/**
 * Build @font-face CSS from GoogleFontFile array with custom base path
 */
export function buildFontFaceCSSFromFiles(files: GoogleFontFile[], basePath: string = './fonts'): string {
  const declarations: FontFaceDeclaration[] = files.map(file => ({
    fontFamily: file.fontFamily,
    weight: file.weight,
    style: file.style,
    localPath: basePath,
    filename: file.filename,
  }))

  return buildFontFaceCSS(declarations)
}

/**
 * Get total download size estimate for fonts
 */
export function estimateDownloadSize(fonts: DetectedFont[]): number {
  // Average WOFF2 file size per weight: ~25KB
  const AVG_SIZE_PER_WEIGHT = 25 * 1024

  let totalWeights = 0
  fonts.forEach(font => {
    if (font.source === 'google') {
      totalWeights += font.weights.length
      // Italic doubles the files
      if (font.styles.includes('italic')) {
        totalWeights += font.weights.length
      }
    }
  })

  return totalWeights * AVG_SIZE_PER_WEIGHT
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get preview URL for a font (for font picker)
 */
export function getFontPreviewUrl(fontName: string, text: string = 'Aa'): string {
  const encodedName = fontName.replace(/ /g, '+')
  const encodedText = encodeURIComponent(text)
  return `https://fonts.googleapis.com/css2?family=${encodedName}&text=${encodedText}&display=swap`
}

/**
 * Check if a font is available on Google Fonts
 */
export async function validateGoogleFont(fontName: string): Promise<boolean> {
  try {
    const encodedName = fontName.replace(/ /g, '+')
    const url = `https://fonts.googleapis.com/css2?family=${encodedName}:wght@400&display=swap`

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': WOFF2_USER_AGENT,
      },
    })

    return response.ok
  } catch {
    return false
  }
}
