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
    const { data: designVars, error: designError } = await supabase
      .from('design_variables')
      .select('fonts')
      .eq('site_id', siteId)
      .single()

    if (designError) {
      console.error('[Fonts Sync] Error fetching design variables:', designError)
      return serverErrorResponse('Failed to fetch design variables')
    }

    const fonts = designVars?.fonts as Record<string, { family?: string; name?: string; stack?: string }> | null

    if (!fonts || Object.keys(fonts).length === 0) {
      console.log('[Fonts Sync] No fonts configured in design variables')
      return successResponse({
        success: true,
        message: 'No fonts configured',
        storedFonts: [],
        totalFonts: 0,
      })
    }

    // 4. Convert design variable fonts to DetectedFont format
    const detectedFonts: DetectedFont[] = []

    for (const [key, value] of Object.entries(fonts)) {
      const fontName = value?.family || value?.name || ''
      if (!fontName) continue

      // Clean the font name (remove quotes, extract first font from stack)
      const cleanName = fontName.split(',')[0].trim().replace(/['"]/g, '')

      // Skip system fonts
      if (cleanName.match(/^(system-ui|sans-serif|serif|monospace|cursive|fantasy|ui-sans-serif|ui-serif|ui-monospace)$/i)) {
        continue
      }

      // Check if already in list
      if (detectedFonts.some(f => f.name === cleanName)) {
        continue
      }

      detectedFonts.push({
        name: cleanName,
        variants: ['400', '500', '600', '700'], // Common weights
        source: 'google',
        confidence: 100,
      })
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
