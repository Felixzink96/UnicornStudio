'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { LayerItem } from './LayerItem'
import { X, Layers } from 'lucide-react'

// Parse HTML into a tree structure
export interface LayerNode {
  id: string
  tagName: string
  className: string
  selector: string
  children: LayerNode[]
  depth: number
  index: number
  parentSelector: string
}

// Build a flat map of all nodes for quick lookup
function buildNodeMap(nodes: LayerNode[], map: Map<string, LayerNode> = new Map()): Map<string, LayerNode> {
  for (const node of nodes) {
    map.set(node.id, node)
    map.set(node.selector, node) // Also index by selector
    if (node.children.length > 0) {
      buildNodeMap(node.children, map)
    }
  }
  return map
}

// Find all parent IDs for a given selector
function findParentIds(nodes: LayerNode[], targetSelector: string, path: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.selector === targetSelector) {
      return path
    }
    if (node.children.length > 0) {
      const result = findParentIds(node.children, targetSelector, [...path, node.id])
      if (result) return result
    }
  }
  return null
}

// Find node by ID
function findNodeById(nodes: LayerNode[], id: string): { node: LayerNode; parent: LayerNode | null; parentIndex: number } | null {
  for (const node of nodes) {
    if (node.id === id) {
      return { node, parent: null, parentIndex: -1 }
    }
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i]
      if (child.id === id) {
        return { node: child, parent: node, parentIndex: i }
      }
      const found = findNodeById([child], id)
      if (found) {
        if (found.parent === null) {
          return { node: found.node, parent: node, parentIndex: i }
        }
        return found
      }
    }
  }
  return null
}

// Generate selector matching the Preview's getSelector() algorithm
function getSelector(element: Element): string {
  // Handle body element specially
  if (element.tagName === 'BODY') {
    return 'body'
  }

  const path: string[] = []
  let el: Element | null = element

  while (el && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
    let selector = el.tagName.toLowerCase()

    // Add id if exists
    if (el.id) {
      path.unshift('#' + el.id)
      break // ID is unique, no need to go further
    }

    // Add nth-of-type for uniqueness
    if (el.parentElement) {
      const siblings = Array.from(el.parentElement.children).filter(
        (c) => c.tagName === el!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1
        selector += `:nth-of-type(${index})`
      }
    }

    path.unshift(selector)
    el = el.parentElement
  }

  return path.join(' > ')
}

function parseHtmlToLayers(html: string): LayerNode[] {
  if (!html) return []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const body = doc.body

    if (!body) return []

    let idCounter = 0

    function buildTree(element: Element, depth: number, parentSelector: string, index: number): LayerNode | null {
      // Skip script, style, and meta elements
      if (['SCRIPT', 'STYLE', 'META', 'LINK', 'NOSCRIPT'].includes(element.tagName)) {
        return null
      }

      const tagName = element.tagName.toLowerCase()
      const className = element.className?.toString() || ''

      // Use the same selector algorithm as the Preview
      const selector = getSelector(element)

      const node: LayerNode = {
        id: `layer-${idCounter++}`,
        tagName,
        className: className.split(' ').slice(0, 3).join(' '),
        selector,
        children: [],
        depth,
        index,
        parentSelector,
      }

      // Process children
      const childElements = Array.from(element.children)
      let childIndex = 0
      childElements.forEach((child) => {
        const childNode = buildTree(child, depth + 1, selector, childIndex)
        if (childNode) {
          node.children.push(childNode)
          childIndex++
        }
      })

      return node
    }

    const bodyNode = buildTree(body, 0, '', 0)
    return bodyNode ? [bodyNode] : []
  } catch (e) {
    console.error('Error parsing HTML:', e)
    return []
  }
}

