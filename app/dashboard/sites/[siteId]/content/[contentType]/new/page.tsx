import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntryEditorNew } from '@/components/entries/EntryEditorNew'

interface NewEntryPageProps {
  params: Promise<{ siteId: string; contentType: string }>
}

export default async function NewEntryPage({ params }: NewEntryPageProps) {
  const { siteId, contentType: contentTypeSlug } = await params
  const supabase = await createClient()

  // Verify content type exists
  const { data: contentType, error } = await supabase
    .from('content_types')
    .select('id')
    .eq('site_id', siteId)
    .eq('slug', contentTypeSlug)
    .single()

  if (error || !contentType) {
    notFound()
  }

  // Full-screen overlay editor
  return (
    <div className="fixed inset-0 z-50">
      <EntryEditorNew siteId={siteId} contentTypeSlug={contentTypeSlug} />
    </div>
  )
}
