// ============================================
// FONT STORAGE SERVICE
// Stores downloaded fonts in Supabase Storage
// ============================================

import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DetectedFont } from './font-detector'
import {
  getFontFiles,
  downloadFontFile,
  buildFontFaceCSSFromFiles,
  type GoogleFontFile,
} from './google-fonts-api'
import { normalizeFontName } from './font-detector'

export interface StoredFont {
  fontFamily: string
  weight: number
  style: 'normal' | 'italic'
  filename: string
  storagePath: string
  publicUrl: string
  sizeBytes: number
}

export interface FontStorageResult {
  success: boolean
  storedFonts: StoredFont[]
  fontFaceCSS: string
  totalSize: number
  errors: string[]
}

// Storage bucket name for fonts
const FONTS_BUCKET = 'site-fonts'

/**
 * Ensure the fonts storage bucket exists
 */
async function ensureFontsBucket(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Try to get bucket info - if it exists, we're good
    const { data: buckets } = await supabase.storage.listBuckets()

    const bucketExists = buckets?.some(b => b.name === FONTS_BUCKET)

    if (!bucketExists) {
      // Create the bucket (public for font serving)
      const { error } = await supabase.storage.createBucket(FONTS_BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB max per file
      })

      if (error) {
        // Bucket might already exist or we don't have permissions
        console.warn('Could not create fonts bucket:', error.message)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error checking fonts bucket:', error)
    return false
  }
}

/**
 * Upload a single font file to storage
 */
