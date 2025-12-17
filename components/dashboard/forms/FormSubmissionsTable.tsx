'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Download,
  MoreHorizontal,
  Mail,
  Eye,
  Trash2,
  CheckCircle,
  Circle,
  Filter,
  RefreshCw,
} from 'lucide-react'

interface FormSubmission {
  id: string
  form_id: string
  data: Record<string, unknown>
  metadata: {
    ip?: string
    user_agent?: string
    referrer?: string
    submitted_at?: string
  }
  is_spam: boolean
  is_read: boolean
  created_at: string
  form_name?: string
}

interface FormSubmissionsTableProps {
  siteId: string
  formId?: string
}

export function FormSubmissionsTable({ siteId, formId }: FormSubmissionsTableProps) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSubmissions()
  }, [siteId, formId])

  async function loadSubmissions() {
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('form_submissions')
        .select(`
          id,
          form_id,
          data,
          metadata,
          is_spam,
          is_read,
          created_at
        `)
        .eq('site_id', siteId)
        .eq('is_spam', false)
        .order('created_at', { ascending: false })

      if (formId) {
        query = query.eq('form_id', formId)
      }

      const { data, error } = await query

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsRead(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('form_submissions')
      .update({ is_read: true })
      .eq('id', id)

    setSubmissions(submissions.map(s =>
      s.id === id ? { ...s, is_read: true } : s
    ))
  }

  async function markAsSpam(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('form_submissions')
      .update({ is_spam: true })
      .eq('id', id)

    setSubmissions(submissions.filter(s => s.id !== id))
  }

  async function deleteSubmission(id: string) {
    if (!confirm('Eintrag wirklich löschen?')) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('form_submissions')
      .delete()
      .eq('id', id)

    setSubmissions(submissions.filter(s => s.id !== id))
  }

  function exportToCSV() {
    if (submissions.length === 0) return

    // Get all unique keys from data
    const allKeys = new Set<string>()
    submissions.forEach(s => {
      Object.keys(s.data).forEach(key => allKeys.add(key))
    })
    const headers = ['Datum', ...Array.from(allKeys), 'Gelesen']

    const rows = submissions.map(s => [
      new Date(s.created_at).toLocaleString('de-DE'),
      ...Array.from(allKeys).map(key => String(s.data[key] || '')),
      s.is_read ? 'Ja' : 'Nein',
    ])

    const csv = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `form-submissions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const filteredSubmissions = submissions.filter(s => {
    if (showUnreadOnly && s.is_read) return false
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return Object.values(s.data).some(val =>
        String(val).toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const unreadCount = submissions.filter(s => !s.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button
            variant={showUnreadOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            <Circle className="h-3 w-3 mr-1.5 fill-current" />
            Ungelesen ({unreadCount})
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadSubmissions}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Aktualisieren
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-50 rounded-lg p-4">
          <div className="text-2xl font-semibold">{submissions.length}</div>
          <div className="text-sm text-zinc-500">Gesamt</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-blue-600">{unreadCount}</div>
          <div className="text-sm text-zinc-500">Ungelesen</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-semibold text-green-600">
            {submissions.filter(s => s.is_read).length}
          </div>
          <div className="text-sm text-zinc-500">Bearbeitet</div>
        </div>
      </div>

      {/* Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Mail className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
          <p>Keine Einträge gefunden</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="w-10 px-4 py-3 text-left"></th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Datum</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600">Inhalt</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredSubmissions.map((submission) => (
                <tr
                  key={submission.id}
                  className={`cursor-pointer hover:bg-zinc-50 ${!submission.is_read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => {
                    setSelectedSubmission(submission)
                    if (!submission.is_read) markAsRead(submission.id)
                  }}
                >
                  <td className="px-4 py-3">
                    {submission.is_read ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-blue-500 fill-blue-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {new Date(submission.created_at).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="truncate max-w-md text-sm">
                      {Object.entries(submission.data)
                        .slice(0, 3)
                        .map(([key, val]) => `${key}: ${val}`)
                        .join(' | ')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedSubmission(submission)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Anzeigen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => markAsSpam(submission.id)}>
                          <Filter className="h-4 w-4 mr-2" />
                          Als Spam markieren
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deleteSubmission(submission.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Formular-Eintrag</h3>
              <p className="text-sm text-zinc-500">
                {new Date(selectedSubmission.created_at).toLocaleString('de-DE')}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {Object.entries(selectedSubmission.data).map(([key, value]) => (
                <div key={key}>
                  <div className="text-sm font-medium text-zinc-500 mb-1">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div className="text-zinc-900">{String(value)}</div>
                </div>
              ))}
              {selectedSubmission.metadata && (
                <div className="pt-4 border-t">
                  <div className="text-xs text-zinc-400 space-y-1">
                    {selectedSubmission.metadata.ip && (
                      <div>IP: {selectedSubmission.metadata.ip}</div>
                    )}
                    {selectedSubmission.metadata.referrer && (
                      <div>Referrer: {selectedSubmission.metadata.referrer}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-zinc-50 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                Schließen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
