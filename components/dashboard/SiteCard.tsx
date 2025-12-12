'use client'

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

interface SiteCardProps {
  site: Site
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

  return (
    <Card className="group relative overflow-hidden bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors">
      {/* Thumbnail */}
      <Link href={`/dashboard/sites/${site.id}`}>
        <div className="aspect-video bg-slate-800 relative overflow-hidden">
          {site.thumbnail_url ? (
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link href={`/dashboard/sites/${site.id}`}>
              <h3 className="font-semibold text-white truncate hover:text-purple-400 transition-colors">
                {site.name}
              </h3>
            </Link>
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
                className="h-8 w-8 text-slate-400 hover:text-white"
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
