'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import {
  X,
  Copy,
  Layers,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  MoreHorizontal,
  GripHorizontal,
  Send,
  Loader2,
  Image as ImageIcon,
  Upload,
  ExternalLink,
} from 'lucide-react'
import { ImagePicker } from '../assets/ImagePicker'

// Parse spacing from Tailwind classes
function parseSpacing(classes: string, prefix: string): { t: string, r: string, b: string, l: string } {
  const result = { t: '', r: '', b: '', l: '' }
  const classArr = classes.split(' ')

  // All sides (m-4, p-4)
  const allMatch = classArr.find(c => new RegExp(`^${prefix}-(\\d+)$`).test(c))
  if (allMatch) {
    const val = allMatch.split('-')[1]
    return { t: val, r: val, b: val, l: val }
  }

  // X/Y (mx-4, my-4, px-4, py-4)
  const xMatch = classArr.find(c => new RegExp(`^${prefix}x-(\\d+)$`).test(c))
  const yMatch = classArr.find(c => new RegExp(`^${prefix}y-(\\d+)$`).test(c))
  if (xMatch) { const v = xMatch.split('-')[1]; result.l = v; result.r = v }
  if (yMatch) { const v = yMatch.split('-')[1]; result.t = v; result.b = v }

  // Individual (mt-4, mr-4, mb-4, ml-4)
  const tMatch = classArr.find(c => new RegExp(`^${prefix}t-(\\d+)$`).test(c))
  const rMatch = classArr.find(c => new RegExp(`^${prefix}r-(\\d+)$`).test(c))
  const bMatch = classArr.find(c => new RegExp(`^${prefix}b-(\\d+)$`).test(c))
  const lMatch = classArr.find(c => new RegExp(`^${prefix}l-(\\d+)$`).test(c))
  if (tMatch) result.t = tMatch.split('-')[1]
  if (rMatch) result.r = rMatch.split('-')[1]
  if (bMatch) result.b = bMatch.split('-')[1]
  if (lMatch) result.l = lMatch.split('-')[1]

  return result
}

// Parse size from Tailwind classes
function parseSize(classes: string): { w: string, h: string } {
  const result = { w: '', h: '' }
  const classArr = classes.split(' ')

  const wMatch = classArr.find(c => /^w-(\d+|full|screen|auto)$/.test(c))
  const hMatch = classArr.find(c => /^h-(\d+|full|screen|auto)$/.test(c))
  if (wMatch) result.w = wMatch.split('-')[1]
  if (hMatch) result.h = hMatch.split('-')[1]

  return result
}

