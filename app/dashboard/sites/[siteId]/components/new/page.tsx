import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComponentEditorAI } from '@/components/components-library/ComponentEditorAI'

interface NewComponentPageProps {
  params: Promise<{ siteId: string }>
}

export default async function NewComponentPage({ params }: NewComponentPageProps) {
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

  // Get design variables for preview
  const { data: designVars } = await supabase
    .from('design_variables')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Cast design variables to expected format
  const designTokens = designVars ? {
    colors: designVars.colors as { brand?: Record<string, string>; neutral?: Record<string, string> } | undefined,
    typography: designVars.typography as { fontHeading?: string; fontBody?: string; fontMono?: string } | undefined,
  } : undefined

  // Full-screen overlay editor (like template editor)
  return (
    <div className="fixed inset-0 z-50">
      <ComponentEditorAI
        siteId={siteId}
        designVariables={designTokens}
      />
    </div>
  )
}
