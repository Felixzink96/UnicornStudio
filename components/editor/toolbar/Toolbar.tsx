'use client'

import Link from 'next/link'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'
import type { ViewMode, Breakpoint } from '@/types/editor'
import { PublishDropdown } from './PublishDropdown'
import { useWordPress } from '@/hooks/useWordPress'

interface ToolbarProps {
  siteId: string
}

export function Toolbar({ siteId }: ToolbarProps) {
  const viewMode = useEditorStore((s) => s.viewMode)
  const breakpoint = useEditorStore((s) => s.breakpoint)
  const pages = useEditorStore((s) => s.pages)
  const currentPage = useEditorStore((s) => s.currentPage)
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

  const handleSave = async () => {
    try {
      await save()
    } catch (error) {
      console.error('Save failed:', error)
    }
  }

  return (
    <TooltipProvider>
      <div className="h-12 bg-white border-b border-zinc-200 flex items-center justify-between px-3">
        {/* Left Section */}
        <div className="flex items-center gap-2">
          {/* Back Button */}
          <Link href={`/dashboard/sites/${siteId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>

          <Separator orientation="vertical" className="h-5" />

          {/* Chats Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600">
                <MessageSquare className="h-4 w-4" />
                Chats
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Current Chat</DropdownMenuItem>
              <DropdownMenuItem>New Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Pages Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600">
                <FileText className="h-4 w-4" />
                Pages - {currentPage?.name || 'home'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {pages.map((page) => (
                <DropdownMenuItem
                  key={page.id}
                  onClick={() => loadPage(page.id)}
                >
                  {page.name} {page.isHome && '(Home)'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center Section - View Mode Tabs */}
        <div className="flex items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList className="h-8 bg-zinc-100">
              <TabsTrigger value="preview" className="text-xs px-3 h-6">
                Preview
              </TabsTrigger>
              <TabsTrigger value="design" className="text-xs px-3 h-6">
                Design
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs px-3 h-6">
                Code
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Play Button */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Play className="h-4 w-4" />
          </Button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Fonts */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 text-xs">
            <Type className="h-4 w-4" />
            Fonts
          </Button>

          {/* Colors */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 text-xs">
            <Palette className="h-4 w-4" />
            Colors
          </Button>

          {/* Assets */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600 text-xs">
            <Image className="h-4 w-4" />
            Assets
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Save Button */}
          <Button
            variant={hasUnsavedChanges ? 'default' : 'outline'}
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className={hasUnsavedChanges ? 'bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5' : 'gap-1.5'}
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>

          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={undo}
                disabled={!canUndo()}
                className="h-8 w-8"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={redo}
                disabled={!canRedo()}
                className="h-8 w-8"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Breakpoint Selector */}
          <Tabs
            value={breakpoint}
            onValueChange={(v) => setBreakpoint(v as Breakpoint)}
          >
            <TabsList className="h-8 bg-zinc-100">
              <TabsTrigger value="desktop" className="h-6 px-2">
                <Monitor className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="tablet" className="h-6 px-2">
                <Tablet className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="mobile" className="h-6 px-2">
                <Smartphone className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Layers Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showLayersPanel ? 'secondary' : 'ghost'}
                size="sm"
                onClick={toggleLayersPanel}
                className={`gap-1.5 ${showLayersPanel ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600'}`}
              >
                <Layers className="h-4 w-4" />
                Layers
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle Layers Panel</TooltipContent>
          </Tooltip>

          {/* Export */}
          <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-600">
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Publish */}
          <PublishDropdown
            siteId={siteId}
            wordPressConfig={wordpress.config}
            wordPressStatus={wordpress.status}
            lastPushedAt={wordpress.lastPushedAt}
            isPublishing={wordpress.isPublishing}
            onPublishWordPress={wordpress.publishToWordPress}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
