import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Layers,
  FileText,
  Image,
  ShoppingBag,
  Calendar,
  Users,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react'
import { ContentTypesList } from './ContentTypesList'
import type { ContentType } from '@/types/cms'

// Map icon names to Lucide components
const iconMap: Record<string, React.ElementType> = {
  'file-text': FileText,
  'image': Image,
  'shopping-bag': ShoppingBag,
  'calendar': Calendar,
  'users': Users,
  'bookmark': Bookmark,
  'layers': Layers,
}

interface ContentTypesPageProps {
  params: Promise<{ siteId: string }>
}

export default async function ContentTypesPage({ params }: ContentTypesPageProps) {
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

  // Get content types with entry counts
  const { data: contentTypesData } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .order('menu_position', { ascending: true })

  const contentTypes = (contentTypesData || []) as ContentType[]

  // Get entry counts for each content type
  const entryCounts: Record<string, number> = {}
  for (const ct of contentTypes) {
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', ct.id)

    entryCounts[ct.id] = count || 0
  }

  // Get field counts for each content type
  const fieldCounts: Record<string, number> = {}
  for (const ct of contentTypes) {
    const { count } = await supabase
      .from('fields')
      .select('*', { count: 'exact', head: true })
      .eq('content_type_id', ct.id)

    fieldCounts[ct.id] = count || 0
  }

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
            <Layers className="h-8 w-8 text-purple-500" />
            Inhaltstypen
          </h1>
          <p className="text-muted-foreground mt-2">
            Erstelle und verwalte deine eigenen Inhaltstypen
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/builder/content-types/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neuer Inhaltstyp
          </Button>
        </Link>
      </div>

      {/* Content Types List */}
      {contentTypes.length > 0 ? (
        <ContentTypesList
          siteId={siteId}
          initialContentTypes={contentTypes}
          entryCounts={entryCounts}
          fieldCounts={fieldCounts}
        />
      ) : (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <Layers className="h-16 w-16 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Keine Inhaltstypen vorhanden
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Inhaltstypen definieren die Struktur deiner Inhalte. Erstelle z.B.
            Blog-Beiträge, Produkte, Rezepte oder Events.
          </p>
          <Link href={`/dashboard/sites/${siteId}/builder/content-types/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ersten Inhaltstyp erstellen
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
