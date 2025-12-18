'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Toolbar } from './toolbar/Toolbar'
import { ChatPanel } from './chat/ChatPanel'
import { LivePreview } from './preview/LivePreview'
import { CodeEditor } from './code-view/CodeEditor'
import { ElementFloatingBar } from './element-panel/ElementFloatingBar'
import { LayersPanel } from './layers/LayersPanel'
import type { EditorInitialData } from '@/lib/editor/load-editor-data'

interface EditorProps {
  siteId: string
  pageId: string
  isEmbedded?: boolean
  initialData?: EditorInitialData
}

export function Editor({ siteId, pageId, isEmbedded = false, initialData }: EditorProps) {
  const viewMode = useEditorStore((s) => s.viewMode)
  const selectedElement = useEditorStore((s) => s.selectedElement)
  const showLayersPanel = useEditorStore((s) => s.showLayersPanel)
  const initialize = useEditorStore((s) => s.initialize)
  const initializeWithData = useEditorStore((s) => s.initializeWithData)
  const reset = useEditorStore((s) => s.reset)
  const save = useEditorStore((s) => s.save)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const clearSelection = useEditorStore((s) => s.clearSelection)

  // Initialize editor on mount
  useEffect(() => {
    if (initialData) {
      // Use pre-loaded data for embedded/WordPress mode
      initializeWithData(siteId, pageId, initialData)
    } else {
      // Normal mode - fetch data client-side
      initialize(siteId, pageId)
    }

    return () => {
      reset()
    }
  }, [siteId, pageId, initialize, initializeWithData, reset, initialData])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      if (isMeta && e.key === 's') {
        e.preventDefault()
        save()
      }

      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      if ((isMeta && e.key === 'z' && e.shiftKey) || (isMeta && e.key === 'y')) {
        e.preventDefault()
        redo()
      }

      if (e.key === 'Escape') {
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [save, undo, redo, clearSelection])

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950">
      {/* Toolbar */}
      <Toolbar siteId={siteId} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (fixed width) */}
        <div className="w-[420px] min-w-[420px] max-w-[420px] flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <ChatPanel />
        </div>

        {/* Center - Preview oder Code */}
        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
          {viewMode === 'code' ? (
            <CodeEditor />
          ) : (
            <LivePreview />
          )}

          {/* Floating Element Bar (Figma-style) */}
          {viewMode === 'design' && selectedElement && (
            <ElementFloatingBar />
          )}
        </div>

        {/* Right Panel - Layers (when active) */}
        {showLayersPanel && (
          <LayersPanel />
        )}
      </div>
    </div>
  )
}
