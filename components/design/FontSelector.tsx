'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

interface FontSelectorProps {
  label: string
  value: string
  onChange: (value: string) => void
  description?: string
}

// Popular Google Fonts
const POPULAR_FONTS = [
  // Sans-Serif
  { name: 'Inter', category: 'Sans-Serif' },
  { name: 'Roboto', category: 'Sans-Serif' },
  { name: 'Open Sans', category: 'Sans-Serif' },
  { name: 'Lato', category: 'Sans-Serif' },
  { name: 'Montserrat', category: 'Sans-Serif' },
  { name: 'Poppins', category: 'Sans-Serif' },
  { name: 'Source Sans Pro', category: 'Sans-Serif' },
  { name: 'Nunito', category: 'Sans-Serif' },
  { name: 'Raleway', category: 'Sans-Serif' },
  { name: 'Ubuntu', category: 'Sans-Serif' },
  { name: 'Work Sans', category: 'Sans-Serif' },
  { name: 'DM Sans', category: 'Sans-Serif' },
  { name: 'Mulish', category: 'Sans-Serif' },
  { name: 'Quicksand', category: 'Sans-Serif' },
  { name: 'Josefin Sans', category: 'Sans-Serif' },
  { name: 'Barlow', category: 'Sans-Serif' },
  { name: 'Manrope', category: 'Sans-Serif' },
  { name: 'Space Grotesk', category: 'Sans-Serif' },
  { name: 'Plus Jakarta Sans', category: 'Sans-Serif' },
  { name: 'Figtree', category: 'Sans-Serif' },

  // Serif
  { name: 'Playfair Display', category: 'Serif' },
  { name: 'Merriweather', category: 'Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'PT Serif', category: 'Serif' },
  { name: 'Libre Baskerville', category: 'Serif' },
  { name: 'Source Serif Pro', category: 'Serif' },
  { name: 'Crimson Text', category: 'Serif' },
  { name: 'EB Garamond', category: 'Serif' },

  // Display
  { name: 'Oswald', category: 'Display' },
  { name: 'Bebas Neue', category: 'Display' },
  { name: 'Anton', category: 'Display' },
  { name: 'Abril Fatface', category: 'Display' },

  // Monospace
  { name: 'JetBrains Mono', category: 'Monospace' },
  { name: 'Fira Code', category: 'Monospace' },
  { name: 'Source Code Pro', category: 'Monospace' },
  { name: 'IBM Plex Mono', category: 'Monospace' },
  { name: 'Roboto Mono', category: 'Monospace' },
]

// Group fonts by category
const FONT_CATEGORIES = POPULAR_FONTS.reduce((acc, font) => {
  if (!acc[font.category]) {
    acc[font.category] = []
  }
  acc[font.category].push(font.name)
  return acc
}, {} as Record<string, string[]>)

export function FontSelector({
  label,
  value,
  onChange,
  description,
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [loadedFonts, setLoadedFonts] = React.useState<Set<string>>(new Set())

  // Load font for preview when popover opens
  React.useEffect(() => {
    if (isOpen) {
      // Load fonts for preview
      POPULAR_FONTS.slice(0, 20).forEach((font) => {
        loadFontForPreview(font.name)
      })
    }
  }, [isOpen])

  const loadFontForPreview = (fontName: string) => {
    if (loadedFonts.has(fontName)) return

    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600&display=swap`
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    setLoadedFonts((prev) => new Set([...prev, fontName]))
  }

  const filteredFonts = React.useMemo(() => {
    if (!search) return FONT_CATEGORIES

    const lowerSearch = search.toLowerCase()
    const filtered: Record<string, string[]> = {}

    Object.entries(FONT_CATEGORIES).forEach(([category, fonts]) => {
      const matchingFonts = fonts.filter((f) =>
        f.toLowerCase().includes(lowerSearch)
      )
      if (matchingFonts.length > 0) {
        filtered[category] = matchingFonts
      }
    })

    return filtered
  }, [search])

  const handleFontSelect = (fontName: string) => {
    onChange(fontName)
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
          >
            <span
              style={{ fontFamily: `'${value}', sans-serif` }}
              className="truncate"
            >
              {value || 'Schrift wählen...'}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Schrift suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {Object.entries(filteredFonts).map(([category, fonts]) => (
                <div key={category} className="mb-4">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    {category}
                  </div>
                  {fonts.map((fontName) => (
                    <button
                      key={fontName}
                      type="button"
                      onClick={() => handleFontSelect(fontName)}
                      onMouseEnter={() => loadFontForPreview(fontName)}
                      className={cn(
                        'w-full flex items-center justify-between px-2 py-1.5 rounded-sm text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'transition-colors',
                        value === fontName && 'bg-accent'
                      )}
                    >
                      <span
                        style={{ fontFamily: `'${fontName}', sans-serif` }}
                        className="truncate"
                      >
                        {fontName}
                      </span>
                      {value === fontName && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}

              {Object.keys(filteredFonts).length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Keine Schriften gefunden
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Preview */}
      <div
        className="p-3 rounded-md bg-muted/50 border"
        style={{ fontFamily: `'${value}', sans-serif` }}
      >
        <div className="text-lg font-semibold">Aa Bb Cc</div>
        <div className="text-sm text-muted-foreground">
          The quick brown fox jumps over the lazy dog
        </div>
      </div>
    </div>
  )
}

export default FontSelector
