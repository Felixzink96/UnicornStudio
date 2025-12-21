'use client'

import { useState, useCallback } from 'react'
import { useEntryEditorStore } from '@/stores/entry-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  X,
  Layers,
  Image as ImageIcon,
  Tag,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Upload,
} from 'lucide-react'
import type { Field, SubField, FieldSettings } from '@/types/cms'
import { nanoid } from 'nanoid'
import { ImagePicker } from '@/components/editor/assets/ImagePicker'

interface FieldRendererProps {
  field: Field | SubField
  value: unknown
  onChange: (value: unknown) => void
  path?: string
}

// Single field renderer
function FieldRenderer({ field, value, onChange, path = '' }: FieldRendererProps) {
  const settings = field.settings as FieldSettings | undefined

  switch (field.type) {
    case 'text':
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={settings?.placeholder || field.label}
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={settings?.placeholder || field.label}
          rows={settings?.rows || 3}
        />
      )

    case 'richtext':
      return (
        <Textarea
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={settings?.placeholder || field.label}
          rows={6}
          className="font-mono text-sm"
        />
      )

    case 'number':
    case 'range':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={String(value || '')}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            placeholder={field.label}
            min={settings?.min}
            max={settings?.max}
            step={settings?.step}
          />
          {settings?.unit && (
            <span className="text-sm text-zinc-500 shrink-0">{settings.unit}</span>
          )}
        </div>
      )

    case 'select':
    case 'radio':
      const selectOptions = settings?.options || []
      return (
        <Select
          value={String(value || '')}
          onValueChange={onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={`${field.label} wählen...`} />
          </SelectTrigger>
          <SelectContent>
            {selectOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'toggle':
    case 'checkbox':
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={Boolean(value)}
            onCheckedChange={onChange}
          />
          {settings?.labelOn && settings?.labelOff && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {value ? settings.labelOn : settings.labelOff}
            </span>
          )}
        </div>
      )

    case 'date':
      return (
        <Input
          type="date"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'datetime':
      return (
        <Input
          type="datetime-local"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'time':
      return (
        <Input
          type="time"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'email':
      return (
        <Input
          type="email"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={settings?.placeholder || 'email@example.com'}
        />
      )

    case 'url':
      return (
        <Input
          type="url"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={settings?.placeholder || 'https://...'}
        />
      )

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value || '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer"
          />
          <Input
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      )

    case 'image':
    case 'file':
      return (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-center">
          {value ? (
            <div className="space-y-2">
              <div className="w-full h-20 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-zinc-400" />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange('')}
              >
                Entfernen
              </Button>
            </div>
          ) : (
            <div className="py-2">
              <ImageIcon className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Datei auswählen</p>
            </div>
          )}
        </div>
      )

    default:
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
        />
      )
  }
}

// Repeater Field Component
interface RepeaterFieldProps {
  field: Field
  value: unknown[]
  onChange: (value: unknown[]) => void
}

