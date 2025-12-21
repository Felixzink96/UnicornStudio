import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/client'
import type {
  ViewMode,
  Breakpoint,
  SelectedElement,
  ElementUpdate,
  ChatMessage,
  GlobalComponentData,
} from '@/types/editor'
import type { Template, TemplateType, ContentType, Field, DesignVariables } from '@/types/cms'
import { insertGlobalComponents } from '@/lib/ai/html-operations'
import {
  buildTemplateVariables,
  buildDummyEntry,
  buildDummyEntries,
} from '@/lib/ai/template-system-prompt'

const MAX_HISTORY = 50

// ============================================
// TEMPLATE EDITOR STATE
// ============================================

export interface TemplateEditorState {
  // IDs
  siteId: string | null
  templateId: string | null

  // Template Info
  template: Template | null
  templateType: TemplateType
  contentType: ContentType | null
  fields: Field[]

  // Content
  html: string
  customCss: string
  originalHtml: string
  name: string
  isDefault: boolean

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
  history: string[]
  historyIndex: number

  // State
  hasUnsavedChanges: boolean
  isSaving: boolean
  lastSavedAt: Date | null

  // Context
  designVariables: DesignVariables | null

  // Panels
  showElementPanel: boolean
  elementPanelTab: 'edit' | 'prompt' | 'code'
  showLayersPanel: boolean
  showVariablesPanel: boolean
  showSettingsPanel: boolean

  // Global Components
  globalHeader: GlobalComponentData | null
  globalFooter: GlobalComponentData | null

  // References (for @-mentions)
  availablePages: Array<{ id: string; name: string; slug: string }>

  // Build Animation State
  activeBuildSection: { id: string; operation: string } | null
}

// ============================================
// TEMPLATE EDITOR ACTIONS
// ============================================

export interface TemplateEditorActions {
  // Init
  initialize: (siteId: string, templateId: string) => Promise<void>
  reset: () => void

  // HTML
  setHtml: (html: string) => void
  updateHtml: (html: string, addToHistory?: boolean) => void
  applyGeneratedHtml: (html: string, css?: string) => Promise<void>
  setCustomCss: (css: string) => void

  // Template Settings
  setName: (name: string) => void
  setIsDefault: (isDefault: boolean) => void
  setTemplateType: (type: TemplateType) => void
  setContentType: (contentType: ContentType | null) => void

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
  deleteMessage: (id: string) => void
  setMessageApplied: (id: string, isApplied: boolean) => void
  setGenerating: (isGenerating: boolean) => void
  clearMessages: () => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Persistence
  save: () => Promise<void>

  // Panels
  toggleElementPanel: () => void
  setElementPanelTab: (tab: 'edit' | 'prompt' | 'code') => void
  toggleLayersPanel: () => void
  toggleVariablesPanel: () => void
  toggleSettingsPanel: () => void

  // Global Components
  loadGlobalComponents: () => Promise<void>
  getHtmlWithGlobalComponents: () => string

  // Preview
  getPreviewHtml: () => string
  getDummyData: () => Record<string, unknown>

