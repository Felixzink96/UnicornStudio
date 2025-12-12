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
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string; entryId: string }>
}

/**
 * GET /api/v1/sites/:siteId/entries/:entryId
 * Get a single entry with all details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, entryId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Fetch entry with all relations
    const supabase = createAPIClient()

    const { data: entry, error } = await supabase
      .from('entries')
      .select(
        `
        *,
        content_type:content_types (
          id,
          name,
          label_singular,
          label_plural,
          slug,
          fields (*)
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
          file_path,
          alt_text,
          width,
          height,
          mime_type
        ),
        entry_terms (
          term_id,
          term:terms (
            id,
            name,
            slug,
            description,
            taxonomy:taxonomies (
              id,
              name,
              slug,
              label_singular,
              label_plural
            )
          )
        )
      `
      )
      .eq('id', entryId)
      .eq('site_id', siteId)
      .single()

    if (error || !entry) {
      return notFoundResponse('Entry')
    }

    // 4. Format response
    const contentType = entry.content_type as Record<string, unknown> | null
    const author = entry.author as Record<string, unknown> | null
    const featuredImage = entry.featured_image as Record<string, unknown> | null
    const entryTerms = entry.entry_terms as Array<{
      term_id: string
      term: {
        id: string
        name: string
        slug: string
        description: string | null
        taxonomy: {
          id: string
          name: string
          slug: string
          label_singular: string
          label_plural: string
        } | null
      } | null
    }> | null

    // Group terms by taxonomy
    const taxonomies: Record<
      string,
      {
        taxonomy: { id: string; name: string; slug: string; label: string }
        terms: Array<{ id: string; name: string; slug: string; description: string | null }>
      }
    > = {}

    entryTerms?.forEach((et) => {
      if (et.term && et.term.taxonomy) {
        const taxSlug = et.term.taxonomy.slug
        if (!taxonomies[taxSlug]) {
          taxonomies[taxSlug] = {
            taxonomy: {
              id: et.term.taxonomy.id,
              name: et.term.taxonomy.name,
              slug: et.term.taxonomy.slug,
              label: et.term.taxonomy.label_singular,
            },
            terms: [],
          }
        }
        taxonomies[taxSlug].terms.push({
          id: et.term.id,
          name: et.term.name,
          slug: et.term.slug,
          description: et.term.description,
        })
      }
    })

    // Build field definitions with values
    const fields = contentType?.fields as Array<{
      name: string
      label: string
      type: string
      settings: Record<string, unknown>
      sub_fields: unknown
      position: number
    }> | null

    const fieldDefinitions = fields
      ?.sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        settings: field.settings,
        sub_fields: field.sub_fields,
        value: (entry.data as Record<string, unknown>)?.[field.name] ?? null,
      }))

    const formattedEntry = {
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
            id: contentType.id as string,
            name: contentType.name as string,
            label_singular: contentType.label_singular as string,
            label_plural: contentType.label_plural as string,
            slug: contentType.slug as string,
          }
        : null,
      fields: fieldDefinitions,
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
            path: featuredImage.file_path,
            alt: featuredImage.alt_text,
            width: featuredImage.width,
            height: featuredImage.height,
            mime_type: featuredImage.mime_type,
          }
        : null,
      taxonomies,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    }

    return successResponse(formattedEntry)
  } catch (error) {
    console.error('Entry detail API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
