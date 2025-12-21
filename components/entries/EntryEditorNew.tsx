'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useEntryEditorStore } from '@/stores/entry-editor-store'
import { EntryToolbar } from './toolbar/EntryToolbar'
import { EntryChatPanel } from './chat/EntryChatPanel'
import { EntryPreview } from './preview/EntryPreview'
import { EntryFieldsPanel } from './panels/EntryFieldsPanel'
import { Textarea } from '@/components/ui/textarea'

interface EntryEditorNewProps {
  siteId: string
  entryId?: string
  contentTypeSlug?: string
}

export function EntryEditorNew({ siteId, entryId, contentTypeSlug }: EntryEditorNewProps) {
  const router = useRouter()
  const hasRedirected = useRef(false)

  const viewMode = useEntryEditorStore((s) => s.viewMode)
  const showFieldsPanel = useEntryEditorStore((s) => s.showFieldsPanel)
  const content = useEntryEditorStore((s) => s.content)
  const storedEntryId = useEntryEditorStore((s) => s.entryId)
  const contentType = useEntryEditorStore((s) => s.contentType)
  const initialize = useEntryEditorStore((s) => s.initialize)
  const reset = useEntryEditorStore((s) => s.reset)
  const save = useEntryEditorStore((s) => s.save)
  const undo = useEntryEditorStore((s) => s.undo)
  const redo = useEntryEditorStore((s) => s.redo)
  const clearSelection = useEntryEditorStore((s) => s.clearSelection)
  const setContent = useEntryEditorStore((s) => s.setContent)

  // Initialize editor on mount
  useEffect(() => {
    initialize(siteId, entryId, contentTypeSlug)

    return () => {
      reset()
    }
  }, [siteId, entryId, contentTypeSlug, initialize, reset])

  // Redirect to entry URL after first save (when new entry gets an ID)
  useEffect(() => {
    if (storedEntryId && !entryId && contentType && !hasRedirected.current) {
      hasRedirected.current = true
      router.replace(`/dashboard/sites/${siteId}/content/${contentType.slug}/${storedEntryId}`)
    }
  }, [storedEntryId, entryId, contentType, siteId, router])

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
      <EntryToolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat (fixed width) */}
        <div className="w-[420px] min-w-[420px] max-w-[420px] flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <EntryChatPanel />
        </div>

        {/* Center - Preview oder Code */}
        <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950">
          {viewMode === 'code' ? (
            <div className="h-full flex flex-col bg-zinc-950">
              <div className="h-10 px-4 flex items-center bg-zinc-900 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Content HTML</span>
              </div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-zinc-950 border-0 text-white font-mono text-sm rounded-none resize-none focus-visible:ring-0"
                placeholder="HTML Content..."
              />
            </div>
          ) : (
            <EntryPreview />
          )}
        </div>

        {/* Right Panel - Fields */}
        {showFieldsPanel && <EntryFieldsPanel />}
      </div>
    </div>
  )
}
