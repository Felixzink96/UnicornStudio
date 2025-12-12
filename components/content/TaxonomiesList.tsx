'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Loader2, Save } from 'lucide-react'
import {
  createTaxonomy,
  deleteTaxonomy,
} from '@/lib/supabase/queries/taxonomies'
import type { Taxonomy, TaxonomyInsert } from '@/types/cms'

interface TaxonomiesListProps {
  siteId: string
  initialTaxonomies: Taxonomy[]
  termCounts: Record<string, number>
  showCreateButton?: boolean
}

export function TaxonomiesList({
  siteId,
  initialTaxonomies,
  termCounts,
  showCreateButton = false,
}: TaxonomiesListProps) {
  const router = useRouter()
  const [taxonomies, setTaxonomies] = useState(initialTaxonomies)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [taxonomyToDelete, setTaxonomyToDelete] = useState<Taxonomy | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [labelSingular, setLabelSingular] = useState('')
  const [labelPlural, setLabelPlural] = useState('')
  const [slug, setSlug] = useState('')
  const [hierarchical, setHierarchical] = useState(false)

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const generateName = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleLabelPluralChange = (value: string) => {
    setLabelPlural(value)
    if (!slug) {
      setSlug(generateSlug(value))
    }
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      const newTaxonomy = await createTaxonomy({
        site_id: siteId,
        name: generateName(labelSingular),
        label_singular: labelSingular,
        label_plural: labelPlural,
        slug,
        hierarchical,
      })
      setTaxonomies((prev) => [...prev, newTaxonomy])
      setCreateDialogOpen(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error creating taxonomy:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!taxonomyToDelete) return

    setIsSubmitting(true)
    try {
      await deleteTaxonomy(taxonomyToDelete.id)
      setTaxonomies((prev) => prev.filter((t) => t.id !== taxonomyToDelete.id))
      setDeleteDialogOpen(false)
      setTaxonomyToDelete(null)
    } catch (error) {
      console.error('Error deleting taxonomy:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setLabelSingular('')
    setLabelPlural('')
    setSlug('')
    setHierarchical(false)
  }

  if (!showCreateButton) return null

  return (
    <>
      <Button
        onClick={() => setCreateDialogOpen(true)}
        className="bg-purple-600 hover:bg-purple-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Neue Taxonomie
      </Button>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Neue Taxonomie erstellen</DialogTitle>
            <DialogDescription className="text-slate-400">
              Erstelle eine neue Taxonomie wie Kategorien oder Tags
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Name (Singular)</Label>
                <Input
                  value={labelSingular}
                  onChange={(e) => setLabelSingular(e.target.value)}
                  placeholder="z.B. Kategorie"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Name (Plural)</Label>
                <Input
                  value={labelPlural}
                  onChange={(e) => handleLabelPluralChange(e.target.value)}
                  placeholder="z.B. Kategorien"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">URL Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="z.B. kategorien"
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <Label className="text-white">Hierarchisch</Label>
                <p className="text-xs text-slate-500">
                  Ermöglicht verschachtelte Begriffe (Parent/Child)
                </p>
              </div>
              <Switch checked={hierarchical} onCheckedChange={setHierarchical} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                resetForm()
              }}
              className="border-slate-700 text-slate-300"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !labelSingular || !labelPlural || !slug}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Erstellen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Taxonomie löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{taxonomyToDelete?.label_plural}&quot; wirklich löschen?
              {termCounts[taxonomyToDelete?.id || ''] > 0 && (
                <span className="block mt-2 text-red-400">
                  Achtung: {termCounts[taxonomyToDelete?.id || '']} Begriffe werden
                  ebenfalls gelöscht!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
