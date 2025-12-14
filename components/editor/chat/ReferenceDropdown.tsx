'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  FileText,
  Menu,
  LayoutGrid,
  Square,
  FileEdit,
  Palette,
  X,
  Search,
  ChevronRight,
} from 'lucide-react'
import type { ReferenceGroup, Reference, ReferenceCategory } from '@/lib/references/reference-types'
import { REFERENCE_CATEGORIES } from '@/lib/references/reference-types'
import { loadAllReferences, searchReferences } from '@/lib/references/reference-resolver'

interface ReferenceDropdownProps {
  siteId: string
  currentPageHtml?: string
  isOpen: boolean
  searchQuery: string
  position: { top: number; left: number }
  onSelect: (reference: Reference) => void
  onClose: () => void
}

// Icon Mapping
const CategoryIcons: Record<ReferenceCategory, React.ComponentType<{ className?: string }>> = {
  page: FileText,
  menu: Menu,
  component: LayoutGrid,
  section: Square,
  entry: FileEdit,
  token: Palette,
}

// Kategorie Farben (Hintergrund + Text)
const CategoryColors: Record<ReferenceCategory, { bg: string; bgHover: string; text: string; border: string }> = {
  page: {
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  menu: {
    bg: 'bg-emerald-50',
    bgHover: 'hover:bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  component: {
    bg: 'bg-purple-50',
    bgHover: 'hover:bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  section: {
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  entry: {
    bg: 'bg-rose-50',
    bgHover: 'hover:bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  token: {
    bg: 'bg-cyan-50',
    bgHover: 'hover:bg-cyan-100',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
}

// Kategorie Labels (ohne Emojis)
const CategoryLabels: Record<ReferenceCategory, string> = {
  page: 'Seiten',
  menu: 'Menus',
  component: 'Components',
  section: 'Sections',
  entry: 'Eintr\u00e4ge',
  token: 'Design Tokens',
}

export function ReferenceDropdown({
  siteId,
  currentPageHtml,
  isOpen,
  searchQuery,
  onSelect,
  onClose,
}: ReferenceDropdownProps) {
  const [groups, setGroups] = useState<ReferenceGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Alle Referenzen laden
  useEffect(() => {
    if (!isOpen || !siteId) return

    const loadRefs = async () => {
      setIsLoading(true)
      try {
        const loadedGroups = await loadAllReferences({
          siteId,
          currentPageHtml,
        })
        setGroups(loadedGroups)
      } catch (error) {
        console.error('Error loading references:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRefs()
  }, [isOpen, siteId, currentPageHtml])

  // Gefilterte Gruppen basierend auf Suche
  const filteredGroups = useMemo(() => {
    return searchReferences(groups, searchQuery)
  }, [groups, searchQuery])

  // Flache Liste aller Items fur Navigation
  const flatItems = useMemo(() => {
    return filteredGroups.flatMap((group) => group.items)
  }, [filteredGroups])

  // Reset selection bei Suche
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  // Keyboard Navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatItems[selectedIndex]) {
            onSelect(flatItems[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [isOpen, flatItems, selectedIndex, onSelect, onClose]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-80 max-h-[400px] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700">Referenz waehlen</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-200 rounded-lg transition-colors"
        >
          <X className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      {/* Search Info */}
      {searchQuery && (
        <div className="px-4 py-2 bg-zinc-50/50 border-b border-zinc-100">
          <span className="text-xs text-zinc-500">
            Suche: <span className="font-medium text-zinc-700">{searchQuery}</span>
          </span>
        </div>
      )}

      {/* Content */}
      <div className="overflow-y-auto max-h-[320px]">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            <p className="mt-2 text-sm text-zinc-500">Lade Referenzen...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
              <Search className="h-6 w-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">
              {searchQuery ? 'Keine Treffer gefunden' : 'Keine Referenzen verfuegbar'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredGroups.map((group) => {
              const CategoryIcon = CategoryIcons[group.category]
              const colors = CategoryColors[group.category]
              const label = CategoryLabels[group.category]

              return (
                <div key={group.category} className="mb-1">
                  {/* Kategorie Header */}
                  <div
                    className={`mx-2 px-3 py-2 rounded-lg ${colors.bg} border ${colors.border} mb-1`}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className={`h-4 w-4 ${colors.text}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                        {label}
                      </span>
                      <span className={`text-xs ${colors.text} opacity-60`}>
                        ({group.items.length})
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-2">
                    {group.items.map((item) => {
                      const itemIndex = flatItems.indexOf(item)
                      const isSelected = itemIndex === selectedIndex

                      return (
                        <button
                          key={`${item.category}-${item.id}`}
                          className={`w-full px-3 py-2.5 text-left flex items-center gap-3 rounded-lg transition-all mb-0.5 ${
                            isSelected
                              ? `${colors.bg} ${colors.border} border`
                              : `hover:bg-zinc-50 border border-transparent`
                          }`}
                          onClick={() => onSelect(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? colors.bg : 'bg-zinc-100'
                            }`}
                          >
                            <CategoryIcon
                              className={`h-4 w-4 ${isSelected ? colors.text : 'text-zinc-500'}`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-zinc-400">@</span>
                              <span
                                className={`text-sm font-medium truncate ${
                                  isSelected ? colors.text : 'text-zinc-800'
                                }`}
                              >
                                {item.displayName}
                              </span>
                            </div>

                            {/* Zusaetzliche Info */}
                            {item.category === 'page' && (item as { slug?: string }).slug && (
                              <span className="text-xs text-zinc-400">
                                /{(item as { slug: string }).slug}
                              </span>
                            )}
                            {item.category === 'menu' && (
                              <span className="text-xs text-zinc-400">
                                {(item as { position: string }).position}
                              </span>
                            )}
                            {item.category === 'component' && (
                              <span className="text-xs text-zinc-400">
                                {(item as { position: string }).position}
                              </span>
                            )}
                            {item.category === 'section' && (
                              <span className="text-xs text-zinc-400">
                                #{item.id}
                              </span>
                            )}
                          </div>

                          {/* Color Preview for Tokens */}
                          {item.category === 'token' &&
                            (item as { tokenType: string; value: string }).tokenType === 'color' && (
                              <div
                                className="w-6 h-6 rounded-md border border-zinc-200 shadow-sm"
                                style={{
                                  backgroundColor: (item as { value: string }).value,
                                }}
                              />
                            )}

                          <ChevronRight
                            className={`h-4 w-4 flex-shrink-0 ${
                              isSelected ? colors.text : 'text-zinc-300'
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-zinc-600">
                ↑↓
              </kbd>
              <span>Navigation</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-zinc-600">
                Enter
              </kbd>
              <span>Auswaehlen</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-zinc-200 rounded text-zinc-600">
              Esc
            </kbd>
            <span>Schliessen</span>
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Badge-Komponente fuer ausgewaehlte Referenzen
 */
export function ReferenceBadge({
  reference,
  onRemove,
}: {
  reference: Reference
  onRemove: () => void
}) {
  const colors = CategoryColors[reference.category]
  const CategoryIcon = CategoryIcons[reference.category]

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
    >
      <CategoryIcon className="h-3.5 w-3.5" />
      <span>@{reference.displayName}</span>
      <button
        onClick={onRemove}
        className={`ml-0.5 p-0.5 rounded hover:bg-white/50 transition-colors`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
