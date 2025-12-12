'use client'

import { useState, useMemo, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useEditorStore } from '@/stores/editor-store'
import {
  Copy,
  Check,
  Loader2,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Code,
  Eye,
  Layers,
} from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/editor'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)

  const applyGeneratedHtml = useEditorStore((s) => s.applyGeneratedHtml)
  const html = useEditorStore((s) => s.html)
  const deleteMessage = useEditorStore((s) => s.deleteMessage)
  const save = useEditorStore((s) => s.save)

  // Check if this message's HTML is already applied to the page
  const isAlreadyApplied = useMemo(() => {
    const msgHtml = message.generatedHtml
    if (!msgHtml || !html) return false

    // Extract body content from both for comparison
    const extractBody = (h: string) => {
      const match = h.match(/<body[^>]*>([\s\S]*)<\/body>/)
      return match ? match[1].trim() : h.trim()
    }

    const currentBody = extractBody(html)
    const msgBody = extractBody(msgHtml)

    // Check if the message's HTML is contained in current HTML
    return currentBody.includes(msgBody) || currentBody === msgBody
  }, [message.generatedHtml, html])

  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied'>(
    isAlreadyApplied ? 'applied' : 'idle'
  )

  // Sync apply state when HTML changes (e.g., after reload)
  useEffect(() => {
    if (isAlreadyApplied && applyState === 'idle') {
      setApplyState('applied')
    }
  }, [isAlreadyApplied, applyState])

  // Extract HTML from content (for streaming preview)
  // New format: MESSAGE: ... --- OPERATION: ... --- <html>
  const streamingHtml = useMemo(() => {
    if (!message.content) return null

    // Try new format: after second ---
    const parts = message.content.split(/\n---\n/)
    if (parts.length >= 3) {
      let html = parts.slice(2).join('\n---\n')
      html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()
      if (html) return html
    }

    // Fallback: look for HTML starting with <
    const htmlMatch = message.content.match(/<(!DOCTYPE|html|section|div|header|nav)[^]*$/i)
    if (htmlMatch) return htmlMatch[0]

    // Old format: ```html block
    const codeMatch = message.content.match(/```html\n([\s\S]*?)(?:```|$)/)
    return codeMatch ? codeMatch[1] : null
  }, [message.content])

  // Extract message text (before the HTML)
  const textContent = useMemo(() => {
    // New format: extract MESSAGE line
    const messageMatch = message.content.match(/MESSAGE:\s*([\s\S]+?)(?=\n---|\n\n)/)
    if (messageMatch) return messageMatch[1].trim()

    // Fallback: remove code blocks and operation metadata
    return message.content
      .replace(/```html[\s\S]*?(?:```|$)/g, '')
      .replace(/MESSAGE:[\s\S]*$/i, '')
      .replace(/OPERATION:[\s\S]*$/i, '')
      .trim()
  }, [message.content])

  const handleCopy = async () => {
    const textToCopy = message.generatedHtml || streamingHtml || message.content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = async () => {
    const htmlToApply = message.generatedHtml || streamingHtml
    if (!htmlToApply || applyState === 'applying') return

    setApplyState('applying')

    try {
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 300))

      if (htmlToApply.includes('<!DOCTYPE') || htmlToApply.includes('<html')) {
        applyGeneratedHtml(htmlToApply)
      } else {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
        if (bodyMatch) {
          const newHtml = html.replace(
            /<body[^>]*>[\s\S]*<\/body>/,
            `<body class="bg-white">\n${htmlToApply}\n</body>`
          )
          applyGeneratedHtml(newHtml)
        }
      }

      // Save to database
      await save()

      setApplyState('applied')
    } catch (error) {
      console.error('Apply error:', error)
      setApplyState('idle')
    }
  }

  const handleDelete = () => {
    deleteMessage?.(message.id)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  }

  // Parse style reference from user message
  const { messageText, styleReferences } = useMemo(() => {
    const refMatch = message.content.match(/\[Style-Referenz:\s*([^\]]+)\]/)
    if (refMatch) {
      const refs = refMatch[1].split(',').map(r => r.trim())
      const text = message.content.replace(/\n*\[Style-Referenz:[^\]]+\]/, '').trim()
      return { messageText: text, styleReferences: refs }
    }
    return { messageText: message.content, styleReferences: [] }
  }, [message.content])

  // User Message
  if (message.role === 'user') {
    return (
      <div className="flex justify-end w-full">
        <div className="max-w-[85%] space-y-2">
          {/* Style References Badge */}
          {styleReferences.length > 0 && (
            <div className="flex justify-end">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                <Layers className="h-3 w-3" />
                <span>Style von {styleReferences.join(', ')}</span>
              </div>
            </div>
          )}
          <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word' }}>
              {messageText}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-zinc-400">
              {message.timestamp ? formatTime(message.timestamp) : ''}
            </span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleCopy}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                title="Kopieren"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                title="Erneut senden"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Löschen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Assistant Message
  const rawDisplayHtml = message.generatedHtml || streamingHtml

  // Wrap partial HTML with Tailwind for preview
  const displayHtml = useMemo(() => {
    if (!rawDisplayHtml) return null

    // If it's already a full document, use as-is
    if (rawDisplayHtml.includes('<!DOCTYPE') || rawDisplayHtml.includes('<html')) {
      return rawDisplayHtml
    }

    // Wrap partial HTML (section, div, etc.) with Tailwind
    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
${rawDisplayHtml}
</body>
</html>`
  }, [rawDisplayHtml])

  return (
    <div className="w-full overflow-hidden">
      <div className="space-y-3 overflow-hidden">
        {/* Loading State - nur wenn noch kein Content */}
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-2 py-3 min-h-[44px]">
            <div className="h-4 w-4 flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
            <span className="text-sm text-zinc-500">AI generiert...</span>
          </div>
        ) : (
          <>
            {/* Text Content (ohne HTML) */}
            {textContent && (
              <div className="overflow-hidden" style={{ wordBreak: 'break-word' }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <p className="text-sm text-zinc-700 leading-relaxed mb-2 last:mb-0">
                        {children}
                      </p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-zinc-900">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="text-sm text-zinc-700 mb-2 pl-4 list-disc space-y-1">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => <li>{children}</li>,
                  }}
                >
                  {textContent}
                </ReactMarkdown>
              </div>
            )}

            {/* Live Code/Preview Card - während UND nach Streaming */}
            {rawDisplayHtml && (
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 border-b border-zinc-200">
                  <div className="flex items-center gap-2">
                    {/* Status indicator */}
                    {message.isStreaming ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium">Schreibt Code...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-zinc-600">Fertig</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle Preview/Code */}
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                    >
                      {showCode ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Preview</span>
                        </>
                      ) : (
                        <>
                          <Code className="h-3 w-3" />
                          <span>Code</span>
                        </>
                      )}
                    </button>

                    {/* Copy */}
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                {showCode ? (
                  /* Code View - Live typing effect */
                  <div className="max-h-80 overflow-auto bg-zinc-900 p-4">
                    <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">
                      {rawDisplayHtml}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                      )}
                    </pre>
                  </div>
                ) : (
                  /* Preview - Live updating */
                  <div className="aspect-video bg-white relative overflow-hidden">
                    <iframe
                      srcDoc={displayHtml ?? undefined}
                      className="absolute inset-0 w-[200%] h-[200%] border-0 pointer-events-none origin-top-left scale-50"
                      sandbox="allow-scripts"
                      title="Preview"
                    />
                    {message.isStreaming && (
                      <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
                    )}
                  </div>
                )}

                {/* Apply Button - nur wenn fertig */}
                {!message.isStreaming && (
                  <div className="px-3 py-2 bg-zinc-50 border-t border-zinc-200">
                    {applyState === 'applied' ? (
                      <button
                        disabled
                        className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-emerald-500 text-white cursor-default"
                      >
                        <Check className="h-4 w-4" />
                        Angewendet
                      </button>
                    ) : applyState === 'applying' ? (
                      <button
                        disabled
                        className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-blue-400 text-white cursor-wait"
                      >
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wird angewendet...
                      </button>
                    ) : (
                      <button
                        onClick={handleApply}
                        className="w-full py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2 bg-blue-500 text-white hover:bg-blue-600"
                      >
                        Anwenden
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Meta Info */}
            {!message.isStreaming && (
              <div className="flex items-center gap-3 text-xs text-zinc-400">
                {message.timestamp && (
                  <span>{formatTime(message.timestamp)}</span>
                )}
                {message.model && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span>{message.model}</span>
                  </>
                )}
                {message.tokensUsed && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-300" />
                    <span>{message.tokensUsed} tokens</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
