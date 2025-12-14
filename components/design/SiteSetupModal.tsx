'use client'

import * as React from 'react'
import {
  Loader2,
  Plus,
  X,
  Sparkles,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
  Upload,
  Image,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { generateSlug, type PageSuggestion } from '@/lib/ai/page-suggestions'
import type { SuggestedTokens } from '@/lib/design/style-extractor'
import type { SetupSuggestion } from '@/app/api/ai/setup-suggestions/route'

// ============================================================================
// TYPES
// ============================================================================

export interface GradientSettings {
  enabled: boolean
  from: string
  via?: string // Optional middle color
  to: string
  direction: 'to-r' | 'to-br' | 'to-b' | 'to-bl' | 'to-l' | 'to-tl' | 'to-t' | 'to-tr'
}

const GRADIENT_DIRECTIONS = [
  { value: 'to-r', label: '→', title: 'Nach rechts' },
  { value: 'to-br', label: '↘', title: 'Diagonal rechts unten' },
  { value: 'to-b', label: '↓', title: 'Nach unten' },
  { value: 'to-bl', label: '↙', title: 'Diagonal links unten' },
  { value: 'to-l', label: '←', title: 'Nach links' },
  { value: 'to-tl', label: '↖', title: 'Diagonal links oben' },
  { value: 'to-t', label: '↑', title: 'Nach oben' },
  { value: 'to-tr', label: '↗', title: 'Diagonal rechts oben' },
] as const

export interface SiteSetupData {
  pages: PageSuggestion[]
  siteName: string
  siteType: string
  tagline: string
  logoFile?: File | null
  logoPreview?: string | null
  tokens: SuggestedTokens
  gradient: GradientSettings
  customColors: Record<string, string>
  headerSettings: {
    style: 'simple' | 'centered' | 'mega'
    menuItems: { name: string; slug: string }[]
    sticky: boolean
    showCta: boolean
    ctaText: string
    ctaPage: string
  }
  footerSettings: {
    menuItems: { name: string; slug: string }[]
    showCopyright: boolean
    copyrightText: string
  }
}

export interface SiteSetupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPrompt: string
  onGenerate: (data: SiteSetupData, originalPrompt: string) => void
  onSkip: (originalPrompt: string) => void
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_TOKENS: SuggestedTokens = {
  colors: {
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#64748b',
    accent: '#8b5cf6',
    background: '#ffffff',
    foreground: '#0f172a',
    muted: '#f1f5f9',
    border: '#e2e8f0',
  },
  fonts: { heading: 'Inter', body: 'Inter' }, // mono nur wenn relevant
  spacing: { section: '4rem', container: '1280px', cardGap: '1.5rem' },
  radii: { default: '0.5rem', lg: '1rem' },
}

const DEFAULT_GRADIENT: GradientSettings = {
  enabled: false,
  from: '#3b82f6',
  to: '#8b5cf6',
  direction: 'to-br',
}

// Popular Google Fonts für Autocomplete-Vorschläge (User kann aber jeden Font eingeben!)
const POPULAR_FONTS = [
  // Display/Heading
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Bodoni Moda', 'Fraunces', 'Italiana',
  'Space Grotesk', 'Sora', 'Clash Display', 'Plus Jakarta Sans', 'Outfit', 'Figtree', 'Urbanist',
  'Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Big Shoulders Display',
  'Poppins', 'Montserrat', 'Raleway', 'Quicksand',
  // Body/Text
  'Inter', 'DM Sans', 'Nunito Sans', 'Source Sans 3', 'IBM Plex Sans', 'Geist',
  'Open Sans', 'Roboto', 'Lato', 'Noto Sans', 'PT Sans',
  'Manrope', 'Work Sans', 'Onest', 'Atkinson Hyperlegible',
  'Merriweather', 'Lora', 'Source Serif 4', 'Crimson Pro', 'Spectral',
  // Artistic
  'Righteous', 'Audiowide', 'Orbitron', 'Caveat', 'Dancing Script', 'Pacifico', 'Great Vibes',
  // Friendly
  'Nunito', 'Rubik', 'Varela Round',
].sort()

const MONO_FONTS = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Geist Mono',
  'Roboto Mono', 'Ubuntu Mono', 'Inconsolata', 'Space Mono',
]

