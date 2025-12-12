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
import {
  Send,
  Sparkles,
  Loader2,
  Paperclip,
  ChevronDown,
  Wand2,
  FileText,
  X,
} from 'lucide-react'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState({
    name: 'Gemini 3 Pro',
    id: 'gemini-3-pro-preview',
    description: 'Bestes Model'
  })
  const [promptBuilderOpen, setPromptBuilderOpen] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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

                  // AUTO-SAVE GLOBAL COMPONENT
                  // First check if AI explicitly marked it, otherwise auto-detect
                  let componentType = parsed.componentType
                  let componentName = parsed.componentName

                  // If AI didn't mark it, try to auto-detect based on HTML content
                  if (!componentType && parsed.html) {
                    const detectedType = detectComponentType(parsed.html)
                    if (detectedType === 'header' || detectedType === 'footer') {
                      // Also check if user asked for header/footer
                      const intent = detectPromptIntent(currentPromptRef.current)
                      if ((detectedType === 'header' && intent.wantsHeader) ||
                          (detectedType === 'footer' && intent.wantsFooter)) {
                        componentType = detectedType
                        componentName = `Global ${detectedType === 'header' ? 'Header' : 'Footer'}`
                        console.log('Auto-detected component type:', componentType)
                      }
                    }
                  }

                  // Save if it's a header or footer
                  if (componentType && siteId && (componentType === 'header' || componentType === 'footer')) {
                    console.log('Saving global component:', componentType, componentName)

                    // Extract the component HTML from the generated content
                    const componentHtml = parsed.html

                    // Save to database
                    saveGlobalComponent({
                      siteId,
                      name: componentName || `Global ${componentType === 'header' ? 'Header' : 'Footer'}`,
                      html: componentHtml,
                      position: componentType,
                      setAsDefault: true,
                    }).then((result) => {
                      if (result.success) {
                        console.log('Global component saved:', result.componentId)
                        // Update display message to inform user
                        const msgs = useEditorStore.getState().messages
                        const lastMsg = msgs[msgs.length - 1]
                        if (lastMsg?.role === 'assistant') {
                          updateMessage(lastMsg.id, {
                            content: displayMessage + `\n\n✅ **${componentType === 'header' ? 'Header' : 'Footer'} als Global Component gespeichert!** Er erscheint jetzt automatisch auf allen Seiten.`,
                          })
                        }
                      }
                    }).catch((err) => {
                      console.error('Failed to save global component:', err)
                    })
                  }
                } else {
                  console.log('Failed to parse operation format')
                }

                // Update message with final result
                const msgs = useEditorStore.getState().messages
                const lastMsg = msgs[msgs.length - 1]

                if (lastMsg?.role === 'assistant') {
                  updateMessage(lastMsg.id, {
                    content: displayMessage,
                    generatedHtml: finalHtml,
                    isStreaming: false,
                    tokensUsed: data.usage?.output_tokens,
                    model: selectedModel.name,
                  })
                }

                // Don't auto-apply - user must click "Anwenden" button
                // applyGeneratedHtml(finalHtml)
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

  const models = [
    { name: 'Gemini 3 Pro', id: 'gemini-3-pro-preview', description: 'Bestes Model' },
    { name: 'Gemini 2.5 Flash', id: 'gemini-2.5-flash', description: 'Schnell & günstig' },
  ]

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
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

          {/* Messages */}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Thinking Indicator */}
          {isGenerating && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI denkt nach...</span>
            </div>
          )}
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
      p_css: null,
      p_js: null,
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
