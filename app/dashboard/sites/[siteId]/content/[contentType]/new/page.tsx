import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, FileText } from 'lucide-react'
import { EntryEditor } from '@/components/content/EntryEditor'
import type { ContentType, Field, Taxonomy } from '@/types/cms'

interface NewEntryPageProps {
  params: Promise<{ siteId: string; contentType: string }>
}

export default async function NewEntryPage({ params }: NewEntryPageProps) {
  const { siteId, contentType: contentTypeSlug } = await params
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

  // Get current user for author
  const { data: { user } } = await supabase.auth.getUser()

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
          {contentType.label_singular} erstellen
        </h1>
      </div>

      {/* Editor */}
      <EntryEditor
        siteId={siteId}
        contentType={contentType}
        fields={fields}
        taxonomies={taxonomies}
        authorId={user?.id}
      />
    </div>
  )
}
