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

  const siteStatus = site.status || 'draft'

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sites
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">{site.name}</h1>
            <Badge className={statusColors[siteStatus]}>{siteStatus}</Badge>
          </div>
          {site.description && (
            <p className="text-slate-400">{site.description}</p>
          )}
          {site.subdomain && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {site.subdomain}.unicorn.studio
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href={`/preview/${siteId}`} target="_blank">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </Link>
          <Link href={`/dashboard/sites/${siteId}/settings`}>
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{pages.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={statusColors[siteStatus] + ' text-lg px-3 py-1'}>
              {siteStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium text-white">
              {new Date(site.updated_at || Date.now()).toLocaleDateString('de-DE')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Pages
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
            <p className="text-slate-400 mb-4">No pages yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
