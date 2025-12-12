import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Puzzle, Download, ExternalLink, Clock, Check } from 'lucide-react'
import { PluginCard } from '@/components/integrations/PluginCard'

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

export default async function IntegrationsPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

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

      {/* Available Plugins */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Check className="h-5 w-5 text-green-500" />
          Verfügbar
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
