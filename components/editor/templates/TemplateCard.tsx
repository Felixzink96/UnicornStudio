'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutTemplate, Plus, Eye } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  html_content: string
  css: string | null
  js: string | null
  category: string | null
  tags: string[] | null
  thumbnail_url: string | null
}

interface TemplateCardProps {
  template: Template
  onInsert: () => void
}

export function TemplateCard({ template, onInsert }: TemplateCardProps) {
  const [showPreview, setShowPreview] = useState(false)

  return (
    <>
      <div className="group relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all">
        {/* Thumbnail */}
        <div className="aspect-video bg-slate-950 relative overflow-hidden">
          {template.thumbnail_url ? (
            <img
              src={template.thumbnail_url}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <LayoutTemplate className="h-8 w-8 text-slate-700" />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-1" />
              Vorschau
            </Button>
            <Button size="sm" onClick={onInsert}>
              <Plus className="h-4 w-4 mr-1" />
              Einfügen
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-white text-sm truncate">{template.name}</h3>
          {template.description && (
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {template.description}
            </p>
          )}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 border-slate-700 text-slate-400"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Header */}
            <div className="sticky top-0 bg-slate-900 p-4 flex items-center justify-between border-b border-slate-700">
              <div>
                <h3 className="font-semibold text-white">{template.name}</h3>
                {template.description && (
                  <p className="text-sm text-slate-400">{template.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Schließen
                </Button>
                <Button onClick={() => { onInsert(); setShowPreview(false); }}>
                  <Plus className="h-4 w-4 mr-1" />
                  Einfügen
                </Button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-4">
              {template.css && (
                <style dangerouslySetInnerHTML={{ __html: template.css }} />
              )}
              <div dangerouslySetInnerHTML={{ __html: template.html_content }} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