// ============================================================================
// COMPONENT
// ============================================================================

export function SiteSetupModal({
  open,
  onOpenChange,
  initialPrompt,
  onGenerate,
  onSkip,
}: SiteSetupModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [step, setStep] = React.useState<'pages' | 'design' | 'nav'>('pages')

  const [siteName, setSiteName] = React.useState('Meine Website')
  const [siteType, setSiteType] = React.useState('business')
  const [tagline, setTagline] = React.useState('')
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [pages, setPages] = React.useState<PageSuggestion[]>([])
  const [newPage, setNewPage] = React.useState('')
  const logoInputRef = React.useRef<HTMLInputElement>(null)

  const [tokens, setTokens] = React.useState<SuggestedTokens>(DEFAULT_TOKENS)
  const [gradient, setGradient] = React.useState<GradientSettings>(DEFAULT_GRADIENT)
  const [customColors, setCustomColors] = React.useState<Record<string, string>>({})

  const [headerStyle, setHeaderStyle] = React.useState<'simple' | 'centered' | 'mega'>('simple')
  const [headerSticky, setHeaderSticky] = React.useState(true)
  const [headerCta, setHeaderCta] = React.useState(true)
  const [headerCtaText, setHeaderCtaText] = React.useState('Kontakt')
  const [footerCopyright, setFooterCopyright] = React.useState(true)

  // Load AI suggestions
  React.useEffect(() => {
    if (open && initialPrompt) {
      loadSuggestions()
    }
  }, [open, initialPrompt])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/setup-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: initialPrompt }),
      })
      if (!res.ok) throw new Error()

      const data: SetupSuggestion = await res.json()

      setSiteName(data.siteName || 'Meine Website')
      setSiteType(data.siteType || 'business')

      // Pages
      if (data.pages?.length) {
        setPages(data.pages.map(p => ({
          ...p,
          selected: p.selected ?? true,
          inHeader: p.inHeader ?? !p.isLegalPage,
          inFooter: p.inFooter ?? true,
        })))
      }

      // Colors
      if (data.colors) {
        setTokens(prev => ({ ...prev, colors: { ...prev.colors, ...data.colors } }))
      }

      // Fonts (mono nur wenn von API gesetzt)
      if (data.fonts) {
        setTokens(prev => ({
          ...prev,
          fonts: {
            heading: data.fonts.heading || prev.fonts.heading,
            body: data.fonts.body || prev.fonts.body,
            ...(data.fonts.mono ? { mono: data.fonts.mono } : {}),
          },
        }))
      }

      // Gradient
      if (data.gradient) {
        setGradient({
          enabled: data.gradient.enabled ?? false,
          from: data.gradient.from || data.colors?.primary || DEFAULT_GRADIENT.from,
          via: data.gradient.via, // Optional
          to: data.gradient.to || data.colors?.accent || DEFAULT_GRADIENT.to,
          direction: data.gradient.direction || 'to-br',
        })
      } else if (data.colors) {
        // Fallback: erstelle Gradient aus Farben
        setGradient(prev => ({
          ...prev,
          from: data.colors.primary,
          to: data.colors.accent || data.colors.secondary,
        }))
      }

      // Custom Colors
      if (data.customColors && Object.keys(data.customColors).length > 0) {
        setCustomColors(data.customColors)
      }

      // Header Settings
      if (data.headerSettings) {
        const style = data.headerSettings.style
        if (style === 'simple' || style === 'centered' || style === 'split') {
          setHeaderStyle(style === 'split' ? 'mega' : style)
        }
        if (typeof data.headerSettings.sticky === 'boolean') {
          setHeaderSticky(data.headerSettings.sticky)
        }
        if (typeof data.headerSettings.showCta === 'boolean') {
          setHeaderCta(data.headerSettings.showCta)
        }
        if (data.headerSettings.ctaText) {
          setHeaderCtaText(data.headerSettings.ctaText)
        }
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }

  const togglePage = (slug: string) => {
    setPages(p => p.map(x => x.slug === slug ? { ...x, selected: !x.selected } : x))
  }

  const toggleInHeader = (slug: string) => {
    setPages(p => p.map(x => x.slug === slug ? { ...x, inHeader: !x.inHeader } : x))
  }

  const addPage = () => {
    if (!newPage.trim()) return
    const slug = generateSlug(newPage)
    if (pages.some(p => p.slug === slug)) return

    const insertAt = pages.findIndex(p => p.isLegalPage)
    const newPages = [...pages]
    newPages.splice(insertAt === -1 ? pages.length : insertAt, 0, {
      name: newPage.trim(),
      slug,
      selected: true,
      isLegalPage: false,
      inHeader: true,
      inFooter: true,
    })
    setPages(newPages)
    setNewPage('')
  }

  const removePage = (slug: string) => {
    setPages(p => p.filter(x => x.slug !== slug || x.isLegalPage || x.slug === ''))
  }

  const movePage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= pages.length) return
    const arr = [...pages]
    ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
    setPages(arr)
  }

  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)

    const headerItems = pages.filter(p => p.selected && p.inHeader && !p.isLegalPage).map(p => ({ name: p.name, slug: p.slug }))
    const footerItems = pages.filter(p => p.selected && p.inFooter).map(p => ({ name: p.name, slug: p.slug }))

    try {
      await onGenerate({
        pages,
        siteName,
        siteType,
        tagline,
        logoFile,
        logoPreview,
        tokens,
        gradient,
        customColors,
        headerSettings: {
          style: headerStyle,
          menuItems: headerItems,
          sticky: headerSticky,
          showCta: headerCta,
          ctaText: headerCtaText,
          ctaPage: 'kontakt',
        },
        footerSettings: {
          menuItems: footerItems,
          showCopyright: footerCopyright,
          copyrightText: `© ${new Date().getFullYear()} ${siteName}`,
        },
      }, initialPrompt)
    } finally {
      setIsGenerating(false)
      onOpenChange(false)
    }
  }

  const selectedCount = pages.filter(p => p.selected).length
  const menuCount = pages.filter(p => p.selected && p.inHeader && !p.isLegalPage).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl w-[90vw] p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Website Setup</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Website Setup</h2>
              <p className="text-xs text-zinc-500">{siteName}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-1">
            {(['pages', 'design', 'nav'] as const).map((s, i) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    step === s
                      ? 'bg-blue-500 text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {s === 'pages' ? 'Seiten' : s === 'design' ? 'Design' : 'Navigation'}
                </button>
                {i < 2 && <ChevronRight className="h-3 w-3 text-zinc-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Loading - AI analyzing prompt */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm text-zinc-600">KI analysiert...</span>
            </div>
          </div>
        )}

        {/* Generating - Setup is being saved and generation starting */}
        {isGenerating && (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/95 to-purple-600/95 z-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-12 w-12 text-white/30" />
              </div>
              <Sparkles className="h-12 w-12 text-white animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">Website wird vorbereitet...</h3>
              <p className="text-sm text-white/70">Design-System speichern • Seiten erstellen • KI starten</p>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-[450px] overflow-y-auto">
          {/* STEP: Pages */}
          {step === 'pages' && (
            <div className="p-5 space-y-4">
              {/* Hidden Logo Input */}
              <input
                type="file"
                ref={logoInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setLogoFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => setLogoPreview(reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }}
              />

              {/* Logo & Site Name Row */}
              <div className="flex gap-4">
                {/* Logo Upload */}
                <div className="shrink-0">
                  <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Logo</label>
                  {logoPreview ? (
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-xl border-2 border-zinc-200 bg-white p-2 flex items-center justify-center">
                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 hover:border-blue-400 hover:bg-blue-50/50 transition-colors flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-blue-500"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Upload</span>
                    </button>
                  )}
                </div>

                {/* Site Name & Tagline */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Website-Name</label>
                    <Input
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Tagline / Slogan</label>
                    <Input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="z.B. 'Die beste Losung fur...'"
                      className="h-9"
                    />
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-500">Seiten</label>
                  <span className="text-xs text-zinc-400">{selectedCount} ausgewählt</span>
                </div>

                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {pages.map((page, idx) => (
                    <div
                      key={page.slug || 'home'}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        page.selected ? 'border-blue-200 bg-blue-50/50' : 'border-zinc-100 bg-zinc-50 opacity-50'
                      }`}
                    >
                      {/* Drag Handle */}
                      {!page.isLegalPage && (
                        <div className="flex flex-col -my-1">
                          <button onClick={() => movePage(idx, -1)} className="text-zinc-300 hover:text-zinc-500 p-0.5">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                          </button>
                          <button onClick={() => movePage(idx, 1)} className="text-zinc-300 hover:text-zinc-500 p-0.5">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                          </button>
                        </div>
                      )}

                      {/* Checkbox */}
                      <button
                        onClick={() => !page.isLegalPage && page.slug !== '' && togglePage(page.slug)}
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          page.selected ? 'bg-blue-500 border-blue-500' : 'border-zinc-300'
                        } ${page.isLegalPage || page.slug === '' ? 'opacity-50' : ''}`}
                      >
                        {page.selected && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>

                      {/* Name */}
                      <span className="flex-1 text-sm text-zinc-700">{page.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">/{page.slug}</span>

                      {/* In Menu Toggle */}
                      {page.selected && !page.isLegalPage && (
                        <button
                          onClick={() => toggleInHeader(page.slug)}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            page.inHeader ? 'bg-blue-100 text-blue-600' : 'bg-zinc-100 text-zinc-400'
                          }`}
                        >
                          {page.inHeader ? 'Menu' : 'Hidden'}
                        </button>
                      )}

                      {/* Legal Badge */}
                      {page.isLegalPage && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">Pflicht</span>
                      )}

                      {/* Remove */}
                      {!page.isLegalPage && page.slug !== '' && (
                        <button onClick={() => removePage(page.slug)} className="text-zinc-300 hover:text-red-500 p-1">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Page */}
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newPage}
                    onChange={(e) => setNewPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPage()}
                    placeholder="Neue Seite..."
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={addPage} disabled={!newPage.trim()} className="h-8 px-3">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Design */}
          {step === 'design' && (
            <div className="p-5 space-y-5">
              {/* Main Colors */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block">Hauptfarben</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'primary', label: 'Primary' },
                    { key: 'primaryHover', label: 'Hover' },
                    { key: 'secondary', label: 'Secondary' },
                    { key: 'accent', label: 'Accent' },
                  ].map(({ key, label }) => (
                    <div key={key} className="group">
                      <div
                        className="h-10 rounded-lg border border-zinc-200 cursor-pointer relative overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                        style={{ backgroundColor: tokens.colors[key as keyof typeof tokens.colors] }}
                      >
                        <input
                          type="color"
                          value={tokens.colors[key as keyof typeof tokens.colors]}
                          onChange={(e) => setTokens(t => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neutral Colors */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-2 block">Neutrale Farben</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'background', label: 'Background' },
                    { key: 'foreground', label: 'Text' },
                    { key: 'muted', label: 'Muted' },
                    { key: 'border', label: 'Border' },
                  ].map(({ key, label }) => (
                    <div key={key} className="group">
                      <div
                        className="h-10 rounded-lg border border-zinc-200 cursor-pointer relative overflow-hidden group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                        style={{ backgroundColor: tokens.colors[key as keyof typeof tokens.colors] }}
                      >
                        <input
                          type="color"
                          value={tokens.colors[key as keyof typeof tokens.colors]}
                          onChange={(e) => setTokens(t => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-500">Custom Farben</label>
                  <button
                    onClick={() => {
                      const id = `custom-${Date.now()}`
                      setCustomColors(c => ({ ...c, [id]: '#6366f1' }))
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600"
                  >
                    + Hinzufügen
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(customColors).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-1 bg-zinc-50 rounded-lg p-1">
                      <div
                        className="w-8 h-8 rounded cursor-pointer relative overflow-hidden"
                        style={{ backgroundColor: value }}
                      >
                        <input
                          type="color"
                          value={value}
                          onChange={(e) => setCustomColors(c => ({ ...c, [key]: e.target.value }))}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const { [key]: _, ...rest } = customColors
                          setCustomColors(rest)
                        }}
                        className="p-1 text-zinc-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(customColors).length === 0 && (
                    <span className="text-xs text-zinc-400 italic">Keine Custom Farben</span>
                  )}
                </div>
              </div>

              {/* Gradient */}
              <div className="pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-zinc-500">Gradient</label>
                  <Switch checked={gradient.enabled} onCheckedChange={(v) => setGradient(g => ({ ...g, enabled: v }))} />
                </div>
                {gradient.enabled && (
                  <div className="space-y-3">
                    {/* Preview */}
                    <div
                      className="h-12 rounded-lg border border-zinc-200"
                      style={{
                        background: `linear-gradient(${gradient.direction.replace('to-', 'to ')}, ${gradient.from}${gradient.via ? `, ${gradient.via}` : ''}, ${gradient.to})`
                      }}
                    />

                    {/* Direction */}
                    <div>
                      <span className="text-[10px] text-zinc-400 mb-1.5 block">Richtung</span>
                      <div className="flex gap-1">
                        {GRADIENT_DIRECTIONS.map(dir => (
                          <button
                            key={dir.value}
                            onClick={() => setGradient(g => ({ ...g, direction: dir.value }))}
                            title={dir.title}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                              gradient.direction === dir.value
                                ? 'bg-blue-500 text-white'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {dir.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] text-zinc-400 mb-1 block">Start</span>
                        <div className="flex gap-2 items-center">
                          <div
                            className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer relative overflow-hidden"
                            style={{ backgroundColor: gradient.from }}
                          >
                            <input
                              type="color"
                              value={gradient.from}
                              onChange={(e) => setGradient(g => ({ ...g, from: e.target.value }))}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={gradient.from}
                            onChange={(e) => setGradient(g => ({ ...g, from: e.target.value }))}
                            className="flex-1 h-8 px-2 text-xs font-mono rounded border border-zinc-200"
                          />
                        </div>
                      </div>

                      {/* Via (optional) */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-zinc-400">Mitte</span>
                          {gradient.via ? (
                            <button
                              onClick={() => setGradient(g => ({ ...g, via: undefined }))}
                              className="text-[10px] text-zinc-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          ) : (
                            <button
                              onClick={() => setGradient(g => ({ ...g, via: '#a855f7' }))}
                              className="text-[10px] text-blue-500 hover:text-blue-600"
                            >
                              +
                            </button>
                          )}
                        </div>
                        {gradient.via ? (
                          <div className="flex gap-2 items-center">
                            <div
                              className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer relative overflow-hidden"
                              style={{ backgroundColor: gradient.via }}
                            >
                              <input
                                type="color"
                                value={gradient.via}
                                onChange={(e) => setGradient(g => ({ ...g, via: e.target.value }))}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={gradient.via}
                              onChange={(e) => setGradient(g => ({ ...g, via: e.target.value }))}
                              className="flex-1 h-8 px-2 text-xs font-mono rounded border border-zinc-200"
                            />
                          </div>
                        ) : (
                          <div className="h-10 rounded-lg border border-dashed border-zinc-200 flex items-center justify-center">
                            <span className="text-[10px] text-zinc-300">Optional</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <span className="text-[10px] text-zinc-400 mb-1 block">Ende</span>
                        <div className="flex gap-2 items-center">
                          <div
                            className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer relative overflow-hidden"
                            style={{ backgroundColor: gradient.to }}
                          >
                            <input
                              type="color"
                              value={gradient.to}
                              onChange={(e) => setGradient(g => ({ ...g, to: e.target.value }))}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                          <input
                            type="text"
                            value={gradient.to}
                            onChange={(e) => setGradient(g => ({ ...g, to: e.target.value }))}
                            className="flex-1 h-8 px-2 text-xs font-mono rounded border border-zinc-200"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fonts */}
              <div className="pt-3 border-t border-zinc-100">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-500">Schriften</label>
                  {!tokens.fonts.mono && (
                    <button
                      onClick={() => setTokens(t => ({ ...t, fonts: { ...t.fonts, mono: 'JetBrains Mono' } }))}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      + Monospace
                    </button>
                  )}
                </div>
                <div className={`grid gap-3 ${tokens.fonts.mono ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-1 block">Überschriften</span>
                    <input
                      type="text"
                      list="heading-fonts"
                      value={tokens.fonts.heading}
                      onChange={(e) => setTokens(t => ({ ...t, fonts: { ...t.fonts, heading: e.target.value } }))}
                      placeholder="Google Font Name..."
                      className="w-full h-9 px-2 text-sm rounded-lg border border-zinc-200 bg-white"
                      style={{ fontFamily: tokens.fonts.heading }}
                    />
                    <datalist id="heading-fonts">
                      {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-1 block">Fließtext</span>
                    <input
                      type="text"
                      list="body-fonts"
                      value={tokens.fonts.body}
                      onChange={(e) => setTokens(t => ({ ...t, fonts: { ...t.fonts, body: e.target.value } }))}
                      placeholder="Google Font Name..."
                      className="w-full h-9 px-2 text-sm rounded-lg border border-zinc-200 bg-white"
                      style={{ fontFamily: tokens.fonts.body }}
                    />
                    <datalist id="body-fonts">
                      {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  {tokens.fonts.mono && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-zinc-400">Monospace</span>
                        <button
                          onClick={() => setTokens(t => ({ ...t, fonts: { heading: t.fonts.heading, body: t.fonts.body } }))}
                          className="text-[10px] text-zinc-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        list="mono-fonts"
                        value={tokens.fonts.mono}
                        onChange={(e) => setTokens(t => ({ ...t, fonts: { ...t.fonts, mono: e.target.value } }))}
                        placeholder="Mono Font..."
                        className="w-full h-9 px-2 text-sm rounded-lg border border-zinc-200 bg-white font-mono"
                      />
                      <datalist id="mono-fonts">
                        {MONO_FONTS.map(f => <option key={f} value={f} />)}
                      </datalist>
                    </div>
                  )}
                </div>
                {/* Font Preview */}
                <div className="mt-3 p-3 bg-zinc-50 rounded-lg">
                  <p className="text-lg mb-1" style={{ fontFamily: tokens.fonts.heading }}>
                    Überschrift Beispiel
                  </p>
                  <p className="text-sm text-zinc-600" style={{ fontFamily: tokens.fonts.body }}>
                    Dies ist ein Beispieltext für die Fließtext-Schriftart.
                  </p>
                  {tokens.fonts.mono && (
                    <code className="text-xs text-zinc-500 mt-1 block" style={{ fontFamily: tokens.fonts.mono }}>
                      const code = "mono";
                    </code>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Navigation */}
          {step === 'nav' && (
            <div className="p-5 space-y-5">
              {/* Header Style */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-3 block">Header Layout</label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Standard */}
                  <button
                    onClick={() => setHeaderStyle('simple')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      headerStyle === 'simple' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="h-10 bg-zinc-100 rounded-lg flex items-center px-2 gap-1.5">
                      <div className="w-6 h-3 bg-zinc-400 rounded" />
                      <div className="flex-1" />
                      <div className="flex gap-0.5">
                        <div className="w-4 h-1.5 bg-zinc-300 rounded" />
                        <div className="w-4 h-1.5 bg-zinc-300 rounded" />
                        <div className="w-4 h-1.5 bg-zinc-300 rounded" />
                      </div>
                      <div className="w-6 h-3 bg-blue-400 rounded" />
                    </div>
                    <span className="text-xs font-medium mt-2 block text-zinc-700">Standard</span>
                  </button>

                  {/* Centered */}
                  <button
                    onClick={() => setHeaderStyle('centered')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      headerStyle === 'centered' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="h-10 bg-zinc-100 rounded-lg flex flex-col items-center justify-center gap-1">
                      <div className="w-8 h-3 bg-zinc-400 rounded" />
                      <div className="flex gap-0.5">
                        <div className="w-3 h-1.5 bg-zinc-300 rounded" />
                        <div className="w-3 h-1.5 bg-zinc-300 rounded" />
                        <div className="w-3 h-1.5 bg-zinc-300 rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-medium mt-2 block text-zinc-700">Zentriert</span>
                  </button>

                  {/* Mega */}
                  <button
                    onClick={() => setHeaderStyle('mega')}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      headerStyle === 'mega' ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="h-10 bg-zinc-100 rounded-lg flex flex-col">
                      <div className="flex items-center px-1.5 py-1">
                        <div className="w-5 h-2 bg-zinc-400 rounded" />
                        <div className="flex-1" />
                        <div className="flex gap-0.5">
                          <div className="w-3 h-1.5 bg-zinc-300 rounded" />
                          <div className="w-3 h-1.5 bg-zinc-300 rounded" />
                        </div>
                      </div>
                      <div className="flex-1 mx-1.5 mb-1 bg-zinc-200 rounded grid grid-cols-3 gap-0.5 p-0.5">
                        <div className="bg-white rounded" />
                        <div className="bg-white rounded" />
                        <div className="bg-white rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-medium mt-2 block text-zinc-700">Mega Menu</span>
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-3 bg-zinc-50 rounded-lg">
                <span className="text-xs text-zinc-500">Menu: </span>
                <span className="text-xs text-zinc-700">
                  {pages.filter(p => p.selected && p.inHeader && !p.isLegalPage).map(p => p.name).join(' • ') || 'Keine'}
                </span>
              </div>

              {/* Header Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-zinc-700">Sticky Header</span>
                    <p className="text-xs text-zinc-400">Bleibt beim Scrollen sichtbar</p>
                  </div>
                  <Switch checked={headerSticky} onCheckedChange={setHeaderSticky} />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-zinc-700">CTA Button</span>
                    <p className="text-xs text-zinc-400">Hervorgehobener Aktionsbutton</p>
                  </div>
                  <Switch checked={headerCta} onCheckedChange={setHeaderCta} />
                </div>

                {headerCta && (
                  <Input
                    value={headerCtaText}
                    onChange={(e) => setHeaderCtaText(e.target.value)}
                    placeholder="Button Text"
                    className="h-9"
                  />
                )}

                <div className="flex items-center justify-between py-2 border-t border-zinc-100 pt-4">
                  <div>
                    <span className="text-sm text-zinc-700">Footer Copyright</span>
                    <p className="text-xs text-zinc-400">© {new Date().getFullYear()} {siteName}</p>
                  </div>
                  <Switch checked={footerCopyright} onCheckedChange={setFooterCopyright} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-100 bg-zinc-50/50">
          <button
            onClick={() => onSkip(initialPrompt)}
            className="text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
            disabled={isGenerating || loading}
          >
            Überspringen
          </button>

          <div className="flex items-center gap-2">
            {step !== 'pages' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step === 'nav' ? 'design' : 'pages')}
                disabled={isGenerating || loading}
              >
                Zurück
              </Button>
            )}

            {step !== 'nav' ? (
              <Button
                size="sm"
                onClick={() => setStep(step === 'pages' ? 'design' : 'nav')}
                disabled={isGenerating || loading}
              >
                Weiter
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleGenerate}
                className="bg-blue-500 hover:bg-blue-600"
                disabled={isGenerating || loading}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generieren
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SiteSetupModal
