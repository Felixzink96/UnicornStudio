'use client'

import { useState, useMemo } from 'react'
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
  Brain,
} from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '@/types/editor'
import { removeHeaderFooterFromHtml, extractGlobalComponents } from '@/lib/ai/html-operations'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const [showCode, setShowCode] = useState(false)
  const [showThinking, setShowThinking] = useState(false)

  const applyGeneratedHtml = useEditorStore((s) => s.applyGeneratedHtml)
  const html = useEditorStore((s) => s.html)
  const deleteMessage = useEditorStore((s) => s.deleteMessage)
  const save = useEditorStore((s) => s.save)
  const designVariables = useEditorStore((s) => s.designVariables)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)

  // Generate CSS variables from design tokens for preview
  const designTokensCSS = useMemo(() => {
    if (!designVariables) return ''

    const colors = designVariables.colors as Record<string, Record<string, string>> | undefined
    const typography = designVariables.typography as Record<string, string> | undefined

    const vars: string[] = []

    if (colors?.brand) {
      const primary = colors.brand.primary || '#3b82f6'
      vars.push(`--color-primary: ${primary}`)
      vars.push(`--color-primary-hover: ${primary}`) // simplified
      vars.push(`--color-secondary: ${colors.brand.secondary || '#64748b'}`)
      vars.push(`--color-accent: ${colors.brand.accent || '#f59e0b'}`)
    }

    if (colors?.neutral) {
      vars.push(`--color-background: ${colors.neutral['50'] || '#ffffff'}`)
      vars.push(`--color-foreground: ${colors.neutral['900'] || '#0f172a'}`)
      vars.push(`--color-muted: ${colors.neutral['100'] || '#f1f5f9'}`)
      vars.push(`--color-border: ${colors.neutral['200'] || '#e2e8f0'}`)
    }

    if (typography) {
      vars.push(`--font-heading: '${typography.fontHeading || 'Inter'}', system-ui, sans-serif`)
      vars.push(`--font-body: '${typography.fontBody || 'Inter'}', system-ui, sans-serif`)
    }

    if (vars.length === 0) return ''

    return `:root { ${vars.join('; ')} }
      .bg-primary { background-color: var(--color-primary) !important; }
      .hover\\:bg-primary-hover:hover { background-color: var(--color-primary-hover) !important; }
      .bg-secondary { background-color: var(--color-secondary) !important; }
      .bg-accent { background-color: var(--color-accent) !important; }
      .bg-background { background-color: var(--color-background) !important; }
      .bg-muted { background-color: var(--color-muted) !important; }
      .text-foreground { color: var(--color-foreground) !important; }
      .text-primary { color: var(--color-primary) !important; }
      .border-border { border-color: var(--color-border) !important; }
      .font-heading { font-family: var(--font-heading) !important; }
      .font-body { font-family: var(--font-body) !important; }`
  }, [designVariables])

  // Track if user has manually applied this message
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'applied'>('idle')

  // Extract HTML from content (for streaming preview)
  // New format: MESSAGE: ... --- OPERATION: ... --- <html>
  const streamingHtml = useMemo(() => {
    if (!message.content) return null

    // Try new format: after second ---
    const parts = message.content.split(/\n---\n/)
    if (parts.length >= 3) {
      let html = parts.slice(2).join('\n---\n')
      html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()
      // Clean up any operation metadata that leaked into HTML
      html = cleanOperationMetadata(html)
      if (html) return html
    }

    // Fallback: look for HTML starting with <
    const htmlMatch = message.content.match(/<(!DOCTYPE|html|section|div|header|nav)[^]*$/i)
    if (htmlMatch) {
      return cleanOperationMetadata(htmlMatch[0])
    }

    // Old format: ```html block
    const codeMatch = message.content.match(/```html\n([\s\S]*?)(?:```|$)/)
    return codeMatch ? cleanOperationMetadata(codeMatch[1]) : null
  }, [message.content])

  // Helper to remove operation metadata that leaked into HTML
  function cleanOperationMetadata(html: string): string {
    if (!html) return html
    return html
      // Remove operation block if it appears at start of HTML
      .replace(/^---\s*\nOPERATION:\s*\w+\s*\nPOSITION:\s*\w+\s*\n---\s*\n?/i, '')
      // Remove individual operation lines
      .replace(/\n?---\s*\n?OPERATION:\s*\w+\s*\n?/gi, '')
      .replace(/POSITION:\s*\w+\s*\n?---\s*\n?/gi, '')
      .replace(/OPERATION:\s*\w+\s*\n?/gi, '')
      .replace(/POSITION:\s*\w+\s*\n?/gi, '')
      .replace(/TARGET:\s*[^\n]+\n?/gi, '')
      .replace(/SELECTOR:\s*[^\n]+\n?/gi, '')
      .replace(/COMPONENT_TYPE:\s*\w+\s*\n?/gi, '')
      .replace(/COMPONENT_NAME:\s*[^\n]+\n?/gi, '')
      // Remove stray --- separators
      .replace(/^---\s*\n/gm, '')
      .replace(/\n---\s*$/gm, '')
      // Remove AI meta-comments that shouldn't be in HTML
      .replace(/<!--\s*Kein Code generiert[^>]*-->/gi, '')
      .replace(/<!--\s*No code generated[^>]*-->/gi, '')
      .replace(/<!--\s*Bitte wähle[^>]*-->/gi, '')
      .trim()
  }

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
    // Copy the preview content (section) not the full page
    const textToCopy = message.previewHtml || message.generatedHtml || streamingHtml || message.content
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

      let finalHtml: string

      if (htmlToApply.includes('<!DOCTYPE') || htmlToApply.includes('<html')) {
        finalHtml = htmlToApply
      } else {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/)
        if (bodyMatch) {
          finalHtml = html.replace(
            /<body[^>]*>[\s\S]*<\/body>/,
            `<body class="bg-white">\n${htmlToApply}\n</body>`
          )
        } else {
          finalHtml = htmlToApply
        }
      }

      // If global header/footer exist, remove them from the HTML being saved
      // They will be added back by the preview via insertGlobalComponents
      if (globalHeader || globalFooter) {
        const extracted = extractGlobalComponents(finalHtml)
        const hasNewHeader = extracted.header && extracted.header.confidence >= 50
        const hasNewFooter = extracted.footer && extracted.footer.confidence >= 50

        if ((hasNewHeader && globalHeader) || (hasNewFooter && globalFooter)) {
          console.log('Removing inline header/footer - global components will be used instead')
          finalHtml = removeHeaderFooterFromHtml(finalHtml, {
            removeHeader: hasNewHeader && !!globalHeader,
            removeFooter: hasNewFooter && !!globalFooter,
          })
        }
      }

      // Apply to editor
      applyGeneratedHtml(finalHtml)

      // Wait a tick for state to update, then save
      await new Promise(resolve => setTimeout(resolve, 50))
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
  // Use previewHtml (just the new section) if available, otherwise fall back to generatedHtml
  const rawPreviewHtml = message.previewHtml || message.generatedHtml || streamingHtml

  // Check if this is a partial update (just a section) vs full page
  const isPartialUpdate = rawPreviewHtml && !rawPreviewHtml.includes('<!DOCTYPE') && !rawPreviewHtml.includes('<html')

  // Wrap partial HTML with Tailwind for preview
  const displayHtml = useMemo(() => {
    if (!rawPreviewHtml) return null

    // CSS for preview - clean margins, allow hover but block clicks + design tokens
    const fitContentStyle = `<style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white;
      }
      body > *:last-child { margin-bottom: 0 !important; }
      ${designTokensCSS}
    </style>
    <script>
      document.addEventListener('click', (e) => e.preventDefault(), true);
      document.addEventListener('submit', (e) => e.preventDefault(), true);
    </script>`

    // If it's already a full document, inject our style
    if (rawPreviewHtml.includes('<!DOCTYPE') || rawPreviewHtml.includes('<html')) {
      if (rawPreviewHtml.includes('</head>')) {
        return rawPreviewHtml.replace('</head>', `${fitContentStyle}</head>`)
      }
      return rawPreviewHtml
    }

    // Wrap partial HTML (section, div, etc.) with Tailwind
    return `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  ${fitContentStyle}
</head>
<body>
${rawPreviewHtml}
</body>
</html>`
  }, [rawPreviewHtml, designTokensCSS])

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
            {rawPreviewHtml && (
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
                      {rawPreviewHtml}
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
                      )}
                    </pre>
                  </div>
                ) : (
                  /* Preview - desktop view scaled to fit exactly */
                  <div
                    className="bg-white relative overflow-hidden w-full"
                    style={{ height: '250px' }}
                    ref={(el) => {
                      if (el) {
                        const containerWidth = el.clientWidth
                        const containerHeight = 250
                        const scale = containerWidth / 1200
                        const iframeHeight = containerHeight / scale
                        const iframe = el.querySelector('iframe')
                        if (iframe) {
                          iframe.style.transform = `scale(${scale})`
                          iframe.style.height = `${iframeHeight}px`
                        }
                      }
                    }}
                  >
                    <iframe
                      srcDoc={displayHtml ?? undefined}
                      className="border-0 absolute top-0 left-0"
                      style={{
                        width: '1200px',
                        height: '250px',
                        transformOrigin: 'top left'
                      }}
                      sandbox="allow-scripts allow-same-origin"
                      title="Preview"
                    />
                    {message.isStreaming && (
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
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

            {/* Thinking Display - persisted in message */}
            {message.thinking && !message.isStreaming && (
              <div className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50/30">
                <button
                  onClick={() => setShowThinking(!showThinking)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">AI Denkprozess</span>
                  </div>
                  {showThinking ? (
                    <ChevronUp className="h-4 w-4 text-purple-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-purple-500" />
                  )}
                </button>
                {showThinking && (
                  <div className="px-3 py-2 border-t border-purple-200 max-h-48 overflow-y-auto">
                    <p className="text-xs text-purple-800/80 whitespace-pre-wrap leading-relaxed">
                      {message.thinking}
                    </p>
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
