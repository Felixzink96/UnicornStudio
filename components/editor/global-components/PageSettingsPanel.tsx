'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Settings, LayoutTemplate, Eye, EyeOff, Search, ChevronDown } from 'lucide-react'
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
  [key: string]: string | boolean | undefined // Index signature for Json compatibility
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
  const [seoOpen, setSeoOpen] = useState(false)

  useEffect(() => {
    if (open && siteId && pageId) {
      loadData()
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
        // Load SEO settings
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
    try {
      const supabase = createClient()

      // Clean SEO object - remove empty strings
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

      onUpdate?.()
      onClose()
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
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Page Settings
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Header Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Header
                </h3>
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
                  <Label className="text-sm">Anzeigen</Label>
                </div>
              </div>

              {!settings.hide_header && (
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600">Header Component</Label>
                  <Select
                    value={settings.custom_header_id || 'global'}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        custom_header_id: value === 'global' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
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
                    <div className="p-2 bg-zinc-50 rounded border text-xs">
                      <span className="text-zinc-500">Aktiv: </span>
                      <span className="font-medium">{activeHeader.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Footer Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Footer
                </h3>
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
                  <Label className="text-sm">Anzeigen</Label>
                </div>
              </div>

              {!settings.hide_footer && (
                <div className="space-y-2">
                  <Label className="text-sm text-zinc-600">Footer Component</Label>
                  <Select
                    value={settings.custom_footer_id || 'global'}
                    onValueChange={(value) =>
                      setSettings({
                        ...settings,
                        custom_footer_id: value === 'global' ? null : value,
                      })
                    }
                  >
                    <SelectTrigger>
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
                    <div className="p-2 bg-zinc-50 rounded border text-xs">
                      <span className="text-zinc-500">Aktiv: </span>
                      <span className="font-medium">{activeFooter.name}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* SEO Settings */}
            <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:bg-zinc-50 rounded-lg px-2 -mx-2">
                <h3 className="font-medium flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  SEO Einstellungen
                </h3>
                <ChevronDown className={`w-4 h-4 transition-transform ${seoOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {/* Meta Title */}
                <div className="space-y-2">
                  <Label className="text-sm">Meta Title</Label>
                  <Input
                    value={seo.meta_title || ''}
                    onChange={(e) => setSeo({ ...seo, meta_title: e.target.value })}
                    placeholder={pageName || 'Seitentitel'}
                  />
                  <p className="text-xs text-zinc-500">
                    Überschreibt den Standard-Titel. Leer = Seitenname wird verwendet.
                  </p>
                </div>

                {/* Meta Description */}
                <div className="space-y-2">
                  <Label className="text-sm">Meta Description</Label>
                  <Textarea
                    value={seo.meta_description || ''}
                    onChange={(e) => setSeo({ ...seo, meta_description: e.target.value })}
                    placeholder="Beschreibung für Suchmaschinen..."
                    rows={3}
                  />
                  <p className="text-xs text-zinc-500">
                    {(seo.meta_description?.length || 0)}/160 Zeichen empfohlen
                  </p>
                </div>

                {/* OG Image */}
                <div className="space-y-2">
                  <Label className="text-sm">Social Media Bild (OG Image)</Label>
                  <Input
                    value={seo.og_image || ''}
                    onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-zinc-500">
                    Bild für Facebook, Twitter, LinkedIn etc.
                  </p>
                </div>

                {/* Robots */}
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={seo.robots_index}
                      onCheckedChange={(checked) => setSeo({ ...seo, robots_index: checked })}
                    />
                    <Label className="text-sm">Indexieren</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={seo.robots_follow}
                      onCheckedChange={(checked) => setSeo({ ...seo, robots_follow: checked })}
                    />
                    <Label className="text-sm">Links folgen</Label>
                  </div>
                </div>

                {/* Canonical URL */}
                <div className="space-y-2">
                  <Label className="text-sm">Canonical URL (optional)</Label>
                  <Input
                    value={seo.canonical_url || ''}
                    onChange={(e) => setSeo({ ...seo, canonical_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Info */}
            <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
              <p className="font-medium mb-1">Global Components</p>
              <p className="text-xs">
                Header und Footer werden automatisch auf allen Seiten angezeigt.
                Du kannst sie pro Seite ausblenden oder durch alternative
                Components ersetzen.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
