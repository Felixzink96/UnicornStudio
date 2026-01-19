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
import type { SetupSuggestion, DesignArchetype, DesignStyle } from '@/app/api/ai/setup-suggestions/route'

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
  // Design Styles (can be multiple for mixed styles)
  designStyles: DesignStyle[]
  // Legacy: Design Archetype System
  archetype: DesignArchetype
  radii: {
    style: 'sharp' | 'soft' | 'rounded' | 'pill'
    default: string
    lg: string
    xl: string
    button: string
    card: string
    input: string
  }
  motion: {
    style: 'elegant' | 'snappy' | 'bold' | 'playful'
    duration: { fast: string; normal: string; slow: string }
    easing: string
    hoverScale: number
    revealDistance: string
  }
  layout: {
    style: 'symmetric' | 'asymmetric' | 'editorial' | 'organic'
    maxWidth: string
    sectionSpacing: string
    useOverlaps: boolean
    heroStyle: 'centered' | 'split' | 'fullwidth' | 'editorial'
  }
  effects: {
    useNoise: boolean
    useBlur: boolean
    useGradientBlobs: boolean
    useScanLines: boolean
    borderStyle: 'none' | 'subtle' | 'prominent' | 'thick'
  }
  headerSettings: {
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
  initialImages?: Array<{ base64: string; mimeType: string }>
  onGenerate: (data: SiteSetupData, originalPrompt: string, images?: Array<{ base64: string; mimeType: string }>) => void
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

const DEFAULT_ARCHETYPE: DesignArchetype = 'innovator'

const DEFAULT_RADII: SiteSetupData['radii'] = {
  style: 'rounded',
  default: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  button: '0.75rem',
  card: '1rem',
  input: '0.5rem',
}

const DEFAULT_MOTION: SiteSetupData['motion'] = {
  style: 'snappy',
  duration: { fast: '150ms', normal: '300ms', slow: '500ms' },
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  hoverScale: 1.05,
  revealDistance: '40px',
}

const DEFAULT_LAYOUT: SiteSetupData['layout'] = {
  style: 'symmetric',
  maxWidth: '1440px',
  sectionSpacing: '5rem',
  useOverlaps: true,
  heroStyle: 'centered',
}

const DEFAULT_EFFECTS: SiteSetupData['effects'] = {
  useNoise: true,
  useBlur: true,
  useGradientBlobs: true,
  useScanLines: false,
  borderStyle: 'none',
}

const POPULAR_FONTS = [
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Space Grotesk', 'Sora',
  'Plus Jakarta Sans', 'Outfit', 'Figtree', 'Urbanist', 'Bebas Neue', 'Anton', 'Oswald',
  'Poppins', 'Montserrat', 'Raleway', 'Quicksand', 'Inter', 'DM Sans', 'Nunito Sans',
  'Source Sans 3', 'IBM Plex Sans', 'Open Sans', 'Roboto', 'Lato', 'Manrope', 'Work Sans',
].sort()

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 bg-[length:200%_100%] animate-shimmer rounded ${className}`}
      style={{
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  )
}

// Add shimmer keyframes via style tag (wird nur einmal gerendert)
const ShimmerStyle = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .animate-shimmer {
      animation: shimmer 1.5s ease-in-out infinite;
    }
  `}</style>
)

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
  initialImages,
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

  // Design Styles (can be multiple for mixed styles)
  const [designStyles, setDesignStyles] = React.useState<DesignStyle[]>([])

  // NEW: Archetype-based design settings
  const [archetype, setArchetype] = React.useState<DesignArchetype>(DEFAULT_ARCHETYPE)
  const [radii, setRadii] = React.useState<SiteSetupData['radii']>(DEFAULT_RADII)
  const [motion, setMotion] = React.useState<SiteSetupData['motion']>(DEFAULT_MOTION)
  const [layout, setLayout] = React.useState<SiteSetupData['layout']>(DEFAULT_LAYOUT)
  const [effects, setEffects] = React.useState<SiteSetupData['effects']>(DEFAULT_EFFECTS)

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt, initialImages])

  const loadSuggestions = async () => {
    setLoading(true)
    try {
      console.log(`[Setup] Loading suggestions with ${initialImages?.length || 0} image(s)`)
      const res = await fetch('/api/ai/setup-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: initialPrompt,
          images: initialImages, // Pass images for analysis
        }),
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

      // Load design styles
      if (data.designStyles && data.designStyles.length > 0) {
        setDesignStyles(data.designStyles)
      }

      // NEW: Load archetype-based settings
      if (data.archetype) {
        setArchetype(data.archetype)
      }

      if (data.radii) {
        setRadii(data.radii)
      }

      if (data.motion) {
        setMotion(data.motion)
      }

      if (data.layout) {
        setLayout(data.layout)
      }

      if (data.effects) {
        setEffects(data.effects)
      }

      if (data.headerSettings) {
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
        // Design Styles
        designStyles,
        // Legacy: Archetype-based settings
        archetype,
        radii,
        motion,
        layout,
        effects,
        headerSettings: {
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
      }, initialPrompt, initialImages)
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
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${loading ? 'bg-blue-500' : 'bg-zinc-900 dark:bg-zinc-100'}`}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" stroke="#ffffff" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" className="dark:stroke-zinc-900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Website Setup</h2>
              {loading ? (
                <p className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  KI analysiert...
                </p>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{siteName}</p>
              )}
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => setStep(s.id)}
                  disabled={loading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    step === s.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3" stroke="#d4d4d8" />}
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

        {/* Shimmer Animation Style */}
        <ShimmerStyle />

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
                    {loading ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : (
                      <Input
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-800"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2 block">Tagline / Slogan</label>
                    {loading ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : (
                      <Input
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="z.B. 'Die beste Lösung für...'"
                        className="bg-zinc-50 dark:bg-zinc-800"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Seiten</label>
                  {loading ? (
                    <Skeleton className="h-4 w-20 rounded" />
                  ) : (
                    <span className="text-xs text-zinc-400">{selectedCount} ausgewählt</span>
                  )}
                </div>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {loading ? (
                    // Skeleton Pages
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          <Skeleton className="w-5 h-5 rounded" />
                          <div className="flex-1" style={{ maxWidth: `${60 + Math.random() * 40}%` }}>
                            <Skeleton className="h-4 w-full rounded" />
                          </div>
                          <Skeleton className="h-4 w-16 rounded" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                      ))}
                    </>
                  ) : (
                    // Real Pages
                    pages.map((page, idx) => (
                      <div
                        key={`page-${idx}-${page.slug}`}
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
                    ))
                  )}
                </div>

                {/* Add Page */}
                <div className="flex gap-2 mt-3">
                  <Input
                    value={newPage}
                    onChange={(e) => setNewPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPage()}
                    placeholder="Neue Seite hinzufügen..."
                    className="bg-zinc-50 dark:bg-zinc-800"
                    disabled={loading}
                  />
                  <Button onClick={addPage} disabled={!newPage.trim() || loading} size="icon" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP: Design */}
          {step === 'design' && (
            <div className="space-y-6">
              {/* Design Styles - von AI gewählt */}
              {designStyles.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Design-Stile</label>
                  <div className="flex flex-wrap gap-2">
                    {designStyles.map((style) => (
                      <span
                        key={style}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" />
                        {style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors Section */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-3 block">Hauptfarben</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { key: 'primary', label: 'Primary' },
                    { key: 'primaryHover', label: 'Hover' },
                    { key: 'secondary', label: 'Secondary' },
                    { key: 'accent', label: 'Accent' },
                  ].map(({ key, label }, i) => (
                    <div key={key}>
                      {loading ? (
                        <div style={{ animationDelay: `${i * 50}ms` }}>
                          <Skeleton className="h-12 rounded-lg" />
                        </div>
                      ) : (
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
                      )}
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
                  ].map(({ key, label }, i) => (
                    <div key={key}>
                      {loading ? (
                        <div style={{ animationDelay: `${(i + 4) * 50}ms` }}>
                          <Skeleton className="h-12 rounded-lg" />
                        </div>
                      ) : (
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
                      )}
                      <span className="text-[10px] text-zinc-400 mt-1.5 block text-center">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Weitere Farben</label>
                  <button
                    onClick={() => {
                      const name = prompt('Farbname (z.B. warmNeutral, darkGray):')
                      if (name && name.trim()) {
                        setCustomColors(prev => ({ ...prev, [name.trim()]: '#f5f5f0' }))
                      }
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Hinzufügen
                  </button>
                </div>
                {Object.keys(customColors).length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(customColors).map(([name, color], i) => (
                      <div key={name} className="relative group">
                        <div
                          className="h-12 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer relative overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
                          style={{ backgroundColor: color }}
                        >
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setCustomColors(prev => ({ ...prev, [name]: e.target.value }))}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const newColors = { ...customColors }
                            delete newColors[name]
                            setCustomColors(newColors)
                          }}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[10px] text-zinc-400 mt-1.5 block text-center truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                    Keine weiteren Farben definiert. Klicke auf "Hinzufügen" um Custom Colors zu erstellen.
                  </p>
                )}
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-2">
                  Nutzung: bg-[name], text-[name], hover:bg-[name]
                </p>
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
                    {loading ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 mb-1.5 block">Fließtext</span>
                    {loading ? (
                      <Skeleton className="h-10 w-full rounded-lg" />
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                </div>
                {/* Font Preview */}
                <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  {loading ? (
                    <>
                      <Skeleton className="h-6 w-48 rounded mb-2" />
                      <Skeleton className="h-4 w-64 rounded" />
                    </>
                  ) : (
                    <>
                      <p className="text-lg mb-1 text-zinc-800 dark:text-zinc-200" style={{ fontFamily: tokens.fonts.heading }}>
                        Überschrift Beispiel
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400" style={{ fontFamily: tokens.fonts.body }}>
                        Dies ist ein Beispieltext für die Fließtext-Schriftart.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Navigation */}
          {step === 'nav' && (
            <div className="space-y-6">
              {/* Info Box */}
              <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">Header-Design:</span> Die AI erstellt einen passenden Header-Stil basierend auf {designStyles.length > 0 ? `den Design-Stilen: ${designStyles.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}` : 'deinen Einstellungen'}.
                </p>
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
