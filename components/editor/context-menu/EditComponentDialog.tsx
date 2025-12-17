'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Pencil, Loader2, Trash2, X } from 'lucide-react'

interface ComponentProp {
  name: string
  label: string
  type: 'text' | 'link' | 'image' | 'color' | 'number'
  default: string
  selector: string
  attribute: string
}

interface CmsComponent {
  id: string
  site_id: string
  name: string
  description: string | null
  type: 'element' | 'block' | 'section' | 'layout'
  category: string | null
  html: string
  props: ComponentProp[]
  usage_count: number
  created_at: string
  updated_at: string
}

interface EditComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentId: string | null
  onSaved?: () => void
  onDeleted?: () => void
}

const CATEGORIES = [
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'hero', label: 'Hero' },
  { value: 'cta', label: 'CTA' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'feature', label: 'Feature' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'form', label: 'Formular' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'footer', label: 'Footer' },
  { value: 'other', label: 'Sonstiges' },
]

const TYPE_OPTIONS = [
  { value: 'element', label: 'Element (z.B. Button)' },
  { value: 'block', label: 'Block (z.B. Card)' },
  { value: 'section', label: 'Section (z.B. Hero)' },
  { value: 'layout', label: 'Layout' },
]

export function EditComponentDialog({
  open,
  onOpenChange,
  componentId,
  onSaved,
  onDeleted,
}: EditComponentDialogProps) {
  const [component, setComponent] = useState<CmsComponent | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [type, setType] = useState<string>('block')
  const [props, setProps] = useState<ComponentProp[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const supabase = createClient()

  // Load component when dialog opens
  useEffect(() => {
    if (open && componentId) {
      loadComponent()
    } else if (!open) {
      // Reset state when closing
      setComponent(null)
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [open, componentId])

  const loadComponent = async () => {
    if (!componentId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from('cms_components')
        .select('*')
        .eq('id', componentId)
        .single()

      if (dbError) throw dbError

      // Cast fields to the expected types
      setComponent(data as unknown as CmsComponent)
      setName(data.name)
      setDescription(data.description || '')
      setCategory(data.category || '')
      setType(data.type as 'element' | 'block' | 'section' | 'layout')
      setProps((data.props || []) as unknown as ComponentProp[])
    } catch (err) {
      console.error('Error loading component:', err)
      setError('Fehler beim Laden der Komponente')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!componentId || !name.trim()) {
      setError('Name ist erforderlich')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('cms_components')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
          type: type as 'element' | 'block' | 'section' | 'layout',
          props: props as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', componentId)

      if (dbError) throw dbError

      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      console.error('Error saving component:', err)
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!componentId) return

    setDeleting(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('cms_components')
        .delete()
        .eq('id', componentId)

      if (dbError) throw dbError

      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      console.error('Error deleting component:', err)
      setError('Fehler beim Löschen')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const updateProp = (index: number, field: keyof ComponentProp, value: string) => {
    const newProps = [...props]
    newProps[index] = { ...newProps[index], [field]: value }
    setProps(newProps)
  }

  const removeProp = (index: number) => {
    setProps(props.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-purple-500" />
            Komponente bearbeiten
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          {component?.html && (
            <div className="rounded-lg border bg-white overflow-hidden">
              <p className="text-[10px] text-zinc-400 px-3 pt-2 pb-1 bg-zinc-50 border-b">Vorschau:</p>
              <iframe
                srcDoc={`<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 8px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>${component.html}</body>
</html>`}
                className="w-full h-32 border-0"
                sandbox="allow-scripts"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Komponenten-Name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung..."
              rows={2}
            />
          </div>

          {/* Type & Category Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Props Editor */}
          {props.length > 0 && (
            <div className="space-y-3 p-3 bg-zinc-50 rounded-lg border">
              <Label className="text-sm font-medium">
                Variablen ({props.length})
              </Label>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {props.map((prop, index) => (
                  <div key={index} className="p-2 bg-white rounded border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-700 truncate flex-1">
                        {prop.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            prop.type === 'image' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            prop.type === 'link' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-zinc-50'
                          }`}
                        >
                          {prop.type === 'image' ? 'Bild' : prop.type === 'link' ? 'URL' : 'Text'}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-300 hover:text-red-500"
                          onClick={() => removeProp(index)}
                          title="Entfernen"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={prop.default}
                      onChange={(e) => updateProp(index, 'default', e.target.value)}
                      placeholder="Standardwert..."
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Usage Info */}
          {component && (
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t">
              <span>Verwendet: {component.usage_count}x</span>
              <span>Erstellt: {new Date(component.created_at).toLocaleDateString('de-DE')}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 mb-3">
                Komponente wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Endgültig löschen'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting || showDeleteConfirm}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Löschen
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving || deleting}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
