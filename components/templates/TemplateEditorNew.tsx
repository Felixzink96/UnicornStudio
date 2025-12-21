'use client'

import { useEffect } from 'react'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { TemplateToolbar } from './toolbar/TemplateToolbar'
import { TemplateChatPanel } from './chat/TemplateChatPanel'
import { TemplatePreview } from './preview/TemplatePreview'
import { TemplateCodeEditor } from './code/TemplateCodeEditor'
import { TemplateVariablesPanel } from './panels/TemplateVariablesPanel'
import { TemplateSettingsPanel } from './panels/TemplateSettingsPanel'

interface TemplateEditorNewProps {
  siteId: string
  templateId: string
}

export function TemplateEditorNew({ siteId, templateId }: TemplateEditorNewProps) {
  const viewMode = useTemplateEditorStore((s) => s.viewMode)
  const showVariablesPanel = useTemplateEditorStore((s) => s.showVariablesPanel)
  const showSettingsPanel = useTemplateEditorStore((s) => s.showSettingsPanel)
  const initialize = useTemplateEditorStore((s) => s.initialize)
  const reset = useTemplateEditorStore((s) => s.reset)
  const save = useTemplateEditorStore((s) => s.save)
  const undo = useTemplateEditorStore((s) => s.undo)
  const redo = useTemplateEditorStore((s) => s.redo)
  const clearSelection = useTemplateEditorStore((s) => s.clearSelection)

  // Initialize editor on mount
  useEffect(() => {
    initialize(siteId, templateId)

    return () => {
      reset()
    }
  }, [siteId, templateId, initialize, reset])

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
      <TemplateToolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (fixed width) */}
        <div className="w-[420px] min-w-[420px] max-w-[420px] flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <TemplateChatPanel />
        </div>

        {/* Center - Preview oder Code */}
        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
          {viewMode === 'code' ? (
            <TemplateCodeEditor />
          ) : (
            <TemplatePreview />
          )}
        </div>

        {/* Right Panels */}
        {showVariablesPanel && <TemplateVariablesPanel />}
        {showSettingsPanel && <TemplateSettingsPanel />}
      </div>
    </div>
  )
}
