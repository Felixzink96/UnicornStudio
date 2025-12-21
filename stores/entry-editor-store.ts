import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/client'
import type { Json } from '@/types/database'
import type {
  ViewMode,
  Breakpoint,
  SelectedElement,
  ElementUpdate,
  ChatMessage,
  GlobalComponentData,
} from '@/types/editor'
import type {
  Entry,
  EntryStatus,
  ContentType,
  Field,
  Template,
  Taxonomy,
  Term,
  DesignVariables,
} from '@/types/cms'

const MAX_HISTORY = 50

// ============================================
// ENTRY EDITOR STATE
// ============================================

export interface EntryEditorState {
  // IDs
  siteId: string | null
  entryId: string | null

  // Entry Info
  entry: Entry | null
  contentType: ContentType | null
  fields: Field[]
  template: Template | null

  // Entry Data
  title: string
  slug: string
  content: string
  excerpt: string
  status: EntryStatus
  publishedAt: string
  featuredImageId: string
  featuredImageUrl: string
  data: Record<string, unknown>

  // Taxonomies
  taxonomies: Taxonomy[]
  taxonomyTerms: Record<string, Term[]>
  selectedTermIds: string[]

  // View
  viewMode: ViewMode
  breakpoint: Breakpoint
  zoom: number

  // Selection
  selectedElement: SelectedElement | null

  // Chat
  messages: ChatMessage[]
  isGenerating: boolean

  // History
  contentHistory: string[]
  historyIndex: number

  // State
  hasUnsavedChanges: boolean
  isSaving: boolean
  lastSavedAt: Date | null

  // Context
  designVariables: DesignVariables | null

  // Panels
  showFieldsPanel: boolean
  showSettingsPanel: boolean

  // Global Components
  globalHeader: GlobalComponentData | null
  globalFooter: GlobalComponentData | null

  // Build Animation State
  activeBuildSection: { id: string; operation: string } | null
}

// ============================================
// ENTRY EDITOR ACTIONS
// ============================================

export interface EntryEditorActions {
  // Init
  initialize: (siteId: string, entryId?: string, contentTypeSlug?: string) => Promise<void>
  reset: () => void

  // Entry Fields
  setTitle: (title: string) => void
  setSlug: (slug: string) => void
  setContent: (content: string) => void
  setExcerpt: (excerpt: string) => void
  setStatus: (status: EntryStatus) => void
  setPublishedAt: (date: string) => void
  setFeaturedImageId: (id: string) => void
  setFeaturedImageUrl: (url: string) => void
  setFieldValue: (fieldName: string, value: unknown) => void
  setData: (data: Record<string, unknown>) => void

  // Taxonomies
  toggleTerm: (termId: string) => void
  setSelectedTermIds: (ids: string[]) => void

  // View
  setViewMode: (mode: ViewMode) => void
  setBreakpoint: (breakpoint: Breakpoint) => void
  setZoom: (zoom: number) => void

  // Selection
  selectElement: (element: SelectedElement | null) => void
  updateSelectedElement: (updates: ElementUpdate) => void
  clearSelection: () => void

  // Chat
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  setGenerating: (isGenerating: boolean) => void
  clearMessages: () => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Persistence
  save: (targetStatus?: EntryStatus) => Promise<void>
  publish: () => Promise<void>

  // Panels
  toggleFieldsPanel: () => void
  toggleSettingsPanel: () => void

  // Preview
  getPreviewHtml: () => string

