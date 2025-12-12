'use client'

import { useState, useEffect } from 'react'
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
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { FIELD_TYPES, generateFieldName } from '@/lib/content/field-types'
import type {
  Field,
  FieldType,
  FieldInsert,
  FieldSettings,
  FieldWidth,
  ContentType,
  Taxonomy,
  SubField,
} from '@/types/cms'

interface FieldFormProps {
  field?: Field
  fieldType: FieldType
  onSave: (data: FieldInsert | Partial<FieldInsert>) => void
  onCancel: () => void
  taxonomies: Taxonomy[]
  allContentTypes: ContentType[]
}

export function FieldForm({
  field,
  fieldType,
  onSave,
  onCancel,
  taxonomies,
  allContentTypes,
}: FieldFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fieldConfig = FIELD_TYPES[fieldType]

  // Form state
  const [label, setLabel] = useState(field?.label || '')
  const [name, setName] = useState(field?.name || '')
  const [instructions, setInstructions] = useState(field?.instructions || '')
  const [placeholder, setPlaceholder] = useState(field?.placeholder || '')
  const [required, setRequired] = useState(field?.required || false)
  const [width, setWidth] = useState<FieldWidth>(field?.width || '100%')
  const [settings, setSettings] = useState<FieldSettings>(field?.settings || {})
  const [subFields, setSubFields] = useState<SubField[]>(field?.sub_fields || [])

  // Auto-generate name from label
  useEffect(() => {
    if (!field && label && !name) {
      setName(generateFieldName(label))
    }
  }, [label, field, name])

  // Initialize settings with defaults
  useEffect(() => {
    if (!field) {
      const defaults: FieldSettings = {}
      for (const setting of fieldConfig.settings) {
        if (setting.default !== undefined) {
          (defaults as Record<string, unknown>)[setting.name] = setting.default
        }
      }
      setSettings(defaults)
    }
  }, [field, fieldConfig])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const data: Partial<FieldInsert> = {
        label,
        name,
        type: fieldType,
        instructions: instructions || undefined,
        placeholder: placeholder || undefined,
        required,
        width,
        settings,
      }

      if (fieldConfig.hasSubFields) {
        data.sub_fields = subFields
      }

      await onSave(data)
    } catch (error) {
      console.error('Error saving field:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetting = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  // Add option to options array (for select, radio, checkbox)
  const addOption = () => {
    const currentOptions = (settings.options || []) as { value: string; label: string }[]
    updateSetting('options', [...currentOptions, { value: '', label: '' }])
  }

  const updateOption = (index: number, field: 'value' | 'label', value: string) => {
    const currentOptions = [...((settings.options || []) as { value: string; label: string }[])]
    currentOptions[index] = { ...currentOptions[index], [field]: value }

    // Auto-generate value from label if value is empty
    if (field === 'label' && !currentOptions[index].value) {
      currentOptions[index].value = generateFieldName(value)
    }

    updateSetting('options', currentOptions)
  }

  const removeOption = (index: number) => {
    const currentOptions = [...((settings.options || []) as { value: string; label: string }[])]
    currentOptions.splice(index, 1)
    updateSetting('options', currentOptions)
  }

  // Add sub-field (for group, repeater)
  const addSubField = () => {
    setSubFields((prev) => [
      ...prev,
      { name: '', label: '', type: 'text' as FieldType },
    ])
  }

  const updateSubField = (index: number, updates: Partial<SubField>) => {
    setSubFields((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }

      // Auto-generate name from label
      if (updates.label && !next[index].name) {
        next[index].name = generateFieldName(updates.label)
      }

      return next
    })
  }

  const removeSubField = (index: number) => {
    setSubFields((prev) => prev.filter((_, i) => i !== index))
  }

  // Render setting input based on type
  const renderSettingInput = (setting: (typeof fieldConfig.settings)[0]) => {
    const value = settings[setting.name]

    switch (setting.type) {
      case 'text':
        return (
          <Input
            value={(value as string) || ''}
            onChange={(e) => updateSetting(setting.name, e.target.value)}
            placeholder={setting.label}
            className="bg-slate-800 border-slate-700 text-white"
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) =>
              updateSetting(
                setting.name,
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            placeholder={setting.label}
            className="bg-slate-800 border-slate-700 text-white"
          />
        )

      case 'toggle':
        return (
          <Switch
            checked={(value as boolean) || false}
            onCheckedChange={(checked) => updateSetting(setting.name, checked)}
          />
        )

      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => updateSetting(setting.name, v)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder={setting.label} />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {setting.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        const selectedValues = (value as string[]) || []
        return (
          <div className="flex flex-wrap gap-2">
            {setting.options?.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const isSelected = selectedValues.includes(opt.value)
                  updateSetting(
                    setting.name,
                    isSelected
                      ? selectedValues.filter((v) => v !== opt.value)
                      : [...selectedValues, opt.value]
                  )
                }}
                className={`px-2 py-1 rounded text-sm transition-colors ${
                  selectedValues.includes(opt.value)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )

      case 'content-type-select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => updateSetting(setting.name, v)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Content Type wählen" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {allContentTypes.map((ct) => (
                <SelectItem key={ct.id} value={ct.id}>
                  {ct.label_plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'taxonomy-select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(v) => updateSetting(setting.name, v)}
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Taxonomie wählen" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {taxonomies.map((tax) => (
                <SelectItem key={tax.id} value={tax.id}>
                  {tax.label_plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'options-builder':
        const options = (value as { value: string; label: string }[]) || []
        return (
          <div className="space-y-2">
            {options.map((opt, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={opt.label}
                  onChange={(e) => updateOption(index, 'label', e.target.value)}
                  placeholder="Label"
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
                <Input
                  value={opt.value}
                  onChange={(e) => updateOption(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="bg-slate-800 border-slate-700 text-white font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              className="border-slate-700 text-slate-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Option hinzufügen
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Label *</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="z.B. Preis"
            className="bg-slate-800 border-slate-700 text-white"
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-300">Name (Key) *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. preis"
            className="bg-slate-800 border-slate-700 text-white font-mono"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">Hilfetext</Label>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Anweisungen für den Benutzer..."
          className="bg-slate-800 border-slate-700 text-white"
          rows={2}
        />
      </div>

      {/* Type-specific settings */}
      {fieldConfig.settings.length > 0 && (
        <>
          <Separator className="bg-slate-700" />
          <div className="space-y-4">
            <h3 className="font-medium text-white">Einstellungen</h3>
            {fieldConfig.settings.map((setting) => (
              <div
                key={setting.name}
                className={
                  setting.type === 'toggle'
                    ? 'flex items-center justify-between'
                    : 'space-y-2'
                }
              >
                <Label className="text-slate-300">{setting.label}</Label>
                {renderSettingInput(setting)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sub-fields for group/repeater */}
      {fieldConfig.hasSubFields && (
        <>
          <Separator className="bg-slate-700" />
          <div className="space-y-4">
            <h3 className="font-medium text-white">Unterfelder</h3>
            {subFields.map((subField, index) => (
              <Card key={index} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Feld {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSubField(index)}
                      className="text-slate-400 hover:text-red-400 h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Label</Label>
                      <Input
                        value={subField.label}
                        onChange={(e) =>
                          updateSubField(index, { label: e.target.value })
                        }
                        placeholder="Label"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Name</Label>
                      <Input
                        value={subField.name}
                        onChange={(e) =>
                          updateSubField(index, { name: e.target.value })
                        }
                        placeholder="name"
                        className="bg-slate-900 border-slate-600 text-white font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">Typ</Label>
                      <Select
                        value={subField.type}
                        onValueChange={(v) =>
                          updateSubField(index, { type: v as FieldType })
                        }
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="number">Zahl</SelectItem>
                          <SelectItem value="image">Bild</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="toggle">Toggle</SelectItem>
                          <SelectItem value="date">Datum</SelectItem>
                          <SelectItem value="color">Farbe</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addSubField}
              className="w-full border-dashed border-slate-700 text-slate-400 hover:text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Unterfeld hinzufügen
            </Button>
          </div>
        </>
      )}

      {/* Layout & Validation */}
      <Separator className="bg-slate-700" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-300">Breite</Label>
          <Select value={width} onValueChange={(v) => setWidth(v as FieldWidth)}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="100%">100% (Volle Breite)</SelectItem>
              <SelectItem value="50%">50% (Halbe Breite)</SelectItem>
              <SelectItem value="33%">33% (Drittel)</SelectItem>
              <SelectItem value="25%">25% (Viertel)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between pt-6">
          <Label className="text-slate-300">Pflichtfeld</Label>
          <Switch checked={required} onCheckedChange={setRequired} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !label || !name}
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
              {field ? 'Speichern' : 'Feld hinzufügen'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
