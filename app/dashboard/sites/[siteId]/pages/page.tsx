import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FileText, Plus, ExternalLink, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PagesList } from '../PagesList'
import type { Page } from '@/types/database'

interface PagesPageProps {
  params: Promise<{ siteId: string }>
}

export default async function PagesPage({ params }: PagesPageProps) {
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

  // Get pages
  const { data: pagesData } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true })

  const pages = (pagesData || []) as Page[]

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-500" />
            Seiten
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Alle Seiten von {site.name}
          </p>
        </div>
        <PagesList siteId={siteId} initialPages={pages} />
      </div>

      {/* Pages List */}
      {pages.length > 0 ? (
        <div className="grid gap-3">
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/editor/${siteId}/${page.id}`}
              className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors">
                    {page.name}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    /{page.slug || '(Startseite)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {page.is_home && (
                  <Badge variant="outline">
                    Startseite
                  </Badge>
                )}
                <ExternalLink className="h-4 w-4 text-zinc-600 dark:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <FileText className="h-12 w-12 text-zinc-600 dark:text-zinc-400 mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">Noch keine Seiten vorhanden</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Klicke auf "Neue Seite" um loszulegen</p>
        </div>
      )}
    </div>
  )
}
