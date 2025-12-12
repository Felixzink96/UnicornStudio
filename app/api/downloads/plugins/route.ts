import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Available plugins
 */
const PLUGINS = [
  {
    id: 'wordpress',
    name: 'Unicorn Studio Connect',
    platform: 'WordPress',
    description: 'Verbindet WordPress mit Unicorn Studio. Synchronisiert Content Types, Entries, Taxonomies und CSS automatisch.',
    version: '1.0.0',
    requires: 'WordPress 6.0+, PHP 8.0+',
    features: [
      'Automatische Synchronisierung via Webhooks',
      'Custom Post Types aus Content Types',
      'ACF Pro Integration für Custom Fields',
      'DSGVO-konformes lokales CSS',
      'Taxonomy & Term Sync',
      'Media Import',
    ],
    downloadUrl: '/api/downloads/plugin/wordpress',
    documentationUrl: '/docs/integrations/wordpress',
    icon: 'wordpress',
    status: 'stable',
  },
  {
    id: 'shopify',
    name: 'Unicorn Studio for Shopify',
    platform: 'Shopify',
    description: 'Integration für Shopify Stores. Synchronisiert Produkte, Kollektionen und Blog-Inhalte.',
    version: null,
    requires: 'Shopify',
    features: [
      'Produkt-Synchronisierung',
      'Kollektion-Management',
      'Metafield Mapping',
      'Theme Sections',
    ],
    downloadUrl: null,
    documentationUrl: null,
    icon: 'shopify',
    status: 'coming_soon',
  },
  {
    id: 'webflow',
    name: 'Unicorn Studio for Webflow',
    platform: 'Webflow',
    description: 'Integration für Webflow CMS. Synchronisiert Collections und Items bidirektional.',
    version: null,
    requires: 'Webflow CMS',
    features: [
      'Collection Sync',
      'Item Synchronisierung',
      'Rich Text Support',
      'Asset Management',
    ],
    downloadUrl: null,
    documentationUrl: null,
    icon: 'webflow',
    status: 'coming_soon',
  },
]

/**
 * GET /api/downloads/plugins
 * List all available plugins
 */
export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  return Response.json({
    success: true,
    data: PLUGINS,
  })
}
