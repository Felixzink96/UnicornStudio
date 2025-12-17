'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, Loader2, Wand2, X, Plus } from 'lucide-react'

interface VariableField {
  id: string
  name: string
  label: string
  type: 'text' | 'link' | 'image' | 'color' | 'number'
  defaultValue: string
  selector: string  // CSS selector to find element
  attribute: string // 'textContent', 'href', 'src', 'style.color', etc.
}

interface SaveComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siteId: string
  html: string
  onSaved?: () => void
}

const CATEGORIES = [
  { value: 'button', label: 'Button' },
  { value: 'card', label: 'Card' },
  { value: 'hero', label: 'Hero' },
  { value: 'cta', label: 'CTA' },
  { value: 'testimonial', label: 'Testimonial' },
  { value: 'feature', label: 'Feature' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'form', label: 'Formular' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'footer', label: 'Footer' },
  { value: 'other', label: 'Sonstiges' },
]

// Map category to allowed type values in DB
const categoryToType = (category: string): 'element' | 'block' | 'section' | 'layout' => {
  switch (category) {
    case 'button':
    case 'cta':
      return 'element'
    case 'card':
    case 'testimonial':
    case 'feature':
    case 'form':
      return 'block'
    case 'hero':
    case 'pricing':
    case 'navigation':
    case 'footer':
      return 'section'
    default:
      return 'block'
  }
}

