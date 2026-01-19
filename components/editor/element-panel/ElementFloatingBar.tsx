'use client'

import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { createClient } from '@/lib/supabase/client'
import {
  Type,
  Image as ImageIcon,
  Code,
  Sparkles,
  Copy,
  Trash2,
  ChevronDown,
  Send,
  Loader2,
  X,
  Palette,
  Move,
  Maximize,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
} from 'lucide-react'
import { ImagePicker } from '../assets/ImagePicker'
import {
  ShadowEditor,
  BorderRadiusEditor,
  OpacityEditor,
  ResponsiveBreakpointEditor,
  TailwindClassAutocomplete
} from '../style-editors'

interface DropdownState {
  active: 'none' | 'edit' | 'prompt' | 'code' | 'style' | 'image'
}

export function ElementFloatingBar() {
  const [dropdown, setDropdown] = useState<DropdownState>({ active: 'none' })
  const [elementPrompt, setElementPrompt] = useState('')
  const [isModifying, setIsModifying] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [isApplyingCode, setIsApplyingCode] = useState(false)
  const [codeApplySuccess, setCodeApplySuccess] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedElement = useEditorStore((s) => s.selectedElement)
  const clearSelection = useEditorStore((s) => s.clearSelection)
  const html = useEditorStore((s) => s.html)
  const updateHtml = useEditorStore((s) => s.updateHtml)
  const siteId = useEditorStore((s) => s.siteId)
  const globalHeader = useEditorStore((s) => s.globalHeader)
  const globalFooter = useEditorStore((s) => s.globalFooter)

  // Close dropdown when clicking outside (check both bar and dropdown refs)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedInBar = barRef.current?.contains(target)
      const clickedInDropdown = dropdownRef.current?.contains(target)

      if (!clickedInBar && !clickedInDropdown) {
        setDropdown({ active: 'none' })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reset edited code when selected element changes or code dropdown opens
  useEffect(() => {
    if (selectedElement?.outerHTML) {
      setEditedCode(selectedElement.outerHTML)
      setCodeApplySuccess(false)
    }
  }, [selectedElement?.outerHTML, dropdown.active])

  // Helper to detect if element is in header or footer
  const getGlobalComponentContext = () => {
    if (!selectedElement?.selector) return null

    // Check if the selector starts with header or footer
    const selector = selectedElement.selector.toLowerCase()
    if (selector.startsWith('header') || selector.includes(' header ') || selector.startsWith('header >')) {
      return globalHeader ? { type: 'header' as const, component: globalHeader } : null
    }
    if (selector.startsWith('footer') || selector.includes(' footer ') || selector.startsWith('footer >')) {
      return globalFooter ? { type: 'footer' as const, component: globalFooter } : null
    }

    // Also check by looking at the outerHTML structure
    if (selectedElement.outerHTML) {
      // If the element itself is a header/footer tag
      if (selectedElement.outerHTML.trim().startsWith('<header')) {
        return globalHeader ? { type: 'header' as const, component: globalHeader } : null
      }
      if (selectedElement.outerHTML.trim().startsWith('<footer')) {
        return globalFooter ? { type: 'footer' as const, component: globalFooter } : null
      }
    }

    return null
  }

  // Apply code changes
  const applyCodeChanges = async () => {
    if (!selectedElement?.selector || !editedCode.trim() || isApplyingCode) return

    setIsApplyingCode(true)
    setCodeApplySuccess(false)

    try {
      const globalContext = getGlobalComponentContext()

      if (globalContext && globalContext.component.id && siteId) {
        // Element is part of header/footer - update the global component
        const supabase = createClient()

        // Parse the current global component HTML
        const componentHtml = globalContext.component.html || ''
        const doc = new DOMParser().parseFromString(componentHtml, 'text/html')

        // Try to find and replace the element in the component HTML
        // If the selector is just 'header' or 'footer', replace the entire component
        if (selectedElement.selector === 'header' || selectedElement.selector === 'footer') {
          // Replace entire component HTML
          const { error } = await supabase
            .from('components')
            .update({
              html: editedCode,
              updated_at: new Date().toISOString()
            })
            .eq('id', globalContext.component.id)

          if (error) throw error

          // Update the store
          useEditorStore.setState((state) => ({
            [globalContext.type === 'header' ? 'globalHeader' : 'globalFooter']: {
              ...globalContext.component,
              html: editedCode
            }
          }))
        } else {
          // Try to find the element within the component
          // Extract the relative selector (remove header/footer prefix)
          let relativeSelector = selectedElement.selector
            .replace(/^header\s*>\s*/i, '')
            .replace(/^footer\s*>\s*/i, '')
            .replace(/^header\s+/i, '')
            .replace(/^footer\s+/i, '')

          // Wrap in header/footer for proper parsing
          const wrapperTag = globalContext.type === 'header' ? 'header' : 'footer'
          const wrappedDoc = new DOMParser().parseFromString(
            `<${wrapperTag}>${componentHtml}</${wrapperTag}>`,
            'text/html'
          )

          const targetElement = wrappedDoc.querySelector(relativeSelector) ||
                               wrappedDoc.querySelector(selectedElement.selector)

          if (targetElement) {
            // Replace the element's outerHTML
            targetElement.outerHTML = editedCode

            // Extract the updated content (without wrapper if component doesn't have it)
            const wrapper = wrappedDoc.querySelector(wrapperTag)
            const newComponentHtml = wrapper?.innerHTML || editedCode

            const { error } = await supabase
              .from('components')
              .update({
                html: newComponentHtml,
                updated_at: new Date().toISOString()
              })
              .eq('id', globalContext.component.id)

            if (error) throw error

            // Update the store
            useEditorStore.setState((state) => ({
              [globalContext.type === 'header' ? 'globalHeader' : 'globalFooter']: {
                ...globalContext.component,
                html: newComponentHtml
              }
            }))
          } else {
            // Fallback: replace entire component
            const { error } = await supabase
              .from('components')
              .update({
                html: editedCode,
                updated_at: new Date().toISOString()
              })
              .eq('id', globalContext.component.id)

            if (error) throw error

            useEditorStore.setState((state) => ({
              [globalContext.type === 'header' ? 'globalHeader' : 'globalFooter']: {
                ...globalContext.component,
                html: editedCode
              }
            }))
          }
        }

        // Also update the page HTML to reflect changes
        const pageDoc = new DOMParser().parseFromString(html, 'text/html')
        const pageElement = pageDoc.querySelector(selectedElement.selector)
        if (pageElement) {
          pageElement.outerHTML = editedCode
          let newHtml = '<!DOCTYPE html>\n<html'
          Array.from(pageDoc.documentElement.attributes).forEach(attr => {
            newHtml += ` ${attr.name}="${attr.value}"`
          })
          newHtml += '>\n' + pageDoc.head.outerHTML + '\n' + pageDoc.body.outerHTML + '\n</html>'
          updateHtml(newHtml, true)
        }

        setCodeApplySuccess(true)
        console.log(`[ElementFloatingBar] Updated ${globalContext.type} component in database`)
      } else {
        // Regular page element - just update the page HTML
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const element = doc.querySelector(selectedElement.selector)

        if (element) {
          element.outerHTML = editedCode

          let newHtml = '<!DOCTYPE html>\n<html'
          Array.from(doc.documentElement.attributes).forEach(attr => {
            newHtml += ` ${attr.name}="${attr.value}"`
          })
          newHtml += '>\n' + doc.head.outerHTML + '\n' + doc.body.outerHTML + '\n</html>'

          updateHtml(newHtml, true)
          setCodeApplySuccess(true)
          console.log('[ElementFloatingBar] Updated page element HTML')
        }
      }

      // Clear selection after a short delay to show success state
      setTimeout(() => {
        clearSelection()
        setDropdown({ active: 'none' })
      }, 500)

    } catch (error) {
      console.error('[ElementFloatingBar] Error applying code:', error)
    } finally {
      setIsApplyingCode(false)
    }
  }

  if (!selectedElement) return null

  // Determine element type for showing relevant tools
  const tagName = selectedElement.tagName?.toUpperCase()
  const isImage = tagName === 'IMG'
  const hasBackgroundImage = selectedElement.hasBackgroundImage || false
  const isText = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'A', 'BUTTON', 'LABEL'].includes(tagName)
  const isLink = tagName === 'A'
  const isContainer = ['DIV', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'MAIN', 'ASIDE'].includes(tagName)

  // Check if container has a child img element
  const hasChildImage = isContainer && selectedElement.innerHTML?.includes('<img ')
  const showImageTools = isImage || hasBackgroundImage || hasChildImage

  // Get element position for floating bar - positioned exactly at the element
  const elementRect = selectedElement.rect || { top: 100, left: 100, width: 200, height: 50 }

  // Position bar directly above the element, centered
  // Account for iframe offset (420px chat panel + some padding)
  const iframeOffset = 420 + 16 // Chat panel width + padding
  const toolbarHeight = 44 // Main toolbar height

  // Calculate bar position
  const barTop = Math.max(elementRect.top + toolbarHeight - 44, toolbarHeight + 8) // 44px above element
  const barLeft = iframeOffset + elementRect.left + (elementRect.width / 2)

  // Get current classes
  const currentClasses = selectedElement?.className?.replace('unicorn-selected', '').replace('unicorn-hover-outline', '').trim() || ''

  // Image attributes (for IMG tags, background images, and child images)
  const getImageAttributes = () => {
    if (!selectedElement?.selector) return { src: null, alt: '', isBackgroundImage: false, isChildImage: false }

    // For IMG tags
    if (isImage) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const img = doc.querySelector(selectedElement.selector) as HTMLImageElement
      return { src: img?.src || null, alt: img?.alt || '', isBackgroundImage: false, isChildImage: false }
    }

    // For containers with child img
    if (hasChildImage) {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const container = doc.querySelector(selectedElement.selector)
      const childImg = container?.querySelector('img') as HTMLImageElement
      return {
        src: childImg?.src || null,
        alt: childImg?.alt || '',
        isBackgroundImage: false,
        isChildImage: true
      }
    }

    // For background images
    if (hasBackgroundImage) {
      return {
        src: selectedElement.backgroundImage || null,
        alt: selectedElement.ariaLabel || '',
        isBackgroundImage: true,
        isChildImage: false
      }
    }

    return { src: null, alt: '', isBackgroundImage: false, isChildImage: false }
  }
  const imageAttrs = getImageAttributes()

  // Helper: Update global component in database
  const updateGlobalComponent = async (newComponentHtml: string, componentType: 'header' | 'footer') => {
    const component = componentType === 'header' ? globalHeader : globalFooter
    if (!component?.id) return false

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('components')
        .update({
          html: newComponentHtml,
          updated_at: new Date().toISOString()
        })
        .eq('id', component.id)

      if (error) throw error

      // Update store
      useEditorStore.setState({
        [componentType === 'header' ? 'globalHeader' : 'globalFooter']: {
          ...component,
          html: newComponentHtml
        }
      })

      console.log(`[ElementFloatingBar] Updated ${componentType} component in database`)
      return true
    } catch (error) {
      console.error(`[ElementFloatingBar] Error updating ${componentType}:`, error)
      return false
    }
  }

  // Helper: Apply element change to both page HTML and global component if needed
  const applyElementChange = async (modifyElement: (element: Element) => void) => {
    if (!selectedElement?.selector) return

    const globalContext = getGlobalComponentContext()

    // Update page HTML (always needed for preview)
    const pageDoc = new DOMParser().parseFromString(html, 'text/html')
    const pageElement = pageDoc.querySelector(selectedElement.selector)
    if (pageElement) {
      modifyElement(pageElement)
      let newPageHtml = '<!DOCTYPE html>\n<html'
      Array.from(pageDoc.documentElement.attributes).forEach(attr => {
        newPageHtml += ` ${attr.name}="${attr.value}"`
      })
      newPageHtml += '>\n' + pageDoc.head.outerHTML + '\n' + pageDoc.body.outerHTML + '\n</html>'
      updateHtml(newPageHtml, true)
    }

    // If element is in global component, also update the database
    if (globalContext && globalContext.component.id) {
      const componentHtml = globalContext.component.html || ''
      const wrapperTag = globalContext.type

      // Parse component HTML with wrapper
      const compDoc = new DOMParser().parseFromString(
        `<${wrapperTag}>${componentHtml}</${wrapperTag}>`,
        'text/html'
      )

      // Find element in component - try relative selector first
      let relativeSelector = selectedElement.selector
        .replace(/^header\s*>\s*/i, '')
        .replace(/^footer\s*>\s*/i, '')
        .replace(/^header\s+/i, '')
        .replace(/^footer\s+/i, '')

      const compElement = compDoc.querySelector(relativeSelector) ||
                          compDoc.querySelector(selectedElement.selector)

      if (compElement) {
        modifyElement(compElement)
        const wrapper = compDoc.querySelector(wrapperTag)
        const newComponentHtml = wrapper?.innerHTML || componentHtml
        await updateGlobalComponent(newComponentHtml, globalContext.type)
      }
    }
  }

  // Update image src (for IMG tags)
  const updateImageSrc = async (newSrc: string, newAlt?: string) => {
    await applyElementChange((element) => {
      if (element.tagName === 'IMG') {
        (element as HTMLImageElement).src = newSrc
        if (newAlt !== undefined) (element as HTMLImageElement).alt = newAlt
      }
    })
  }

  // Update background image (for containers with background-image)
  const updateBackgroundImage = async (newSrc: string, ariaLabel?: string) => {
    await applyElementChange((element) => {
      const el = element as HTMLElement
      // Remove old Tailwind background URL classes
      const classes = (el.className || '').split(' ')
      const filteredClasses = classes.filter(c => !c.startsWith('bg-[url('))
      el.className = filteredClasses.join(' ')
      // Use inline style
      el.style.backgroundImage = `url('${newSrc}')`
      if (ariaLabel) {
        el.setAttribute('aria-label', ariaLabel)
        el.setAttribute('role', 'img')
      }
    })
  }

  // Update child image (for containers with img child)
  const updateChildImage = async (newSrc: string, newAlt?: string) => {
    await applyElementChange((element) => {
      const childImg = element.querySelector('img') as HTMLImageElement
      if (childImg) {
        childImg.src = newSrc
        if (newAlt !== undefined) childImg.alt = newAlt
      }
    })
  }

  // Update element classes (for style editors)
  const updateElementClasses = async (newClasses: string) => {
    await applyElementChange((element) => {
      const cleanClasses = newClasses.replace(/unicorn-selected|unicorn-hover-outline/g, '').trim()
      element.setAttribute('class', `${cleanClasses} unicorn-selected`)
    })
  }

  // Copy element
  const copyElement = async () => {
    await navigator.clipboard.writeText(selectedElement.outerHTML)
  }

  // Delete element
  const deleteElement = async () => {
    if (!selectedElement?.selector) return

    const globalContext = getGlobalComponentContext()

    // Update page HTML
    const pageDoc = new DOMParser().parseFromString(html, 'text/html')
    const pageElement = pageDoc.querySelector(selectedElement.selector)
    if (pageElement) {
      pageElement.remove()
      let newPageHtml = '<!DOCTYPE html>\n<html'
      Array.from(pageDoc.documentElement.attributes).forEach(attr => {
        newPageHtml += ` ${attr.name}="${attr.value}"`
      })
      newPageHtml += '>\n' + pageDoc.head.outerHTML + '\n' + pageDoc.body.outerHTML + '\n</html>'
      updateHtml(newPageHtml, true)
    }

    // If element is in global component, also update database
    if (globalContext && globalContext.component.id) {
      const componentHtml = globalContext.component.html || ''
      const wrapperTag = globalContext.type

      const compDoc = new DOMParser().parseFromString(
        `<${wrapperTag}>${componentHtml}</${wrapperTag}>`,
        'text/html'
      )

      let relativeSelector = selectedElement.selector
        .replace(/^header\s*>\s*/i, '')
        .replace(/^footer\s*>\s*/i, '')
        .replace(/^header\s+/i, '')
        .replace(/^footer\s+/i, '')

      const compElement = compDoc.querySelector(relativeSelector) ||
                          compDoc.querySelector(selectedElement.selector)

      if (compElement) {
        compElement.remove()
        const wrapper = compDoc.querySelector(wrapperTag)
        const newComponentHtml = wrapper?.innerHTML || ''
        await updateGlobalComponent(newComponentHtml, globalContext.type)
      }
    }

    clearSelection()
  }

  // Handle AI prompt
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
        setDropdown({ active: 'none' })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsModifying(false)
    }
  }

  // Tool button component
  const ToolButton = ({
    icon: Icon,
    label,
    onClick,
    active = false,
    danger = false
  }: {
    icon: React.ElementType
    label: string
    onClick: () => void
    active?: boolean
    danger?: boolean
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
      }`}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )

  return (
    <>
      {/* Floating Bar */}
      <div
        ref={barRef}
        className="fixed z-[60] flex items-center gap-0.5 px-1.5 py-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700"
        style={{
          top: barTop,
          left: barLeft,
          transform: 'translateX(-50%)',
        }}
      >
        {/* Element Type Badge */}
        <div className="px-2 py-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
          {tagName}
        </div>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-600 mx-1" />

        {/* Text Tools - only for text elements */}
        {isText && (
          <ToolButton
            icon={Type}
            label="Text"
            onClick={() => setDropdown({ active: dropdown.active === 'edit' ? 'none' : 'edit' })}
            active={dropdown.active === 'edit'}
          />
        )}

        {/* Image Tools - for IMG tags and containers with background-image */}
        {showImageTools && (
          <ToolButton
            icon={ImageIcon}
            label={hasBackgroundImage && !isImage ? 'Hintergrund' : 'Bild'}
            onClick={() => setDropdown({ active: dropdown.active === 'image' ? 'none' : 'image' })}
            active={dropdown.active === 'image'}
          />
        )}

        {/* Style Tools - for all elements */}
        <ToolButton
          icon={Palette}
          label="Style"
          onClick={() => setDropdown({ active: dropdown.active === 'style' ? 'none' : 'style' })}
          active={dropdown.active === 'style'}
        />

        {/* AI Prompt */}
        <ToolButton
          icon={Sparkles}
          label="AI"
          onClick={() => setDropdown({ active: dropdown.active === 'prompt' ? 'none' : 'prompt' })}
          active={dropdown.active === 'prompt'}
        />

        {/* Code View */}
        <ToolButton
          icon={Code}
          label="Code"
          onClick={() => setDropdown({ active: dropdown.active === 'code' ? 'none' : 'code' })}
          active={dropdown.active === 'code'}
        />

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-600 mx-1" />

        {/* Quick Actions */}
        <button
          onClick={copyElement}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded transition-colors"
          title="Kopieren"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={deleteElement}
          className="p-1.5 text-zinc-400 hover:text-red-500 rounded transition-colors"
          title="Löschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={clearSelection}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded transition-colors"
          title="Schließen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dropdowns */}
      {dropdown.active !== 'none' && (
        <div
          ref={dropdownRef}
          className="fixed z-[59] mt-2 w-72 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden"
          style={{
            top: barTop + 44,
            left: barLeft,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Edit Dropdown - Text */}
          {dropdown.active === 'edit' && isText && (
            <div className="p-3 space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Textinhalt</label>
                <input
                  type="text"
                  defaultValue={selectedElement.textContent?.substring(0, 100)}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {isLink && (
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Link URL</label>
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">Ausrichtung</label>
                <div className="flex gap-1">
                  {[
                    { icon: AlignLeft, value: 'left' },
                    { icon: AlignCenter, value: 'center' },
                    { icon: AlignRight, value: 'right' },
                  ].map(({ icon: Icon, value }) => (
                    <button
                      key={value}
                      className="flex-1 p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Icon className="h-4 w-4 mx-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image Dropdown - for both IMG tags and background images */}
          {dropdown.active === 'image' && showImageTools && (
            <div className="p-3 space-y-3">
              {/* Image Type Badge */}
              {hasBackgroundImage && !isImage && (
                <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-600 dark:text-blue-400">
                  <span>Hintergrundbild</span>
                </div>
              )}
              {imageAttrs.src && (
                <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <img src={imageAttrs.src} alt="" className="w-full h-32 object-cover" />
                </div>
              )}
              <button
                onClick={() => setShowImagePicker(true)}
                className="w-full px-4 py-2.5 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                {hasBackgroundImage && !isImage ? 'Hintergrundbild ändern' : 'Bild ändern'}
              </button>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
                  {hasBackgroundImage && !isImage ? 'ARIA-Label (Barrierefreiheit)' : 'Alt-Text'}
                </label>
                <input
                  type="text"
                  defaultValue={imageAttrs.alt}
                  placeholder={hasBackgroundImage && !isImage ? 'Beschreibung für Screenreader...' : 'Bildbeschreibung...'}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Style Dropdown - Enhanced with Visual Editors */}
          {dropdown.active === 'style' && (
            <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
              {/* Shadow Editor */}
              <ShadowEditor
                currentClasses={currentClasses}
                onChange={updateElementClasses}
              />

              <div className="border-t border-zinc-100 dark:border-zinc-700 pt-3">
                {/* Border Radius Editor */}
                <BorderRadiusEditor
                  currentClasses={currentClasses}
                  onChange={updateElementClasses}
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-700 pt-3">
                {/* Opacity Editor */}
                <OpacityEditor
                  currentClasses={currentClasses}
                  onChange={updateElementClasses}
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-700 pt-3">
                {/* Responsive Breakpoints */}
                <ResponsiveBreakpointEditor
                  currentClasses={currentClasses}
                  onChange={updateElementClasses}
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-700 pt-3">
                {/* Tailwind Class Autocomplete */}
                <TailwindClassAutocomplete
                  currentClasses={currentClasses}
                  onChange={updateElementClasses}
                />
              </div>
            </div>
          )}

          {/* AI Prompt Dropdown */}
          {dropdown.active === 'prompt' && (
            <div className="p-3 space-y-3">
              <div className="relative">
                <textarea
                  value={elementPrompt}
                  onChange={(e) => setElementPrompt(e.target.value)}
                  placeholder="Beschreibe die Änderung..."
                  rows={3}
                  className="w-full px-3 py-2 pr-10 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleElementPrompt() }
                  }}
                />
                <button
                  onClick={handleElementPrompt}
                  disabled={!elementPrompt.trim() || isModifying}
                  className="absolute right-2 bottom-2 p-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isModifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Größer', 'Farbe ändern', 'Runden', 'Schatten'].map((action) => (
                  <button
                    key={action}
                    onClick={() => setElementPrompt(action)}
                    className="px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Code Dropdown - Editable */}
          {dropdown.active === 'code' && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">HTML</span>
                  {getGlobalComponentContext() && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      {getGlobalComponentContext()?.type === 'header' ? 'Header' : 'Footer'}
                    </span>
                  )}
                </div>
                <button
                  onClick={copyElement}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Kopieren
                </button>
              </div>
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                className="w-full bg-zinc-900 text-zinc-300 p-3 text-[10px] font-mono rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] max-h-[240px]"
                spellCheck={false}
                rows={8}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-zinc-500">
                  {editedCode !== selectedElement.outerHTML ? 'Geändert' : 'Keine Änderungen'}
                </span>
                <button
                  onClick={applyCodeChanges}
                  disabled={isApplyingCode || editedCode === selectedElement.outerHTML || !editedCode.trim()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    codeApplySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isApplyingCode ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : codeApplySuccess ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {codeApplySuccess ? 'Übernommen' : 'Übernehmen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Picker Modal */}
      {siteId && (
        <ImagePicker
          siteId={siteId}
          open={showImagePicker}
          onOpenChange={setShowImagePicker}
          onSelect={(url, altText) => {
            // Use correct update function based on image type
            if (isImage) {
              updateImageSrc(url, altText || imageAttrs.alt || '')
            } else if (hasChildImage) {
              updateChildImage(url, altText || imageAttrs.alt || '')
            } else if (hasBackgroundImage) {
              updateBackgroundImage(url, altText || imageAttrs.alt || '')
            }
            setShowImagePicker(false)
          }}
          currentUrl={imageAttrs.src || undefined}
          currentAlt={imageAttrs.alt || undefined}
        />
      )}
    </>
  )
}
