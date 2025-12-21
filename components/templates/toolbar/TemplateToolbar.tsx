'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTemplateEditorStore } from '@/stores/template-editor-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Braces,
  ExternalLink,
  ChevronDown,
} from 'lucide-react'
import type { Breakpoint, ViewMode } from '@/types/editor'

export function TemplateToolbar() {
  const siteId = useTemplateEditorStore((s) => s.siteId)
  const templateId = useTemplateEditorStore((s) => s.templateId)
  const name = useTemplateEditorStore((s) => s.name)
  const templateType = useTemplateEditorStore((s) => s.templateType)
  const contentType = useTemplateEditorStore((s) => s.contentType)
  const viewMode = useTemplateEditorStore((s) => s.viewMode)
  const breakpoint = useTemplateEditorStore((s) => s.breakpoint)
  const hasUnsavedChanges = useTemplateEditorStore((s) => s.hasUnsavedChanges)
  const isSaving = useTemplateEditorStore((s) => s.isSaving)
  const showVariablesPanel = useTemplateEditorStore((s) => s.showVariablesPanel)
  const showSettingsPanel = useTemplateEditorStore((s) => s.showSettingsPanel)
  const showLayersPanel = useTemplateEditorStore((s) => s.showLayersPanel)

  const setName = useTemplateEditorStore((s) => s.setName)
  const setViewMode = useTemplateEditorStore((s) => s.setViewMode)
  const setBreakpoint = useTemplateEditorStore((s) => s.setBreakpoint)
  const save = useTemplateEditorStore((s) => s.save)
  const undo = useTemplateEditorStore((s) => s.undo)
  const redo = useTemplateEditorStore((s) => s.redo)
  const canUndo = useTemplateEditorStore((s) => s.canUndo)
  const canRedo = useTemplateEditorStore((s) => s.canRedo)
  const toggleVariablesPanel = useTemplateEditorStore((s) => s.toggleVariablesPanel)
  const toggleSettingsPanel = useTemplateEditorStore((s) => s.toggleSettingsPanel)
  const toggleLayersPanel = useTemplateEditorStore((s) => s.toggleLayersPanel)

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

  const templateTypeLabels: Record<string, string> = {
    page: 'Seite',
    single: 'Einzelansicht',
    archive: 'Archiv',
    taxonomy: 'Taxonomie',
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-14 px-4 flex items-center justify-between bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={siteId ? `/dashboard/sites/${siteId}/templates` : '/dashboard'}
                className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Zurück zu Templates</TooltipContent>
          </Tooltip>

          {/* Template Name */}
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-64 h-9 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              placeholder="Template Name"
            />
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                {templateTypeLabels[templateType] || templateType}
              </span>
              {contentType && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                  {contentType.label_plural}
                </span>
              )}
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
          {/* Variables Panel Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleVariablesPanel}
                className={`p-2 rounded-lg transition-colors ${
                  showVariablesPanel
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Braces className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Template-Variablen</TooltipContent>
          </Tooltip>

          {/* Layers Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleLayersPanel}
                className={`p-2 rounded-lg transition-colors ${
                  showLayersPanel
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Layers className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Ebenen</TooltipContent>
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

          {/* View Live */}
          {contentType && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(
                      `/api/v1/sites/${siteId}/render/${contentType.slug}`,
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
            onClick={save}
            disabled={isSaving || !hasUnsavedChanges}
            size="sm"
            className={hasUnsavedChanges ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Speichern
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}
