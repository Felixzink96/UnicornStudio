import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, FileText, Search } from 'lucide-react'
import { EntriesList } from '@/components/content/EntriesList'
import type { ContentType, Entry, Taxonomy } from '@/types/cms'

interface ContentTypeEntriesPageProps {
  params: Promise<{ siteId: string; contentType: string }>
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}

export default async function ContentTypeEntriesPage({
  params,
  searchParams,
}: ContentTypeEntriesPageProps) {
  const { siteId, contentType: contentTypeSlug } = await params
  const { status, search, page } = await searchParams

  const supabase = await createClient()

  // Get site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Get content type by slug
  const { data: contentTypeData, error: ctError } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .eq('slug', contentTypeSlug)
    .single()

  if (ctError || !contentTypeData) {
    notFound()
  }

  const contentType = contentTypeData as ContentType

  // Build query
  let query = supabase
    .from('entries')
    .select(`
      *,
      author:profiles(id, full_name, avatar_url),
      featured_image:assets(id, file_url, alt_text)
    `, { count: 'exact' })
    .eq('content_type_id', contentType.id)

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  // Search
  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  // Sorting
  query = query.order(
    contentType.default_sort_field || 'created_at',
    { ascending: contentType.default_sort_order === 'asc' }
  )

  // Pagination
  const pageNum = parseInt(page || '1', 10)
  const pageSize = 20
  const offset = (pageNum - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  const { data: entriesData, count } = await query
  const entries = (entriesData || []) as Entry[]
  const totalPages = Math.ceil((count || 0) / pageSize)

  // Get taxonomies for this content type
  const { data: taxonomiesData } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .contains('content_type_ids', [contentType.id])

  const taxonomies = (taxonomiesData || []) as Taxonomy[]

  // Count by status
  const statusCounts: Record<string, number> = {}
  for (const s of ['draft', 'published', 'scheduled', 'archived']) {
    const { count: c } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', contentType.id)
      .eq('status', s)
    statusCounts[s] = c || 0
  }

  const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/content`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Inhalte
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-3xl font-bold text-foreground flex items-center gap-3"
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${contentType.color || '#8b5cf6'}20` }}
            >
              <FileText
                className="h-6 w-6"
                style={{ color: contentType.color || '#8b5cf6' }}
              />
            </div>
            {contentType.label_plural}
          </h1>
          {contentType.description && (
            <p className="text-muted-foreground mt-2">{contentType.description}</p>
          )}
        </div>
        <Link href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {contentType.label_singular} erstellen
          </Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6">
        <Link
          href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}`}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            !status || status === 'all'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Alle ({totalCount})
        </Link>
        <Link
          href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}?status=published`}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            status === 'published'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Veröffentlicht ({statusCounts.published})
        </Link>
        <Link
          href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}?status=draft`}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            status === 'draft'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          Entwürfe ({statusCounts.draft})
        </Link>
        {statusCounts.scheduled > 0 && (
          <Link
            href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}?status=scheduled`}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              status === 'scheduled'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Geplant ({statusCounts.scheduled})
          </Link>
        )}
      </div>

      {/* Entries List */}
      <EntriesList
        siteId={siteId}
        contentType={contentType}
        entries={entries}
        taxonomies={taxonomies}
        currentPage={pageNum}
        totalPages={totalPages}
        totalCount={count || 0}
      />
    </div>
  )
}
