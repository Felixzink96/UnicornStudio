'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Image as ImageIcon, Link, Upload } from 'lucide-react'
import { ImageManager } from './ImageManager'

interface ImagePickerProps {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (url: string, altText?: string, assetId?: string) => void
  currentUrl?: string
  currentAlt?: string
}

export function ImagePicker({
  siteId,
  open,
  onOpenChange,
  onSelect,
  currentUrl,
  currentAlt,
}: ImagePickerProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'url'>('library')
  const [externalUrl, setExternalUrl] = useState(currentUrl || '')
  const [altText, setAltText] = useState(currentAlt || '')

  const handleLibrarySelect = (image: {
    id: string
    file_url: string
    alt_text: string | null
    name: string
  }) => {
    onSelect(image.file_url, image.alt_text || image.name, image.id)
    onOpenChange(false)
  }

  const handleUrlSubmit = () => {
    if (externalUrl) {
      onSelect(externalUrl, altText)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Bild auswählen
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'library' | 'url')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
            <TabsTrigger value="library" className="gap-2">
              <Upload className="h-4 w-4" />
              Bibliothek
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-4 flex-1 min-h-0 overflow-hidden">
            <div className="h-full max-h-[400px] overflow-y-auto">
              <ImageManager
                siteId={siteId}
                mode="picker"
                onSelect={handleLibrarySelect}
              />
            </div>
          </TabsContent>

          <TabsContent value="url" className="mt-4 space-y-4 flex-shrink-0 overflow-y-auto max-h-[400px]">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Bild-URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="altText">Alt-Text (optional)</Label>
              <Input
                id="altText"
                placeholder="Bildbeschreibung für Barrierefreiheit"
                value={altText}
                onChange={e => setAltText(e.target.value)}
              />
            </div>

            {externalUrl && (
              <div className="rounded-lg border p-2">
                <p className="text-xs text-zinc-500 mb-2">Vorschau:</p>
                <img
                  src={externalUrl}
                  alt={altText || 'Preview'}
                  className="max-h-32 rounded object-contain mx-auto"
                  onError={e => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleUrlSubmit}
              disabled={!externalUrl}
            >
              Bild einfügen
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
