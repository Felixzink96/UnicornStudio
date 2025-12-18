import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Menu, Plus, ArrowLeft } from 'lucide-react'
import { MenusList } from './MenusList'

interface MenusPageProps {
  params: Promise<{ siteId: string }>
}

export default async function MenusPage({ params }: MenusPageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .single()

  if (siteError || !site) {
    notFound()
  }

  // Get menus with item count using RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: menusData, error: menusError } = await (supabase as any).rpc('get_site_menus', {
    p_site_id: siteId,
  })

  if (menusError) {
    console.error('Failed to load menus:', menusError)
  }

  const menus = (menusData || []).map((m: Record<string, unknown>) => ({
    id: m.id as string,
    name: m.name as string,
    slug: m.slug as string,
    description: m.description as string | undefined,
    menu_position: (m.menu_position || 'custom') as string,
    item_count: (m.item_count || 0) as number,
  }))

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <Menu className="h-8 w-8 text-purple-500" />
            Menüs
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Verwalte die Navigation von {site.name}
          </p>
        </div>
      </div>

      {/* Menus List (Client Component for interactivity) */}
      <MenusList siteId={siteId} initialMenus={menus} />
    </div>
  )
}
