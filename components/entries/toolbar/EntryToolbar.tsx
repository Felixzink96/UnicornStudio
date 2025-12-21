'use client'

import Link from 'next/link'
import { useEntryEditorStore } from '@/stores/entry-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Code,
  MousePointer2,
  Undo2,
  Redo2,
  Save,
  Loader2,
  Layers,
  Settings,
  ExternalLink,
  CheckCircle,
} from 'lucide-react'
import type { Breakpoint, ViewMode } from '@/types/editor'

export function EntryToolbar() {
  const siteId = useEntryEditorStore((s) => s.siteId)
  const entryId = useEntryEditorStore((s) => s.entryId)
  const contentType = useEntryEditorStore((s) => s.contentType)
  const title = useEntryEditorStore((s) => s.title)
  const slug = useEntryEditorStore((s) => s.slug)
  const status = useEntryEditorStore((s) => s.status)
  const viewMode = useEntryEditorStore((s) => s.viewMode)
  const breakpoint = useEntryEditorStore((s) => s.breakpoint)
  const hasUnsavedChanges = useEntryEditorStore((s) => s.hasUnsavedChanges)
  const isSaving = useEntryEditorStore((s) => s.isSaving)
  const showFieldsPanel = useEntryEditorStore((s) => s.showFieldsPanel)
  const showSettingsPanel = useEntryEditorStore((s) => s.showSettingsPanel)

  const setTitle = useEntryEditorStore((s) => s.setTitle)
  const setViewMode = useEntryEditorStore((s) => s.setViewMode)
  const setBreakpoint = useEntryEditorStore((s) => s.setBreakpoint)
  const save = useEntryEditorStore((s) => s.save)
  const publish = useEntryEditorStore((s) => s.publish)
  const undo = useEntryEditorStore((s) => s.undo)
  const redo = useEntryEditorStore((s) => s.redo)
  const canUndo = useEntryEditorStore((s) => s.canUndo)
  const canRedo = useEntryEditorStore((s) => s.canRedo)
  const toggleFieldsPanel = useEntryEditorStore((s) => s.toggleFieldsPanel)
  const toggleSettingsPanel = useEntryEditorStore((s) => s.toggleSettingsPanel)

  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'preview', icon: <Eye className="h-4 w-4" />, label: 'Vorschau' },
    { mode: 'design', icon: <MousePointer2 className="h-4 w-4" />, label: 'Design' },
    { mode: 'code', icon: <Code className="h-4 w-4" />, label: 'Code' },
  ]

  const breakpoints: { bp: Breakpoint; icon: React.ReactNode; label: string }[] = [
    { bp: 'desktop', icon: <Monitor className="h-4 w-4" />, label: 'Desktop' },
    { bp: 'tablet', icon: <Tablet className="h-4 w-4" />, label: 'Tablet' },
    { bp: 'mobile', icon: <Smartphone className="h-4 w-4" />, label: 'Mobile' },
  ]

  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Entwurf', color: 'bg-yellow-500' },
    published: { label: 'Veröffentlicht', color: 'bg-green-500' },
    scheduled: { label: 'Geplant', color: 'bg-blue-500' },
    archived: { label: 'Archiviert', color: 'bg-gray-500' },
  }

  const statusInfo = statusLabels[status] || statusLabels.draft

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-14 px-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={siteId && contentType ? `/dashboard/sites/${siteId}/content/${contentType.slug}` : '/dashboard'}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Zurück zu {contentType?.label_plural || 'Einträge'}</TooltipContent>
          </Tooltip>

          {/* Entry Title */}
          <div className="flex items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-64 h-9 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              placeholder={`${contentType?.label_singular || 'Eintrag'} Titel`}
            />
            <div className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${statusInfo.color}`}
              />
              <span className="text-xs text-zinc-500">{statusInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Center Section - View Mode & Breakpoints */}
        <div className="flex items-center gap-2">
          {/* View Mode */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {viewModes.map(({ mode, icon, label }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setViewMode(mode)}
                    className={`p-1.5 rounded transition-colors ${
                      viewMode === mode
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* Breakpoints */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {breakpoints.map(({ bp, icon, label }) => (
              <Tooltip key={bp}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setBreakpoint(bp)}
                    className={`p-1.5 rounded transition-colors ${
                      breakpoint === bp
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    {icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={undo}
                  disabled={!canUndo()}
                  className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Rückgängig (⌘Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={redo}
                  disabled={!canRedo()}
                  className="p-1.5 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Wiederholen (⌘⇧Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Fields Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleFieldsPanel}
                className={`p-2 rounded-lg transition-colors ${
                  showFieldsPanel
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Layers className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Felder</TooltipContent>
          </Tooltip>

          {/* Settings Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleSettingsPanel}
                className={`p-2 rounded-lg transition-colors ${
                  showSettingsPanel
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Einstellungen</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {/* View Live (only if saved) */}
          {entryId && slug && contentType && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `/api/v1/sites/${siteId}/render/${contentType.slug}/${slug}`,
                      '_blank'
                    )
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Ansehen
                </Button>
              </TooltipTrigger>
              <TooltipContent>Live-Seite öffnen</TooltipContent>
            </Tooltip>
          )}

          {/* Save Button */}
          <Button
            onClick={() => save()}
            disabled={isSaving || !hasUnsavedChanges}
            variant="outline"
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Speichern
          </Button>

          {/* Publish Button */}
          <Button
            onClick={publish}
            disabled={isSaving}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Veröffentlichen
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
