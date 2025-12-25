import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Layers } from 'lucide-react'
import { DesignSystemEditor } from '@/components/design-system/DesignSystemEditor'

interface DesignSystemPageProps {
  params: Promise<{ siteId: string }>
}

export default async function DesignSystemPage({ params }: DesignSystemPageProps) {
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

  // Get design system
  const { data: designSystem } = await supabase
    .from('site_design_system')
    .select('*')
    .eq('site_id', siteId)
    .single()

  // Get design variables (colors, fonts, etc.)
  const { data: designVariables } = await supabase
    .from('design_variables')
    .select('colors, typography')
    .eq('site_id', siteId)
    .single()

  // Extract colors for preview
  const colors = designVariables?.colors as {
    brand?: { primary?: string; secondary?: string; accent?: string }
    neutral?: { [key: string]: string }
  } | null

  const previewColors = {
    primary: colors?.brand?.primary || '#3b82f6',
    secondary: colors?.brand?.secondary || '#64748b',
    accent: colors?.brand?.accent || '#f59e0b',
    background: colors?.neutral?.['50'] || '#ffffff',
    foreground: colors?.neutral?.['900'] || '#0f172a',
    muted: colors?.neutral?.['100'] || '#f1f5f9',
    border: colors?.neutral?.['200'] || '#e2e8f0',
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Layers className="h-8 w-8 text-purple-500" />
          Design System
        </h1>
        <p className="text-muted-foreground mt-2">
          Wiederverwendbare Komponenten-Styles für konsistentes Design
        </p>
      </div>

      {/* Design System Editor */}
      <DesignSystemEditor siteId={siteId} initialDesignSystem={designSystem} colors={previewColors} />
    </div>
  )
}
