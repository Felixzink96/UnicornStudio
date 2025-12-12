import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { SiteSidebar } from '@/components/dashboard/SiteSidebar'
import type { ContentType } from '@/types/cms'

interface SiteLayoutProps {
  children: React.ReactNode
  params: Promise<{ siteId: string }>
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
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

  // Get content types for this site
  const { data: contentTypesData } = await supabase
    .from('content_types')
    .select('*')
    .eq('site_id', siteId)
    .order('name', { ascending: true })

  const contentTypes = (contentTypesData || []) as ContentType[]

  return (
    <div className="flex h-full">
      <SiteSidebar
        siteId={siteId}
        siteName={site.name}
        contentTypes={contentTypes}
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
