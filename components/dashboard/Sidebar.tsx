'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  LayoutDashboard,
  Globe,
  FolderOpen,
  Settings,
  LogOut,
  Sparkles,
  Key,
  Puzzle,
  ChevronDown,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, exact: true },
  { name: 'Websites', href: '/dashboard/sites', icon: Globe },
  { name: 'Vorlagen', href: '/dashboard/templates', icon: FolderOpen },
]

const settingsNavigation = [
  { name: 'API-Schlüssel', href: '/dashboard/settings/api-keys', icon: Key },
  { name: 'Integrationen', href: '/dashboard/settings/integrations', icon: Puzzle },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith('/dashboard/settings'))

  const isSettingsActive = pathname.startsWith('/dashboard/settings')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100">
            <Sparkles className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Unicorn Studio</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        {/* Settings with sub-menu */}
        <div className="pt-2">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full',
              isSettingsActive
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            )}
          >
            <Settings className="h-5 w-5" />
            <span className="flex-1 text-left">Einstellungen</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                settingsOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Settings Sub-Items */}
          {settingsOpen && (
            <div className="mt-1 ml-4 space-y-1 border-l border-zinc-200 dark:border-zinc-700 pl-3">
              <Link
                href="/dashboard/settings"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/dashboard/settings'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                )}
              >
                Übersicht
              </Link>
              {settingsNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Sign Out */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          Abmelden
        </Button>
      </div>
    </div>
  )
}