function RepeaterField({ field, value, onChange }: RepeaterFieldProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set([0]))
  const subFields = field.sub_fields || []
  const rows = Array.isArray(value) ? value : []
  const settings = field.settings as FieldSettings | undefined

  const addRow = () => {
    const newRow: Record<string, unknown> = {}
    subFields.forEach((sf) => {
      newRow[sf.name] = ''
    })
    onChange([...rows, newRow])
    setExpandedRows((prev) => new Set([...prev, rows.length]))
  }

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index)
    onChange(newRows)
  }

  const updateRow = (index: number, fieldName: string, fieldValue: unknown) => {
    const newRows = [...rows]
    newRows[index] = {
      ...(newRows[index] as Record<string, unknown>),
      [fieldName]: fieldValue,
    }
    onChange(newRows)
  }

  const toggleRow = (index: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const canAddMore = settings?.maxRows ? rows.length < settings.maxRows : true

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-center">
          <p className="text-sm text-zinc-500">Keine Einträge</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => {
            const rowData = row as Record<string, unknown>
            const isExpanded = expandedRows.has(index)
            // Use first text field as preview label
            const previewField = subFields.find((sf) => sf.type === 'text')
            const previewValue = previewField
              ? String(rowData[previewField.name] || `Eintrag ${index + 1}`)
              : `Eintrag ${index + 1}`

            return (
              <div
                key={index}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* Row Header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                  <GripVertical className="h-4 w-4 text-zinc-400 cursor-grab" />
                  <button
                    onClick={() => toggleRow(index)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                      {previewValue.substring(0, 40)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(index)}
                    className="h-7 w-7 p-0 text-zinc-500 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Row Content */}
                {isExpanded && (
                  <div className="p-3 space-y-3 bg-white dark:bg-zinc-900">
                    {subFields.map((subField) => (
                      <div key={subField.name} className="space-y-1.5">
                        <Label className="text-xs">
                          {subField.label}
                          {subField.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <FieldRenderer
                          field={subField}
                          value={rowData[subField.name]}
                          onChange={(val) => updateRow(index, subField.name, val)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canAddMore && (
        <Button
          variant="outline"
          size="sm"
          onClick={addRow}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          {settings?.buttonLabel || 'Hinzufügen'}
        </Button>
      )}
    </div>
  )
}

// Group Field Component
interface GroupFieldProps {
  field: Field
  value: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

function GroupField({ field, value, onChange }: GroupFieldProps) {
  const subFields = field.sub_fields || []
  const groupData = value || {}

  const updateField = (fieldName: string, fieldValue: unknown) => {
    onChange({
      ...groupData,
      [fieldName]: fieldValue,
    })
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-3 bg-zinc-50/50 dark:bg-zinc-800/30">
      {subFields.map((subField) => (
        <div key={subField.name} className="space-y-1.5">
          <Label className="text-xs">
            {subField.label}
            {subField.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <FieldRenderer
            field={subField}
            value={groupData[subField.name]}
            onChange={(val) => updateField(subField.name, val)}
          />
        </div>
      ))}
    </div>
  )
}

// Main Fields Panel
export function EntryFieldsPanel() {
  const [showImagePicker, setShowImagePicker] = useState(false)

  const siteId = useEntryEditorStore((s) => s.siteId)
  const contentType = useEntryEditorStore((s) => s.contentType)
  const fields = useEntryEditorStore((s) => s.fields)
  const data = useEntryEditorStore((s) => s.data)
  const title = useEntryEditorStore((s) => s.title)
  const slug = useEntryEditorStore((s) => s.slug)
  const content = useEntryEditorStore((s) => s.content)
  const excerpt = useEntryEditorStore((s) => s.excerpt)
  const featuredImageUrl = useEntryEditorStore((s) => s.featuredImageUrl)
  const taxonomies = useEntryEditorStore((s) => s.taxonomies)
  const taxonomyTerms = useEntryEditorStore((s) => s.taxonomyTerms)
  const selectedTermIds = useEntryEditorStore((s) => s.selectedTermIds)

  const setTitle = useEntryEditorStore((s) => s.setTitle)
  const setSlug = useEntryEditorStore((s) => s.setSlug)
  const setContent = useEntryEditorStore((s) => s.setContent)
  const setExcerpt = useEntryEditorStore((s) => s.setExcerpt)
  const setFeaturedImageUrl = useEntryEditorStore((s) => s.setFeaturedImageUrl)
  const setFeaturedImageId = useEntryEditorStore((s) => s.setFeaturedImageId)
  const setFieldValue = useEntryEditorStore((s) => s.setFieldValue)
  const toggleTerm = useEntryEditorStore((s) => s.toggleTerm)
  const toggleFieldsPanel = useEntryEditorStore((s) => s.toggleFieldsPanel)

  // Handle image selection from picker
  const handleImageSelect = (url: string, altText?: string, assetId?: string) => {
    setFeaturedImageUrl(url)
    if (assetId) {
      setFeaturedImageId(assetId)
    }
  }

  // Render complex field types
  const renderComplexField = (field: Field) => {
    const value = data[field.name]

    switch (field.type) {
      case 'repeater':
        return (
          <RepeaterField
            field={field}
            value={value as unknown[] || []}
            onChange={(val) => setFieldValue(field.name, val)}
          />
        )

      case 'group':
        return (
          <GroupField
            field={field}
            value={(value as Record<string, unknown>) || {}}
            onChange={(val) => setFieldValue(field.name, val)}
          />
        )

      case 'flexible':
        // TODO: Implement flexible content
        return (
          <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-lg p-4 text-center text-sm text-zinc-500">
            Flexible Content (in Entwicklung)
          </div>
        )

      default:
        return (
          <FieldRenderer
            field={field}
            value={value}
            onChange={(val) => setFieldValue(field.name, val)}
          />
        )
    }
  }

  return (
    <div className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            Felder
          </span>
        </div>
        <button
          onClick={toggleFieldsPanel}
          className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Standard Fields Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Standard-Felder
          </h3>

          {/* Title */}
          {contentType?.has_title && (
            <div className="space-y-2">
              <Label>Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titel eingeben..."
              />
            </div>
          )}

          {/* Slug */}
          {contentType?.has_slug && (
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-pfad"
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Content */}
          {contentType?.has_content && (
            <div className="space-y-2">
              <Label>Inhalt</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hauptinhalt des Beitrags..."
                rows={8}
                className="font-body text-sm"
              />
            </div>
          )}

          {/* Excerpt */}
          {contentType?.has_excerpt && (
            <div className="space-y-2">
              <Label>Auszug</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Kurzbeschreibung..."
                rows={3}
              />
            </div>
          )}

          {/* Featured Image - immer anzeigen */}
          <div className="space-y-2">
            <Label>Beitragsbild</Label>
            {featuredImageUrl ? (
              <div className="relative group">
                <img
                  src={featuredImageUrl}
                  alt="Beitragsbild"
                  className="w-full h-40 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowImagePicker(true)}
                  >
                    Ändern
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setFeaturedImageUrl('')
                      setFeaturedImageId('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowImagePicker(true)}
                className="w-full h-40 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">Bild auswählen oder hochladen</span>
                <span className="text-xs text-zinc-400">
                  Aus Mediathek oder per URL
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Fields */}
        {fields.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Benutzerdefinierte Felder
            </h3>
            {fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label className="flex items-center gap-2">
                  {field.label}
                  {field.required && <span className="text-red-500">*</span>}
                  {field.type === 'repeater' && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                      Repeater
                    </span>
                  )}
                  {field.type === 'group' && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      Gruppe
                    </span>
                  )}
                </Label>
                {field.instructions && (
                  <p className="text-xs text-zinc-500">{field.instructions}</p>
                )}
                {renderComplexField(field)}
              </div>
            ))}
          </div>
        )}

        {/* Taxonomies */}
        {taxonomies.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Taxonomien
            </h3>
            {taxonomies.map((taxonomy) => (
              <div key={taxonomy.id} className="space-y-2">
                <Label>{taxonomy.label_plural}</Label>
                <div className="flex flex-wrap gap-1">
                  {(taxonomyTerms[taxonomy.id] || []).map((term) => (
                    <button
                      key={term.id}
                      onClick={() => toggleTerm(term.id)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        selectedTermIds.includes(term.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {term.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No fields message */}
        {fields.length === 0 && !contentType?.has_excerpt && !contentType?.has_featured_image && taxonomies.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Keine benutzerdefinierten Felder</p>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      {siteId && (
        <ImagePicker
          siteId={siteId}
          open={showImagePicker}
          onOpenChange={setShowImagePicker}
          onSelect={handleImageSelect}
          currentUrl={featuredImageUrl}
        />
      )}
    </div>
  )
}
