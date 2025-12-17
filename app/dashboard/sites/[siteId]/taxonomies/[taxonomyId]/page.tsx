import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Tags, FolderTree, Tag } from 'lucide-react'
import { TermsManager } from '@/components/content/TermsManager'
import type { Taxonomy, Term } from '@/types/cms'

interface TaxonomyDetailPageProps {
  params: Promise<{ siteId: string; taxonomyId: string }>
}

export default async function TaxonomyDetailPage({ params }: TaxonomyDetailPageProps) {
  const { siteId, taxonomyId } = await params
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

  // Get taxonomy
  const { data: taxonomyData, error: taxError } = await supabase
    .from('taxonomies')
    .select('*')
    .eq('id', taxonomyId)
    .single()

  if (taxError || !taxonomyData) {
    notFound()
  }

  const taxonomy = taxonomyData as Taxonomy

  // Get terms
  const { data: termsData } = await supabase
    .from('terms')
    .select('*')
    .eq('taxonomy_id', taxonomyId)
    .order('position', { ascending: true })

  const terms = (termsData || []) as Term[]

  // Get entry counts for each term
  const termEntryCounts: Record<string, number> = {}
  for (const term of terms) {
    const { count } = await supabase
      .from('entry_terms')
      .select('*', { count: 'exact', head: true })
      .eq('term_id', term.id)

    termEntryCounts[term.id] = count || 0
  }

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/taxonomies`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Taxonomien
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            {taxonomy.hierarchical ? (
              <FolderTree className="h-6 w-6 text-purple-400" />
            ) : (
              <Tag className="h-6 w-6 text-purple-400" />
            )}
          </div>
          {taxonomy.label_plural}
        </h1>
        <p className="text-muted-foreground mt-2">
          {taxonomy.hierarchical ? 'Hierarchische Taxonomie' : 'Flache Taxonomie'} • /{taxonomy.slug}
        </p>
      </div>

      {/* Terms Manager */}
      <TermsManager
        taxonomy={taxonomy}
        initialTerms={terms}
        entryCounts={termEntryCounts}
      />
    </div>
  )
}
