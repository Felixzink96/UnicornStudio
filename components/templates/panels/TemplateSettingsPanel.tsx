'use client'

import { useEffect, useState } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Settings, FileText, Archive, Tag, Layout } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ContentType, TemplateType } from '@/types/cms'

const TEMPLATE_TYPES: { value: TemplateType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    value: 'page',
    label: 'Seite',
    icon: <Layout className="h-4 w-4" />,
    description: 'Standard-Seitenvorlage',
  },
  {
    value: 'single',
    label: 'Einzelansicht',
    icon: <FileText className="h-4 w-4" />,
    description: 'Template für einzelne Einträge',
  },
  {
    value: 'archive',
    label: 'Archiv',
    icon: <Archive className="h-4 w-4" />,
    description: 'Liste von Einträgen',
  },
  {
    value: 'taxonomy',
    label: 'Taxonomie',
    icon: <Tag className="h-4 w-4" />,
    description: 'Kategorie/Tag-Seiten',
  },
]

export function TemplateSettingsPanel() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([])
  const [loading, setLoading] = useState(true)

  const siteId = useTemplateEditorStore((s) => s.siteId)
  const name = useTemplateEditorStore((s) => s.name)
  const templateType = useTemplateEditorStore((s) => s.templateType)
  const contentType = useTemplateEditorStore((s) => s.contentType)
  const isDefault = useTemplateEditorStore((s) => s.isDefault)

  const setName = useTemplateEditorStore((s) => s.setName)
  const setTemplateType = useTemplateEditorStore((s) => s.setTemplateType)
  const setContentType = useTemplateEditorStore((s) => s.setContentType)
  const setIsDefault = useTemplateEditorStore((s) => s.setIsDefault)
  const toggleSettingsPanel = useTemplateEditorStore((s) => s.toggleSettingsPanel)

  // Load content types
  useEffect(() => {
    if (!siteId) return

    const loadContentTypes = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data } = await supabase
        .from('content_types')
        .select('*')
        .eq('site_id', siteId)
        .order('name')

      setContentTypes((data || []) as ContentType[])
      setLoading(false)
    }

    loadContentTypes()
  }, [siteId])

  // Handle content type change
  const handleContentTypeChange = (ctId: string) => {
    if (ctId === 'none') {
      setContentType(null)
    } else {
      const ct = contentTypes.find((c) => c.id === ctId)
      setContentType(ct || null)
    }
  }

  return (
    <div className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-500" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            Einstellungen
          </span>
        </div>
        <button
          onClick={toggleSettingsPanel}
          className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Template Name */}
        <div className="space-y-2">
          <Label htmlFor="template-name">Template Name</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Blog-Archiv"
          />
        </div>

        {/* Template Type */}
        <div className="space-y-2">
          <Label>Template Typ</Label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setTemplateType(type.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  templateType === type.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={
                      templateType === type.value
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-zinc-500'
                    }
                  >
                    {type.icon}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      templateType === type.value
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {type.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Content Type (for single/archive) */}
        {(templateType === 'single' || templateType === 'archive') && (
          <div className="space-y-2">
            <Label htmlFor="content-type">Content-Type</Label>
            <Select
              value={contentType?.id || 'none'}
              onValueChange={handleContentTypeChange}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Content-Type wählen..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Content-Type</SelectItem>
                {contentTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.label_plural}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Das Template wird für diesen Content-Type verwendet.
            </p>
          </div>
        )}

        {/* Default Template */}
        <div className="flex items-center justify-between py-2">
          <div>
            <Label htmlFor="is-default" className="cursor-pointer">
              Standard-Template
            </Label>
            <p className="text-xs text-zinc-500 mt-0.5">
              Wird verwendet wenn kein spezifisches Template passt
            </p>
          </div>
          <Switch
            id="is-default"
            checked={isDefault}
            onCheckedChange={setIsDefault}
          />
        </div>

        {/* Template Info */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Template-Info
          </h4>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Typ:</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">
                {TEMPLATE_TYPES.find((t) => t.value === templateType)?.label || templateType}
              </dd>
            </div>
            {contentType && (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Content-Type:</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{contentType.label_plural}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-zinc-500">Standard:</dt>
              <dd className="text-zinc-700 dark:text-zinc-300">{isDefault ? 'Ja' : 'Nein'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
