import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/client'
import type {
  EditorState,
  EditorActions,
  ViewMode,
  Breakpoint,
  SelectedElement,
  ElementUpdate,
  ChatMessage,
  PageData,
  SiteContext,
  DetectedGlobalComponents,
  GlobalComponentData,
} from '@/types/editor'
import { insertGlobalComponents, removeHeaderFooterFromHtml, sanitizeHtmlForGlobalComponents } from '@/lib/ai/html-operations'

const MAX_HISTORY = 50

// WordPress Types
export interface WordPressConfig {
  enabled: boolean
  api_url: string
  api_key: string
  domain: string
  connection_status: 'connected' | 'error' | 'untested'
  last_connection_test: string | null
}

export type WordPressStatus = 'current' | 'outdated' | 'error' | 'not_configured'

// Tailwind Config Types
export interface TailwindCustomConfig {
  colors?: Record<string, string>
  fontFamily?: Record<string, string[]>
  keyframes?: Record<string, Record<string, Record<string, string>>>
  animation?: Record<string, string>
  backgroundImage?: Record<string, string>
}

/**
 * Extract content between balanced braces starting at startIdx
 * startIdx should point to the opening brace '{'
 */
function extractBalancedBraces(str: string, startIdx: number): string | null {
  if (str[startIdx] !== '{') return null

  let depth = 0
  let i = startIdx

  while (i < str.length) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) {
        return str.slice(startIdx + 1, i)
      }
    }
    i++
  }
  return null
}

/**
 * Extract Tailwind config from HTML content
 * Parses the JavaScript tailwind.config = {...} from script tags
 */
