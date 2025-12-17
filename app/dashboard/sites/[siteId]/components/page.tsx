import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Puzzle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComponentLibrary } from '@/components/components-library/ComponentLibrary'
import type { CMSComponent } from '@/types/cms'

interface ComponentsPageProps {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ type?: string; category?: string; search?: string }>
}

export default async function ComponentsPage({ params, searchParams }: ComponentsPageProps) {
  const { siteId } = await params
  const { type, category, search } = await searchParams
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

  // Build query
  let query = supabase
    .from('cms_components')
    .select('*')
    .eq('site_id', siteId)

  if (type) {
    query = query.eq('type', type)
  }

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  query = query.order('usage_count', { ascending: false }).order('name', { ascending: true })

  const { data: componentsData } = await query
  const components = (componentsData || []) as CMSComponent[]

  // Get categories
  const { data: categoriesData } = await supabase
    .from('cms_components')
    .select('category')
    .eq('site_id', siteId)
    .not('category', 'is', null)

  const categories = [...new Set((categoriesData || []).map((c) => c.category).filter(Boolean))]

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Puzzle className="h-8 w-8 text-purple-500" />
            Komponenten-Bibliothek
          </h1>
          <p className="text-muted-foreground mt-2">
            Wiederverwendbare UI-Bausteine für deine Website
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/components/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Komponente
          </Button>
        </Link>
      </div>

      {/* Component Library */}
      <ComponentLibrary
        siteId={siteId}
        components={components}
        categories={categories as string[]}
        currentType={type}
        currentCategory={category}
        searchQuery={search}
      />
    </div>
  )
}
