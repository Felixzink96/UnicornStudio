'use client'

import { useEffect, useRef } from 'react'
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Layers,
  Image as ImageIcon,
  Code,
  Scissors,
  ClipboardPaste,
} from 'lucide-react'

interface ContextMenuItem {
  label: string
  icon: React.ReactNode
  action: string
  shortcut?: string
  divider?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  element: {
    tagName: string
    selector: string
    outerHTML: string
  } | null
  onAction: (action: string) => void
  onClose: () => void
}

export function ContextMenu({ x, y, element, onAction, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`
      }
    }
  }, [x, y])

  if (!element) return null

  const isImage = element.tagName === 'IMG'

  const menuItems: ContextMenuItem[] = [
    {
      label: 'Als Komponente speichern',
      icon: <Save className="w-4 h-4" />,
      action: 'save-component',
      shortcut: '⌘S',
    },
    {
      label: 'Duplizieren',
      icon: <Copy className="w-4 h-4" />,
      action: 'duplicate',
      shortcut: '⌘D',
      divider: true,
    },
    {
      label: 'Parent auswählen',
      icon: <ArrowUp className="w-4 h-4" />,
      action: 'select-parent',
      shortcut: '↑',
    },
    {
      label: 'Child auswählen',
      icon: <ArrowDown className="w-4 h-4" />,
      action: 'select-child',
      shortcut: '↓',
      divider: true,
    },
    ...(isImage ? [{
      label: 'Bild ersetzen',
      icon: <ImageIcon className="w-4 h-4" />,
      action: 'replace-image',
    }] : []),
    {
      label: 'HTML kopieren',
      icon: <Code className="w-4 h-4" />,
      action: 'copy-html',
      shortcut: '⌘C',
    },
    {
      label: 'Ausschneiden',
      icon: <Scissors className="w-4 h-4" />,
      action: 'cut',
      shortcut: '⌘X',
    },
    {
      label: 'Einfügen',
      icon: <ClipboardPaste className="w-4 h-4" />,
      action: 'paste',
      shortcut: '⌘V',
      divider: true,
    },
    {
      label: 'Löschen',
      icon: <Trash2 className="w-4 h-4 text-red-500" />,
      action: 'delete',
      shortcut: '⌫',
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-zinc-200 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: x, top: y }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-zinc-100">
        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
          {element.tagName}
        </span>
      </div>

      {/* Items */}
      <div className="py-1">
        {menuItems.map((item, index) => (
          <div key={item.action}>
            <button
              onClick={() => {
                onAction(item.action)
                onClose()
              }}
              disabled={item.disabled}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              {item.shortcut && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  {item.shortcut}
                </span>
              )}
            </button>
            {item.divider && <div className="my-1 border-t border-zinc-100" />}
          </div>
        ))}
      </div>
    </div>
  )
}
