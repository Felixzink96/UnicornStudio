'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
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
import { LayoutTemplate, Loader2, Save } from 'lucide-react'

interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string
  html: string
  onSaved?: () => void
}

const CATEGORIES = [
  { value: 'hero', label: 'Hero' },
  { value: 'features', label: 'Features' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'testimonials', label: 'Testimonials' },
  { value: 'faq', label: 'FAQ' },
  { value: 'cta', label: 'CTA' },
  { value: 'team', label: 'Team' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'contact', label: 'Contact' },
  { value: 'stats', label: 'Stats' },
  { value: 'footer', label: 'Footer' },
  { value: 'header', label: 'Header' },
]

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  siteId,
  html,
  onSaved,
}: SaveAsTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Bitte gib einen Namen ein')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: dbError } = await supabase.from('templates').insert({
        site_id: siteId,
        name: name.trim(),
        description: description.trim() || null,
        html: html,
        category: category || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        type: 'page',
      })

      if (dbError) throw dbError

      onOpenChange(false)
      onSaved?.()

      // Reset form
      setName('')
      setDescription('')
      setCategory('')
      setTags('')
    } catch (err) {
      console.error('Error saving template:', err)
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <LayoutTemplate className="h-5 w-5 text-purple-500" />
            Als Template speichern
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Name *</Label>
            <Input
              id="name"
              placeholder="z.B. Hero mit Bild"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Kurze Beschreibung des Templates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-800 border-slate-700 resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-slate-800 border-slate-700">
                <SelectValue placeholder="Kategorie wählen..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-slate-300">Tags</Label>
            <Input
              id="tags"
              placeholder="z.B. modern, minimal, dark (kommagetrennt)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
