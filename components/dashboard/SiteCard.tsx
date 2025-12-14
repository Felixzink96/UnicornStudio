'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Site } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  ExternalLink,
  Settings,
  Copy,
  Trash2,
  Globe,
} from 'lucide-react'

// Preview Thumbnail Component with dynamic scaling
function SitePreviewThumbnail({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth
      // iframe is 1280px wide, calculate scale to fit container
      setScale(containerWidth / 1280)
    }
  }, [])

  // Clean HTML: remove scripts and add static overrides
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline opacity:0 styles
    .replace(/opacity:\s*0/gi, 'opacity:1')
    // Remove inline transform styles that hide content
    .replace(/transform:\s*translateY\([^)]+\)/gi, 'transform:none')

  const staticOverrideCSS = `
    /* FORCE ALL ELEMENTS VISIBLE - but preserve layout transforms */
    *, *::before, *::after {
      visibility: visible !important;
      animation: none !important;
      animation-delay: 0s !important;
      transition: none !important;
    }

    /* Force opacity on everything */
    [style*="opacity"], .opacity-0, [class*="opacity-0"] {
      opacity: 1 !important;
    }

    /* Reset ONLY reveal/animation classes that hide content */
    .reveal-up, .reveal-down, .reveal-left, .reveal-right,
    .reveal, [class*="reveal-"], .animate-fade, .animate-slide,
    [class*="fade-in"], [class*="slide-in"] {
      opacity: 1 !important;
      transform: translateY(0) translateX(0) !important;
    }

    /* Hide interactive elements */
    [id*="cursor"], [class*="cursor-"], .cursor-dot, .cursor-ring,
    #cursor-dot, #cursor-ring {
      display: none !important;
    }

    /* Body setup */
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }

    /* Stop all animations */
    @keyframes none { }
    .animate-spin, .animate-pulse, .animate-bounce, .animate-ping,
    [class*="animate-"] {
      animation: none !important;
    }
  `

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <iframe
        srcDoc={`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>${staticOverrideCSS}</style>
          </head>
          <body>${cleanHtml}</body>
          </html>
        `}
        className="absolute top-0 left-0 border-0"
        style={{
          width: '1280px',
          height: '720px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        sandbox="allow-scripts"
        loading="lazy"
      />
      {/* Overlay to block iframe interactions */}
      <div className="absolute inset-0 z-[5]" />
    </div>
  )
}

interface WordPressIntegration {
  webhook_url?: string
  site_url?: string
  domain?: string
  connected_at?: string
}

export interface SiteWithPreview extends Omit<Site, 'integrations'> {
  homePageHtml?: string | null
  integrations?: {
    wordpress?: WordPressIntegration
  } | null
}

interface SiteCardProps {
  site: SiteWithPreview
  onDelete?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export function SiteCard({ site, onDelete, onDuplicate }: SiteCardProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-500/10 text-yellow-500',
    published: 'bg-green-500/10 text-green-500',
    archived: 'bg-gray-500/10 text-gray-500',
  }

  const siteStatus = site.status || 'draft'
  const hasWordPress = !!(site.integrations as any)?.wordpress?.webhook_url

  return (
    <Card className="group relative overflow-hidden bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer p-0 gap-0">
      {/* Full card link - z-10 to be above content, but below dropdown (z-20) */}
      <Link href={`/dashboard/sites/${site.id}`} className="absolute inset-0 z-10" />

      {/* Thumbnail / Live Preview */}
      <div className="aspect-video bg-slate-800 relative overflow-hidden">
        {site.homePageHtml ? (
          <SitePreviewThumbnail html={site.homePageHtml} />
        ) : site.thumbnail_url ? (
          <img
            src={site.thumbnail_url}
            alt={site.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Globe className="w-12 h-12 text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate group-hover:text-purple-400 transition-colors">
              {site.name}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Updated{' '}
              {formatDistanceToNow(new Date(site.updated_at || Date.now()), {
                addSuffix: true,
                locale: de,
              })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white relative z-20"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-slate-900 border-slate-800"
            >
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/sites/${site.id}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/dashboard/sites/${site.id}/settings`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => onDuplicate?.(site.id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => onDelete?.(site.id)}
                className="flex items-center gap-2 cursor-pointer text-red-400 focus:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge className={statusColors[siteStatus]}>{siteStatus}</Badge>
          {hasWordPress && (
            <Badge className="bg-blue-500/10 text-blue-400 gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18.5c-4.687 0-8.5-3.813-8.5-8.5 0-4.687 3.813-8.5 8.5-8.5 4.687 0 8.5 3.813 8.5 8.5 0 4.687-3.813 8.5-8.5 8.5zm-3.5-8.5L5.5 17l2.5-5 2 3 3-5 4 7H8.5z"/>
              </svg>
              WP
            </Badge>
          )}
          {site.subdomain && (
            <span className="text-xs text-slate-500">
              {site.subdomain}.unicorn.studio
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
