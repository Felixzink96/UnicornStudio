'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Plus,
  FileText,
  ExternalLink,
  Hash,
  Settings,
  X,
  Menu,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { MenuItem, MenuWithItems, CreateMenuItemRequest } from '@/types/menu'

interface Page {
  id: string
  name: string
  slug: string
  is_home?: boolean
}

export default function MenuEditorPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.siteId as string
  const menuId = params.menuId as string

  const [menu, setMenu] = useState<MenuWithItems | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // New item form
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newItemType, setNewItemType] = useState<'page' | 'external' | 'anchor'>('page')
  const [newItemPageId, setNewItemPageId] = useState('')
  const [newItemUrl, setNewItemUrl] = useState('')
  const [newItemAnchor, setNewItemAnchor] = useState('')

  useEffect(() => {
    loadData()
  }, [siteId, menuId])

  async function loadData() {
    try {
      const [menuRes, pagesRes] = await Promise.all([
        fetch(`/api/v1/sites/${siteId}/menus/${menuId}`),
        fetch(`/api/v1/sites/${siteId}/pages`),
      ])

      if (menuRes.ok) {
        const menuData = await menuRes.json()
        setMenu(menuData)
      }

      if (pagesRes.ok) {
        const pagesData = await pagesRes.json()
        setPages(pagesData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    if (!newItemLabel.trim()) return

    const item: CreateMenuItemRequest = {
      menuId: menuId,
      label: newItemLabel,
      linkType: newItemType,
      position: menu?.items?.length || 0,
    }

    if (newItemType === 'page' && newItemPageId) {
      item.pageId = newItemPageId
    } else if (newItemType === 'external' && newItemUrl) {
      item.externalUrl = newItemUrl
      item.target = '_blank'
    } else if (newItemType === 'anchor' && newItemAnchor) {
      item.anchor = newItemAnchor
    }

    try {
      const response = await fetch(`/api/v1/sites/${siteId}/menus/${menuId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })

      if (response.ok) {
        await loadData()
        resetNewItemForm()
        setShowAddItem(false)
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  async function deleteItem(itemId: string) {
    try {
      const response = await fetch(
        `/api/v1/sites/${siteId}/menus/${menuId}/items?itemId=${itemId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setMenu((prev) =>
          prev ? { ...prev, items: prev.items?.filter((i) => i.id !== itemId) } : null
        )
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  async function updateItem(item: MenuItem) {
    try {
      const response = await fetch(
        `/api/v1/sites/${siteId}/menus/${menuId}/items?itemId=${item.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: item.label,
            linkType: item.linkType,
            pageId: item.pageId,
            externalUrl: item.externalUrl,
            anchor: item.anchor,
            target: item.target,
          }),
        }
      )

      if (response.ok) {
        await loadData()
        setEditingItem(null)
      }
    } catch (error) {
      console.error('Failed to update item:', error)
    }
  }

  async function reorderItems(orderedIds: string[]) {
    try {
      await fetch(`/api/v1/sites/${siteId}/menus/${menuId}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
    } catch (error) {
      console.error('Failed to reorder items:', error)
    }
  }

  function handleDragStart(itemId: string) {
    setDraggedItem(itemId)
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetId) return

    const items = menu?.items || []
    const dragIndex = items.findIndex((i) => i.id === draggedItem)
    const targetIndex = items.findIndex((i) => i.id === targetId)

    if (dragIndex === -1 || targetIndex === -1) return

    const newItems = [...items]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(targetIndex, 0, removed)

    setMenu((prev) => (prev ? { ...prev, items: newItems } : null))
  }

  function handleDragEnd() {
    if (menu?.items) {
      reorderItems(menu.items.map((i) => i.id))
    }
    setDraggedItem(null)
  }

  function resetNewItemForm() {
    setNewItemLabel('')
    setNewItemType('page')
    setNewItemPageId('')
    setNewItemUrl('')
    setNewItemAnchor('')
  }

  function getItemUrl(item: MenuItem): string {
    switch (item.linkType) {
      case 'page':
        return item.pageSlug ? `/${item.pageSlug}` : '#'
      case 'external':
        return item.externalUrl || '#'
      case 'anchor':
        return `#${item.anchor || ''}`
      default:
        return '#'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (!menu) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Menü nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/menus`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Menüs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Menu className="h-8 w-8 text-purple-500" />
            {menu.name}
          </h1>
          <p className="text-slate-400 mt-2">
            {menu.position || 'Benutzerdefiniert'} • {menu.items?.length || 0} Items
          </p>
        </div>
        <Button
          onClick={() => setShowAddItem(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Item hinzufügen
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu Items */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5">
          <h2 className="font-semibold text-white mb-4">Menü Items</h2>

          {/* Items List */}
          <div className="space-y-2">
            {(!menu.items || menu.items.length === 0) ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                Noch keine Items - füge das erste hinzu
              </div>
            ) : (
              menu.items.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-move group hover:border-slate-600 transition-colors ${
                    draggedItem === item.id ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-slate-600 group-hover:text-slate-400" />

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{item.label}</div>
                    <div className="text-xs text-slate-500 truncate">{getItemUrl(item)}</div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Settings className="h-4 w-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Pages */}
        <div className="bg-slate-900 rounded-lg border border-slate-800 p-5">
          <h2 className="font-semibold text-white mb-4">Verfügbare Seiten</h2>
          <div className="space-y-2">
            {pages.map((page) => {
              const isInMenu = menu.items?.some((i) => i.pageId === page.id)

              return (
                <button
                  key={page.id}
                  onClick={() => {
                    if (!isInMenu) {
                      setNewItemLabel(page.name)
                      setNewItemType('page')
                      setNewItemPageId(page.id)
                      setShowAddItem(true)
                    }
                  }}
                  disabled={isInMenu}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    isInMenu
                      ? 'bg-slate-800/50 border-slate-700/50 opacity-50 cursor-not-allowed'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600 cursor-pointer'
                  }`}
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{page.name}</div>
                    <div className="text-xs text-slate-500">/{page.slug || ''}</div>
                  </div>
                  {isInMenu && (
                    <span className="text-xs text-slate-500">Im Menü</span>
                  )}
                </button>
              )
            })}

            {/* Quick Add Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setNewItemType('external')
                  setShowAddItem(true)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Externer Link
              </button>
              <button
                onClick={() => {
                  setNewItemType('anchor')
                  setShowAddItem(true)
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white transition-colors"
              >
                <Hash className="h-4 w-4" />
                Anker Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Item hinzufügen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Label</label>
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="Menü-Bezeichnung"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Link-Typ</label>
              <div className="flex gap-2">
                {[
                  { type: 'page', icon: FileText, label: 'Seite' },
                  { type: 'external', icon: ExternalLink, label: 'Extern' },
                  { type: 'anchor', icon: Hash, label: 'Anker' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setNewItemType(type as 'page' | 'external' | 'anchor')}
                    className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-colors ${
                      newItemType === type
                        ? 'border-purple-500 bg-purple-500/10 text-white'
                        : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {newItemType === 'page' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Seite</label>
                <select
                  value={newItemPageId}
                  onChange={(e) => setNewItemPageId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Seite wählen...</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} (/{page.slug || ''})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {newItemType === 'external' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
                <Input
                  type="url"
                  value={newItemUrl}
                  onChange={(e) => setNewItemUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            {newItemType === 'anchor' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Anker</label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-slate-700 border border-r-0 border-slate-600 rounded-l-lg text-slate-400">
                    #
                  </span>
                  <Input
                    value={newItemAnchor}
                    onChange={(e) => setNewItemAnchor(e.target.value)}
                    placeholder="section-name"
                    className="rounded-l-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddItem(false)
                resetNewItemForm()
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={addItem}
              disabled={!newItemLabel.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Hinzufügen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Item bearbeiten</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Label</label>
                <Input
                  value={editingItem.label}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, label: e.target.value })
                  }
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {editingItem.linkType === 'external' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
                  <Input
                    type="url"
                    value={editingItem.externalUrl || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, externalUrl: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}

              {editingItem.linkType === 'anchor' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Anker</label>
                  <Input
                    value={editingItem.anchor || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, anchor: e.target.value })
                    }
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => setEditingItem(null)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => editingItem && updateItem(editingItem)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