export function SaveComponentDialog({
  open,
  onOpenChange,
  siteId,
  html,
  onSaved,
}: SaveComponentDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('')
  const [useVariables, setUseVariables] = useState(false)
  const [variables, setVariables] = useState<VariableField[]>([])
  const [processedHtml, setProcessedHtml] = useState(html)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Reset when dialog opens
  useEffect(() => {
    if (open && html) {
      setProcessedHtml(html)
      setVariables([])
      setUseVariables(false)
      setError(null)

      // Auto-detect name from HTML
      const autoName = detectNameFromHtml(html)
      setName(autoName)

      // Auto-detect category from HTML
      const autoCategory = detectCategoryFromHtml(html)
      setCategory(autoCategory)

      // Auto-detect description
      setDescription('')

      // Auto-detect potential variables
      detectVariables(html)
    }
  }, [open, html])

  // Detect name from HTML element (id, class, or tag)
  const detectNameFromHtml = (htmlContent: string): string => {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
    const root = doc.body.firstElementChild

    if (!root) return ''

    // Try ID first
    if (root.id) {
      // Convert kebab-case or snake_case to Title Case
      return formatName(root.id)
    }

    // Try meaningful class names
    const classes = Array.from(root.classList)
    const meaningfulClass = classes.find(c =>
      !c.startsWith('w-') && !c.startsWith('h-') && !c.startsWith('p-') &&
      !c.startsWith('m-') && !c.startsWith('flex') && !c.startsWith('grid') &&
      !c.startsWith('bg-') && !c.startsWith('text-') && !c.startsWith('border') &&
      !c.startsWith('rounded') && !c.startsWith('shadow') && !c.startsWith('overflow') &&
      c.length > 2
    )
    if (meaningfulClass) {
      return formatName(meaningfulClass)
    }

    // Try first heading text
    const heading = root.querySelector('h1, h2, h3, h4')
    if (heading?.textContent) {
      const text = heading.textContent.trim()
      if (text.length < 40) return text
    }

    // Fallback to tag name
    return formatName(root.tagName.toLowerCase())
  }

  // Format name to Title Case
  const formatName = (str: string): string => {
    return str
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Detect category from HTML content
  const detectCategoryFromHtml = (htmlContent: string): string => {
    const lower = htmlContent.toLowerCase()
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
    const root = doc.body.firstElementChild

    // Check tag name
    const tagName = root?.tagName.toLowerCase() || ''

    // Check for specific patterns
    if (tagName === 'button' || lower.includes('btn')) return 'button'
    if (tagName === 'nav' || lower.includes('navigation') || lower.includes('navbar')) return 'navigation'
    if (tagName === 'footer') return 'footer'
    if (tagName === 'header' || lower.includes('hero')) return 'hero'
    if (lower.includes('testimonial') || lower.includes('review') || lower.includes('quote')) return 'testimonial'
    if (lower.includes('pricing') || lower.includes('price') || lower.includes('plan')) return 'pricing'
    if (lower.includes('feature') || lower.includes('benefit')) return 'feature'
    if (lower.includes('cta') || lower.includes('call-to-action')) return 'cta'
    if (lower.includes('card')) return 'card'
    if (doc.body.querySelector('form')) return 'form'

    // Check for link/button as CTA
    if (root?.tagName === 'A') return 'button'

    return 'other'
  }

  // Generate unique selector for element within component
  const generateSelector = (el: Element, root: Element): string => {
    if (el === root) return ':scope'

    const path: string[] = []
    let current: Element | null = el

    while (current && current !== root && current.parentElement) {
      let selector = current.tagName.toLowerCase()

      // Add class if meaningful
      const meaningfulClass = Array.from(current.classList).find(c =>
        !c.startsWith('w-') && !c.startsWith('h-') && !c.startsWith('p-') &&
        !c.startsWith('m-') && !c.startsWith('flex') && !c.startsWith('grid') &&
        !c.startsWith('bg-') && !c.startsWith('text-') && c.length > 2
      )
      if (meaningfulClass) {
        selector += `.${meaningfulClass}`
      } else {
        // Add nth-of-type for uniqueness
        const siblings = Array.from(current.parentElement.children).filter(
          c => c.tagName === current!.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-of-type(${index})`
        }
      }

      path.unshift(selector)
      current = current.parentElement
    }

    return path.join(' > ')
  }

  // Get direct text content (not from children)
  const getDirectTextContent = (el: Element): string => {
    let text = ''
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ''
      }
    })
    return text.trim()
  }

  // Check if element has meaningful text content
  const hasTextContent = (el: Element): boolean => {
    const text = el.textContent?.trim() || ''
    return text.length > 0 && text.length < 500
  }

  // Detect ALL editable content - in DOM order, grouped by parent
  const detectVariables = (htmlContent: string) => {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
    const root = doc.body.firstElementChild
    if (!root) return

    const detectedVars: VariableField[] = []
    const processedElements = new Set<Element>()
    const processedTexts = new Set<string>()
    let varIndex = 0

    // Get element type label
    const getLabel = (el: Element): string => {
      const tag = el.tagName.toLowerCase()
      switch (tag) {
        case 'h1': return 'H1 Überschrift'
        case 'h2': return 'H2 Überschrift'
        case 'h3': return 'H3 Überschrift'
        case 'h4': return 'H4 Überschrift'
        case 'h5': return 'H5 Überschrift'
        case 'h6': return 'H6 Überschrift'
        case 'p': return 'Absatz'
        case 'span': return 'Text'
        case 'a': return 'Link'
        case 'button': return 'Button'
        case 'img': return 'Bild'
        case 'input': return 'Eingabefeld'
        case 'textarea': return 'Textfeld'
        case 'label': return 'Label'
        case 'li': return 'Listenpunkt'
        case 'td': case 'th': return 'Tabellenzelle'
        case 'div': return 'Block'
        case 'section': return 'Section'
        default: return tag.toUpperCase()
      }
    }

    // Add variable with duplicate prevention
    const addVar = (
      el: Element,
      type: 'text' | 'link' | 'image',
      attribute: string,
      value: string,
      customLabel?: string
    ) => {
      if (!value || value.length === 0) return
      if (processedElements.has(el) && attribute !== 'href' && attribute !== 'src' && attribute !== 'alt') return

      // For text content, check if same text already added
      if ((attribute === 'textContent' || attribute === 'innerHTML') && processedTexts.has(value)) {
        return
      }

      processedElements.add(el)
      if (attribute === 'textContent' || attribute === 'innerHTML') {
        processedTexts.add(value)
      }

      const label = customLabel || getLabel(el)
      const truncated = value.length > 35 ? value.substring(0, 35) + '...' : value

      detectedVars.push({
        id: `var_${varIndex++}`,
        name: `${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${varIndex}`,
        label: `${label} - "${truncated}"`,
        type,
        defaultValue: value,
        selector: generateSelector(el, root),
        attribute,
      })
    }

    // Walk DOM in order using TreeWalker
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null
    )

    // First: Add section/root ID if exists
    if (root.id) {
      detectedVars.push({
        id: `var_${varIndex++}`,
        name: 'section_id',
        label: 'Section ID',
        type: 'text',
        defaultValue: root.id,
        selector: ':scope',
        attribute: 'id',
      })
    }

    // Walk through all elements in DOM order
    let node: Element | null = walker.currentNode as Element
    while (node) {
      const tag = node.tagName?.toLowerCase()

      // Skip SVG internals, scripts, styles
      if (node.closest('svg') || tag === 'svg' || tag === 'script' || tag === 'style' || tag === 'noscript') {
        node = walker.nextNode() as Element | null
        continue
      }

      // HEADINGS
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          addVar(node, 'text', 'innerHTML', text)
        }
      }

      // PARAGRAPHS
      else if (tag === 'p') {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          addVar(node, 'text', 'innerHTML', text)
        }
      }

      // SPANS (leaf only - no child spans)
      else if (tag === 'span') {
        const text = node.textContent?.trim()
        const hasChildSpans = node.querySelector('span')
        if (text && text.length > 0 && !hasChildSpans) {
          addVar(node, 'text', 'textContent', text)
        }
      }

      // LINKS - capture both text and href
      else if (tag === 'a') {
        const link = node as HTMLAnchorElement
        const text = link.textContent?.trim()
        const href = link.getAttribute('href')

        if (text && text.length > 0) {
          addVar(node, 'text', 'textContent', text, 'Link Text')
        }
        if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
          addVar(node, 'link', 'href', href, 'Link URL')
        }
      }

      // BUTTONS
      else if (tag === 'button') {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          addVar(node, 'text', 'textContent', text)
        }
      }

      // IMAGES - capture src and alt
      else if (tag === 'img') {
        const img = node as HTMLImageElement
        const src = img.getAttribute('src')
        const alt = img.getAttribute('alt')

        if (src) {
          const filename = src.split('/').pop()?.split('?')[0] || 'Bild'
          addVar(node, 'image', 'src', src, `Bild (${filename.substring(0, 15)})`)
        }
        if (src) { // Always add alt field if image exists
          addVar(node, 'text', 'alt', alt || '', 'Bild Alt-Text')
        }
      }

      // INPUTS & TEXTAREAS
      else if (tag === 'input' || tag === 'textarea') {
        const input = node as HTMLInputElement
        const placeholder = input.getAttribute('placeholder')
        const inputName = input.getAttribute('name') || input.getAttribute('id') || ''

        if (placeholder) {
          addVar(node, 'text', 'placeholder', placeholder, inputName ? `Placeholder (${inputName})` : 'Placeholder')
        }
      }

      // LABELS
      else if (tag === 'label') {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          addVar(node, 'text', 'textContent', text)
        }
      }

      // LIST ITEMS (leaf only)
      else if (tag === 'li') {
        const hasComplexChildren = node.querySelector('div, p, ul, ol, table')
        if (!hasComplexChildren) {
          const text = node.textContent?.trim()
          if (text && text.length > 0) {
            addVar(node, 'text', 'innerHTML', text)
          }
        }
      }

      // TABLE CELLS
      else if (tag === 'td' || tag === 'th') {
        const text = node.textContent?.trim()
        if (text && text.length > 0) {
          addVar(node, 'text', 'textContent', text)
        }
      }

      // DIVS (leaf only - no block children, no inline children already captured)
      else if (tag === 'div') {
        const hasBlockChildren = node.querySelector('div, section, article, p, h1, h2, h3, h4, h5, h6, ul, ol, table')
        const hasInlineChildren = node.querySelector('span, a, button')

        if (!hasBlockChildren && !hasInlineChildren) {
          const text = node.textContent?.trim()
          if (text && text.length > 0 && text.length < 200) {
            addVar(node, 'text', 'innerHTML', text, 'Text Block')
          }
        }
      }

      // BACKGROUND IMAGES
      const style = node.getAttribute('style') || ''
      if (style.includes('url(')) {
        const bgMatch = style.match(/url\(['"]?([^'")\s]+)['"]?\)/)
        if (bgMatch && bgMatch[1] && !processedElements.has(node)) {
          addVar(node, 'image', 'style.backgroundImage', bgMatch[1], 'Hintergrundbild')
        }
      }

      // ARIA LABELS
      const ariaLabel = node.getAttribute('aria-label')
      if (ariaLabel && ariaLabel.length > 0 && !processedElements.has(node)) {
        addVar(node, 'text', 'aria-label', ariaLabel, 'Aria Label')
      }

      node = walker.nextNode() as Element | null
    }

    setVariables(detectedVars)
  }

  // Process HTML to replace values with variable placeholders
  const processHtmlWithVariables = () => {
    if (!useVariables || variables.length === 0) {
      return html
    }

    // Parse HTML and replace values based on selectors
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const root = doc.body.firstElementChild
    if (!root) return html

    variables.forEach(v => {
      try {
        // Handle :scope selector
        const selector = v.selector === ':scope' ? '' : v.selector
        const el = selector ? root.querySelector(selector) : root

        if (el) {
          const placeholder = `{{${v.name}}}`

          switch (v.attribute) {
            case 'textContent':
              el.textContent = placeholder
              break
            case 'innerHTML':
              el.innerHTML = placeholder
              break
            case 'id':
              el.id = placeholder
              break
            case 'href':
              el.setAttribute('href', placeholder)
              break
            case 'src':
              el.setAttribute('src', placeholder)
              break
            case 'alt':
              el.setAttribute('alt', placeholder)
              break
            case 'placeholder':
              el.setAttribute('placeholder', placeholder)
              break
            case 'aria-label':
              el.setAttribute('aria-label', placeholder)
              break
            case 'style.backgroundImage':
              const style = el.getAttribute('style') || ''
              const newStyle = style.replace(
                /url\(['"]?[^'")\s]+['"]?\)/g,
                `url(${placeholder})`
              )
              el.setAttribute('style', newStyle)
              break
            default:
              // Generic attribute (data-*, etc.)
              if (v.attribute.startsWith('data-') || v.attribute.startsWith('aria-')) {
                el.setAttribute(v.attribute, placeholder)
              }
          }
        }
      } catch (e) {
        console.warn('Failed to process variable:', v.name, e)
      }
    })

    return root.outerHTML
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Bitte gib einen Namen ein')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const finalHtml = useVariables ? processHtmlWithVariables() : html

      // Build props from variables (with selector and attribute for replacement)
      const props = useVariables && variables.length > 0
        ? variables.map(v => ({
            name: v.name,
            label: v.label,
            type: v.type,
            default: v.defaultValue,
            selector: v.selector,
            attribute: v.attribute,
          }))
        : []

      // Map category to valid type
      const dbType = categoryToType(category || 'other')

      const { error: dbError } = await supabase.from('cms_components').insert({
        site_id: siteId,
        name: name.trim(),
        description: description.trim() || null,
        type: dbType,
        category: category || null,
        html: finalHtml,
        props: props,
        usage_count: 0,
      })

      if (dbError) {
        console.error('Supabase error:', dbError)
        throw new Error(dbError.message || 'Datenbankfehler')
      }

      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      console.error('Error saving component:', err)
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id))
  }

  const updateVariable = (id: string, field: keyof VariableField, value: string) => {
    setVariables(variables.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  const toggleVariable = (id: string) => {
    // Toggle by removing/re-adding
    const exists = variables.find(v => v.id === id)
    if (exists) {
      removeVariable(id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-purple-500" />
            Als Komponente speichern
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview with Tailwind */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <p className="text-[10px] text-zinc-400 px-3 pt-2 pb-1 bg-zinc-50 border-b">Vorschau:</p>
            <iframe
              srcDoc={`<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 8px; font-family: system-ui, sans-serif; }
    :root {
      --color-brand-primary: #6366f1;
      --color-brand-secondary: #8b5cf6;
      --color-brand-accent: #f59e0b;
      --color-neutral-background: #ffffff;
      --color-neutral-foreground: #1f2937;
      --color-neutral-muted: #f3f4f6;
      --color-neutral-border: #e5e7eb;
      --font-heading: system-ui, sans-serif;
      --font-body: system-ui, sans-serif;
    }
  </style>
</head>
<body>${html}</body>
</html>`}
              className="w-full h-32 border-0"
              sandbox="allow-scripts"
            /></div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="z.B. Primary Button"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              placeholder="Kurze Beschreibung..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wählen..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Variables Toggle */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-purple-600" />
              <div>
                <Label className="text-purple-900">Variablen verwenden</Label>
                <p className="text-xs text-purple-600">
                  Texte/Links beim Einfügen anpassen
                </p>
              </div>
            </div>
            <Switch
              checked={useVariables}
              onCheckedChange={setUseVariables}
            />
          </div>

          {/* Variables Editor */}
          {useVariables && (
            <div className="space-y-3 p-3 bg-zinc-50 rounded-lg border max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between sticky top-0 bg-zinc-50 pb-2">
                <Label className="text-sm font-medium">
                  Anpassbare Felder ({variables.length})
                </Label>
              </div>

              {variables.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-4">
                  Keine editierbaren Inhalte gefunden.
                </p>
              ) : (
                <div className="space-y-2">
                  {variables.map((v) => (
                    <div key={v.id} className="p-2 bg-white rounded border space-y-2">
                      {/* Label & Type */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-700 truncate flex-1">
                          {v.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[9px] ${
                              v.type === 'image' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              v.type === 'link' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-zinc-50'
                            }`}
                          >
                            {v.type === 'image' ? 'Bild' : v.type === 'link' ? 'URL' : 'Text'}
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-zinc-300 hover:text-red-500"
                            onClick={() => removeVariable(v.id)}
                            title="Entfernen"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Value Input */}
                      {v.type === 'text' ? (
                        <Input
                          value={v.defaultValue}
                          onChange={(e) => updateVariable(v.id, 'defaultValue', e.target.value)}
                          placeholder="Standardwert..."
                          className="h-8 text-xs"
                        />
                      ) : v.type === 'link' ? (
                        <Input
                          value={v.defaultValue}
                          onChange={(e) => updateVariable(v.id, 'defaultValue', e.target.value)}
                          placeholder="https://..."
                          className="h-8 text-xs font-mono"
                        />
                      ) : v.type === 'image' ? (
                        <Input
                          value={v.defaultValue}
                          onChange={(e) => updateVariable(v.id, 'defaultValue', e.target.value)}
                          placeholder="Bild-URL..."
                          className="h-8 text-xs font-mono"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-zinc-400 pt-2 border-t">
                Diese Werte können beim Einfügen der Komponente angepasst werden.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
