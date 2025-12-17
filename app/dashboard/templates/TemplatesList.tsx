'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Template {
  id: string
  name: string
  description: string | null
  type: string
  html: string
  is_default: boolean | null
  priority: number | null
  created_at: string | null
  updated_at: string | null
  site_id: string
  sites: {
    name: string
    slug: string
  }
}

interface TemplatesListProps {
  templates: Template[]
  organizationId: string
}

export function TemplatesList({ templates: initialTemplates, organizationId }: TemplatesListProps) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; templateId: string | null }>({
    open: false,
    templateId: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.sites.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleDelete(templateId: string) {
    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from('templates').delete().eq('id', templateId)

    if (!error) {
      setTemplates(templates.filter((t) => t.id !== templateId))
    }

    setIsDeleting(false)
    setDeleteDialog({ open: false, templateId: null })
  }

  async function handleDuplicate(templateId: string) {
    const template = templates.find((t) => t.id === templateId)
    if (!template) return

    const supabase = createClient()

    const { data, error } = await supabase
      .from('templates')
      .insert({
        site_id: template.site_id,
        name: `${template.name} (Copy)`,
        description: template.description,
        type: template.type,
        html: template.html,
        priority: template.priority,
        is_default: false,
      })
      .select('*, sites!inner(name, slug)')
      .single()

    if (!error && data) {
      setTemplates([data as Template, ...templates])
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      page: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      single: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      archive: 'bg-green-500/10 text-green-600 dark:text-green-400',
      taxonomy: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    }
    return colors[type] || 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Vorlagen</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Durchsuche alle Vorlagen deiner Websites
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Vorlagen durchsuchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16">
          {searchQuery ? (
            <>
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Keine Vorlagen gefunden für &quot;{searchQuery}&quot;
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Suche zurücksetzen
              </Button>
            </>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <FileText className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Bald verfügbar
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Vorlagen werden bald verfügbar sein. Erstelle Vorlagen innerhalb deiner Websites, um wiederverwendbare Seitenlayouts zu verwalten.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="group relative overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors cursor-pointer p-0 gap-0"
            >
              {/* Thumbnail / Preview */}
              <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-center h-full">
                  <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-white/80 dark:from-zinc-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>

              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-primary transition-colors">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      Aktualisiert{' '}
                      {formatDistanceToNow(new Date(template.updated_at || Date.now()), {
                        addSuffix: true,
                        locale: de,
                      })}
                    </p>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 relative z-20"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/dashboard/sites/${template.site_id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Website ansehen
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDuplicate(template.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Copy className="h-4 w-4" />
                        Duplizieren
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteDialog({ open: true, templateId: template.id })}
                        className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge className={getTypeColor(template.type)}>{template.type}</Badge>
                  {template.is_default && (
                    <Badge className="bg-zinc-500/10 text-zinc-600 dark:text-zinc-400">
                      Standard
                    </Badge>
                  )}
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {template.sites.name}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, templateId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vorlage löschen</DialogTitle>
            <DialogDescription>
              Bist du sicher, dass du diese Vorlage löschen möchtest? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, templateId: null })}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.templateId && handleDelete(deleteDialog.templateId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Löschen...
                </>
              ) : (
                'Vorlage löschen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
