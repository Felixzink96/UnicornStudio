'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Save,
  Eye,
  Code,
  Settings,
  Sparkles,
  Send,
  Loader2,
  ChevronRight,
  Copy,
  Check,
  Layers,
  RefreshCw,
  Braces,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { ReferenceDropdown, ReferenceBadge } from '@/components/editor/chat/ReferenceDropdown'
import type { Reference } from '@/lib/references/reference-types'
import { resolveReferencesForAI } from '@/lib/references/reference-resolver'
import { updateTemplate } from '@/lib/supabase/queries/templates'
import {
  buildTemplateVariables,
  buildDummyEntry,
  buildDummyEntries,
} from '@/lib/ai/template-system-prompt'
import type { Template, TemplateType, ContentType, Field } from '@/types/cms'

interface Page {
  id: string
  name: string
  slug: string
}

interface DesignTokens {
  colors?: {
    brand?: Record<string, string>
    neutral?: Record<string, string>
  }
  typography?: {
    fontHeading?: string
    fontBody?: string
    fontMono?: string
  }
  customColors?: Record<string, string>
  gradients?: Record<string, { from: string; to: string; via?: string; direction?: string }>
}

interface TemplateEditorAIProps {
  siteId: string
  template: Template
  contentType?: ContentType
  fields?: Field[]
  pages?: Page[]
  designVariables?: DesignTokens
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  html?: string
  references?: Reference[]
}

