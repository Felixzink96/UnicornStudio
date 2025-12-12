'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Image,
  ShoppingBag,
  Calendar,
  Users,
  Bookmark,
  Layers,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react'
import { deleteContentType, duplicateContentType } from '@/lib/supabase/queries/content-types'
import type { ContentType } from '@/types/cms'

// Map icon names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  'file-text': FileText,
  'image': Image,
  'shopping-bag': ShoppingBag,
  'calendar': Calendar,
  'users': Users,
  'bookmark': Bookmark,
  'layers': Layers,
}

interface ContentTypesListProps {
  siteId: string
  initialContentTypes: ContentType[]
  entryCounts: Record<string, number>
  fieldCounts: Record<string, number>
}

export function ContentTypesList({
  siteId,
  initialContentTypes,
  entryCounts,
  fieldCounts,
}: ContentTypesListProps) {
  const router = useRouter()
  const [contentTypes, setContentTypes] = useState(initialContentTypes)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<ContentType | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!typeToDelete) return

    setIsDeleting(true)
    try {
      await deleteContentType(typeToDelete.id)
      setContentTypes((prev) => prev.filter((ct) => ct.id !== typeToDelete.id))
      setDeleteDialogOpen(false)
      setTypeToDelete(null)
    } catch (error) {
      console.error('Error deleting content type:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (contentType: ContentType) => {
    try {
      const newId = await duplicateContentType(
        contentType.id,
        `${contentType.name}_copy`,
        `${contentType.slug}-copy`
      )
      router.refresh()
    } catch (error) {
      console.error('Error duplicating content type:', error)
    }
  }

  return (
    <>
      <div className="grid gap-3">
        {contentTypes.map((contentType) => {
          const IconComponent = iconMap[contentType.icon] || FileText
          const entryCount = entryCounts[contentType.id] || 0
          const fieldCount = fieldCounts[contentType.id] || 0

          return (
            <div
              key={contentType.id}
              className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: contentType.color ? `${contentType.color}20` : 'rgb(139 92 246 / 0.2)' }}
                >
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: contentType.color || '#8b5cf6' }}
                  />
                </div>
                <div>
                  <Link
                    href={`/dashboard/sites/${siteId}/builder/content-types/${contentType.id}`}
                    className="font-medium text-white hover:text-purple-400 transition-colors"
                  >
                    {contentType.label_plural}
                  </Link>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-500">
                      {entryCount} {entryCount === 1 ? 'Eintrag' : 'Einträge'}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="text-sm text-slate-500">
                      {fieldCount} {fieldCount === 1 ? 'Feld' : 'Felder'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick actions */}
                <Link href={`/dashboard/sites/${siteId}/content/${contentType.slug}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Inhalte
                  </Button>
                </Link>

                {/* Dropdown menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-white"
                    >
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
                          `/dashboard/sites/${siteId}/builder/content-types/${contentType.id}`
                        )
                      }
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-slate-300 focus:text-white focus:bg-slate-800"
                      onClick={() => handleDuplicate(contentType)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplizieren
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                      onClick={() => {
                        setTypeToDelete(contentType)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Content Type löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{typeToDelete?.label_plural}&quot; wirklich löschen?
              {entryCounts[typeToDelete?.id || ''] > 0 && (
                <span className="block mt-2 text-red-400">
                  Achtung: {entryCounts[typeToDelete?.id || '']} Einträge werden
                  ebenfalls gelöscht!
                </span>
              )}
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
    </>
  )
}
