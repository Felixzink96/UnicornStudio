import { redirect } from 'next/navigation'

interface BuilderPageProps {
  params: Promise<{ siteId: string }>
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { siteId } = await params
  // Redirect to content-types by default
  redirect(`/dashboard/sites/${siteId}/builder/content-types`)
}
