import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, LayoutTemplate } from 'lucide-react'
import { TemplateEditor } from '@/components/templates/TemplateEditor'

interface NewTemplatePageProps {
  params: Promise<{ siteId: string }>
}

export default async function NewTemplatePage({ params }: NewTemplatePageProps) {
  const { siteId } = await params
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

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/templates`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Templates
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <LayoutTemplate className="h-8 w-8 text-purple-500" />
          Neues Template
        </h1>
        <p className="text-slate-400 mt-2">
          Erstelle ein neues Layout für deine Inhalte
        </p>
      </div>

      {/* Template Editor */}
      <TemplateEditor siteId={siteId} />
    </div>
  )
}