  // Build Animation
  setActiveBuildSection: (section: { id: string; operation: string } | null) => void
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: EntryEditorState = {
  siteId: null,
  entryId: null,
  entry: null,
  contentType: null,
  fields: [],
  template: null,
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  status: 'draft',
  publishedAt: '',
  featuredImageId: '',
  featuredImageUrl: '',
  data: {},
  taxonomies: [],
  taxonomyTerms: {},
  selectedTermIds: [],
  viewMode: 'design',
  breakpoint: 'desktop',
  zoom: 1,
  selectedElement: null,
  messages: [],
  isGenerating: false,
  contentHistory: [],
  historyIndex: -1,
  hasUnsavedChanges: false,
  isSaving: false,
  lastSavedAt: null,
  designVariables: null,
  showFieldsPanel: false,
  showSettingsPanel: false,
  globalHeader: null,
  globalFooter: null,
  activeBuildSection: null,
}

// ============================================
// HELPER: Generate slug from title
// ============================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ============================================
// STORE
// ============================================

export const useEntryEditorStore = create<EntryEditorState & EntryEditorActions>()(
  immer((set, get) => ({
    ...initialState,

    // ============================================
    // INITIALIZATION
    // ============================================

    initialize: async (siteId: string, entryId?: string, contentTypeSlug?: string) => {
      const supabase = createClient()

      try {
        let entry: Entry | null = null
        let contentType: ContentType | null = null
        let fields: Field[] = []

        // Load entry if editing existing
        if (entryId) {
          const { data: entryData } = await supabase
            .from('entries')
            .select('*, featured_image:assets!featured_image_id(id, file_url)')
            .eq('id', entryId)
            .single()

          if (entryData) {
            entry = entryData as Entry & { featured_image?: { id: string; file_url: string } | null }

            // Get content type from entry
            const { data: ctData } = await supabase
              .from('content_types')
              .select('*')
              .eq('id', entry.content_type_id)
              .single()

            if (ctData) contentType = ctData as ContentType
          }
        }
        // Load content type for new entry
        else if (contentTypeSlug) {
          const { data: ctData } = await supabase
            .from('content_types')
            .select('*')
            .eq('site_id', siteId)
            .eq('slug', contentTypeSlug)
            .single()

          if (ctData) contentType = ctData as ContentType
        }

        // Load fields for content type
        if (contentType) {
          const { data: fieldsData } = await supabase
            .from('fields')
            .select('*')
            .eq('content_type_id', contentType.id)
            .order('position', { ascending: true })

          fields = (fieldsData || []) as Field[]
        }

        // Load template for this content type
        let template: Template | null = null
        if (contentType) {
          // Try to find template with matching content_type_id condition
          const { data: templates, error: templateError } = await supabase
            .from('templates')
            .select('*')
            .eq('site_id', siteId)
            .eq('type', 'single')

          if (templates && templates.length > 0) {
            // Find template that matches this content type
            template = templates.find((t) => {
              const conditions = t.conditions as Array<{ field?: string; value?: string }> | null
              if (!conditions || !Array.isArray(conditions)) return false
              return conditions.some(
                (c) => c.field === 'content_type_id' && c.value === contentType.id
              )
            }) as Template | null

            // Fallback to default template if no specific match
            if (!template) {
              template = templates.find((t) => t.is_default) as Template | null
            }
          }

          console.log('[Entry] Template loaded:', template?.name, 'HTML length:', template?.html?.length || 0)
        }

        // Load taxonomies
        let taxonomies: Taxonomy[] = []
        let taxonomyTerms: Record<string, Term[]> = {}
        if (contentType) {
          const { data: taxData } = await supabase
            .from('taxonomies')
            .select('*')
            .eq('site_id', siteId)
            .contains('content_type_ids', [contentType.id])

          taxonomies = (taxData || []) as Taxonomy[]

          // Load terms for each taxonomy
          for (const tax of taxonomies) {
            const { data: termsData } = await supabase
              .from('terms')
              .select('*')
              .eq('taxonomy_id', tax.id)
              .order('name')

            taxonomyTerms[tax.id] = (termsData || []) as Term[]
          }
        }

        // Load entry terms if editing
        let selectedTermIds: string[] = []
        if (entry) {
          const { data: entryTermsData } = await supabase
            .from('entry_terms')
            .select('term_id')
            .eq('entry_id', entry.id)

          selectedTermIds = (entryTermsData || []).map((et) => et.term_id)
        }

        // Load design variables
        const { data: designVars } = await supabase
          .from('design_variables')
          .select('*')
          .eq('site_id', siteId)
          .single()

        // Load global components
        const { data: site } = await supabase
          .from('sites')
          .select('global_header_id, global_footer_id')
          .eq('id', siteId)
          .single()

        let globalHeader: GlobalComponentData | null = null
        let globalFooter: GlobalComponentData | null = null

        if (site?.global_header_id) {
          const { data: header } = await supabase
            .from('components')
            .select('id, name, html, css, js')
            .eq('id', site.global_header_id)
            .single()
          if (header) globalHeader = header as GlobalComponentData
        }

        if (site?.global_footer_id) {
          const { data: footer } = await supabase
            .from('components')
            .select('id, name, html, css, js')
            .eq('id', site.global_footer_id)
            .single()
          if (footer) globalFooter = footer as GlobalComponentData
        }

        set((state) => {
          state.siteId = siteId
          state.entryId = entryId || null
          state.entry = entry
          state.contentType = contentType
          state.fields = fields
          state.template = template
          state.title = entry?.title || ''
          state.slug = entry?.slug || ''
          state.content = entry?.content || ''
          state.excerpt = entry?.excerpt || ''
          state.status = (entry?.status as EntryStatus) || 'draft'
          state.publishedAt = entry?.published_at || ''
          state.featuredImageId = entry?.featured_image_id || ''
          const entryData = (entry?.data as Record<string, unknown>) || {}
          // Get featured image URL from joined asset data
          const featuredImage = (entry as Entry & { featured_image?: { id: string; file_url: string } | null })?.featured_image
          state.featuredImageUrl = featuredImage?.file_url || ''
          state.data = entryData
          state.taxonomies = taxonomies
          state.taxonomyTerms = taxonomyTerms
          state.selectedTermIds = selectedTermIds
          state.designVariables = designVars as DesignVariables | null
          state.globalHeader = globalHeader
          state.globalFooter = globalFooter
          state.contentHistory = [entry?.content || '']
          state.historyIndex = 0
        })
      } catch (error) {
        console.error('Failed to initialize entry editor:', error)
      }
    },

    reset: () => {
      set(initialState)
    },

    // ============================================
    // ENTRY FIELDS
    // ============================================

    setTitle: (title: string) => {
      set((state) => {
        state.title = title
        // Auto-generate slug for new entries
        if (!state.entry && title) {
          state.slug = generateSlug(title)
        }
        state.hasUnsavedChanges = true
      })
    },

    setSlug: (slug: string) => {
      set((state) => {
        state.slug = slug
        state.hasUnsavedChanges = true
      })
    },

    setContent: (content: string) => {
      set((state) => {
        state.content = content
        state.hasUnsavedChanges = true

        // Add to history
        const newHistory = state.contentHistory.slice(0, state.historyIndex + 1)
        newHistory.push(content)
        if (newHistory.length > MAX_HISTORY) newHistory.shift()
        state.contentHistory = newHistory
        state.historyIndex = newHistory.length - 1
      })
    },

    setExcerpt: (excerpt: string) => {
      set((state) => {
        state.excerpt = excerpt
        state.hasUnsavedChanges = true
      })
    },

    setStatus: (status: EntryStatus) => {
      set((state) => {
        state.status = status
        state.hasUnsavedChanges = true
      })
    },

    setPublishedAt: (date: string) => {
      set((state) => {
        state.publishedAt = date
        state.hasUnsavedChanges = true
      })
    },

    setFeaturedImageId: (id: string) => {
      set((state) => {
        state.featuredImageId = id
        state.hasUnsavedChanges = true
      })
    },

    setFeaturedImageUrl: (url: string) => {
      set((state) => {
        state.featuredImageUrl = url
        state.hasUnsavedChanges = true
      })
    },

    setFieldValue: (fieldName: string, value: unknown) => {
      set((state) => {
        state.data[fieldName] = value
        state.hasUnsavedChanges = true
      })
    },

    setData: (data: Record<string, unknown>) => {
      set((state) => {
        state.data = data
        state.hasUnsavedChanges = true
      })
    },

    // ============================================
    // TAXONOMIES
    // ============================================

    toggleTerm: (termId: string) => {
      set((state) => {
        if (state.selectedTermIds.includes(termId)) {
          state.selectedTermIds = state.selectedTermIds.filter((id) => id !== termId)
        } else {
          state.selectedTermIds.push(termId)
        }
        state.hasUnsavedChanges = true
      })
    },

    setSelectedTermIds: (ids: string[]) => {
      set((state) => {
        state.selectedTermIds = ids
        state.hasUnsavedChanges = true
      })
    },

    // ============================================
    // VIEW
    // ============================================

    setViewMode: (mode: ViewMode) => {
      set((state) => {
        state.viewMode = mode
      })
    },

    setBreakpoint: (breakpoint: Breakpoint) => {
      set((state) => {
        state.breakpoint = breakpoint
      })
    },

    setZoom: (zoom: number) => {
      set((state) => {
        state.zoom = zoom
      })
    },

    // ============================================
    // SELECTION
    // ============================================

    selectElement: (element: SelectedElement | null) => {
      set((state) => {
        state.selectedElement = element
      })
    },

    updateSelectedElement: (updates: ElementUpdate) => {
      // For entries, we might update content HTML
      const { selectedElement, content } = get()
      if (!selectedElement) return

      // Simple implementation - could be expanded
      if (updates.textContent !== undefined) {
        // Update text content in the content HTML
        const parser = new DOMParser()
        const doc = parser.parseFromString(content, 'text/html')
        const element = doc.querySelector(selectedElement.selector)
        if (element) {
          element.textContent = updates.textContent
          get().setContent(doc.body.innerHTML)
        }
      }
    },

    clearSelection: () => {
      set((state) => {
        state.selectedElement = null
      })
    },

    // ============================================
    // CHAT
    // ============================================

    addMessage: (message) => {
      set((state) => {
        state.messages.push({
          ...message,
          id: nanoid(),
          timestamp: new Date(),
        })
      })
    },

    updateMessage: (id, updates) => {
      set((state) => {
        const index = state.messages.findIndex((m) => m.id === id)
        if (index !== -1) {
          state.messages[index] = { ...state.messages[index], ...updates }
        }
      })
    },

    setGenerating: (isGenerating) => {
      set((state) => {
        state.isGenerating = isGenerating
      })
    },

    clearMessages: () => {
      set((state) => {
        state.messages = []
      })
    },

    // ============================================
    // HISTORY
    // ============================================

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--
          state.content = state.contentHistory[state.historyIndex]
          state.hasUnsavedChanges = true
        }
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.contentHistory.length - 1) {
          state.historyIndex++
          state.content = state.contentHistory[state.historyIndex]
          state.hasUnsavedChanges = true
        }
      })
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const { historyIndex, contentHistory } = get()
      return historyIndex < contentHistory.length - 1
    },

    // ============================================
    // PERSISTENCE
    // ============================================

    save: async (targetStatus?: EntryStatus) => {
      const state = get()
      const {
        siteId,
        entryId,
        contentType,
        title,
        slug,
        content,
        excerpt,
        status,
        publishedAt,
        featuredImageId,
        data,
        selectedTermIds,
      } = state

      if (!siteId || !contentType) return

      set((s) => {
        s.isSaving = true
      })

      try {
        const supabase = createClient()
        const finalStatus = targetStatus || status

        // DEBUG: Log what we're saving
        console.log('SAVE DEBUG:', {
          has_content: contentType.has_content,
          content_length: content?.length || 0,
          content_preview: content?.substring(0, 100),
          has_excerpt: contentType.has_excerpt,
          excerpt_length: excerpt?.length || 0,
        })

        const entryData = {
          site_id: siteId,
          content_type_id: contentType.id,
          title: contentType.has_title ? title : null,
          slug: contentType.has_slug ? slug : null,
          content: contentType.has_content ? content : null,
          excerpt: contentType.has_excerpt ? excerpt : null,
          status: finalStatus,
          published_at: finalStatus === 'published' && !publishedAt
            ? new Date().toISOString()
            : publishedAt || null,
          featured_image_id: featuredImageId || null,
          data: data as Json,
        }

        let savedEntryId: string | null = entryId || null

        if (entryId) {
          // Update existing
          const { error: updateError } = await supabase
            .from('entries')
            .update(entryData)
            .eq('id', entryId)

          if (updateError) {
            console.error('UPDATE ERROR:', updateError)
          } else {
            console.log('UPDATE SUCCESS for entry:', entryId)
          }
        } else {
          // Create new
          const { data: newEntry, error: insertError } = await supabase
            .from('entries')
            .insert(entryData)
            .select('id')
            .single()

          if (insertError) {
            console.error('INSERT ERROR:', insertError)
          } else {
            console.log('INSERT SUCCESS, new entry:', newEntry?.id)
          }

          savedEntryId = newEntry?.id || null
        }

        // Save taxonomy terms
        if (savedEntryId) {
          await supabase
            .from('entry_terms')
            .delete()
            .eq('entry_id', savedEntryId)

          if (selectedTermIds.length > 0) {
            await supabase.from('entry_terms').insert(
              selectedTermIds.map((termId) => ({
                entry_id: savedEntryId,
                term_id: termId,
              }))
            )
          }
        }

        set((s) => {
          s.entryId = savedEntryId || null
          s.status = finalStatus
          s.hasUnsavedChanges = false
          s.lastSavedAt = new Date()
        })
      } catch (error) {
        console.error('Failed to save entry:', error)
      } finally {
        set((s) => {
          s.isSaving = false
        })
      }
    },

    publish: async () => {
      await get().save('published')
    },

    // ============================================
    // PANELS
    // ============================================

    toggleFieldsPanel: () => {
      set((state) => {
        state.showFieldsPanel = !state.showFieldsPanel
      })
    },

    toggleSettingsPanel: () => {
      set((state) => {
        state.showSettingsPanel = !state.showSettingsPanel
      })
    },

    // ============================================
    // PREVIEW
    // ============================================

    getPreviewHtml: () => {
      const { template, title, slug, content, excerpt, featuredImageId, featuredImageUrl, data, globalHeader, globalFooter } = get()

      if (!template?.html) {
        // Fallback: just show content
        return `
          <div class="container mx-auto px-4 py-8">
            <h1 class="text-4xl font-bold mb-4">${title || 'Titel'}</h1>
            ${excerpt ? `<p class="text-lg text-gray-600 mb-8">${excerpt}</p>` : ''}
            <div class="prose prose-lg max-w-none">${content || '<p>Inhalt hier...</p>'}</div>
          </div>
        `
      }

      // Replace template variables with entry data
      let html = template.html

      // Determine featured image URL (prefer direct URL, fallback to ID-based)
      const featuredImgSrc = featuredImageUrl || (featuredImageId ? `/api/assets/${featuredImageId}` : '')

      // Replace entry variables
      html = html.replace(/\{\{\{?entry\.title\}?\}\}/g, title || '')
      html = html.replace(/\{\{\{?entry\.slug\}?\}\}/g, slug || '')
      html = html.replace(/\{\{\{entry\.content\}\}\}/g, content || '')
      html = html.replace(/\{\{entry\.content\}\}/g, content || '')
      html = html.replace(/\{\{\{?entry\.excerpt\}?\}\}/g, excerpt || '')
      html = html.replace(/\{\{\{?entry\.featured_image\}?\}\}/g, featuredImgSrc)
      html = html.replace(/\{\{\{?entry\.url\}?\}\}/g, `/${slug || 'entry'}`)

      // Handle {{#if entry.featured_image}} blocks
      if (featuredImgSrc) {
        // Image exists - keep content, remove handlebars syntax
        html = html.replace(/\{\{#if\s+entry\.featured_image\}\}/g, '')
        html = html.replace(/\{\{\/if\}\}/g, '')
      } else {
        // No image - remove entire block including content
        html = html.replace(/\{\{#if\s+entry\.featured_image\}\}[\s\S]*?\{\{\/if\}\}/g, '')
      }

      // Handle {{#if entry.excerpt}} blocks
      if (excerpt) {
        html = html.replace(/\{\{#if\s+entry\.excerpt\}\}/g, '')
      } else {
        html = html.replace(/\{\{#if\s+entry\.excerpt\}\}[\s\S]*?\{\{\/if\}\}/g, '')
      }

      // Handle {{#if entry.content}} blocks
      if (content) {
        html = html.replace(/\{\{#if\s+entry\.content\}\}/g, '')
      } else {
        html = html.replace(/\{\{#if\s+entry\.content\}\}[\s\S]*?\{\{\/if\}\}/g, '')
      }

      // Replace custom field variables
      Object.entries(data).forEach(([key, value]) => {
        html = html.replace(new RegExp(`\\{\\{\\{?entry\\.data\\.${key}\\}?\\}\\}`, 'g'), String(value || ''))
      })

      // Remove remaining template tags (including leftover {{/if}})
      html = html.replace(/\{\{[^}]+\}\}/g, '')

      return html
    },

    // ============================================
    // BUILD ANIMATION
    // ============================================

    setActiveBuildSection: (section) => {
      set((state) => {
        state.activeBuildSection = section
      })
    },
  }))
)
