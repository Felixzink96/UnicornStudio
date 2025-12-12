'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Plus,
  Trash2,
  GripVertical,
  Braces,
} from 'lucide-react'
import { createTemplate, updateTemplate } from '@/lib/supabase/queries/templates'
import type { Template, TemplateType, TemplateCondition } from '@/types/cms'

interface TemplateEditorProps {
  siteId: string
  template?: Template
}

const templateTypes: { value: TemplateType; label: string; description: string }[] = [
  { value: 'page', label: 'Seite', description: 'Standard-Seitenvorlage' },
  { value: 'single', label: 'Einzelansicht', description: 'Template für einzelne Einträge' },
  { value: 'archive', label: 'Archiv', description: 'Liste von Einträgen' },
  { value: 'taxonomy', label: 'Taxonomie', description: 'Kategorie/Tag-Seiten' },
]

const conditionOperators = [
  { value: 'equals', label: 'ist gleich' },
  { value: 'not_equals', label: 'ist nicht gleich' },
  { value: 'contains', label: 'enthält' },
  { value: 'not_contains', label: 'enthält nicht' },
  { value: 'starts_with', label: 'beginnt mit' },
  { value: 'ends_with', label: 'endet mit' },
  { value: 'is_empty', label: 'ist leer' },
  { value: 'is_not_empty', label: 'ist nicht leer' },
  { value: 'greater_than', label: 'größer als' },
  { value: 'less_than', label: 'kleiner als' },
] as const

export function TemplateEditor({ siteId, template }: TemplateEditorProps) {
  const router = useRouter()
  const isEditing = !!template

  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [type, setType] = useState<TemplateType>(template?.type || 'page')
  const [htmlContent, setHtmlContent] = useState(template?.html || '')
  const [isDefault, setIsDefault] = useState(template?.is_default || false)
  const [priority, setPriority] = useState(template?.priority || 10)
  const [conditions, setConditions] = useState<TemplateCondition[]>(template?.conditions || [])
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || !htmlContent.trim()) return

    setIsSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        html: htmlContent,
        is_default: isDefault,
        priority,
        conditions: conditions.length > 0 ? conditions : null,
      }

      if (isEditing) {
        await updateTemplate(template.id, data)
      } else {
        await createTemplate({ ...data, site_id: siteId })
      }

      router.push(`/dashboard/sites/${siteId}/templates`)
      router.refresh()
    } catch (error) {
      console.error('Error saving template:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: '',
        operator: 'equals',
        value: '',
      },
    ])
  }

  const updateCondition = (index: number, updates: Partial<TemplateCondition>) => {
    setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)))
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {isEditing ? 'Template bearbeiten' : 'Neues Template erstellen'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Definiere das Layout für deine Inhalte
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
                  placeholder="z.B. Blog Post Layout"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>

              <div>
                <Label className="text-slate-300">Beschreibung</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kurze Beschreibung des Templates..."
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label className="text-slate-300">Template Typ</Label>
                <Select value={type} onValueChange={(v) => setType(v as TemplateType)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {templateTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-slate-300">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {templateTypes.find((t) => t.value === type)?.description}
                </p>
              </div>

              <div>
                <Label className="text-slate-300">Priorität</Label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 10)}
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Höhere Priorität = wird bevorzugt verwendet
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-slate-300">Standard Template</Label>
                  <p className="text-xs text-slate-500">
                    Als Fallback verwenden
                  </p>
                </div>
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Braces className="h-5 w-5" />
                  Bedingungen
                </span>
                <Button size="sm" variant="ghost" onClick={addCondition}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {conditions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Keine Bedingungen. Das Template wird immer verwendet (wenn Default).
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-500">
                    Template wird nur verwendet wenn alle Bedingungen erfüllt sind
                  </p>
                  {conditions.map((condition, index) => (
                    <div key={index} className="bg-slate-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-slate-600" />
                          <Badge className="bg-slate-700 text-slate-300">
                            {index === 0 ? 'Wenn' : 'Und'}
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-slate-500 hover:text-red-400"
                          onClick={() => removeCondition(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={condition.field}
                          onChange={(e) => updateCondition(index, { field: e.target.value })}
                          placeholder="Feld"
                          className="bg-slate-700 border-slate-600 text-white h-8"
                        />
                        <Select
                          value={condition.operator}
                          onValueChange={(v) =>
                            updateCondition(index, { operator: v as TemplateCondition['operator'] })
                          }
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            {conditionOperators.map((op) => (
                              <SelectItem key={op.value} value={op.value} className="text-slate-300">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                          <Input
                            value={condition.value?.toString() || ''}
                            onChange={(e) => updateCondition(index, { value: e.target.value })}
                            placeholder="Wert"
                            className="bg-slate-700 border-slate-600 text-white h-8"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          {/* Available Variables */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Verfügbare Variablen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">
                Verwende diese Variablen im HTML Template
              </p>
              <div className="space-y-1 text-sm font-mono">
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{entry.title}}'}
                  </code>
                  <span className="text-slate-500">Titel</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{entry.slug}}'}
                  </code>
                  <span className="text-slate-500">Slug</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{entry.content}}'}
                  </code>
                  <span className="text-slate-500">Inhalt</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{entry.data.field_name}}'}
                  </code>
                  <span className="text-slate-500">Custom Field</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{site.name}}'}
                  </code>
                  <span className="text-slate-500">Site Name</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{#each items}}'}
                  </code>
                  <span className="text-slate-500">Loop</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="bg-slate-800 px-2 py-0.5 rounded text-purple-400">
                    {'{{#if condition}}'}
                  </code>
                  <span className="text-slate-500">Bedingung</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Code Editor */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                HTML Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder={`<article class="blog-post">
  <header>
    <h1>{{entry.title}}</h1>
    <time>{{entry.published_at}}</time>
  </header>

  <div class="content">
    {{entry.data.content}}
  </div>

  {{#if entry.data.author}}
  <footer>
    <p>Von {{entry.data.author}}</p>
  </footer>
  {{/if}}
</article>

<style>
.blog-post {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
</style>`}
                className="bg-slate-950 border-slate-700 text-white font-mono text-sm min-h-[650px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
