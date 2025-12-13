'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { ChatMessage } from './ChatMessage'
import { PromptBuilder } from './PromptBuilder'
import {
  parseOperationFormat,
  extractStreamingHtml,
  applyOperation,
} from '@/lib/ai/html-operations'
import { detectComponentType, detectPromptIntent } from '@/lib/ai/component-detection'
import { createClient } from '@/lib/supabase/client'
import { extractStylesFromHtml, suggestDesignTokens, type SuggestedTokens } from '@/lib/design/style-extractor'
import { detectFontsFromHtml, type DetectedFont } from '@/lib/fonts/font-detector'
import { DesignSystemDialog } from '@/components/design/DesignSystemDialog'
import { GlobalComponentsDialog } from '@/components/design/GlobalComponentsDialog'
import { getDesignVariables, updateDesignVariables } from '@/lib/supabase/queries/design-variables'
import { extractGlobalComponents, removeHeaderFooterFromHtml } from '@/lib/ai/html-operations'
import type { DetectedComponent } from '@/types/global-components'
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

  // Thinking Mode State
  const [thinkingEnabled, setThinkingEnabled] = useState(false)
  const [currentThinking, setCurrentThinking] = useState('')

  // @-Mention State
  const [showPageSuggestions, setShowPageSuggestions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionStartPos, setMentionStartPos] = useState(-1)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
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

  // Filter pages for suggestions (show all pages)
  const filteredPages = useMemo(() => {
    if (!mentionFilter) return pages
    return pages.filter(p =>
      p.name.toLowerCase().includes(mentionFilter.toLowerCase())
    )
  }, [pages, mentionFilter])

  // Get referenced page objects
  const referencedPages = useMemo(() => {
    return pages.filter(p => referencedPageIds.includes(p.id))
  }, [pages, referencedPageIds])

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

  // Check and show design dialog if needed
  const checkAndShowDesignDialog = async (siteId: string, generatedHtml: string) => {
    try {
      // Get existing design variables
      const variables = await getDesignVariables(siteId)

      // Check if primary color is still default (not customized)
      // Database default is #3b82f6 (blue-500)
      const defaultPrimary = '#3b82f6'
      const currentPrimary = variables.colors?.brand?.primary
      const hasCustomTokens = currentPrimary && currentPrimary !== defaultPrimary

      console.log('[Design Dialog] Check:', { currentPrimary, defaultPrimary, hasCustomTokens })

      if (!hasCustomTokens) {
        // Extract styles from generated HTML
        const extracted = extractStylesFromHtml(generatedHtml)
        const tokens = suggestDesignTokens(extracted)
        const fonts = detectFontsFromHtml(generatedHtml)

        console.log('[Design Dialog] Showing dialog with tokens:', tokens)

        setSuggestedTokens(tokens)
        setDetectedFonts(fonts)
        setDesignDialogOpen(true)
      }
    } catch (error) {
      console.error('Error checking design tokens:', error)
    }
  }

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

  const handleSend = async (promptOverride?: string) => {
    const promptToSend = promptOverride || input.trim()
    if (!promptToSend || isGenerating) return

    // Store prompt for later use in component detection
    currentPromptRef.current = promptToSend

    // Prepare referenced pages data
    const referencedPagesData = referencedPages.map(p => ({
      name: p.name,
      html: p.htmlContent || ''
    }))

    setInput('')
    setReferencedPageIds([]) // Clear references after sending
    setGenerating(true)

    // Show referenced pages in user message
    const displayContent = referencedPagesData.length > 0
      ? `${promptToSend}\n\n[Style-Referenz: ${referencedPagesData.map(p => `@${p.name}`).join(', ')}]`
      : promptToSend

    addMessage({ role: 'user', content: displayContent })
    addMessage({ role: 'assistant', content: '', isStreaming: true })

    try {
      // Reset thinking content for new request
      setCurrentThinking('')

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          existingHtml: html,
          context: siteContext || {},
          selectedElement: selectedElement,
          model: selectedModel.id,
          referencedPages: referencedPagesData.length > 0 ? referencedPagesData : undefined,
          thinkingEnabled,
        }),
      })

      if (!response.ok) throw new Error('Failed to generate')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''

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
                  })
                }
              }

              if (data.type === 'done') {
                console.log('Full AI response:', fullContent)

                // Parse the complete response
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
                    // Global components already exist - just add info message
                    // DON'T remove header/footer here - that should happen when applying!
                    console.log('Global components already exist - will be handled on apply')
                    displayMessage += '\n\n_Hinweis: Globale Header/Footer sind bereits vorhanden und werden automatisch verwendet._'
                  }
                } else {
                  console.log('Failed to parse operation format')
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
                  })
                }

                // Don't auto-apply - user must click "Anwenden" button
                // applyGeneratedHtml(finalHtml)

                // Check if we should show Design System Dialog
                // Only show once per session and only if site has no custom tokens
                if (siteId && !hasCheckedDesignTokens && parsed && parsed.html) {
                  setHasCheckedDesignTokens(true)

                  // Check if site already has custom design tokens
                  checkAndShowDesignDialog(siteId, finalHtml)
                }
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

    // Check for @-mention
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setShowPageSuggestions(true)
      setMentionFilter(atMatch[1])
      setMentionStartPos(cursorPos - atMatch[0].length)
      setSuggestionIndex(0)
    } else {
      setShowPageSuggestions(false)
      setMentionFilter('')
      setMentionStartPos(-1)
    }
  }

  // Insert selected page mention
  const insertPageMention = (page: { id: string; name: string }) => {
    if (mentionStartPos === -1) return

    // Add page to references
    if (!referencedPageIds.includes(page.id)) {
      setReferencedPageIds([...referencedPageIds, page.id])
    }

    // Remove the @... from input and close suggestions
    const beforeMention = input.slice(0, mentionStartPos)
    const afterMention = input.slice(textareaRef.current?.selectionStart || mentionStartPos)
    setInput(beforeMention + afterMention)

    setShowPageSuggestions(false)
    setMentionFilter('')
    setMentionStartPos(-1)

    // Focus back to textarea
    textareaRef.current?.focus()
  }

  // Remove a referenced page
  const removeReferencedPage = (pageId: string) => {
    setReferencedPageIds(referencedPageIds.filter(id => id !== pageId))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle suggestion navigation
    if (showPageSuggestions && filteredPages.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSuggestionIndex((prev) => (prev + 1) % filteredPages.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSuggestionIndex((prev) => (prev - 1 + filteredPages.length) % filteredPages.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertPageMention(filteredPages[suggestionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowPageSuggestions(false)
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
                <ChatMessage message={message} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-100 p-4 bg-white">
        {/* Referenced Pages Badges */}
        {referencedPages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-xs text-zinc-500">Referenz:</span>
            {referencedPages.map((page) => (
              <span
                key={page.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full"
              >
                <FileText className="h-3 w-3" />
                @{page.name}
                <button
                  onClick={() => removeReferencedPage(page.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 -mr-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
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

          {/* Page Suggestions Dropdown */}
          {showPageSuggestions && filteredPages.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full max-h-48 overflow-y-auto bg-white border border-zinc-200 rounded-lg shadow-lg z-50">
              <div className="p-1.5 border-b border-zinc-100">
                <span className="text-xs text-zinc-500 px-2">Seite als Style-Referenz wählen:</span>
              </div>
              {filteredPages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => insertPageMention(page)}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-50 transition-colors cursor-pointer ${
                    index === suggestionIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  <FileText className="h-4 w-4 text-zinc-400" />
                  <div>
                    <div className="text-sm font-medium text-zinc-800">@{page.name}</div>
                    <div className="text-xs text-zinc-500">/{page.slug || 'home'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No pages message */}
          {showPageSuggestions && filteredPages.length === 0 && (
            <div className="absolute bottom-full left-0 mb-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg z-50 p-3">
              <span className="text-sm text-zinc-500">Keine anderen Seiten vorhanden</span>
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
              disabled={(!input.trim() && referencedPages.length === 0) || isGenerating}
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
