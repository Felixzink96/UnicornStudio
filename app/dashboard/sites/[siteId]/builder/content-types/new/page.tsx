import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Layers } from 'lucide-react'
import { ContentTypeForm } from '@/components/content/ContentTypeForm'

interface NewContentTypePageProps {
  params: Promise<{ siteId: string }>
}

export default async function NewContentTypePage({ params }: NewContentTypePageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get site
  const { data: site, error } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .single()

  if (error || !site) {
    notFound()
  }

  // Get existing taxonomies for the site
  const { data: taxonomies } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/builder/content-types`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Content Types
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Layers className="h-8 w-8 text-purple-500" />
          Neuer Content Type
        </h1>
        <p className="text-muted-foreground mt-2">
          Definiere einen neuen Inhaltstyp für deine Website
        </p>
      </div>

      {/* Form */}
      <ContentTypeForm
        siteId={siteId}
        taxonomies={taxonomies || []}
      />
    </div>
  )
}
