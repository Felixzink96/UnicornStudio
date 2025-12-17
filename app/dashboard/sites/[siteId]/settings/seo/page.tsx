import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Search, Bot, FileText, ChevronRight } from 'lucide-react'
import { GlobalSEOEditor } from '@/components/seo/GlobalSEOEditor'
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import type { GlobalSEOSettings } from '@/types/cms'

interface SEOSettingsPageProps {
  params: Promise<{ siteId: string }>
}

export default async function SEOSettingsPage({ params }: SEOSettingsPageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get site with SEO settings
  const { data: site, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .single()

  if (error || !site) {
    notFound()
  }

  const seoSettings = (site.seo_settings || {}) as unknown as GlobalSEOSettings

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Search className="h-8 w-8 text-purple-500" />
          SEO Einstellungen
        </h1>
        <p className="text-muted-foreground mt-2">
          Globale SEO-Konfiguration für deine Website
        </p>
      </div>

      {/* SEO Editor */}
      <GlobalSEOEditor siteId={siteId} initialSettings={seoSettings} siteName={site.name} />

      {/* Additional SEO Tools */}
      <div className="mt-8 grid gap-4">
        <h2 className="text-xl font-semibold text-foreground">Weitere SEO-Tools</h2>

        <Link href={`/dashboard/sites/${siteId}/settings/seo/robots`}>
          <Card className="bg-card border-border hover:border-border transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-500/10">
                  <Bot className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-foreground text-lg">robots.txt</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Steuere wie Suchmaschinen deine Website crawlen
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <FileText className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-foreground text-lg">XML Sitemap</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Automatisch generiert aus allen publizierten Seiten
                </CardDescription>
              </div>
            </div>
            <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              /api/v1/sites/{siteId}/sitemap.xml
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
