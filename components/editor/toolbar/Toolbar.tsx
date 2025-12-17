'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeft,
  Save,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Download,
  Type,
  Palette,
  Image,
  Play,
  X,
  ChevronDown,
  MessageSquare,
  FileText,
  Layers,
  LayoutTemplate,
  Settings2,
  Share2,
  Wrench,
  Eye,
  Code,
} from 'lucide-react'
import type { ViewMode, Breakpoint } from '@/types/editor'
import { PublishDropdown } from './PublishDropdown'
import { DesignSettingsDropdown } from './DesignSettingsDropdown'
import { WordPressSetupModal } from './WordPressSetupModal'
import { useWordPress } from '@/hooks/useWordPress'
import { ComponentLibraryModal } from '../global-components/ComponentLibraryModal'
import { PageSettingsPanel } from '../global-components/PageSettingsPanel'
import { ShareLinkDialog } from '../share/ShareLinkDialog'
import { toast } from '@/components/ui/use-toast'

interface ToolbarProps {
  siteId: string
}

export function Toolbar({ siteId }: ToolbarProps) {
  const viewMode = useEditorStore((s) => s.viewMode)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const pages = useEditorStore((s) => s.pages)
  const currentPage = useEditorStore((s) => s.currentPage)
  const pageId = useEditorStore((s) => s.pageId)
  const hasUnsavedChanges = useEditorStore((s) => s.hasUnsavedChanges)
  const isSaving = useEditorStore((s) => s.isSaving)

  const setViewMode = useEditorStore((s) => s.setViewMode)
  const setBreakpoint = useEditorStore((s) => s.setBreakpoint)
  const loadPage = useEditorStore((s) => s.loadPage)
  const save = useEditorStore((s) => s.save)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const canUndo = useEditorStore((s) => s.canUndo)
  const canRedo = useEditorStore((s) => s.canRedo)
  const showLayersPanel = useEditorStore((s) => s.showLayersPanel)
  const toggleLayersPanel = useEditorStore((s) => s.toggleLayersPanel)

  // WordPress integration
  const wordpress = useWordPress(siteId)

  // Global Components State
  const [showComponentLibrary, setShowComponentLibrary] = useState(false)
  const [showPageSettings, setShowPageSettings] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showWordPressSetup, setShowWordPressSetup] = useState(false)

  const handleSave = async () => {
    try {
      await save()
      toast.success('Gespeichert', 'Änderungen wurden gespeichert.')
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Fehler beim Speichern', 'Die Änderungen konnten nicht gespeichert werden.')
    }
  }

  return (
    <TooltipProvider>
      <div className="h-11 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center">
        {/* Left Section - Logo & Page Name */}
        <div className="w-[420px] min-w-[420px] flex items-center gap-2 px-3 border-r border-zinc-200 dark:border-zinc-800">
          {/* Back Button - minimal */}
          <Link href={`/dashboard/sites/${siteId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          {/* Page Selector - Figma style with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors cursor-pointer">
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                  {currentPage?.name || 'Home'}
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              {pages.map((page) => (
                <DropdownMenuItem
                  key={page.id}
                  onClick={() => loadPage(page.id)}
                  className="cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5 mr-2 text-zinc-400" />
                  {page.name} {page.isHome && <span className="text-xs text-zinc-400 ml-1">(Home)</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center Section - View Mode */}
        <div className="flex-1 flex items-center justify-between px-3">
          {/* View Mode Tabs - Figma style clean tabs */}
          <div className="flex items-center gap-1">
            {/* Preview/Code Toggle - Figma style */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                onClick={() => setViewMode('design')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'design'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Design
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'code'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                Code
              </button>
            </div>

            {/* Breakpoint Selector - minimal icons */}
            <div className="flex items-center ml-2 gap-0.5">
              {[
                { value: 'desktop', icon: Monitor },
                { value: 'tablet', icon: Tablet },
                { value: 'mobile', icon: Smartphone },
              ].map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setBreakpoint(value as Breakpoint)}
                  className={`p-1.5 rounded transition-colors ${
                    breakpoint === value
                      ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Right Section - Figma style minimal */}
          <div className="flex items-center gap-1">
            {/* Design Settings Dropdown - global settings */}
            <DesignSettingsDropdown siteId={siteId} />

            {/* Tool icons - minimal */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowComponentLibrary(true)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                >
                  <LayoutTemplate className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Komponenten</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowPageSettings(true)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                >
                  <Settings2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Einstellungen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleLayersPanel}
                  className={`p-1.5 rounded transition-colors ${
                    showLayersPanel
                      ? 'text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Layers className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Ebenen</TooltipContent>
            </Tooltip>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            {/* Undo/Redo - minimal */}
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 rounded transition-colors"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 disabled:opacity-30 rounded transition-colors"
            >
              <Redo2 className="h-4 w-4" />
            </button>

            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

            {/* Share */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Teilen</TooltipContent>
            </Tooltip>

            {/* Save Button - always visible */}
            {hasUnsavedChanges && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="ml-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                {isSaving ? 'Speichert...' : 'Speichern'}
              </button>
            )}

            {/* Publish - WordPress verbunden oder Setup */}
            {wordpress.config?.enabled && wordpress.config?.api_url ? (
              <PublishDropdown
                siteId={siteId}
                pageId={pageId}
                wordPressConfig={wordpress.config}
                wordPressStatus={wordpress.status}
                lastPushedAt={wordpress.lastPushedAt}
                isPublishing={wordpress.isPublishing}
                onPublishWordPress={wordpress.publishToWordPress}
              />
            ) : (
              <button
                onClick={() => setShowWordPressSetup(true)}
                className="ml-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Component Library Modal */}
      <ComponentLibraryModal
        open={showComponentLibrary}
        onClose={() => setShowComponentLibrary(false)}
        siteId={siteId}
        onInsert={(component) => {
          // TODO: Insert component HTML into page
          console.log('Insert component:', component.name)
          setShowComponentLibrary(false)
        }}
        onEdit={(component) => {
          // TODO: Open component for editing
          console.log('Edit component:', component.name)
          setShowComponentLibrary(false)
        }}
      />

      {/* Page Settings Panel */}
      {pageId && (
        <PageSettingsPanel
          open={showPageSettings}
          onClose={() => setShowPageSettings(false)}
          siteId={siteId}
          pageId={pageId}
          onUpdate={() => {
            // Refresh page data
            loadPage(pageId)
          }}
        />
      )}

      {/* Share Link Dialog */}
      <ShareLinkDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        siteId={siteId}
        pageId={pageId || undefined}
        siteName={currentPage?.name || 'Site'}
        pageName={currentPage?.name}
      />

      {/* WordPress Setup Modal */}
      <WordPressSetupModal
        open={showWordPressSetup}
        onOpenChange={setShowWordPressSetup}
        siteId={siteId}
        onComplete={() => {
          // Reload WordPress config
          wordpress.refresh?.()
        }}
      />
    </TooltipProvider>
  )
}
