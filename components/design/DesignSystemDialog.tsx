'use client'

import * as React from 'react'
import { Loader2, Palette, Type, Ruler, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ColorTokenPicker } from './ColorTokenPicker'
import { FontSelector } from './FontSelector'
import {
  SpacingSelector,
  SECTION_PADDING_OPTIONS,
  CONTAINER_WIDTH_OPTIONS,
  CARD_GAP_OPTIONS,
  BORDER_RADIUS_OPTIONS,
} from './SpacingSelector'
import type { SuggestedTokens } from '@/lib/design/style-extractor'
import type { DetectedFont } from '@/lib/fonts/font-detector'
import { formatBytes, estimateDownloadSize } from '@/lib/fonts/google-fonts-api'

export interface DesignSystemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  suggestedTokens: SuggestedTokens
  detectedFonts: DetectedFont[]
  onSave: (tokens: SuggestedTokens, downloadFonts: boolean) => Promise<void>
  onSkip: () => void
}

export function DesignSystemDialog({
  open,
  onOpenChange,
  suggestedTokens,
  detectedFonts,
  onSave,
  onSkip,
}: DesignSystemDialogProps) {
  const [tokens, setTokens] = React.useState<SuggestedTokens>(suggestedTokens)
  const [downloadFonts, setDownloadFonts] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Update tokens when suggestedTokens change
  React.useEffect(() => {
    setTokens(suggestedTokens)
  }, [suggestedTokens])

  const googleFonts = detectedFonts.filter((f) => f.source === 'google')
  const estimatedSize = estimateDownloadSize(googleFonts)

  const handleColorChange = (key: keyof SuggestedTokens['colors'], value: string) => {
    setTokens((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value,
      },
    }))
  }

  const handleFontChange = (key: keyof SuggestedTokens['fonts'], value: string) => {
    setTokens((prev) => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [key]: value,
      },
    }))
  }

  const handleSpacingChange = (key: keyof SuggestedTokens['spacing'], value: string) => {
    setTokens((prev) => ({
      ...prev,
      spacing: {
        ...prev.spacing,
        [key]: value,
      },
    }))
  }

  const handleRadiiChange = (key: keyof SuggestedTokens['radii'], value: string) => {
    setTokens((prev) => ({
      ...prev,
      radii: {
        ...prev.radii,
        [key]: value,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(tokens, downloadFonts)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving design system:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Design System erstellen
          </DialogTitle>
          <DialogDescription>
            Ich habe folgende Styles in deiner Seite erkannt. Du kannst sie anpassen,
            bevor sie als Design Tokens gespeichert werden.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="colors" className="flex items-center gap-1.5">
              <Palette className="h-4 w-4" />
              Farben
            </TabsTrigger>
            <TabsTrigger value="fonts" className="flex items-center gap-1.5">
              <Type className="h-4 w-4" />
              Schriften
            </TabsTrigger>
            <TabsTrigger value="spacing" className="flex items-center gap-1.5">
              <Ruler className="h-4 w-4" />
              Abstände
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="colors" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <ColorTokenPicker
                  label="Primary"
                  description="Buttons, CTAs, Akzente"
                  value={tokens.colors.primary}
                  onChange={(v) => handleColorChange('primary', v)}
                />
                <ColorTokenPicker
                  label="Primary Hover"
                  description="Hover-State für Primary"
                  value={tokens.colors.primaryHover}
                  onChange={(v) => handleColorChange('primaryHover', v)}
                />
                <ColorTokenPicker
                  label="Secondary"
                  description="Sekundäre Elemente"
                  value={tokens.colors.secondary}
                  onChange={(v) => handleColorChange('secondary', v)}
                />
                <ColorTokenPicker
                  label="Accent"
                  description="Highlights, Badges"
                  value={tokens.colors.accent}
                  onChange={(v) => handleColorChange('accent', v)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <ColorTokenPicker
                  label="Background"
                  description="Seitenhintergrund"
                  value={tokens.colors.background}
                  onChange={(v) => handleColorChange('background', v)}
                />
                <ColorTokenPicker
                  label="Foreground"
                  description="Haupttext"
                  value={tokens.colors.foreground}
                  onChange={(v) => handleColorChange('foreground', v)}
                />
                <ColorTokenPicker
                  label="Muted"
                  description="Subtile Hintergründe"
                  value={tokens.colors.muted}
                  onChange={(v) => handleColorChange('muted', v)}
                />
                <ColorTokenPicker
                  label="Border"
                  description="Rahmen, Trennlinien"
                  value={tokens.colors.border}
                  onChange={(v) => handleColorChange('border', v)}
                />
              </div>
            </TabsContent>

            <TabsContent value="fonts" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <FontSelector
                  label="Überschriften"
                  description="H1 - H6"
                  value={tokens.fonts.heading}
                  onChange={(v) => handleFontChange('heading', v)}
                />
                <FontSelector
                  label="Fließtext"
                  description="Paragraphen, Listen"
                  value={tokens.fonts.body}
                  onChange={(v) => handleFontChange('body', v)}
                />
              </div>

              {googleFonts.length > 0 && (
                <>
                  <Separator />

                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="download-fonts"
                        checked={downloadFonts}
                        onCheckedChange={(checked) =>
                          setDownloadFonts(checked === true)
                        }
                      />
                      <div className="grid gap-1.5 leading-none">
                        <Label
                          htmlFor="download-fonts"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Google Fonts lokal speichern (DSGVO-konform)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Die folgenden Fonts werden heruntergeladen und auf deinem
                          Server gehostet:
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {googleFonts.map((font) => (
                            <span
                              key={font.name}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background text-xs"
                            >
                              <Download className="h-3 w-3" />
                              {font.name}
                              <span className="text-muted-foreground">
                                ({font.weights.length} Varianten)
                              </span>
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Geschätzte Größe: ~{formatBytes(estimatedSize)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="spacing" className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <SpacingSelector
                  label="Section Padding"
                  description="Abstand oben/unten"
                  value={tokens.spacing.section}
                  onChange={(v) => handleSpacingChange('section', v)}
                  options={SECTION_PADDING_OPTIONS}
                />
                <SpacingSelector
                  label="Container Breite"
                  description="Max. Inhaltsbreite"
                  value={tokens.spacing.container}
                  onChange={(v) => handleSpacingChange('container', v)}
                  options={CONTAINER_WIDTH_OPTIONS}
                />
                <SpacingSelector
                  label="Card Gap"
                  description="Abstand zwischen Karten"
                  value={tokens.spacing.cardGap}
                  onChange={(v) => handleSpacingChange('cardGap', v)}
                  options={CARD_GAP_OPTIONS}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <SpacingSelector
                  label="Border Radius"
                  description="Standard Eckenradius"
                  value={tokens.radii.default}
                  onChange={(v) => handleRadiiChange('default', v)}
                  options={BORDER_RADIUS_OPTIONS}
                />
                <SpacingSelector
                  label="Border Radius (Groß)"
                  description="Für Cards, Modals"
                  value={tokens.radii.lg}
                  onChange={(v) => handleRadiiChange('lg', v)}
                  options={BORDER_RADIUS_OPTIONS}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip} disabled={isSaving}>
            Überspringen
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              'Design System speichern'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DesignSystemDialog
