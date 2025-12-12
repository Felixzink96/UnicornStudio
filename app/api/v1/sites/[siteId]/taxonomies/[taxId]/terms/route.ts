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
  params: Promise<{ siteId: string; taxId: string }>
}

/**
 * GET /api/v1/sites/:siteId/taxonomies/:taxId/terms
 * Get all terms for a taxonomy
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId, taxId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Verify taxonomy belongs to site
    const supabase = createAPIClient()

    const { data: taxonomy, error: taxError } = await supabase
      .from('taxonomies')
      .select('*')
      .eq('id', taxId)
      .eq('site_id', siteId)
      .single()

    if (taxError || !taxonomy) {
      return notFoundResponse('Taxonomy')
    }

    // 4. Query terms with entry counts
    const { data: terms, error } = await supabase
      .from('terms')
      .select(`
        *,
        image:assets (
          id,
          name,
          file_url,
          alt_text
        ),
        entry_terms (count)
      `)
      .eq('taxonomy_id', taxId)
      .order('position')

    if (error) {
      console.error('Terms query error:', error)
      return serverErrorResponse('Failed to fetch terms', error.message)
    }

    // 5. Build hierarchical structure if taxonomy is hierarchical
    const formattedTerms = terms?.map((term) => ({
      id: term.id,
      name: term.name,
      slug: term.slug,
      description: term.description,
      parent_id: term.parent_id,
      position: term.position,
      data: term.data,
      image: term.image
        ? {
            id: (term.image as Record<string, unknown>).id,
            name: (term.image as Record<string, unknown>).name,
            url: (term.image as Record<string, unknown>).file_url,
            alt: (term.image as Record<string, unknown>).alt_text,
          }
        : null,
      entries_count: (term.entry_terms as unknown as { count: number }[])?.length || 0,
      created_at: term.created_at,
      updated_at: term.updated_at,
    }))

    // 6. If hierarchical, build tree structure
    let result: unknown = formattedTerms

    if (taxonomy.hierarchical && formattedTerms) {
      result = buildTree(formattedTerms)
    }

    return successResponse({
      taxonomy: {
        id: taxonomy.id,
        name: taxonomy.name,
        label_singular: taxonomy.label_singular,
        label_plural: taxonomy.label_plural,
        slug: taxonomy.slug,
        hierarchical: taxonomy.hierarchical,
      },
      terms: result,
    })
  } catch (error) {
    console.error('Terms API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

interface Term {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  position: number | null
  data: unknown
  image: { id: unknown; name: unknown; url: unknown; alt: unknown } | null
  entries_count: number
  created_at: string | null
  updated_at: string | null
}

interface TreeTerm extends Term {
  children: TreeTerm[]
}

/**
 * Build a tree structure from flat terms array
 */
function buildTree(terms: Term[]): TreeTerm[] {
  const map = new Map<string, TreeTerm>()
  const roots: TreeTerm[] = []

  // Create map with children arrays
  terms.forEach((term) => {
    map.set(term.id, { ...term, children: [] })
  })

  // Build tree
  terms.forEach((term) => {
    const node = map.get(term.id)!
    if (term.parent_id && map.has(term.parent_id)) {
      map.get(term.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Sort children by position
  const sortChildren = (nodes: TreeTerm[]) => {
    nodes.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    nodes.forEach((node) => sortChildren(node.children))
  }

  sortChildren(roots)

  return roots
}