export function LayersPanel() {
  const html = useEditorStore((s) => s.html)
  const selectElement = useEditorStore((s) => s.selectElement)
  const selectedElement = useEditorStore((s) => s.selectedElement)
  const setShowLayersPanel = useEditorStore((s) => s.setShowLayersPanel)
  const moveElement = useEditorStore((s) => s.moveElement)
  const reorderSiblings = useEditorStore((s) => s.reorderSiblings)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['layer-0']))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const layers = useMemo(() => parseHtmlToLayers(html), [html])
  const nodeMap = useMemo(() => buildNodeMap(layers), [layers])

  // Auto-expand to show selected element
  useEffect(() => {
    if (selectedElement?.selector && layers.length > 0) {
      // Find the path to the selected element
      const parentIds = findParentIds(layers, selectedElement.selector)
      if (parentIds && parentIds.length > 0) {
        setExpandedNodes((prev) => {
          const next = new Set(prev)
          parentIds.forEach((id) => next.add(id))
          return next
        })
      }
    }
  }, [selectedElement?.selector, layers])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelect = useCallback((node: LayerNode) => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const element = doc.querySelector(node.selector)

    if (element) {
      // Update the store
      selectElement({
        tagName: node.tagName.toUpperCase(),
        path: node.selector.split(' > ').map((s) => s.split('.')[0].split(':')[0]),
        selector: node.selector,
        className: element.className?.toString() || '',
        textContent: element.textContent?.substring(0, 100) || '',
        innerHTML: element.innerHTML,
        outerHTML: element.outerHTML,
        rect: { top: 0, left: 0, width: 0, height: 0 },
      })

      // Send message to iframe to select and scroll to element
      const iframe = document.querySelector('iframe') as HTMLIFrameElement
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'select-element',
          selector: node.selector,
        }, '*')
      }
    }
  }, [html, selectElement])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const activeResult = findNodeById(layers, active.id as string)
    const overResult = findNodeById(layers, over.id as string)

    if (!activeResult || !overResult) return

    // Can't move root element (body)
    if (!activeResult.parent) return

    // Case 1: Same parent - simple reorder
    if (overResult.parent && activeResult.parent.id === overResult.parent.id) {
      const fromIndex = activeResult.parentIndex
      const toIndex = overResult.parentIndex
      if (fromIndex !== toIndex) {
        reorderSiblings(activeResult.parent.selector, fromIndex, toIndex)
      }
    }
    // Case 2: Dropping onto an expanded container - move inside
    else if (overResult.node.children.length > 0 && expandedNodes.has(overResult.node.id)) {
      // Move into the container at the beginning
      moveElement(
        activeResult.node.selector,
        overResult.node.selector,
        0
      )
    }
    // Case 3: Different parent - move element next to target
    else if (overResult.parent) {
      // Move to the position after the over element in its parent
      moveElement(
        activeResult.node.selector,
        overResult.parent.selector,
        overResult.parentIndex + 1
      )
    }
    // Case 4: Dropping onto body/root level container
    else if (overResult.node.children !== undefined) {
      moveElement(
        activeResult.node.selector,
        overResult.node.selector,
        overResult.node.children.length
      )
    }
  }

  // Collect all sortable IDs
  const allIds = useMemo(() => {
    const ids: string[] = []
    const collect = (nodes: LayerNode[]) => {
      for (const node of nodes) {
        ids.push(node.id)
        if (node.children.length > 0) {
          collect(node.children)
        }
      }
    }
    collect(layers)
    return ids
  }, [layers])

  const renderNode = useCallback((node: LayerNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children.length > 0
    const isSelected = selectedElement?.selector === node.selector
    const isDropTarget = overId === node.id && activeId !== node.id

    return (
      <div key={node.id}>
        <LayerItem
          node={node}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          isSelected={isSelected}
          isDropTarget={isDropTarget}
          level={level}
          onToggle={() => toggleExpand(node.id)}
          onSelect={() => handleSelect(node)}
        />
        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }, [expandedNodes, selectedElement?.selector, overId, activeId, toggleExpand, handleSelect])

  const activeNode = activeId ? findNodeById(layers, activeId)?.node : null

  return (
    <div className="w-64 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-white">Ebenen</span>
        </div>
        <button
          onClick={() => setShowLayersPanel(false)}
          className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Layers Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {layers.length === 0 ? (
          <div className="text-zinc-500 text-xs text-center py-4">
            Keine Elemente gefunden
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => setOverId(e.over?.id as string || null)}
          >
            <SortableContext
              items={allIds}
              strategy={verticalListSortingStrategy}
            >
              {layers.map((node) => renderNode(node))}
            </SortableContext>

            <DragOverlay>
              {activeNode ? (
                <div className="bg-zinc-800 border border-blue-500 rounded px-2 py-1 text-sm text-white opacity-90">
                  {activeNode.tagName}
                  {activeNode.className && (
                    <span className="text-zinc-400 ml-1">.{activeNode.className.split(' ')[0]}</span>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
