import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, LayoutTemplate, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu {site.name}
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-purple-500" />
            Vorlagen
          </h1>
          <p className="text-muted-foreground mt-2">
            Layouts und Strukturen für deine Inhalte
          </p>
        </div>
        <Link href={`/dashboard/sites/${siteId}/templates/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Neue Vorlage
          </Button>
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
