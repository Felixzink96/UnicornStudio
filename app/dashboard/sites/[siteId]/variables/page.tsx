import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Palette } from 'lucide-react'
import { VariablesEditor } from '@/components/variables/VariablesEditor'
import type { DesignVariables } from '@/types/cms'

interface VariablesPageProps {
  params: Promise<{ siteId: string }>
}

export default async function VariablesPage({ params }: VariablesPageProps) {
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

  // Get or create design variables
  let { data: variablesData } = await supabase
    .from('design_variables')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Create default if not exists
  if (!variablesData) {
    const { data: newData } = await supabase
      .from('design_variables')
      .insert({ site_id: siteId })
      .select()
      .single()
    variablesData = newData
  }

  const variables = variablesData as DesignVariables

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Palette className="h-8 w-8 text-purple-500" />
          Design Variables
        </h1>
        <p className="text-muted-foreground mt-2">
          Globale Design Tokens für Farben, Typography, Spacing und mehr
        </p>
      </div>

      {/* Variables Editor */}
      <VariablesEditor siteId={siteId} initialVariables={variables} />
    </div>
  )
}
