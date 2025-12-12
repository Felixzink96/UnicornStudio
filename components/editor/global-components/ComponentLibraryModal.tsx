'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutTemplate,
  Search,
  Plus,
  Globe,
  Trash2,
  Edit,
  Copy,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ComponentLibraryItem, ComponentPosition } from '@/types/global-components'

interface ComponentLibraryModalProps {
  open: boolean
  onClose: () => void
  siteId: string
  onInsert?: (component: ComponentLibraryItem) => void
  onEdit?: (component: ComponentLibraryItem) => void
}

export function ComponentLibraryModal({
  open,
  onClose,
  siteId,
  onInsert,
  onEdit,
}: ComponentLibraryModalProps) {
  const [components, setComponents] = useState<ComponentLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | ComponentPosition>('all')

  useEffect(() => {
    if (open && siteId) {
      loadComponents()
    }
  }, [open, siteId])

  async function loadComponents() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_component_library', {
        p_site_id: siteId,
      })

      if (error) {
        console.error('Error loading components:', error)
        // Fallback to direct query - map position to component_position
        const { data: fallbackData } = await supabase
          .from('components')
          .select('*')
          .eq('site_id', siteId)
          .order('name')

        const mapped = (fallbackData || []).map((c) => ({
          ...c,
          component_position: c.position || 'content',
        })) as unknown as ComponentLibraryItem[]
        setComponents(mapped)
      } else {
        setComponents((data || []) as ComponentLibraryItem[])
      }
    } catch (err) {
      console.error('Load components error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(componentId: string) {
    if (!confirm('Component wirklich löschen?')) return

    try {
      const supabase = createClient()
      await supabase.from('components').delete().eq('id', componentId)
      setComponents(components.filter((c) => c.id !== componentId))
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  // Helper to get position (handles both component_position from RPC and position from direct query)
  const getPosition = (c: ComponentLibraryItem) => c.component_position || c.position

  const filteredComponents = components.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())

    const matchesTab = activeTab === 'all' || getPosition(c) === activeTab

    return matchesSearch && matchesTab
  })

  const headers = components.filter((c) => getPosition(c) === 'header')
  const footers = components.filter((c) => getPosition(c) === 'footer')
  const sections = components.filter((c) => getPosition(c) === 'content')

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5" />
            Component Library
          </DialogTitle>
        </DialogHeader>

        {/* Search & Filter */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Suche Components..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        >
          <TabsList>
            <TabsTrigger value="all">
              Alle ({components.length})
            </TabsTrigger>
            <TabsTrigger value="header">
              Header ({headers.length})
            </TabsTrigger>
            <TabsTrigger value="footer">
              Footer ({footers.length})
            </TabsTrigger>
            <TabsTrigger value="content">
              Sections ({sections.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex-1 mt-4">
            <ScrollArea className="h-[50vh]">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
                </div>
              ) : filteredComponents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
                  <LayoutTemplate className="w-12 h-12 mb-3 opacity-50" />
                  <p>Keine Components gefunden</p>
                  <p className="text-sm">
                    Erstelle einen Header oder Footer mit der AI
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredComponents.map((component) => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      onInsert={onInsert}
                      onEdit={onEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface ComponentCardProps {
  component: ComponentLibraryItem
  onInsert?: (component: ComponentLibraryItem) => void
  onEdit?: (component: ComponentLibraryItem) => void
  onDelete: (id: string) => void
}

function ComponentCard({ component, onInsert, onEdit, onDelete }: ComponentCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white hover:border-purple-300 transition-colors group">
      {/* Preview */}
      <div className="h-32 bg-zinc-100 relative overflow-hidden">
        {component.thumbnail_url ? (
          <img
            src={component.thumbnail_url}
            alt={component.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="w-full h-full transform scale-50 origin-top-left pointer-events-none"
              dangerouslySetInnerHTML={{
                __html: component.html || '<div class="p-4 text-zinc-400">Keine Vorschau</div>',
              }}
            />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onInsert && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onInsert(component)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Einfügen
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(component)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-sm flex items-center gap-1.5">
              {component.name}
              {component.is_global && (
                <Globe className="w-3.5 h-3.5 text-purple-600" />
              )}
            </h4>
            {component.description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                {component.description}
              </p>
            )}
          </div>
          <Badge
            variant={
              (component.component_position || component.position) === 'header'
                ? 'default'
                : (component.component_position || component.position) === 'footer'
                ? 'secondary'
                : 'outline'
            }
            className="text-xs"
          >
            {component.component_position || component.position}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <span className="text-xs text-zinc-400">
            {component.usage_count || 0} Verwendungen
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                navigator.clipboard.writeText(component.html || '')
              }}
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={() => onDelete(component.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
