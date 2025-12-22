import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/public/entries
 * Public endpoint to fetch published entries (no auth required)
 *
 * Query params:
 * - content_type: Filter by content type name/slug
 * - limit: Number of entries (default: 10, max: 50)
 * - offset: Pagination offset
 * - sort_by: Field to sort by (default: published_at)
 * - sort_order: asc or desc (default: desc)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId } = await params
    const { searchParams } = new URL(request.url)

    // Parse params
    const contentType = searchParams.get('content_type')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sort_by') || 'published_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Create Supabase client (service role for public access)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Verify site exists
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id')
      .eq('id', siteId)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      )
    }

    // Build query - only published entries
    let query = supabase
      .from('entries')
      .select(`
        id,
        title,
        slug,
        excerpt,
        data,
        published_at,
        content_type:content_types (
          id,
          name,
          slug,
          label_singular
        ),
        featured_image:assets!featured_image_id (
          id,
          file_url,
          alt_text
        )
      `, { count: 'exact' })
      .eq('site_id', siteId)
      .eq('status', 'published')

    // Filter by content type
    if (contentType) {
      const { data: ct } = await supabase
        .from('content_types')
        .select('id')
        .eq('site_id', siteId)
        .or(`name.eq.${contentType},slug.eq.${contentType}`)
        .single()

      if (ct) {
        query = query.eq('content_type_id', ct.id)
      } else {
        // Content type not found, return empty
        return NextResponse.json({
          entries: [],
          total: 0,
          limit,
          offset
        })
      }
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'

    // Handle sorting by data fields (ACF-like fields)
    if (sortBy.startsWith('data.')) {
      const dataField = sortBy.replace('data.', '')
      query = query.order(`data->${dataField}`, { ascending })
    } else {
      query = query.order(sortBy, { ascending })
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: entries, error, count } = await query

    if (error) {
      console.error('Public entries query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch entries' },
        { status: 500 }
      )
    }

    // Format entries for public consumption
    const formattedEntries = entries?.map(entry => {
      const contentTypeData = entry.content_type as { slug?: string } | null

      return {
        id: entry.id,
        title: entry.title,
        slug: entry.slug,
        excerpt: entry.excerpt,
        data: entry.data,
        published_at: entry.published_at,
        url: contentTypeData?.slug
          ? `/${contentTypeData.slug}/${entry.slug}`
          : `/${entry.slug}`,
        featured_image: entry.featured_image
          ? {
              url: (entry.featured_image as { file_url?: string }).file_url,
              alt: (entry.featured_image as { alt_text?: string }).alt_text || entry.title
            }
          : null,
        content_type: contentTypeData
      }
    }) || []

    // CORS headers for frontend access
    return NextResponse.json(
      {
        entries: formattedEntries,
        total: count || 0,
        limit,
        offset
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
        }
      }
    )
  } catch (error) {
    console.error('Public entries API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
