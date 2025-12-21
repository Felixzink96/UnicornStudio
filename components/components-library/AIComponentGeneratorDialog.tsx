'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Loader2 } from 'lucide-react'
import type { CMSComponentType, JSInitStrategy } from '@/types/cms'

interface GeneratedComponent {
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
}

interface AIComponentGeneratorDialogProps {
  siteId: string
  onGenerated: (component: GeneratedComponent) => void
}

export function AIComponentGeneratorDialog({
  siteId,
  onGenerated,
}: AIComponentGeneratorDialogProps) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [componentType, setComponentType] = useState<CMSComponentType>('block')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          siteId,
          componentType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Fehler bei der Generierung')
      }

      const generated = await response.json()
      onGenerated(generated)
      setOpen(false)
      setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
          <Sparkles className="h-4 w-4 mr-2" />
          Mit AI erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            Komponente mit AI erstellen
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Beschreibe die gewünschte Komponente. AI generiert HTML, CSS und JavaScript.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label className="text-slate-300">Komponenten-Typ</Label>
            <Select value={componentType} onValueChange={(v) => setComponentType(v as CMSComponentType)}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="element" className="text-slate-300">
                  Element (Button, Input, Badge)
                </SelectItem>
                <SelectItem value="block" className="text-slate-300">
                  Block (Card, Info-Box, Zitat)
                </SelectItem>
                <SelectItem value="section" className="text-slate-300">
                  Section (Hero, Features, CTA)
                </SelectItem>
                <SelectItem value="layout" className="text-slate-300">
                  Layout (Header, Footer, Sidebar)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Beschreibung</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="z.B. Ein Inhaltsverzeichnis das automatisch alle H2/H3 Überschriften findet und smooth scrollt"
              className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[120px]"
            />
            <p className="text-xs text-slate-500 mt-1">
              Sei so spezifisch wie möglich. Beschreibe Funktionalität, Aussehen und Verhalten.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Beispiele:</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• &quot;Inhaltsverzeichnis mit smooth scroll&quot;</li>
              <li>• &quot;FAQ Akkordeon mit animiertem Auf/Zuklappen&quot;</li>
              <li>• &quot;Info-Box mit Icon und farbigem Rand&quot;</li>
              <li>• &quot;Pro/Contra Vergleichstabelle&quot;</li>
              <li>• &quot;Call-to-Action Box mit Gradient&quot;</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-slate-700 text-slate-300"
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
