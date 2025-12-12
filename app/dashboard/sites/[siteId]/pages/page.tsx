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
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-500" />
            Pages
          </h1>
          <p className="text-slate-400 mt-2">
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
              className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="font-medium text-white group-hover:text-purple-400 transition-colors">
                    {page.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    /{page.slug || '(home)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {page.is_home && (
                  <Badge variant="outline" className="border-slate-700 text-slate-400">
                    Home
                  </Badge>
                )}
                <ExternalLink className="h-4 w-4 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Noch keine Seiten vorhanden</p>
          <p className="text-sm text-slate-500">Klicke auf "Neue Seite" um loszulegen</p>
        </div>
      )}
    </div>
  )
}
