'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function NewSitePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    // Get user's organization
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated')
      setIsLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      setError('No organization found')
      setIsLoading(false)
      return
    }

    const slug = generateSlug(name)

    // Create the site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        organization_id: profile.organization_id,
        name,
        slug,
        description: description || null,
        subdomain: slug + '-' + Date.now().toString(36),
      })
      .select()
      .single()

    if (siteError) {
      setError(siteError.message)
      setIsLoading(false)
      return
    }

    // Create default homepage
    await supabase.from('pages').insert({
      site_id: site.id,
      name: 'Home',
      slug: '',
      is_home: true,
    })

    router.push(`/dashboard/sites/${site.id}`)
  }

  return (
    <div className="p-8">
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Websites
      </Link>

      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Neue Website erstellen</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Richte ein neues Website- oder Landing-Page-Projekt ein
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">
            Website-Name *
          </Label>
          <Input
            id="name"
            placeholder="Meine großartige Website"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {name && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              URL: {generateSlug(name)}.unicorn.studio
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Beschreibung
          </Label>
          <Textarea
            id="description"
            placeholder="Eine kurze Beschreibung deiner Website..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading || !name}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Erstellen...
              </>
            ) : (
              'Website erstellen'
            )}
          </Button>
          <Link href="/dashboard/sites">
            <Button
              type="button"
              variant="outline"
            >
              Abbrechen
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
