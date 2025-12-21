'use client'

import { useState, useRef, useEffect } from 'react'
import { useEntryEditorStore } from '@/stores/entry-editor-store'
import { Button } from '@/components/ui/button'
import {
  Send,
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  generatedData?: {
    title?: string
    excerpt?: string
    content?: string
    data?: Record<string, unknown>
  }
  timestamp: Date
  isApplied?: boolean
}

export function EntryChatPanel() {
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Store
  const siteId = useEntryEditorStore((s) => s.siteId)
  const contentType = useEntryEditorStore((s) => s.contentType)
  const fields = useEntryEditorStore((s) => s.fields)
  const title = useEntryEditorStore((s) => s.title)
  const setTitle = useEntryEditorStore((s) => s.setTitle)
  const setExcerpt = useEntryEditorStore((s) => s.setExcerpt)
  const setContent = useEntryEditorStore((s) => s.setContent)
  const setData = useEntryEditorStore((s) => s.setData)

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [localMessages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  // Generate entry content
  const handleGenerate = async () => {
    if (!input.trim() || isGenerating || !siteId || !contentType) return

    setIsGenerating(true)

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    setLocalMessages((prev) => [...prev, userMessage])

    // Add placeholder for assistant
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: 'Generiere Inhalt...',
      timestamp: new Date(),
    }
    setLocalMessages((prev) => [...prev, assistantMessage])

    setInput('')

    try {
      // Call entry generation API
      const response = await fetch('/api/ai/generate-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          siteId,
          contentTypeId: contentType.id,
          fields: fields.map((f) => ({
            name: f.name,
            label: f.label,
            type: f.type,
            required: f.required,
            settings: f.settings,
            sub_fields: f.sub_fields,
          })),
          currentTitle: title,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate entry')
      }

      const data = await response.json()

      // Update assistant message
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: data.message || 'Inhalt wurde generiert.',
                generatedData: {
                  title: data.title,
                  excerpt: data.excerpt,
                  content: data.content,
                  data: data.data,
                },
              }
            : m
        )
      )
    } catch (error) {
      console.error('Entry generation error:', error)
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
              }
            : m
        )
      )
    } finally {
      setIsGenerating(false)
    }
  }

  // Apply generated data
  const handleApply = (messageId: string, data: ChatMessage['generatedData']) => {
    if (!data) return

    if (data.title) setTitle(data.title)
    if (data.excerpt) setExcerpt(data.excerpt)
    if (data.content) setContent(data.content)
    if (data.data) {
      // Merge with existing data
      setData(data.data)
    }

    setLocalMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isApplied: true } : m))
    )
  }

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            Content AI
          </span>
        </div>
        <div className="text-xs text-zinc-500">
          {contentType?.label_singular || 'Eintrag'}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              {contentType?.label_singular || 'Eintrag'} erstellen
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Beschreibe deinen Inhalt und die AI füllt alle Felder automatisch aus.
            </p>
            {contentType && (
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => setInput(`Erstelle einen ${contentType.label_singular} über...`)}
                  className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Erstelle einen {contentType.label_singular}...
                </button>
                <button
                  onClick={() => setInput('Schreibe einen ausführlichen Artikel mit allen Details')}
                  className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Ausführlicher Artikel mit Details
                </button>
              </div>
            )}
          </div>
        ) : (
          localMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Apply button for assistant messages with generated data */}
                {message.role === 'assistant' && message.generatedData && !message.isApplied && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleApply(message.id, message.generatedData)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Übernehmen
                  </Button>
                )}

                {message.isApplied && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    Übernommen
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Generiere Inhalt...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Beschreibe deinen ${contentType?.label_singular || 'Eintrag'}...`}
            className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 pr-12 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
            rows={1}
            disabled={isGenerating}
          />

          <button
            onClick={handleGenerate}
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 bottom-2 p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-500 mt-2 text-center">
          ⌘ + Enter zum Senden
        </p>
      </div>
    </div>
  )
}
