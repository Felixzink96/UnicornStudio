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
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Star,
  FileText,
  Layout,
  Layers,
  Tag,
} from 'lucide-react'
import { deleteTemplate, duplicateTemplate, setDefaultTemplate } from '@/lib/supabase/queries/templates'
import type { Template, TemplateType } from '@/types/cms'

interface TemplatesListProps {
  siteId: string
  templates: Template[]
  currentType?: TemplateType
}

const typeConfig: Record<TemplateType, { label: string; icon: React.ElementType; color: string }> = {
  page: { label: 'Seite', icon: FileText, color: 'bg-blue-500/20 text-blue-400' },
  single: { label: 'Einzelansicht', icon: Layout, color: 'bg-green-500/20 text-green-400' },
  archive: { label: 'Archiv', icon: Layers, color: 'bg-purple-500/20 text-purple-400' },
  taxonomy: { label: 'Taxonomie', icon: Tag, color: 'bg-orange-500/20 text-orange-400' },
}

export function TemplatesList({
  siteId,
  templates: initialTemplates,
  currentType,
}: TemplatesListProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!templateToDelete) return

    setIsDeleting(true)
    try {
      await deleteTemplate(templateToDelete.id)
      setTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id))
      setDeleteDialogOpen(false)
      setTemplateToDelete(null)
    } catch (error) {
      console.error('Error deleting template:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (template: Template) => {
    try {
      await duplicateTemplate(template.id)
      router.refresh()
    } catch (error) {
      console.error('Error duplicating template:', error)
    }
  }

  const handleSetDefault = async (template: Template) => {
    try {
      await setDefaultTemplate(template.id)
      router.refresh()
    } catch (error) {
      console.error('Error setting default template:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-2">
        <Link
          href={`/dashboard/sites/${siteId}/templates`}
          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
            !currentType
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Alle
        </Link>
        {(Object.keys(typeConfig) as TemplateType[]).map((t) => {
          const config = typeConfig[t]
          return (
            <Link
              key={t}
              href={`/dashboard/sites/${siteId}/templates?type=${t}`}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                currentType === t
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {config.label}
            </Link>
          )
        })}
      </div>

      {/* Templates Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const typeInfo = typeConfig[template.type]
            const TypeIcon = typeInfo?.icon || LayoutTemplate

            return (
              <div
                key={template.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors group"
              >
                {/* Preview */}
                <div className="aspect-video bg-slate-950 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LayoutTemplate className="h-12 w-12 text-slate-700" />
                  </div>
                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/dashboard/sites/${siteId}/templates/${template.id}`}>
                      <Button size="sm" variant="secondary">
                        <Pencil className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                    </Link>
                  </div>
                  {/* Default Badge */}
                  {template.is_default && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        Default
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                        <DropdownMenuItem
                          className="text-slate-300 focus:text-white focus:bg-slate-800"
                          onClick={() =>
                            router.push(`/dashboard/sites/${siteId}/templates/${template.id}`)
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-slate-300 focus:text-white focus:bg-slate-800"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplizieren
                        </DropdownMenuItem>
                        {!template.is_default && (
                          <DropdownMenuItem
                            className="text-slate-300 focus:text-white focus:bg-slate-800"
                            onClick={() => handleSetDefault(template)}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Als Default setzen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                          onClick={() => {
                            setTemplateToDelete(template)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-3">
                    {typeInfo && (
                      <Badge className={typeInfo.color}>
                        <TypeIcon className="h-3 w-3 mr-1" />
                        {typeInfo.label}
                      </Badge>
                    )}
                    {template.priority !== null && template.priority !== 10 && (
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        Priorität: {template.priority}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <LayoutTemplate className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {currentType ? 'Keine Templates gefunden' : 'Keine Templates vorhanden'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {currentType
              ? 'Für diesen Typ gibt es noch keine Templates.'
              : 'Erstelle Layouts und Strukturen für deine Inhalte.'}
          </p>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Template löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{templateToDelete?.name}&quot; wirklich löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">
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
