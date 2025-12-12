import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Search, Puzzle, ChevronRight } from 'lucide-react'

interface SettingsPageProps {
  params: Promise<{ siteId: string }>
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { siteId } = await params
  const supabase = await createClient()

  // Get site
  const { data: site, error } = await supabase
    .from('sites')
    .select('name')
    .eq('id', siteId)
    .single()

  if (error || !site) {
    notFound()
  }

  const settingsLinks = [
    {
      title: 'SEO',
      description: 'Meta-Tags, Open Graph und Suchmaschinenoptimierung',
      href: `/dashboard/sites/${siteId}/settings/seo`,
      icon: Search,
    },
    {
      title: 'Integrationen',
      description: 'WordPress, Webhooks und externe Verbindungen',
      href: `/dashboard/sites/${siteId}/settings/integrations`,
      icon: Puzzle,
    },
  ]

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href={`/dashboard/sites/${siteId}`}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Zuruck zu {site.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Einstellungen</h1>
        <p className="text-slate-400 mt-2">
          Konfiguriere deine Site
        </p>
      </div>

      {/* Settings Links */}
      <div className="grid gap-4">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10">
                    <link.icon className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{link.title}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {link.description}
                    </CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
