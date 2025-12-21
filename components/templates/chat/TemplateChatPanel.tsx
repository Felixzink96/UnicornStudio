'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { ReferenceDropdown, ReferenceBadge } from '@/components/editor/chat/ReferenceDropdown'
import type { Reference } from '@/lib/references/reference-types'
import { loadAllReferences, resolveReferencesForAI, searchReferences } from '@/lib/references/reference-resolver'
import { createClient } from '@/lib/supabase/client'
import { buildTemplateSystemPrompt } from '@/lib/ai/template-system-prompt'
import {
  Send,
  Sparkles,
  Loader2,
  X,
  Brain,
  ChevronDown,
  Braces,
  RefreshCw,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  html?: string
  references?: Reference[]
  timestamp: Date
  isApplied?: boolean
}

export function TemplateChatPanel() {
  const [input, setInput] = useState('')
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reference System
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('')
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([])
  const [mentionStartPos, setMentionStartPos] = useState(-1)

  // Store
  const siteId = useTemplateEditorStore((s) => s.siteId)
  const templateId = useTemplateEditorStore((s) => s.templateId)
  const html = useTemplateEditorStore((s) => s.html)
  const templateType = useTemplateEditorStore((s) => s.templateType)
  const contentType = useTemplateEditorStore((s) => s.contentType)
  const fields = useTemplateEditorStore((s) => s.fields)
  const designVariables = useTemplateEditorStore((s) => s.designVariables)
  const availablePages = useTemplateEditorStore((s) => s.availablePages)
  const applyGeneratedHtml = useTemplateEditorStore((s) => s.applyGeneratedHtml)

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

  // Handle @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setInput(value)

    // Check for @ trigger
    const lastAtPos = value.lastIndexOf('@', cursorPos)
    if (lastAtPos !== -1 && lastAtPos >= cursorPos - 20) {
      const textAfterAt = value.slice(lastAtPos + 1, cursorPos)
      if (!textAfterAt.includes(' ')) {
        setMentionStartPos(lastAtPos)
        setReferenceSearchQuery(textAfterAt)
        setShowReferenceDropdown(true)
        return
      }
    }

    setShowReferenceDropdown(false)
    setMentionStartPos(-1)
  }

  // Handle reference selection
  const handleReferenceSelect = (reference: Reference) => {
    if (mentionStartPos === -1) return

    // Replace @query with selected reference name
    const beforeAt = input.slice(0, mentionStartPos)
    const afterQuery = input.slice(textareaRef.current?.selectionStart || mentionStartPos)
    const newInput = `${beforeAt}@${reference.displayName} ${afterQuery.trim()}`

    setInput(newInput)
    setSelectedReferences((prev) => [...prev, reference])
    setShowReferenceDropdown(false)
    setMentionStartPos(-1)
    textareaRef.current?.focus()
  }

  // Remove reference
  const handleRemoveReference = (refId: string) => {
    setSelectedReferences((prev) => prev.filter((r) => r.id !== refId))
  }

  // Generate template
  const handleGenerate = async () => {
    if (!input.trim() || isGenerating || !siteId) return

    setIsGenerating(true)

    // Add user message with references
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      references: selectedReferences.length > 0 ? [...selectedReferences] : undefined,
      timestamp: new Date(),
    }
    setLocalMessages((prev) => [...prev, userMessage])

    // Add placeholder for assistant
    const assistantId = `assistant-${Date.now()}`
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: 'Generiere Template...',
      timestamp: new Date(),
    }
    setLocalMessages((prev) => [...prev, assistantMessage])

    setInput('')
    const currentRefs = [...selectedReferences]
    setSelectedReferences([])

    try {
      // Resolve references for AI
      let referenceData: { pages?: Array<{ id: string; name: string; slug: string; html?: string }> } = {}
      if (currentRefs.length > 0) {
        referenceData = await resolveReferencesForAI(siteId, currentRefs)
      }

      // Call template generation API
      const response = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          siteId,
          contentTypeId: contentType?.id,
          templateType,
          currentHtml: html || undefined,
          referenceData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate template')
      }

      const data = await response.json()

      // Update assistant message
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: data.message || 'Template wurde generiert.',
                html: data.html,
              }
            : m
        )
      )

      // Auto-apply if we have HTML
      if (data.html) {
        await applyGeneratedHtml(data.html, data.css)
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isApplied: true } : m
          )
        )
      }
    } catch (error) {
      console.error('Template generation error:', error)
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

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }

    // Close dropdown on escape
    if (e.key === 'Escape' && showReferenceDropdown) {
      setShowReferenceDropdown(false)
    }
  }

  // Apply HTML from message
  const handleApplyHtml = async (messageId: string, html: string) => {
    await applyGeneratedHtml(html)
    setLocalMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isApplied: true } : m))
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            Template AI
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Braces className="h-3 w-3" />
          {templateType === 'single' ? 'Einzelansicht' : 'Archiv'}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {localMessages.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Template erstellen
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
              Beschreibe dein Template oder verwende @Seitenname um den Stil einer
              bestehenden Seite zu übernehmen.
            </p>
            <div className="mt-6 space-y-2">
              <button
                onClick={() => setInput('Erstelle ein modernes Archiv-Template mit Karten-Grid')}
                className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Modernes Archiv mit Karten-Grid
              </button>
              <button
                onClick={() => setInput('Erstelle ein Blog-Artikel Template mit Hero-Bild')}
                className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Blog-Artikel mit Hero-Bild
              </button>
            </div>
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
                {/* Referenced items */}
                {message.references && message.references.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {message.references.map((ref) => (
                      <span
                        key={ref.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded text-xs"
                      >
                        @{ref.displayName}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Apply button for assistant messages with HTML */}
                {message.role === 'assistant' && message.html && !message.isApplied && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleApplyHtml(message.id, message.html!)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Anwenden
                  </Button>
                )}

                {message.isApplied && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    Angewendet
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
                  Generiere Template...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected References */}
      {selectedReferences.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-1">
          {selectedReferences.map((ref) => (
            <span
              key={ref.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs"
            >
              @{ref.displayName}
              <button
                onClick={() => handleRemoveReference(ref.id)}
                className="hover:text-purple-900 dark:hover:text-purple-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Beschreibe dein Template... (@ für Referenzen)"
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

          {/* Reference Dropdown */}
          {showReferenceDropdown && siteId && (
            <div className="absolute bottom-full left-0 mb-2 w-full">
              <ReferenceDropdown
                siteId={siteId}
                isOpen={showReferenceDropdown}
                searchQuery={referenceSearchQuery}
                position={{ top: 0, left: 0 }}
                onSelect={handleReferenceSelect}
                onClose={() => setShowReferenceDropdown(false)}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-500 mt-2 text-center">
          ⌘ + Enter zum Senden
        </p>
      </div>
    </div>
  )
}
