// ============================================
// AI-FIRST EDITOR TYPES
// ============================================

export type ViewMode = 'preview' | 'design' | 'code'
export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  generatedHtml?: string
  designNotes?: string[]
  model?: string
  tokensUsed?: number
  timestamp: Date
  createdAt?: Date
  isStreaming?: boolean
}

// ============================================
// ELEMENT SELECTION
// ============================================

export interface SelectedElement {
  tagName: string
  path: string[]
  selector: string
  className: string
  textContent: string
  innerHTML: string
  outerHTML: string
  rect: {
    top: number
    left: number
    width: number
    height: number
  }
  dataPath?: string
}

export interface ElementUpdate {
  textContent?: string
  className?: string
  innerHTML?: string
  style?: Record<string, string>
}

// ============================================
// SITE CONTEXT
// ============================================

export interface SiteContext {
  siteId: string
  siteName: string
  siteType?: string
  industry?: string
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
    background?: string
    text?: string
  }
  fonts?: {
    heading?: string
    body?: string
  }
  style?: string
}

// ============================================
// PAGE DATA
// ============================================

export interface PageData {
  id: string
  name: string
  slug: string
  htmlContent: string
  isHome: boolean
}

// ============================================
// EDITOR STATE
// ============================================

export interface EditorState {
  // IDs
  siteId: string | null
  pageId: string | null

  // Content
  html: string
  originalHtml: string

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
  siteContext: SiteContext | null
  pages: PageData[]
  currentPage: PageData | null

  // Panels
  showElementPanel: boolean
  elementPanelTab: 'edit' | 'prompt' | 'code'
}

// ============================================
// EDITOR ACTIONS
// ============================================

export interface EditorActions {
  // Init
  initialize: (siteId: string, pageId: string) => Promise<void>
  reset: () => void

  // HTML
  setHtml: (html: string) => void
  updateHtml: (html: string, addToHistory?: boolean) => void
  applyGeneratedHtml: (html: string) => void

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
  setGenerating: (isGenerating: boolean) => void
  clearMessages: () => void

  // History
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  // Persistence
  save: () => Promise<void>

  // Pages
  setCurrentPage: (page: PageData) => void
  loadPage: (pageId: string) => Promise<void>

  // Panels
  toggleElementPanel: () => void
  setElementPanelTab: (tab: 'edit' | 'prompt' | 'code') => void
}

// ============================================
// API TYPES
// ============================================

export interface GenerateRequest {
  siteId: string
  pageId: string
  prompt: string
  existingHtml?: string
  context: SiteContext
  selectedElement?: SelectedElement
}

export interface GenerateResponse {
  content: string
  html?: string
  designNotes?: string[]
  model: string
  tokensUsed: number
}

// ============================================
// PROMPT TEMPLATES
// ============================================

export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: PromptCategory
  prompt: string
  variables?: PromptVariable[]
  exampleOutput?: string
  thumbnail?: string
}

export interface PromptVariable {
  name: string
  label: string
  type: 'text' | 'select' | 'color'
  options?: string[]
  defaultValue?: string
}

export type PromptCategory =
  | 'hero'
  | 'features'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'contact'
  | 'faq'
  | 'gallery'
  | 'stats'
  | 'team'
  | 'footer'
  | 'navigation'
  | 'content'
