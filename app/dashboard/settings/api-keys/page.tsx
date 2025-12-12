import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Key } from 'lucide-react'
import { APIKeyManager } from '@/components/api-keys/APIKeyManager'

export default async function APIKeysPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    notFound()
  }

  // Get user's profile with organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || !profile.organization_id) {
    notFound()
  }

  // Get organization's sites for the site selector
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .order('name')

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
          <Key className="h-8 w-8 text-purple-500" />
          API Keys
        </h1>
        <p className="text-slate-400 mt-2">
          Verwalte API Keys für externe Integrationen wie WordPress
        </p>
      </div>

      {/* API Key Manager */}
      <APIKeyManager
        organizationId={profile.organization_id}
        sites={sites || []}
      />
    </div>
  )
}
