'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Save,
  Eye,
  Code,
  Settings,
  Palette,
  Plus,
  Trash2,
  GripVertical,
  Box,
  Layers,
  Layout,
  LayoutGrid,
  Sparkles,
  Zap,
  FileCode,
  Type,
  Star,
} from 'lucide-react'
import { createComponent, updateComponent } from '@/lib/supabase/queries/cms-components'
import { getContentTypes } from '@/lib/supabase/queries/content-types'
import { AIComponentGeneratorDialog } from './AIComponentGeneratorDialog'
import type { CMSComponent, CMSComponentType, ComponentVariant, ComponentProp, JSInitStrategy, ContentType } from '@/types/cms'

interface ComponentEditorProps {
  siteId: string
  component?: CMSComponent
}

const typeConfig: Record<CMSComponentType, { label: string; icon: React.ElementType; description: string }> = {
  element: { label: 'Element', icon: Box, description: 'Kleinste UI-Einheit (Button, Input, Badge)' },
  block: { label: 'Block', icon: Layers, description: 'Kombinierte Elemente (Card, Form, Navigation)' },
  section: { label: 'Section', icon: Layout, description: 'Volle Breite, Seitenabschnitte (Hero, Features)' },
  layout: { label: 'Layout', icon: LayoutGrid, description: 'Seitenstruktur (Header, Footer, Sidebar)' },
}

const jsInitStrategies: { value: JSInitStrategy; label: string; description: string }[] = [
  { value: 'immediate', label: 'Sofort', description: 'Script wird sofort ausgeführt' },
  { value: 'domready', label: 'DOM Ready', description: 'Nach DOMContentLoaded (Standard)' },
  { value: 'scroll', label: 'Scroll', description: 'Wenn Element in Viewport sichtbar' },
  { value: 'interaction', label: 'Interaktion', description: 'Bei erstem User-Klick' },
]

