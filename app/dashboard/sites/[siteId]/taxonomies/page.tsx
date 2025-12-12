import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Tags, Plus, FolderTree, Tag } from 'lucide-react'
import { TaxonomiesList } from '@/components/content/TaxonomiesList'
import type { Taxonomy } from '@/types/cms'

interface TaxonomiesPageProps {
  params: Promise<{ siteId: string }>
}

export default async function TaxonomiesPage({ params }: TaxonomiesPageProps) {
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

  // Get taxonomies
  const { data: taxonomiesData } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('site_id', siteId)
    .order('name', { ascending: true })

  const taxonomies = (taxonomiesData || []) as Taxonomy[]

  // Get term counts for each taxonomy
  const termCounts: Record<string, number> = {}
  for (const tax of taxonomies) {
    const { count } = await supabase
      .from('terms')
      .select('*', { count: 'exact', head: true })
      .eq('taxonomy_id', tax.id)

    termCounts[tax.id] = count || 0
  }

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
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Tags className="h-8 w-8 text-purple-500" />
            Taxonomien
          </h1>
          <p className="text-slate-400 mt-2">
            Verwalte Kategorien, Tags und andere Klassifizierungen
          </p>
        </div>
        <TaxonomiesList
          siteId={siteId}
          initialTaxonomies={taxonomies}
          termCounts={termCounts}
          showCreateButton
        />
      </div>

      {/* Taxonomies Grid */}
      {taxonomies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxonomies.map((taxonomy) => (
            <Link
              key={taxonomy.id}
              href={`/dashboard/sites/${siteId}/taxonomies/${taxonomy.id}`}
              className="p-6 bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-purple-500/20">
                  {taxonomy.hierarchical ? (
                    <FolderTree className="h-6 w-6 text-purple-400" />
                  ) : (
                    <Tag className="h-6 w-6 text-purple-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                    {taxonomy.label_plural}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {termCounts[taxonomy.id]} {termCounts[taxonomy.id] === 1 ? 'Begriff' : 'Begriffe'}
                  </p>
                  <p className="text-xs text-slate-600 mt-2">
                    {taxonomy.hierarchical ? 'Hierarchisch' : 'Flat'} • /{taxonomy.slug}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 rounded-lg border border-slate-800">
          <Tags className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Keine Taxonomien vorhanden
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Erstelle Taxonomien wie Kategorien oder Tags, um deine Inhalte zu organisieren.
          </p>
        </div>
      )}
    </div>
  )
}
