'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Mail,
  Save,
  Loader2,
  Settings,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

interface FormConfig {
  recipient_email: string
  subject: string
  success_message: string
  error_message: string
  cc: string[]
  bcc: string[]
  reply_to: string
  send_via_wordpress: boolean
}

interface FormConfigPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentId: string
  componentName: string
  initialConfig?: Partial<FormConfig>
  onSave?: (config: FormConfig) => void
}

const DEFAULT_CONFIG: FormConfig = {
  recipient_email: '',
  subject: 'Neue Formular-Nachricht',
  success_message: 'Vielen Dank! Ihre Nachricht wurde erfolgreich gesendet.',
  error_message: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.',
  cc: [],
  bcc: [],
  reply_to: '',
  send_via_wordpress: true,
}

export function FormConfigPanel({
  open,
  onOpenChange,
  componentId,
  componentName,
  initialConfig,
  onSave,
}: FormConfigPanelProps) {
  const [config, setConfig] = useState<FormConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    if (initialConfig) {
      setConfig({ ...DEFAULT_CONFIG, ...initialConfig })
    }
  }, [initialConfig])

  const handleSave = async () => {
    if (!config.recipient_email) {
      setError('Bitte gib eine Empfänger-E-Mail ein')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from('components')
        .update({ form_config: config })
        .eq('id', componentId)

      if (dbError) throw dbError

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSave?.(config)
    } catch (err) {
      console.error('Error saving form config:', err)
      setError('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const updateField = <K extends keyof FormConfig>(
    field: K,
    value: FormConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-slate-900 border-slate-700 w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-white">
            <Settings className="h-5 w-5 text-purple-500" />
            Formular-Einstellungen
          </SheetTitle>
          <p className="text-sm text-slate-400">{componentName}</p>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Recipient Email */}
          <div className="space-y-2">
            <Label className="text-slate-300">Empfänger-E-Mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                placeholder="empfaenger@beispiel.de"
                value={config.recipient_email}
                onChange={(e) => updateField('recipient_email', e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-slate-300">Betreff</Label>
            <Input
              placeholder="Neue Formular-Nachricht"
              value={config.subject}
              onChange={(e) => updateField('subject', e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>

          {/* Reply-To */}
          <div className="space-y-2">
            <Label className="text-slate-300">Reply-To (optional)</Label>
            <Input
              type="email"
              placeholder="antwort@beispiel.de"
              value={config.reply_to}
              onChange={(e) => updateField('reply_to', e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
            <p className="text-xs text-slate-500">
              Antworten gehen an diese Adresse statt an den Absender
            </p>
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label className="text-slate-300">CC (optional)</Label>
            <Input
              placeholder="cc1@beispiel.de, cc2@beispiel.de"
              value={config.cc.join(', ')}
              onChange={(e) =>
                updateField(
                  'cc',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              className="bg-slate-800 border-slate-700"
            />
          </div>

          {/* BCC */}
          <div className="space-y-2">
            <Label className="text-slate-300">BCC (optional)</Label>
            <Input
              placeholder="bcc@beispiel.de"
              value={config.bcc.join(', ')}
              onChange={(e) =>
                updateField(
                  'bcc',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                )
              }
              className="bg-slate-800 border-slate-700"
            />
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <Label className="text-slate-300">Erfolgsmeldung</Label>
            <Textarea
              placeholder="Vielen Dank für Ihre Nachricht!"
              value={config.success_message}
              onChange={(e) => updateField('success_message', e.target.value)}
              className="bg-slate-800 border-slate-700 resize-none"
              rows={2}
            />
          </div>

          {/* Error Message */}
          <div className="space-y-2">
            <Label className="text-slate-300">Fehlermeldung</Label>
            <Textarea
              placeholder="Es ist ein Fehler aufgetreten..."
              value={config.error_message}
              onChange={(e) => updateField('error_message', e.target.value)}
              className="bg-slate-800 border-slate-700 resize-none"
              rows={2}
            />
          </div>

          {/* WordPress SMTP */}
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <div>
              <Label className="text-slate-300">Via WordPress senden</Label>
              <p className="text-xs text-slate-500">
                Nutzt WordPress SMTP für den Versand
              </p>
            </div>
            <Switch
              checked={config.send_via_wordpress}
              onCheckedChange={(checked) =>
                updateField('send_via_wordpress', checked)
              }
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? 'Gespeichert!' : 'Speichern'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
