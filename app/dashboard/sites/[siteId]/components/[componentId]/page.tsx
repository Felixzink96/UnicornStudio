import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Puzzle } from 'lucide-react'
import { ComponentEditor } from '@/components/components-library/ComponentEditor'
import type { CMSComponent } from '@/types/cms'

interface EditComponentPageProps {
  params: Promise<{ siteId: string; componentId: string }>
}

export default async function EditComponentPage({ params }: EditComponentPageProps) {
  const { siteId, componentId } = await params
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

  // Get component
  const { data: componentData, error: componentError } = await supabase
    .from('cms_components')
    .select('*')
    .eq('id', componentId)
    .eq('site_id', siteId)
    .single()

  if (componentError || !componentData) {
    notFound()
  }

  const component = componentData as CMSComponent

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}/components`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Component Library
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Puzzle className="h-8 w-8 text-purple-500" />
          {component.name}
        </h1>
        <p className="text-slate-400 mt-2">
          Component bearbeiten
        </p>
      </div>

      {/* Component Editor */}
      <ComponentEditor siteId={siteId} component={component} />
    </div>
  )
}
