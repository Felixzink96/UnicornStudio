'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Save,
  Eye,
  Code,
  Settings,
  Sparkles,
  Send,
  Loader2,
  Check,
  X,
  FileCode,
  Palette,
  Zap,
  ArrowLeft,
} from 'lucide-react'
import { createComponent, updateComponent } from '@/lib/supabase/queries/cms-components'
import { ReferenceDropdown } from '@/components/editor/chat/ReferenceDropdown'
import { resolveReferencesForAI } from '@/lib/references/reference-resolver'
import { createClient } from '@/lib/supabase/client'
import type { Reference } from '@/lib/references/reference-types'
import type { CMSComponent, CMSComponentType, JSInitStrategy } from '@/types/cms'

interface TemplateContext {
  id: string
  name: string
  html: string
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
}

interface ComponentEditorAIProps {
  siteId: string
  component?: CMSComponent
  designVariables?: DesignTokens
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  applied?: boolean
}

const jsInitStrategies: { value: JSInitStrategy; label: string }[] = [
  { value: 'immediate', label: 'Sofort' },
  { value: 'domready', label: 'DOM Ready' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'interaction', label: 'Interaktion' },
]

export function ComponentEditorAI({
  siteId,
  component,
  designVariables,
}: ComponentEditorAIProps) {
  const router = useRouter()
  const isNew = !component

  // Component state
  const [componentId, setComponentId] = useState(component?.id || '')
  const [name, setName] = useState(component?.name || 'Neue Komponente')
  const [slug, setSlug] = useState(component?.slug || '')
  const [type, setType] = useState<CMSComponentType>(component?.type || 'block')
  const [description, setDescription] = useState(component?.description || '')
  const [htmlContent, setHtmlContent] = useState(component?.html || '')
  const [cssContent, setCssContent] = useState(component?.css || '')
  const [jsContent, setJsContent] = useState(component?.js || '')
  const [jsInit, setJsInit] = useState<JSInitStrategy>(component?.js_init || 'domready')
  const [aiPrompt, setAiPrompt] = useState(component?.ai_prompt || '')

  // UI state
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [activeCodeTab, setActiveCodeTab] = useState('html')
  const [showSettings, setShowSettings] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reference system state
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false)
  const [referenceSearchQuery, setReferenceSearchQuery] = useState('')
  const [selectedReferences, setSelectedReferences] = useState<Reference[]>([])
  const [mentionStartPos, setMentionStartPos] = useState(-1)

  // Template context state
  const [availableTemplates, setAvailableTemplates] = useState<TemplateContext[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  // Sync state when component prop changes
  useEffect(() => {
    if (component) {
      setComponentId(component.id)
      setName(component.name)
      setSlug(component.slug || '')
      setType(component.type)
      setDescription(component.description || '')
      setHtmlContent(component.html || '')
      setCssContent(component.css || '')
      setJsContent(component.js || '')
      setJsInit(component.js_init || 'domready')
      setAiPrompt(component.ai_prompt || '')
    }
  }, [component?.id])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      if (isMeta && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [name, htmlContent, cssContent, jsContent])

  // Load available templates
  useEffect(() => {
    async function loadTemplates() {
      setIsLoadingTemplates(true)
      try {
        const supabase = createClient()
        const { data: templates } = await supabase
          .from('templates')
          .select('id, name, html')
          .eq('site_id', siteId)
          .order('name')

        if (templates) {
          setAvailableTemplates(templates.map(t => ({
            id: t.id,
            name: t.name,
            html: t.html || '',
          })))
        }
      } catch (error) {
        console.error('Error loading templates:', error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }
    loadTemplates()
  }, [siteId])

  // Get selected template
  const selectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId)

  // Save component
  const handleSave = async () => {
    if (!name.trim()) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const data = {
        name: name.trim(),
        slug: slug.trim() || null,
        type,
        description: description.trim() || null,
        html: htmlContent,
        css: cssContent.trim() || null,
        js: jsContent.trim() || null,
        js_init: jsInit,
        ai_prompt: aiPrompt.trim() || null,
      }

      if (isNew || !componentId) {
        const newComponent = await createComponent({ ...data, site_id: siteId })
        setComponentId(newComponent.id)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        router.replace(`/dashboard/sites/${siteId}/components/${newComponent.id}`)
      } else {
        await updateComponent(componentId, data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving component:', error)
      setSaveError(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  // Generate with AI
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    const userMessage: ChatMessage = { role: 'user', content: prompt }
    setMessages((prev) => [...prev, userMessage])
    const currentPrompt = prompt.trim()
    const currentRefs = [...selectedReferences]
    setPrompt('')
    setSelectedReferences([])
    setIsGenerating(true)

    try {
      // Resolve references for AI
      let referenceData: { pages?: Array<{ id: string; name: string; slug: string; html?: string }>; components?: Array<{ id: string; name: string; html: string; css?: string; js?: string }> } = {}
      if (currentRefs.length > 0) {
        referenceData = await resolveReferencesForAI(siteId, currentRefs)
      }

      const endpoint = (isNew && !htmlContent) ? '/api/ai/generate-component' : '/api/ai/edit-component'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          siteId,
          componentId: componentId || undefined,
          currentHtml: htmlContent || undefined,
          currentCss: cssContent || undefined,
          currentJs: jsContent || undefined,
          slug: slug || undefined,
          componentType: type,
          referenceData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Generierung')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message || 'Komponente wurde generiert.',
        applied: true,
      }
      setMessages((prev) => [...prev, assistantMessage])

      if (data.html) setHtmlContent(data.html)
      if (data.css !== undefined) setCssContent(data.css || '')
      if (data.js !== undefined) setJsContent(data.js || '')
      if (data.name && isNew) setName(data.name)
      if (data.slug && isNew) setSlug(data.slug)
      if (data.description && isNew) setDescription(data.description)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleGenerate()
    }
    if (e.key === 'Escape' && showReferenceDropdown) {
      setShowReferenceDropdown(false)
    }
  }

  // Handle @ mentions in input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart || 0
    setPrompt(value)

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

    const beforeAt = prompt.slice(0, mentionStartPos)
    const afterQuery = prompt.slice(textareaRef.current?.selectionStart || mentionStartPos)
    const newPrompt = `${beforeAt}@${reference.displayName} ${afterQuery.trim()}`

    setPrompt(newPrompt)
    setSelectedReferences((prev) => [...prev, reference])
    setShowReferenceDropdown(false)
    setMentionStartPos(-1)
    textareaRef.current?.focus()
  }

  // Remove reference
  const handleRemoveReference = (refId: string) => {
    setSelectedReferences((prev) => prev.filter((r) => r.id !== refId))
  }

  // CSS Variables for preview
  const getCssVariables = () => {
    const dv = designVariables as Record<string, unknown> | undefined
    const colors = dv?.colors as Record<string, Record<string, string>> | undefined
    const typography = dv?.typography as Record<string, string> | undefined

    let css = ':root {\n'
    const brandColors = colors?.brand || {}
    css += `  --color-brand-primary: ${brandColors.primary || '#8b5cf6'};\n`
    css += `  --color-brand-secondary: ${brandColors.secondary || '#06b6d4'};\n`
    css += `  --color-brand-accent: ${brandColors.accent || '#f59e0b'};\n`

    const neutralColors = colors?.neutral || {}
    Object.entries(neutralColors).forEach(([key, value]) => {
      if (value) css += `  --color-neutral-${key}: ${value};\n`
    })

    const fontHeading = typography?.fontHeading || 'Inter'
    const fontBody = typography?.fontBody || 'Inter'
    css += `  --font-heading: '${fontHeading}', system-ui, sans-serif;\n`
    css += `  --font-body: '${fontBody}', system-ui, sans-serif;\n`
    css += `  --radius-sm: 0.25rem; --radius-default: 0.5rem; --radius-lg: 0.75rem;\n`
    css += `  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05); --shadow-md: 0 4px 6px rgba(0,0,0,0.1);\n`
    css += '}\n'
    return css
  }

  // Preview render
  const renderPreview = () => {
    if (!htmlContent) {
      return (
        <div className="flex items-center justify-center h-full text-zinc-500">
          <div className="text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Kein HTML vorhanden</p>
            <p className="text-sm mt-2">Nutze den Chat um die Komponente zu erstellen</p>
          </div>
        </div>
      )
    }

    const sampleContent = `
      <div class="entry-content" style="max-width: 800px; margin: 2rem auto; padding: 0 1rem;">
        <h2>Erste Überschrift</h2>
        <p>Lorem ipsum dolor sit amet.</p>
        <h2>Zweite Überschrift</h2>
        <p>Ut enim ad minim veniam.</p>
        <h3>Unterüberschrift</h3>
        <p>Duis aute irure dolor.</p>
      </div>
    `

    // Build body content based on template context
    let bodyContent: string
    let combinedCss = cssContent

    if (selectedTemplate) {
      // Replace component placeholder or insert component before content
      let templateHtml = selectedTemplate.html
      const componentPlaceholder = slug ? `{{component:${slug}}}` : '{{component:preview}}'

      if (templateHtml.includes(componentPlaceholder) || templateHtml.includes('{{component:')) {
        // Replace all component placeholders with the current component
        templateHtml = templateHtml.replace(/\{\{component:[^}]+\}\}/g, htmlContent)
      } else {
        // Insert component at beginning of template
        templateHtml = htmlContent + templateHtml
      }

      // Replace entry content placeholder with sample content
      templateHtml = templateHtml.replace('{{content}}', sampleContent)

      bodyContent = templateHtml
      combinedCss = cssContent
    } else {
      // No template context - simple preview
      bodyContent = `
        <div style="max-width: 400px; margin: 0 auto 2rem;">${htmlContent}</div>
        ${sampleContent}
      `
    }

    const iframeSrcDoc = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${getCssVariables()}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-body); background: ${selectedTemplate ? '#ffffff' : '#f8fafc'}; min-height: 100vh; ${selectedTemplate ? '' : 'padding: 2rem;'} }
    ${combinedCss}
  </style>
</head>
<body>
  ${bodyContent}
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      try { ${jsContent || ''} } catch(e) { console.error(e); }
    });
  </script>
