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
import { getStoredFonts, generateExportFontFaceCSS } from '@/lib/fonts/font-storage'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/export/fonts
 * Export font metadata and download URLs for GDPR-compliant local hosting
 *
 * Returns:
 * - List of all stored fonts for the site
 * - @font-face CSS with relative paths for local hosting
 * - Download URLs for each font file
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('[Fonts Export] Request received')

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

    // 3. Get stored fonts for this site
    const storedFonts = await getStoredFonts(siteId)
    console.log(`[Fonts Export] Found ${storedFonts.length} stored fonts for site ${siteId}`)

    // 4. Generate @font-face CSS with relative paths (for local hosting)
    const fontFaceCSS = generateExportFontFaceCSS(storedFonts, './fonts')

    // 5. Prepare font data for download
    const fonts = storedFonts.map(font => ({
      fontFamily: font.fontFamily,
      weight: font.weight,
      style: font.style,
      filename: font.filename,
      downloadUrl: font.publicUrl,
      sizeBytes: font.sizeBytes,
    }))

    // 6. Calculate unique font families
    const fontFamilies = [...new Set(fonts.map(f => f.fontFamily))]

    return successResponse({
      fonts,
      fontFamilies,
      fontFaceCSS,
      totalFonts: fonts.length,
      totalSize: fonts.reduce((sum, f) => sum + f.sizeBytes, 0),
      gdprCompliant: true,
      instructions: {
        de: 'Laden Sie die Font-Dateien herunter und speichern Sie sie im Ordner wp-content/uploads/unicorn-studio/fonts/',
        en: 'Download the font files and save them to wp-content/uploads/unicorn-studio/fonts/',
      },
    })
  } catch (error) {
    console.error('[Fonts Export] Error:', error)
    return serverErrorResponse('Failed to export fonts')
  }
}
