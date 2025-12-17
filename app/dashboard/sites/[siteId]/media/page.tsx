import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Image } from 'lucide-react'
import { MediaLibrary } from '@/components/media/MediaLibrary'

interface MediaPageProps {
  params: Promise<{ siteId: string }>
}

export default async function MediaPage({ params }: MediaPageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  // Get site details
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name, organization_id')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Verify user has access to this site
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.organization_id !== site.organization_id) {
    notFound()
  }

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          <Image className="h-8 w-8 text-purple-500" />
          Medien-Bibliothek
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-2">
          Verwalte Bilder und andere Medien für diese Website
        </p>
      </div>

      {/* Media Library Component */}
      <MediaLibrary siteId={siteId} />
    </div>
  )
}
