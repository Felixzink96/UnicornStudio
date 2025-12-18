// ============================================
// AI-FIRST EDITOR TYPES
// ============================================

import type { DesignVariables } from './cms'

export type ViewMode = 'preview' | 'design' | 'code'
export type Breakpoint = 'desktop' | 'tablet' | 'mobile'

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  generatedHtml?: string      // Full page HTML (for applying)
  previewHtml?: string        // Just the new/modified section (for preview)
  designNotes?: string[]
  thinking?: string
  model?: string
  tokensUsed?: number
  timestamp: Date
  createdAt?: Date
  isStreaming?: boolean
  isApplied?: boolean         // Whether this AI response has been applied to the page
  // Reference Updates (fuer @-Referenzen)
  hasReferenceUpdates?: boolean
  referenceUpdates?: unknown[]  // ReferenceUpdate[] - any um zirkulaere Imports zu vermeiden
  // Gemini Tool Outputs
  searchSources?: Array<{ title: string; uri: string }>  // Google Search results
  executableCode?: string     // Python code that was executed
  codeResult?: string         // Output from code execution
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
// GLOBAL COMPONENTS
// ============================================

export interface GlobalComponentData {
  id: string
  name: string
  html: string
  css?: string
  js?: string
}

export interface DetectedGlobalComponents {
  header: {
    html: string
    suggestedName: string
    confidence: number
  } | null
  footer: {
    html: string
    suggestedName: string
    confidence: number
  } | null
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
  designVariables: DesignVariables | null
  pages: PageData[]
  currentPage: PageData | null

  // Panels
  showElementPanel: boolean
  elementPanelTab: 'edit' | 'prompt' | 'code'
  showLayersPanel: boolean

  // Global Components
  globalHeader: GlobalComponentData | null
  globalFooter: GlobalComponentData | null
  detectedGlobalComponents: DetectedGlobalComponents | null
  showGlobalComponentsDialog: boolean

  // Build Animation State
  activeBuildSection: { id: string; operation: string } | null
}

// ============================================
// EDITOR ACTIONS
// ============================================

export interface EditorActions {
  // Init
  initialize: (siteId: string, pageId: string) => Promise<void>
  initializeWithData: (siteId: string, pageId: string, data: unknown) => void
  reset: () => void

  // HTML
  setHtml: (html: string) => void
  updateHtml: (html: string, addToHistory?: boolean) => void
  applyGeneratedHtml: (html: string) => Promise<void>

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

  // Pages
  setCurrentPage: (page: PageData) => void
  loadPage: (pageId: string) => Promise<void>

  // Panels
  toggleElementPanel: () => void
  setElementPanelTab: (tab: 'edit' | 'prompt' | 'code') => void

  // Layers Panel
  toggleLayersPanel: () => void
  setShowLayersPanel: (show: boolean) => void
  moveElement: (selector: string, newParentSelector: string, position: number) => void
  reorderSiblings: (parentSelector: string, fromIndex: number, toIndex: number) => void

  // Global Components
  loadGlobalComponents: () => Promise<void>
  setDetectedGlobalComponents: (components: DetectedGlobalComponents | null) => void
  setShowGlobalComponentsDialog: (show: boolean) => void
  saveAsGlobalComponent: (
    headerName: string | null,
    footerName: string | null
  ) => Promise<void>
  getHtmlWithGlobalComponents: () => string

  // Build Animation
  setActiveBuildSection: (section: { id: string; operation: string } | null) => void
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
