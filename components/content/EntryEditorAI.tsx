'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/sheet'
import {
  Save,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  Image as ImageIcon,
  Tags,
  Sparkles,
  Send,
  Eye,
  Code,
  ChevronDown,
  ChevronUp,
  Settings,
  RefreshCw,
  Layers,
  X,
  ExternalLink,
} from 'lucide-react'
import { FieldRenderer } from './fields'
import { createEntry, updateEntry, setEntryTerms } from '@/lib/supabase/queries/entries'
import { getTerms } from '@/lib/supabase/queries/taxonomies'
import { ImagePicker } from '@/components/editor/assets/ImagePicker'
import type {
  ContentType,
  Entry,
  EntryInsert,
  EntryStatus,
  Field,
  Taxonomy,
  Term,
  Template,
} from '@/types/cms'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  generatedContent?: string
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

interface EntryEditorAIProps {
  siteId: string
  contentType: ContentType
  fields: Field[]
  taxonomies: Taxonomy[]
  template?: Template
  entry?: Entry
  entryTermIds?: string[]
  authorId?: string
  designVariables?: DesignTokens
}

export function EntryEditorAI({
  siteId,
  contentType,
  fields,
  taxonomies,
  template,
  entry,
  entryTermIds = [],
  authorId,
  designVariables,
}: EntryEditorAIProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [title, setTitle] = useState(entry?.title || '')
  const [slug, setSlug] = useState(entry?.slug || '')
  const [content, setContent] = useState(entry?.content || '')
  const [excerpt, setExcerpt] = useState(entry?.excerpt || '')
  const [status, setStatus] = useState<EntryStatus>(entry?.status || 'draft')
  const [publishedAt, setPublishedAt] = useState(entry?.published_at || '')
  const [featuredImageId, setFeaturedImageId] = useState(entry?.featured_image_id || '')
  const [data, setData] = useState<Record<string, unknown>>(entry?.data || {})
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>(entryTermIds)

  // Taxonomy terms
  const [taxonomyTerms, setTaxonomyTerms] = useState<Record<string, Term[]>>({})

  // View state
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [showFieldsSheet, setShowFieldsSheet] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load taxonomy terms
  useEffect(() => {
    async function loadTerms() {
      const termsMap: Record<string, Term[]> = {}
      for (const taxonomy of taxonomies) {
        const terms = await getTerms(taxonomy.id)
        termsMap[taxonomy.id] = terms
      }
      setTaxonomyTerms(termsMap)
    }
    if (taxonomies.length > 0) {
      loadTerms()
    }
  }, [taxonomies])

  // Auto-generate slug from title
  useEffect(() => {
    if (!entry && title && !slug) {
      setSlug(generateSlug(title))
    }
  }, [title, entry, slug])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[äÄ]/g, 'ae')
      .replace(/[öÖ]/g, 'oe')
      .replace(/[üÜ]/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setData((prev) => ({
      ...prev,
      [fieldName]: value,
    }))
  }

  const handleSave = async (targetStatus: EntryStatus = status) => {
    setIsSaving(true)

    try {
      const entryData: EntryInsert = {
        site_id: siteId,
        content_type_id: contentType.id,
        title: contentType.has_title ? title : undefined,
        slug: contentType.has_slug ? slug : undefined,
        content: contentType.has_content ? content : undefined,
        excerpt: contentType.has_excerpt ? excerpt : undefined,
        status: targetStatus,
        published_at:
          targetStatus === 'published' && !entry?.published_at
            ? new Date().toISOString()
            : publishedAt || undefined,
        featured_image_id: contentType.has_featured_image
          ? featuredImageId || undefined
          : undefined,
        author_id: contentType.has_author ? authorId : undefined,
        data,
      }

      let savedEntry: Entry

      if (entry) {
        savedEntry = await updateEntry(entry.id, entryData)
      } else {
        savedEntry = await createEntry(entryData)
      }

      // Save taxonomy terms
      if (taxonomies.length > 0) {
        await setEntryTerms(savedEntry.id, selectedTermIds)
      }

      router.push(`/dashboard/sites/${siteId}/content/${contentType.slug}`)
      router.refresh()
    } catch (error) {
      console.error('Error saving entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    setIsSubmitting(true)
    await handleSave('published')
    setIsSubmitting(false)
  }

  const handleTermToggle = (termId: string) => {
    setSelectedTermIds((prev) =>
      prev.includes(termId)
        ? prev.filter((id) => id !== termId)
        : [...prev, termId]
    )
  }

  // Generate content with AI
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    const userMessage: ChatMessage = { role: 'user', content: prompt }
    setMessages((prev) => [...prev, userMessage])
    setPrompt('')
    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/generate-entry-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          siteId,
          contentTypeId: contentType.id,
          entryTitle: title,
          currentContent: content || undefined,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Fehler bei der Generierung')
      }

      // Count how many fields were filled
      const filledFields: string[] = []
      if (responseData.title) filledFields.push('Titel')
      if (responseData.excerpt) filledFields.push('Auszug')
      if (responseData.content) filledFields.push('Inhalt')
      if (responseData.data) {
        const dataKeys = Object.keys(responseData.data)
        filledFields.push(...dataKeys.map(k => k.replace(/_/g, ' ')))
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: responseData.message || `Eintrag generiert! Ausgefüllte Felder: ${filledFields.join(', ')}`,
        generatedContent: responseData.content,
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Apply generated title
      if (responseData.title && !title) {
        setTitle(responseData.title)
        // Auto-generate slug from title
        const newSlug = responseData.title
          .toLowerCase()
          .replace(/[äÄ]/g, 'ae')
          .replace(/[öÖ]/g, 'oe')
          .replace(/[üÜ]/g, 'ue')
          .replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        setSlug(newSlug)
      }

      // Apply generated excerpt
      if (responseData.excerpt) {
        setExcerpt(responseData.excerpt)
      }

      // Apply generated content
      if (responseData.content) {
        setContent(responseData.content)
      }

      // Apply generated ACF data
      if (responseData.data && typeof responseData.data === 'object') {
        setData((prev) => ({
          ...prev,
          ...responseData.data,
        }))
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

  // Generate CSS variables from design tokens
  const getCssVariables = () => {
    const dv = designVariables as Record<string, unknown> | undefined
    const colors = dv?.colors as Record<string, Record<string, string>> | undefined
    const typography = dv?.typography as Record<string, string> | undefined
    const customColors = dv?.customColors as Record<string, string> | undefined

    let css = ':root {\n'

    // Brand colors - with fallbacks
    const brandColors = colors?.brand || {}
    css += `  --color-brand-primary: ${brandColors.primary || '#8b5cf6'};\n`
    css += `  --color-brand-secondary: ${brandColors.secondary || '#06b6d4'};\n`
    css += `  --color-brand-accent: ${brandColors.accent || '#f59e0b'};\n`

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

    css += `  --font-heading: '${fontHeading}', system-ui, sans-serif;\n`
    css += `  --font-body: '${fontBody}', system-ui, sans-serif;\n`

    css += '}\n\n'
    css += `.font-heading { font-family: var(--font-heading); }\n`
    css += `.font-body { font-family: var(--font-body); }\n`

    return css
  }

  // Render preview with template
  const renderPreview = () => {
    // Build entry data
    const entryData = {
      title: title || 'Titel des Eintrags',
      slug,
      content: content || '<p class="text-slate-400">Noch kein Inhalt...</p>',
      excerpt: excerpt || 'Kurze Beschreibung...',
      featured_image: featuredImageId || 'https://via.placeholder.com/1200x600?text=Beitragsbild',
      author: 'Autor',
      published_at: publishedAt || new Date().toISOString(),
      data,
    }

    let previewHtml = ''

    if (template?.html) {
      // Render with template
      previewHtml = template.html

      // Replace entry.data.xxx fields
      previewHtml = previewHtml.replace(/\{\{\{?entry\.data\.(\w+)\}?\}\}/g, (_, key) => {
        const value = data[key]
        return String(value || '')
      })

      // Replace entry.xxx fields
      previewHtml = previewHtml.replace(/\{\{\{?entry\.(\w+)\}?\}\}/g, (_, key) => {
        return String((entryData as Record<string, unknown>)[key] || '')
      })

      // Handle repeater fields
      const repeaterRegex = /\{\{#each entry\.data\.(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g
      let match
      while ((match = repeaterRegex.exec(previewHtml)) !== null) {
        const fieldName = match[1]
        const loopContent = match[2]
        const items = data[fieldName] as Record<string, unknown>[] | undefined

        if (items && Array.isArray(items)) {
          const rendered = items.map((item) => {
            let itemHtml = loopContent
            itemHtml = itemHtml.replace(/\{\{\{?(\w+)\}?\}\}/g, (_, key) => {
              return String(item[key] || '')
            })
            return itemHtml
          }).join('')
          previewHtml = previewHtml.replace(match[0], rendered)
        }
      }

      // Remove unprocessed Handlebars tags
      previewHtml = previewHtml.replace(/\{\{[^}]+\}\}/g, '')
    } else {
      // No template, show just content
      previewHtml = `
        <div class="container mx-auto px-4 py-8">
          <h1 class="font-heading text-4xl font-bold mb-4">${entryData.title}</h1>
          <p class="text-slate-500 mb-8">${entryData.excerpt}</p>
          <div class="prose prose-lg max-w-none">
            ${entryData.content}
          </div>
        </div>
      `
    }

    // Get fonts
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
        title="Entry Preview"
      />
    )
  }

  return (
    <div className="h-full flex bg-slate-950 overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="w-[320px] min-w-[320px] flex flex-col bg-slate-900 border-r border-slate-800 h-full">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h3 className="font-semibold text-white">Content Generator</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Schreibe Texte mit KI-Unterstützung
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="h-8 w-8 text-purple-400/50 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Was soll ich für &quot;{title || contentType.label_singular}&quot; schreiben?
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setPrompt('Schreibe eine Einleitung für diesen Artikel')}
                  className="block w-full text-left text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  Einleitung schreiben
                </button>
                <button
                  onClick={() => setPrompt('Erstelle eine Liste der wichtigsten Punkte')}
                  className="block w-full text-left text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  Wichtige Punkte auflisten
                </button>
                <button
                  onClick={() => setPrompt('Schreibe einen Abschluss mit Call-to-Action')}
                  className="block w-full text-left text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                >
                  Abschluss mit CTA
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.role === 'user'
                    ? 'ml-6 bg-purple-600/20 border-purple-500/30'
                    : 'mr-6 bg-slate-800 border-slate-700'
                } rounded-lg border p-3`}
              >
                <p className="text-sm text-slate-200">{msg.content}</p>
                {msg.generatedContent && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Content hinzugefügt
                    </Badge>
                  </div>
                )}
              </div>
            ))
          )}
          {isGenerating && (
            <div className="mr-6 bg-slate-800 border border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Schreibe...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-800">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Was soll ich schreiben?"
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-12 min-h-[60px] resize-none"
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
          </div>
        </div>
      </div>

      {/* Center - Preview/Editor */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Toolbar */}
        <div className="h-12 px-4 flex items-center justify-between bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            {/* Title Input */}
            {contentType.has_title && (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${contentType.label_singular} Titel`}
                className="bg-slate-800 border-slate-700 text-white w-64"
              />
            )}

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
                HTML
              </Button>

              <div className="w-px h-6 bg-slate-700" />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFieldsSheet(true)}
                className="text-slate-400 hover:text-white"
              >
                <Layers className="h-4 w-4 mr-1" />
                Felder
                {fields.length > 0 && (
                  <Badge className="ml-1 bg-purple-600 text-white text-xs h-5 px-1.5">
                    {fields.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View rendered page */}
            {entry && slug && (
              <Button
                onClick={() => {
                  window.open(
                    `/api/v1/sites/${siteId}/render/${contentType.slug}/${slug}`,
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
            <Button
              onClick={() => handleSave('draft')}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Speichern
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isSubmitting || isSaving}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Veröffentlichen
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'preview' ? (
            <div className="h-full overflow-auto bg-white">
              {renderPreview()}
            </div>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="h-full w-full bg-slate-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
              placeholder="HTML Content..."
            />
          )}
        </div>
      </div>

      {/* Fields Sheet (Modal) */}
      <Sheet open={showFieldsSheet} onOpenChange={setShowFieldsSheet}>
        <SheetContent side="right" className="w-[380px] bg-slate-900 border-slate-800 p-0 overflow-y-auto">
          <SheetHeader className="p-4 border-b border-slate-800">
            <SheetTitle className="text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Felder & Einstellungen
            </SheetTitle>
          </SheetHeader>

          {/* Publish Box */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Status</h3>
              <Select
                value={status}
                onValueChange={(v: EntryStatus) => setStatus(v)}
              >
                <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-yellow-400" />
                      Entwurf
                    </span>
                  </SelectItem>
                  <SelectItem value="published">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-400" />
                      Veröffentlicht
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Slug */}
            {contentType.has_slug && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">URL</Label>
                <div className="flex items-center text-xs">
                  <span className="text-slate-500">/{contentType.slug}/</span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-7 text-xs flex-1 ml-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Featured Image */}
          {contentType.has_featured_image && (
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400" />
                Beitragsbild
              </h3>
              {featuredImageId ? (
                <div className="relative group">
                  <img
                    src={featuredImageId}
                    alt="Beitragsbild"
                    className="w-full h-32 object-cover rounded border border-slate-700"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setShowImagePicker(true)}
                      className="h-7 text-xs"
                    >
                      Ändern
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setFeaturedImageId('')}
                      className="h-7 text-xs"
                    >
                      Entfernen
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowImagePicker(true)}
                  className="w-full h-32 border border-dashed border-slate-700 rounded flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
                >
                  <ImageIcon className="h-6 w-6" />
                  <span className="text-xs">Bild wählen</span>
                </button>
              )}
              <ImagePicker
                siteId={siteId}
                open={showImagePicker}
                onOpenChange={setShowImagePicker}
                onSelect={(url) => setFeaturedImageId(url)}
                currentUrl={featuredImageId}
              />
            </div>
          )}

          {/* Excerpt */}
          {contentType.has_excerpt && (
            <div className="p-4 border-b border-slate-800">
              <Label className="text-sm text-white mb-2 block">Auszug</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Kurze Beschreibung..."
                className="bg-slate-800 border-slate-700 text-white text-sm"
                rows={3}
              />
            </div>
          )}

          {/* Custom Fields (ACF) */}
          {fields.length > 0 && (
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-400" />
                Felder ({fields.length})
              </h3>
              <div className="space-y-4">
                {fields.map((field) => (
                  <div key={field.id}>
                    <FieldRenderer
                      field={field}
                      value={data[field.name]}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      siteId={siteId}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Taxonomies */}
          {taxonomies.map((taxonomy) => (
            <div key={taxonomy.id} className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Tags className="h-4 w-4 text-slate-400" />
                {taxonomy.label_plural}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(taxonomyTerms[taxonomy.id] || []).map((term) => (
                  <button
                    key={term.id}
                    onClick={() => handleTermToggle(term.id)}
                    className={`px-2.5 py-1 text-xs rounded transition-colors ${
                      selectedTermIds.includes(term.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {term.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </SheetContent>
      </Sheet>
    </div>
  )
}
