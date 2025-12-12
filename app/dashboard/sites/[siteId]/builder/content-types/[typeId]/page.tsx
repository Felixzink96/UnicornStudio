import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Layers } from 'lucide-react'
import { ContentTypeEditor } from '@/components/content/ContentTypeEditor'
import type { ContentType, Field, Taxonomy } from '@/types/cms'

interface EditContentTypePageProps {
  params: Promise<{ siteId: string; typeId: string }>
}

export default async function EditContentTypePage({
  params,
}: EditContentTypePageProps) {
  const { siteId, typeId } = await params
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

  // Get content type
  const { data: contentTypeData, error: ctError } = await supabase
    .from('content_types')
    .select('*')
    .eq('id', typeId)
    .single()

  if (ctError || !contentTypeData) {
    notFound()
  }

  const contentType = contentTypeData as ContentType

  // Get fields for this content type
  const { data: fieldsData } = await supabase
    .from('fields')
    .select('*')
    .eq('content_type_id', typeId)
    .order('position', { ascending: true })

  const fields = (fieldsData || []) as Field[]

  // Get existing taxonomies for the site
  const { data: taxonomiesData } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)

  const taxonomies = (taxonomiesData || []) as Taxonomy[]

  // Get all content types for relation fields
  const { data: allContentTypesData } = await supabase
    .from('content_types')
    .select('id, name, label_singular, label_plural')
    .eq('site_id', siteId)

  const allContentTypes = (allContentTypesData || []) as ContentType[]

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/builder/content-types`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Content Types
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Layers
            className="h-8 w-8"
            style={{ color: contentType.color || '#8b5cf6' }}
          />
          {contentType.label_plural} bearbeiten
        </h1>
        <p className="text-slate-400 mt-2">
          Bearbeite die Einstellungen und Felder dieses Content Types
        </p>
      </div>

      {/* Editor */}
      <ContentTypeEditor
        siteId={siteId}
        contentType={contentType}
        initialFields={fields}
        taxonomies={taxonomies}
        allContentTypes={allContentTypes}
      />
    </div>
  )
}