  // Build Animation
  setActiveBuildSection: (section: { id: string; operation: string } | null) => void
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: TemplateEditorState = {
  siteId: null,
  templateId: null,
  template: null,
  templateType: 'single',
  contentType: null,
  fields: [],
  html: '',
  customCss: '',
  originalHtml: '',
  name: '',
  isDefault: false,
  viewMode: 'design',
  breakpoint: 'desktop',
  zoom: 1,
  selectedElement: null,
  messages: [],
  isGenerating: false,
  history: [],
  historyIndex: -1,
  hasUnsavedChanges: false,
  isSaving: false,
  lastSavedAt: null,
  designVariables: null,
  showElementPanel: false,
  elementPanelTab: 'edit',
  showLayersPanel: false,
  showVariablesPanel: false,
  showSettingsPanel: false,
  globalHeader: null,
  globalFooter: null,
  availablePages: [],
  activeBuildSection: null,
}

// ============================================
// STORE
// ============================================

export const useTemplateEditorStore = create<TemplateEditorState & TemplateEditorActions>()(
  immer((set, get) => ({
    ...initialState,

    // ============================================
    // INITIALIZATION
    // ============================================

    initialize: async (siteId: string, templateId: string) => {
      const supabase = createClient()

      try {
        // Load template
        const { data: template, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single()

        if (templateError || !template) {
          console.error('Failed to load template:', templateError)
          return
        }

        // Load content type if specified in conditions
        let contentType: ContentType | null = null
        let fields: Field[] = []
        const conditions = template.conditions as Record<string, string> | null

        if (conditions?.content_type_id) {
          const { data: ct } = await supabase
            .from('content_types')
            .select('*')
            .eq('id', conditions.content_type_id)
            .single()

          if (ct) {
            contentType = ct as ContentType

            // Load fields for this content type
            const { data: fieldsData } = await supabase
              .from('fields')
              .select('*')
              .eq('content_type_id', ct.id)
              .order('position', { ascending: true })

            fields = (fieldsData || []) as Field[]
          }
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

        // Load available pages for @-references
        const { data: pages } = await supabase
          .from('pages')
          .select('id, name, slug')
          .eq('site_id', siteId)
          .order('name')

        set((state) => {
          state.siteId = siteId
          state.templateId = templateId
          state.template = template as Template
          state.templateType = template.type as TemplateType
          state.contentType = contentType
          state.fields = fields
          state.html = template.html || ''
          state.originalHtml = template.html || ''
          state.name = template.name || ''
          state.isDefault = template.is_default || false
          state.designVariables = designVars as DesignVariables | null
          state.globalHeader = globalHeader
          state.globalFooter = globalFooter
          state.availablePages = pages || []
          state.history = [template.html || '']
          state.historyIndex = 0
        })
      } catch (error) {
        console.error('Failed to initialize template editor:', error)
      }
    },

    reset: () => {
      set(initialState)
    },

    // ============================================
    // HTML OPERATIONS
    // ============================================

    setHtml: (html: string) => {
      set((state) => {
        state.html = html
        state.hasUnsavedChanges = html !== state.originalHtml
      })
    },

    updateHtml: (html: string, addToHistory = true) => {
      set((state) => {
        state.html = html
        state.hasUnsavedChanges = html !== state.originalHtml

        if (addToHistory) {
          // Truncate future history
          const newHistory = state.history.slice(0, state.historyIndex + 1)
          newHistory.push(html)

          // Limit history size
          if (newHistory.length > MAX_HISTORY) {
            newHistory.shift()
          }

          state.history = newHistory
          state.historyIndex = newHistory.length - 1
        }
      })
    },

    applyGeneratedHtml: async (html: string, css?: string) => {
      get().updateHtml(html, true)
      if (css) {
        set((state) => {
          state.customCss = css
        })
      }
    },

    setCustomCss: (css: string) => {
      set((state) => {
        state.customCss = css
        state.hasUnsavedChanges = true
      })
    },

    // ============================================
    // TEMPLATE SETTINGS
    // ============================================

    setName: (name: string) => {
      set((state) => {
        state.name = name
        state.hasUnsavedChanges = true
      })
    },

    setIsDefault: (isDefault: boolean) => {
      set((state) => {
        state.isDefault = isDefault
        state.hasUnsavedChanges = true
      })
    },

    setTemplateType: (type: TemplateType) => {
      set((state) => {
        state.templateType = type
        state.hasUnsavedChanges = true
      })
    },

    setContentType: (contentType: ContentType | null) => {
      set((state) => {
        state.contentType = contentType
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
        if (element) {
          state.showElementPanel = true
        }
      })
    },

    updateSelectedElement: (updates: ElementUpdate) => {
      const { selectedElement, html } = get()
      if (!selectedElement) return

      // Update the HTML with the element changes
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const element = doc.querySelector(selectedElement.selector)

      if (element) {
        if (updates.textContent !== undefined) {
          element.textContent = updates.textContent
        }
        if (updates.className !== undefined) {
          element.className = updates.className
        }
        if (updates.innerHTML !== undefined) {
          element.innerHTML = updates.innerHTML
        }
        if (updates.style) {
          Object.entries(updates.style).forEach(([prop, value]) => {
            ;(element as HTMLElement).style.setProperty(prop, value)
          })
        }

        const newHtml = doc.body.innerHTML
        get().updateHtml(newHtml, true)
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

    deleteMessage: (id) => {
      set((state) => {
        state.messages = state.messages.filter((m) => m.id !== id)
      })
    },

    setMessageApplied: (id, isApplied) => {
      set((state) => {
        const message = state.messages.find((m) => m.id === id)
        if (message) {
          message.isApplied = isApplied
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
          state.html = state.history[state.historyIndex]
          state.hasUnsavedChanges = state.html !== state.originalHtml
        }
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++
          state.html = state.history[state.historyIndex]
          state.hasUnsavedChanges = state.html !== state.originalHtml
        }
      })
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const { historyIndex, history } = get()
      return historyIndex < history.length - 1
    },

    // ============================================
    // PERSISTENCE
    // ============================================

    save: async () => {
      const { templateId, html, name, isDefault, templateType, contentType, siteId } = get()
      if (!templateId) return

      set((state) => {
        state.isSaving = true
      })

      try {
        const supabase = createClient()

        const conditions: Record<string, string> = {}
        if (contentType) {
          conditions.content_type_id = contentType.id
        }

        await supabase
          .from('templates')
          .update({
            html,
            name,
            is_default: isDefault,
            type: templateType,
            conditions: Object.keys(conditions).length > 0 ? conditions : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', templateId)

        set((state) => {
          state.originalHtml = html
          state.hasUnsavedChanges = false
          state.lastSavedAt = new Date()
        })
      } catch (error) {
        console.error('Failed to save template:', error)
      } finally {
        set((state) => {
          state.isSaving = false
        })
      }
    },

    // ============================================
    // PANELS
    // ============================================

    toggleElementPanel: () => {
      set((state) => {
        state.showElementPanel = !state.showElementPanel
      })
    },

    setElementPanelTab: (tab) => {
      set((state) => {
        state.elementPanelTab = tab
      })
    },

    toggleLayersPanel: () => {
      set((state) => {
        state.showLayersPanel = !state.showLayersPanel
      })
    },

    toggleVariablesPanel: () => {
      set((state) => {
        state.showVariablesPanel = !state.showVariablesPanel
      })
    },

    toggleSettingsPanel: () => {
      set((state) => {
        state.showSettingsPanel = !state.showSettingsPanel
      })
    },

    // ============================================
    // GLOBAL COMPONENTS
    // ============================================

    loadGlobalComponents: async () => {
      const { siteId } = get()
      if (!siteId) return

      const supabase = createClient()

      const { data: site } = await supabase
        .from('sites')
        .select('global_header_id, global_footer_id')
        .eq('id', siteId)
        .single()

      if (site?.global_header_id) {
        const { data: header } = await supabase
          .from('components')
          .select('id, name, html, css, js')
          .eq('id', site.global_header_id)
          .single()
        if (header) {
          set((state) => {
            state.globalHeader = header as GlobalComponentData
          })
        }
      }

      if (site?.global_footer_id) {
        const { data: footer } = await supabase
          .from('components')
          .select('id, name, html, css, js')
          .eq('id', site.global_footer_id)
          .single()
        if (footer) {
          set((state) => {
            state.globalFooter = footer as GlobalComponentData
          })
        }
      }
    },

    getHtmlWithGlobalComponents: () => {
      const { html, globalHeader, globalFooter } = get()
      return insertGlobalComponents(
        html,
        globalHeader?.html ? { html: globalHeader.html } : null,
        globalFooter?.html ? { html: globalFooter.html } : null
      )
    },

    // ============================================
    // PREVIEW
    // ============================================

    getPreviewHtml: () => {
      const { html, templateType, contentType, fields } = get()
      if (!html) return ''

      // Replace Handlebars variables with dummy data
      const dummyData = get().getDummyData()
      let previewHtml = html

      // Simple variable replacement
      Object.entries(dummyData).forEach(([key, value]) => {
        // Handle {{{unescaped}}} first
        previewHtml = previewHtml.replace(
          new RegExp(`\\{\\{\\{${key}\\}\\}\\}`, 'g'),
          String(value)
        )
        // Then {{escaped}}
        previewHtml = previewHtml.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          String(value)
        )
      })

      // Handle {{#each entries}} loops for archive
      if (templateType === 'archive') {
        const eachEntriesMatch = previewHtml.match(/\{\{#each entries\}\}([\s\S]*?)\{\{\/each\}\}/g)
        if (eachEntriesMatch) {
          const dummyEntries = buildDummyEntries(contentType, fields, 6)
          eachEntriesMatch.forEach((match) => {
            const template = match.replace(/\{\{#each entries\}\}/, '').replace(/\{\{\/each\}\}/, '')
            let rendered = ''
            dummyEntries.forEach((entry, index) => {
              let item = template
              Object.entries(entry).forEach(([key, value]) => {
                item = item.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
                item = item.replace(new RegExp(`\\{\\{this\\.${key}\\}\\}`, 'g'), String(value))
              })
              // Replace @index
              item = item.replace(/\{\{@index\}\}/g, String(index))
              rendered += item
            })
            previewHtml = previewHtml.replace(match, rendered)
          })
        }
      }

      // Handle {{#each related_entries}} for single
      if (templateType === 'single') {
        const eachRelatedMatch = previewHtml.match(/\{\{#each related_entries\}\}([\s\S]*?)\{\{\/each\}\}/g)
        if (eachRelatedMatch) {
          const dummyRelated = buildDummyEntries(contentType, fields, 3)
          eachRelatedMatch.forEach((match) => {
            const template = match.replace(/\{\{#each related_entries\}\}/, '').replace(/\{\{\/each\}\}/, '')
            let rendered = ''
            dummyRelated.forEach((entry) => {
              let item = template
              Object.entries(entry).forEach(([key, value]) => {
                item = item.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
              })
              rendered += item
            })
            previewHtml = previewHtml.replace(match, rendered)
          })
        }
      }

      // Remove any remaining Handlebars tags
      previewHtml = previewHtml.replace(/\{\{[^}]+\}\}/g, '')

      return previewHtml
    },

    getDummyData: () => {
      const { templateType, contentType, fields } = get()

      if (templateType === 'single') {
        const entry = buildDummyEntry(contentType, fields)
        return {
          'entry.title': entry.title,
          'entry.slug': entry.slug,
          'entry.content': entry.content,
          'entry.excerpt': entry.excerpt,
          'entry.featured_image': entry.featured_image,
          'entry.author': entry.author,
          'entry.published_at': entry.published_at,
          'entry.url': entry.url,
          ...Object.fromEntries(
            Object.entries(entry.data || {}).map(([k, v]) => [`entry.data.${k}`, v])
          ),
        }
      }

      return {}
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
