'use client'

import * as React from 'react'
import {
  Loader2,
  Plus,
  X,
  Sparkles,
  Check,
  ChevronRight,
  Upload,
  FileText,
  Palette,
  Navigation,
  GripVertical,
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
  via?: string
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
  fonts: { heading: 'Inter', body: 'Inter' },
  spacing: { section: '4rem', container: '1280px', cardGap: '1.5rem' },
  radii: { default: '0.5rem', lg: '1rem' },
}

const DEFAULT_GRADIENT: GradientSettings = {
  enabled: false,
  from: '#3b82f6',
  to: '#8b5cf6',
  direction: 'to-br',
}

const POPULAR_FONTS = [
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Space Grotesk', 'Sora',
  'Plus Jakarta Sans', 'Outfit', 'Figtree', 'Urbanist', 'Bebas Neue', 'Anton', 'Oswald',
  'Poppins', 'Montserrat', 'Raleway', 'Quicksand', 'Inter', 'DM Sans', 'Nunito Sans',
  'Source Sans 3', 'IBM Plex Sans', 'Open Sans', 'Roboto', 'Lato', 'Manrope', 'Work Sans',
].sort()

// ============================================================================
// STEP COMPONENTS
// ============================================================================

type StepType = 'pages' | 'design' | 'nav'

