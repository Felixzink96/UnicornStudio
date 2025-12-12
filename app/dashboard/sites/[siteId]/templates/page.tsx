import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, LayoutTemplate, Plus } from 'lucide-react'
import { TemplatesList } from '@/components/templates/TemplatesList'
import type { Template, TemplateType } from '@/types/cms'

interface TemplatesPageProps {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ type?: TemplateType }>
}

export default async function TemplatesPage({ params, searchParams }: TemplatesPageProps) {
  const { siteId } = await params
  const { type } = await searchParams
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
    .from('templates')
    .select('*')
    .eq('site_id', siteId)

  if (type) {
    query = query.eq('type', type)
  }

  query = query.order('priority', { ascending: false }).order('name', { ascending: true })

  const { data: templatesData } = await query
  const templates = (templatesData || []) as Template[]

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
            <LayoutTemplate className="h-8 w-8 text-purple-500" />
            Templates
          </h1>
          <p className="text-slate-400 mt-2">
            Layouts und Strukturen für deine Inhalte
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/templates/new`}>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-purple-600 text-white hover:bg-purple-700 h-9 px-4 py-2">
            <Plus className="h-4 w-4 mr-2" />
            Neues Template
          </button>
        </Link>
      </div>

      {/* Templates List */}
      <TemplatesList
        siteId={siteId}
        templates={templates}
        currentType={type}
      />
    </div>
  )
}