export function TemplateEditorAI({
  siteId,
  template,
  contentType,
  fields = [],
  pages = [],
  designVariables,
}: TemplateEditorAIProps) {
  const router = useRouter()

  // Template state
  const [name, setName] = useState(template.name)
  const [htmlContent, setHtmlContent] = useState(template.html || '')
  const [isDefault, setIsDefault] = useState(template.is_default || false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync state when template prop changes (e.g., after router.refresh())
  useEffect(() => {
    setName(template.name)
    setHtmlContent(template.html || '')
    setIsDefault(template.is_default || false)
  }, [template.id, template.name, template.html, template.is_default])

  // View state
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [showSettings, setShowSettings] = useState(false)
  const [showVariables, setShowVariables] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // @ Reference System State
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('')
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([])
  const [mentionStartPos, setMentionStartPos] = useState(-1)

  // Generate template variables documentation
  const templateVariables = contentType
    ? buildTemplateVariables(fields, contentType)
    : ''

  // Generate dummy data for preview
  const dummyData = contentType
    ? template.type === 'archive'
      ? { entries: buildDummyEntries(contentType, fields), pagination: { current: 1, total: 3, prev: null, next: '?page=2' } }
      : { entry: buildDummyEntry(contentType, fields), related_entries: buildDummyEntries(contentType, fields, 3) }
    : {}

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save template
  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const result = await updateTemplate(template.id, {
        name: name.trim(),
        html: htmlContent,
        is_default: isDefault,
      })

      console.log('Template saved successfully:', result.id)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      router.refresh()
    } catch (error) {
      console.error('Error saving template:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim Speichern'
      setSaveError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle @ mention detection in input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setPrompt(value)

    // Detect @ at cursor position
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch) {
      setShowReferenceDropdown(true)
      setReferenceSearchQuery(atMatch[1] || '')
      setMentionStartPos(textBeforeCursor.lastIndexOf('@'))
    } else {
      setShowReferenceDropdown(false)
      setReferenceSearchQuery('')
      setMentionStartPos(-1)
    }
  }

  // Handle reference selection
  const handleReferenceSelect = (ref: Reference) => {
    // Add to selected references if not already there
    if (!selectedReferences.find((r) => r.id === ref.id)) {
      setSelectedReferences([...selectedReferences, ref])
    }

    // Replace @ mention with reference name in prompt
    if (mentionStartPos >= 0) {
      const before = prompt.slice(0, mentionStartPos)
      const after = prompt.slice(textareaRef.current?.selectionStart || mentionStartPos)
      setPrompt(`${before}@${ref.displayName} ${after}`)
    }

    setShowReferenceDropdown(false)
    setReferenceSearchQuery('')
    setMentionStartPos(-1)
    textareaRef.current?.focus()
  }

  // Remove a reference
  const handleRemoveReference = (refId: string) => {
    setSelectedReferences(selectedReferences.filter((r) => r.id !== refId))
  }

  // Generate template with AI
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    // Save references for the message before clearing
    const messageReferences = [...selectedReferences]

    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      references: messageReferences.length > 0 ? messageReferences : undefined
    }
    setMessages((prev) => [...prev, userMessage])
    setPrompt('')
    setSelectedReferences([]) // Clear immediately so they appear in message
    setIsGenerating(true)

    try {
      // Resolve references to get full HTML/data
      let referenceData = {}
      if (messageReferences.length > 0) {
        referenceData = await resolveReferencesForAI(
          siteId,
          messageReferences.map((r) => ({ category: r.category, id: r.id })),
          undefined
        )
      }

      const response = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          siteId,
          contentTypeId: contentType?.id,
          templateType: template.type,
          currentHtml: htmlContent || undefined,
          referenceData, // Send full reference data including HTML
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Generierung')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'Template wurde generiert.',
        html: data.html,
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Apply generated HTML
      if (data.html) {
        setHtmlContent(data.html)
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
      }
      setMessages((prev) => [...prev, errorMessage])
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
  }

  // Copy variable to clipboard
  const copyVariable = async (variable: string) => {
    await navigator.clipboard.writeText(variable)
    setCopiedVar(variable)
    setTimeout(() => setCopiedVar(null), 2000)
  }

  // Generate CSS variables from design tokens
  const getCssVariables = () => {
    // Debug: log what we receive
    console.log('[TemplateEditor] designVariables:', designVariables)

    // Access the raw data - Supabase returns JSONB as parsed objects
    const dv = designVariables as Record<string, unknown> | undefined
    const colors = dv?.colors as Record<string, Record<string, string>> | undefined
    const typography = dv?.typography as Record<string, string> | undefined
    const customColors = dv?.customColors as Record<string, string> | undefined
    const gradients = dv?.gradients as Record<string, { from: string; to: string; via?: string; direction?: string }> | undefined

    let css = ':root {\n'

    // Brand colors - with fallbacks
    const brandColors = colors?.brand || {}
    css += `  --color-brand-primary: ${brandColors.primary || '#8b5cf6'};\n`
    css += `  --color-brand-secondary: ${brandColors.secondary || '#06b6d4'};\n`
    css += `  --color-brand-accent: ${brandColors.accent || '#f59e0b'};\n`

    // All other brand colors
    Object.entries(brandColors).forEach(([key, value]) => {
      if (value && !['primary', 'secondary', 'accent'].includes(key)) {
        css += `  --color-brand-${key}: ${value};\n`
      }
    })

    // Neutral colors
    const neutralColors = colors?.neutral || {}
    Object.entries(neutralColors).forEach(([key, value]) => {
      if (value) css += `  --color-neutral-${key}: ${value};\n`
    })

    // Custom colors
    if (customColors) {
      Object.entries(customColors).forEach(([key, value]) => {
        if (value) css += `  --color-custom-${key}: ${value};\n`
      })
    }

    // Typography
    const fontHeading = typography?.fontHeading || 'Inter'
    const fontBody = typography?.fontBody || 'Inter'
    const fontMono = typography?.fontMono || 'monospace'

    css += `  --font-heading: '${fontHeading}', system-ui, sans-serif;\n`
    css += `  --font-body: '${fontBody}', system-ui, sans-serif;\n`
    css += `  --font-mono: '${fontMono}', monospace;\n`

    css += '}\n\n'

    // Utility classes
    css += `.font-heading { font-family: var(--font-heading); }\n`
    css += `.font-body { font-family: var(--font-body); }\n`
    css += `.font-mono { font-family: var(--font-mono); }\n`

    // Gradient classes
    if (gradients) {
      Object.entries(gradients).forEach(([key, value]) => {
        if (value?.from && value?.to) {
          const dir = value.direction || 'to-r'
          const dirClass = dir.replace('to-', 'to ')
          if (value.via) {
            css += `.bg-gradient-${key} { background: linear-gradient(${dirClass}, ${value.from}, ${value.via}, ${value.to}); }\n`
          } else {
            css += `.bg-gradient-${key} { background: linear-gradient(${dirClass}, ${value.from}, ${value.to}); }\n`
          }
        }
      })
    }

    console.log('[TemplateEditor] Generated CSS:', css)
    return css
  }

  // Render preview with dummy data
  const renderPreviewContent = () => {
    if (!htmlContent) return ''

    // Simple Handlebars-like rendering for preview
    let renderedHtml = htmlContent

    // Replace entry variables for single templates
    if (template.type === 'single' && dummyData.entry) {
      const entry = dummyData.entry as Record<string, unknown>
      // Replace nested data paths like entry.data.fieldname
      renderedHtml = renderedHtml.replace(/\{\{\{?entry\.data\.(\w+(?:\.\w+)*)\}?\}\}/g, (_, path) => {
        const parts = path.split('.')
        let value: unknown = (entry as Record<string, unknown>).data
        for (const part of parts) {
          value = (value as Record<string, unknown>)?.[part]
        }
        return String(value || '')
      })
      // Replace direct entry properties
      renderedHtml = renderedHtml.replace(/\{\{\{?entry\.(\w+)\}?\}\}/g, (_, key) => {
        return String((entry as Record<string, unknown>)[key] || '')
      })
    }

    // Replace entries loop for archive templates
    if (template.type === 'archive' && dummyData.entries) {
      const entries = dummyData.entries as Record<string, unknown>[]
      const loopMatch = renderedHtml.match(/\{\{#each entries\}\}([\s\S]*?)\{\{\/each\}\}/)
      if (loopMatch) {
        const loopContent = loopMatch[1]
        const renderedItems = entries.map((entry) => {
          let itemHtml = loopContent
          // Replace data fields
          itemHtml = itemHtml.replace(/\{\{\{?data\.(\w+)\}?\}\}/g, (_, key) => {
            const data = entry.data as Record<string, unknown> | undefined
            return String(data?.[key] || '')
          })
          // Replace direct fields
          itemHtml = itemHtml.replace(/\{\{\{?(\w+)\}?\}\}/g, (_, key) => {
            return String((entry as Record<string, unknown>)[key] || '')
          })
          return itemHtml
        }).join('')
        renderedHtml = renderedHtml.replace(loopMatch[0], renderedItems)
      }
    }

    // Replace #each for repeater fields (e.g., entry.data.rezept_zutaten)
    const repeaterRegex = /\{\{#each entry\.data\.(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
    let repeaterMatch
    while ((repeaterMatch = repeaterRegex.exec(renderedHtml)) !== null) {
      const fieldName = repeaterMatch[1]
      const loopContent = repeaterMatch[2]
      const entry = dummyData.entry as Record<string, unknown> | undefined
      const data = entry?.data as Record<string, unknown> | undefined
      const items = data?.[fieldName] as Record<string, unknown>[] | undefined

      if (items && Array.isArray(items)) {
        const renderedItems = items.map((item) => {
          let itemHtml = loopContent
          itemHtml = itemHtml.replace(/\{\{\{?(\w+)\}?\}\}/g, (_, key) => {
            return String(item[key] || '')
          })
          return itemHtml
        }).join('')
        renderedHtml = renderedHtml.replace(repeaterMatch[0], renderedItems)
      }
    }

    // Remove unprocessed Handlebars tags
    renderedHtml = renderedHtml.replace(/\{\{[^}]+\}\}/g, '')

    return renderedHtml
  }

  const renderPreview = () => {
    if (!htmlContent) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Kein Template-HTML vorhanden</p>
            <p className="text-sm mt-2">Nutze den Chat um ein Template zu generieren</p>
          </div>
        </div>
      )
    }

    const previewHtml = renderPreviewContent()

    // Get fonts for Google Fonts URL
    const typography = designVariables?.typography as Record<string, string> | undefined
    const fontHeading = typography?.fontHeading || 'Inter'
    const fontBody = typography?.fontBody || 'Inter'
    const fonts = [...new Set([fontHeading, fontBody])].filter(f => f && f !== 'system-ui')
    const googleFontsUrl = fonts.length > 0
      ? `https://fonts.googleapis.com/css2?${fonts.map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`
      : 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'

    const iframeSrcDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${googleFontsUrl}" rel="stylesheet">
  <style>
    ${getCssVariables()}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-body); background: white; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${previewHtml}
</body>
</html>
`

    return (
      <iframe
        srcDoc={iframeSrcDoc}
        className="w-full h-full border-0"
        sandbox="allow-scripts"
        title="Template Preview"
      />
    )
  }

  // Parse variables for sidebar
  const variablesList = templateVariables.split('\n').filter(line => line.includes('{{'))

  return (
    <div className="h-full flex bg-slate-950 overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="w-[320px] min-w-[320px] flex flex-col bg-slate-900 border-r border-slate-800 h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Template Generator</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {template.type === 'archive' ? 'Archiv' : 'Einzelseite'} für {contentType?.label_plural || 'Einträge'}
          </p>

        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-purple-400/50 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Beschreibe wie dein Template aussehen soll
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setPrompt(template.type === 'archive'
                    ? 'Erstelle ein modernes Archiv-Template mit Karten-Grid und Hover-Effekten'
                    : 'Erstelle ein Blog-Post Template mit Hero-Bild, Meta-Infos und Related Posts'
                  )}
                  className="block w-full text-left text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  {template.type === 'archive'
                    ? 'Modernes Karten-Grid mit Hover'
                    : 'Blog-Post mit Hero und Related Posts'
                  }
                </button>
                <button
                  onClick={() => setPrompt(template.type === 'archive'
                    ? 'Erstelle ein minimalistisches Listen-Layout ohne Bilder'
                    : 'Erstelle ein cleanes Artikel-Layout mit Sidebar für Inhaltsverzeichnis'
                  )}
                  className="block w-full text-left text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  {template.type === 'archive'
                    ? 'Minimalistisches Listen-Layout'
                    : 'Artikel mit Inhaltsverzeichnis-Sidebar'
                  }
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.role === 'user'
                    ? 'ml-8 bg-purple-600/20 border-purple-500/30'
                    : 'mr-8 bg-slate-800 border-slate-700'
                } rounded-lg border p-3`}
              >
                {/* Show references if present */}
                {msg.references && msg.references.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {msg.references.map((ref) => (
                      <span
                        key={ref.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      >
                        <FileText className="h-3 w-3" />
                        @{ref.displayName}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-slate-200">{msg.content}</p>
                {msg.html && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      <Check className="h-3 w-3 mr-1" />
                      HTML generiert
                    </Badge>
                  </div>
                )}
              </div>
            ))
          )}
          {isGenerating && (
            <div className="mr-8 bg-slate-800 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Generiere Template...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-800">
          {/* Selected References */}
          {selectedReferences.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedReferences.map((ref) => (
                <ReferenceBadge
                  key={ref.id}
                  reference={ref}
                  onRemove={() => handleRemoveReference(ref.id)}
                />
              ))}
            </div>
          )}

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Beschreibe dein Template... Tippe @ für Seiten-Referenzen"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-12 min-h-[80px] resize-none"
              disabled={isGenerating}
            />
            <Button
              size="icon"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="absolute bottom-2 right-2 h-8 w-8 bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>

            {/* Reference Dropdown */}
            {showReferenceDropdown && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
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
          <p className="text-xs text-slate-500 mt-2">
            <kbd className="px-1 py-0.5 bg-slate-800 rounded">@</kbd> für Referenzen · <kbd className="px-1 py-0.5 bg-slate-800 rounded">⌘</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded">Enter</kbd> zum Senden
          </p>
        </div>
      </div>

      {/* Center - Preview/Code */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Toolbar */}
        <div className="h-12 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('preview')}
              className={viewMode === 'preview' ? 'bg-slate-700' : 'text-slate-400'}
            >
              <Eye className="h-4 w-4 mr-1" />
              Vorschau
            </Button>
            <Button
              variant={viewMode === 'code' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('code')}
              className={viewMode === 'code' ? 'bg-slate-700' : 'text-slate-400'}
            >
              <Code className="h-4 w-4 mr-1" />
              Code
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowVariables(true)}
              className="text-slate-400 hover:text-white"
            >
              <Braces className="h-4 w-4 mr-1" />
              Variablen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="text-slate-400"
            >
              <Settings className="h-4 w-4" />
            </Button>
            {/* View rendered archive/single page */}
            {contentType && (
              <Button
                onClick={() => {
                  window.open(
                    `/api/v1/sites/${siteId}/render/${contentType.slug}`,
                    '_blank'
                  )
                }}
                variant="outline"
                size="sm"
                className="border-slate-700 text-slate-300"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ansehen
              </Button>
            )}
            {/* Save Error Message */}
            {saveError && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded text-red-400 text-xs">
                <X className="h-3 w-3" />
                <span>{saveError}</span>
                <button onClick={() => setSaveError(null)} className="ml-1 hover:text-red-300">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Save Success Message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/50 rounded text-green-400 text-xs">
                <Check className="h-3 w-3" />
                <span>Gespeichert!</span>
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className={saveSuccess ? "bg-green-600 hover:bg-green-700" : "bg-purple-600 hover:bg-purple-700"}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : saveSuccess ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {isSaving ? 'Speichert...' : saveSuccess ? 'Gespeichert' : 'Speichern'}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'preview' ? (
            <div className="h-full w-full">
              {renderPreview()}
            </div>
          ) : (
            <Textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              className="h-full w-full bg-slate-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
              placeholder="Template HTML hier..."
            />
          )}
        </div>
      </div>

      {/* Variables Sheet/Drawer */}
      <Sheet open={showVariables} onOpenChange={setShowVariables}>
        <SheetContent side="right" className="w-[350px] bg-slate-900 border-slate-800 p-0">
          <SheetHeader className="p-4 border-b border-slate-800">
            <SheetTitle className="text-white flex items-center gap-2">
              <Braces className="h-5 w-5 text-purple-400" />
              Template-Variablen
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 overflow-y-auto h-[calc(100vh-80px)]">
            <p className="text-xs text-slate-500 mb-4">
              Klicke auf eine Variable um sie zu kopieren
            </p>

            <div className="space-y-1">
              {variablesList.map((line, index) => {
                const match = line.match(/(\{\{[^}]+\}\})/)
                if (!match) return null

                const variable = match[1]
                const description = line.replace(variable, '').replace(' - ', '').trim()

                return (
                  <button
                    key={index}
                    onClick={() => copyVariable(variable)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition-colors group relative"
                  >
                    <code className="text-sm text-purple-400 block truncate font-mono">
                      {variable}
                    </code>
                    {description && (
                      <span className="text-xs text-slate-500 mt-1 block">{description}</span>
                    )}
                    {copiedVar === variable && (
                      <Badge className="absolute right-2 top-3 bg-green-500/20 text-green-400 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Kopiert
                      </Badge>
                    )}
                  </button>
                )
              })}
            </div>

            {template.type === 'archive' && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-sm font-medium text-white mb-2">Loop-Syntax:</p>
                <pre className="text-xs text-purple-400 bg-slate-800 p-3 rounded-lg overflow-x-auto">
{`{{#each entries}}
  <article>
    <h2>{{title}}</h2>
    <p>{{excerpt}}</p>
    <a href="{{url}}">Mehr</a>
  </article>
{{/each}}`}
                </pre>
              </div>
            )}

            {template.type === 'single' && (
              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-sm font-medium text-white mb-2">Content-Bereich:</p>
                <pre className="text-xs text-purple-400 bg-slate-800 p-3 rounded-lg overflow-x-auto">
{`<article>
  <h1>{{entry.title}}</h1>
  <div class="prose">
    {{{entry.content}}}
  </div>
</article>`}
                </pre>
                <p className="text-xs text-slate-500 mt-2">
                  💡 Nutze drei geschweifte Klammern für HTML-Inhalt
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-[350px] bg-slate-900 border-slate-800 p-0">
          <SheetHeader className="p-4 border-b border-slate-800">
            <SheetTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Einstellungen
            </SheetTitle>
          </SheetHeader>

          <div className="p-4 space-y-4">
            <div>
              <Label className="text-slate-300 text-sm">Template Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <Label className="text-white text-sm">Standard Template</Label>
                <p className="text-xs text-slate-500">Als Fallback verwenden</p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
            </div>

            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500">
                Template Typ: <span className="text-white">{template.type === 'archive' ? 'Archiv' : 'Einzelseite'}</span>
              </p>
              {contentType && (
                <p className="text-xs text-slate-500 mt-1">
                  Content Type: <span className="text-white">{contentType.label_plural}</span>
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
