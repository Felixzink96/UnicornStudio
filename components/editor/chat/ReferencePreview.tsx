'use client'

import { useState } from 'react'
import {
  Code2,
  Eye,
  Check,
  X,
  FileText,
  Menu,
  Palette,
  Square,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type {
  ReferenceUpdate,
  ComponentUpdate,
  SectionUpdate,
  TokenUpdate,
  MenuUpdate,
  EntryUpdate,
  PageUpdate,
} from '@/lib/ai/reference-operations'

interface ReferencePreviewProps {
  updates: ReferenceUpdate[]
  onApply: (updates: ReferenceUpdate[]) => Promise<void>
  onDiscard: () => void
  isApplying?: boolean
}

export function ReferencePreview({
  updates,
  onApply,
  onDiscard,
  isApplying = false,
}: ReferencePreviewProps) {
  const [expandedUpdates, setExpandedUpdates] = useState<Set<number>>(new Set([0]))
  const [viewModes, setViewModes] = useState<Record<number, 'visual' | 'code'>>({})

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedUpdates)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedUpdates(newExpanded)
  }

  const toggleViewMode = (index: number) => {
    setViewModes(prev => ({
      ...prev,
      [index]: prev[index] === 'code' ? 'visual' : 'code',
    }))
  }

  const getViewMode = (index: number) => viewModes[index] || 'visual'

  if (updates.length === 0) return null

  return (
    <div className="mt-4 border border-zinc-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700">
            {updates.length} {updates.length === 1 ? 'Aenderung' : 'Aenderungen'} bereit
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDiscard}
            disabled={isApplying}
            className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Verwerfen
          </button>
          <button
            onClick={() => onApply(updates)}
            disabled={isApplying}
            className="px-3 py-1.5 text-sm bg-zinc-900 text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isApplying ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Anwenden...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Alle anwenden
              </>
            )}
          </button>
        </div>
      </div>

      {/* Updates Liste */}
      <div className="divide-y divide-zinc-100">
        {updates.map((update, index) => (
          <div key={index} className="bg-white">
            {/* Update Header */}
            <button
              onClick={() => toggleExpanded(index)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UpdateTypeIcon type={update.type} />
                <div className="text-left">
                  <div className="text-sm font-medium text-zinc-800">
                    <UpdateTitle update={update} />
                  </div>
                  <div className="text-xs text-zinc-500">
                    <UpdateSubtitle update={update} />
                  </div>
                </div>
              </div>
              {expandedUpdates.has(index) ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {/* Update Content */}
            {expandedUpdates.has(index) && (
              <div className="px-4 pb-4">
                {/* View Toggle fuer HTML-basierte Updates */}
                {(update.type === 'component' || update.type === 'section' || update.type === 'page') && (
                  <div className="flex justify-end mb-2">
                    <div className="inline-flex rounded-lg border border-zinc-200 p-0.5">
                      <button
                        onClick={() => toggleViewMode(index)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          getViewMode(index) === 'visual'
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5 inline mr-1" />
                        Visual
                      </button>
                      <button
                        onClick={() => toggleViewMode(index)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          getViewMode(index) === 'code'
                            ? 'bg-zinc-100 text-zinc-900'
                            : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        <Code2 className="h-3.5 w-3.5 inline mr-1" />
                        Code
                      </button>
                    </div>
                  </div>
                )}

                {/* Preview Content */}
                <UpdatePreview update={update} viewMode={getViewMode(index)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Icon je nach Update-Typ
function UpdateTypeIcon({ type }: { type: ReferenceUpdate['type'] }) {
  const iconClass = "h-5 w-5"
  const containerClass = "w-8 h-8 rounded-lg flex items-center justify-center"

  switch (type) {
    case 'component':
      return (
        <div className={`${containerClass} bg-purple-100`}>
          <LayoutGrid className={`${iconClass} text-purple-600`} />
        </div>
      )
    case 'section':
      return (
        <div className={`${containerClass} bg-amber-100`}>
          <Square className={`${iconClass} text-amber-600`} />
        </div>
      )
    case 'token':
      return (
        <div className={`${containerClass} bg-cyan-100`}>
          <Palette className={`${iconClass} text-cyan-600`} />
        </div>
      )
    case 'menu':
      return (
        <div className={`${containerClass} bg-emerald-100`}>
          <Menu className={`${iconClass} text-emerald-600`} />
        </div>
      )
    case 'entry':
      return (
        <div className={`${containerClass} bg-rose-100`}>
          <FileText className={`${iconClass} text-rose-600`} />
        </div>
      )
    case 'page':
    default:
      return (
        <div className={`${containerClass} bg-blue-100`}>
          <FileText className={`${iconClass} text-blue-600`} />
        </div>
      )
  }
}

// Titel je nach Update-Typ
function UpdateTitle({ update }: { update: ReferenceUpdate }) {
  switch (update.type) {
    case 'component':
      return <>{update.componentType === 'header' ? 'Header' : 'Footer'} Update</>
    case 'section':
      return <>Section {update.selector}</>
    case 'token':
      return <>Design Token</>
    case 'menu':
      return <>Menu {update.action}</>
    case 'entry':
      return <>Entry Update</>
    case 'page':
      return <>Seiten-HTML ({update.operation})</>
    default:
      return <>Update</>
  }
}

// Untertitel je nach Update-Typ
function UpdateSubtitle({ update }: { update: ReferenceUpdate }) {
  switch (update.type) {
    case 'component':
      return <>ID: {update.id}</>
    case 'section':
      return <>Selector: {update.selector}</>
    case 'token':
      return <>Neuer Wert: {update.value}</>
    case 'menu':
      return <>{update.items?.length || 0} Items</>
    case 'entry':
      return <>ID: {update.id}</>
    case 'page':
      return <>{update.selector || 'Gesamte Seite'}</>
    default:
      return null
  }
}

// Preview Content je nach Update-Typ und View Mode
function UpdatePreview({
  update,
  viewMode,
}: {
  update: ReferenceUpdate
  viewMode: 'visual' | 'code'
}) {
  switch (update.type) {
    case 'component':
    case 'section':
    case 'page':
      const html = 'html' in update ? update.html : ''
      if (viewMode === 'code') {
        return (
          <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
            <code>{html}</code>
          </pre>
        )
      }
      return (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
                  </style>
                </head>
                <body>${html}</body>
              </html>
            `}
            className="w-full h-48 border-0"
            sandbox="allow-scripts"
          />
        </div>
      )

    case 'token':
      const tokenUpdate = update as TokenUpdate
      const isColor = tokenUpdate.value.startsWith('#') || tokenUpdate.value.startsWith('rgb')
      return (
        <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg">
          {isColor ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Neu:</span>
                <div
                  className="w-10 h-10 rounded-lg border border-zinc-200 shadow-sm"
                  style={{ backgroundColor: tokenUpdate.value }}
                />
                <span className="text-sm font-mono text-zinc-700">{tokenUpdate.value}</span>
              </div>
            </>
          ) : (
            <div className="text-sm">
              <span className="text-zinc-500">Neuer Wert:</span>{' '}
              <span className="font-medium text-zinc-900">{tokenUpdate.value}</span>
            </div>
          )}
        </div>
      )

    case 'menu':
      const menuUpdate = update as MenuUpdate
      return (
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-2">
            Aktion: <span className="font-medium text-zinc-700">{menuUpdate.action}</span>
          </div>
          {menuUpdate.items && menuUpdate.items.length > 0 && (
            <ul className="space-y-1">
              {menuUpdate.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span className="font-medium text-zinc-800">{item.label}</span>
                  {item.page && (
                    <span className="text-zinc-500">-&gt; @{item.page}</span>
                  )}
                  {item.url && (
                    <span className="text-zinc-500">-&gt; {item.url}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )

    case 'entry':
      const entryUpdate = update as EntryUpdate
      return (
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-xs text-zinc-500 mb-2">Geaenderte Felder:</div>
          <dl className="space-y-2">
            {Object.entries(entryUpdate.data).map(([key, value]) => (
              <div key={key} className="flex">
                <dt className="text-sm font-medium text-zinc-600 w-32">{key}:</dt>
                <dd className="text-sm text-zinc-800">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )

    default:
      return null
  }
}
