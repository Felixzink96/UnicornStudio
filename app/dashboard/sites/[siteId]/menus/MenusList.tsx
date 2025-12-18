'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { createClient } from '@/lib/supabase/client'

interface MenuListItem {
  id: string
  name: string
  slug: string
  description?: string
  menu_position: string
  item_count: number
}

interface MenusListProps {
  siteId: string
  initialMenus: MenuListItem[]
}

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

export function MenusList({ siteId, initialMenus }: MenusListProps) {
  const router = useRouter()
  const [menus, setMenus] = useState<MenuListItem[]>(initialMenus)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')
  const [newMenuPosition, setNewMenuPosition] = useState<'header' | 'footer' | 'mobile' | 'custom'>('header')
  const [creating, setCreating] = useState(false)

  async function createMenu() {
    if (!newMenuName.trim()) return

    setCreating(true)
    try {
      const supabase = createClient()
      const slug = newMenuName.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('menus')
        .insert({
          site_id: siteId,
          name: newMenuName,
          slug,
          position: newMenuPosition,
        })
        .select('id')
        .single()

      if (error) throw error

      setShowCreateModal(false)
      setNewMenuName('')
      router.push(`/dashboard/sites/${siteId}/menus/${data.id}`)
    } catch (error) {
      console.error('Failed to create menu:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteMenu(menuId: string) {
    if (!confirm('Menü wirklich löschen?')) return

    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('menus')
        .delete()
        .eq('id', menuId)

      if (error) throw error

      setMenus(menus.filter((m) => m.id !== menuId))
    } catch (error) {
      console.error('Failed to delete menu:', error)
    }
  }

  if (menus.length === 0) {
    return (
      <>
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Menu className="h-8 w-8 text-zinc-600 dark:text-zinc-400" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Noch keine Menüs
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
            Erstelle dein erstes Menü für die Navigation
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Menü erstellen
          </Button>
        </div>

        <CreateMenuModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          newMenuName={newMenuName}
          setNewMenuName={setNewMenuName}
          newMenuPosition={newMenuPosition}
          setNewMenuPosition={setNewMenuPosition}
          creating={creating}
          onSubmit={createMenu}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Menü
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menus.map((menu) => {
          const PositionIcon = PositionIcons[menu.menu_position || 'custom'] || Grid3X3

          return (
            <Link
              key={menu.id}
              href={`/dashboard/sites/${siteId}/menus/${menu.id}`}
              className="group p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <PositionIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-500 transition-colors truncate">
                    {menu.name}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {PositionLabels[menu.menu_position || 'custom']}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                    {menu.item_count || 0} {(menu.item_count || 0) === 1 ? 'Item' : 'Items'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      deleteMenu(menu.id)
                    }}
                    className="p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <CreateMenuModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        newMenuName={newMenuName}
        setNewMenuName={setNewMenuName}
        newMenuPosition={newMenuPosition}
        setNewMenuPosition={setNewMenuPosition}
        creating={creating}
        onSubmit={createMenu}
      />
    </>
  )
}

interface CreateMenuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newMenuName: string
  setNewMenuName: (name: string) => void
  newMenuPosition: 'header' | 'footer' | 'mobile' | 'custom'
  setNewMenuPosition: (pos: 'header' | 'footer' | 'mobile' | 'custom') => void
  creating: boolean
  onSubmit: () => void
}

function CreateMenuModal({
  open,
  onOpenChange,
  newMenuName,
  setNewMenuName,
  newMenuPosition,
  setNewMenuPosition,
  creating,
  onSubmit,
}: CreateMenuModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neues Menü erstellen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">Name</label>
            <Input
              value={newMenuName}
              onChange={(e) => setNewMenuName(e.target.value)}
              placeholder="z.B. Hauptmenü, Footer Links"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">Position</label>
            <div className="grid grid-cols-2 gap-2">
              {(['header', 'footer', 'mobile', 'custom'] as const).map((pos) => {
                const Icon = PositionIcons[pos]
                return (
                  <button
                    key={pos}
                    onClick={() => setNewMenuPosition(pos)}
                    className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                      newMenuPosition === pos
                        ? 'border-purple-500 bg-purple-500/10 text-zinc-900 dark:text-zinc-100'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'
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
            onClick={() => onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!newMenuName.trim() || creating}
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
  )
}
