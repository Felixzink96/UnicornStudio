'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  FileText,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Archive,
  CheckCircle,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  deleteEntry,
  duplicateEntry,
  publishEntry,
  unpublishEntry,
  archiveEntry,
} from '@/lib/supabase/queries/entries'
import type { ContentType, Entry, Taxonomy } from '@/types/cms'

interface EntriesListProps {
  siteId: string
  contentType: ContentType
  entries: Entry[]
  taxonomies: Taxonomy[]
  currentPage: number
  totalPages: number
  totalCount: number
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  draft: { label: 'Entwurf', color: 'bg-yellow-500/20 text-yellow-400', icon: FileText },
  published: { label: 'Veröffentlicht', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  scheduled: { label: 'Geplant', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  archived: { label: 'Archiviert', color: 'bg-slate-500/20 text-slate-400', icon: Archive },
}

export function EntriesList({
  siteId,
  contentType,
  entries: initialEntries,
  taxonomies,
  currentPage,
  totalPages,
  totalCount,
}: EntriesListProps) {
  const router = useRouter()
  const [entries, setEntries] = useState(initialEntries)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!entryToDelete) return

    setIsDeleting(true)
    try {
      await deleteEntry(entryToDelete.id)
      setEntries((prev) => prev.filter((e) => e.id !== entryToDelete.id))
      setDeleteDialogOpen(false)
      toast.success('Erfolgreich gelöscht', `"${entryToDelete.title}" wurde gelöscht.`)
      setEntryToDelete(null)
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Fehler beim Löschen', 'Der Eintrag konnte nicht gelöscht werden.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (entry: Entry) => {
    setLoadingAction(`duplicate-${entry.id}`)
    try {
      await duplicateEntry(entry.id)
      toast.success('Dupliziert', `"${entry.title}" wurde dupliziert.`)
      router.refresh()
    } catch (error) {
      console.error('Error duplicating entry:', error)
      toast.error('Fehler beim Duplizieren', 'Der Eintrag konnte nicht dupliziert werden.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePublish = async (entry: Entry) => {
    setLoadingAction(`publish-${entry.id}`)
    try {
      await publishEntry(entry.id)
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: 'published' as const, published_at: new Date().toISOString() }
            : e
        )
      )
      toast.success('Veröffentlicht', `"${entry.title}" wurde veröffentlicht.`)
    } catch (error) {
      console.error('Error publishing entry:', error)
      toast.error('Fehler beim Veröffentlichen', 'Der Eintrag konnte nicht veröffentlicht werden.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleUnpublish = async (entry: Entry) => {
    setLoadingAction(`unpublish-${entry.id}`)
    try {
      await unpublishEntry(entry.id)
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'draft' as const, published_at: null } : e
        )
      )
      toast.success('Zurückgezogen', `"${entry.title}" wurde zurückgezogen.`)
    } catch (error) {
      console.error('Error unpublishing entry:', error)
      toast.error('Fehler', 'Der Eintrag konnte nicht zurückgezogen werden.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleArchive = async (entry: Entry) => {
    setLoadingAction(`archive-${entry.id}`)
    try {
      await archiveEntry(entry.id)
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: 'archived' as const } : e))
      )
      toast.success('Archiviert', `"${entry.title}" wurde archiviert.`)
    } catch (error) {
      console.error('Error archiving entry:', error)
      toast.error('Fehler beim Archivieren', 'Der Eintrag konnte nicht archiviert werden.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(window.location.search)
    if (searchQuery) {
      params.set('search', searchQuery)
    } else {
      params.delete('search')
    }
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  if (entries.length === 0 && !searchQuery) {
    return (
      <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
        <FileText className="h-16 w-16 text-slate-700 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Keine {contentType.label_plural} vorhanden
        </h2>
        <p className="text-slate-400 mb-6">
          Erstelle deinen ersten {contentType.label_singular}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${contentType.label_plural} suchen...`}
            className="bg-slate-800 border-slate-700 text-white pl-10"
          />
        </div>
        <Button type="submit" variant="secondary">
          Suchen
        </Button>
      </form>

      {/* Entries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800">
              {contentType.has_featured_image && (
                <th className="p-4 text-left text-sm font-medium text-slate-400 w-16">
                  Bild
                </th>
              )}
              <th className="p-4 text-left text-sm font-medium text-slate-400">
                Titel
              </th>
              <th className="p-4 text-left text-sm font-medium text-slate-400 w-32">
                Status
              </th>
              {contentType.has_author && (
                <th className="p-4 text-left text-sm font-medium text-slate-400 w-40">
                  Autor
                </th>
              )}
              <th className="p-4 text-left text-sm font-medium text-slate-400 w-40">
                Datum
              </th>
              <th className="p-4 text-right text-sm font-medium text-slate-400 w-20">
                Aktionen
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const status = statusConfig[entry.status] || statusConfig.draft
              const StatusIcon = status.icon

              return (
                <tr
                  key={entry.id}
                  className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50 transition-colors"
                >
                  {contentType.has_featured_image && (
                    <td className="p-4">
                      {(entry as any).featured_image?.file_url ? (
                        <img
                          src={(entry as any).featured_image.file_url}
                          alt=""
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-600" />
                        </div>
                      )}
                    </td>
                  )}
                  <td className="p-4">
                    <Link
                      href={`/dashboard/sites/${siteId}/content/${contentType.slug}/${entry.id}`}
                      className="font-medium text-white hover:text-purple-400 transition-colors"
                    >
                      {entry.title || '(Ohne Titel)'}
                    </Link>
                    {entry.slug && (
                      <p className="text-sm text-slate-500">/{entry.slug}</p>
                    )}
                  </td>
                  <td className="p-4">
                    <Badge className={status.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </td>
                  {contentType.has_author && (
                    <td className="p-4">
                      <span className="text-sm text-slate-400">
                        {(entry as any).author?.full_name || '-'}
                      </span>
                    </td>
                  )}
                  <td className="p-4">
                    <span className="text-sm text-slate-400">
                      {new Date(
                        entry.published_at || entry.created_at
                      ).toLocaleDateString('de-DE')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-slate-900 border-slate-700"
                      >
                        <DropdownMenuItem
                          className="text-slate-300 focus:text-white focus:bg-slate-800"
                          onClick={() =>
                            router.push(
                              `/dashboard/sites/${siteId}/content/${contentType.slug}/${entry.id}`
                            )
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-slate-300 focus:text-white focus:bg-slate-800"
                          onClick={() => handleDuplicate(entry)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplizieren
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        {entry.status === 'published' ? (
                          <DropdownMenuItem
                            className="text-slate-300 focus:text-white focus:bg-slate-800"
                            onClick={() => handleUnpublish(entry)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Veröffentlichung aufheben
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-400 focus:text-green-300 focus:bg-green-950/50"
                            onClick={() => handlePublish(entry)}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Veröffentlichen
                          </DropdownMenuItem>
                        )}
                        {entry.status !== 'archived' && (
                          <DropdownMenuItem
                            className="text-slate-300 focus:text-white focus:bg-slate-800"
                            onClick={() => handleArchive(entry)}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archivieren
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                          onClick={() => {
                            setEntryToDelete(entry)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Zeige {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalCount)} von {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(currentPage - 1))
                router.push(`?${params.toString()}`)
              }}
              className="border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm text-slate-400">
              Seite {currentPage} von {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => {
                const params = new URLSearchParams(window.location.search)
                params.set('page', String(currentPage + 1))
                router.push(`?${params.toString()}`)
              }}
              className="border-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {contentType.label_singular} löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{entryToDelete?.title}&quot; wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Lösche...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
