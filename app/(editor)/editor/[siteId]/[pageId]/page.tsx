import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Editor } from '@/components/editor/Editor'

interface EditorPageProps {
  params: Promise<{
    siteId: string
    pageId: string
  }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { siteId, pageId } = await params
  const supabase = await createClient()

  // Verify the page exists and user has access
  const { data: page, error } = await supabase
    .from('pages')
    .select('*, sites(*)')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .single()

  if (error || !page) {
    notFound()
  }

  return <Editor pageId={pageId} siteId={siteId} />
}

export async function generateMetadata({ params }: EditorPageProps) {
  const { siteId, pageId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('pages')
    .select('name, sites(name)')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .single()

  if (!data) {
    return { title: 'Editor - Unicorn Studio' }
  }

  const page = data as { name: string; sites: { name: string } | null }
  const siteName = page.sites?.name || 'Site'

  return {
    title: `${page.name} - ${siteName} | Unicorn Studio`,
  }
}
