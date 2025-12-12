'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Search,
  Puzzle,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Box,
  Layers,
  Layout,
  LayoutGrid,
} from 'lucide-react'
import { deleteComponent, duplicateComponent } from '@/lib/supabase/queries/cms-components'
import type { CMSComponent, CMSComponentType } from '@/types/cms'

interface ComponentLibraryProps {
  siteId: string
  components: CMSComponent[]
  categories: string[]
  currentType?: string
  currentCategory?: string
  searchQuery?: string
}

const typeConfig: Record<CMSComponentType, { label: string; icon: React.ElementType; color: string }> = {
  element: { label: 'Element', icon: Box, color: 'bg-blue-500/20 text-blue-400' },
  block: { label: 'Block', icon: Layers, color: 'bg-green-500/20 text-green-400' },
  section: { label: 'Section', icon: Layout, color: 'bg-purple-500/20 text-purple-400' },
  layout: { label: 'Layout', icon: LayoutGrid, color: 'bg-orange-500/20 text-orange-400' },
}

export function ComponentLibrary({
  siteId,
  components: initialComponents,
  categories,
  currentType,
  currentCategory,
  searchQuery,
}: ComponentLibraryProps) {
  const router = useRouter()
  const [components, setComponents] = useState(initialComponents)
  const [search, setSearch] = useState(searchQuery || '')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [componentToDelete, setComponentToDelete] = useState<CMSComponent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (currentType) params.set('type', currentType)
    if (currentCategory) params.set('category', currentCategory)
    router.push(`?${params.toString()}`)
  }

  const handleDelete = async () => {
    if (!componentToDelete) return

    setIsDeleting(true)
    try {
      await deleteComponent(componentToDelete.id)
      setComponents((prev) => prev.filter((c) => c.id !== componentToDelete.id))
      setDeleteDialogOpen(false)
      setComponentToDelete(null)
    } catch (error) {
      console.error('Error deleting component:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async (component: CMSComponent) => {
    try {
      await duplicateComponent(component.id)
      router.refresh()
    } catch (error) {
      console.error('Error duplicating component:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Components suchen..."
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
          </div>
        </form>

        {/* Type Filter */}
        <div className="flex gap-2">
          <Link
            href={`/dashboard/sites/${siteId}/components`}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              !currentType
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Alle
          </Link>
          {(Object.keys(typeConfig) as CMSComponentType[]).map((type) => {
            const config = typeConfig[type]
            return (
              <Link
                key={type}
                href={`/dashboard/sites/${siteId}/components?type=${type}`}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  currentType === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {config.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              currentType
                ? `/dashboard/sites/${siteId}/components?type=${currentType}`
                : `/dashboard/sites/${siteId}/components`
            }
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              !currentCategory
                ? 'bg-slate-700 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Alle Kategorien
          </Link>
          {categories.map((category) => (
            <Link
              key={category}
              href={`/dashboard/sites/${siteId}/components?${
                currentType ? `type=${currentType}&` : ''
              }category=${category}`}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                currentCategory === category
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {category}
            </Link>
          ))}
        </div>
      )}

      {/* Components Grid */}
      {components.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {components.map((component) => {
            const typeInfo = typeConfig[component.type]
            const TypeIcon = typeInfo.icon

            return (
              <div
                key={component.id}
                className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-colors group"
              >
                {/* Preview */}
                <div className="aspect-video bg-slate-950 relative overflow-hidden">
                  {component.thumbnail_url ? (
                    <img
                      src={component.thumbnail_url}
                      alt={component.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Puzzle className="h-12 w-12 text-slate-700" />
                    </div>
                  )}
                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/dashboard/sites/${siteId}/components/${component.id}`}>
                      <Button size="sm" variant="secondary">
                        <Pencil className="h-4 w-4 mr-1" />
                        Bearbeiten
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{component.name}</h3>
                      {component.description && (
                        <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                          {component.description}
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
                            router.push(`/dashboard/sites/${siteId}/components/${component.id}`)
                          }
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-slate-300 focus:text-white focus:bg-slate-800"
                          onClick={() => handleDuplicate(component)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplizieren
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-300 focus:bg-red-950/50"
                          onClick={() => {
                            setComponentToDelete(component)
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
                    <Badge className={typeInfo.color}>
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {typeInfo.label}
                    </Badge>
                    {component.category && (
                      <Badge variant="outline" className="border-slate-700 text-slate-400">
                        {component.category}
                      </Badge>
                    )}
                  </div>

                  {(component.usage_count ?? 0) > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      {component.usage_count}x verwendet
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <Puzzle className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {searchQuery || currentType || currentCategory
              ? 'Keine Components gefunden'
              : 'Keine Components vorhanden'}
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {searchQuery || currentType || currentCategory
              ? 'Versuche eine andere Suche oder Filter.'
              : 'Erstelle wiederverwendbare UI-Bausteine für deine Website.'}
          </p>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Component löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Möchtest du &quot;{componentToDelete?.name}&quot; wirklich löschen?
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
