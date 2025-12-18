import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Editor } from '@/components/editor/Editor'
import crypto from 'crypto'

interface EditorPageProps {
  params: Promise<{
    siteId: string
    pageId: string
  }>
  searchParams: Promise<{
    wpToken?: string
    embedded?: string
    returnUrl?: string
  }>
}

// Service client for API key validation
function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Validate WordPress token
async function validateWpToken(wpToken: string, siteId: string, pageId: string): Promise<boolean> {
  try {
    const tokenData = JSON.parse(Buffer.from(wpToken, 'base64').toString('utf-8'))
    const { key: apiKey, site: tokenSiteId, page: tokenPageId, exp } = tokenData

    // Check expiration
    if (exp && Date.now() / 1000 > exp) {
      console.log('[WP Auth] Token expired')
      return false
    }

    // Check site and page match
    if (tokenSiteId !== siteId || tokenPageId !== pageId) {
      console.log('[WP Auth] Site/page mismatch')
      return false
    }

    // Validate API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const supabase = getServiceClient()

    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('id, organization_id, is_active')
      .eq('key_hash', keyHash)
      .single()

    if (error || !keyData || !keyData.is_active) {
      console.log('[WP Auth] Invalid API key')
      return false
    }

    // Verify site belongs to this org
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('organization_id')
      .eq('id', siteId)
      .single()

    if (siteError || !siteData || siteData.organization_id !== keyData.organization_id) {
      console.log('[WP Auth] Site not in organization')
      return false
    }

    console.log('[WP Auth] Token valid!')
    return true
  } catch (e) {
    console.error('[WP Auth] Token validation error:', e)
    return false
  }
}

export default async function EditorPage({ params, searchParams }: EditorPageProps) {
  const { siteId, pageId } = await params
  const { wpToken, embedded, returnUrl } = await searchParams

  console.log('[Editor] Request params:', { siteId, pageId, hasWpToken: !!wpToken, embedded })

  // Check for WordPress token authentication
  if (wpToken) {
    console.log('[WP Auth] Validating token for site:', siteId, 'page:', pageId)
    const isValid = await validateWpToken(wpToken, siteId, pageId)
    if (isValid) {
      // WordPress auth is valid - render editor without Supabase user check
      console.log('[WP Auth] Token valid - rendering editor')
      return <Editor pageId={pageId} siteId={siteId} isEmbedded={embedded === 'true'} />
    }
    // Invalid token - show error page for embedded mode
    console.log('[WP Auth] Token invalid')
    if (embedded === 'true') {
      return (
        <div className="h-screen flex items-center justify-center bg-zinc-950">
          <div className="text-center p-8 bg-zinc-900 rounded-lg border border-zinc-800 max-w-md">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Authentifizierung fehlgeschlagen</h1>
            <p className="text-zinc-400 mb-4">
              Der WordPress-Token konnte nicht validiert werden. Bitte überprüfen Sie die API-Key Einstellungen in WordPress.
            </p>
            <p className="text-zinc-500 text-sm">
              Fehlercode: WP_TOKEN_INVALID
            </p>
          </div>
        </div>
      )
    }
  }

  // Standard Supabase authentication
  const supabase = await createClient()

  // Verify the page exists and user has access
  const { data: page, error } = await supabase
    .from('pages')
    .select('*, sites(*)')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .single()

  if (error || !page) {
    notFound()
  }

  return <Editor pageId={pageId} siteId={siteId} isEmbedded={embedded === 'true'} />
}

export async function generateMetadata({ params }: EditorPageProps) {
  const { siteId, pageId } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('pages')
    .select('name, sites(name)')
    .eq('id', pageId)
    .eq('site_id', siteId)
    .single()

  if (!data) {
    return { title: 'Editor - Unicorn Studio' }
  }

  const page = data as { name: string; sites: { name: string } | null }
  const siteName = page.sites?.name || 'Site'

  return {
    title: `${page.name} - ${siteName} | Unicorn Studio`,
  }
}
