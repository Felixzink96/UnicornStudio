'use client'

import * as React from 'react'
import { Loader2, LayoutTemplate, Eye, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { DetectedComponent } from '@/types/global-components'

export interface GlobalComponentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detectedHeader: DetectedComponent | null
  detectedFooter: DetectedComponent | null
  onSave: (
    headerName: string | null,
    footerName: string | null
  ) => Promise<void>
  onSkip: () => void
}

export function GlobalComponentsDialog({
  open,
  onOpenChange,
  detectedHeader,
  detectedFooter,
  onSave,
  onSkip,
}: GlobalComponentsDialogProps) {
  const [headerName, setHeaderName] = React.useState('Main Header')
  const [footerName, setFooterName] = React.useState('Main Footer')
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState(
    detectedHeader ? 'header' : 'footer'
  )

  // Update default names based on detected components
  React.useEffect(() => {
    if (detectedHeader?.suggestedName) {
      setHeaderName(detectedHeader.suggestedName)
    }
    if (detectedFooter?.suggestedName) {
      setFooterName(detectedFooter.suggestedName)
    }
  }, [detectedHeader, detectedFooter])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(
        detectedHeader ? headerName : null,
        detectedFooter ? footerName : null
      )
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving global components:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasComponents = detectedHeader || detectedFooter

  if (!hasComponents) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Globale Komponenten erkannt
          </DialogTitle>
          <DialogDescription>
            Ich habe Header und/oder Footer in deiner Seite erkannt. Als globale
            Komponenten werden sie automatisch auf allen Seiten angezeigt.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="header"
              disabled={!detectedHeader}
              className="flex items-center gap-1.5"
            >
              {detectedHeader && <Check className="h-4 w-4 text-green-600" />}
              Header
              {detectedHeader && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({detectedHeader.confidence}% Konfidenz)
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="footer"
              disabled={!detectedFooter}
              className="flex items-center gap-1.5"
            >
              {detectedFooter && <Check className="h-4 w-4 text-green-600" />}
              Footer
              {detectedFooter && (
                <span className="text-xs text-muted-foreground ml-1">
                  ({detectedFooter.confidence}% Konfidenz)
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            {detectedHeader && (
              <TabsContent value="header" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="header-name">Name der Komponente</Label>
                  <Input
                    id="header-name"
                    value={headerName}
                    onChange={(e) => setHeaderName(e.target.value)}
                    placeholder="z.B. Main Navigation"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Vorschau
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-lg bg-zinc-50">
                    <div
                      className="p-4"
                      dangerouslySetInnerHTML={{ __html: detectedHeader.html }}
                    />
                  </ScrollArea>
                </div>
              </TabsContent>
            )}

            {detectedFooter && (
              <TabsContent value="footer" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="footer-name">Name der Komponente</Label>
                  <Input
                    id="footer-name"
                    value={footerName}
                    onChange={(e) => setFooterName(e.target.value)}
                    placeholder="z.B. Site Footer"
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Vorschau
                  </Label>
                  <ScrollArea className="h-[300px] border rounded-lg bg-zinc-50">
                    <div
                      className="p-4"
                      dangerouslySetInnerHTML={{ __html: detectedFooter.html }}
                    />
                  </ScrollArea>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>

        <div className="rounded-lg border bg-purple-50 p-4 text-sm text-purple-700">
          <p className="font-medium mb-1">Was passiert beim Speichern?</p>
          <ul className="list-disc list-inside text-xs space-y-1">
            <li>Header/Footer werden als globale Komponenten gespeichert</li>
            <li>Sie erscheinen automatisch auf allen Seiten deiner Website</li>
            <li>Du kannst sie pro Seite ein-/ausblenden oder ersetzen</li>
            <li>Änderungen an der Komponente wirken sich auf alle Seiten aus</li>
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip} disabled={isSaving}>
            Überspringen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Speichern...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Als Global speichern
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default GlobalComponentsDialog
