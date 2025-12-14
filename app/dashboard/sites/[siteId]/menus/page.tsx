'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  Plus,
  Trash2,
  ChevronRight,
  LayoutTemplate,
  Footprints,
  Smartphone,
  Grid3X3,
  ArrowLeft,
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
import type { MenuListItem } from '@/types/menu'

const PositionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  header: LayoutTemplate,
  footer: Footprints,
  mobile: Smartphone,
  custom: Grid3X3,
}

const PositionLabels: Record<string, string> = {
  header: 'Header Navigation',
  footer: 'Footer Links',
  mobile: 'Mobile Menu',
  custom: 'Benutzerdefiniert',
}

export default function MenusPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.siteId as string

  const [menus, setMenus] = useState<MenuListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuPosition, setNewMenuPosition] = useState<'header' | 'footer' | 'mobile' | 'custom'>('header')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadMenus()
  }, [siteId])

  async function loadMenus() {
    try {
      const response = await fetch(`/api/v1/sites/${siteId}/menus`)
      if (response.ok) {
        const data = await response.json()
        setMenus(data)
      }
    } catch (error) {
      console.error('Failed to load menus:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createMenu() {
    if (!newMenuName.trim()) return

    setCreating(true)
    try {
      const slug = newMenuName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      const response = await fetch(`/api/v1/sites/${siteId}/menus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMenuName,
          slug,
          position: newMenuPosition,
        }),
      })

      if (response.ok) {
        const menu = await response.json()
        setShowCreateModal(false)
        setNewMenuName('')
        router.push(`/dashboard/sites/${siteId}/menus/${menu.id}`)
      }
    } catch (error) {
      console.error('Failed to create menu:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteMenu(menuId: string) {
    if (!confirm('Menu wirklich löschen?')) return

    try {
      const response = await fetch(`/api/v1/sites/${siteId}/menus/${menuId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMenus(menus.filter((m) => m.id !== menuId))
      }
    } catch (error) {
      console.error('Failed to delete menu:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Menu className="h-8 w-8 text-purple-500" />
            Menüs
          </h1>
          <p className="text-slate-400 mt-2">
            Verwalte die Navigation deiner Website
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Menü
        </Button>
      </div>

      {/* Menu List */}
      {menus.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
            <Menu className="h-8 w-8 text-slate-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Noch keine Menüs
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Erstelle dein erstes Menü für die Navigation
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Menü erstellen
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menus.map((menu) => {
            const PositionIcon = PositionIcons[menu.menu_position || 'custom'] || Grid3X3

            return (
              <Link
                key={menu.id}
                href={`/dashboard/sites/${siteId}/menus/${menu.id}`}
                className="group p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/20">
                    <PositionIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
                      {menu.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {PositionLabels[menu.menu_position || 'custom']}
                    </p>
                    <p className="text-xs text-slate-600 mt-2">
                      {menu.item_count || 0} {(menu.item_count || 0) === 1 ? 'Item' : 'Items'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        deleteMenu(menu.id)
                      }}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Neues Menü erstellen</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <Input
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="z.B. Hauptmenü, Footer Links"
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Position</label>
              <div className="grid grid-cols-2 gap-2">
                {(['header', 'footer', 'mobile', 'custom'] as const).map((pos) => {
                  const Icon = PositionIcons[pos]
                  return (
                    <button
                      key={pos}
                      onClick={() => setNewMenuPosition(pos)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        newMenuPosition === pos
                          ? 'border-purple-500 bg-purple-500/10 text-white'
                          : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{PositionLabels[pos]}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              onClick={() => setShowCreateModal(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={createMenu}
              disabled={!newMenuName.trim() || creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Erstelle...
                </>
              ) : (
                'Erstellen'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
