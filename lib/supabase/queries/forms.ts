import { createClient } from '@/lib/supabase/client'

export interface FormConfig {
  recipient_email: string
  subject?: string
  success_message?: string
  error_message?: string
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  fields?: FormField[]
}

export interface FormField {
  name: string
  type: string
  label: string
  required: boolean
  validation?: string
  placeholder?: string
}

export interface FormComponent {
  id: string
  site_id: string
  name: string | null
  html: string | null
  css: string | null
  js: string | null
  position: string | null
  form_config: FormConfig | null
  created_at: string | null
  updated_at: string | null
}

export interface FormSubmission {
  id: string
  site_id: string
  form_id: string
  page_id: string | null
  data: Record<string, unknown>
  metadata: {
    ip?: string
    user_agent?: string
    referrer?: string
    page_url?: string
    submitted_at?: string
  }
  is_spam: boolean
  is_read: boolean
  wp_synced: boolean
  wp_synced_at: string | null
  created_at: string
}

export interface FormStats {
  total: number
  unread: number
  spam: number
  today: number
  this_week: number
  this_month: number
}

export interface CreateSubmissionInput {
  site_id: string
  form_id: string
  page_id?: string
  data: Record<string, unknown>
  metadata?: FormSubmission['metadata']
}

// ============================================
// FORM COMPONENTS
// ============================================

/**
 * Get all forms (components with form_config) for a site
 */
export async function getForms(siteId: string): Promise<FormComponent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .eq('site_id', siteId)
    .not('form_config', 'is', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as unknown as FormComponent[]
}

/**
 * Get a single form by ID
 */
export async function getForm(id: string): Promise<FormComponent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as unknown as FormComponent
}

/**
 * Update form configuration
 */
export async function updateFormConfig(
  id: string,
  formConfig: FormConfig
): Promise<FormComponent> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('components')
    .update({
      form_config: formConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as unknown as FormComponent
}

/**
 * Save a form as a component (similar to header/footer)
 */
export async function saveFormComponent(
  siteId: string,
  name: string,
  html: string,
  formConfig: FormConfig,
  css?: string,
  js?: string
): Promise<FormComponent> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('components') as any)
    .insert({
      site_id: siteId,
      name,
      html,
      css: css || null,
      js: js || null,
      position: 'form',
      form_config: formConfig,
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as FormComponent
}

// ============================================
// FORM SUBMISSIONS
// ============================================

/**
 * Get submissions for a form
 */
export async function getSubmissions(
  formId: string,
  options?: {
    limit?: number
    offset?: number
    includeSpam?: boolean
    unreadOnly?: boolean
  }
): Promise<FormSubmission[]> {
  const supabase = createClient()

  let query = supabase
    .from('form_submissions')
    .select('*')
    .eq('form_id', formId)
    .order('created_at', { ascending: false })

  if (!options?.includeSpam) {
    query = query.eq('is_spam', false)
  }

  if (options?.unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data as unknown as FormSubmission[]
}

/**
 * Get all submissions for a site
 */
export async function getSiteSubmissions(
  siteId: string,
  options?: {
    limit?: number
    offset?: number
    includeSpam?: boolean
  }
): Promise<FormSubmission[]> {
  const supabase = createClient()

  let query = supabase
    .from('form_submissions')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (!options?.includeSpam) {
    query = query.eq('is_spam', false)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) throw error
  return data as unknown as FormSubmission[]
}

/**
 * Create a new submission
 */
export async function createSubmission(
  input: CreateSubmissionInput
): Promise<FormSubmission> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('form_submissions') as any)
    .insert({
      site_id: input.site_id,
      form_id: input.form_id,
      page_id: input.page_id || null,
      data: input.data,
      metadata: {
        ...input.metadata,
        submitted_at: new Date().toISOString(),
      },
    })
    .select()
    .single()

  if (error) throw error
  return data as unknown as FormSubmission
}

/**
 * Mark submission as read
 */
export async function markSubmissionAsRead(id: string): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('form_submissions') as any)
    .update({ is_read: true })
    .eq('id', id)

  if (error) throw error
}

/**
 * Mark multiple submissions as read
 */
export async function markSubmissionsAsRead(ids: string[]): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('form_submissions') as any)
    .update({ is_read: true })
    .in('id', ids)

  if (error) throw error
}

/**
 * Mark submission as spam
 */
export async function markSubmissionAsSpam(id: string, isSpam: boolean): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('form_submissions') as any)
    .update({ is_spam: isSpam })
    .eq('id', id)

  if (error) throw error
}

/**
 * Delete a submission
 */
export async function deleteSubmission(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('form_submissions')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Delete multiple submissions
 */
export async function deleteSubmissions(ids: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('form_submissions')
    .delete()
    .in('id', ids)

  if (error) throw error
}

/**
 * Get form statistics
 */
export async function getFormStats(formId: string): Promise<FormStats> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_form_stats', {
    p_form_id: formId,
  })

  if (error) throw error
  return data as FormStats
}

/**
 * Get submissions by date range for charts
 */
export async function getSubmissionsByDateRange(
  formId: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; count: number }[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('form_submissions') as any)
    .select('created_at')
    .eq('form_id', formId)
    .eq('is_spam', false)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  if (error) throw error

  // Group by date
  const grouped: Record<string, number> = {}
  for (const submission of data || []) {
    const date = new Date(submission.created_at).toISOString().split('T')[0]
    grouped[date] = (grouped[date] || 0) + 1
  }

  return Object.entries(grouped)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Export submissions as CSV data
 */
export async function exportSubmissionsAsCSV(formId: string): Promise<string> {
  const submissions = await getSubmissions(formId, { includeSpam: false })

  if (submissions.length === 0) {
    return ''
  }

  // Get all unique field names from submissions
  const allFields = new Set<string>()
  for (const submission of submissions) {
    Object.keys(submission.data).forEach(key => allFields.add(key))
  }
  const fieldNames = Array.from(allFields)

  // Create CSV header
  const headers = ['ID', 'Datum', ...fieldNames, 'Gelesen', 'Seiten-URL']
  const csvRows = [headers.join(',')]

  // Add data rows
  for (const submission of submissions) {
    const row = [
      submission.id,
      new Date(submission.created_at).toLocaleString('de-DE'),
      ...fieldNames.map(field => {
        const value = submission.data[field]
        if (value === undefined || value === null) return ''
        const stringValue = String(value)
        // Escape quotes and wrap in quotes if contains comma
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }),
      submission.is_read ? 'Ja' : 'Nein',
      submission.metadata.page_url || '',
    ]
    csvRows.push(row.join(','))
  }

  return csvRows.join('\n')
}

/**
 * Mark submission as synced to WordPress
 */
export async function markSubmissionAsSynced(id: string): Promise<void> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('form_submissions') as any)
    .update({
      wp_synced: true,
      wp_synced_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}
