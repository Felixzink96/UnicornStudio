'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/types/database'
import { SiteCard } from '@/components/dashboard/SiteCard'
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
  sites: Site[]
  organizationId: string
}

export function SitesList({ sites: initialSites, organizationId }: SitesListProps) {
  const router = useRouter()
  const [sites, setSites] = useState(initialSites)
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
      setSites([data, ...sites])
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Sites</h1>
          <p className="text-slate-400 mt-1">
            Manage your websites and landing pages
          </p>
        </div>
        <Link href="/dashboard/sites/new">
          <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
            <Plus className="h-4 w-4 mr-2" />
            New Site
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search sites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-slate-900 border-slate-800 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="text-center py-16">
          {searchQuery ? (
            <>
              <p className="text-slate-400 mb-4">
                No sites found matching &quot;{searchQuery}&quot;
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </>
          ) : (
            <>
              <p className="text-slate-400 mb-4">
                You haven&apos;t created any sites yet
              </p>
              <Link href="/dashboard/sites/new">
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first site
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
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Site</DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to delete this site? This action cannot be
              undone. All pages and content will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, siteId: null })}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.siteId && handleDelete(deleteDialog.siteId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Site'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
