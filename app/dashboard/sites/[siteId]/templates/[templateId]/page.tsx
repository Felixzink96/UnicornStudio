import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, LayoutTemplate } from 'lucide-react'
import { TemplateEditor } from '@/components/templates/TemplateEditor'
import type { Template } from '@/types/cms'

interface EditTemplatePageProps {
  params: Promise<{ siteId: string; templateId: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { siteId, templateId } = await params
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

  // Get template
  const { data: templateData, error: templateError } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .eq('site_id', siteId)
    .single()

  if (templateError || !templateData) {
    notFound()
  }

  const template = templateData as Template

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/templates`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Templates
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <LayoutTemplate className="h-8 w-8 text-purple-500" />
          {template.name}
        </h1>
        <p className="text-muted-foreground mt-2">Template bearbeiten</p>
      </div>

      {/* Template Editor */}
      <TemplateEditor siteId={siteId} template={template} />
    </div>
  )
}
