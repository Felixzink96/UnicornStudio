import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Puzzle, Download, ExternalLink, Clock, Check, Globe, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { PluginCard } from '@/components/integrations/PluginCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Available plugins data
const PLUGINS = [
  {
    id: 'wordpress',
    name: 'Unicorn Studio Connect',
    platform: 'WordPress',
    description: 'Verbindet WordPress mit Unicorn Studio. Synchronisiert Content Types, Entries, Taxonomies und CSS automatisch.',
    version: '1.0.0',
    requires: 'WordPress 6.0+, PHP 8.0+, ACF Pro (empfohlen)',
    features: [
      'Automatische Synchronisierung via Webhooks',
      'Custom Post Types aus Content Types',
      'ACF Pro Integration für Custom Fields',
      'DSGVO-konformes lokales CSS',
      'Taxonomy & Term Sync',
      'Media Import',
      'SEO Plugin Support (Yoast, RankMath)',
      'Asset Optimizer (entfernt störende CSS/JS)',
    ],
    downloadUrl: '/api/downloads/plugin/wordpress',
    themeDownloadUrl: '/api/downloads/theme/wordpress',
    documentationUrl: '/docs/integrations/wordpress',
    icon: 'wordpress',
    status: 'stable' as const,
  },
  {
    id: 'shopify',
    name: 'Unicorn Studio for Shopify',
    platform: 'Shopify',
    description: 'Integration für Shopify Stores. Synchronisiert Produkte, Kollektionen und Blog-Inhalte.',
    version: null,
    requires: 'Shopify Store',
    features: [
      'Produkt-Synchronisierung',
      'Kollektion-Management',
      'Metafield Mapping',
      'Theme Sections',
    ],
    downloadUrl: null,
    documentationUrl: null,
    icon: 'shopify',
    status: 'coming_soon' as const,
  },
  {
    id: 'webflow',
    name: 'Unicorn Studio for Webflow',
    platform: 'Webflow',
    description: 'Integration für Webflow CMS. Synchronisiert Collections und Items bidirektional.',
    version: null,
    requires: 'Webflow CMS Plan',
    features: [
      'Collection Sync',
      'Item Synchronisierung',
      'Rich Text Support',
      'Asset Management',
    ],
    downloadUrl: null,
    documentationUrl: null,
    icon: 'webflow',
    status: 'coming_soon' as const,
  },
  {
    id: 'wix',
    name: 'Unicorn Studio for Wix',
    platform: 'Wix',
    description: 'Integration für Wix Websites. Synchronisiert Datenbanken und dynamische Seiten.',
    version: null,
    requires: 'Wix Premium',
    features: [
      'Datenbank-Synchronisierung',
      'Dynamische Seiten',
      'Form Integration',
    ],
    downloadUrl: null,
    documentationUrl: null,
    icon: 'wix',
    status: 'coming_soon' as const,
  },
]

interface WordPressConfig {
  enabled: boolean
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
  registered_at?: string
}

interface SiteWithWordPress {
  id: string
  name: string
  wordpress: WordPressConfig
  last_pushed_at: string | null
  updated_at: string | null
}

export default async function IntegrationsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  // Get user's profile to find organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // Get all sites with WordPress integration
  const { data: sites } = profile?.organization_id
    ? await supabase
        .from('sites')
        .select('id, name, integrations, updated_at, last_pushed_to_wordpress_at')
        .eq('organization_id', profile.organization_id)
    : { data: [] }

  // Filter sites with WordPress enabled
  const wordpressSites: SiteWithWordPress[] = (sites || [])
    .filter((site) => {
      const integrations = site.integrations as { wordpress?: WordPressConfig } | null
      return integrations?.wordpress?.enabled
    })
    .map((site) => {
      const integrations = site.integrations as { wordpress: WordPressConfig }
      return {
        id: site.id,
        name: site.name,
        wordpress: integrations.wordpress,
        last_pushed_at: (site as { last_pushed_to_wordpress_at?: string | null }).last_pushed_to_wordpress_at || null,
        updated_at: site.updated_at,
      }
    })

  const stablePlugins = PLUGINS.filter(p => p.status === 'stable')
  const comingSoonPlugins = PLUGINS.filter(p => p.status === 'coming_soon')

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Dashboard
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Puzzle className="h-8 w-8 text-purple-500" />
          Integrationen
        </h1>
        <p className="text-slate-400 mt-2">
          Plugins und Integrationen für externe Plattformen
        </p>
      </div>

      {/* Connected WordPress Sites */}
      {wordpressSites.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Verbundene WordPress Sites
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {wordpressSites.map((site) => {
              const isOutdated = site.updated_at && site.last_pushed_at &&
                new Date(site.updated_at) > new Date(site.last_pushed_at)
              const neverPushed = !site.last_pushed_at

              return (
                <Card key={site.id} className="bg-slate-900 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* WordPress Icon */}
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{site.name}</h3>
                          <p className="text-sm text-slate-400">{site.wordpress.domain}</p>
                        </div>
                      </div>
                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        {site.wordpress.connection_status === 'connected' ? (
                          neverPushed ? (
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Nie gepusht
                            </Badge>
                          ) : isOutdated ? (
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Anderungen
                            </Badge>
                          ) : (
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Aktuell
                            </Badge>
                          )
                        ) : site.wordpress.connection_status === 'error' ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                            <XCircle className="h-3 w-3 mr-1" />
                            Fehler
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                            Ungetestet
                          </Badge>
                        )}
                      </div>
                    </div>
                    {/* Last Sync Info */}
                    {site.last_pushed_at && (
                      <p className="text-xs text-slate-500 mt-3">
                        Letzter Push: {new Date(site.last_pushed_at).toLocaleString('de-DE')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Plugins */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          Verfugbar
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stablePlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          In Entwicklung
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {comingSoonPlugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      </div>

      {/* API Information */}
      <div className="mt-12 bg-slate-800/30 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">REST API</h3>
        <p className="text-slate-400 mb-4">
          Du kannst auch direkt die REST API nutzen, um deine eigene Integration zu bauen.
        </p>
        <div className="flex gap-4">
          <Link
            href="/dashboard/settings/api-keys"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
          >
            API Keys verwalten
          </Link>
        </div>
      </div>
    </div>
  )
}
