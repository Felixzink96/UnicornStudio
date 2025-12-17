import { notFound } from 'next/navigation'
import { SiteSidebar } from '@/components/dashboard/SiteSidebar'
import { getSiteById, getContentTypesBySite } from '@/lib/supabase/cached-queries'

interface SiteLayoutProps {
  children: React.ReactNode
  params: Promise<{ siteId: string }>
}

export default async function SiteLayout({ children, params }: SiteLayoutProps) {
  const { siteId } = await params

  // Cached queries - werden nur 1x pro Request ausgeführt
  const [site, contentTypes] = await Promise.all([
    getSiteById(siteId),
    getContentTypesBySite(siteId),
  ])

  if (!site) {
    notFound()
  }

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