const propTypes = ['string', 'number', 'boolean', 'color', 'image', 'select', 'richtext'] as const

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöü]/g, (c) => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[c] || c))
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ComponentEditor({ siteId, component }: ComponentEditorProps) {
  const router = useRouter()
  const isEditing = !!component

  // Basic fields
  const [name, setName] = useState(component?.name || '')
  const [description, setDescription] = useState(component?.description || '')
  const [type, setType] = useState<CMSComponentType>(component?.type || 'block')
  const [category, setCategory] = useState(component?.category || '')

  // Code fields
  const [htmlContent, setHtmlContent] = useState(component?.html || '')
  const [cssContent, setCssContent] = useState(component?.css || '')
  const [jsContent, setJsContent] = useState(component?.js || '')
  const [jsInit, setJsInit] = useState<JSInitStrategy>(component?.js_init || 'domready')

  // AI Integration fields
  const [slug, setSlug] = useState(component?.slug || '')
  const [isRequired, setIsRequired] = useState(component?.is_required || false)
  const [selectedContentTypeIds, setSelectedContentTypeIds] = useState<string[]>(
    component?.content_type_ids || []
  )
  const [aiPrompt, setAiPrompt] = useState(component?.ai_prompt || '')

  // Variants & Props
  const [variants, setVariants] = useState<ComponentVariant[]>(component?.variants || [])
  const [defaultVariant, setDefaultVariantState] = useState(component?.default_variant || '')
  const [props, setProps] = useState<ComponentProp[]>(component?.props || [])

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [activeCodeTab, setActiveCodeTab] = useState('html')

  // Load content types
  useEffect(() => {
    async function loadContentTypes() {
      try {
        const types = await getContentTypes(siteId)
        setContentTypes(types)
      } catch (error) {
        console.error('Failed to load content types:', error)
      }
    }
    loadContentTypes()
  }, [siteId])

  // Auto-generate slug from name (only for new components or if slug is empty)
  useEffect(() => {
    if (!isEditing && name && !slug) {
      setSlug(generateSlug(name))
    }
  }, [name, isEditing, slug])

  const handleSave = async () => {
    if (!name.trim() || !htmlContent.trim()) return

    setIsSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        category: category.trim() || null,
        html: htmlContent,
        css: cssContent.trim() || null,
        js: jsContent.trim() || null,
        js_init: jsInit,
        slug: slug.trim() || null,
        is_required: isRequired,
        content_type_ids: selectedContentTypeIds,
        ai_prompt: aiPrompt.trim() || null,
        variants: variants.length > 0 ? variants : undefined,
        default_variant: defaultVariant || undefined,
        props: props.length > 0 ? props : undefined,
      }

      if (isEditing) {
        await updateComponent(component.id, data)
      } else {
        await createComponent({ ...data, site_id: siteId })
      }

      router.push(`/dashboard/sites/${siteId}/components`)
      router.refresh()
    } catch (error) {
      console.error('Error saving component:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addVariant = () => {
    const newVariant: ComponentVariant = {
      name: `variant-${variants.length + 1}`,
      label: `Variant ${variants.length + 1}`,
      html: '',
    }
    setVariants([...variants, newVariant])
    if (variants.length === 0) {
      setDefaultVariantState(newVariant.name)
    }
  }

  const updateVariant = (index: number, updates: Partial<ComponentVariant>) => {
    setVariants(variants.map((v, i) => (i === index ? { ...v, ...updates } : v)))
  }

  const removeVariant = (index: number) => {
    const variant = variants[index]
    setVariants(variants.filter((_, i) => i !== index))
    if (defaultVariant === variant.name && variants.length > 1) {
      setDefaultVariantState(variants[0].name)
    }
  }

  const setDefaultVariant = (variantName: string) => {
    setDefaultVariantState(variantName)
  }

  const addProp = () => {
    setProps([
      ...props,
      {
        name: '',
        type: 'string',
        label: '',
        default_value: '',
        required: false,
      },
    ])
  }

  const updateProp = (index: number, updates: Partial<ComponentProp>) => {
    setProps(props.map((p, i) => (i === index ? { ...p, ...updates } : p)))
  }

  const removeProp = (index: number) => {
    setProps(props.filter((_, i) => i !== index))
  }

  const toggleContentType = (contentTypeId: string) => {
    setSelectedContentTypeIds((prev) =>
      prev.includes(contentTypeId)
        ? prev.filter((id) => id !== contentTypeId)
        : [...prev, contentTypeId]
    )
  }

  const handleAIGenerated = (generated: {
    name: string
    slug: string
    description: string
    type: CMSComponentType
    category: string
    html: string
    css: string | null
    js: string | null
    js_init: JSInitStrategy
    ai_prompt: string | null
  }) => {
    setName(generated.name)
    setSlug(generated.slug)
    setDescription(generated.description)
    setType(generated.type)
    setCategory(generated.category)
    setHtmlContent(generated.html)
    setCssContent(generated.css || '')
    setJsContent(generated.js || '')
    setJsInit(generated.js_init)
    setAiPrompt(generated.ai_prompt || '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Component bearbeiten' : 'Neue Component erstellen'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Erstelle wiederverwendbare UI-Bausteine mit HTML, CSS und JavaScript
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <AIComponentGeneratorDialog siteId={siteId} onGenerated={handleAIGenerated} />
          )}
          <Button variant="outline" className="border-slate-700 text-slate-300">
            <Eye className="h-4 w-4 mr-2" />
            Vorschau
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !htmlContent.trim() || isSaving}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Speichert...' : 'Speichern'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Grundeinstellungen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-slate-300">Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z.B. Inhaltsverzeichnis"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Slug (AI-Referenz)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="z.B. toc"
                  className="bg-slate-800 border-slate-700 text-white mt-1 font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Eindeutiger Identifier für AI. Wird automatisch generiert.
                </p>
              </div>

              <div>
                <Label className="text-slate-300">Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung der Component..."
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-slate-300">Typ</Label>
                <Select value={type} onValueChange={(v) => setType(v as CMSComponentType)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {(Object.keys(typeConfig) as CMSComponentType[]).map((t) => {
                      const config = typeConfig[t]
                      const Icon = config.icon
                      return (
                        <SelectItem key={t} value={t} className="text-slate-300">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">{typeConfig[type].description}</p>
              </div>

              <div>
                <Label className="text-slate-300">Kategorie</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="z.B. Navigation, Content, CTA"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Integration */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                AI Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Required Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Pflicht-Komponente
                  </Label>
                  <p className="text-xs text-slate-500">
                    AI muss diese Komponente in jedem Beitrag verwenden
                  </p>
                </div>
                <Switch
                  checked={isRequired}
                  onCheckedChange={setIsRequired}
                />
              </div>

              {/* Content Types */}
              <div>
                <Label className="text-slate-300 mb-2 block">Für Content-Types</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {contentTypes.length === 0 ? (
                    <p className="text-sm text-slate-500">Keine Content-Types vorhanden</p>
                  ) : (
                    contentTypes.map((ct) => (
                      <div
                        key={ct.id}
                        className="flex items-center space-x-2 p-2 rounded bg-slate-800 hover:bg-slate-750"
                      >
                        <Checkbox
                          id={ct.id}
                          checked={selectedContentTypeIds.includes(ct.id)}
                          onCheckedChange={() => toggleContentType(ct.id)}
                        />
                        <label
                          htmlFor={ct.id}
                          className="text-sm text-slate-300 cursor-pointer flex-1"
                        >
                          {ct.label_plural}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Leer = für alle Content-Types verfügbar
                </p>
              </div>

              {/* AI Prompt */}
              <div>
                <Label className="text-slate-300">AI-Anweisung</Label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="z.B. Füge am Anfang des Artikels ein, nach der Einleitung..."
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Anweisung für AI, wann/wie diese Komponente verwendet werden soll
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Props */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Props
                </span>
                <Button size="sm" variant="ghost" onClick={addProp}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {props.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Keine Props definiert. Props ermöglichen es, die Component anzupassen.
                </p>
              ) : (
                props.map((prop, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-slate-600" />
                        <Input
                          value={prop.name}
                          onChange={(e) => updateProp(index, { name: e.target.value })}
                          placeholder="prop_name"
                          className="bg-slate-700 border-slate-600 text-white h-8 w-32"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-slate-500 hover:text-red-400"
                        onClick={() => removeProp(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={prop.label}
                        onChange={(e) => updateProp(index, { label: e.target.value })}
                        placeholder="Label"
                        className="bg-slate-700 border-slate-600 text-white h-8"
                      />
                      <Select
                        value={prop.type}
                        onValueChange={(v) => updateProp(index, { type: v as ComponentProp['type'] })}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {propTypes.map((pt) => (
                            <SelectItem key={pt} value={pt} className="text-slate-300">
                              {pt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={prop.default_value?.toString() || ''}
                      onChange={(e) => updateProp(index, { default_value: e.target.value })}
                      placeholder="Default Wert"
                      className="bg-slate-700 border-slate-600 text-white h-8"
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Varianten
                </span>
                <Button size="sm" variant="ghost" onClick={addVariant}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {variants.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Keine Varianten. Varianten sind alternative Versionen der Component.
                </p>
              ) : (
                variants.map((variant, index) => (
                  <div key={index} className="bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={variant.label}
                          onChange={(e) => updateVariant(index, { label: e.target.value })}
                          placeholder="Variant Label"
                          className="bg-slate-700 border-slate-600 text-white h-8 w-40"
                        />
                        {defaultVariant === variant.name && (
                          <Badge className="bg-purple-500/20 text-purple-400">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {defaultVariant !== variant.name && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefaultVariant(variant.name)}
                            className="text-slate-500 hover:text-white text-xs"
                          >
                            Als Default
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-red-400"
                          onClick={() => removeVariant(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={variant.html || ''}
                      onChange={(e) => updateVariant(index, { html: e.target.value })}
                      placeholder="HTML Override..."
                      className="bg-slate-700 border-slate-600 text-white text-sm font-mono"
                      rows={2}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Code Editor */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeCodeTab} onValueChange={setActiveCodeTab} className="h-full">
                <TabsList className="bg-slate-800 border-slate-700 mb-4">
                  <TabsTrigger
                    value="html"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white flex items-center gap-2"
                  >
                    <FileCode className="h-4 w-4" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger
                    value="css"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    CSS
                    {cssContent && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                  </TabsTrigger>
                  <TabsTrigger
                    value="js"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    JavaScript
                    {jsContent && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="mt-0">
                  <p className="text-xs text-slate-500 mb-2">
                    Verwende {'{{prop_name}}'} für dynamische Werte. Nutze data-component=&quot;{slug || 'slug'}&quot; für JS.
                  </p>
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder={`<nav class="toc" data-component="${slug || 'my-component'}">
  <h3>{{title}}</h3>
  <ul class="toc-list">
    {{items}}
  </ul>
</nav>`}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-sm min-h-[500px]"
                  />
                </TabsContent>

                <TabsContent value="css" className="mt-0">
                  <p className="text-xs text-slate-500 mb-2">
                    CSS wird in den Export inkludiert. Verwende CSS-Variablen: var(--color-brand-primary), etc.
                  </p>
                  <Textarea
                    value={cssContent}
                    onChange={(e) => setCssContent(e.target.value)}
                    placeholder={`.toc {
  background: var(--color-neutral-muted);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  margin: 2rem 0;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc a {
  color: var(--color-neutral-foreground);
  text-decoration: none;
}

.toc a:hover {
  color: var(--color-brand-primary);
}`}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-sm min-h-[500px]"
                  />
                </TabsContent>

                <TabsContent value="js" className="mt-0">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1">
                      <Label className="text-slate-400 text-xs">Initialisierung</Label>
                      <Select value={jsInit} onValueChange={(v) => setJsInit(v as JSInitStrategy)}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700">
                          {jsInitStrategies.map((strategy) => (
                            <SelectItem key={strategy.value} value={strategy.value} className="text-slate-300">
                              <div className="flex flex-col">
                                <span>{strategy.label}</span>
                                <span className="text-xs text-slate-500">{strategy.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Vanilla JavaScript. Verwende data-component Attribute zum Selektieren.
                  </p>
                  <Textarea
                    value={jsContent}
                    onChange={(e) => setJsContent(e.target.value)}
                    placeholder={`// Alle Komponenten mit data-component="${slug || 'my-component'}" initialisieren
document.querySelectorAll('[data-component="${slug || 'my-component'}"]').forEach(el => {
  // Finde alle Überschriften im Dokument
  const headings = document.querySelectorAll('h2, h3');
  const list = el.querySelector('.toc-list');

  headings.forEach((heading, index) => {
    // ID setzen falls nicht vorhanden
    if (!heading.id) {
      heading.id = 'heading-' + index;
    }

    // Link erstellen
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + heading.id;
    a.textContent = heading.textContent;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth' });
    });

    li.appendChild(a);
    list.appendChild(li);
  });
});`}
                    className="bg-slate-950 border-slate-700 text-white font-mono text-sm min-h-[450px]"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
