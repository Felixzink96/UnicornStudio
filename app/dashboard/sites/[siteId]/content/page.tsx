import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Plus, Layers } from 'lucide-react'
import type { ContentType } from '@/types/cms'

interface ContentPageProps {
  params: Promise<{ siteId: string }>
}

export default async function ContentPage({ params }: ContentPageProps) {
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

  // Get content types
  const { data: contentTypesData } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .eq('show_in_menu', true)
    .order('menu_position', { ascending: true })

  const contentTypes = (contentTypesData || []) as ContentType[]

  // If there's only one content type, redirect to it
  if (contentTypes.length === 1) {
    redirect(`/dashboard/sites/${siteId}/content/${contentTypes[0].slug}`)
  }

  // Get entry counts
  const entryCounts: Record<string, number> = {}
  for (const ct of contentTypes) {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', ct.id)

    entryCounts[ct.id] = count || 0
  }

  // Map icon names to components (simplified)
  const getIconColor = (color: string | null) => color || '#8b5cf6'

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FileText className="h-8 w-8 text-purple-500" />
          Inhalte
        </h1>
        <p className="text-slate-400 mt-2">
          Wähle einen Content Type, um Inhalte zu verwalten
        </p>
      </div>

      {/* Content Types Grid */}
      {contentTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contentTypes.map((ct) => (
            <Link
              key={ct.id}
              href={`/dashboard/sites/${siteId}/content/${ct.slug}`}
              className="p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: `${getIconColor(ct.color)}20` }}
                >
                  <FileText
                    className="h-6 w-6"
                    style={{ color: getIconColor(ct.color) }}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {ct.label_plural}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {entryCounts[ct.id]} {entryCounts[ct.id] === 1 ? 'Eintrag' : 'Einträge'}
                  </p>
                </div>
              </div>
              {ct.description && (
                <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                  {ct.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <Layers className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Keine Content Types vorhanden
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Erstelle zuerst Content Types im Builder, um Inhalte verwalten zu können.
          </p>
          <Link href={`/dashboard/sites/${siteId}/builder/content-types`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Content Types erstellen
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
