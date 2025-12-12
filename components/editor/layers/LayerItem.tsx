'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayerNode {
  id: string
  tagName: string
  className: string
  selector: string
  children: LayerNode[]
  depth: number
  index: number
  parentSelector: string
}

interface LayerItemProps {
  node: LayerNode
  isExpanded: boolean
  hasChildren: boolean
  isSelected: boolean
  isDropTarget?: boolean
  level: number
  onToggle: () => void
  onSelect: () => void
}

// Tag icons/colors based on element type
const getTagStyle = (tagName: string) => {
  switch (tagName) {
    case 'section':
      return { color: 'text-purple-400', bg: 'bg-purple-500/20' }
    case 'header':
    case 'footer':
    case 'nav':
      return { color: 'text-blue-400', bg: 'bg-blue-500/20' }
    case 'div':
      return { color: 'text-zinc-400', bg: 'bg-zinc-500/20' }
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return { color: 'text-orange-400', bg: 'bg-orange-500/20' }
    case 'p':
    case 'span':
    case 'a':
      return { color: 'text-green-400', bg: 'bg-green-500/20' }
    case 'img':
    case 'video':
    case 'svg':
      return { color: 'text-pink-400', bg: 'bg-pink-500/20' }
    case 'button':
    case 'input':
    case 'form':
      return { color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
    case 'ul':
    case 'ol':
    case 'li':
      return { color: 'text-cyan-400', bg: 'bg-cyan-500/20' }
    case 'body':
      return { color: 'text-red-400', bg: 'bg-red-500/20' }
    default:
      return { color: 'text-zinc-400', bg: 'bg-zinc-500/20' }
  }
}

export function LayerItem({
  node,
  isExpanded,
  hasChildren,
  isSelected,
  isDropTarget,
  level,
  onToggle,
  onSelect,
}: LayerItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const tagStyle = getTagStyle(node.tagName)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 py-1 px-1 rounded-md text-sm transition-colors cursor-pointer',
        isSelected ? 'bg-blue-500/20 text-white ring-1 ring-blue-500' : 'hover:bg-zinc-800 text-zinc-300',
        isDragging && 'opacity-50 bg-zinc-800',
        isDropTarget && 'bg-green-500/20 ring-1 ring-green-500'
      )}
      onClick={onSelect}
    >
      {/* Indent based on level */}
      <div style={{ width: level * 12 }} className="flex-shrink-0" />

      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="p-0.5 text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3" />
      </div>

      {/* Expand/Collapse */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </button>
      ) : (
        <div className="w-4" />
      )}

      {/* Tag name */}
      <span
        className={cn(
          'px-1.5 py-0.5 rounded text-[10px] font-mono',
          tagStyle.color,
          tagStyle.bg
        )}
      >
        {node.tagName}
      </span>

      {/* Class name (truncated) */}
      {node.className && (
        <span className="text-zinc-500 text-[10px] truncate max-w-24">
          .{node.className.split(' ')[0]}
        </span>
      )}
    </div>
  )
}
