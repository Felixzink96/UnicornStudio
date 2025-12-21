import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateEditorNew } from '@/components/templates/TemplateEditorNew'

interface EditTemplatePageProps {
  params: Promise<{ siteId: string; templateId: string }>
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { siteId, templateId } = await params
  const supabase = await createClient()

  // Verify template exists
  const { data: template, error } = await supabase
    .from('templates')
    .select('id')
    .eq('id', templateId)
    .eq('site_id', siteId)
    .single()

  if (error || !template) {
    notFound()
  }

  // Full-screen overlay editor
  return (
    <div className="fixed inset-0 z-50">
      <TemplateEditorNew siteId={siteId} templateId={templateId} />
    </div>
  )
}
