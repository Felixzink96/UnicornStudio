import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Search } from 'lucide-react'
import { GlobalSEOEditor } from '@/components/seo/GlobalSEOEditor'
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
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Search className="h-8 w-8 text-purple-500" />
          SEO Einstellungen
        </h1>
        <p className="text-slate-400 mt-2">
          Globale SEO-Konfiguration für deine Website
        </p>
      </div>

      {/* SEO Editor */}
      <GlobalSEOEditor siteId={siteId} initialSettings={seoSettings} siteName={site.name} />
    </div>
  )
}
