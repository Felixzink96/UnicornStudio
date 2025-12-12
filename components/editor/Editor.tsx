'use client'

import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Toolbar } from './toolbar/Toolbar'
import { ChatPanel } from './chat/ChatPanel'
import { LivePreview } from './preview/LivePreview'
import { CodeEditor } from './code-view/CodeEditor'
import { ElementPanel } from './element-panel/ElementPanel'
import { LayersPanel } from './layers/LayersPanel'

interface EditorProps {
  siteId: string
  pageId: string
}

export function Editor({ siteId, pageId }: EditorProps) {
  const viewMode = useEditorStore((s) => s.viewMode)
  const selectedElement = useEditorStore((s) => s.selectedElement)
  const showLayersPanel = useEditorStore((s) => s.showLayersPanel)
  const initialize = useEditorStore((s) => s.initialize)
  const reset = useEditorStore((s) => s.reset)
  const save = useEditorStore((s) => s.save)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const clearSelection = useEditorStore((s) => s.clearSelection)

  // Initialize editor on mount
  useEffect(() => {
    initialize(siteId, pageId)

    return () => {
      reset()
    }
  }, [siteId, pageId, initialize, reset])

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
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Toolbar */}
      <Toolbar siteId={siteId} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (fixed width) */}
        <div className="w-[420px] min-w-[420px] max-w-[420px] flex-shrink-0 bg-white border-r border-zinc-200 overflow-hidden">
          <ChatPanel />
        </div>

        {/* Center - Preview oder Code (dunkel) */}
        <div className="flex-1 relative bg-[#0a0a0a]">
          {viewMode === 'code' ? (
            <CodeEditor />
          ) : (
            <LivePreview />
          )}

          {/* Floating Element Panel (Popup) */}
          {viewMode === 'design' && selectedElement && (
            <ElementPanel />
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