async function uploadFontFile(
  supabase: SupabaseClient,
  siteId: string,
  fontFile: GoogleFontFile,
  fileData: ArrayBuffer
): Promise<StoredFont | null> {
  const normalizedName = normalizeFontName(fontFile.fontFamily)
  const storagePath = `${siteId}/${normalizedName}/${fontFile.filename}`

  try {
    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from(FONTS_BUCKET)
      .upload(storagePath, fileData, {
        contentType: 'font/woff2',
        cacheControl: '31536000', // 1 year cache
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error(`Failed to upload font ${fontFile.filename}:`, uploadError)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(FONTS_BUCKET)
      .getPublicUrl(storagePath)

    return {
      fontFamily: fontFile.fontFamily,
      weight: fontFile.weight,
      style: fontFile.style,
      filename: fontFile.filename,
      storagePath,
      publicUrl,
      sizeBytes: fileData.byteLength,
    }
  } catch (error) {
    console.error(`Error uploading font ${fontFile.filename}:`, error)
    return null
  }
}

/**
 * Download and store fonts for a site
 */
export async function downloadAndStoreFonts(
  siteId: string,
  fonts: DetectedFont[]
): Promise<FontStorageResult> {
  const supabase = createClient()
  const storedFonts: StoredFont[] = []
  const errors: string[] = []
  let totalSize = 0

  // Filter to Google Fonts only
  const googleFonts = fonts.filter(f => f.source === 'google')

  if (googleFonts.length === 0) {
    return {
      success: true,
      storedFonts: [],
      fontFaceCSS: '',
      totalSize: 0,
      errors: [],
    }
  }

  // Ensure bucket exists
  await ensureFontsBucket(supabase)

  // Process each font
  for (const font of googleFonts) {
    try {
      // Get font file URLs from Google
      const fontFiles = await getFontFiles(font)

      if (fontFiles.length === 0) {
        errors.push(`Could not get font files for ${font.name}`)
        continue
      }

      // Download and upload each file
      for (const fontFile of fontFiles) {
        try {
          // Download from Google
          const fileData = await downloadFontFile(fontFile.woff2Url)

          // Upload to Supabase
          const stored = await uploadFontFile(supabase, siteId, fontFile, fileData)

          if (stored) {
            storedFonts.push(stored)
            totalSize += stored.sizeBytes
          } else {
            errors.push(`Failed to store ${fontFile.filename}`)
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`Error processing ${fontFile.filename}: ${message}`)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Error processing font ${font.name}: ${message}`)
    }
  }

  // Generate @font-face CSS with public URLs
  const fontFaceCSS = generateFontFaceCSS(storedFonts)

  return {
    success: errors.length === 0,
    storedFonts,
    fontFaceCSS,
    totalSize,
    errors,
  }
}

/**
 * Generate @font-face CSS from stored fonts
 */
export function generateFontFaceCSS(storedFonts: StoredFont[]): string {
  if (storedFonts.length === 0) return ''

  return storedFonts.map(font => `
@font-face {
  font-family: '${font.fontFamily}';
  font-style: ${font.style};
  font-weight: ${font.weight};
  font-display: swap;
  src: url('${font.publicUrl}') format('woff2');
}
`).join('\n')
}

/**
 * Generate @font-face CSS with relative paths (for export)
 */
export function generateExportFontFaceCSS(
  storedFonts: StoredFont[],
  basePath: string = './fonts'
): string {
  if (storedFonts.length === 0) return ''

  return storedFonts.map(font => `
@font-face {
  font-family: '${font.fontFamily}';
  font-style: ${font.style};
  font-weight: ${font.weight};
  font-display: swap;
  src: url('${basePath}/${font.filename}') format('woff2');
}
`).join('\n')
}

/**
 * Get stored fonts for a site
 */
export async function getStoredFonts(siteId: string): Promise<StoredFont[]> {
  const supabase = createClient()
  const storedFonts: StoredFont[] = []

  try {
    // List all files in the site's font directory
    const { data: folders, error: listError } = await supabase.storage
      .from(FONTS_BUCKET)
      .list(siteId)

    if (listError || !folders) {
      return []
    }

    // For each font folder, list the files
    for (const folder of folders) {
      if (folder.name === '.emptyFolderPlaceholder') continue

      const { data: files, error: filesError } = await supabase.storage
        .from(FONTS_BUCKET)
        .list(`${siteId}/${folder.name}`)

      if (filesError || !files) continue

      for (const file of files) {
        if (!file.name.endsWith('.woff2')) continue

        const storagePath = `${siteId}/${folder.name}/${file.name}`
        const { data: { publicUrl } } = supabase.storage
          .from(FONTS_BUCKET)
          .getPublicUrl(storagePath)

        // Parse filename to get metadata
        // Format: fontname-weight[-italic].woff2
        const match = file.name.match(/^(.+)-(\w+)(-italic)?\.woff2$/)
        if (!match) continue

        const weightName = match[2]
        const isItalic = !!match[3]

        // Convert weight name to number
        const weightMap: Record<string, number> = {
          thin: 100,
          extralight: 200,
          light: 300,
          regular: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
          extrabold: 800,
          black: 900,
        }

        const weight = weightMap[weightName] || 400

        // Get font family name from folder name
        const fontFamily = folder.name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        storedFonts.push({
          fontFamily,
          weight,
          style: isItalic ? 'italic' : 'normal',
          filename: file.name,
          storagePath,
          publicUrl,
          sizeBytes: file.metadata?.size || 0,
        })
      }
    }

    return storedFonts
  } catch (error) {
    console.error('Error getting stored fonts:', error)
    return []
  }
}

/**
 * Delete all stored fonts for a site
 */
export async function deleteStoredFonts(siteId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    // List all files in the site's font directory
    const { data: folders, error: listError } = await supabase.storage
      .from(FONTS_BUCKET)
      .list(siteId)

    if (listError || !folders) {
      return false
    }

    // Collect all file paths
    const filePaths: string[] = []

    for (const folder of folders) {
      if (folder.name === '.emptyFolderPlaceholder') continue

      const { data: files } = await supabase.storage
        .from(FONTS_BUCKET)
        .list(`${siteId}/${folder.name}`)

      if (files) {
        files.forEach(file => {
          filePaths.push(`${siteId}/${folder.name}/${file.name}`)
        })
      }
    }

    // Delete all files
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from(FONTS_BUCKET)
        .remove(filePaths)

      if (deleteError) {
        console.error('Error deleting fonts:', deleteError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error deleting stored fonts:', error)
    return false
  }
}

/**
 * Get font CSS for a site (combines stored fonts)
 */
export async function getFontCSSForSite(siteId: string): Promise<string> {
  const storedFonts = await getStoredFonts(siteId)
  return generateFontFaceCSS(storedFonts)
}

/**
 * Check if fonts are already stored for a site
 */
export async function hasFontsStored(siteId: string): Promise<boolean> {
  const fonts = await getStoredFonts(siteId)
  return fonts.length > 0
}
