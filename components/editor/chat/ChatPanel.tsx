'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { ChatMessage } from './ChatMessage'
import { PromptBuilder } from './PromptBuilder'
import WireframeBuildAnimation from './WireframeBuildAnimation'
import {
  parseOperationFormat,
  applyOperation,
  injectCSSVariables,
  injectAnimationKeyframes,
} from '@/lib/ai/html-operations'
import {
  parseReferenceUpdates,
  type ReferenceUpdate,
  type ParseResult,
} from '@/lib/ai/reference-operations'
import { detectComponentType, detectPromptIntent } from '@/lib/ai/component-detection'
import { createClient } from '@/lib/supabase/client'
import { type SuggestedTokens } from '@/lib/design/style-extractor'
import { type DetectedFont } from '@/lib/fonts/font-detector'
import { DesignSystemDialog } from '@/components/design/DesignSystemDialog'
import { GlobalComponentsDialog } from '@/components/design/GlobalComponentsDialog'
import { SiteSetupModal, type SiteSetupData } from '@/components/design/SiteSetupModal'
import { createPagesOnly, createHeaderMenu, createFooterMenu, createPagesFromSuggestions } from '@/lib/menus/setup-menus'
import { getDesignVariables, updateDesignVariables } from '@/lib/supabase/queries/design-variables'
import { upsertDesignSystem } from '@/lib/supabase/queries/design-system'
import { generateDesignSystem } from '@/lib/ai/design-system-generator'
import { extractGlobalComponents, removeHeaderFooterFromHtml, sanitizeHtmlForGlobalComponents, fixMobileMenuInHeader } from '@/lib/ai/html-operations'
import type { DetectedComponent } from '@/types/global-components'
import { ReferenceDropdown, ReferenceBadge } from './ReferenceDropdown'
import type { Reference, ReferenceGroup, SelectedReference, ReferenceDataForAI } from '@/lib/references/reference-types'
import { REFERENCE_CATEGORIES } from '@/lib/references/reference-types'
import { loadAllReferences, resolveReferencesForAI, searchReferences } from '@/lib/references/reference-resolver'
import {
  Send,
  Sparkles,
  Loader2,
  Paperclip,
  ChevronDown,
  Wand2,
  FileText,
  X,
  Brain,
  ChevronUp,
  Globe,
  Code,
  Link,
  MessageSquare,
  Plus,
  ImageIcon,
} from 'lucide-react'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState({
    name: 'Gemini 3 Flash',
    id: 'gemini-3-flash-preview',
    description: 'Schnell & günstig'
  })
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Design System Dialog State
  const [designDialogOpen, setDesignDialogOpen] = useState(false)
  const [suggestedTokens, setSuggestedTokens] = useState<SuggestedTokens | null>(null)
  const [detectedFonts, setDetectedFonts] = useState<DetectedFont[]>([])

  // Global Components Dialog State
  const [globalComponentsDialogOpen, setGlobalComponentsDialogOpen] = useState(false)
  const [detectedHeader, setDetectedHeader] = useState<DetectedComponent | null>(null)
  const [detectedFooter, setDetectedFooter] = useState<DetectedComponent | null>(null)
  const [pendingFinalHtml, setPendingFinalHtml] = useState<string | null>(null)

  // Site Setup Modal State (NEU: Unified Setup)
  const [siteSetupModalOpen, setSiteSetupModalOpen] = useState(false)
  const [siteSetupPrompt, setSiteSetupPrompt] = useState('')
  const [siteSetupImages, setSiteSetupImages] = useState<Array<{ base64: string; mimeType: string }>>([])

  // Thinking Mode State
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [currentThinking, setCurrentThinking] = useState('')
  // Generation phase: 'idle' | 'thinking' | 'building'
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'thinking' | 'building'>('idle')

  // Streaming Progress State
  const [streamingStats, setStreamingStats] = useState<{
    startTime: number
    charCount: number
    lastActivity: number
  } | null>(null)

  // Gemini Tools State
  const [googleSearchEnabled, setGoogleSearchEnabled] = useState(false)
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(false)
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])

  // Image Upload State
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string; base64: string }>>([])
  const imageInputRef = useRef<HTMLInputElement>(null)

  // @-Reference System State (erweitert für alle Referenz-Typen)
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('')
  const [referenceDropdownPosition, setReferenceDropdownPosition] = useState({ top: 0, left: 0 })
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([])
  const [mentionStartPos, setMentionStartPos] = useState(-1)

  // Pending Reference Updates State (fuer Preview vor dem Speichern)
  const [pendingReferenceUpdates, setPendingReferenceUpdates] = useState<ReferenceUpdate[]>([])
  const [referenceUpdateMessage, setReferenceUpdateMessage] = useState<string>('')

  // Legacy Page Reference State (für Rückwärtskompatibilität)
  const [referencedPageIds, setReferencedPageIds] = useState<string[]>([])

  const messages = useEditorStore((s) => s.messages)
  const isGenerating = useEditorStore((s) => s.isGenerating)
  const html = useEditorStore((s) => s.html)
  const siteContext = useEditorStore((s) => s.siteContext)
  const selectedElement = useEditorStore((s) => s.selectedElement)
  const pages = useEditorStore((s) => s.pages)
  const siteId = useEditorStore((s) => s.siteId)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)
  const loadGlobalComponents = useEditorStore((s) => s.loadGlobalComponents)

  // Get referenced page objects (für Rückwärtskompatibilität + AI-Daten)
  const referencedPages = useMemo(() => {
    // Aus selectedReferences die Pages extrahieren
    const pageRefs = selectedReferences.filter(r => r.category === 'page')
    return pages.filter(p => pageRefs.some(ref => ref.id === p.id))
  }, [pages, selectedReferences])

  const addMessage = useEditorStore((s) => s.addMessage)
  const updateMessage = useEditorStore((s) => s.updateMessage)
  const setGenerating = useEditorStore((s) => s.setGenerating)
  const applyGeneratedHtml = useEditorStore((s) => s.applyGeneratedHtml)

  // Local state to prevent double-clicks before store updates
  const [isSending, setIsSending] = useState(false)

  // Retry state
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 1

  // Wireframe Animation State (from store for LivePreview access)
  const activeBuildSection = useEditorStore((s) => s.activeBuildSection)
  const setActiveBuildSection = useEditorStore((s) => s.setActiveBuildSection)

  // Reset isSending and animation when generation completes
  useEffect(() => {
    if (!isGenerating) {
      if (isSending) {
        setIsSending(false)
      }
      // Reset wireframe animation
      setActiveBuildSection(null)
    }
  }, [isGenerating, isSending, setActiveBuildSection])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  // Track if user is near bottom for smart scrolling
  const isUserNearBottom = useRef(true)
  const lastMessageCount = useRef(messages.length)

  // Get last message for tracking streaming updates
  const lastMessage = messages[messages.length - 1]
  const lastMessageContent = lastMessage?.content || ''
  const lastMessageThinking = lastMessage?.thinking || ''
  const isStreaming = lastMessage?.isStreaming || false

  // Handle scroll events to track if user scrolled up
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    // Consider "near bottom" if within 100px of bottom
    isUserNearBottom.current = scrollHeight - scrollTop - clientHeight < 100
  }

  // Smart auto-scroll: scroll on new message OR content updates during streaming
  // ABER: Nicht scrollen wenn User aktiv hochgescrollt hat!
  useEffect(() => {
    if (!scrollRef.current) return

    const isNewMessage = messages.length > lastMessageCount.current
    lastMessageCount.current = messages.length

    // Nur scrollen wenn:
    // 1. Neue Nachricht UND User war near bottom, ODER
    // 2. Streaming UND User war near bottom
    // NICHT mehr: "immer wenn isStreaming" - das blockierte manuelles Scrollen!
    const shouldScroll = (isNewMessage && isUserNearBottom.current) ||
                         (isStreaming && isUserNearBottom.current)

    if (shouldScroll) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      })
    }
  }, [messages, lastMessageContent, lastMessageThinking, isStreaming])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setModelDropdownOpen(false)
    if (modelDropdownOpen) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [modelDropdownOpen])

  // Store current prompt for component detection
  const currentPromptRef = useRef('')

  // Handle saving design tokens from dialog
  const handleSaveDesignTokens = async (tokens: SuggestedTokens, downloadFonts: boolean) => {
    if (!siteId) return

    try {
      // Update design variables in database
      // Use type assertion since we're only updating partial values
      await updateDesignVariables(siteId, {
        colors: {
          brand: {
            primary: tokens.colors.primary,
            secondary: tokens.colors.secondary,
            accent: tokens.colors.accent,
          },
          neutral: {
            '50': tokens.colors.background,
            '100': tokens.colors.muted,
            '200': tokens.colors.border,
            '900': tokens.colors.foreground,
          },
          semantic: {
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6',
          },
        },
        typography: {
          fontHeading: tokens.fonts.heading,
          fontBody: tokens.fonts.body,
          fontMono: tokens.fonts.mono,
        },
        spacing: {
          scale: {
            xs: '0.5rem',
            sm: '1rem',
            md: '1.5rem',
            lg: '2rem',
            xl: tokens.spacing.section,
            '2xl': '4rem',
            '3xl': '6rem',
            section: tokens.spacing.section,
            container: tokens.spacing.container,
            'card-gap': tokens.spacing.cardGap,
          },
          containerWidths: {
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: tokens.spacing.container,
            '2xl': '1536px',
          },
        },
        borders: {
          radius: {
            none: '0',
            sm: '0.125rem',
            md: tokens.radii.default,
            lg: tokens.radii.lg,
            xl: '1rem',
            '2xl': '1.5rem',
            full: '9999px',
            default: tokens.radii.default,
          },
        },
      } as Parameters<typeof updateDesignVariables>[1])

      // Download fonts if requested
      if (downloadFonts && detectedFonts.length > 0) {
        const googleFonts = detectedFonts.filter(f => f.source === 'google')
        if (googleFonts.length > 0) {
          await fetch('/api/fonts/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              siteId,
              fonts: googleFonts,
            }),
          })
        }
      }

      console.log('Design tokens saved successfully')
    } catch (error) {
      console.error('Error saving design tokens:', error)
      throw error
    }
  }

  // Build enhanced prompt with setup data for AI - INKL. Header/Footer Generierung
  const buildEnhancedPromptWithHeaderFooter = (originalPrompt: string, setupData: SiteSetupData): string => {
    const selectedPages = setupData.pages.filter(p => p.selected)
    const headerMenuItems = setupData.headerSettings.menuItems.map(m => m.name).join(', ')
    const footerMenuItems = setupData.footerSettings.menuItems.map(m => m.name).join(', ')


    // Archetyp-spezifische Beschreibungen
    const archetypeDescriptions: Record<string, string> = {
      architect: `ARCHITECT-STIL (Seriös, Premium):
- Formen: ECKIG! Nutze rounded-none oder rounded-sm. Keine runden Elemente!
- Layout: Asymmetrische Grids, feine Linien (border-[0.5px]), viel Weißraum
- Typo: GROSS und elegant. Serif für Headlines, Sans für Body
- Motion: LANGSAM (700-1000ms), elegant, KEINE bouncy Effekte
- Borders: Feine, dezente Linien statt Schatten
- Gesamteindruck: Wie eine Premium-Anwaltskanzlei oder Luxus-Bank`,

      innovator: `INNOVATOR-STIL (Modern, Tech):
- Formen: RUND! Nutze rounded-2xl, rounded-3xl. Weiche, freundliche Ecken
- Layout: Glassmorphism, weiche Schatten, schwebende Cards
- Typo: Modern Geometric Sans (wie Inter, Space Grotesk)
- Motion: SCHNELL (200-400ms), snappy, micro-interactions
- Effekte: Blur-Backgrounds, Gradient Blobs, subtiles Noise, Glow auf CTAs
- Gesamteindruck: Wie ein modernes SaaS-Produkt oder Tech-Startup`,

      brutalist: `BRUTALIST-STIL (Bold, Künstlerisch):
- Formen: EXTREM! Entweder komplett eckig (rounded-none) ODER komplett rund (rounded-full). Kein Mittelweg!
- Layout: RIESIGE Typografie (text-8xl+), dicke Borders (border-4), Marquee-Text
- Typo: Monospace oder Bold Display Fonts (Bebas Neue, Anton)
- Motion: HART und schnell (100-200ms), "in your face"
- Effekte: Scan-Lines, starke Kontraste, KEINE weichen Blurs
- Gesamteindruck: Wie eine Kunst-Galerie oder Mode-Agentur`,

      organic: `ORGANIC-STIL (Soft, Natürlich):
- Formen: SEHR WEICH! Nutze rounded-[40px], rounded-full, Blob-Shapes
- Layout: Überlappende Bilder, natürliche Anordnung, asymmetrisch aber soft
- Typo: Rounded Sans (Nunito, Quicksand), evtl. Handschrift-Akzente
- Motion: BOUNCY (ease-out mit Überschwung), elastisch, verspielt
- Effekte: Soft Shadows, Gradient Blobs, natürliche Farben
- Gesamteindruck: Wie ein Wellness-Spa oder Bio-Food-Brand`,
    }

    const archetypeDesc = archetypeDescriptions[setupData.archetype] || archetypeDescriptions.innovator

    return `${originalPrompt}

═══════════════════════════════════════════════════════════════════════════
WEBSITE SETUP (vom User konfiguriert)
═══════════════════════════════════════════════════════════════════════════

Website-Name: ${setupData.siteName}
Website-Typ: ${setupData.siteType}
Design-Archetyp: ${setupData.archetype.toUpperCase()}

SEITEN die verlinkt werden müssen:
${selectedPages.map(p => `- "${p.name}" -> href="/${p.slug}"`).join('\n')}

═══════════════════════════════════════════════════════════════════════════
DESIGN-ARCHETYP: ${setupData.archetype.toUpperCase()}
═══════════════════════════════════════════════════════════════════════════

${archetypeDesc}

BORDER-RADIUS (für diesen Archetyp):
- Default: ${setupData.radii.default}
- Buttons: ${setupData.radii.button}
- Cards: ${setupData.radii.card}
- Inputs: ${setupData.radii.input}

MOTION (für diesen Archetyp):
- Stil: ${setupData.motion.style}
- Geschwindigkeit: fast=${setupData.motion.duration.fast}, normal=${setupData.motion.duration.slow}
- Easing: ${setupData.motion.easing}
- Hover-Scale: ${setupData.motion.hoverScale}

LAYOUT (für diesen Archetyp):
- Stil: ${setupData.layout.style}
- Max-Width: ${setupData.layout.maxWidth}
- Section-Spacing: ${setupData.layout.sectionSpacing}
- Hero-Stil: ${setupData.layout.heroStyle}
${setupData.layout.useOverlaps ? '- Overlapping Elemente erlaubt' : '- Keine Overlaps'}

EFFEKTE (für diesen Archetyp):
${setupData.effects.useNoise ? '- Noise-Textur im Hintergrund' : ''}
${setupData.effects.useBlur ? '- Blur/Glassmorphism erlaubt' : ''}
${setupData.effects.useGradientBlobs ? '- Gradient Blobs als Dekoration' : ''}
${setupData.effects.useScanLines ? '- Scan-Lines für Retro/Tech-Look' : ''}
${setupData.effects.borderStyle !== 'none' ? `- Border-Stil: ${setupData.effects.borderStyle}` : ''}

═══════════════════════════════════════════════════════════════════════════
HEADER ANFORDERUNGEN
═══════════════════════════════════════════════════════════════════════════

- DESIGN FREI WÄHLEN! Wähle einen kreativen Header-Stil passend zum ${setupData.archetype.toUpperCase()}-Archetyp
- Navigation-Links: ${headerMenuItems}
- Links müssen zu den echten Seiten verlinken (siehe oben)
${setupData.headerSettings.showCta ? `- CTA-Button: "${setupData.headerSettings.ctaText}" verlinkt zu "/${setupData.headerSettings.ctaPage}"` : '- Kein CTA-Button'}
${setupData.headerSettings.sticky ? '- Header soll sticky sein (fixed beim Scrollen)' : '- Header ist nicht sticky'}
- Mobile: Burger-Menu für kleine Bildschirme

═══════════════════════════════════════════════════════════════════════════
FOOTER ANFORDERUNGEN
═══════════════════════════════════════════════════════════════════════════

- Links zu: ${footerMenuItems}
- Links müssen zu den echten Seiten verlinken
${setupData.footerSettings.showCopyright ? `- Copyright-Text: "${setupData.footerSettings.copyrightText}"` : ''}

═══════════════════════════════════════════════════════════════════════════
FARBEN (CSS-Variablen)
═══════════════════════════════════════════════════════════════════════════

BRAND:
- bg-[var(--color-brand-primary)] (${setupData.tokens.colors.primary})
- hover:bg-[var(--color-brand-primary-hover)] (${setupData.tokens.colors.primaryHover})
- bg-[var(--color-brand-secondary)] (${setupData.tokens.colors.secondary})
- bg-[var(--color-brand-accent)] (${setupData.tokens.colors.accent})

NEUTRAL:
- bg-[var(--color-neutral-background)] (${setupData.tokens.colors.background})
- text-[var(--color-neutral-foreground)] (${setupData.tokens.colors.foreground})
- bg-[var(--color-neutral-muted)] (${setupData.tokens.colors.muted})
- border-[var(--color-neutral-border)] (${setupData.tokens.colors.border})
${Object.keys(setupData.customColors).length > 0 ? `
CUSTOM:
${Object.entries(setupData.customColors).map(([key, value]) => `- bg-[var(--color-custom-${key})] (${value})`).join('\n')}` : ''}

SCHRIFTEN:
- style="font-family: var(--font-heading)" (${setupData.tokens.fonts.heading})
- style="font-family: var(--font-body)" (${setupData.tokens.fonts.body})
${setupData.tokens.fonts.mono ? `- style="font-family: var(--font-mono)" (${setupData.tokens.fonts.mono})` : ''}

═══════════════════════════════════════════════════════════════════════════
WICHTIGE REGELN
═══════════════════════════════════════════════════════════════════════════

1. HALTE DICH STRIKT AN DEN ${setupData.archetype.toUpperCase()}-ARCHETYP!
2. KEINE EMOJIS! Verwende IMMER inline SVG Icons.
3. Nutze GSAP-kompatible Animationen: data-reveal="up|down|left|right", data-parallax="0.5"
4. Generiere die KOMPLETTE Seite mit Header, Main Content und Footer.
5. Der Header und Footer werden automatisch erkannt und als wiederverwendbare Komponenten gespeichert.`
  }

  // Store enhanced prompt for API (not shown in chat)
  const enhancedPromptRef = useRef<string | null>(null)
  // Store images for API (from setup flow)
  const storedImagesRef = useRef<Array<{ base64: string; mimeType: string }> | null>(null)

  // Handle send with setup data (after setup modal)
  const handleSendWithSetup = async (enhancedPrompt: string, originalPrompt: string, images?: Array<{ base64: string; mimeType: string }>) => {
    // Store enhanced prompt for API call
    enhancedPromptRef.current = enhancedPrompt
    // Store images for API call
    storedImagesRef.current = images || null
    // Show original prompt in chat, but use enhanced prompt for API (skipSetup = true)
    await handleSend(originalPrompt, true)
  }

  // Check if site needs setup (no custom design tokens yet)
  const checkIfNeedsSetup = async (): Promise<boolean> => {
    if (!siteId) return false

    try {
      const variables = await getDesignVariables(siteId)
      const defaultPrimary = '#3b82f6'
      const currentPrimary = variables.colors?.brand?.primary
      const hasCustomTokens = currentPrimary && currentPrimary !== defaultPrimary
      return !hasCustomTokens
    } catch {
      return false
    }
  }

  const handleSend = async (promptOverride?: string, skipSetup?: boolean) => {
    const promptToSend = promptOverride || input.trim()
    const hasFiles = uploadedImages.length > 0

    // Allow sending with just files (no text required)
    if ((!promptToSend && !hasFiles) || isGenerating || isSending) return

    // Immediately set sending state to prevent double-clicks
    setIsSending(true)

    // Prüfe ob Setup nötig ist (prüft ob Custom-Tokens existieren)
    // skipSetup = true wenn wir vom Setup Modal kommen
    if (!skipSetup && siteId) {
      const needsSetup = await checkIfNeedsSetup()
      if (needsSetup) {
        // Speichere Bilder für Setup-Analyse und späteren Generate-Request
        const imagesForSetup = uploadedImages.map(img => ({
          base64: img.base64,
          mimeType: img.file.type,
        }))

        setInput('')
        setUploadedImages([]) // Clear UI

        // Zeige User-Nachricht (mit Hinweis auf Dateien)
        const displayContent = hasFiles
          ? `${promptToSend}\n\n[${uploadedImages.length} Datei(en) angehängt]`
          : promptToSend
        addMessage({ role: 'user', content: displayContent })

        // Speichere Prompt UND Bilder, öffne Setup Modal
        setSiteSetupPrompt(promptToSend)
        setSiteSetupImages(imagesForSetup)
        setSiteSetupModalOpen(true)
        setIsSending(false)

        return // Stoppe hier - Generierung erfolgt nach Setup
      }
      // needsSetup = false → Custom-Tokens existieren bereits, weiter mit Generierung
    }

    // Store prompt for later use in component detection
    currentPromptRef.current = promptToSend

    // Kopiere selectedReferences bevor sie geloescht werden
    const currentReferences = [...selectedReferences]

    // Prepare all references for display
    const referenceDisplayParts = currentReferences.map(ref => {
      const config = REFERENCE_CATEGORIES[ref.category]
      return `@${ref.displayName}`
    })

    setInput('')
    setSelectedReferences([]) // Clear all references after sending
    setGenerating(true)

    // Show all references in user message
    const displayContent = currentReferences.length > 0
      ? `${promptToSend}\n\n[Referenzen: ${referenceDisplayParts.join(', ')}]`
      : promptToSend

    addMessage({ role: 'user', content: displayContent })
    addMessage({ role: 'assistant', content: '', isStreaming: true })

    // Initialize streaming stats
    const now = Date.now()
    setStreamingStats({
      startTime: now,
      charCount: 0,
      lastActivity: now,
    })

    try {
      // Reset thinking content for new request
      setCurrentThinking('')

      // Referenzen auflösen (mit IDs und vollstaendigen Daten)
      let resolvedReferences: ReferenceDataForAI | undefined
      if (currentReferences.length > 0 && siteId) {
        resolvedReferences = await resolveReferencesForAI(
          siteId,
          currentReferences.map(r => ({ category: r.category, id: r.id })),
          html // Aktuelles Seiten-HTML fuer Sections
        )
        console.log('Resolved references for AI:', resolvedReferences)
      }

      // Prepare referenced pages data (fuer Rueckwaertskompatibilitaet - nur Pages)
      const referencedPagesData = referencedPages.map(p => ({
        name: p.name,
        html: p.htmlContent || ''
      }))

      // Use enhanced prompt for API if available (from setup modal), otherwise use display prompt
      const apiPrompt = enhancedPromptRef.current || promptToSend
      // Clear the enhanced prompt ref after using it
      enhancedPromptRef.current = null

      // Abort any existing request before starting new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // Prepare images for API (base64 with mimeType)
      // Use storedImagesRef if available (from setup flow), otherwise use uploadedImages
      let imagesToSend: Array<{ base64: string; mimeType: string }> | undefined

      if (storedImagesRef.current && storedImagesRef.current.length > 0) {
        // Images from setup flow
        imagesToSend = storedImagesRef.current
        storedImagesRef.current = null // Clear after use
        console.log(`[AI] Using ${imagesToSend.length} stored image(s) from setup flow`)
      } else if (uploadedImages.length > 0) {
        // Images from direct upload
        imagesToSend = uploadedImages.map(img => ({
          base64: img.base64,
          mimeType: img.file.type,
        }))
      }

      // Clear uploaded images after preparing them
      setUploadedImages([])

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: apiPrompt,
          existingHtml: html,
          context: siteContext || {},
          selectedElement: selectedElement,
          model: selectedModel.id,
          referencedPages: referencedPagesData.length > 0 ? referencedPagesData : undefined,
          // NEU: Aufgelöste Referenzen mit IDs
          references: resolvedReferences,
          thinkingEnabled,
          // Gemini Tools
          googleSearchEnabled,
          codeExecutionEnabled,
          // Images for multimodal
          images: imagesToSend,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) throw new Error('Failed to generate')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''
      // Track tool outputs during streaming
      let searchSources: Array<{ title: string; uri: string }> = []
      let executableCode = ''
      let codeResult = ''
      // Buffer für unvollständige SSE-Chunks (verhindert Datenverlust bei Netzwerk-Glitches)
      let sseBuffer = ''
      // Function Call tracking
      let functionCall: { name: string; args: Record<string, unknown> } | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        // Chunk zum Buffer hinzufügen und nach Zeilenumbrüchen splitten
        sseBuffer += chunk
        const lines = sseBuffer.split('\n')
        // Letztes Element behalten (könnte unvollständig sein)
        sseBuffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                // Accumulate thinking content
                setCurrentThinking(prev => prev + data.content)
                // Set phase to thinking
                if (generationPhase !== 'thinking') {
                  setGenerationPhase('thinking')
                }
              }

              // Handle Google Search results
              if (data.type === 'search_results') {
                if (data.sources && data.sources.length > 0) {
                  searchSources = data.sources
                  console.log('Search sources received:', searchSources)
                }
              }

              // Handle Code Execution
              if (data.type === 'executable_code') {
                executableCode = data.code
                console.log('Executable code received:', executableCode.substring(0, 100))
              }

              if (data.type === 'code_result') {
                codeResult = data.output
                console.log('Code result received:', codeResult.substring(0, 100))
              }

              // Handle Function Calls (structured HTML operations)
              if (data.type === 'function_call') {
                functionCall = {
                  name: data.name,
                  args: data.args,
                }
                console.log('[Function Call]', data.name, data.args)

                // Switch from thinking to building phase
                setGenerationPhase('building')

                // Activate section highlight in preview
                const sectionId = data.args?.section_id as string || undefined
                if (sectionId) {
                  setActiveBuildSection({
                    id: sectionId,
                    operation: data.name,
                  })
                }

                // Show the message to user during streaming
                const message = data.args?.message as string || 'Verarbeite...'
                const msgs = useEditorStore.getState().messages
                const lastMsg = msgs[msgs.length - 1]
                if (lastMsg?.role === 'assistant') {
                  updateMessage(lastMsg.id, {
                    content: message,
                    isStreaming: true,
                  })
                }
              }

              if (data.type === 'text') {
                fullContent += data.content

                // Update streaming stats
                setStreamingStats(prev => prev ? {
                  ...prev,
                  charCount: fullContent.length,
                  lastActivity: Date.now(),
                } : null)

                // Bei Function Calling: Zeige keinen Text während wir auf FC warten
                // Der Function Call Handler zeigt dann die richtige Message
                const hasOtherTools = googleSearchEnabled || codeExecutionEnabled

                const msgs = useEditorStore.getState().messages
                const lastMsg = msgs[msgs.length - 1]
                if (lastMsg?.role === 'assistant') {
                  updateMessage(lastMsg.id, {
                    // Text nur zeigen wenn andere Tools aktiv (kein FC erwartet)
                    content: hasOtherTools ? fullContent : '',
                    isStreaming: true,
                    searchSources: searchSources.length > 0 ? searchSources : undefined,
                    executableCode: executableCode || undefined,
                    codeResult: codeResult || undefined,
                  })
                }
              }

              if (data.type === 'done') {
                console.log('Full AI response:', fullContent)
                console.log('Function call:', functionCall)

                // Function Call Flow (strukturierte Ausgabe)
                if (functionCall) {
                  console.log('[Function Call] Processing:', functionCall.name)
                  const args = functionCall.args as Record<string, string>
                  const currentHtml = useEditorStore.getState().html
                  let finalHtml = currentHtml
                  let displayMessage = args.message || ''

                  switch (functionCall.name) {
                    case 'create_full_page': {
                      // Komplette neue Seite
                      finalHtml = args.html
                      console.log('[Function Call] create_full_page - HTML length:', finalHtml.length)
                      break
                    }

                    case 'replace_section': {
                      // Section komplett ersetzen
                      const sectionId = args.section_id
                      const newHtml = args.html
                      console.log('[Function Call] replace_section - ID:', sectionId)

                      // Finde und ersetze die Section
                      const sectionRegex = new RegExp(
                        `<(section|div|article)[^>]*id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>`,
                        'gi'
                      )
                      finalHtml = currentHtml.replace(sectionRegex, newHtml)

                      if (finalHtml === currentHtml) {
                        console.warn('[Function Call] Section not found, trying broader match')
                        // Fallback: Suche nach id="sectionId" im Element
                        const broadRegex = new RegExp(
                          `<[^>]+id=["']${sectionId}["'][^>]*>[\\s\\S]*?(?=<(?:section|footer|header|main|article)[^>]*>|<\\/body>)`,
                          'gi'
                        )
                        finalHtml = currentHtml.replace(broadRegex, newHtml)
                      }
                      break
                    }

                    case 'modify_section': {
                      // Section modifizieren (gleiche Logik wie replace)
                      const sectionId = args.section_id
                      const newHtml = args.html
                      console.log('[Function Call] modify_section - ID:', sectionId)

                      const sectionRegex = new RegExp(
                        `<(section|div|article)[^>]*id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>`,
                        'gi'
                      )
                      finalHtml = currentHtml.replace(sectionRegex, newHtml)
                      break
                    }

                    case 'add_section': {
                      // Neue Section hinzufügen
                      const position = args.position || 'end'
                      const newHtml = args.html
                      console.log('[Function Call] add_section - Position:', position)

                      if (position === 'end') {
                        // Vor </body> einfügen
                        finalHtml = currentHtml.replace(/<\/body>/i, `${newHtml}\n</body>`)
                      } else if (position === 'start') {
                        // Nach <body> einfügen
                        finalHtml = currentHtml.replace(/(<body[^>]*>)/i, `$1\n${newHtml}`)
                      } else if (position.startsWith('after_')) {
                        // Nach bestimmter Section
                        const targetId = position.replace('after_', '')
                        const targetRegex = new RegExp(
                          `(<(section|div|article)[^>]*id=["']${targetId}["'][^>]*>[\\s\\S]*?<\\/\\2>)`,
                          'gi'
                        )
                        finalHtml = currentHtml.replace(targetRegex, `$1\n${newHtml}`)
                      } else if (position.startsWith('before_')) {
                        // Vor bestimmter Section
                        const targetId = position.replace('before_', '')
                        const targetRegex = new RegExp(
                          `(<(section|div|article)[^>]*id=["']${targetId}["'][^>]*>)`,
                          'gi'
                        )
                        finalHtml = currentHtml.replace(targetRegex, `${newHtml}\n$1`)
                      }
                      break
                    }

                    case 'delete_section': {
                      // Section löschen
                      const sectionId = args.section_id
                      console.log('[Function Call] delete_section - ID:', sectionId)

                      const sectionRegex = new RegExp(
                        `<(section|div|article)[^>]*id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>\\s*`,
                        'gi'
                      )
                      finalHtml = currentHtml.replace(sectionRegex, '')
                      break
                    }

                    case 'update_global_component': {
                      // Global Header/Footer Update
                      const componentId = args.component_id
                      const componentType = args.component_type
                      const newHtml = args.html
                      console.log('[Function Call] update_global_component - Type:', componentType, 'ID:', componentId)

                      // Speichere als pending Reference Update
                      setPendingReferenceUpdates([{
                        type: 'component',
                        id: componentId,
                        componentType: componentType as 'header' | 'footer',
                        html: newHtml,
                      }])

                      // Update Message und beende
                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage,
                          isStreaming: false,
                          hasReferenceUpdates: true,
                          referenceUpdates: [{
                            type: 'component',
                            id: componentId,
                            componentType: componentType as 'header' | 'footer',
                            html: newHtml,
                          }],
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    case 'update_design_token': {
                      // Design Token Update
                      const tokenId = args.token_id
                      const value = args.value
                      console.log('[Function Call] update_design_token - ID:', tokenId, 'Value:', value)

                      setPendingReferenceUpdates([{
                        type: 'token',
                        id: tokenId,
                        value: value,
                      }])

                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage,
                          isStreaming: false,
                          hasReferenceUpdates: true,
                          referenceUpdates: [{
                            type: 'token',
                            id: tokenId,
                            value: value,
                          }],
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    case 'respond_only': {
                      // Nur Antwort, kein HTML
                      console.log('[Function Call] respond_only')
                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage,
                          isStreaming: false,
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    // ============================================
                    // MENÜ TOOLS
                    // ============================================
                    case 'add_menu_item':
                    case 'remove_menu_item':
                    case 'reorder_menu': {
                      console.log('[Function Call] Menu operation:', functionCall.name)
                      // Menü-Updates werden als Reference Updates behandelt
                      setPendingReferenceUpdates([{
                        type: 'menu',
                        id: args.menu_id,
                        action: functionCall.name === 'add_menu_item' ? 'add' : functionCall.name === 'remove_menu_item' ? 'remove' : 'reorder',
                        ...args,
                      }])
                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage,
                          isStreaming: false,
                          hasReferenceUpdates: true,
                          referenceUpdates: [{
                            type: 'menu',
                            id: args.menu_id,
                            action: functionCall.name === 'add_menu_item' ? 'add' : functionCall.name === 'remove_menu_item' ? 'remove' : 'reorder',
                            ...args,
                          }],
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    // ============================================
                    // BILD TOOLS
                    // ============================================
                    case 'replace_image': {
                      console.log('[Function Call] replace_image')
                      const sectionId = args.section_id
                      const imgSelector = args.image_selector || 'img'
                      const newSrc = args.new_src
                      const newAlt = args.new_alt

                      // Finde das Bild und ersetze src/alt
                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const section = doc.getElementById(sectionId)
                      if (section) {
                        const img = section.querySelector(imgSelector) as HTMLImageElement
                        if (img) {
                          img.src = newSrc
                          img.alt = newAlt
                          finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                        }
                      }
                      break
                    }

                    case 'set_background_image': {
                      console.log('[Function Call] set_background_image')
                      const sectionId = args.section_id
                      const imageUrl = args.image_url
                      const overlay = args.overlay
                      const position = args.position || 'center'

                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const section = doc.getElementById(sectionId)
                      if (section) {
                        section.style.backgroundImage = `url('${imageUrl}')`
                        section.style.backgroundSize = 'cover'
                        section.style.backgroundPosition = position
                        if (overlay) {
                          // Add overlay div
                          const overlayDiv = doc.createElement('div')
                          overlayDiv.style.cssText = `position:absolute;inset:0;background:${overlay};`
                          overlayDiv.className = 'absolute inset-0'
                          section.style.position = 'relative'
                          section.insertBefore(overlayDiv, section.firstChild)
                        }
                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    // ============================================
                    // SEO TOOLS
                    // ============================================
                    case 'update_page_title': {
                      console.log('[Function Call] update_page_title:', args.title)
                      finalHtml = currentHtml.replace(
                        /<title>[^<]*<\/title>/i,
                        `<title>${args.title}</title>`
                      )
                      if (!currentHtml.includes('<title>')) {
                        finalHtml = finalHtml.replace(
                          '</head>',
                          `<title>${args.title}</title>\n</head>`
                        )
                      }
                      break
                    }

                    case 'update_meta_description': {
                      console.log('[Function Call] update_meta_description')
                      const desc = args.description
                      if (currentHtml.includes('name="description"')) {
                        finalHtml = currentHtml.replace(
                          /<meta\s+name=["']description["']\s+content=["'][^"']*["'][^>]*>/i,
                          `<meta name="description" content="${desc}">`
                        )
                      } else {
                        finalHtml = currentHtml.replace(
                          '</head>',
                          `<meta name="description" content="${desc}">\n</head>`
                        )
                      }
                      break
                    }

                    case 'add_structured_data': {
                      console.log('[Function Call] add_structured_data:', args.schema_type)
                      const schemaScript = `<script type="application/ld+json">\n${args.data}\n</script>`
                      finalHtml = currentHtml.replace('</head>', `${schemaScript}\n</head>`)
                      break
                    }

                    // ============================================
                    // MULTI-ELEMENT TOOLS
                    // ============================================
                    case 'change_all_buttons': {
                      console.log('[Function Call] change_all_buttons')
                      const primaryClasses = args.primary_classes
                      const secondaryClasses = args.secondary_classes

                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const buttons = doc.querySelectorAll('button, a.btn, [role="button"]')

                      buttons.forEach((btn) => {
                        // Entferne alte Button-Klassen und füge neue hinzu
                        const isSecondary = btn.classList.contains('btn-secondary') ||
                                           btn.classList.contains('secondary') ||
                                           btn.getAttribute('data-variant') === 'secondary'
                        const newClasses = isSecondary && secondaryClasses ? secondaryClasses : primaryClasses
                        btn.className = newClasses
                      })

                      finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      break
                    }

                    case 'update_color_scheme': {
                      console.log('[Function Call] update_color_scheme')
                      // Multi-Token Update
                      const tokenUpdates: Array<{ type: 'token'; id: string; value: string }> = []

                      if (args.primary_color) {
                        tokenUpdates.push({ type: 'token', id: 'color-brand-primary', value: args.primary_color })
                      }
                      if (args.secondary_color) {
                        tokenUpdates.push({ type: 'token', id: 'color-brand-secondary', value: args.secondary_color })
                      }
                      if (args.accent_color) {
                        tokenUpdates.push({ type: 'token', id: 'color-brand-accent', value: args.accent_color })
                      }
                      if (args.background_color) {
                        tokenUpdates.push({ type: 'token', id: 'color-neutral-background', value: args.background_color })
                      }
                      if (args.text_color) {
                        tokenUpdates.push({ type: 'token', id: 'color-neutral-foreground', value: args.text_color })
                      }

                      setPendingReferenceUpdates(tokenUpdates)
                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage,
                          isStreaming: false,
                          hasReferenceUpdates: true,
                          referenceUpdates: tokenUpdates,
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    // ============================================
                    // FORM BUILDER
                    // ============================================
                    case 'create_form': {
                      console.log('[Function Call] create_form:', args.form_type)
                      const rawFields = args.fields
                      const fields = (typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields) as Array<{
                        name: string
                        type: string
                        label: string
                        required?: boolean
                        placeholder?: string
                      }>

                      // Generiere Formular-HTML
                      let formHtml = `<form id="contact-form" class="space-y-6">\n`
                      fields.forEach((field) => {
                        const required = field.required ? 'required' : ''
                        const placeholder = field.placeholder || ''

                        formHtml += `  <div>\n`
                        formHtml += `    <label for="${field.name}" class="block text-sm font-medium mb-2">${field.label}</label>\n`

                        if (field.type === 'textarea') {
                          formHtml += `    <textarea id="${field.name}" name="${field.name}" rows="4" placeholder="${placeholder}" class="w-full px-4 py-3 rounded-lg border border-[var(--color-neutral-border)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent" ${required}></textarea>\n`
                        } else {
                          formHtml += `    <input type="${field.type}" id="${field.name}" name="${field.name}" placeholder="${placeholder}" class="w-full px-4 py-3 rounded-lg border border-[var(--color-neutral-border)] focus:ring-2 focus:ring-[var(--color-brand-primary)] focus:border-transparent" ${required}>\n`
                        }
                        formHtml += `  </div>\n`
                      })
                      formHtml += `  <button type="submit" class="w-full bg-[var(--color-brand-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-brand-primaryHover)] transition-colors">${args.submit_text}</button>\n`
                      formHtml += `</form>`

                      // Füge in Section ein oder als neue Section
                      if (args.section_id) {
                        const parser = new DOMParser()
                        const doc = parser.parseFromString(currentHtml, 'text/html')
                        const section = doc.getElementById(args.section_id)
                        if (section) {
                          section.innerHTML += formHtml
                          finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                        }
                      } else {
                        // Als neue Contact Section
                        const sectionHtml = `
<section id="contact" class="py-24 bg-[var(--color-neutral-muted)]">
  <div class="max-w-xl mx-auto px-4">
    <h2 class="text-3xl font-bold text-center mb-8">Kontakt</h2>
    ${formHtml}
  </div>
</section>`
                        finalHtml = currentHtml.replace(/<\/body>/i, `${sectionHtml}\n</body>`)
                      }
                      break
                    }

                    case 'add_form_field': {
                      console.log('[Function Call] add_form_field')
                      // Form Field hinzufügen - vereinfacht
                      const fieldHtml = `
<div>
  <label for="${args.field_name}" class="block text-sm font-medium mb-2">${args.field_label}</label>
  <input type="${args.field_type}" id="${args.field_name}" name="${args.field_name}" class="w-full px-4 py-3 rounded-lg border border-[var(--color-neutral-border)] focus:ring-2 focus:ring-[var(--color-brand-primary)]" ${args.required ? 'required' : ''}>
</div>`

                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const form = doc.querySelector(args.form_selector)
                      if (form) {
                        const submitBtn = form.querySelector('button[type="submit"]')
                        if (submitBtn) {
                          submitBtn.insertAdjacentHTML('beforebegin', fieldHtml)
                        } else {
                          form.innerHTML += fieldHtml
                        }
                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    // ============================================
                    // ANIMATION TOOLS
                    // ============================================
                    case 'add_animation': {
                      console.log('[Function Call] add_animation:', args.animation_type)
                      const animType = args.animation_type
                      const duration = args.duration || '0.6s'
                      const delay = args.delay || '0s'
                      const trigger = args.trigger || 'load'

                      // CSS für Animation
                      const animationCSS = `
<style>
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideLeft { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideRight { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
@keyframes zoomIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.animate-on-load { animation-fill-mode: both; }
</style>`

                      const animationMap: Record<string, string> = {
                        'fade-in': 'fadeIn',
                        'fade-up': 'fadeUp',
                        'fade-down': 'fadeDown',
                        'slide-left': 'slideLeft',
                        'slide-right': 'slideRight',
                        'zoom-in': 'zoomIn',
                        'bounce': 'bounce',
                        'pulse': 'pulse',
                      }

                      const animName = animationMap[animType] || 'fadeIn'

                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const element = doc.querySelector(args.element_selector)

                      if (element) {
                        element.classList.add('animate-on-load')
                        ;(element as HTMLElement).style.animation = `${animName} ${duration} ${delay} ease-out`

                        // Füge CSS hinzu wenn nicht vorhanden
                        if (!currentHtml.includes('@keyframes fadeIn')) {
                          const head = doc.querySelector('head')
                          if (head) {
                            head.insertAdjacentHTML('beforeend', animationCSS)
                          }
                        }

                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    case 'add_scroll_animations': {
                      console.log('[Function Call] add_scroll_animations')
                      const sectionId = args.section_id
                      const style = args.animation_style || 'stagger'
                      const staggerDelay = args.stagger_delay || '0.1s'

                      // Intersection Observer Script für Scroll-Animationen
                      const scrollScript = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('#${sectionId} .animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
});
</script>
<style>
.animate-on-scroll { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
.animate-visible { opacity: 1; transform: translateY(0); }
</style>`

                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const section = doc.getElementById(sectionId)

                      if (section) {
                        // Füge animate-on-scroll zu Kindern hinzu
                        const children = section.querySelectorAll(':scope > div > *')
                        let delayMs = 0
                        children.forEach((child, index) => {
                          child.classList.add('animate-on-scroll')
                          if (style === 'stagger') {
                            ;(child as HTMLElement).style.transitionDelay = `${delayMs}ms`
                            delayMs += parseInt(staggerDelay) * 1000 || 100
                          }
                        })

                        // Script hinzufügen
                        if (!currentHtml.includes('animate-on-scroll')) {
                          doc.body.insertAdjacentHTML('beforeend', scrollScript)
                        }

                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    // ============================================
                    // RESPONSIVE TOOLS
                    // ============================================
                    case 'adjust_mobile':
                    case 'adjust_breakpoint': {
                      console.log('[Function Call] Responsive adjustment:', functionCall.name)
                      // Diese verwenden das html Feld direkt wie modify_section
                      if (args.html) {
                        const sectionId = args.section_id
                        const sectionRegex = new RegExp(
                          `<(section|div|article)[^>]*id=["']${sectionId}["'][^>]*>[\\s\\S]*?<\\/\\1>`,
                          'gi'
                        )
                        finalHtml = currentHtml.replace(sectionRegex, args.html)
                      } else if (args.add_classes) {
                        // Klassen hinzufügen
                        const parser = new DOMParser()
                        const doc = parser.parseFromString(currentHtml, 'text/html')
                        const element = doc.querySelector(args.element_selector)
                        if (element) {
                          const newClasses = args.add_classes.split(' ')
                          newClasses.forEach((c: string) => element.classList.add(c))
                          if (args.remove_classes) {
                            const removeClasses = args.remove_classes.split(' ')
                            removeClasses.forEach((c: string) => element.classList.remove(c))
                          }
                          finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                        }
                      }
                      break
                    }

                    // ============================================
                    // COMPONENT LIBRARY
                    // ============================================
                    case 'save_as_component': {
                      console.log('[Function Call] save_as_component:', args.component_name)
                      // Triggere Component-Save Dialog
                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const section = doc.getElementById(args.section_id)

                      if (section) {
                        // Speichere als pending action - wird vom User bestätigt
                        setPendingReferenceUpdates([{
                          type: 'save_component',
                          id: args.section_id,
                          sectionId: args.section_id,
                          componentName: args.component_name,
                          category: args.category,
                          html: section.outerHTML,
                        }])
                      }

                      const msgs = useEditorStore.getState().messages
                      const lastMsg = msgs[msgs.length - 1]
                      if (lastMsg?.role === 'assistant') {
                        updateMessage(lastMsg.id, {
                          content: displayMessage + '\n\n_Klicke auf "Anwenden" um die Komponente zu speichern._',
                          isStreaming: false,
                          hasReferenceUpdates: true,
                          referenceUpdates: [{
                            type: 'save_component',
                            id: args.section_id,
                            sectionId: args.section_id,
                            componentName: args.component_name,
                            category: args.category,
                          }],
                          tokensUsed: data.usage?.output_tokens || 0,
                          model: selectedModel.name,
                        })
                      }
                      setGenerating(false)
                      setCurrentThinking('')
                      setGenerationPhase('idle')
                      return
                    }

                    case 'insert_component': {
                      console.log('[Function Call] insert_component:', args.component_id)
                      // TODO: Lade Komponente aus DB und füge ein
                      displayMessage += '\n\n_Komponenten-Einfügung wird noch implementiert._'
                      break
                    }

                    // ============================================
                    // UTILITY TOOLS
                    // ============================================
                    case 'update_text': {
                      console.log('[Function Call] update_text:', args.element_selector)
                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const element = doc.querySelector(args.element_selector)
                      if (element) {
                        element.textContent = args.new_text
                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    case 'update_link': {
                      console.log('[Function Call] update_link:', args.link_selector)
                      const parser = new DOMParser()
                      const doc = parser.parseFromString(currentHtml, 'text/html')
                      const link = doc.querySelector(args.link_selector) as HTMLAnchorElement
                      if (link) {
                        link.href = args.new_url
                        if (args.new_text) {
                          link.textContent = args.new_text
                        }
                        if (args.open_in_new_tab) {
                          link.target = '_blank'
                          link.rel = 'noopener noreferrer'
                        }
                        finalHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
                      }
                      break
                    }

                    default:
                      console.warn('[Function Call] Unknown function:', functionCall.name)
                  }

                  // Verarbeite HTML-Änderungen (für create_full_page, replace_section, etc.)
                  if (finalHtml !== currentHtml) {
                    // Injiziere fehlende Animation Keyframes
                    finalHtml = injectAnimationKeyframes(finalHtml)
                    console.log('[Function Call] HTML changed, length:', finalHtml.length)

                    // Global Components Detection (für neue Seiten)
                    if (functionCall.name === 'create_full_page') {
                      const extracted = extractGlobalComponents(finalHtml)
                      console.log('[Global Components] Extraction result:', {
                        hasHeader: !!extracted.header,
                        headerConfidence: extracted.header?.confidence,
                        hasFooter: !!extracted.footer,
                        footerConfidence: extracted.footer?.confidence,
                      })

                      const hasNewHeader = extracted.header && extracted.header.confidence >= 50
                      const hasNewFooter = extracted.footer && extracted.footer.confidence >= 50

                      if (hasNewHeader || hasNewFooter) {
                        console.log('[Global Components] Opening dialog for:', {
                          header: hasNewHeader,
                          footer: hasNewFooter,
                        })
                        setDetectedHeader(hasNewHeader ? extracted.header : null)
                        setDetectedFooter(hasNewFooter ? extracted.footer : null)
                        setPendingFinalHtml(finalHtml)
                        setGlobalComponentsDialogOpen(true)
                      } else {
                        console.log('[Global Components] No components detected with sufficient confidence')
                      }
                    }

                    // Update Message
                    const msgs = useEditorStore.getState().messages
                    const lastMsg = msgs[msgs.length - 1]
                    if (lastMsg?.role === 'assistant') {
                      updateMessage(lastMsg.id, {
                        content: displayMessage,
                        generatedHtml: finalHtml,
                        isStreaming: false,
                        tokensUsed: data.usage?.output_tokens || 0,
                        model: selectedModel.name,
                      })
                    }
                  }

                  setGenerating(false)
                  setCurrentThinking('')
                  setGenerationPhase('idle')
                  return
                }

                // LEGACY: Fallback auf Text-Parsing wenn kein Function Call
                // NEU: Zuerst auf Reference Updates pruefen
                const refParseResult = parseReferenceUpdates(fullContent)
                console.log('Reference updates parsed:', refParseResult)

                // Wenn Reference Updates vorhanden, diese separat behandeln
                if (refParseResult.hasReferenceUpdates) {
                  console.log('Has reference updates, storing for preview')
                  setPendingReferenceUpdates(refParseResult.updates)
                  setReferenceUpdateMessage(refParseResult.message)

                  // Update message mit Info ueber pending updates
                  const msgs = useEditorStore.getState().messages
                  const lastMsg = msgs[msgs.length - 1]
                  const thinkingContent = currentThinking

                  if (lastMsg?.role === 'assistant') {
                    updateMessage(lastMsg.id, {
                      content: refParseResult.message || fullContent,
                      // Kein generatedHtml da es Reference Updates sind
                      generatedHtml: undefined,
                      thinking: thinkingContent || undefined,
                      isStreaming: false,
                      tokensUsed: data.usage?.output_tokens || 0,
                      model: selectedModel.name,
                      // NEU: Markiere als Reference Update
                      hasReferenceUpdates: true,
                      referenceUpdates: refParseResult.updates,
                    })
                  }

                  setGenerating(false)
                  setCurrentThinking('')
                  setGenerationPhase('idle')
                  return // Stoppe hier - Updates werden via Preview/Apply behandelt
                }

                // Normaler Flow: Parse als Operation
                const parsed = parseOperationFormat(fullContent)
                console.log('Parsed operation:', parsed)

                const currentHtml = useEditorStore.getState().html

                let finalHtml = currentHtml
                let displayMessage = fullContent

                if (parsed) {
                  // Debug: Log parsed HTML before applying
                  console.log('[DEBUG] parsed.html has DOCTYPE:', parsed.html?.includes('<!DOCTYPE'))
                  console.log('[DEBUG] parsed.html has script:', parsed.html?.includes('<script'))
                  console.log('[DEBUG] parsed.html length:', parsed.html?.length)

                  // Apply the operation
                  finalHtml = applyOperation(currentHtml, parsed)
                  displayMessage = parsed.message || fullContent

                  // Injiziere fehlende Animation Keyframes
                  finalHtml = injectAnimationKeyframes(finalHtml)

                  // Debug: Log after applyOperation
                  console.log('[DEBUG] finalHtml has DOCTYPE:', finalHtml.includes('<!DOCTYPE'))
                  console.log('[DEBUG] finalHtml has script:', finalHtml.includes('<script'))
                  console.log('[DEBUG] finalHtml length:', finalHtml.length)
                  console.log('Applied operation, HTML changed:', finalHtml !== currentHtml)

                  // GLOBAL COMPONENTS HANDLING
                  // Extract header/footer from generated HTML
                  const extracted = extractGlobalComponents(finalHtml)
                  console.log('Extracted global components:', {
                    header: extracted.header?.confidence,
                    footer: extracted.footer?.confidence,
                  })

                  // Get current global components from store
                  const currentGlobalHeader = useEditorStore.getState().globalHeader
                  const currentGlobalFooter = useEditorStore.getState().globalFooter

                  // Check if we have new header/footer and no existing ones
                  const hasNewHeader = extracted.header && extracted.header.confidence >= 50
                  const hasNewFooter = extracted.footer && extracted.footer.confidence >= 50
                  const needsHeaderSave = hasNewHeader && !currentGlobalHeader
                  const needsFooterSave = hasNewFooter && !currentGlobalFooter

                  if (needsHeaderSave || needsFooterSave) {
                    // Show dialog to save as global components
                    console.log('Showing GlobalComponentsDialog for new components')
                    setDetectedHeader(needsHeaderSave ? extracted.header : null)
                    setDetectedFooter(needsFooterSave ? extracted.footer : null)
                    setPendingFinalHtml(finalHtml)
                    setGlobalComponentsDialogOpen(true)
                  } else if ((hasNewHeader && currentGlobalHeader) || (hasNewFooter && currentGlobalFooter)) {
                    // Global components already exist - REMOVE them from generated HTML!
                    // FAILSAFE: This prevents duplicate header/footer
                    console.log('Global components exist - sanitizing HTML to remove duplicates')
                    finalHtml = sanitizeHtmlForGlobalComponents(finalHtml, {
                      hasGlobalHeader: !!currentGlobalHeader,
                      hasGlobalFooter: !!currentGlobalFooter,
                    })
                    displayMessage += '\n\n_Hinweis: Globale Header/Footer sind bereits vorhanden. Doppelte Elemente wurden automatisch entfernt._'
                  }
                } else {
                  console.log('Failed to parse operation format')
                }

                // Inject CSS variables from design variables
                const designVars = useEditorStore.getState().designVariables
                if (designVars) {
                  finalHtml = injectCSSVariables(finalHtml, designVars)
                  console.log('Injected CSS variables from design variables')
                }

                // Update message with final result (including thinking)
                const msgs = useEditorStore.getState().messages
                const lastMsg = msgs[msgs.length - 1]
                const thinkingContent = currentThinking // Capture current thinking state

                // For add/modify operations, show only the new section in preview
                // For replace_all, show the full page
                const isPartialUpdate = parsed && (parsed.operation === 'add' || parsed.operation === 'modify')
                const previewContent = isPartialUpdate ? parsed.html : finalHtml

                if (lastMsg?.role === 'assistant') {
                  updateMessage(lastMsg.id, {
                    content: displayMessage,
                    generatedHtml: finalHtml,        // Full page (for applying)
                    previewHtml: previewContent,     // Just new section (for preview)
                    thinking: thinkingContent || undefined,
                    isStreaming: false,
                    // Show only output tokens (what AI generated), not total (includes our prompt)
                    tokensUsed: data.usage?.output_tokens || 0,
                    model: selectedModel.name,
                    // Include tool outputs
                    searchSources: searchSources.length > 0 ? searchSources : undefined,
                    executableCode: executableCode || undefined,
                    codeResult: codeResult || undefined,
                  })
                }

                // Don't auto-apply - user must click "Anwenden" button
                // applyGeneratedHtml(finalHtml)

                // Setup Modal wird jetzt VOR der Generierung geöffnet,
                // nicht mehr danach. Der Check und das Öffnen erfolgt in handleSend().
              }

              if (data.type === 'error') throw new Error(data.message)
            } catch (e) {
              if (e instanceof SyntaxError) {
                // Mit SSE-Buffer sollte das selten passieren, aber loggen für Debugging
                console.warn('[SSE] Incomplete chunk received, will be buffered:', line.slice(0, 100))
                continue
              }
              throw e
            }
          }
        }
      }
    } catch (error) {
      // Handle different error types gracefully
      if (error instanceof Error) {
        // User cancelled or component unmounted - no error message needed
        if (error.name === 'AbortError') {
          console.log('Generation cancelled by user')
          const msgs = useEditorStore.getState().messages
          const lastMsg = msgs[msgs.length - 1]
          if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
            // Remove the empty streaming message
            updateMessage(lastMsg.id, {
              content: '_Generierung abgebrochen._',
              isStreaming: false,
            })
          }
          return
        }

        // Connection timeout/terminated - auto-retry once
        if (error.message.includes('terminated') || error.message.includes('Load failed')) {
          console.error('Generation timeout:', error, `(retry ${retryCount}/${maxRetries})`)

          if (retryCount < maxRetries) {
            // Auto-retry
            const msgs = useEditorStore.getState().messages
            const lastMsg = msgs[msgs.length - 1]
            if (lastMsg?.role === 'assistant') {
              updateMessage(lastMsg.id, {
                content: '⏳ Verbindung unterbrochen - versuche erneut...',
                isStreaming: true,
              })
            }

            // Increment retry count and retry after short delay
            setRetryCount(prev => prev + 1)
            setTimeout(() => {
              handleSend(promptOverride, skipSetup)
            }, 1000)
            return
          }

          // Max retries reached - show error
          const msgs = useEditorStore.getState().messages
          const lastMsg = msgs[msgs.length - 1]
          if (lastMsg?.role === 'assistant') {
            updateMessage(lastMsg.id, {
              content: 'Die Verbindung wurde unterbrochen. Das kann bei sehr langen Generierungen passieren. Versuche es mit einem kürzeren Prompt oder teile die Anfrage in mehrere Schritte auf.',
              isStreaming: false,
            })
          }
          setRetryCount(0) // Reset for next request
          return
        }
      }

      // Generic error fallback
      console.error('Generation error:', error)
      const msgs = useEditorStore.getState().messages
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg?.role === 'assistant') {
        updateMessage(lastMsg.id, {
          content: 'Fehler bei der Generierung. Bitte erneut versuchen.',
          isStreaming: false,
        })
      }
    } finally {
      setGenerating(false)
      setGenerationPhase('idle')
      // Clear abort controller reference
      abortControllerRef.current = null
      // Reset retry count on completion (success or final failure)
      setRetryCount(0)
      // Clear streaming stats
      setStreamingStats(null)
    }
  }

  // Handle input changes and detect @-mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0

    setInput(value)

    // Detect URLs for URL Context tool
    const urls = value.match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi) || []
    setDetectedUrls(urls)

    // Check for @-mention
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([\w-]*)$/)

    if (atMatch) {
      // Berechne Position für das Dropdown
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect()
        // Dropdown oberhalb des Inputs positionieren
        setReferenceDropdownPosition({
          top: -10, // Wird relativ zum Container positioniert
          left: 0,
        })
      }
      setShowReferenceDropdown(true)
      setReferenceSearchQuery(atMatch[1])
      setMentionStartPos(cursorPos - atMatch[0].length)
    } else {
      setShowReferenceDropdown(false)
      setReferenceSearchQuery('')
      setMentionStartPos(-1)
    }
  }

  // Handle reference selection from dropdown
  const handleReferenceSelect = (reference: Reference) => {
    if (mentionStartPos === -1) return

    // Add reference if not already selected
    if (!selectedReferences.some(r => r.id === reference.id && r.category === reference.category)) {
      setSelectedReferences([...selectedReferences, reference])
    }

    // Remove the @... from input and close dropdown
    const beforeMention = input.slice(0, mentionStartPos)
    const afterMention = input.slice(textareaRef.current?.selectionStart || mentionStartPos)
    setInput(beforeMention + afterMention)

    setShowReferenceDropdown(false)
    setReferenceSearchQuery('')
    setMentionStartPos(-1)

    // Focus back to textarea
    textareaRef.current?.focus()
  }

  // Remove a selected reference
  const removeReference = (referenceToRemove: Reference) => {
    setSelectedReferences(selectedReferences.filter(
      r => !(r.id === referenceToRemove.id && r.category === referenceToRemove.category)
    ))
  }

  // Image upload handlers
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newImages = await Promise.all(
      files.slice(0, 4).map(async (file) => { // Max 4 images
        const preview = URL.createObjectURL(file)
        const base64 = await fileToBase64(file)
        return { file, preview, base64 }
      })
    )

    setUploadedImages(prev => [...prev, ...newImages].slice(0, 4))
    // Reset input so same file can be selected again
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove data:image/xxx;base64, prefix
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle reference dropdown (keyboard navigation handled in ReferenceDropdown)
    if (showReferenceDropdown) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowReferenceDropdown(false)
        return
      }
      // Arrow keys and Enter are handled by ReferenceDropdown component
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
        // Let the dropdown handle these
        return
      }
    }

    // Normal Enter to send
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Models with thinking support flag
  const models = [
    { name: 'Gemini 3 Flash', id: 'gemini-3-flash-preview', description: 'Schnell & günstig', supportsThinking: true },
    { name: 'Gemini 3 Pro', id: 'gemini-3-pro-preview', description: 'Bestes Model', supportsThinking: true },
  ]

  // Check if current model supports thinking
  const currentModelSupportsThinking = models.find(m => m.id === selectedModel.id)?.supportsThinking ?? false

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Chat Header Bar - visually connected to Toolbar */}
      <div className="h-12 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-3 bg-white dark:bg-zinc-900 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Chat</span>
        </div>
        <button
          onClick={() => {
            // Clear chat - reset messages
            const store = useEditorStore.getState()
            if (store.clearMessages) {
              store.clearMessages()
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Neuer Chat
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Wireframe Build Animation Overlay */}
        <WireframeBuildAnimation
          isActive={activeBuildSection !== null}
          operationType={activeBuildSection?.operation}
          sectionId={activeBuildSection?.id}
        />
        <div className="p-4 space-y-6 min-w-0">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                Was möchtest du erstellen?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
                Beschreibe deine Webseite und ich generiere sie für dich.
              </p>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2 mt-6 max-w-sm justify-center">
                {[
                  'Landing Page',
                  'Portfolio',
                  'Blog',
                  'Kontaktseite',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(`Erstelle eine ${prompt}`)}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages with Thinking integrated */}
          {messages.map((message, index) => {
            const isLastMessage = index === messages.length - 1
            const isStreamingAssistant = message.role === 'assistant' && message.isStreaming
            const showThinkingBeforeThis = isLastMessage && isStreamingAssistant && thinkingEnabled && currentThinking

            return (
              <div key={message.id}>
                {/* Show Thinking BEFORE the streaming assistant response */}
                {showThinkingBeforeThis && (
                  <div className="mb-4">
                    <ThinkingDisplay content={currentThinking} isComplete={!!message.content} phase={generationPhase} />
                  </div>
                )}
                <ChatMessage
                  message={message}
                  onOpenSetup={(prompt) => {
                    setSiteSetupPrompt(prompt)
                    setSiteSetupModalOpen(true)
                  }}
                />
                {/* Show Streaming Status for active streaming */}
                {isLastMessage && isStreamingAssistant && streamingStats && (
                  <div className="mt-2">
                    <StreamingStatus stats={streamingStats} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area - Figma Style: Large container with buttons inside */}
      <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        {/* Main Input Container - like Figma */}
        <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl">
          {/* URL Detection & References - inside container */}
          {(detectedUrls.length > 0 || selectedReferences.length > 0) && (
            <div className="px-3 pt-2 flex flex-wrap gap-1.5">
              {detectedUrls.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs">
                  <Link className="h-3 w-3" />
                  {detectedUrls.length} URL
                </span>
              )}
              {selectedReferences.map((ref) => (
                <ReferenceBadge
                  key={`${ref.category}-${ref.id}`}
                  reference={ref}
                  onRemove={() => removeReference(ref)}
                />
              ))}
            </div>
          )}

          {/* Uploaded Files Preview (Images & PDFs) */}
          {uploadedImages.length > 0 && (
            <div className="flex gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
              {uploadedImages.map((file, index) => (
                <div key={index} className="relative group">
                  {file.file.type === 'application/pdf' ? (
                    <div className="h-16 w-16 flex flex-col items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-red-50 dark:bg-red-900/20">
                      <FileText className="h-6 w-6 text-red-500" />
                      <span className="text-[10px] text-red-500 mt-1">PDF</span>
                    </div>
                  ) : (
                    <img
                      src={file.preview}
                      alt={`Upload ${index + 1}`}
                      className="h-16 w-16 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700"
                    />
                  )}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-zinc-800 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {uploadedImages.length < 4 && (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="h-16 w-16 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors cursor-pointer"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
          )}

          {/* Hidden file input - supports images and PDFs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Beschreibe Änderungen oder lade ein Bild hoch..."
              rows={2}
              disabled={isGenerating}
              className="w-full px-3 py-3 text-sm bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
            />

            {/* Reference Dropdown */}
            {showReferenceDropdown && siteId && (
              <div className="absolute bottom-full left-0 mb-1 w-full z-50">
                <ReferenceDropdown
                  siteId={siteId}
                  currentPageHtml={html}
                  isOpen={showReferenceDropdown}
                  searchQuery={referenceSearchQuery}
                  position={{ top: 0, left: 0 }}
                  onSelect={handleReferenceSelect}
                  onClose={() => setShowReferenceDropdown(false)}
                />
              </div>
            )}
          </div>

          {/* Bottom Bar with Tools - inside container */}
          <div className="flex items-center justify-between px-2 py-2 border-t border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-0.5">
              {/* Add/Prompt Builder */}
              <button
                onClick={() => setPromptBuilderOpen(true)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                title="Prompt Builder"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Model Selector - full name */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setModelDropdownOpen(!modelDropdownOpen)
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="font-medium">{selectedModel.name}</span>
                  <ChevronDown className="h-3 w-3 text-zinc-400" />
                </button>

                {modelDropdownOpen && (
                  <div className="absolute bottom-full left-0 mb-1 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg min-w-48 z-50">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setSelectedModel(model)
                          setModelDropdownOpen(false)
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer ${selectedModel.id === model.id ? 'bg-zinc-100 dark:bg-zinc-700' : ''}`}
                      >
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{model.name}</div>
                        <div className="text-xs text-zinc-400">{model.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />

              {/* Tool Toggles */}
              {currentModelSupportsThinking && (
                <button
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  className={`p-1.5 rounded transition-colors cursor-pointer ${thinkingEnabled ? 'text-purple-500 bg-purple-100 dark:bg-purple-900/40' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                  title="Thinking Mode"
                >
                  <Brain className="h-4 w-4" />
                </button>
              )}

              <button
                onClick={() => setGoogleSearchEnabled(!googleSearchEnabled)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${googleSearchEnabled ? 'text-green-500 bg-green-100 dark:bg-green-900/40' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="Web Search"
              >
                <Globe className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCodeExecutionEnabled(!codeExecutionEnabled)}
                className={`p-1.5 rounded transition-colors cursor-pointer ${codeExecutionEnabled ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/40' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="Code Execution"
              >
                <Code className="h-4 w-4" />
              </button>

              <button
                onClick={() => imageInputRef.current?.click()}
                className={`p-1.5 rounded transition-colors cursor-pointer ${uploadedImages.length > 0 ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                title="Bild oder PDF hochladen"
              >
                <ImageIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Send Button */}
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && selectedReferences.length === 0 && uploadedImages.length === 0) || isGenerating || isSending}
              className="p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 disabled:text-zinc-500 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {(isGenerating || isSending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Builder Modal */}
      <PromptBuilder
        open={promptBuilderOpen}
        onOpenChange={setPromptBuilderOpen}
        onSubmit={(prompt) => handleSend(prompt)}
      />

      {/* Design System Dialog */}
      {suggestedTokens && (
        <DesignSystemDialog
          open={designDialogOpen}
          onOpenChange={setDesignDialogOpen}
          suggestedTokens={suggestedTokens}
          detectedFonts={detectedFonts}
          onSave={handleSaveDesignTokens}
          onSkip={() => setDesignDialogOpen(false)}
        />
      )}

      {/* Global Components Dialog */}
      <GlobalComponentsDialog
        open={globalComponentsDialogOpen}
        onOpenChange={setGlobalComponentsDialogOpen}
        detectedHeader={detectedHeader}
        detectedFooter={detectedFooter}
        onSave={async (headerName, footerName, headerHtml, footerHtml) => {
          if (!siteId) return

          console.log('[GlobalComponents] Starting save...', {
            headerName,
            footerName,
            hasHeaderHtml: !!headerHtml,
            hasFooterHtml: !!footerHtml
          })

          // Save header as global component - use HTML passed directly from dialog
          if (headerName && headerHtml) {
            // Fix mobile menu: extract from header and make it a sibling
            // This prevents CSS stacking context issues
            const fixedHeaderHtml = fixMobileMenuInHeader(headerHtml)
            console.log('[GlobalComponents] Saving header (mobile menu fixed)...', fixedHeaderHtml.substring(0, 100))
            const result = await saveGlobalComponent({
              siteId,
              name: headerName,
              html: fixedHeaderHtml,
              position: 'header',
              setAsDefault: true,
            })
            console.log('[GlobalComponents] Header save result:', result)
          }

          // Save footer as global component - use HTML passed directly from dialog
          if (footerName && footerHtml) {
            console.log('[GlobalComponents] Saving footer...', footerHtml.substring(0, 100))
            const result = await saveGlobalComponent({
              siteId,
              name: footerName,
              html: footerHtml,
              position: 'footer',
              setAsDefault: true,
            })
            console.log('[GlobalComponents] Footer save result:', result)
          }

          // Remove saved header/footer from pending HTML and apply
          if (pendingFinalHtml) {
            console.log('[GlobalComponents] Removing header/footer from HTML...')
            const cleanedHtml = removeHeaderFooterFromHtml(pendingFinalHtml, {
              removeHeader: !!headerName && !!headerHtml,
              removeFooter: !!footerName && !!footerHtml,
            })
            console.log('[GlobalComponents] Cleaned HTML length:', cleanedHtml.length)
            applyGeneratedHtml(cleanedHtml)
          }

          // Reload global components
          console.log('[GlobalComponents] Reloading global components...')
          await loadGlobalComponents()

          // Debug: Check what was loaded
          const state = useEditorStore.getState()
          console.log('[GlobalComponents] After reload - Header:', !!state.globalHeader, 'Footer:', !!state.globalFooter)

          // Reset state
          setDetectedHeader(null)
          setDetectedFooter(null)
          setPendingFinalHtml(null)
          setGlobalComponentsDialogOpen(false)
        }}
        onSkip={() => {
          // Just apply the HTML as-is (keeping inline header/footer)
          if (pendingFinalHtml) {
            applyGeneratedHtml(pendingFinalHtml)
          }
          setDetectedHeader(null)
          setDetectedFooter(null)
          setPendingFinalHtml(null)
          setGlobalComponentsDialogOpen(false)
        }}
      />

      {/* Site Setup Modal (NEU: Unified Setup VOR Generierung) */}
      <SiteSetupModal
        open={siteSetupModalOpen}
        onOpenChange={setSiteSetupModalOpen}
        initialPrompt={siteSetupPrompt}
        initialImages={siteSetupImages}
        onGenerate={async (data: SiteSetupData, originalPrompt: string, images) => {
          if (!siteId) return

          try {
            // 1. Design-Tokens speichern (inkl. Archetyp-Daten)
            const designUpdate: Parameters<typeof updateDesignVariables>[1] = {
              // Design Archetype
              archetype: data.archetype,

              colors: {
                brand: {
                  primary: data.tokens.colors.primary,
                  primaryHover: data.tokens.colors.primaryHover,
                  secondary: data.tokens.colors.secondary,
                  accent: data.tokens.colors.accent,
                },
                neutral: {
                  background: data.tokens.colors.background,
                  foreground: data.tokens.colors.foreground,
                  muted: data.tokens.colors.muted,
                  border: data.tokens.colors.border,
                },
                semantic: {
                  success: '#22c55e',
                  warning: '#f59e0b',
                  error: '#ef4444',
                  info: '#3b82f6',
                },
              },
              typography: {
                fontHeading: data.tokens.fonts.heading,
                fontBody: data.tokens.fonts.body,
                fontMono: data.tokens.fonts.mono,
              },
              spacing: {
                scale: {
                  xs: '0.5rem',
                  sm: '1rem',
                  md: '1.5rem',
                  lg: '2rem',
                  xl: data.tokens.spacing.section,
                  '2xl': '4rem',
                  '3xl': '6rem',
                  section: data.tokens.spacing.section,
                  container: data.layout.maxWidth,
                  'card-gap': data.tokens.spacing.cardGap,
                },
                containerWidths: {
                  sm: '640px',
                  md: '768px',
                  lg: '1024px',
                  xl: data.layout.maxWidth,
                  '2xl': '1536px',
                },
                sectionSpacing: data.layout.sectionSpacing,
              },
              // Border Radius based on Archetype
              borders: {
                style: data.radii.style,
                radius: {
                  none: '0',
                  sm: '0.125rem',
                  md: data.radii.default,
                  lg: data.radii.lg,
                  xl: data.radii.xl,
                  '2xl': '1.5rem',
                  full: '9999px',
                  default: data.radii.default,
                  button: data.radii.button,
                  card: data.radii.card,
                  input: data.radii.input,
                },
              },
              // Motion/Animation based on Archetype
              motion: {
                style: data.motion.style,
                duration: data.motion.duration,
                easing: data.motion.easing,
                hoverScale: data.motion.hoverScale,
                revealDistance: data.motion.revealDistance,
              },
              // Layout based on Archetype
              layout: {
                style: data.layout.style,
                maxWidth: data.layout.maxWidth,
                sectionSpacing: data.layout.sectionSpacing,
                useOverlaps: data.layout.useOverlaps,
                heroStyle: data.layout.heroStyle,
              },
              // Visual Effects based on Archetype
              effects: data.effects,
            }

            // Add gradient if enabled
            if (data.gradient.enabled) {
              designUpdate.gradients = {
                primary: {
                  from: data.gradient.from,
                  to: data.gradient.to,
                  via: data.gradient.via,
                  direction: data.gradient.direction,
                  enabled: true,
                },
              }
            }

            // Add custom colors if any
            if (Object.keys(data.customColors).length > 0) {
              designUpdate.customColors = data.customColors
            }

            const savedDesignVars = await updateDesignVariables(siteId, designUpdate)

            // Update store with new design variables
            useEditorStore.setState({ designVariables: savedDesignVars })

            // 1c. Design System generieren und speichern
            const designSystemStyles = generateDesignSystem({
              archetyp: data.archetype,
              radii: data.radii,
              motion: data.motion,
              layout: data.layout,
            })

            await upsertDesignSystem(siteId, designSystemStyles)
            console.log('Design System generated and saved:', designSystemStyles.archetyp)

            // 1b. Logo und Tagline speichern (Site Identity)
            const supabase = createClient()
            let logoUrl: string | null = null

            // Logo hochladen falls vorhanden
            if (data.logoFile) {
              const fileExt = data.logoFile.name.split('.').pop()
              const fileName = `${siteId}/logo-${Date.now()}.${fileExt}`

              const { error: uploadError } = await supabase.storage
                .from('site-assets')
                .upload(fileName, data.logoFile, { cacheControl: '3600', upsert: true })

              if (!uploadError) {
                const { data: urlData } = supabase.storage.from('site-assets').getPublicUrl(fileName)
                logoUrl = urlData.publicUrl
              } else {
                console.warn('Logo upload failed:', uploadError.message)
              }
            }

            // Site Identity updaten (Logo, Tagline, Default robots.txt)
            const siteUpdate: { logo_url?: string; tagline?: string; robots_txt?: string; name?: string } = {}
            if (logoUrl) siteUpdate.logo_url = logoUrl
            if (data.tagline) siteUpdate.tagline = data.tagline
            if (data.siteName) siteUpdate.name = data.siteName

            // Default robots.txt setzen falls nicht vorhanden
            siteUpdate.robots_txt = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://your-domain.com/sitemap.xml

# Disallow admin areas
Disallow: /wp-admin/
Disallow: /wp-includes/`

            if (Object.keys(siteUpdate).length > 0) {
              await supabase.from('sites').update(siteUpdate).eq('id', siteId)
            }

            // 2. Seiten erstellen
            const pageIdMap = await createPagesFromSuggestions(siteId, data.pages)

            // 3. Menus erstellen mit den erstellten Seiten
            const headerPages = data.pages.filter(p => p.selected && p.inHeader && !p.isLegalPage)
            const footerPages = data.pages.filter(p => p.selected && p.inFooter)

            const headerItems = headerPages.map(p => ({
              label: p.name,
              slug: p.slug,
              pageId: pageIdMap.get(p.slug),
            }))

            const footerItems = footerPages.map(p => ({
              label: p.name,
              slug: p.slug,
              pageId: pageIdMap.get(p.slug),
            }))

            // Header-Menu erstellen
            await createHeaderMenu(siteId, headerItems)
            // Footer-Menu erstellen
            await createFooterMenu(siteId, footerItems)

            console.log('Site Setup - Pages and Menus created:', {
              pages: data.pages.filter(p => p.selected).length,
              headerMenuItems: headerItems.length,
              footerMenuItems: footerItems.length,
            })

            // 3. JETZT generieren - KI erstellt Header/Footer MIT
            // Der Prompt enthält alle Setup-Infos inkl. Header/Footer Anforderungen
            const enhancedPrompt = buildEnhancedPromptWithHeaderFooter(originalPrompt, data)
            setSiteSetupModalOpen(false)
            setSiteSetupImages([]) // Clear stored images

            // Starte Generierung - Original-Prompt wird im Chat angezeigt,
            // Enhanced-Prompt wird intern an die API geschickt, MIT Bildern
            await handleSendWithSetup(enhancedPrompt, originalPrompt, images)

          } catch (error: any) {
            console.error('Error completing site setup:', error?.message || error)
            console.error('Error details:', JSON.stringify(error, null, 2))
            // Don't throw - just log and continue
          }
        }}
        onSkip={(originalPrompt: string) => {
          setSiteSetupModalOpen(false)
          // Bei Skip: normale Generierung ohne Setup (skipSetup = true)
          handleSend(originalPrompt, true)
        }}
      />
    </div>
  )
}

/**
 * StreamingStatus - Shows real-time streaming progress
 */
function StreamingStatus({ stats }: { stats: { startTime: number; charCount: number; lastActivity: number } }) {
  const [, forceUpdate] = useState(0)

  // Update every second for elapsed time
  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const now = Date.now()
  const elapsedSec = Math.floor((now - stats.startTime) / 1000)
  const lastActivitySec = Math.floor((now - stats.lastActivity) / 1000)

  // Format elapsed time
  const formatTime = (sec: number) => {
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return `${min}m ${s}s`
  }

  // Determine status color based on last activity
  const isStale = lastActivitySec > 10
  const statusColor = isStale ? 'text-amber-600' : 'text-emerald-600'
  const dotColor = isStale ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="flex items-center gap-3 text-xs text-zinc-500 px-1 py-1">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${dotColor} ${!isStale ? 'animate-pulse' : ''}`} />
        <span className={statusColor}>
          {isStale ? `Warte... (${lastActivitySec}s)` : 'Empfange Daten'}
        </span>
      </div>
      <span className="text-zinc-400">•</span>
      <span>{formatTime(elapsedSec)}</span>
      <span className="text-zinc-400">•</span>
      <span>{(stats.charCount / 1000).toFixed(1)}k Zeichen</span>
    </div>
  )
}

/**
 * ThinkingDisplay - Shows AI reasoning process during generation
 */
function ThinkingDisplay({
  content,
  isComplete,
  phase
}: {
  content: string
  isComplete?: boolean
  phase?: 'idle' | 'thinking' | 'building'
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-collapse when thinking is complete and building starts
  useEffect(() => {
    if (isComplete || phase === 'building') {
      setIsExpanded(false)
    }
  }, [isComplete, phase])

  const isBuilding = phase === 'building'
  const isDone = phase === 'idle' && isComplete

  return (
    <div className="space-y-2">
      {/* Thinking Section */}
      <div className={`border rounded-xl overflow-hidden transition-all ${isDone || isBuilding
        ? 'border-purple-200/50 bg-purple-50/30'
        : 'border-purple-300 bg-purple-50/50 shadow-sm'
        }`}>
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2 bg-purple-100/50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className={`h-4 w-4 text-purple-600 ${phase === 'thinking' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium text-purple-700">
              {phase === 'thinking' ? 'AI denkt nach...' : 'AI hat nachgedacht ✓'}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-purple-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-purple-500" />
          )}
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="px-4 py-3 max-h-48 overflow-y-auto">
            <p className="text-sm text-purple-900/80 whitespace-pre-wrap leading-relaxed">
              {content}
              {phase === 'thinking' && (
                <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
              )}
            </p>
          </div>
        )}
      </div>

      {/* Building Indicator - shows after thinking */}
      {isBuilding && (
        <div className="border border-blue-300 bg-blue-50/50 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 animate-pulse" />
            <span className="text-sm font-medium text-blue-700">AI baut Website...</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Save a header/footer as a global component
 */
async function saveGlobalComponent({
  siteId,
  name,
  html,
  position,
  setAsDefault,
}: {
  siteId: string
  name: string
  html: string
  position: 'header' | 'footer'
  setAsDefault: boolean
}): Promise<{ success: boolean; componentId?: string; error?: string }> {
  try {
    const supabase = createClient()

    // Use the RPC function to create the component
    const { data: componentId, error } = await supabase.rpc('create_global_component', {
      p_site_id: siteId,
      p_name: name,
      p_html: html,
      p_css: undefined,
      p_js: undefined,
      p_position: position,
      p_description: `Automatisch erstellt von AI`,
      p_category: position,
      p_set_as_site_default: setAsDefault,
    })

    if (error) {
      console.error('Error saving global component:', error)
      return { success: false, error: error.message }
    }

    return { success: true, componentId }
  } catch (err) {
    console.error('saveGlobalComponent error:', err)
    return { success: false, error: String(err) }
  }
}