</body>
</html>`

    return (
      <iframe
        srcDoc={iframeSrcDoc}
        className="w-full h-full border-0 bg-white"
        sandbox="allow-scripts"
        title="Component Preview"
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950">
      {/* Toolbar */}
      <div className="h-12 px-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/sites/${siteId}/components`)}
            className="text-zinc-600 dark:text-zinc-400"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Zurück
          </Button>
          <span className="font-medium text-zinc-900 dark:text-white">
            {isNew ? 'Neue Komponente' : name}
          </span>
          {slug && (
            <span className="text-xs font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
              {slug}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'preview' ? 'code' : 'preview')}
            className="text-zinc-600 dark:text-zinc-400"
          >
            {viewMode === 'preview' ? <Code className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {viewMode === 'preview' ? 'Code' : 'Vorschau'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="text-zinc-600 dark:text-zinc-400"
          >
            <Settings className="h-4 w-4" />
          </Button>
          {saveError && <span className="text-xs text-red-500">{saveError}</span>}
          {saveSuccess && <span className="text-xs text-green-500">Gespeichert!</span>}
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Speichern
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div className="w-[420px] min-w-[420px] max-w-[420px] flex-shrink-0 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {/* Chat Header */}
          <div className="h-14 px-4 flex items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <span className="font-semibold text-zinc-900 dark:text-white">
                {isNew ? 'Komponente erstellen' : 'Komponente bearbeiten'}
              </span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-purple-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  {isNew ? 'Neue Komponente' : 'Was möchtest du ändern?'}
                </h3>
                <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                  {isNew ? 'Beschreibe welche Komponente du erstellen möchtest.' : 'Beschreibe deine Änderung.'}
                </p>
                <div className="mt-6 space-y-2">
                  {isNew ? (
                    <>
                      <button onClick={() => setPrompt('Erstelle einen Reading Progress Bar')} className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        📊 Reading Progress Bar
                      </button>
                      <button onClick={() => setPrompt('Erstelle ein Inhaltsverzeichnis (TOC)')} className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        📑 Inhaltsverzeichnis (TOC)
                      </button>
                      <button onClick={() => setPrompt('Erstelle einen Back to Top Button')} className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        ⬆️ Back to Top Button
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setPrompt('Füge einen Hover-Effekt hinzu')} className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Hover-Effekt hinzufügen
                      </button>
                      <button onClick={() => setPrompt('Mache das Design minimalistischer')} className="block w-full text-left px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                        Design minimalistischer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.applied && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
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
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">Generiere...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
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

          {/* Chat Input */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Beschreibe deine Komponente... (@ für Referenzen)"
                className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 pr-12 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                rows={1}
                disabled={isGenerating}
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="absolute right-2 bottom-2 p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>

              {/* Reference Dropdown */}
              {showReferenceDropdown && (
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
            <p className="text-xs text-zinc-500 mt-2 text-center">⌘ + Enter zum Senden · @ für Referenzen</p>
          </div>
        </div>

        {/* Center - Preview/Code */}
        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
          {viewMode === 'code' ? (
            <div className="h-full flex flex-col bg-zinc-950">
              <Tabs value={activeCodeTab} onValueChange={setActiveCodeTab} className="flex-1 flex flex-col">
                <div className="h-10 px-4 flex items-center bg-zinc-900 border-b border-zinc-800">
                  <TabsList className="bg-transparent h-auto p-0 gap-4">
                    <TabsTrigger value="html" className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-400 px-0 pb-2 border-b-2 border-transparent data-[state=active]:border-purple-500 rounded-none">
                      <FileCode className="h-4 w-4 mr-1" />HTML
                    </TabsTrigger>
                    <TabsTrigger value="css" className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-400 px-0 pb-2 border-b-2 border-transparent data-[state=active]:border-purple-500 rounded-none">
                      <Palette className="h-4 w-4 mr-1" />CSS
                    </TabsTrigger>
                    <TabsTrigger value="js" className="data-[state=active]:bg-transparent data-[state=active]:text-white text-zinc-400 px-0 pb-2 border-b-2 border-transparent data-[state=active]:border-purple-500 rounded-none">
                      <Zap className="h-4 w-4 mr-1" />JS
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="html" className="flex-1 m-0">
                  <Textarea
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="h-full bg-zinc-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
                    placeholder="HTML..."
                  />
                </TabsContent>
                <TabsContent value="css" className="flex-1 m-0">
                  <Textarea
                    value={cssContent}
                    onChange={(e) => setCssContent(e.target.value)}
                    className="h-full bg-zinc-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
                    placeholder="CSS..."
                  />
                </TabsContent>
                <TabsContent value="js" className="flex-1 m-0 flex flex-col">
                  <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center gap-2">
                    <Label className="text-zinc-400 text-xs">Init:</Label>
                    <Select value={jsInit} onValueChange={(v) => setJsInit(v as JSInitStrategy)}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-7 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {jsInitStrategies.map((s) => (
                          <SelectItem key={s.value} value={s.value} className="text-zinc-300 text-xs">{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={jsContent}
                    onChange={(e) => setJsContent(e.target.value)}
                    className="flex-1 bg-zinc-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
                    placeholder="JavaScript..."
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Template Context Selector */}
              <div className="h-10 px-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Label className="text-zinc-500 dark:text-zinc-400 text-xs">Template-Kontext:</Label>
                  <Select value={selectedTemplateId || 'none'} onValueChange={(v) => setSelectedTemplateId(v === 'none' ? '' : v)}>
                    <SelectTrigger className="w-48 h-7 text-xs bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                      <SelectValue placeholder="Kein Template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Template</SelectItem>
                      {availableTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplate && (
                  <span className="text-xs text-green-600 dark:text-green-400">
                    ✓ Vorschau im Template
                  </span>
                )}
              </div>
              {/* Preview Area */}
              <div className="flex-1">
                {renderPreview()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-[400px] bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
          <SheetHeader>
            <SheetTitle className="text-zinc-900 dark:text-white">Einstellungen</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1 font-mono" placeholder="z.B. toc, reading-progress" />
              <p className="text-xs text-zinc-500 mt-1">Für Template: {`{{component:${slug || 'slug'}}}`}</p>
            </div>
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as CMSComponentType)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="element">Element</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="layout">Layout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">Beschreibung</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-zinc-700 dark:text-zinc-300">AI-Anweisung</Label>
              <Textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} className="mt-1" rows={3} placeholder="Wann soll AI diese Komponente verwenden?" />
            </div>
            {componentId && (
              <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-500">ID: <span className="font-mono">{componentId.slice(0, 8)}...</span></p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
