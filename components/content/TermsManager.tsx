'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  GripVertical,
  ChevronRight,
  Loader2,
  Save,
  Tag,
  FolderTree,
} from 'lucide-react'
import {
  createTerm,
  updateTerm,
  deleteTerm,
  reorderTerms,
} from '@/lib/supabase/queries/taxonomies'
import type { Taxonomy, Term, TermInsert, TermWithChildren } from '@/types/cms'

interface TermsManagerProps {
  taxonomy: Taxonomy
  initialTerms: Term[]
  entryCounts: Record<string, number>
}

export function TermsManager({
  taxonomy,
  initialTerms,
  entryCounts,
}: TermsManagerProps) {
  const router = useRouter()
  const [terms, setTerms] = useState(initialTerms)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [termToDelete, setTermToDelete] = useState<Term | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string | null>(null)

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

  const handleNameChange = (value: string) => {
    setName(value)
    if (!editingTerm && !slug) {
      setSlug(generateSlug(value))
    }
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      const newTerm = await createTerm({
        taxonomy_id: taxonomy.id,
        name,
        slug,
        description: description || undefined,
        parent_id: parentId || undefined,
      })
      setTerms((prev) => [...prev, newTerm])
      setCreateDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating term:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingTerm) return

    setIsSubmitting(true)
    try {
      const updatedTerm = await updateTerm(editingTerm.id, {
        name,
        slug,
        description: description || undefined,
        parent_id: parentId || undefined,
      })
      setTerms((prev) =>
        prev.map((t) => (t.id === editingTerm.id ? updatedTerm : t))
      )
      setEditingTerm(null)
      resetForm()
    } catch (error) {
      console.error('Error updating term:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!termToDelete) return

    setIsSubmitting(true)
    try {
      await deleteTerm(termToDelete.id)
      setTerms((prev) => prev.filter((t) => t.id !== termToDelete.id))
      setDeleteDialogOpen(false)
      setTermToDelete(null)
    } catch (error) {
      console.error('Error deleting term:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = (term: Term) => {
    setName(term.name)
    setSlug(term.slug)
    setDescription(term.description || '')
    setParentId(term.parent_id)
    setEditingTerm(term)
  }

  const resetForm = () => {
    setName('')
    setSlug('')
    setDescription('')
    setParentId(null)
  }

  // Build tree structure for hierarchical taxonomies
  const buildTree = (items: Term[], parentId: string | null = null): TermWithChildren[] => {
    return items
      .filter((item) => item.parent_id === parentId)
      .map((item) => ({
        ...item,
        children: buildTree(items, item.id),
      }))
  }

  // Render term item (recursive for hierarchical)
  const renderTerm = (term: Term, depth: number = 0) => {
    const children = taxonomy.hierarchical
      ? terms.filter((t) => t.parent_id === term.id)
      : []

    return (
      <div key={term.id}>
        <div
          className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
          style={{ marginLeft: depth * 24 }}
        >
          <div className="cursor-move text-slate-600 hover:text-slate-400">
            <GripVertical className="h-4 w-4" />
          </div>

          {taxonomy.hierarchical && children.length > 0 && (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}

          <div className="flex-1">
            <p className="font-medium text-white">{term.name}</p>
            <p className="text-sm text-slate-500">
              /{term.slug}
              {entryCounts[term.id] > 0 && (
                <span className="ml-2">
                  • {entryCounts[term.id]} Einträge
                </span>
              )}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
              <DropdownMenuItem
                className="text-slate-300 focus:text-white focus:bg-slate-800"
                onClick={() => startEdit(term)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Bearbeiten
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                onClick={() => {
                  setTermToDelete(term)
                  setDeleteDialogOpen(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Render children */}
        {taxonomy.hierarchical && children.length > 0 && (
          <div className="mt-2 space-y-2">
            {children.map((child) => renderTerm(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // Get root terms (no parent)
  const rootTerms = taxonomy.hierarchical
    ? terms.filter((t) => !t.parent_id)
    : terms

  // Get possible parents for select (exclude current term and its children)
  const getPossibleParents = () => {
    if (!taxonomy.hierarchical) return []

    const excludeIds = new Set<string>()
    if (editingTerm) {
      excludeIds.add(editingTerm.id)
      // Recursively exclude all children
      const addChildren = (parentId: string) => {
        terms.filter((t) => t.parent_id === parentId).forEach((t) => {
          excludeIds.add(t.id)
          addChildren(t.id)
        })
      }
      addChildren(editingTerm.id)
    }

    return terms.filter((t) => !excludeIds.has(t.id))
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <p className="text-slate-400">
          {terms.length} {terms.length === 1 ? 'Begriff' : 'Begriffe'}
        </p>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          {taxonomy.label_singular} hinzufügen
        </Button>
      </div>

      {/* Terms List */}
      {terms.length > 0 ? (
        <div className="space-y-2">
          {rootTerms.map((term) => renderTerm(term))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-900 rounded-lg border border-slate-800">
          {taxonomy.hierarchical ? (
            <FolderTree className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          ) : (
            <Tag className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          )}
          <p className="text-slate-400">
            Noch keine {taxonomy.label_plural} vorhanden
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingTerm}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false)
            setEditingTerm(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTerm
                ? `${taxonomy.label_singular} bearbeiten`
                : `${taxonomy.label_singular} hinzufügen`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={`${taxonomy.label_singular} Name`}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
                className="bg-slate-800 border-slate-700 text-white font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Beschreibung..."
                className="bg-slate-800 border-slate-700 text-white"
                rows={2}
              />
            </div>
            {taxonomy.hierarchical && (
              <div className="space-y-2">
                <Label className="text-slate-300">Übergeordnet</Label>
                <Select
                  value={parentId || 'none'}
                  onValueChange={(v) => setParentId(v === 'none' ? null : v)}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Keine (Oberste Ebene)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none">Keine (Oberste Ebene)</SelectItem>
                    {getPossibleParents().map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false)
                setEditingTerm(null)
                resetForm()
              }}
              className="border-slate-700 text-slate-300"
            >
              Abbrechen
            </Button>
            <Button
              onClick={editingTerm ? handleUpdate : handleCreate}
              disabled={isSubmitting || !name || !slug}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTerm ? 'Speichern' : 'Hinzufügen'}
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
              {taxonomy.label_singular} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{termToDelete?.name}&quot; wirklich löschen?
              {entryCounts[termToDelete?.id || ''] > 0 && (
                <span className="block mt-2 text-yellow-400">
                  Diese Zuordnung wird von {entryCounts[termToDelete?.id || '']} Einträgen entfernt.
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
    </div>
  )
}
