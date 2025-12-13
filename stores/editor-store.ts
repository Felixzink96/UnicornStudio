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
} from '@/types/editor'

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

    // Extract keyframes
    const keyframesMatch = configScript.match(/keyframes\s*:\s*\{([\s\S]*?)\}(?=\s*,?\s*animation)/i)
    if (keyframesMatch) {
      const keyframes: Record<string, Record<string, Record<string, string>>> = {}
      const kfBlock = keyframesMatch[1]

      // Match keyframe names like scroll: { '0%': {...}, '100%': {...} }
      const kfPattern = /['"]?([a-zA-Z]+)['"]?\s*:\s*\{([\s\S]*?)\}(?=\s*,?\s*['"]?[a-zA-Z]+['"]?\s*:|$)/g
      let kfMatch
      while ((kfMatch = kfPattern.exec(kfBlock)) !== null) {
        const kfName = kfMatch[1]
        const kfContent = kfMatch[2]
        const frames: Record<string, Record<string, string>> = {}

        // Match frame percentages: '0%': { transform: '...' }
        const framePattern = /['"](\d+%(?:,\s*\d+%)?|from|to)['"]\s*:\s*\{([^}]+)\}/g
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
      if (Object.keys(keyframes).length) config.keyframes = keyframes
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

    // Save to site settings
    const { error } = await supabase
      .from('sites')
      .update({
        settings: {
          ...currentSettings,
          tailwindConfig: mergedConfig,
        },
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
  pages: [],
  currentPage: null,
  showElementPanel: false,
  elementPanelTab: 'edit',
  showLayersPanel: false,
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

      const htmlContent = (page?.html_content as string) || getDefaultHtml()

      set((state) => {
        state.siteId = siteId
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
        console.log('Updating page with html length:', state.html.length)

        const { data, error } = await supabase
          .from('pages')
          .update({
            html_content: state.html,
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
  }))
)

// Default HTML for new pages
function getDefaultHtml(): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-white">
  <section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500">
    <div class="text-center text-white px-4">
      <h1 class="text-5xl md:text-7xl font-bold mb-6">
        Willkommen
      </h1>
      <p class="text-xl md:text-2xl opacity-90 mb-8 max-w-2xl mx-auto">
        Beschreibe im Chat, welche Website du erstellen möchtest.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="#" class="px-8 py-4 bg-white text-purple-600 font-semibold rounded-full hover:bg-opacity-90 transition">
          Mehr erfahren
        </a>
        <a href="#" class="px-8 py-4 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-purple-600 transition">
          Kontakt
        </a>
      </div>
    </div>
  </section>
</body>
</html>`
}
