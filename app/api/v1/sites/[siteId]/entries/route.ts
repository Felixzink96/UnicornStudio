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
  serverErrorResponse,
  calculatePagination,
  parsePaginationParams,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

/**
 * GET /api/v1/sites/:siteId/entries
 * Get all entries for a site with pagination and filters
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
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

    // 3. Parse query params
    const { searchParams } = new URL(request.url)
    const { page, perPage } = parsePaginationParams(searchParams)
    const offset = (page - 1) * perPage

    // Filters
    const status = searchParams.get('status')
    const contentTypeId = searchParams.get('content_type_id')
    const contentTypeName = searchParams.get('content_type')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // 4. Build query
    const supabase = createAPIClient()

    let query = supabase
      .from('entries')
      .select(
        `
        *,
        content_type:content_types (
          id,
          name,
          label_singular,
          slug
        ),
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

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (contentTypeId) {
      query = query.eq('content_type_id', contentTypeId)
    }

    if (contentTypeName) {
      // Need to get content type ID first
      const { data: ct } = await supabase
        .from('content_types')
        .select('id')
        .eq('site_id', siteId)
        .eq('name', contentTypeName)
        .single()

      if (ct) {
        query = query.eq('content_type_id', ct.id)
      }
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
      console.error('Entries query error:', error)
      return serverErrorResponse('Failed to fetch entries', error.message)
    }

    // 5. Format response
    const formattedEntries = entries?.map((entry) => formatEntry(entry))

    return successResponse(
      formattedEntries,
      calculatePagination(count || 0, page, perPage)
    )
  } catch (error) {
    console.error('Entries API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * Format an entry for API response
 */
function formatEntry(entry: Record<string, unknown>) {
  const contentType = entry.content_type as Record<string, unknown> | null
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
    content_type: contentType
      ? {
          id: contentType.id,
          name: contentType.name,
          label: contentType.label_singular,
          slug: contentType.slug,
        }
      : null,
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
