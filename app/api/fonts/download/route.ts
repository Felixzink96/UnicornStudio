import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { downloadAndStoreFonts, getStoredFonts, generateFontFaceCSS } from '@/lib/fonts/font-storage'
import { detectFontsFromHtml, getGoogleFonts } from '@/lib/fonts/font-detector'
import type { DetectedFont } from '@/lib/fonts/font-detector'

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { siteId, fonts, html } = body as {
      siteId: string
      fonts?: DetectedFont[]
      html?: string // Alternative: extract fonts from HTML
    }

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing siteId' },
        { status: 400 }
      )
    }

    // Verify user has access to this site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Get fonts to download
    let fontsToDownload: DetectedFont[]

    if (fonts && fonts.length > 0) {
      // Use provided fonts
      fontsToDownload = fonts
    } else if (html) {
      // Extract fonts from HTML
      const detected = detectFontsFromHtml(html)
      fontsToDownload = getGoogleFonts(detected)
    } else {
      return NextResponse.json(
        { error: 'Must provide either fonts array or html' },
        { status: 400 }
      )
    }

    // Filter to only Google Fonts
    const googleFonts = fontsToDownload.filter(f => f.source === 'google')

    if (googleFonts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Google Fonts to download',
        storedFonts: [],
        fontFaceCSS: '',
        totalSize: 0,
      })
    }

    // Download and store fonts
    const result = await downloadAndStoreFonts(siteId, googleFonts)

    return NextResponse.json({
      success: result.success,
      storedFonts: result.storedFonts,
      fontFaceCSS: result.fontFaceCSS,
      totalSize: result.totalSize,
      errors: result.errors,
      downloadedCount: result.storedFonts.length,
    })
  } catch (error) {
    console.error('Font download error:', error)
    return NextResponse.json(
      { error: 'Failed to download fonts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('siteId')

    if (!siteId) {
      return NextResponse.json(
        { error: 'Missing siteId parameter' },
        { status: 400 }
      )
    }

    // Get stored fonts for site
    const storedFonts = await getStoredFonts(siteId)
    const fontFaceCSS = generateFontFaceCSS(storedFonts)

    // Group by font family
    const fontFamilies = storedFonts.reduce((acc, font) => {
      if (!acc[font.fontFamily]) {
        acc[font.fontFamily] = {
          name: font.fontFamily,
          weights: [],
          styles: [],
          files: [],
        }
      }

      if (!acc[font.fontFamily].weights.includes(font.weight)) {
        acc[font.fontFamily].weights.push(font.weight)
      }

      if (!acc[font.fontFamily].styles.includes(font.style)) {
        acc[font.fontFamily].styles.push(font.style)
      }

      acc[font.fontFamily].files.push({
        filename: font.filename,
        weight: font.weight,
        style: font.style,
        publicUrl: font.publicUrl,
        sizeBytes: font.sizeBytes,
      })

      return acc
    }, {} as Record<string, {
      name: string
      weights: number[]
      styles: ('normal' | 'italic')[]
      files: Array<{
        filename: string
        weight: number
        style: 'normal' | 'italic'
        publicUrl: string
        sizeBytes: number
      }>
    }>)

    return NextResponse.json({
      success: true,
      fonts: Object.values(fontFamilies),
      fontFaceCSS,
      totalFonts: Object.keys(fontFamilies).length,
      totalFiles: storedFonts.length,
      totalSize: storedFonts.reduce((sum, f) => sum + f.sizeBytes, 0),
    })
  } catch (error) {
    console.error('Font list error:', error)
    return NextResponse.json(
      { error: 'Failed to list fonts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
