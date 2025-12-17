'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Tablet, Smartphone, Lock, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MacBookMockup, IPadMockup, IPhoneMockup } from '@/components/preview/mockups'

interface ShareLink {
  id: string
  site_id: string
  page_id: string | null
  token: string
  password_hash: string | null
  expires_at: string | null
  view_count: number
  allow_comments: boolean
}

interface Page {
  id: string
  name: string
  slug: string
  html_content: string
}

interface Site {
  id: string
  name: string
  global_header_id: string | null
  global_footer_id: string | null
}

interface GlobalComponent {
  id: string
  html: string | null
  css: string | null
  js: string | null
}

interface Comment {
  id: string
  page_id: string | null
  author_name: string
  content: string
  position_x: number
  position_y: number
  // Element-basierte Positionierung (neu)
  element_selector?: string | null
  offset_x?: number | null
  offset_y?: number | null
  status: 'open' | 'resolved'
  created_at: string
}

type Viewport = 'desktop' | 'tablet' | 'mobile'
type DeviceMockup = 'none' | 'iphone' | 'ipad' | 'macbook'

const MOCKUP_SIZES = {
  macbook: { width: 'w-[900px] max-w-[90vw]' },
  ipad: { width: 'w-[600px] max-w-[80vw]' },
  iphone: { width: 'w-[320px] max-w-[50vw]' },
}

const VIEWPORT_WIDTHS: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