export function ElementPanel() {
  const [activeTab, setActiveTab] = useState<'edit' | 'prompt' | 'code'>('edit')
  const [position, setPosition] = useState({ x: 16, y: 16 })
  const [isDragging, setIsDragging] = useState(false)
  const [elementPrompt, setElementPrompt] = useState('')
  const [isModifying, setIsModifying] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    family: true,
    text: true,
    image: true,
    margin: true,
    padding: true,
    size: true,
  })

  const selectedElement = useEditorStore((s) => s.selectedElement)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const html = useEditorStore((s) => s.html)
  const updateHtml = useEditorStore((s) => s.updateHtml)
  const siteId = useEditorStore((s) => s.siteId)

  // Check if selected element is an image
  const isImageElement = selectedElement?.tagName?.toUpperCase() === 'IMG'

  // Parse image src/alt from current HTML (re-parses when html changes)
  const getImageAttributes = () => {
    if (!isImageElement || !selectedElement?.selector) return { src: null, alt: '' }
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const img = doc.querySelector(selectedElement.selector) as HTMLImageElement
    return {
      src: img?.src || null,
      alt: img?.alt || ''
    }
  }
  const imageAttrs = getImageAttributes()
  const currentImageSrc = imageAttrs.src
  const currentImageAlt = imageAttrs.alt

  // Update image src
  const updateImageSrc = (newSrc: string, newAlt?: string) => {
    if (!selectedElement?.selector) return

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const element = doc.querySelector(selectedElement.selector) as HTMLImageElement
    if (!element || element.tagName !== 'IMG') return

    element.src = newSrc
    if (newAlt !== undefined) {
      element.alt = newAlt
    }

    // Reconstruct HTML
    let newHtml = '<!DOCTYPE html>\n<html'
    Array.from(doc.documentElement.attributes).forEach(attr => {
      newHtml += ` ${attr.name}="${attr.value}"`
    })
    newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

    updateHtml(newHtml, true)
  }

  // Update image alt text
  const updateImageAlt = (newAlt: string) => {
    if (!selectedElement?.selector) return

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const element = doc.querySelector(selectedElement.selector) as HTMLImageElement
    if (!element || element.tagName !== 'IMG') return

    element.alt = newAlt

    // Reconstruct HTML
    let newHtml = '<!DOCTYPE html>\n<html'
    Array.from(doc.documentElement.attributes).forEach(attr => {
      newHtml += ` ${attr.name}="${attr.value}"`
    })
    newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

    updateHtml(newHtml, true)
  }

  // Current classes
  const currentClasses = selectedElement?.className?.replace('unicorn-selected', '').replace('unicorn-hover-outline', '').trim() || ''

  // Parsed values
  const marginValues = parseSpacing(currentClasses, 'm')
  const paddingValues = parseSpacing(currentClasses, 'p')
  const sizeValues = parseSize(currentClasses)

  // Update a Tailwind class
  const updateClass = (oldPrefix: string, newClass: string) => {
    if (!selectedElement?.selector) return

    const doc = new DOMParser().parseFromString(html, 'text/html')
    const element = doc.querySelector(selectedElement.selector)
    if (!element) return

    let classes = (element.getAttribute('class') || '').split(' ')
      .filter(c => c && c !== 'unicorn-selected' && c !== 'unicorn-hover-outline')

    // Remove old classes with this prefix
    classes = classes.filter(c => !c.startsWith(oldPrefix))

    // Add new class if not empty
    if (newClass) classes.push(newClass)

    element.setAttribute('class', classes.join(' '))

    // Reconstruct HTML
    let newHtml = '<!DOCTYPE html>\n<html'
    Array.from(doc.documentElement.attributes).forEach(attr => {
      newHtml += ` ${attr.name}="${attr.value}"`
    })
    newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

    updateHtml(newHtml, true)
  }

  // Handle spacing input change
  const handleSpacingChange = (type: 'm' | 'p', side: 't' | 'r' | 'b' | 'l', value: string) => {
    const prefix = `${type}${side}-`
    const newClass = value ? `${type}${side}-${value}` : ''
    updateClass(prefix, newClass)
  }

  // Handle size input change
  const handleSizeChange = (dim: 'w' | 'h', value: string) => {
    const prefix = `${dim}-`
    const newClass = value ? `${dim}-${value}` : ''
    updateClass(prefix, newClass)
  }

  const handleElementPrompt = async () => {
    if (!elementPrompt.trim() || !selectedElement || isModifying) return
    setIsModifying(true)
    try {
      const response = await fetch('/api/ai/modify-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: elementPrompt,
          elementHtml: selectedElement.outerHTML,
          fullHtml: html,
        }),
      })
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      if (data.modifiedHtml) {
        updateHtml(data.modifiedHtml)
        setElementPrompt('')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsModifying(false)
    }
  }

  // Drag handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return
      setPosition({
        x: dragRef.current.startPosX - (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      })
    }
    const handleMouseUp = () => { setIsDragging(false); dragRef.current = null }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y }
  }

  if (!selectedElement) return null

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Spacing input component
  const SpacingInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-zinc-400 mb-0.5">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-10 h-7 text-xs text-center bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div
      className="fixed w-80 bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden z-50 flex flex-col"
      style={{ right: position.x, top: position.y, maxHeight: 'calc(100vh - 100px)' }}
    >
      {/* Drag Bar */}
      <div
        onMouseDown={handleDragStart}
        className="flex items-center justify-center py-1.5 bg-zinc-50 border-b border-zinc-100 cursor-grab active:cursor-grabbing"
      >
        <GripHorizontal className="h-4 w-4 text-zinc-300" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900">{selectedElement.tagName}</span>
          <div className="flex bg-zinc-100 rounded-md p-0.5">
            {(['edit', 'prompt', 'code'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  activeTab === tab ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center">
          <button className="p-1 text-zinc-400 hover:text-zinc-600 rounded"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={clearSelection} className="p-1 text-zinc-400 hover:text-zinc-600 rounded"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'edit' && (
          <div className="p-3 space-y-0.5">
            {/* Family */}
            <div>
              <button
                onClick={() => toggleSection('family')}
                className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Element-Hierarchie
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.family ? '' : '-rotate-90'}`} />
              </button>
              {expandedSections.family && (
                <div className="flex items-center gap-1.5 pb-2 flex-wrap">
                  {selectedElement.path.map((tag, i) => (
                    <div key={i} className="flex items-center gap-0.5">
                      <button className="px-2 py-0.5 text-[10px] font-medium text-zinc-600 bg-zinc-100 rounded hover:bg-zinc-200">
                        {tag.toLowerCase()}
                      </button>
                      {i < selectedElement.path.length - 1 && <ChevronRight className="h-2.5 w-2.5 text-zinc-300" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Text Content */}
            {selectedElement.textContent && !isImageElement && (
              <div className="border-t border-zinc-100 pt-0.5">
                <button
                  onClick={() => toggleSection('text')}
                  className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  Text-Inhalt
                  <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.text ? '' : '-rotate-90'}`} />
                </button>
                {expandedSections.text && (
                  <div className="pb-2">
                    <input
                      type="text"
                      defaultValue={selectedElement.textContent.substring(0, 50)}
                      className="w-full h-8 px-2.5 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Image - only for IMG elements */}
            {isImageElement && (
              <div className="border-t border-zinc-100 pt-0.5">
                <button
                  onClick={() => toggleSection('image')}
                  className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Bild
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.image ? '' : '-rotate-90'}`} />
                </button>
                {expandedSections.image && (
                  <div className="pb-3 space-y-2">
                    {/* Current image preview */}
                    {currentImageSrc && (
                      <div className="relative rounded-md overflow-hidden border border-zinc-200 bg-zinc-50">
                        <img
                          src={currentImageSrc}
                          alt={currentImageAlt || ''}
                          className="w-full h-24 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                          <button
                            onClick={() => setShowImagePicker(true)}
                            className="px-3 py-1.5 bg-white rounded-md text-xs font-medium shadow-lg flex items-center gap-1.5"
                          >
                            <Upload className="h-3 w-3" />
                            Ersetzen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Replace button */}
                    <button
                      onClick={() => setShowImagePicker(true)}
                      className="w-full h-8 px-3 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Bild auswählen / hochladen
                    </button>

                    {/* Alt text */}
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Alt-Text (SEO)</label>
                      <input
                        type="text"
                        defaultValue={currentImageAlt}
                        onBlur={(e) => updateImageAlt(e.target.value)}
                        placeholder="Bildbeschreibung..."
                        className="w-full h-7 px-2 text-xs text-zinc-900 bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* URL Input */}
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">Bild-URL</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          defaultValue={currentImageSrc || ''}
                          key={currentImageSrc}
                          onBlur={(e) => {
                            const newUrl = e.target.value.trim()
                            if (newUrl && newUrl !== currentImageSrc) {
                              updateImageSrc(newUrl)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newUrl = (e.target as HTMLInputElement).value.trim()
                              if (newUrl && newUrl !== currentImageSrc) {
                                updateImageSrc(newUrl)
                              }
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          placeholder="https://..."
                          className="flex-1 h-7 px-2 text-[10px] text-zinc-700 bg-zinc-50 border border-zinc-200 rounded font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {currentImageSrc && (
                          <a
                            href={currentImageSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 w-7 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded transition-colors"
                            title="In neuem Tab öffnen"
                          >
                            <ExternalLink className="h-3 w-3 text-zinc-500" />
                          </a>
                        )}
                      </div>
                      <p className="text-[9px] text-zinc-400 mt-1">Enter drücken oder Feld verlassen zum Speichern</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Margin */}
            <div className="border-t border-zinc-100 pt-0.5">
              <button
                onClick={() => toggleSection('margin')}
                className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Margin
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.margin ? '' : '-rotate-90'}`} />
              </button>
              {expandedSections.margin && (
                <div className="flex justify-center gap-3 pb-3">
                  <SpacingInput label="Top" value={marginValues.t} onChange={(v) => handleSpacingChange('m', 't', v)} />
                  <SpacingInput label="Right" value={marginValues.r} onChange={(v) => handleSpacingChange('m', 'r', v)} />
                  <SpacingInput label="Bottom" value={marginValues.b} onChange={(v) => handleSpacingChange('m', 'b', v)} />
                  <SpacingInput label="Left" value={marginValues.l} onChange={(v) => handleSpacingChange('m', 'l', v)} />
                </div>
              )}
            </div>

            {/* Padding */}
            <div className="border-t border-zinc-100 pt-0.5">
              <button
                onClick={() => toggleSection('padding')}
                className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Padding
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.padding ? '' : '-rotate-90'}`} />
              </button>
              {expandedSections.padding && (
                <div className="flex justify-center gap-3 pb-3">
                  <SpacingInput label="Top" value={paddingValues.t} onChange={(v) => handleSpacingChange('p', 't', v)} />
                  <SpacingInput label="Right" value={paddingValues.r} onChange={(v) => handleSpacingChange('p', 'r', v)} />
                  <SpacingInput label="Bottom" value={paddingValues.b} onChange={(v) => handleSpacingChange('p', 'b', v)} />
                  <SpacingInput label="Left" value={paddingValues.l} onChange={(v) => handleSpacingChange('p', 'l', v)} />
                </div>
              )}
            </div>

            {/* Size */}
            <div className="border-t border-zinc-100 pt-0.5">
              <button
                onClick={() => toggleSection('size')}
                className="flex items-center justify-between w-full py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Size
                <ChevronDown className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${expandedSections.size ? '' : '-rotate-90'}`} />
              </button>
              {expandedSections.size && (
                <div className="flex justify-center gap-6 pb-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-zinc-400 mb-0.5">Width</span>
                    <input
                      type="text"
                      value={sizeValues.w}
                      onChange={(e) => handleSizeChange('w', e.target.value)}
                      placeholder="auto"
                      className="w-16 h-7 text-xs text-center bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] text-zinc-400 mb-0.5">Height</span>
                    <input
                      type="text"
                      value={sizeValues.h}
                      onChange={(e) => handleSizeChange('h', e.target.value)}
                      placeholder="auto"
                      className="w-16 h-7 text-xs text-center bg-zinc-50 border border-zinc-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tailwind Classes (readonly) */}
            <div className="border-t border-zinc-100 pt-2">
              <span className="text-[10px] text-zinc-400">Tailwind Classes:</span>
              <div className="mt-1 p-2 bg-zinc-50 rounded text-[10px] font-mono text-zinc-600 break-all">
                {currentClasses || 'keine'}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="p-3">
            <p className="text-xs text-zinc-500 mb-2">Beschreibe, was du ändern möchtest:</p>
            <div className="relative">
              <textarea
                value={elementPrompt}
                onChange={(e) => setElementPrompt(e.target.value)}
                placeholder="z.B. Mache den Text größer..."
                className="w-full h-20 px-2.5 py-2 pr-10 text-xs bg-zinc-50 border border-zinc-200 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleElementPrompt() }
                }}
              />
              <button
                onClick={handleElementPrompt}
                disabled={!elementPrompt.trim() || isModifying}
                className="absolute right-2 bottom-2 p-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-300 text-white rounded-md transition-colors"
              >
                {isModifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Größer', 'Kleiner', 'Zentrieren', 'Farbe ändern'].map((action) => (
                <button
                  key={action}
                  onClick={() => setElementPrompt(action)}
                  className="px-2 py-1 text-[10px] font-medium text-zinc-600 bg-zinc-100 rounded hover:bg-zinc-200"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="p-3">
            <pre className="bg-zinc-900 text-zinc-300 p-3 text-[10px] rounded-md overflow-auto max-h-60">
              <code>{selectedElement.outerHTML}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Image Picker Modal */}
      {siteId && (
        <ImagePicker
          siteId={siteId}
          open={showImagePicker}
          onOpenChange={setShowImagePicker}
          onSelect={(url, altText) => {
            updateImageSrc(url, altText || currentImageAlt || '')
          }}
          currentUrl={currentImageSrc || undefined}
          currentAlt={currentImageAlt || undefined}
        />
      )}
    </div>
  )
}
