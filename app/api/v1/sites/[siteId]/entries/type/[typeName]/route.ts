import { NextRequest } from 'next/server'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  serverErrorResponse,
  calculatePagination,
  parsePaginationParams,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string; typeName: string }>
}

/**
 * GET /api/v1/sites/:siteId/entries/type/:typeName
 * Get all entries of a specific content type
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, typeName } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Get content type
    const supabase = createAPIClient()

    const { data: contentType, error: ctError } = await supabase
      .from('content_types')
      .select('id, name, label_singular, slug, default_sort_field, default_sort_order')
      .eq('site_id', siteId)
      .eq('name', typeName)
      .single()

    if (ctError || !contentType) {
      return notFoundResponse(`Content Type '${typeName}'`)
    }

    // 4. Parse query params
    const { searchParams } = new URL(request.url)
    const { page, perPage } = parsePaginationParams(searchParams)
    const offset = (page - 1) * perPage

    // Filters
    const status = searchParams.get('status') || 'published' // Default to published
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || contentType.default_sort_field || 'created_at'
    const sortOrder = searchParams.get('sort_order') || contentType.default_sort_order || 'desc'

    // 5. Build query
    let query = supabase
      .from('entries')
      .select(
        `
        *,
        author:profiles (
          id,
          full_name,
          email,
          avatar_url
        ),
        featured_image:assets (
          id,
          name,
          file_url,
          alt_text
        ),
        entry_terms (
          term_id,
          term:terms (
            id,
            name,
            slug,
            taxonomy:taxonomies (
              id,
              name,
              slug
            )
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('site_id', siteId)
      .eq('content_type_id', contentType.id)

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    const { data: entries, error, count } = await query.range(offset, offset + perPage - 1)

    if (error) {
      console.error('Entries by type query error:', error)
      return serverErrorResponse('Failed to fetch entries', error.message)
    }

    // 6. Format response
    const formattedEntries = entries?.map((entry) => formatEntry(entry))

    return successResponse(
      {
        content_type: {
          id: contentType.id,
          name: contentType.name,
          label: contentType.label_singular,
          slug: contentType.slug,
        },
        entries: formattedEntries,
      },
      calculatePagination(count || 0, page, perPage)
    )
  } catch (error) {
    console.error('Entries by type API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * Format an entry for API response
 */
function formatEntry(entry: Record<string, unknown>) {
  const author = entry.author as Record<string, unknown> | null
  const featuredImage = entry.featured_image as Record<string, unknown> | null
  const entryTerms = entry.entry_terms as Array<{
    term_id: string
    term: {
      id: string
      name: string
      slug: string
      taxonomy: { id: string; name: string; slug: string } | null
    } | null
  }> | null

  // Group terms by taxonomy
  const taxonomies: Record<string, Array<{ id: string; name: string; slug: string }>> = {}
  entryTerms?.forEach((et) => {
    if (et.term && et.term.taxonomy) {
      const taxSlug = et.term.taxonomy.slug
      if (!taxonomies[taxSlug]) {
        taxonomies[taxSlug] = []
      }
      taxonomies[taxSlug].push({
        id: et.term.id,
        name: et.term.name,
        slug: et.term.slug,
      })
    }
  })

  return {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    content: entry.content,
    excerpt: entry.excerpt,
    data: entry.data,
    status: entry.status,
    published_at: entry.published_at,
    scheduled_at: entry.scheduled_at,
    seo: entry.seo,
    author: author
      ? {
          id: author.id,
          name: author.full_name,
          email: author.email,
          avatar_url: author.avatar_url,
        }
      : null,
    featured_image: featuredImage
      ? {
          id: featuredImage.id,
          name: featuredImage.name,
          url: featuredImage.file_url,
          alt: featuredImage.alt_text,
        }
      : null,
    taxonomies,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  }
}
