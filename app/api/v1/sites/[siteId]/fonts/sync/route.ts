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
  successResponse,
} from '@/lib/api/responses'
import { downloadAndStoreFonts, getStoredFonts, generateExportFontFaceCSS } from '@/lib/fonts/font-storage'
import type { DetectedFont } from '@/lib/fonts/font-detector'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * POST /api/v1/sites/:siteId/fonts/sync
 * Download and store fonts from design variables
 * This fetches fonts from Google Fonts and stores them in Supabase Storage
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('[Fonts Sync] Request received')

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

    // 3. Get design variables to find which fonts to download
    const supabase = createAPIClient()
    const detectedFonts: DetectedFont[] = []

    // Try design_variables first
    const { data: designVars, error: designError } = await supabase
      .from('design_variables')
      .select('typography')
      .eq('site_id', siteId)
      .single()

    if (designError && designError.code !== 'PGRST116') {
      console.error('[Fonts Sync] Error fetching design variables:', designError)
    }

    const typography = designVars?.typography as {
      fontHeading?: string
      fontBody?: string
      fontMono?: string
    } | null

    console.log('[Fonts Sync] Typography from design_variables:', typography)

    // Extract fonts from typography
    if (typography) {
      const fontStrings = [
        typography.fontHeading,
        typography.fontBody,
        typography.fontMono,
      ].filter(Boolean) as string[]

      for (const fontStack of fontStrings) {
        const cleanName = fontStack.split(',')[0].trim().replace(/['"]/g, '')
        if (cleanName.match(/^(system-ui|sans-serif|serif|monospace|cursive|fantasy|ui-sans-serif|ui-serif|ui-monospace)$/i)) {
          continue
        }
        if (!detectedFonts.some(f => f.name === cleanName)) {
          detectedFonts.push({
            name: cleanName,
            weights: [400, 500, 600, 700],
            styles: ['normal'],
            source: 'google',
          })
        }
      }
    }

    // Fallback: Extract fonts from published pages HTML
    if (detectedFonts.length === 0) {
      console.log('[Fonts Sync] No fonts in design_variables, checking pages...')

      const { data: pages } = await supabase
        .from('pages')
        .select('html')
        .eq('site_id', siteId)
        .eq('is_published', true)
        .limit(10)

      if (pages && pages.length > 0) {
        for (const page of pages) {
          if (!page.html) continue

          // Extract Google Fonts URLs from HTML
          const googleFontMatches = page.html.match(/fonts\.googleapis\.com\/css2\?family=([^"'&]+)/g)
          if (googleFontMatches) {
            for (const match of googleFontMatches) {
              const familyMatch = match.match(/family=([^:&]+)/)
              if (familyMatch) {
                const fontName = decodeURIComponent(familyMatch[1].replace(/\+/g, ' '))
                if (!detectedFonts.some(f => f.name === fontName)) {
                  detectedFonts.push({
                    name: fontName,
                    weights: [400, 500, 600, 700],
                    styles: ['normal'],
                    source: 'google',
                  })
                }
              }
            }
          }

          // Extract from font-family CSS
          const fontFamilyMatches = page.html.match(/font-family:\s*['"]?([^;'"]+)/gi)
          if (fontFamilyMatches) {
            for (const match of fontFamilyMatches) {
              const fontName = match.replace(/font-family:\s*/i, '').split(',')[0].trim().replace(/['"]/g, '')
              if (fontName.match(/^(system-ui|sans-serif|serif|monospace|cursive|fantasy|ui-|inherit|initial)$/i)) {
                continue
              }
              if (!detectedFonts.some(f => f.name === fontName)) {
                detectedFonts.push({
                  name: fontName,
                  weights: [400, 500, 600, 700],
                  styles: ['normal'],
                  source: 'google',
                })
              }
            }
          }
        }
      }
    }

    console.log(`[Fonts Sync] Found ${detectedFonts.length} fonts to download:`, detectedFonts.map(f => f.name))

    if (detectedFonts.length === 0) {
      return successResponse({
        success: true,
        message: 'No Google Fonts to download',
        storedFonts: [],
        totalFonts: 0,
      })
    }

    // 5. Download and store fonts
    const result = await downloadAndStoreFonts(siteId, detectedFonts)

    console.log(`[Fonts Sync] Downloaded ${result.storedFonts.length} font files, ${result.errors.length} errors`)

    // 6. Get updated stored fonts
    const storedFonts = await getStoredFonts(siteId)
    const fontFaceCSS = generateExportFontFaceCSS(storedFonts, './fonts')

    return successResponse({
      success: result.success,
      fonts: storedFonts.map(f => ({
        fontFamily: f.fontFamily,
        weight: f.weight,
        style: f.style,
        filename: f.filename,
        downloadUrl: f.publicUrl,
        sizeBytes: f.sizeBytes,
      })),
      fontFamilies: [...new Set(storedFonts.map(f => f.fontFamily))],
      fontFaceCSS,
      totalFonts: storedFonts.length,
      totalSize: storedFonts.reduce((sum, f) => sum + f.sizeBytes, 0),
      errors: result.errors,
    })
  } catch (error) {
    console.error('[Fonts Sync] Error:', error)
    return serverErrorResponse('Failed to sync fonts')
  }
}

/**
 * GET /api/v1/sites/:siteId/fonts/sync
 * Get currently stored fonts
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    const storedFonts = await getStoredFonts(siteId)
    const fontFaceCSS = generateExportFontFaceCSS(storedFonts, './fonts')

    return successResponse({
      fonts: storedFonts.map(f => ({
        fontFamily: f.fontFamily,
        weight: f.weight,
        style: f.style,
        filename: f.filename,
        downloadUrl: f.publicUrl,
        sizeBytes: f.sizeBytes,
      })),
      fontFamilies: [...new Set(storedFonts.map(f => f.fontFamily))],
      fontFaceCSS,
      totalFonts: storedFonts.length,
      totalSize: storedFonts.reduce((sum, f) => sum + f.sizeBytes, 0),
    })
  } catch (error) {
    console.error('[Fonts Sync GET] Error:', error)
    return serverErrorResponse('Failed to get fonts')
  }
}