export default function PreviewPage() {
  const params = useParams()
  const token = params.token as string
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [shareLink, setShareLink] = useState<ShareLink | null>(null)
  const [site, setSite] = useState<Site | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [currentPage, setCurrentPage] = useState<Page | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Global Components (Header/Footer)
  const [globalHeader, setGlobalHeader] = useState<GlobalComponent | null>(null)
  const [globalFooter, setGlobalFooter] = useState<GlobalComponent | null>(null)

  // Password protection
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // UI State
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [mockup, setMockup] = useState<DeviceMockup>('none')
  const [showComments, setShowComments] = useState(true)
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newCommentPos, setNewCommentPos] = useState<{
    x: number
    y: number
    elementSelector?: string
    offsetX?: number
    offsetY?: number
  } | null>(null)
  const [newCommentAuthor, setNewCommentAuthor] = useState('')
  const [newCommentContent, setNewCommentContent] = useState('')
  const [editingComment, setEditingComment] = useState<Comment | null>(null)

  // Pin Container Transform (for scroll sync)
  const [pinContainerTransform, setPinContainerTransform] = useState('translate(0px, 0px)')
  const [iframeDocSize, setIframeDocSize] = useState({ width: 0, height: 0 })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  // Generate a unique CSS selector for an element
  const generateSelector = (element: Element): string => {
    // If element has an ID, use it
    if (element.id) {
      return `#${CSS.escape(element.id)}`
    }

    // Build path from element to root
    const path: string[] = []
    let current: Element | null = element

    while (current && current !== current.ownerDocument?.body) {
      let selector = current.tagName.toLowerCase()

      // Add classes if available (limit to first 2 meaningful classes)
      const classes = Array.from(current.classList)
        .filter(c => !c.startsWith('_') && c.length < 30) // Filter out generated classes
        .slice(0, 2)
      if (classes.length > 0) {
        selector += '.' + classes.map(c => CSS.escape(c)).join('.')
      }

      // Add nth-child if needed for uniqueness
      const parent = current.parentElement
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === current!.tagName
        )
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1
          selector += `:nth-child(${index})`
        }
      }

      path.unshift(selector)
      current = current.parentElement

      // Stop after 4 levels to keep selector manageable
      if (path.length >= 4) break
    }

    return path.join(' > ')
  }

  // Load saved author name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('unicorn-comment-author')
    if (savedName) {
      setNewCommentAuthor(savedName)
    }
  }, [])

  // Load share link data
  useEffect(() => {
    async function loadShareLink() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: link, error: linkError } = await (supabase as any)
          .from('share_links')
          .select('*')
          .eq('token', token)
          .single()

        if (linkError || !link) {
          setError('Link nicht gefunden')
          setLoading(false)
          return
        }

        if (link.expires_at && new Date(link.expires_at) < new Date()) {
          setError('Dieser Link ist abgelaufen')
          setLoading(false)
          return
        }

        setShareLink(link)

        if (link.password_hash) {
          const savedAuth = sessionStorage.getItem(`preview-auth-${token}`)
          if (savedAuth === 'true') {
            setIsAuthenticated(true)
          } else {
            setNeedsPassword(true)
          }
        } else {
          setIsAuthenticated(true)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('share_links')
          .update({ view_count: link.view_count + 1 })
          .eq('id', link.id)

        await loadSiteData(link, !link.password_hash || sessionStorage.getItem(`preview-auth-${token}`) === 'true')
      } catch (err) {
        console.error('Error loading share link:', err)
        setError('Ein Fehler ist aufgetreten')
      } finally {
        setLoading(false)
      }
    }

    loadShareLink()
  }, [token])

  // Load site data including Header/Footer
  const loadSiteData = useCallback(async (link: ShareLink, loadComments: boolean = true) => {
    const { data: siteData } = await supabase
      .from('sites')
      .select('id, name, global_header_id, global_footer_id')
      .eq('id', link.site_id)
      .single()

    if (siteData) {
      setSite(siteData)

      // Load Header/Footer components
      const componentIds = [siteData.global_header_id, siteData.global_footer_id].filter(Boolean) as string[]
      if (componentIds.length > 0) {
        const { data: components } = await supabase
          .from('components')
          .select('id, html, css, js')
          .in('id', componentIds)

        if (components) {
          const header = components.find(c => c.id === siteData.global_header_id)
          const footer = components.find(c => c.id === siteData.global_footer_id)
          if (header) setGlobalHeader(header)
          if (footer) setGlobalFooter(footer)
        }
      }

      // Load pages
      if (link.page_id) {
        const { data: pageData } = await supabase
          .from('pages')
          .select('id, name, slug, html_content')
          .eq('id', link.page_id)
          .single()

        if (pageData) {
          setPages([pageData as Page])
          setCurrentPage(pageData as Page)
        }
      } else {
        const { data: pagesData } = await supabase
          .from('pages')
          .select('id, name, slug, html_content')
          .eq('site_id', link.site_id)
          .order('created_at')

        if (pagesData) {
          setPages(pagesData as Page[])
          setCurrentPage(pagesData[0] as Page)
        }
      }

      // Load comments
      if (loadComments && link.allow_comments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: commentsData } = await (supabase as any)
          .from('share_comments')
          .select('*')
          .eq('share_link_id', link.id)
          .order('created_at')

        if (commentsData) {
          setComments(commentsData)
        }
      }
    }
  }, [supabase])

  // Handle password submit
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shareLink || !password) return

    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (hashedPassword === shareLink.password_hash) {
      setIsAuthenticated(true)
      setNeedsPassword(false)
      sessionStorage.setItem(`preview-auth-${token}`, 'true')

      if (shareLink.allow_comments) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: commentsData } = await (supabase as any)
          .from('share_comments')
          .select('*')
          .eq('share_link_id', shareLink.id)
          .order('created_at')

        if (commentsData) {
          setComments(commentsData)
        }
      }
    } else {
      setPasswordError('Falsches Passwort')
    }
  }

  // Handle comment click - Find element under cursor and calculate relative position
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || !shareLink?.allow_comments) return

    const overlay = e.currentTarget
    const rect = overlay.getBoundingClientRect()
    const iframe = iframeRef.current

    if (!iframe?.contentDocument || !iframe?.contentWindow) return

    // Click position relative to iframe viewport
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Find element at click position in iframe
    const element = iframe.contentDocument.elementFromPoint(clickX, clickY)

    if (element && element !== iframe.contentDocument.body && element !== iframe.contentDocument.documentElement) {
      // Generate unique selector for this element
      const selector = generateSelector(element)

      // Get element's bounding rect
      const elementRect = element.getBoundingClientRect()

      // Calculate offset relative to element (not to document)
      const offsetX = clickX - elementRect.left
      const offsetY = clickY - elementRect.top

      // Also store absolute position as fallback
      const scrollTop = iframe.contentWindow.scrollY || 0
      const scrollLeft = iframe.contentWindow.scrollX || 0
      const docX = clickX + scrollLeft
      const docY = clickY + scrollTop

      setNewCommentPos({
        x: docX,
        y: docY,
        elementSelector: selector,
        offsetX,
        offsetY,
      })
    } else {
      // Fallback: No element found, use absolute position
      const scrollTop = iframe.contentWindow.scrollY || 0
      const scrollLeft = iframe.contentWindow.scrollX || 0
      const docX = clickX + scrollLeft
      const docY = clickY + scrollTop

      setNewCommentPos({ x: docX, y: docY })
    }
  }

  // Setup iframe scroll listener
  const handleIframeLoad = useCallback((iframe: HTMLIFrameElement | null) => {
    if (!iframe?.contentWindow || !iframe?.contentDocument) return

    const updateScrollAndSize = () => {
      const scrollX = iframe.contentWindow?.scrollX || 0
      const scrollY = iframe.contentWindow?.scrollY || 0

      // Update pin container transform (Figma-Ansatz)
      setPinContainerTransform(`translate(${-scrollX}px, ${-scrollY}px)`)

      // Update document size for position calculations
      setIframeDocSize({
        width: iframe.contentDocument?.body?.scrollWidth || iframe.clientWidth,
        height: iframe.contentDocument?.body?.scrollHeight || iframe.clientHeight,
      })
    }

    updateScrollAndSize()
    iframe.contentWindow.addEventListener('scroll', updateScrollAndSize, { passive: true })

    return () => {
      iframe.contentWindow?.removeEventListener('scroll', updateScrollAndSize)
    }
  }, [])

  // Forward wheel events to iframe
  const handleOverlayWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const iframe = iframeRef.current
    if (iframe?.contentWindow) {
      iframe.contentWindow.scrollBy(e.deltaX, e.deltaY)
    }
  }

  // Scroll to a specific comment pin
  const scrollToComment = (comment: Comment) => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const pos = getPixelPosition(comment)
    const containerHeight = iframe.clientHeight

    // Scroll so pin is centered vertically (minus some offset for the pin itself)
    const targetY = Math.max(0, pos.y - containerHeight / 2)

    iframe.contentWindow.scrollTo({
      top: targetY,
      left: 0,
      behavior: 'smooth'
    })
  }

  // Build full HTML content with Header/Footer
  const buildFullHtml = useCallback((pageContent: string) => {
    const headerHtml = globalHeader?.html || ''
    const footerHtml = globalFooter?.html || ''
    const headerCss = globalHeader?.css || ''
    const footerCss = globalFooter?.css || ''
    const headerJs = globalHeader?.js || ''
    const footerJs = globalFooter?.js || ''

    // Combine CSS
    const combinedCss = [headerCss, footerCss].filter(Boolean).join('\n')
    const combinedJs = [headerJs, footerJs].filter(Boolean).join('\n')

    // If page already has full HTML structure, inject header/footer
    if (pageContent.includes('<body')) {
      return pageContent
        .replace(/<body[^>]*>/, `$&\n${headerHtml}`)
        .replace(/<\/body>/, `${footerHtml}\n</body>`)
        .replace(/<\/head>/, `<style>${combinedCss}</style>\n</head>`)
        .replace(/<\/body>/, `<script>${combinedJs}</script>\n</body>`)
    }

    // Otherwise wrap in full HTML
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${combinedCss}</style>
</head>
<body>
  ${headerHtml}
  ${pageContent}
  ${footerHtml}
  <script>${combinedJs}</script>
</body>
</html>`
  }, [globalHeader, globalFooter])

  // Submit comment
  const handleCommentSubmit = async () => {
    if (!newCommentPos || !newCommentAuthor || !newCommentContent || !shareLink || isSubmitting) return

    setIsSubmitting(true)
    localStorage.setItem('unicorn-comment-author', newCommentAuthor)

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('share_comments')
        .insert({
          share_link_id: shareLink.id,
          page_id: currentPage?.id || null,
          author_name: newCommentAuthor,
          content: newCommentContent,
          position_x: newCommentPos.x,
          position_y: newCommentPos.y,
          element_selector: newCommentPos.elementSelector || null,
          offset_x: newCommentPos.offsetX ?? null,
          offset_y: newCommentPos.offsetY ?? null,
          status: 'open',
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving comment:', error)
      } else if (data) {
        setComments([...comments, data])
        setNewCommentPos(null)
        setNewCommentContent('')
        setIsAddingComment(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Pin SVG component
  const PinIcon = ({ number, color = '#3b82f6' }: { number: number; color?: string }) => (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
        fill={color}
      />
      <circle cx="14" cy="12" r="7" fill="white" />
      <text x="14" y="16" textAnchor="middle" fontSize="10" fontWeight="600" fill={color}>
        {number}
      </text>
    </svg>
  )

  // New pin SVG (with + symbol)
  const NewPinIcon = () => (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
      <path
        d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z"
        fill="#3b82f6"
      />
      <circle cx="14" cy="12" r="7" fill="white" />
      <path d="M14 8v8M10 12h8" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )

  // Calculate pin position - element-based if available, fallback to absolute
  const getPixelPosition = (comment: Comment): { x: number; y: number } => {
    const iframe = iframeRef.current

    // Try element-based positioning first
    if (comment.element_selector && iframe?.contentDocument && comment.offset_x != null && comment.offset_y != null) {
      try {
        const element = iframe.contentDocument.querySelector(comment.element_selector)
        if (element) {
          const rect = element.getBoundingClientRect()
          const scrollTop = iframe.contentWindow?.scrollY || 0
          const scrollLeft = iframe.contentWindow?.scrollX || 0

          // Element position + offset + scroll = absolute document position
          return {
            x: rect.left + comment.offset_x + scrollLeft,
            y: rect.top + comment.offset_y + scrollTop,
          }
        }
      } catch (e) {
        // Selector failed, fallback to absolute position
        console.warn('Element selector failed:', comment.element_selector)
      }
    }

    // Fallback: Old percent-based positions
    if (comment.position_x <= 100 && comment.position_y <= 100 && iframeDocSize.width > 0) {
      return {
        x: (comment.position_x / 100) * iframeDocSize.width,
        y: (comment.position_y / 100) * iframeDocSize.height,
      }
    }

    // Fallback: Absolute pixel position
    return { x: comment.position_x, y: comment.position_y }
  }

  // Render preview content with pin overlay
  const renderPreviewContent = (content: string) => {
    const fullHtml = buildFullHtml(content)

    return (
      <div className="relative w-full h-full overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={fullHtml}
          className="w-full h-full border-0"
          style={{
            pointerEvents: (newCommentPos || editingComment) ? 'none' : 'auto',
          }}
          onLoad={(e) => handleIframeLoad(e.currentTarget)}
        />

        {/* Click overlay for adding comments */}
        {isAddingComment && isAuthenticated && !newCommentPos && !editingComment && (
          <div
            className="absolute inset-0 cursor-crosshair bg-blue-500/5 border-2 border-blue-500/20 border-dashed"
            onClick={handleOverlayClick}
            onWheel={handleOverlayWheel}
          />
        )}

        {/* Backdrop for closing forms */}
        {(newCommentPos || editingComment) && (
          <div
            className="absolute inset-0 bg-black/10"
            onClick={() => {
              setNewCommentPos(null)
              setEditingComment(null)
            }}
          />
        )}

        {/* PIN CONTAINER - transforms with iframe scroll (Figma approach) */}
        <div
          className="absolute inset-0 pointer-events-none overflow-visible"
          style={{
            transform: pinContainerTransform,
            transformOrigin: 'top left',
          }}
        >
          {/* Render existing pins */}
          {(showComments || isAddingComment) && comments.map((comment, index) => {
            const isOnCurrentPage = comment.page_id === currentPage?.id || !comment.page_id
            if (!isOnCurrentPage) return null

            const pos = getPixelPosition(comment)

            return (
              <div
                key={comment.id}
                className={`absolute cursor-pointer pointer-events-auto transition-transform hover:scale-110 ${
                  comment.status === 'resolved' ? 'opacity-50' : ''
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  transform: 'translate(-50%, -100%)',
                  zIndex: editingComment?.id === comment.id ? 60 : 10,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingComment(editingComment?.id === comment.id ? null : comment)
                }}
              >
                <PinIcon
                  number={index + 1}
                  color={comment.status === 'open' ? '#3b82f6' : '#9ca3af'}
                />
              </div>
            )
          })}

          {/* New pin being placed */}
          {newCommentPos && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${newCommentPos.x}px`,
                top: `${newCommentPos.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <NewPinIcon />
            </div>
          )}
        </div>

        {/* Edit comment form (outside pin container so it doesn't transform) */}
        {editingComment && (() => {
          const pos = getPixelPosition(editingComment)
          const iframe = iframeRef.current
          const scrollX = iframe?.contentWindow?.scrollX || 0
          const scrollY = iframe?.contentWindow?.scrollY || 0

          // Visible position = doc position - scroll
          const visibleX = pos.x - scrollX
          const visibleY = pos.y - scrollY

          return (
            <div
              className="absolute bg-white rounded-lg shadow-xl p-4 w-64 z-50 pointer-events-auto"
              style={{
                left: `${Math.min(visibleX, window.innerWidth - 280)}px`,
                top: `${visibleY + 10}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm text-zinc-900">Anmerkung bearbeiten</span>
                <button
                  onClick={() => setEditingComment(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2 text-sm text-zinc-600">
                <span>Von</span>
                <span className="font-medium text-zinc-900">{editingComment.author_name}</span>
              </div>

              <textarea
                value={editingComment.content}
                onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                rows={3}
              />

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-400">
                  {new Date(editingComment.created_at).toLocaleDateString('de-DE')}
                </span>
                {editingComment.status === 'open' ? (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Offen</span>
                ) : (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Erledigt</span>
                )}
              </div>

              <Button
                size="sm"
                className="w-full"
                onClick={async () => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  await (supabase as any)
                    .from('share_comments')
                    .update({ content: editingComment.content })
                    .eq('id', editingComment.id)
                  setComments(comments.map(c =>
                    c.id === editingComment.id ? { ...c, content: editingComment.content } : c
                  ))
                  setEditingComment(null)
                }}
              >
                Speichern
              </Button>
            </div>
          )
        })()}

        {/* New comment form */}
        {newCommentPos && (() => {
          const iframe = iframeRef.current
          const scrollX = iframe?.contentWindow?.scrollX || 0
          const scrollY = iframe?.contentWindow?.scrollY || 0

          const visibleX = newCommentPos.x - scrollX
          const visibleY = newCommentPos.y - scrollY

          return (
            <div
              className="absolute bg-white rounded-lg shadow-xl p-4 w-64 z-50 pointer-events-auto"
              style={{
                left: `${Math.min(visibleX, window.innerWidth - 280)}px`,
                top: `${visibleY + 10}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-sm text-zinc-900">Neue Anmerkung</span>
                <button
                  onClick={() => setNewCommentPos(null)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mb-2">
                {newCommentAuthor ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <span>Als</span>
                    <span className="font-medium text-zinc-900">{newCommentAuthor}</span>
                    <button
                      type="button"
                      onClick={() => setNewCommentAuthor('')}
                      className="text-xs text-blue-500 hover:underline"
                    >
                      ändern
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Dein Name"
                    value={newCommentAuthor}
                    onChange={(e) => setNewCommentAuthor(e.target.value)}
                    className="w-full border border-zinc-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                )}
              </div>
              <textarea
                placeholder="Kommentar schreiben..."
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                className="w-full border border-zinc-200 rounded px-3 py-2 text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                rows={3}
                autoFocus
              />
              <Button
                size="sm"
                className="w-full"
                onClick={handleCommentSubmit}
                disabled={!newCommentAuthor || !newCommentContent || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Wird gesendet...
                  </span>
                ) : (
                  'Absenden'
                )}
              </Button>
            </div>
          )
        })()}
      </div>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-semibold text-white mb-2">{error}</h1>
          <p className="text-zinc-400">Der angeforderte Link konnte nicht gefunden werden.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{site?.name}</span>
          {pages.length > 1 ? (
            <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-1.5 border border-zinc-700">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <select
                value={currentPage?.id || ''}
                onChange={(e) => {
                  const page = pages.find(p => p.id === e.target.value)
                  if (page) setCurrentPage(page)
                }}
                className="bg-transparent text-white text-sm outline-none cursor-pointer"
              >
                {pages.map(page => (
                  <option key={page.id} value={page.id} className="bg-zinc-800">{page.name}</option>
                ))}
              </select>
            </div>
          ) : currentPage && (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {currentPage.name}
            </div>
          )}
        </div>

        {/* Viewport Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => { setViewport('desktop'); setMockup('none'); }}
              className={`p-1.5 rounded ${viewport === 'desktop' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setViewport('tablet'); setMockup('ipad'); }}
              className={`p-1.5 rounded ${viewport === 'tablet' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setViewport('mobile'); setMockup('iphone'); }}
              className={`p-1.5 rounded ${viewport === 'mobile' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <select
            value={mockup}
            onChange={(e) => setMockup(e.target.value as DeviceMockup)}
            className="bg-zinc-800 text-white text-sm rounded px-2 py-1 border border-zinc-700"
          >
            <option value="none">Kein Rahmen</option>
            {viewport === 'desktop' && <option value="macbook">MacBook</option>}
            {viewport === 'mobile' && <option value="iphone">iPhone</option>}
            {viewport === 'tablet' && <option value="ipad">iPad</option>}
          </select>

          {shareLink?.allow_comments && isAuthenticated && (
            <>
              <Button
                variant={isAddingComment ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAddingComment(!isAddingComment)}
                className="gap-1.5"
              >
                <svg width="14" height="18" viewBox="0 0 28 36" fill="currentColor">
                  <path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z" />
                  <circle cx="14" cy="12" r="5" fill={isAddingComment ? '#3b82f6' : 'white'} />
                </svg>
                Kommentar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className={showComments ? 'text-white' : 'text-zinc-400'}
              >
                {comments.filter(c => c.status === 'open').length} Anmerkungen
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        {mockup === 'macbook' ? (
          <div className={MOCKUP_SIZES.macbook.width}>
            <MacBookMockup>
              {renderPreviewContent(currentPage?.html_content || '')}
            </MacBookMockup>
          </div>
        ) : mockup === 'ipad' ? (
          <div className={MOCKUP_SIZES.ipad.width}>
            <IPadMockup orientation="landscape">
              {renderPreviewContent(currentPage?.html_content || '')}
            </IPadMockup>
          </div>
        ) : mockup === 'iphone' ? (
          <div className={MOCKUP_SIZES.iphone.width}>
            <IPhoneMockup>
              {renderPreviewContent(currentPage?.html_content || '')}
            </IPhoneMockup>
          </div>
        ) : (
          <div
            className="relative transition-all duration-300"
            style={{
              width: VIEWPORT_WIDTHS[viewport],
              maxWidth: '100%',
            }}
          >
            <div className="relative bg-white rounded-lg overflow-hidden shadow-2xl h-[80vh]">
              {renderPreviewContent(currentPage?.html_content || '')}
            </div>
          </div>
        )}
      </div>

      {/* Comments sidebar */}
      {shareLink?.allow_comments && showComments && comments.length > 0 && isAuthenticated && (
        <div className="fixed right-4 top-20 w-80 max-h-[calc(100vh-100px)] overflow-auto bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl">
          <div className="p-3 border-b border-zinc-800">
            <h3 className="font-medium text-white">Anmerkungen ({comments.length})</h3>
          </div>
          <div className="p-2 space-y-2">
            {comments.map((comment, index) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-zinc-700 ${
                  comment.status === 'open' ? 'bg-zinc-800' : 'bg-zinc-800/50'
                }`}
                onClick={() => scrollToComment(comment)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-white">{comment.author_name}</span>
                  {comment.status === 'resolved' && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Erledigt</span>
                  )}
                </div>
                <p className="text-sm text-zinc-300">{comment.content}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(comment.created_at).toLocaleDateString('de-DE')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Password overlay */}
      {needsPassword && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(24,24,27,0.95) 0%, rgba(39,39,42,0.9) 50%, rgba(24,24,27,0.95) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          />

          <div className="relative bg-zinc-900 rounded-xl p-8 max-w-md w-full border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-zinc-800 rounded-full mb-6 mx-auto">
              <Lock className="w-6 h-6 text-zinc-400" />
            </div>
            <h1 className="text-xl font-semibold text-white text-center mb-2">
              Passwort erforderlich
            </h1>
            <p className="text-zinc-400 text-sm text-center mb-6">
              Dieser Link ist passwortgeschützt
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <Input
                type="password"
                placeholder="Passwort eingeben"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4 bg-zinc-800 border-zinc-700 text-white"
              />
              {passwordError && (
                <p className="text-red-400 text-sm mb-4">{passwordError}</p>
              )}
              <Button type="submit" className="w-full bg-white text-zinc-900 hover:bg-zinc-100">
                <Eye className="w-4 h-4 mr-2" />
                Ansehen
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
