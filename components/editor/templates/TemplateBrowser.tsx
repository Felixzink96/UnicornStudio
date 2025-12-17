'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  LayoutTemplate,
  Sparkles,
  Grid3X3,
  CreditCard,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Users,
  Image,
  Mail,
  BarChart,
  PanelBottom,
  PanelTop,
  Loader2,
  Plus,
  X,
} from 'lucide-react'
import { TemplateCard } from './TemplateCard'

interface Template {
  id: string
  name: string
  description: string | null
  html_content: string
  css: string | null
  js: string | null
  category: string | null
  tags: string[] | null
  thumbnail_url: string | null
}

interface TemplateCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
}

interface TemplateBrowserProps {
  siteId: string
  onInsert: (html: string, css?: string, js?: string) => void
  onClose?: () => void
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hero: Sparkles,
  features: Grid3X3,
  pricing: CreditCard,
  testimonials: MessageSquare,
  faq: HelpCircle,
  cta: ArrowRight,
  team: Users,
  gallery: Image,
  contact: Mail,
  stats: BarChart,
  footer: PanelBottom,
  header: PanelTop,
}

export function TemplateBrowser({ siteId, onInsert, onClose }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<TemplateCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [siteId])

  async function loadData() {
    setLoading(true)
    try {
      // Load categories (table may not exist in types yet)
      const { data: cats } = await (supabase as ReturnType<typeof createClient>)
        .from('template_categories' as 'templates')
        .select('*')
        .order('sort_order')

      // Load templates (global and site-specific)
      const { data: tmpl } = await supabase
        .from('templates')
        .select('id, name, description, html, css, js, category, tags, thumbnail_url')
        .or(`site_id.is.null,site_id.eq.${siteId}`)
        .order('name')

      setCategories((cats || []) as unknown as TemplateCategory[])
      setTemplates((tmpl || []) as unknown as Template[])
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(t => {
    // Category filter
    if (activeCategory && t.category !== activeCategory) {
      return false
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    return true
  })

  const handleInsert = (template: Template) => {
    onInsert(template.html_content, template.css || undefined, template.js || undefined)
    onClose?.()
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <LayoutTemplate className="h-5 w-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Template Browser</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="p-4 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Templates suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-4 overflow-x-auto border-b border-slate-800">
        <Button
          variant={activeCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveCategory(null)}
          className="shrink-0"
        >
          Alle
        </Button>
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.slug] || LayoutTemplate
          return (
            <Button
              key={cat.id}
              variant={activeCategory === cat.slug ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveCategory(cat.slug)}
              className="shrink-0"
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {cat.name}
            </Button>
          )
        })}
      </div>

      {/* Templates Grid */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <LayoutTemplate className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchQuery || activeCategory
                ? 'Keine Templates gefunden'
                : 'Noch keine Templates vorhanden'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onInsert={() => handleInsert(template)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
