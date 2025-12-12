'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import { createComponent, updateComponent } from '@/lib/supabase/queries/cms-components'
import type { CMSComponent, CMSComponentType, ComponentVariant, ComponentProp } from '@/types/cms'

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

const propTypes = ['string', 'number', 'boolean', 'color', 'image', 'select', 'richtext'] as const

export function ComponentEditor({ siteId, component }: ComponentEditorProps) {
  const router = useRouter()
  const isEditing = !!component

  const [name, setName] = useState(component?.name || '')
  const [description, setDescription] = useState(component?.description || '')
  const [type, setType] = useState<CMSComponentType>(component?.type || 'element')
  const [category, setCategory] = useState(component?.category || '')
  const [htmlContent, setHtmlContent] = useState(component?.html || '')
  const [variants, setVariants] = useState<ComponentVariant[]>(component?.variants || [])
  const [defaultVariant, setDefaultVariantState] = useState(component?.default_variant || '')
  const [props, setProps] = useState<ComponentProp[]>(component?.props || [])
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Component bearbeiten' : 'Neue Component erstellen'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Erstelle wiederverwendbare UI-Bausteine mit HTML
          </p>
        </div>
        <div className="flex gap-2">
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
                  placeholder="z.B. Primary Button"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
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
                  placeholder="z.B. Buttons, Forms, Cards"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
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
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                HTML Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Verwende {'{{prop_name}}'} für dynamische Werte
                </p>
                <Textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder={`<button class="btn {{variant}}">
  {{text}}
</button>

<style>
.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--color-primary);
  color: white;
}
</style>`}
                  className="bg-slate-950 border-slate-700 text-white font-mono text-sm min-h-[600px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
