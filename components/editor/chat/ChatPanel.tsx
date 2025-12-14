'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { ChatMessage } from './ChatMessage'
import { PromptBuilder } from './PromptBuilder'
import {
  parseOperationFormat,
  extractStreamingHtml,
  applyOperation,
  injectCSSVariables,
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
import { extractGlobalComponents, removeHeaderFooterFromHtml, sanitizeHtmlForGlobalComponents } from '@/lib/ai/html-operations'
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
} from 'lucide-react'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState({
    name: 'Gemini 3 Pro',
    id: 'gemini-3-pro-preview',
    description: 'Neuestes Model'
  })
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Design System Dialog State
  const [designDialogOpen, setDesignDialogOpen] = useState(false)
  const [suggestedTokens, setSuggestedTokens] = useState<SuggestedTokens | null>(null)
  const [detectedFonts, setDetectedFonts] = useState<DetectedFont[]>([])
  const [hasCheckedDesignTokens, setHasCheckedDesignTokens] = useState(false)

  // Global Components Dialog State
  const [globalComponentsDialogOpen, setGlobalComponentsDialogOpen] = useState(false)
  const [detectedHeader, setDetectedHeader] = useState<DetectedComponent | null>(null)
  const [detectedFooter, setDetectedFooter] = useState<DetectedComponent | null>(null)
  const [pendingFinalHtml, setPendingFinalHtml] = useState<string | null>(null)

  // Site Setup Modal State (NEU: Unified Setup)
  const [siteSetupModalOpen, setSiteSetupModalOpen] = useState(false)
  const [siteSetupPrompt, setSiteSetupPrompt] = useState('')

  // Thinking Mode State
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [currentThinking, setCurrentThinking] = useState('')

  // Gemini Tools State
  const [googleSearchEnabled, setGoogleSearchEnabled] = useState(false)
  const [codeExecutionEnabled, setCodeExecutionEnabled] = useState(false)
  const [detectedUrls, setDetectedUrls] = useState<string[]>([])

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
  useEffect(() => {
    if (!scrollRef.current) return

    const isNewMessage = messages.length > lastMessageCount.current
    lastMessageCount.current = messages.length

    // Scroll to bottom if: new message added OR streaming OR user was already near bottom
    if (isNewMessage || isStreaming || isUserNearBottom.current) {
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

    const headerStyleDesc = setupData.headerSettings.style === 'simple'
      ? 'Standard Layout (Logo links, Navigation rechts)'
      : setupData.headerSettings.style === 'centered'
      ? 'Zentriertes Layout (Logo und Navigation mittig übereinander)'
      : 'Mega Menu Layout (mit Dropdown-Panels für Unterseiten)'

    return `${originalPrompt}

--- WEBSITE SETUP (vom User konfiguriert) ---
Website-Name: ${setupData.siteName}
Website-Typ: ${setupData.siteType}

SEITEN die verlinkt werden müssen:
${selectedPages.map(p => `- "${p.name}" -> href="/${p.slug}"`).join('\n')}

=== HEADER ANFORDERUNGEN ===
Erstelle einen hochwertigen, modernen Header mit folgenden Vorgaben:
- Stil: ${headerStyleDesc}
- Navigation-Links: ${headerMenuItems}
- Links müssen zu den echten Seiten verlinken (siehe oben)
${setupData.headerSettings.showCta ? `- CTA-Button: "${setupData.headerSettings.ctaText}" verlinkt zu "/${setupData.headerSettings.ctaPage}"` : '- Kein CTA-Button'}
${setupData.headerSettings.sticky ? '- Header soll sticky sein (fixed beim Scrollen)' : '- Header ist nicht sticky'}
- Mobile: Burger-Menu für kleine Bildschirme

=== FOOTER ANFORDERUNGEN ===
Erstelle einen passenden Footer mit:
- Links zu: ${footerMenuItems}
- Links müssen zu den echten Seiten verlinken
${setupData.footerSettings.showCopyright ? `- Copyright-Text: "${setupData.footerSettings.copyrightText}"` : ''}

=== DESIGN-SYSTEM ===

GRUNDFARBEN (CSS-Variablen - für Buttons, Text, Backgrounds):
- bg-[var(--color-brand-primary)] (${setupData.tokens.colors.primary})
- hover:bg-[var(--color-brand-primaryHover)] (${setupData.tokens.colors.primaryHover})
- bg-[var(--color-brand-secondary)] (${setupData.tokens.colors.secondary})
- bg-[var(--color-brand-accent)] (${setupData.tokens.colors.accent})
- bg-[var(--color-neutral-background)] (${setupData.tokens.colors.background})
- text-[var(--color-neutral-foreground)] (${setupData.tokens.colors.foreground})
- bg-[var(--color-neutral-muted)] (${setupData.tokens.colors.muted})
- border-[var(--color-neutral-border)] (${setupData.tokens.colors.border})
${Object.keys(setupData.customColors).length > 0 ? `
CUSTOM:
${Object.entries(setupData.customColors).map(([key, value]) => `- bg-[var(--color-custom-${key})] (${value})`).join('\n')}` : ''}

KREATIVE FREIHEIT (für besondere Design-Elemente):
- Eigene Gradients für Hero-Bereiche, Dekorationen
- Kreative Schatten und Glows
- Spezielle Hover-Effekte und Animationen
- Dekorative Blobs, Patterns, Overlays

SCHRIFTEN:
- style="font-family: var(--font-heading)" (${setupData.tokens.fonts.heading})
- style="font-family: var(--font-body)" (${setupData.tokens.fonts.body})
${setupData.tokens.fonts.mono ? `- style="font-family: var(--font-mono)" (${setupData.tokens.fonts.mono})` : ''}

=== ICONS ===
⚠️ KEINE EMOJIS! Verwende IMMER inline SVG Icons.

Erstelle ein EINZIGARTIGES Premium-Design: Grundfarben konsistent, aber kreative Extras für WOW-Effekt!

WICHTIG: Generiere die KOMPLETTE Seite mit Header, Main Content und Footer.
Der Header und Footer werden automatisch erkannt und als wiederverwendbare Komponenten gespeichert.`
  }

  // Store enhanced prompt for API (not shown in chat)
  const enhancedPromptRef = useRef<string | null>(null)

  // Handle send with setup data (after setup modal)
  const handleSendWithSetup = async (enhancedPrompt: string, originalPrompt: string) => {
    // Mark that design tokens are now set
    setHasCheckedDesignTokens(true)
    // Store enhanced prompt for API call
    enhancedPromptRef.current = enhancedPrompt
    // Show original prompt in chat, but use enhanced prompt for API
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
    if (!promptToSend || isGenerating) return

    // NEU: Prüfe ob Setup nötig ist (nur bei erstem Prompt ohne Custom Tokens)
    // skipSetup = true wenn wir vom Setup Modal kommen
    if (!skipSetup && !hasCheckedDesignTokens && siteId) {
      const needsSetup = await checkIfNeedsSetup()
      if (needsSetup) {
        setHasCheckedDesignTokens(true)
        setInput('')

        // Zeige Chat-Nachricht mit Setup-Button
        addMessage({ role: 'user', content: promptToSend })
        addMessage({
          role: 'assistant',
          content: `Ich habe deine Anfrage analysiert und Vorschläge für Seiten, Farben und Schriften vorbereitet.

<setup-button prompt="${encodeURIComponent(promptToSend)}">Website Setup öffnen</setup-button>`,
        })

        // Speichere Prompt für späteren Zugriff
        setSiteSetupPrompt(promptToSend)

        return // Stoppe hier - Generierung erfolgt nach Setup
      }
      setHasCheckedDesignTokens(true)
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
        }),
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                // Accumulate thinking content
                setCurrentThinking(prev => prev + data.content)
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

              if (data.type === 'text') {
                fullContent += data.content

                // Extract streaming HTML for live preview
                const streamingHtml = extractStreamingHtml(fullContent)

                const msgs = useEditorStore.getState().messages
                const lastMsg = msgs[msgs.length - 1]
                if (lastMsg?.role === 'assistant') {
                  updateMessage(lastMsg.id, {
                    content: fullContent,
                    // Show streaming HTML in preview
                    generatedHtml: streamingHtml || undefined,
                    isStreaming: true,
                    // Include tool outputs as they come in
                    searchSources: searchSources.length > 0 ? searchSources : undefined,
                    executableCode: executableCode || undefined,
                    codeResult: codeResult || undefined,
                  })
                }
              }

              if (data.type === 'done') {
                console.log('Full AI response:', fullContent)

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
                  return // Stoppe hier - Updates werden via Preview/Apply behandelt
                }

                // Normaler Flow: Parse als Operation
                const parsed = parseOperationFormat(fullContent)
                console.log('Parsed operation:', parsed)

                const currentHtml = useEditorStore.getState().html

                let finalHtml = currentHtml
                let displayMessage = fullContent

                if (parsed) {
                  // Apply the operation
                  finalHtml = applyOperation(currentHtml, parsed)
                  displayMessage = parsed.message || fullContent
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
              if (e instanceof SyntaxError) continue
              throw e
            }
          }
        }
      }
    } catch (error) {
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
    { name: 'Gemini 3 Pro', id: 'gemini-3-pro-preview', description: 'Neuestes Model', supportsThinking: true },
    { name: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash', description: 'Smart & Thinking', supportsThinking: true },
    { name: 'Gemini 2.5 Pro', id: 'gemini-2.5-pro', description: 'Bestes Model', supportsThinking: true },
    { name: 'Gemini 2.0 Flash', id: 'gemini-2.0-flash', description: 'Sehr schnell', supportsThinking: false },
  ]

  // Check if current model supports thinking
  const currentModelSupportsThinking = models.find(m => m.id === selectedModel.id)?.supportsThinking ?? false

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 space-y-6 min-w-0">
          {/* Empty State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-800 mb-2">
                Was möchtest du erstellen?
              </h3>
              <p className="text-sm text-zinc-500 max-w-xs">
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
                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors cursor-pointer"
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
                    <ThinkingDisplay content={currentThinking} isComplete={!!message.content} />
                  </div>
                )}
                <ChatMessage
                  message={message}
                  onOpenSetup={(prompt) => {
                    setSiteSetupPrompt(prompt)
                    setSiteSetupModalOpen(true)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-100 p-4 bg-white">
        {/* URL Detection Badge */}
        {detectedUrls.length > 0 && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Link className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-700">
              {detectedUrls.length} URL{detectedUrls.length > 1 ? 's' : ''} erkannt - Design wird analysiert
            </span>
            <div className="flex-1" />
            <div className="flex flex-wrap gap-1 max-w-xs">
              {detectedUrls.slice(0, 3).map((url, i) => (
                <span key={i} className="text-xs text-blue-600 truncate max-w-32">
                  {new URL(url).hostname}
                </span>
              ))}
              {detectedUrls.length > 3 && (
                <span className="text-xs text-blue-500">+{detectedUrls.length - 3}</span>
              )}
            </div>
          </div>
        )}

        {/* Selected References Badges */}
        {selectedReferences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-xs text-zinc-500">Referenzen:</span>
            {selectedReferences.map((ref) => (
              <ReferenceBadge
                key={`${ref.category}-${ref.id}`}
                reference={ref}
                onRemove={() => removeReference(ref)}
              />
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="relative mb-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe, was du erstellen möchtest... (@ für Seiten-Referenz)"
            rows={1}
            disabled={isGenerating}
            className="w-full px-4 py-3 pr-24 text-sm bg-zinc-50 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white placeholder:text-zinc-400 disabled:opacity-50 transition-colors"
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

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title="Datei anhängen"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={(!input.trim() && selectedReferences.length === 0) || isGenerating}
              className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-200 disabled:cursor-not-allowed text-white disabled:text-zinc-400 rounded-lg transition-colors cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Prompt Builder */}
            <button
              onClick={() => setPromptBuilderOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Prompt Builder
            </button>

            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setModelDropdownOpen(!modelDropdownOpen)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors cursor-pointer"
              >
                <span>{selectedModel.name}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {modelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-1 py-1 bg-white border border-zinc-200 rounded-lg shadow-lg min-w-48 z-50">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model)
                        setModelDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-zinc-50 transition-colors cursor-pointer ${
                        selectedModel.id === model.id
                          ? 'bg-blue-50'
                          : ''
                      }`}
                    >
                      <div className="text-xs font-medium text-zinc-800">{model.name}</div>
                      <div className="text-xs text-zinc-500">{model.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Thinking Mode Toggle - nur bei unterstützten Models */}
            {currentModelSupportsThinking && (
              <button
                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  thinkingEnabled
                    ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                    : 'text-zinc-500 bg-zinc-100 hover:bg-zinc-200'
                }`}
                title={thinkingEnabled ? 'Thinking Mode aktiv (klicken zum deaktivieren)' : 'Thinking Mode aktivieren'}
              >
                <Brain className="h-4 w-4" />
              </button>
            )}

            {/* Google Search Toggle */}
            <button
              onClick={() => setGoogleSearchEnabled(!googleSearchEnabled)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                googleSearchEnabled
                  ? 'text-green-700 bg-green-100 hover:bg-green-200'
                  : 'text-zinc-500 bg-zinc-100 hover:bg-zinc-200'
              }`}
              title={googleSearchEnabled ? 'Google Search aktiv' : 'Google Search aktivieren'}
            >
              <Globe className="h-4 w-4" />
            </button>

            {/* Code Execution Toggle */}
            <button
              onClick={() => setCodeExecutionEnabled(!codeExecutionEnabled)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                codeExecutionEnabled
                  ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                  : 'text-zinc-500 bg-zinc-100 hover:bg-zinc-200'
              }`}
              title={codeExecutionEnabled ? 'Code Execution aktiv' : 'Code Execution aktivieren (Python)'}
            >
              <Code className="h-4 w-4" />
            </button>
          </div>

          {/* Token/Character Count */}
          {input.length > 0 && (
            <span className="text-xs text-zinc-400">
              {input.length} Zeichen
            </span>
          )}
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
        onSave={async (headerName, footerName) => {
          if (!siteId) return

          // Save header as global component
          if (headerName && detectedHeader) {
            const result = await saveGlobalComponent({
              siteId,
              name: headerName,
              html: detectedHeader.html,
              position: 'header',
              setAsDefault: true,
            })
            if (result.success) {
              console.log('Header saved:', result.componentId)
            }
          }

          // Save footer as global component
          if (footerName && detectedFooter) {
            const result = await saveGlobalComponent({
              siteId,
              name: footerName,
              html: detectedFooter.html,
              position: 'footer',
              setAsDefault: true,
            })
            if (result.success) {
              console.log('Footer saved:', result.componentId)
            }
          }

          // Remove saved header/footer from pending HTML and apply
          if (pendingFinalHtml) {
            const cleanedHtml = removeHeaderFooterFromHtml(pendingFinalHtml, {
              removeHeader: !!headerName && !!detectedHeader,
              removeFooter: !!footerName && !!detectedFooter,
            })
            applyGeneratedHtml(cleanedHtml)
          }

          // Reload global components
          await loadGlobalComponents()

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
        onGenerate={async (data: SiteSetupData, originalPrompt: string) => {
          if (!siteId) return

          try {
            // 1. Design-Tokens speichern
            const designUpdate: Parameters<typeof updateDesignVariables>[1] = {
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
                  container: data.tokens.spacing.container,
                  'card-gap': data.tokens.spacing.cardGap,
                },
                containerWidths: {
                  sm: '640px',
                  md: '768px',
                  lg: '1024px',
                  xl: data.tokens.spacing.container,
                  '2xl': '1536px',
                },
              },
              borders: {
                radius: {
                  none: '0',
                  sm: '0.125rem',
                  md: data.tokens.radii.default,
                  lg: data.tokens.radii.lg,
                  xl: '1rem',
                  '2xl': '1.5rem',
                  full: '9999px',
                  default: data.tokens.radii.default,
                },
              },
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

            // Starte Generierung - Original-Prompt wird im Chat angezeigt,
            // Enhanced-Prompt wird intern an die API geschickt
            await handleSendWithSetup(enhancedPrompt, originalPrompt)

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
 * ThinkingDisplay - Shows AI reasoning process during generation
 */
function ThinkingDisplay({ content, isComplete }: { content: string; isComplete?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Auto-collapse when thinking is complete and response starts
  useEffect(() => {
    if (isComplete) {
      setIsExpanded(false)
    }
  }, [isComplete])

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isComplete
        ? 'border-purple-200/50 bg-purple-50/30'
        : 'border-purple-300 bg-purple-50/50 shadow-sm'
    }`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-purple-100/50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className={`h-4 w-4 text-purple-600 ${!isComplete ? 'animate-pulse' : ''}`} />
          <span className="text-sm font-medium text-purple-700">
            {isComplete ? 'AI hat nachgedacht' : 'AI denkt nach...'}
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
            {!isComplete && (
              <span className="inline-block w-1.5 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
            )}
          </p>
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
