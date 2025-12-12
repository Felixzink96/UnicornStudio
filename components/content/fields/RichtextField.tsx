'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Link, List, Heading2 } from 'lucide-react'
import { FieldWrapper, type FieldRendererProps } from './index'

export function RichtextField({ field, value, onChange, error, disabled }: FieldRendererProps) {
  // Simple rich text editor - in production, use a proper library like TipTap or Slate
  const settings = field.settings || {}
  const toolbar = (settings.toolbar as string[]) || ['bold', 'italic', 'link', 'list']

  const [content, setContent] = useState((value as string) || '')

  const handleChange = (newContent: string) => {
    setContent(newContent)
    onChange(newContent)
  }

  return (
    <FieldWrapper field={field} error={error}>
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 bg-slate-800 border-b border-slate-700">
          {toolbar.includes('bold') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              disabled={disabled}
            >
              <Bold className="h-4 w-4" />
            </Button>
          )}
          {toolbar.includes('italic') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              disabled={disabled}
            >
              <Italic className="h-4 w-4" />
            </Button>
          )}
          {toolbar.includes('link') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              disabled={disabled}
            >
              <Link className="h-4 w-4" />
            </Button>
          )}
          {toolbar.includes('list') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              disabled={disabled}
            >
              <List className="h-4 w-4" />
            </Button>
          )}
          {toolbar.includes('heading') && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              disabled={disabled}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        {/* Editor */}
        <Textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={field.placeholder || 'Inhalt eingeben...'}
          disabled={disabled}
          className="bg-slate-900 border-0 text-white resize-y min-h-[200px] rounded-none focus-visible:ring-0"
        />
      </div>
      <p className="text-xs text-slate-500">
        Tipp: Verwende Markdown-Syntax für Formatierungen
      </p>
    </FieldWrapper>
  )
}
