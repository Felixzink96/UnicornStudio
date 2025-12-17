import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FormSubmissionsTable } from '@/components/dashboard/forms/FormSubmissionsTable'
import { FormStatsChart } from '@/components/dashboard/forms/FormStatsChart'
import { Button } from '@/components/ui/button'
import { Mail, Settings } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ siteId: string }>
  searchParams: Promise<{ formId?: string }>
}

export default async function FormsPage({ params, searchParams }: PageProps) {
  const { siteId } = await params
  const { formId } = await searchParams
  const supabase = await createClient()

  // Get user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get site
  const { data: site } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', siteId)
    .single()

  if (!site) redirect('/dashboard')

  // Get forms (components with form_config) - feature not yet implemented
  const forms: Array<{ id: string; name: string }> = []

  // Get submission stats
  const { data: stats } = await supabase
    .from('form_submissions')
    .select('id, created_at')
    .eq('site_id', siteId)

  const totalSubmissions = stats?.length || 0
  const unreadSubmissions = 0 // is_read column doesn't exist yet
  const todaySubmissions = stats?.filter(s => {
    if (!s.created_at) return false
    const today = new Date()
    const created = new Date(s.created_at)
    return created.toDateString() === today.toDateString()
  }).length || 0

  // Get submissions per day for chart (last 14 days)
  const chartData = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const count = stats?.filter(s =>
      s.created_at?.startsWith(dateStr)
    ).length || 0
    chartData.push({
      date: dateStr,
      label: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      count
    })
  }

  return (
    <div className="p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              <Mail className="h-7 w-7 text-purple-500" />
              Formular-Einsendungen
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Alle Formulareinsendungen für {site.name}
            </p>
          </div>
          <Link href={`/dashboard/sites/${siteId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Einstellungen
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalSubmissions}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Gesamt</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-blue-500">{unreadSubmissions}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Ungelesen</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-green-500">{todaySubmissions}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Heute</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="text-3xl font-bold text-purple-500">{forms?.length || 0}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Formulare</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Einsendungen (letzte 14 Tage)</h2>
          <FormStatsChart data={chartData} />
        </div>

        {/* Form Filter */}
        {forms && forms.length > 1 && (
          <div className="flex gap-2 mb-4">
            <Link href={`/dashboard/sites/${siteId}/forms`}>
              <Button
                variant={!formId ? 'default' : 'outline'}
                size="sm"
              >
                Alle
              </Button>
            </Link>
            {forms.map(form => (
              <Link key={form.id} href={`/dashboard/sites/${siteId}/forms?formId=${form.id}`}>
                <Button
                  variant={formId === form.id ? 'default' : 'outline'}
                  size="sm"
                >
                  {form.name}
                </Button>
              </Link>
            ))}
          </div>
        )}

        {/* Submissions Table */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <FormSubmissionsTable siteId={siteId} formId={formId} />
        </div>
      </div>
    </div>
  )
}
