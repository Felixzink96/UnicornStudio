import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveEntriesInTemplate, hasEntriesPlaceholders } from '@/lib/templates/entries-resolver'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * POST /api/v1/sites/:siteId/preview/resolve-entries
 * Resolves {{#entries:...}} placeholders in HTML for editor preview
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId } = await params
    const { html } = await request.json()

    if (!html) {
      return NextResponse.json({ html: '' })
    }

    // Check if HTML has entries placeholders
    if (!hasEntriesPlaceholders(html)) {
      return NextResponse.json({ html, resolved: false })
    }

    // Resolve entries
    const { html: resolvedHtml, entriesUsed } = await resolveEntriesInTemplate(html, siteId)

    console.log('[ResolveEntries API] Entries used:', entriesUsed)
    console.log('[ResolveEntries API] HTML changed:', html !== resolvedHtml)
    console.log('[ResolveEntries API] Resolved HTML preview:', resolvedHtml.slice(0, 500))

    return NextResponse.json({
      html: resolvedHtml,
      resolved: true,
      entriesUsed,
    })
  } catch (error) {
    console.error('Preview resolve entries error:', error)
    return NextResponse.json(
      { error: 'Failed to resolve entries', html: '' },
      { status: 500 }
    )
  }
}
