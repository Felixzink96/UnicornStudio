import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TemplateTypeSelector } from '@/components/templates/TemplateTypeSelector'

interface NewTemplatePageProps {
  params: Promise<{ siteId: string }>
}

export default async function NewTemplatePage({ params }: NewTemplatePageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Verify site exists
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Get all content types for this site
  const { data: contentTypes } = await supabase
    .from('content_types')
    .select('id, name, slug, label_singular, label_plural, has_archive, has_single')
    .eq('site_id', siteId)
    .order('name')

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 flex items-center justify-center p-8">
      <TemplateTypeSelector
        siteId={siteId}
        contentTypes={contentTypes || []}
      />
    </div>
  )
}
