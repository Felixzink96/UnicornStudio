'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SiteCard, type SiteWithPreview } from '@/components/dashboard/SiteCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Search, Loader2 } from 'lucide-react'

interface SitesListProps {
  sites: SiteWithPreview[]
  organizationId: string
}

export function SitesList({ sites: initialSites, organizationId }: SitesListProps) {
  const router = useRouter()
  const [sites, setSites] = useState<SiteWithPreview[]>(initialSites)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; siteId: string | null }>({
    open: false,
    siteId: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleDelete(siteId: string) {
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from('sites').delete().eq('id', siteId)

    if (!error) {
      setSites(sites.filter((s) => s.id !== siteId))
    }

    setIsDeleting(false)
    setDeleteDialog({ open: false, siteId: null })
  }

  async function handleDuplicate(siteId: string) {
    const site = sites.find((s) => s.id === siteId)
    if (!site) return

    const supabase = createClient()

    const { data, error } = await supabase
      .from('sites')
      .insert({
        organization_id: organizationId,
        name: `${site.name} (Copy)`,
        slug: `${site.slug}-copy-${Date.now()}`,
        description: site.description,
        settings: site.settings,
        seo: site.seo,
      })
      .select()
      .single()

    if (!error && data) {
      // Cast integrations from Json to expected type
      const newSite: SiteWithPreview = {
        ...data,
        integrations: data.integrations as SiteWithPreview['integrations'],
        homePageHtml: null,
      }
      setSites([newSite, ...sites])
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Websites</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Verwalte deine Websites und Landing Pages
          </p>
        </div>
        <Link href="/dashboard/sites/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Website
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Websites durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="text-center py-16">
          {searchQuery ? (
            <>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Keine Websites gefunden für &quot;{searchQuery}&quot;
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Suche zurücksetzen
              </Button>
            </>
          ) : (
            <>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Du hast noch keine Websites erstellt
              </p>
              <Link href="/dashboard/sites/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Erstelle deine erste Website
                </Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredSites.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              onDelete={(id) => setDeleteDialog({ open: true, siteId: id })}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, siteId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Website löschen</DialogTitle>
            <DialogDescription>
              Bist du sicher, dass du diese Website löschen möchtest? Diese Aktion kann nicht
              rückgängig gemacht werden. Alle Seiten und Inhalte werden dauerhaft gelöscht.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, siteId: null })}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.siteId && handleDelete(deleteDialog.siteId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Website löschen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