const STEPS: { id: StepType; label: string; icon: React.ElementType }[] = [
  { id: 'pages', label: 'Seiten', icon: FileText },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'nav', label: 'Navigation', icon: Navigation },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SiteSetupModal({
  open,
  onOpenChange,
  initialPrompt,
  onGenerate,
  onSkip,
}: SiteSetupModalProps) {
  const [loading, setLoading] = React.useState(false)
  const [step, setStep] = React.useState<StepType>('pages')
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Form State
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

  const currentStepIndex = STEPS.findIndex(s => s.id === step)

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

      if (data.pages?.length) {
        setPages(data.pages.map(p => ({
          ...p,
          selected: p.selected ?? true,
          inHeader: p.inHeader ?? !p.isLegalPage,
          inFooter: p.inFooter ?? true,
        })))
      }

      if (data.colors) {
        setTokens(prev => ({ ...prev, colors: { ...prev.colors, ...data.colors } }))
      }

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

      if (data.gradient) {
        setGradient({
          enabled: data.gradient.enabled ?? false,
          from: data.gradient.from || data.colors?.primary || DEFAULT_GRADIENT.from,
          via: data.gradient.via,
          to: data.gradient.to || data.colors?.accent || DEFAULT_GRADIENT.to,
          direction: data.gradient.direction || 'to-br',
        })
      }

      if (data.customColors && Object.keys(data.customColors).length > 0) {
        setCustomColors(data.customColors)
      }

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

  // Page handlers
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

  const nextStep = () => {
    if (step === 'pages') setStep('design')
    else if (step === 'design') setStep('nav')
  }

  const prevStep = () => {
    if (step === 'nav') setStep('design')
    else if (step === 'design') setStep('pages')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900">
        <VisuallyHidden>
          <DialogTitle>Website Setup</DialogTitle>
        </VisuallyHidden>

        {/* Header - Figma Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white dark:text-zinc-900" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Website Setup</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{siteName}</p>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    step === s.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-600" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/90 dark:bg-zinc-900/90 z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">KI analysiert...</span>
            </div>
          </div>
        )}

        {/* Generating Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-zinc-900 dark:bg-zinc-100 z-50 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-12 w-12 text-white/30 dark:text-zinc-900/30" />
              </div>
              <Sparkles className="h-12 w-12 text-white dark:text-zinc-900 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white dark:text-zinc-900">Website wird vorbereitet...</h3>
              <p className="text-sm text-white/70 dark:text-zinc-600">Design-System speichern • Seiten erstellen • KI starten</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-white dark:bg-zinc-900 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="h-[480px] overflow-y-auto p-6">
          {/* STEP: Pages */}
          {step === 'pages' && (
            <div className="space-y-6">
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

              {/* Logo & Site Name */}
              <div className="flex gap-4">
                {/* Logo Upload */}
                <div className="shrink-0">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Logo</label>
                  {logoPreview ? (
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 flex items-center justify-center">
                        <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setLogoFile(null); setLogoPreview(null) }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex flex-col items-center justify-center gap-1 text-zinc-400"
                    >
                      <Upload className="h-5 w-5" />
                      <span className="text-[10px]">Upload</span>
                    </button>
                  )}
                </div>

                {/* Site Name & Tagline */}
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Website-Name</label>
                    <Input
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Tagline / Slogan</label>
                    <Input
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="z.B. 'Die beste Lösung für...'"
                      className="bg-zinc-50 dark:bg-zinc-800"
                    />
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Seiten</label>
                  <span className="text-xs text-zinc-400">{selectedCount} ausgewählt</span>
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {pages.map((page, idx) => (
                    <div
                      key={page.slug || 'home'}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                        page.selected
                          ? 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 opacity-50'
                      }`}
                    >
                      {/* Move Buttons */}
                      {!page.isLegalPage && (
                        <div className="flex flex-col -my-1">
                          <button onClick={() => movePage(idx, -1)} className="text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-400 p-0.5">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 10 6"><path d="M1 5l4-4 4 4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                          </button>
                          <button onClick={() => movePage(idx, 1)} className="text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-400 p-0.5">
                            <svg className="h-2.5 w-2.5" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>
                          </button>
                        </div>
                      )}

                      {/* Checkbox */}
                      <button
                        onClick={() => !page.isLegalPage && page.slug !== '' && togglePage(page.slug)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          page.selected
                            ? 'bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100'
                            : 'border-zinc-300 dark:border-zinc-600'
                        } ${page.isLegalPage || page.slug === '' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {page.selected && <Check className="h-3 w-3 text-white dark:text-zinc-900" />}
                      </button>

                      {/* Name & Slug */}
                      <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{page.name}</span>
                      <span className="text-xs text-zinc-400 font-mono">/{page.slug}</span>

                      {/* Menu Toggle */}
                      {page.selected && !page.isLegalPage && (
                        <button
                          onClick={() => toggleInHeader(page.slug)}
                          className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                            page.inHeader
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {page.inHeader ? 'Menu' : 'Hidden'}
                        </button>
                      )}

                      {/* Legal Badge */}
                      {page.isLegalPage && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Pflicht</span>
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
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newPage}
                    onChange={(e) => setNewPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPage()}
                    placeholder="Neue Seite hinzufügen..."
                    className="bg-zinc-50 dark:bg-zinc-800"
                  />
                  <Button onClick={addPage} disabled={!newPage.trim()} size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Design */}
          {step === 'design' && (
            <div className="space-y-6">
              {/* Colors Section */}
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Hauptfarben</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'primary', label: 'Primary' },
                    { key: 'primaryHover', label: 'Hover' },
                    { key: 'secondary', label: 'Secondary' },
                    { key: 'accent', label: 'Accent' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div
                        className="h-12 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer relative overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                        style={{ backgroundColor: tokens.colors[key as keyof typeof tokens.colors] }}
                      >
                        <input
                          type="color"
                          value={tokens.colors[key as keyof typeof tokens.colors]}
                          onChange={(e) => setTokens(t => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1.5 block text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neutral Colors */}
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Neutrale Farben</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'background', label: 'Background' },
                    { key: 'foreground', label: 'Text' },
                    { key: 'muted', label: 'Muted' },
                    { key: 'border', label: 'Border' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <div
                        className="h-12 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer relative overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                        style={{ backgroundColor: tokens.colors[key as keyof typeof tokens.colors] }}
                      >
                        <input
                          type="color"
                          value={tokens.colors[key as keyof typeof tokens.colors]}
                          onChange={(e) => setTokens(t => ({ ...t, colors: { ...t.colors, [key]: e.target.value } }))}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1.5 block text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gradient */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Gradient</label>
                  <Switch checked={gradient.enabled} onCheckedChange={(v) => setGradient(g => ({ ...g, enabled: v }))} />
                </div>
                {gradient.enabled && (
                  <div className="space-y-3">
                    <div
                      className="h-14 rounded-lg border-2 border-zinc-200 dark:border-zinc-700"
                      style={{
                        background: `linear-gradient(${gradient.direction.replace('to-', 'to ')}, ${gradient.from}${gradient.via ? `, ${gradient.via}` : ''}, ${gradient.to})`
                      }}
                    />
                    <div className="flex gap-2">
                      {GRADIENT_DIRECTIONS.map(dir => (
                        <button
                          key={dir.value}
                          onClick={() => setGradient(g => ({ ...g, direction: dir.value }))}
                          title={dir.title}
                          className={`flex-1 h-8 rounded-lg text-sm font-medium transition-all ${
                            gradient.direction === dir.value
                              ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'from', label: 'Start' },
                        { key: 'via', label: 'Mitte', optional: true },
                        { key: 'to', label: 'Ende' },
                      ].map(({ key, label, optional }) => (
                        <div key={key}>
                          <span className="text-[10px] text-zinc-400 mb-1 block">{label}</span>
                          <div className="flex gap-2">
                            <div
                              className="w-10 h-10 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer relative overflow-hidden"
                              style={{ backgroundColor: gradient[key as keyof GradientSettings] as string || '#a855f7' }}
                            >
                              <input
                                type="color"
                                value={(gradient[key as keyof GradientSettings] as string) || '#a855f7'}
                                onChange={(e) => setGradient(g => ({ ...g, [key]: e.target.value }))}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={(gradient[key as keyof GradientSettings] as string) || ''}
                              onChange={(e) => setGradient(g => ({ ...g, [key]: e.target.value }))}
                              placeholder={optional ? 'Optional' : ''}
                              className="flex-1 h-10 px-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fonts */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Schriften</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-1.5 block">Überschriften</span>
                    <input
                      type="text"
                      list="heading-fonts"
                      value={tokens.fonts.heading}
                      onChange={(e) => setTokens(t => ({ ...t, fonts: { ...t.fonts, heading: e.target.value } }))}
                      placeholder="Google Font..."
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      style={{ fontFamily: tokens.fonts.heading }}
                    />
                    <datalist id="heading-fonts">
                      {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-1.5 block">Fließtext</span>
                    <input
                      type="text"
                      list="body-fonts"
                      value={tokens.fonts.body}
                      onChange={(e) => setTokens(t => ({ ...t, fonts: { ...t.fonts, body: e.target.value } }))}
                      placeholder="Google Font..."
                      className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      style={{ fontFamily: tokens.fonts.body }}
                    />
                    <datalist id="body-fonts">
                      {POPULAR_FONTS.map(f => <option key={f} value={f} />)}
                    </datalist>
                  </div>
                </div>
                {/* Font Preview */}
                <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <p className="text-lg mb-1 text-zinc-800 dark:text-zinc-200" style={{ fontFamily: tokens.fonts.heading }}>
                    Überschrift Beispiel
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400" style={{ fontFamily: tokens.fonts.body }}>
                    Dies ist ein Beispieltext für die Fließtext-Schriftart.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Navigation */}
          {step === 'nav' && (
            <div className="space-y-6">
              {/* Header Style */}
              <div>
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Header Layout</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'simple', label: 'Standard' },
                    { value: 'centered', label: 'Zentriert' },
                    { value: 'mega', label: 'Mega Menu' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setHeaderStyle(value as typeof headerStyle)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        headerStyle === value
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      {/* Preview */}
                      <div className="h-10 bg-zinc-100 dark:bg-zinc-700 rounded-lg flex items-center px-2 gap-1.5 mb-2">
                        {value === 'simple' && (
                          <>
                            <div className="w-6 h-3 bg-zinc-400 dark:bg-zinc-500 rounded" />
                            <div className="flex-1" />
                            <div className="flex gap-1">
                              <div className="w-4 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                              <div className="w-4 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                            <div className="w-6 h-3 bg-zinc-900 dark:bg-zinc-100 rounded" />
                          </>
                        )}
                        {value === 'centered' && (
                          <div className="w-full flex flex-col items-center gap-1">
                            <div className="w-8 h-3 bg-zinc-400 dark:bg-zinc-500 rounded" />
                            <div className="flex gap-1">
                              <div className="w-3 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                              <div className="w-3 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                            </div>
                          </div>
                        )}
                        {value === 'mega' && (
                          <div className="w-full">
                            <div className="flex items-center px-1 mb-1">
                              <div className="w-5 h-2 bg-zinc-400 dark:bg-zinc-500 rounded" />
                              <div className="flex-1" />
                              <div className="flex gap-0.5">
                                <div className="w-3 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                                <div className="w-3 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Preview */}
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Menu: </span>
                <span className="text-xs text-zinc-700 dark:text-zinc-300">
                  {pages.filter(p => p.selected && p.inHeader && !p.isLegalPage).map(p => p.name).join(' • ') || 'Keine'}
                </span>
              </div>

              {/* Header Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Sticky Header</span>
                    <p className="text-xs text-zinc-400">Bleibt beim Scrollen sichtbar</p>
                  </div>
                  <Switch checked={headerSticky} onCheckedChange={setHeaderSticky} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CTA Button</span>
                    <p className="text-xs text-zinc-400">Hervorgehobener Aktionsbutton</p>
                  </div>
                  <Switch checked={headerCta} onCheckedChange={setHeaderCta} />
                </div>

                {headerCta && (
                  <Input
                    value={headerCtaText}
                    onChange={(e) => setHeaderCtaText(e.target.value)}
                    placeholder="Button Text"
                    className="bg-zinc-50 dark:bg-zinc-800"
                  />
                )}

                <div className="flex items-center justify-between py-3">
                  <div>
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Footer Copyright</span>
                    <p className="text-xs text-zinc-400">© {new Date().getFullYear()} {siteName}</p>
                  </div>
                  <Switch checked={footerCopyright} onCheckedChange={setFooterCopyright} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={() => onSkip(initialPrompt)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-50"
            disabled={isGenerating || loading}
          >
            Überspringen
          </button>

          <div className="flex items-center gap-2">
            {step !== 'pages' && (
              <Button variant="ghost" onClick={prevStep} disabled={isGenerating || loading}>
                Zurück
              </Button>
            )}

            {step !== 'nav' ? (
              <Button onClick={nextStep} disabled={isGenerating || loading}>
                Weiter
              </Button>
            ) : (
              <Button onClick={handleGenerate} disabled={isGenerating || loading} loading={isGenerating}>
                <Sparkles className="h-4 w-4 mr-1.5" />
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
