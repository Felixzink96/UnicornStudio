import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, FileText } from 'lucide-react'
import { EntryEditor } from '@/components/content/EntryEditor'
import type { ContentType, Entry, Field, Taxonomy, Term } from '@/types/cms'

interface EditEntryPageProps {
  params: Promise<{ siteId: string; contentType: string; entryId: string }>
}

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { siteId, contentType: contentTypeSlug, entryId } = await params
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

  // Get entry
  const { data: entryData, error: entryError } = await supabase
    .from('entries')
    .select(`
      *,
      author:profiles(id, full_name, avatar_url),
      featured_image:assets(id, file_url, alt_text)
    `)
    .eq('id', entryId)
    .single()

  if (entryError || !entryData) {
    notFound()
  }

  const entry = entryData as Entry

  // Get fields for this content type
  const { data: fieldsData } = await supabase
    .from('fields')
    .select('*')
    .eq('content_type_id', contentType.id)
    .order('position', { ascending: true })

  const fields = (fieldsData || []) as Field[]

  // Get taxonomies for this content type
  const { data: taxonomiesData } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .contains('content_type_ids', [contentType.id])

  const taxonomies = (taxonomiesData || []) as Taxonomy[]

  // Get entry's terms
  const { data: entryTermsData } = await supabase
    .from('entry_terms')
    .select('term_id')
    .eq('entry_id', entryId)

  const entryTermIds = (entryTermsData || []).map((et) => et.term_id)

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/content/${contentTypeSlug}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {contentType.label_plural}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${contentType.color || '#8b5cf6'}20` }}
          >
            <FileText
              className="h-6 w-6"
              style={{ color: contentType.color || '#8b5cf6' }}
            />
          </div>
          {contentType.label_singular} bearbeiten
        </h1>
        {entry.title && (
          <p className="text-slate-400 mt-2">{entry.title}</p>
        )}
      </div>

      {/* Editor */}
      <EntryEditor
        siteId={siteId}
        contentType={contentType}
        fields={fields}
        taxonomies={taxonomies}
        entry={entry}
        entryTermIds={entryTermIds}
      />
    </div>
  )
}
