'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { ChatMessage } from './ChatMessage'
import { PromptBuilder } from './PromptBuilder'
import {
  parseOperationFormat,
  extractStreamingHtml,
  applyOperation,
} from '@/lib/ai/html-operations'
import {
  Send,
  Sparkles,
  Loader2,
  Paperclip,
  ChevronDown,
  Wand2,
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

  const messages = useEditorStore((s) => s.messages)
  const isGenerating = useEditorStore((s) => s.isGenerating)
  const html = useEditorStore((s) => s.html)
  const siteContext = useEditorStore((s) => s.siteContext)
  const selectedElement = useEditorStore((s) => s.selectedElement)

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

  const handleSend = async (promptOverride?: string) => {
    const promptToSend = promptOverride || input.trim()
    if (!promptToSend || isGenerating) return

    setInput('')
    setGenerating(true)

    addMessage({ role: 'user', content: promptToSend })
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        {/* Input Container */}
        <div className="relative mb-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe, was du erstellen möchtest..."
            rows={1}
            disabled={isGenerating}
            className="w-full px-4 py-3 pr-24 text-sm bg-zinc-50 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white placeholder:text-zinc-400 disabled:opacity-50 transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              title="Datei anhängen"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isGenerating}
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
