import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  FileText,
  Settings,
  Eye,
  Globe,
  ExternalLink,
  Puzzle,
} from 'lucide-react'
import { PagesList } from './PagesList'
import type { Site, Page } from '@/types/database'

interface SitePageProps {
  params: Promise<{ siteId: string }>
}

export default async function SitePage({ params }: SitePageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get site
  const { data: siteData, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  if (error || !siteData) {
    notFound()
  }

  const site = siteData as Site

  // Get pages
  const { data: pagesData } = await supabase
    .from('pages')
    .select('*')
    .eq('site_id', siteId)
    .order('is_home', { ascending: false })
    .order('created_at', { ascending: true })

  const pages = (pagesData || []) as Page[]

  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/10 text-yellow-500',
    published: 'bg-green-500/10 text-green-500',
    archived: 'bg-gray-500/10 text-gray-500',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Entwurf',
    published: 'Veröffentlicht',
    archived: 'Archiviert',
  }

  const siteStatus = site.status || 'draft'

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Websites
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{site.name}</h1>
            <Badge className={statusColors[siteStatus]}>{statusLabels[siteStatus] || siteStatus}</Badge>
          </div>
          {site.description && (
            <p className="text-zinc-600 dark:text-zinc-400">{site.description}</p>
          )}
          {site.subdomain && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {site.subdomain}.unicorn.studio
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/preview/${siteId}`} target="_blank">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Vorschau
            </Button>
          </Link>
          <Link href="/dashboard/settings/integrations">
            <Button variant="outline">
              <Puzzle className="h-4 w-4 mr-2" />
              Integrationen
            </Button>
          </Link>
          <Link href={`/dashboard/sites/${siteId}/settings`}>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Seiten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{pages.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[siteStatus] + ' text-lg px-3 py-1'}>
              {statusLabels[siteStatus] || siteStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Zuletzt aktualisiert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              {new Date(site.updated_at || Date.now()).toLocaleDateString('de-DE')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seiten
          </h2>
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
          </div>
        )}
      </div>
    </div>
  )
}