function extractTailwindConfigFromHtml(html: string): TailwindCustomConfig | null {
  // Find script tag with tailwind.config
  const configMatch = html.match(/<script[^>]*>([\s\S]*?tailwind\.config\s*=[\s\S]*?)<\/script>/i)
  if (!configMatch) return null

  const configScript = configMatch[1]

  try {
    const config: TailwindCustomConfig = {}

    // Extract colors - handle nested objects and rgba values
    const colorsMatch = configScript.match(/colors\s*:\s*\{([\s\S]*?)\}(?=\s*,?\s*(?:fontFamily|keyframes|animation|backgroundImage|\}))/i)
    if (colorsMatch) {
      const colors: Record<string, string> = {}
      const colorsBlock = colorsMatch[1]
      // Match 'colorName': 'value' or 'colorName': "value" - including rgba
      const colorPattern = /['"]([a-zA-Z-]+)['"]\s*:\s*['"]([^'"]+)['"]/g
      let match
      while ((match = colorPattern.exec(colorsBlock)) !== null) {
        colors[match[1]] = match[2]
      }
      if (Object.keys(colors).length) config.colors = colors
    }

    // Extract fontFamily
    const fontMatch = configScript.match(/fontFamily\s*:\s*\{([\s\S]*?)\}(?=\s*,?\s*(?:colors|keyframes|animation|backgroundImage|\}))/i)
    if (fontMatch) {
      const fontFamily: Record<string, string[]> = {}
      const fontBlock = fontMatch[1]
      // Match 'fontName': ['Font1', 'fallback']
      const fontPattern = /['"]([a-zA-Z-]+)['"]\s*:\s*\[([\s\S]*?)\]/g
      let match
      while ((match = fontPattern.exec(fontBlock)) !== null) {
        const fontName = match[1]
        const fontValues = match[2]
          .split(',')
          .map(f => f.trim().replace(/['"]/g, ''))
          .filter(f => f)
        fontFamily[fontName] = fontValues
      }
      if (Object.keys(fontFamily).length) config.fontFamily = fontFamily
    }

    // Extract animation values (simple key: value pairs)
    const animationMatch = configScript.match(/animation\s*:\s*\{([\s\S]*?)\}(?=\s*,?\s*(?:colors|fontFamily|keyframes|backgroundImage|\}))/i)
    if (animationMatch) {
      const animation: Record<string, string> = {}
      const animBlock = animationMatch[1]
      const animPattern = /['"]([a-zA-Z-]+)['"]\s*:\s*['"]([^'"]+)['"]/g
      let match
      while ((match = animPattern.exec(animBlock)) !== null) {
        animation[match[1]] = match[2]
      }
      if (Object.keys(animation).length) config.animation = animation
    }

    // Extract keyframes - use brace counting for nested objects
    const keyframesStartMatch = configScript.match(/keyframes\s*:\s*\{/i)
    if (keyframesStartMatch && keyframesStartMatch.index !== undefined) {
      const startIdx = keyframesStartMatch.index + keyframesStartMatch[0].length
      const kfBlock = extractBalancedBraces(configScript, startIdx - 1)

      if (kfBlock) {
        const keyframes: Record<string, Record<string, Record<string, string>>> = {}

        // Match each keyframe animation: pulseGlow: { ... }, aurora: { ... }
        const kfNamePattern = /['"]?([a-zA-Z]+)['"]?\s*:\s*\{/g
        let kfNameMatch
        while ((kfNameMatch = kfNamePattern.exec(kfBlock)) !== null) {
          const kfName = kfNameMatch[1]
          const kfStartIdx = kfNameMatch.index + kfNameMatch[0].length - 1
          const kfContent = extractBalancedBraces(kfBlock, kfStartIdx)

          if (kfContent) {
            const frames: Record<string, Record<string, string>> = {}

            // Match frame percentages: '0%': { ... }, '0%, 100%': { ... }
            const framePattern = /['"](\d+%(?:,\s*\d+%)*|from|to)['"]\s*:\s*\{([^}]+)\}/g
            let frameMatch
            while ((frameMatch = framePattern.exec(kfContent)) !== null) {
              const frameKey = frameMatch[1]
              const frameContent = frameMatch[2]
              const props: Record<string, string> = {}

              const propPattern = /['"]?([a-zA-Z-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g
              let propMatch
              while ((propMatch = propPattern.exec(frameContent)) !== null) {
                props[propMatch[1]] = propMatch[2]
              }
              if (Object.keys(props).length) frames[frameKey] = props
            }
            if (Object.keys(frames).length) keyframes[kfName] = frames
          }
        }
        if (Object.keys(keyframes).length) config.keyframes = keyframes
      }
    }

    console.log('[Tailwind Config] Extracted:', config)
    return Object.keys(config).length ? config : null
  } catch (error) {
    console.error('[Tailwind Config] Failed to parse:', error)
    return null
  }
}

/**
 * Save Tailwind config to site settings (merge with existing)
 */
async function saveTailwindConfigToSite(
  supabase: ReturnType<typeof createClient>,
  siteId: string,
  config: TailwindCustomConfig
) {
  try {
    // Get current site settings
    const { data: site } = await supabase
      .from('sites')
      .select('settings')
      .eq('id', siteId)
      .single()

    const currentSettings = (site?.settings as Record<string, unknown>) || {}
    const currentTailwind = (currentSettings.tailwindConfig as TailwindCustomConfig) || {}

    // Merge configs (new values override old)
    const mergedConfig: TailwindCustomConfig = {
      colors: { ...currentTailwind.colors, ...config.colors },
      fontFamily: { ...currentTailwind.fontFamily, ...config.fontFamily },
      keyframes: { ...currentTailwind.keyframes, ...config.keyframes },
      animation: { ...currentTailwind.animation, ...config.animation },
      backgroundImage: { ...currentTailwind.backgroundImage, ...config.backgroundImage },
    }

    // Remove empty objects
    Object.keys(mergedConfig).forEach(key => {
      const k = key as keyof TailwindCustomConfig
      if (!mergedConfig[k] || Object.keys(mergedConfig[k]!).length === 0) {
        delete mergedConfig[k]
      }
    })

    // Save to site settings (cast to any to bypass strict Json type)
    const newSettings = {
      ...currentSettings,
      tailwindConfig: mergedConfig,
    }

    const { error } = await supabase
      .from('sites')
      .update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: newSettings as any,
      })
      .eq('id', siteId)

    if (error) {
      console.error('[Tailwind Config] Failed to save:', error)
    } else {
      console.log('[Tailwind Config] Saved to site settings:', mergedConfig)
    }
  } catch (error) {
    console.error('[Tailwind Config] Save error:', error)
  }
}

const initialState: EditorState = {
  siteId: null,
  pageId: null,
  html: '',
  originalHtml: '',
  viewMode: 'design',
  breakpoint: 'desktop',
  zoom: 100,
  selectedElement: null,
  messages: [],
  isGenerating: false,
  history: [],
  historyIndex: -1,
  hasUnsavedChanges: false,
  isSaving: false,
  lastSavedAt: null,
  siteContext: null,
  designVariables: null,
  pages: [],
  currentPage: null,
  showElementPanel: false,
  elementPanelTab: 'edit',
  showLayersPanel: false,
  // Global Components
  globalHeader: null,
  globalFooter: null,
  detectedGlobalComponents: null,
  showGlobalComponentsDialog: false,
}

/**
 * Apply design tokens to document as CSS custom properties
 * This enables the token-based utility classes to work in the editor
 */
function applyDesignTokensToDocument(designVars: Record<string, unknown>) {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const colors = designVars.colors as Record<string, Record<string, string>> | undefined
  const typography = designVars.typography as Record<string, string> | undefined

  // Apply color tokens
  if (colors?.brand) {
    const primary = colors.brand.primary || '#3b82f6'
    root.style.setProperty('--site-primary', primary)
    root.style.setProperty('--site-primary-hover', darkenColor(primary, 10))
    root.style.setProperty('--site-secondary', colors.brand.secondary || '#64748b')
    root.style.setProperty('--site-accent', colors.brand.accent || '#f59e0b')
  }

  if (colors?.neutral) {
    root.style.setProperty('--site-background', colors.neutral['50'] || '#ffffff')
    root.style.setProperty('--site-foreground', colors.neutral['900'] || '#0f172a')
    root.style.setProperty('--site-muted', colors.neutral['100'] || '#f1f5f9')
    root.style.setProperty('--site-border', colors.neutral['200'] || '#e2e8f0')
  }

  // Apply typography tokens
  if (typography) {
    root.style.setProperty('--site-font-heading', `'${typography.fontHeading || 'Inter'}', system-ui, sans-serif`)
    root.style.setProperty('--site-font-body', `'${typography.fontBody || 'Inter'}', system-ui, sans-serif`)
    root.style.setProperty('--site-font-mono', `'${typography.fontMono || 'JetBrains Mono'}', monospace`)
  }
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  hex = hex.replace('#', '')
  const num = parseInt(hex, 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max(0, (num >> 16) - amt)
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt)
  const B = Math.max(0, (num & 0x0000FF) - amt)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

export const useEditorStore = create<EditorState & EditorActions>()(
  immer((set, get) => ({
    ...initialState,

    // ============================================
    // INITIALIZATION
    // ============================================

    initialize: async (siteId: string, pageId: string) => {
      const supabase = createClient()

      // Load site data
      const { data: site } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single()

      // Load page data
      const { data: page } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single()

      // Load all pages for this site
      const { data: pages } = await supabase
        .from('pages')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at')

      // Load chat history
      const { data: chatHistory } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at')

      // Load design variables and apply CSS variables
      const { data: designVars } = await supabase
        .from('design_variables')
        .select('*')
        .eq('site_id', siteId)
        .single()

      // Apply design tokens as CSS variables
      if (designVars && typeof window !== 'undefined') {
        applyDesignTokensToDocument(designVars)
      }

      const htmlContent = (page?.html_content as string) || getDefaultHtml()

      set((state) => {
        state.siteId = siteId
        state.designVariables = designVars || null
        state.pageId = pageId
        state.html = htmlContent
        state.originalHtml = htmlContent
        state.history = [htmlContent]
        state.historyIndex = 0
        state.siteContext = site ? {
          siteId: site.id,
          siteName: site.name,
          siteType: (site.settings as Record<string, unknown>)?.type as string,
          industry: (site.settings as Record<string, unknown>)?.industry as string,
          colors: (site.settings as Record<string, unknown>)?.colors as SiteContext['colors'],
          fonts: (site.settings as Record<string, unknown>)?.fonts as SiteContext['fonts'],
          style: (site.settings as Record<string, unknown>)?.style as string,
        } : null
        state.currentPage = page ? {
          id: page.id,
          name: page.name,
          slug: page.slug || '',
          htmlContent: htmlContent,
          isHome: page.is_home || false,
        } : null
        state.pages = (pages || []).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug || '',
          htmlContent: (p.html_content as string) || '',
          isHome: p.is_home || false,
        }))
        state.messages = (chatHistory || []).map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          generatedHtml: m.generated_html || undefined,
          model: m.model || undefined,
          tokensUsed: m.tokens_used || undefined,
          timestamp: new Date(m.created_at || Date.now()),
        }))
      })

      // Load global components after setting state
      await get().loadGlobalComponents()
    },

    reset: () => {
      set(initialState)
    },

    // ============================================
    // HTML OPERATIONS
    // ============================================

    setHtml: (html: string) => {
      // Use updateHtml to properly track changes
      get().updateHtml(html, true)
    },

    updateHtml: (html: string, addToHistory = true) => {
      set((state) => {
        state.html = html
        state.hasUnsavedChanges = true

        if (addToHistory) {
          // Truncate future history if we're not at the end
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

    applyGeneratedHtml: (html: string) => {
      get().updateHtml(html, true)
    },

    // ============================================
    // VIEW OPERATIONS
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
        state.zoom = Math.min(Math.max(zoom, 25), 200)
      })
    },

    // ============================================
    // SELECTION
    // ============================================

    selectElement: (element: SelectedElement | null) => {
      set((state) => {
        state.selectedElement = element
        state.showElementPanel = element !== null
      })
    },

    updateSelectedElement: (updates: ElementUpdate) => {
      // This would need to update the HTML with the changes
      // Implementation depends on how we want to handle DOM updates
      const state = get()
      if (!state.selectedElement) return

      // For now, just log - proper implementation would parse and update HTML
      console.log('Update element:', updates)
    },

    clearSelection: () => {
      set((state) => {
        state.selectedElement = null
        state.showElementPanel = false
      })
    },

    // ============================================
    // CHAT
    // ============================================

    addMessage: (message) => {
      const localId = nanoid()
      const newMessage: ChatMessage = {
        ...message,
        id: localId,
        timestamp: new Date(),
      }

      set((state) => {
        state.messages.push(newMessage)
      })

      // Only persist user messages immediately (assistant messages are saved after streaming)
      const state = get()
      if (state.pageId && message.role === 'user') {
        const supabase = createClient()
        supabase.from('chat_messages').insert({
          page_id: state.pageId,
          site_id: state.siteId,
          role: message.role,
          content: message.content,
        }).select().then(({ data, error }) => {
          if (error) {
            console.error('Error saving user message:', error.message)
          } else if (data && data[0]) {
            // Update local ID with database ID
            set((s) => {
              const idx = s.messages.findIndex(m => m.id === localId)
              if (idx !== -1) {
                s.messages[idx].id = data[0].id
              }
            })
          }
        })
      }

      return localId
    },

    updateMessage: (id: string, updates: Partial<ChatMessage>) => {
      set((state) => {
        const index = state.messages.findIndex((m) => m.id === id)
        if (index !== -1) {
          state.messages[index] = { ...state.messages[index], ...updates }
        }
      })

      // Persist to database when streaming is done (has content and not streaming)
      if (updates.isStreaming === false && updates.content) {
        const state = get()
        const msg = state.messages.find(m => m.id === id)
        if (state.pageId && msg) {
          const supabase = createClient()
          // Insert new assistant message
          supabase.from('chat_messages').insert({
            page_id: state.pageId,
            site_id: state.siteId,
            role: msg.role,
            content: updates.content,
            generated_html: updates.generatedHtml || null,
            model: updates.model || null,
            tokens_used: updates.tokensUsed || null,
          }).select().then(({ data, error }) => {
            if (error) {
              console.error('Error saving assistant message:', error.message)
            } else {
              console.log('Message saved to database')
              // Update local ID with database ID
              if (data && data[0]) {
                set((s) => {
                  const idx = s.messages.findIndex(m => m.id === id)
                  if (idx !== -1) {
                    s.messages[idx].id = data[0].id
                  }
                })
              }
            }
          })
        }
      }
    },

    setGenerating: (isGenerating: boolean) => {
      set((state) => {
        state.isGenerating = isGenerating
      })
    },

    clearMessages: () => {
      set((state) => {
        state.messages = []
      })
    },

    deleteMessage: (id: string) => {
      set((state) => {
        state.messages = state.messages.filter((m) => m.id !== id)
      })

      // Also delete from database
      const state = get()
      if (state.pageId) {
        const supabase = createClient()
        supabase.from('chat_messages').delete().eq('id', id).then(() => {})
      }
    },

    // ============================================
    // HISTORY
    // ============================================

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--
          state.html = state.history[state.historyIndex]
          state.hasUnsavedChanges = true
        }
      })
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++
          state.html = state.history[state.historyIndex]
          state.hasUnsavedChanges = true
        }
      })
    },

    canUndo: () => {
      return get().historyIndex > 0
    },

    canRedo: () => {
      const state = get()
      return state.historyIndex < state.history.length - 1
    },

    // ============================================
    // PERSISTENCE
    // ============================================

    save: async () => {
      const state = get()
      console.log('Saving... pageId:', state.pageId)

      if (!state.pageId) {
        console.error('No pageId - cannot save')
        return
      }

      set((s) => {
        s.isSaving = true
      })

      try {
        const supabase = createClient()

        // FAILSAFE: Sanitize HTML before saving to remove any duplicate header/footer
        let htmlToSave = state.html
        if (state.globalHeader || state.globalFooter) {
          console.log('Sanitizing HTML before save (global components exist)')
          htmlToSave = sanitizeHtmlForGlobalComponents(htmlToSave, {
            hasGlobalHeader: !!state.globalHeader,
            hasGlobalFooter: !!state.globalFooter,
          })
        }

        console.log('Updating page with html length:', htmlToSave.length)

        const { data, error } = await supabase
          .from('pages')
          .update({
            html_content: htmlToSave,
            updated_at: new Date().toISOString(),
          })
          .eq('id', state.pageId)
          .select()

        console.log('Save result:', { data, error })

        // Extract and save Tailwind config if present
        const tailwindConfig = extractTailwindConfigFromHtml(state.html)
        if (tailwindConfig && state.siteId) {
          console.log('Found Tailwind config, saving to site settings:', tailwindConfig)
          await saveTailwindConfigToSite(supabase, state.siteId, tailwindConfig)
        }

        set((s) => {
          s.isSaving = false
          if (!error) {
            s.hasUnsavedChanges = false
            s.originalHtml = state.html
            s.lastSavedAt = new Date()
            console.log('Save successful!')
          }
        })

        if (error) {
          console.error('Failed to save:', error)
          throw error
        }
      } catch (err) {
        console.error('Save error:', err)
        set((s) => {
          s.isSaving = false
        })
        throw err
      }
    },

    // ============================================
    // PAGES
    // ============================================

    setCurrentPage: (page: PageData) => {
      set((state) => {
        state.currentPage = page
        state.pageId = page.id
      })
    },

    loadPage: async (pageId: string) => {
      const state = get()
      if (!state.siteId) return

      const supabase = createClient()
      const { data: page } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single()

      if (page) {
        const htmlContent = (page.html_content as string) || getDefaultHtml()

        set((s) => {
          s.pageId = pageId
          s.html = htmlContent
          s.originalHtml = htmlContent
          s.history = [htmlContent]
          s.historyIndex = 0
          s.hasUnsavedChanges = false
          s.currentPage = {
            id: page.id,
            name: page.name,
            slug: page.slug || '',
            htmlContent: htmlContent,
            isHome: page.is_home || false,
          }
          s.selectedElement = null
          s.showElementPanel = false
        })

        // Load chat history for this page
        const { data: chatHistory } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('page_id', pageId)
          .order('created_at')

        set((s) => {
          s.messages = (chatHistory || []).map((m) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            generatedHtml: m.generated_html || undefined,
            model: m.model || undefined,
            tokensUsed: m.tokens_used || undefined,
            timestamp: new Date(m.created_at || Date.now()),
          }))
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

    // ============================================
    // LAYERS PANEL
    // ============================================

    toggleLayersPanel: () => {
      set((state) => {
        state.showLayersPanel = !state.showLayersPanel
      })
    },

    setShowLayersPanel: (show: boolean) => {
      set((state) => {
        state.showLayersPanel = show
      })
    },

    // Move element within the DOM structure
    moveElement: (selector: string, newParentSelector: string, position: number) => {
      const state = get()
      const doc = new DOMParser().parseFromString(state.html, 'text/html')

      const element = doc.querySelector(selector)
      const newParent = doc.querySelector(newParentSelector)

      if (!element || !newParent) return

      // Remove from current position
      element.parentNode?.removeChild(element)

      // Insert at new position
      const children = Array.from(newParent.children)
      if (position >= children.length) {
        newParent.appendChild(element)
      } else {
        newParent.insertBefore(element, children[position])
      }

      // Reconstruct HTML
      let newHtml = '<!DOCTYPE html>\n<html'
      Array.from(doc.documentElement.attributes).forEach(attr => {
        newHtml += ` ${attr.name}="${attr.value}"`
      })
      newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

      get().updateHtml(newHtml, true)
    },

    // Reorder siblings
    reorderSiblings: (parentSelector: string, fromIndex: number, toIndex: number) => {
      const state = get()
      const doc = new DOMParser().parseFromString(state.html, 'text/html')

      const parent = doc.querySelector(parentSelector)
      if (!parent) return

      const children = Array.from(parent.children)
      if (fromIndex < 0 || fromIndex >= children.length || toIndex < 0 || toIndex >= children.length) return

      const element = children[fromIndex]
      parent.removeChild(element)

      if (toIndex >= parent.children.length) {
        parent.appendChild(element)
      } else {
        parent.insertBefore(element, parent.children[toIndex])
      }

      // Reconstruct HTML
      let newHtml = '<!DOCTYPE html>\n<html'
      Array.from(doc.documentElement.attributes).forEach(attr => {
        newHtml += ` ${attr.name}="${attr.value}"`
      })
      newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

      get().updateHtml(newHtml, true)
    },

    // ============================================
    // GLOBAL COMPONENTS
    // ============================================

    loadGlobalComponents: async () => {
      const state = get()
      if (!state.siteId) return

      const supabase = createClient()

      // Get site with global component references
      const { data: site } = await supabase
        .from('sites')
        .select('global_header_id, global_footer_id')
        .eq('id', state.siteId)
        .single()

      if (!site) return

      let globalHeader: GlobalComponentData | null = null
      let globalFooter: GlobalComponentData | null = null

      // Load header component if exists
      if (site.global_header_id) {
        const { data: header } = await supabase
          .from('components')
          .select('id, name, html, css, js')
          .eq('id', site.global_header_id)
          .single()

        if (header) {
          globalHeader = {
            id: header.id,
            name: header.name,
            html: header.html || '',
            css: header.css || undefined,
            js: header.js || undefined,
          }
        }
      }

      // Load footer component if exists
      if (site.global_footer_id) {
        const { data: footer } = await supabase
          .from('components')
          .select('id, name, html, css, js')
          .eq('id', site.global_footer_id)
          .single()

        if (footer) {
          globalFooter = {
            id: footer.id,
            name: footer.name,
            html: footer.html || '',
            css: footer.css || undefined,
            js: footer.js || undefined,
          }
        }
      }

      set((s) => {
        s.globalHeader = globalHeader
        s.globalFooter = globalFooter
      })

      console.log('[Global Components] Loaded:', { globalHeader, globalFooter })
    },

    setDetectedGlobalComponents: (components: DetectedGlobalComponents | null) => {
      set((s) => {
        s.detectedGlobalComponents = components
      })
    },

    setShowGlobalComponentsDialog: (show: boolean) => {
      set((s) => {
        s.showGlobalComponentsDialog = show
      })
    },

    saveAsGlobalComponent: async (headerName: string | null, footerName: string | null) => {
      const state = get()
      if (!state.siteId || !state.detectedGlobalComponents) return

      const supabase = createClient()

      let newHeaderId: string | null = null
      let newFooterId: string | null = null

      // Save header as global component
      if (headerName && state.detectedGlobalComponents.header) {
        const { data: headerResult, error: headerError } = await supabase.rpc(
          'create_global_component',
          {
            p_site_id: state.siteId,
            p_name: headerName,
            p_html: state.detectedGlobalComponents.header.html,
            p_position: 'header',
            p_set_as_site_default: true,
          }
        )

        if (headerError) {
          console.error('Error saving header:', headerError)
        } else {
          newHeaderId = headerResult
          console.log('Header saved with ID:', newHeaderId)
        }
      }

      // Save footer as global component
      if (footerName && state.detectedGlobalComponents.footer) {
        const { data: footerResult, error: footerError } = await supabase.rpc(
          'create_global_component',
          {
            p_site_id: state.siteId,
            p_name: footerName,
            p_html: state.detectedGlobalComponents.footer.html,
            p_position: 'footer',
            p_set_as_site_default: true,
          }
        )

        if (footerError) {
          console.error('Error saving footer:', footerError)
        } else {
          newFooterId = footerResult
          console.log('Footer saved with ID:', newFooterId)
        }
      }

      // Remove header/footer from current page HTML
      const currentHtml = state.html
      const cleanedHtml = removeHeaderFooterFromHtml(currentHtml, {
        removeHeader: !!headerName && !!state.detectedGlobalComponents.header,
        removeFooter: !!footerName && !!state.detectedGlobalComponents.footer,
      })

      // Update state
      set((s) => {
        s.html = cleanedHtml
        s.detectedGlobalComponents = null
        s.showGlobalComponentsDialog = false
        s.hasUnsavedChanges = true
      })

      // Reload global components to get the new ones
      await get().loadGlobalComponents()

      // Save page with cleaned HTML
      await get().save()
    },

    getHtmlWithGlobalComponents: () => {
      const state = get()
      return insertGlobalComponents(
        state.html,
        state.globalHeader,
        state.globalFooter
      )
    },
  }))
)

// Default HTML for new pages (empty - AI will generate content)
function getDefaultHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
</body>
</html>`
}
