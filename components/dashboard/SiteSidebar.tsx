'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  FileText,
  Layers,
  FolderTree,
  Puzzle,
  LayoutTemplate,
  Palette,
  Search,
  Settings,
  ArrowLeft,
  Database,
  Menu,
  Mail,
  Image,
  SwatchBook,
} from 'lucide-react'
import type { ContentType } from '@/types/cms'

interface SiteSidebarProps {
  siteId: string
  siteName: string
  contentTypes: ContentType[]
}

export function SiteSidebar({ siteId, siteName, contentTypes }: SiteSidebarProps) {
  const pathname = usePathname()

  const mainNavigation = [
    { name: 'Übersicht', href: `/dashboard/sites/${siteId}`, icon: Database },
    { name: 'Seiten', href: `/dashboard/sites/${siteId}/pages`, icon: FileText },
    { name: 'Menüs', href: `/dashboard/sites/${siteId}/menus`, icon: Menu },
    { name: 'Formulare', href: `/dashboard/sites/${siteId}/forms`, icon: Mail },
    { name: 'Medien', href: `/dashboard/sites/${siteId}/media`, icon: Image },
  ]

  const cmsNavigation = [
    { name: 'Inhaltstypen', href: `/dashboard/sites/${siteId}/builder/content-types`, icon: Layers },
    { name: 'Taxonomien', href: `/dashboard/sites/${siteId}/taxonomies`, icon: FolderTree },
    { name: 'Komponenten', href: `/dashboard/sites/${siteId}/components`, icon: Puzzle },
    { name: 'Vorlagen', href: `/dashboard/sites/${siteId}/templates`, icon: LayoutTemplate },
  ]

  const designNavigation = [
    { name: 'Design System', href: `/dashboard/sites/${siteId}/design-system`, icon: SwatchBook },
    { name: 'Design-Variablen', href: `/dashboard/sites/${siteId}/variables`, icon: Palette },
    { name: 'SEO-Einstellungen', href: `/dashboard/sites/${siteId}/settings/seo`, icon: Search },
    { name: 'Einstellungen', href: `/dashboard/sites/${siteId}/settings`, icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === `/dashboard/sites/${siteId}`) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full w-56 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Back to Sites */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <Link
          href="/dashboard/sites"
          className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Alle Sites
        </Link>
        <h2 className="text-zinc-900 dark:text-zinc-100 font-semibold mt-2 truncate">{siteName}</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {/* Main */}
        <div>
          {mainNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Content Types */}
        {contentTypes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">
              Inhalte
            </p>
            {contentTypes.map((ct) => (
              <Link
                key={ct.id}
                href={`/dashboard/sites/${siteId}/content/${ct.slug}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  pathname.includes(`/content/${ct.slug}`)
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                <FileText className="h-4 w-4" />
                {ct.label_plural || ct.name}
              </Link>
            ))}
          </div>
        )}

        {/* CMS */}
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">
            CMS
          </p>
          {cmsNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        {/* Design & Settings */}
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mb-2 px-2">
            Design & Settings
          </p>
          {designNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive(item.href)
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
