'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Settings,
  LayoutTemplate,
  Eye,
  EyeOff,
  Search,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { GlobalComponent, PageComponentSettings } from '@/types/global-components'

interface PageSEO {
  meta_title?: string
  meta_description?: string
  og_title?: string
  og_description?: string
  og_image?: string
  robots_index?: boolean
  robots_follow?: boolean
  canonical_url?: string
  [key: string]: string | boolean | undefined
}

interface PageSettingsPanelProps {
  open: boolean
  onClose: () => void
  siteId: string
  pageId: string
  onUpdate?: () => void
}

export function PageSettingsPanel({
  open,
  onClose,
  siteId,
  pageId,
  onUpdate,
}: PageSettingsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [headers, setHeaders] = useState<GlobalComponent[]>([])
  const [footers, setFooters] = useState<GlobalComponent[]>([])
  const [settings, setSettings] = useState<PageComponentSettings>({
    hide_header: false,
    hide_footer: false,
    custom_header_id: null,
    custom_footer_id: null,
  })
  const [globalHeaderId, setGlobalHeaderId] = useState<string | null>(null)
  const [globalFooterId, setGlobalFooterId] = useState<string | null>(null)
  const [pageName, setPageName] = useState('')
  const [seo, setSeo] = useState<PageSEO>({
    meta_title: '',
    meta_description: '',
    og_title: '',
    og_description: '',
    og_image: '',
    robots_index: true,
    robots_follow: true,
    canonical_url: '',
  })
  const [activeTab, setActiveTab] = useState<'layout' | 'seo'>('layout')

  useEffect(() => {
    if (open && siteId && pageId) {
      loadData()
      setSaved(false)
    }
  }, [open, siteId, pageId])

  async function loadData() {
    setLoading(true)
    try {
      const supabase = createClient()

      // Load components
      const { data: components } = await supabase
        .from('components')
        .select('*')
        .eq('site_id', siteId)
        .in('position', ['header', 'footer'])
        .order('name')

      if (components) {
        setHeaders(components.filter((c) => c.position === 'header') as GlobalComponent[])
        setFooters(components.filter((c) => c.position === 'footer') as GlobalComponent[])
      }

      // Load site global settings
      const { data: site } = await supabase
        .from('sites')
        .select('global_header_id, global_footer_id')
        .eq('id', siteId)
        .single()

      if (site) {
        setGlobalHeaderId(site.global_header_id)
        setGlobalFooterId(site.global_footer_id)
      }

      // Load page settings including SEO
      const { data: page } = await supabase
        .from('pages')
        .select('name, hide_header, hide_footer, custom_header_id, custom_footer_id, seo')
        .eq('id', pageId)
        .single()

      if (page) {
        setPageName(page.name || '')
        setSettings({
          hide_header: page.hide_header || false,
          hide_footer: page.hide_footer || false,
          custom_header_id: page.custom_header_id || null,
          custom_footer_id: page.custom_footer_id || null,
        })
        const pageSeo = (page.seo as PageSEO) || {}
        setSeo({
          meta_title: pageSeo.meta_title || '',
          meta_description: pageSeo.meta_description || '',
          og_title: pageSeo.og_title || '',
          og_description: pageSeo.og_description || '',
          og_image: pageSeo.og_image || '',
          robots_index: pageSeo.robots_index ?? true,
          robots_follow: pageSeo.robots_follow ?? true,
          canonical_url: pageSeo.canonical_url || '',
        })
      }
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const supabase = createClient()

      const cleanSeo: PageSEO = {}
      if (seo.meta_title) cleanSeo.meta_title = seo.meta_title
      if (seo.meta_description) cleanSeo.meta_description = seo.meta_description
      if (seo.og_title) cleanSeo.og_title = seo.og_title
      if (seo.og_description) cleanSeo.og_description = seo.og_description
      if (seo.og_image) cleanSeo.og_image = seo.og_image
      if (seo.canonical_url) cleanSeo.canonical_url = seo.canonical_url
      cleanSeo.robots_index = seo.robots_index
      cleanSeo.robots_follow = seo.robots_follow

      const { error } = await supabase
        .from('pages')
        .update({
          hide_header: settings.hide_header,
          hide_footer: settings.hide_footer,
          custom_header_id: settings.custom_header_id,
          custom_footer_id: settings.custom_footer_id,
          seo: cleanSeo,
        })
        .eq('id', pageId)

      if (error) throw error

      setSaved(true)
      onUpdate?.()

      // Auto-close after success
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const activeHeaderId = settings.custom_header_id || globalHeaderId
  const activeFooterId = settings.custom_footer_id || globalFooterId
  const activeHeader = headers.find((h) => h.id === activeHeaderId)
  const activeFooter = footers.find((f) => f.id === activeFooterId)

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="!max-w-lg w-[95vw] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900">
        <VisuallyHidden>
          <DialogTitle>Page Settings</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Page Settings
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {pageName || 'Seite'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            <button
              onClick={() => setActiveTab('layout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'layout'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <LayoutTemplate className="h-3.5 w-3.5" />
              Layout
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'seo'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              SEO
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[400px] overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : activeTab === 'layout' ? (
            <div className="space-y-6">
              {/* Header Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Header</h3>
                  <div className="flex items-center gap-2">
                    {settings.hide_header ? (
                      <EyeOff className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-green-600" />
                    )}
                    <Switch
                      checked={!settings.hide_header}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, hide_header: !checked })
                      }
                    />
                    <Label className="text-xs text-zinc-500">Anzeigen</Label>
                  </div>
                </div>

                {!settings.hide_header && (
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Header Component</Label>
                    <Select
                      value={settings.custom_header_id || 'global'}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          custom_header_id: value === 'global' ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-zinc-50 dark:bg-zinc-800">
                        <SelectValue placeholder="Global Header verwenden" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">
                          {globalHeaderId
                            ? `Global: ${headers.find((h) => h.id === globalHeaderId)?.name || 'Header'}`
                            : 'Kein Global Header'}
                        </SelectItem>
                        {headers.map((header) => (
                          <SelectItem key={header.id} value={header.id}>
                            {header.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {activeHeader && (
                      <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                        <span className="text-zinc-500">Aktiv: </span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeHeader.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-700" />

              {/* Footer Settings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Footer</h3>
                  <div className="flex items-center gap-2">
                    {settings.hide_footer ? (
                      <EyeOff className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-green-600" />
                    )}
                    <Switch
                      checked={!settings.hide_footer}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, hide_footer: !checked })
                      }
                    />
                    <Label className="text-xs text-zinc-500">Anzeigen</Label>
                  </div>
                </div>

                {!settings.hide_footer && (
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-500">Footer Component</Label>
                    <Select
                      value={settings.custom_footer_id || 'global'}
                      onValueChange={(value) =>
                        setSettings({
                          ...settings,
                          custom_footer_id: value === 'global' ? null : value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-zinc-50 dark:bg-zinc-800">
                        <SelectValue placeholder="Global Footer verwenden" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">
                          {globalFooterId
                            ? `Global: ${footers.find((f) => f.id === globalFooterId)?.name || 'Footer'}`
                            : 'Kein Global Footer'}
                        </SelectItem>
                        {footers.map((footer) => (
                          <SelectItem key={footer.id} value={footer.id}>
                            {footer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {activeFooter && (
                      <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                        <span className="text-zinc-500">Aktiv: </span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{activeFooter.name}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                <p className="font-medium mb-1 text-xs">Global Components</p>
                <p className="text-xs opacity-80">
                  Header und Footer werden automatisch auf allen Seiten angezeigt.
                  Du kannst sie pro Seite ausblenden oder ersetzen.
                </p>
              </div>
            </div>
          ) : (
            /* SEO Tab */
            <div className="space-y-5">
              {/* Meta Title */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Meta Title
                </Label>
                <Input
                  value={seo.meta_title || ''}
                  onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
                  placeholder={pageName || 'Seitentitel'}
                  className="bg-zinc-50 dark:bg-zinc-800"
                />
                <p className="text-[10px] text-zinc-400">
                  Überschreibt den Standard-Titel. Leer = Seitenname wird verwendet.
                </p>
              </div>

              {/* Meta Description */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Meta Description
                </Label>
                <Textarea
                  value={seo.meta_description || ''}
                  onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
                  placeholder="Beschreibung für Suchmaschinen..."
                  rows={3}
                  className="bg-zinc-50 dark:bg-zinc-800 resize-none"
                />
                <div className="flex justify-between">
                  <p className="text-[10px] text-zinc-400">
                    Wichtig für SEO und Social Media Vorschauen
                  </p>
                  <span className={`text-[10px] ${(seo.meta_description?.length || 0) > 160 ? 'text-amber-500' : 'text-zinc-400'}`}>
                    {seo.meta_description?.length || 0}/160
                  </span>
                </div>
              </div>

              {/* OG Image */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Social Media Bild (OG Image)
                </Label>
                <Input
                  value={seo.og_image || ''}
                  onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                  placeholder="https://..."
                  className="bg-zinc-50 dark:bg-zinc-800"
                />
                <p className="text-[10px] text-zinc-400">
                  Bild für Facebook, Twitter, LinkedIn etc. (1200x630px empfohlen)
                </p>
              </div>

              {/* Robots */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg space-y-3">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Suchmaschinen
                </Label>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={seo.robots_index}
                      onCheckedChange={(checked) => setSeo({ ...seo, robots_index: checked })}
                    />
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">Indexieren</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={seo.robots_follow}
                      onCheckedChange={(checked) => setSeo({ ...seo, robots_follow: checked })}
                    />
                    <Label className="text-xs text-zinc-600 dark:text-zinc-400">Links folgen</Label>
                  </div>
                </div>
              </div>

              {/* Canonical URL */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Canonical URL (optional)
                </Label>
                <Input
                  value={seo.canonical_url || ''}
                  onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-zinc-50 dark:bg-zinc-800"
                />
                <p className="text-[10px] text-zinc-400">
                  Nur setzen wenn diese Seite eine Kopie einer anderen URL ist.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            disabled={saving}
          >
            Abbrechen
          </button>

          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="min-w-[120px]"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <>
                <Check className="h-4 w-4 mr-1.5" />
                Gespeichert
              </>
            ) : (
              'Speichern'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
