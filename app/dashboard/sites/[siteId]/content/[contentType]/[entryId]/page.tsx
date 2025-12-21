import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntryEditorNew } from '@/components/entries/EntryEditorNew'

interface EditEntryPageProps {
  params: Promise<{ siteId: string; contentType: string; entryId: string }>
}

export default async function EditEntryPage({ params }: EditEntryPageProps) {
  const { siteId, contentType: contentTypeSlug, entryId } = await params
  const supabase = await createClient()

  // Verify entry exists
  const { data: entry, error } = await supabase
    .from('entries')
    .select('id')
    .eq('id', entryId)
    .eq('site_id', siteId)
    .single()

  if (error || !entry) {
    notFound()
  }

  // Full-screen overlay editor
  return (
    <div className="fixed inset-0 z-50">
      <EntryEditorNew siteId={siteId} entryId={entryId} />
    </div>
  )
}
