'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Image,
  ShoppingBag,
  Calendar,
  Users,
  Bookmark,
  Layers,
  Save,
  Loader2,
  Settings,
  Tags,
  Search,
} from 'lucide-react'
import { createContentType, updateContentType } from '@/lib/supabase/queries/content-types'
import type { ContentType, ContentTypeInsert, Taxonomy } from '@/types/cms'

// Available icons
const ICONS = [
  { value: 'file-text', label: 'Dokument', icon: FileText },
  { value: 'image', label: 'Bild', icon: Image },
  { value: 'shopping-bag', label: 'Shop', icon: ShoppingBag },
  { value: 'calendar', label: 'Kalender', icon: Calendar },
  { value: 'users', label: 'Personen', icon: Users },
  { value: 'bookmark', label: 'Lesezeichen', icon: Bookmark },
  { value: 'layers', label: 'Layers', icon: Layers },
]

// Color presets
const COLORS = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
]

interface ContentTypeFormProps {
  siteId: string
  contentType?: ContentType
  taxonomies: Taxonomy[]
}

export function ContentTypeForm({
  siteId,
  contentType,
  taxonomies,
}: ContentTypeFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('general')

  // Form state
  const [formData, setFormData] = useState<ContentTypeInsert>({
    site_id: siteId,
    name: contentType?.name || '',
    label_singular: contentType?.label_singular || '',
    label_plural: contentType?.label_plural || '',
    slug: contentType?.slug || '',
    icon: contentType?.icon || 'file-text',
    description: contentType?.description || '',
    color: contentType?.color || '#8b5cf6',
    has_title: contentType?.has_title ?? true,
    has_slug: contentType?.has_slug ?? true,
    has_content: contentType?.has_content ?? false,
    has_excerpt: contentType?.has_excerpt ?? false,
    has_featured_image: contentType?.has_featured_image ?? false,
    has_author: contentType?.has_author ?? false,
    has_published_date: contentType?.has_published_date ?? true,
    has_seo: contentType?.has_seo ?? true,
    has_archive: contentType?.has_archive ?? true,
    has_single: contentType?.has_single ?? true,
    default_sort_field: contentType?.default_sort_field || 'created_at',
    default_sort_order: contentType?.default_sort_order || 'desc',
    show_in_menu: contentType?.show_in_menu ?? true,
  })

  // Auto-generate slug from label_plural
  const handleLabelPluralChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      label_plural: value,
      slug: prev.slug || generateSlug(value),
    }))
  }

  // Auto-generate name from label_singular
  const handleLabelSingularChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      label_singular: value,
      name: prev.name || generateName(value),
    }))
  }

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const generateName = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (contentType) {
        await updateContentType(contentType.id, formData)
      } else {
        await createContentType(formData)
      }
      router.push(`/dashboard/sites/${siteId}/builder/content-types`)
      router.refresh()
    } catch (error) {
      console.error('Error saving content type:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const IconPreview = ICONS.find((i) => i.value === formData.icon)?.icon || FileText

  return (
    <form onSubmit={handleSubmit}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger
            value="general"
            className="data-[state=active]:bg-slate-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Allgemein
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="data-[state=active]:bg-slate-700"
          >
            <Layers className="h-4 w-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger
            value="seo"
            className="data-[state=active]:bg-slate-700"
          >
            <Search className="h-4 w-4 mr-2" />
            SEO
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Grundeinstellungen</CardTitle>
              <CardDescription className="text-slate-400">
                Name und Erscheinungsbild des Content Types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preview */}
              <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-lg">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${formData.color}20` }}
                >
                  <IconPreview
                    className="h-6 w-6"
                    style={{ color: formData.color || '#8b5cf6' }}
                  />
                </div>
                <div>
                  <p className="font-medium text-white">
                    {formData.label_plural || 'Content Type Name'}
                  </p>
                  <p className="text-sm text-slate-400">
                    /{formData.slug || 'slug'}
                  </p>
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="label_singular" className="text-slate-300">
                    Name (Singular) *
                  </Label>
                  <Input
                    id="label_singular"
                    value={formData.label_singular}
                    onChange={(e) => handleLabelSingularChange(e.target.value)}
                    placeholder="z.B. Blog Post"
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label_plural" className="text-slate-300">
                    Name (Plural) *
                  </Label>
                  <Input
                    id="label_plural"
                    value={formData.label_plural}
                    onChange={(e) => handleLabelPluralChange(e.target.value)}
                    placeholder="z.B. Blog Posts"
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Interner Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="z.B. blog_post"
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    Wird intern zur Identifikation verwendet
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug" className="text-slate-300">
                    URL Slug *
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="z.B. blog"
                    className="bg-slate-800 border-slate-700 text-white font-mono"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    URL: /dashboard/sites/.../content/{formData.slug || 'slug'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-slate-300">
                  Beschreibung
                </Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Kurze Beschreibung des Content Types..."
                  className="bg-slate-800 border-slate-700 text-white"
                  rows={2}
                />
              </div>

              {/* Icon and Color */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Icon</Label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((iconOption) => {
                      const Icon = iconOption.icon
                      return (
                        <button
                          key={iconOption.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              icon: iconOption.value,
                            }))
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            formData.icon === iconOption.value
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                          title={iconOption.label}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Farbe</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, color }))
                        }
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          formData.color === color
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Standard-Felder</CardTitle>
              <CardDescription className="text-slate-400">
                Welche Standardfelder sollen verfügbar sein?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Titel</Label>
                    <p className="text-xs text-slate-500">Hauptüberschrift</p>
                  </div>
                  <Switch
                    checked={formData.has_title}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_title: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Slug</Label>
                    <p className="text-xs text-slate-500">URL-Pfad</p>
                  </div>
                  <Switch
                    checked={formData.has_slug}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_slug: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Inhalt</Label>
                    <p className="text-xs text-slate-500">Rich Text Editor</p>
                  </div>
                  <Switch
                    checked={formData.has_content}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_content: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Auszug</Label>
                    <p className="text-xs text-slate-500">Kurzbeschreibung</p>
                  </div>
                  <Switch
                    checked={formData.has_excerpt}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_excerpt: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Beitragsbild</Label>
                    <p className="text-xs text-slate-500">Featured Image</p>
                  </div>
                  <Switch
                    checked={formData.has_featured_image}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        has_featured_image: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Autor</Label>
                    <p className="text-xs text-slate-500">Verfasser</p>
                  </div>
                  <Switch
                    checked={formData.has_author}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_author: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Veröffentlichungsdatum</Label>
                    <p className="text-xs text-slate-500">Publish Date</p>
                  </div>
                  <Switch
                    checked={formData.has_published_date}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        has_published_date: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">SEO</Label>
                    <p className="text-xs text-slate-500">Meta-Daten</p>
                  </div>
                  <Switch
                    checked={formData.has_seo}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_seo: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Seiten-Typen</CardTitle>
              <CardDescription className="text-slate-400">
                Welche Seitentypen sollen generiert werden?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Archiv-Seite</Label>
                    <p className="text-xs text-slate-500">
                      Übersichtsseite mit allen Einträgen
                    </p>
                  </div>
                  <Switch
                    checked={formData.has_archive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_archive: checked }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <Label className="text-white">Einzelseite</Label>
                    <p className="text-xs text-slate-500">
                      Detailseite für jeden Eintrag
                    </p>
                  </div>
                  <Switch
                    checked={formData.has_single}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, has_single: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Sortierung</CardTitle>
              <CardDescription className="text-slate-400">
                Standard-Sortierung für die Übersicht
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Sortierfeld</Label>
                  <Select
                    value={formData.default_sort_field}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        default_sort_field: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="created_at">Erstellungsdatum</SelectItem>
                      <SelectItem value="updated_at">Änderungsdatum</SelectItem>
                      <SelectItem value="published_at">
                        Veröffentlichungsdatum
                      </SelectItem>
                      <SelectItem value="title">Titel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Reihenfolge</Label>
                  <Select
                    value={formData.default_sort_order}
                    onValueChange={(value: 'asc' | 'desc') =>
                      setFormData((prev) => ({
                        ...prev,
                        default_sort_order: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="desc">Absteigend (neueste zuerst)</SelectItem>
                      <SelectItem value="asc">Aufsteigend (älteste zuerst)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">SEO Template</CardTitle>
              <CardDescription className="text-slate-400">
                Standard-Muster für Meta-Tags
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Title Pattern</Label>
                <Input
                  placeholder="{{title}} | {{site_name}}"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
                <p className="text-xs text-slate-500">
                  Verfügbare Variablen: {'{{title}}'}, {'{{site_name}}'}, {'{{excerpt}}'}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Description Pattern</Label>
                <Input
                  placeholder="{{excerpt}}"
                  className="bg-slate-800 border-slate-700 text-white font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Schema Type</Label>
                <Select defaultValue="Article">
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="BlogPosting">Blog Post</SelectItem>
                    <SelectItem value="Product">Produkt</SelectItem>
                    <SelectItem value="Recipe">Rezept</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="FAQPage">FAQ</SelectItem>
                    <SelectItem value="HowTo">Anleitung</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 mt-6">
        <Button
          type="button"
          variant="outline"
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
          onClick={() => router.back()}
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Speichern...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {contentType ? 'Änderungen speichern' : 'Content Type erstellen'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
