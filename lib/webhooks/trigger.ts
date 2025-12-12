import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import type { Database } from '@/types/database'

// Service Role Client for webhook operations
function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Webhook Event Types
 */
export type WebhookEvent =
  // Entry events
  | 'entry.created'
  | 'entry.updated'
  | 'entry.deleted'
  | 'entry.published'
  | 'entry.unpublished'
  // Content Type events
  | 'content_type.created'
  | 'content_type.updated'
  | 'content_type.deleted'
  // Field events
  | 'field.created'
  | 'field.updated'
  | 'field.deleted'
  // Taxonomy events
  | 'taxonomy.created'
  | 'taxonomy.updated'
  | 'taxonomy.deleted'
  // Term events
  | 'term.created'
  | 'term.updated'
  | 'term.deleted'
  // Design events
  | 'variables.updated'
  | 'component.created'
  | 'component.updated'
  | 'component.deleted'
  | 'template.updated'
  | 'css.updated'

/**
 * Webhook Payload Structure
 */
interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  site_id: string
  data: Record<string, unknown>
}

/**
 * Webhook record from database
 */
interface Webhook {
  id: string
  site_id: string
  url: string
  secret: string
  events: string[]
  headers: Record<string, string> | null
  max_retries: number
  retry_delay_seconds: number
  is_active: boolean
}

/**
 * Trigger all webhooks for a specific event
 */
export async function triggerWebhooks(
  siteId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient()

  // Find active webhooks for this event
  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .contains('events', [event])

  if (error || !webhooks?.length) {
    return // No webhooks to trigger
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    site_id: siteId,
    data,
  }

  // Trigger all webhooks in parallel (fire and forget)
  await Promise.allSettled(
    webhooks.map((webhook) => sendWebhook(webhook as Webhook, payload))
  )
}

/**
 * Send a webhook request
 */
async function sendWebhook(webhook: Webhook, payload: WebhookPayload): Promise<void> {
  const supabase = createServiceClient()
  const startTime = Date.now()

  // Create HMAC signature
  const payloadString = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(payloadString)
    .digest('hex')

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Unicorn-Signature': signature,
        'X-Unicorn-Event': payload.event,
        'X-Unicorn-Timestamp': payload.timestamp,
        ...(webhook.headers || {}),
      },
      body: payloadString,
    })

    const responseTime = Date.now() - startTime
    const success = response.ok

    // Log the webhook delivery
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event: payload.event,
      payload,
      status_code: response.status,
      response_time_ms: responseTime,
      success,
      attempt: 1,
    } as unknown as Database['public']['Tables']['webhook_logs']['Insert'])

    // Update webhook stats
    await updateWebhookStats(webhook.id, success, response.status)

    // If failed and retries available, schedule retry
    if (!success && webhook.max_retries > 0) {
      await scheduleRetry(webhook, payload, 1)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the failure
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event: payload.event,
      payload,
      response_time_ms: responseTime,
      success: false,
      error_message: errorMessage,
      attempt: 1,
    } as unknown as Database['public']['Tables']['webhook_logs']['Insert'])

    // Update webhook stats
    await updateWebhookStats(webhook.id, false, 0)

    // Schedule retry if available
    if (webhook.max_retries > 0) {
      await scheduleRetry(webhook, payload, 1)
    }
  }
}

/**
 * Update webhook statistics
 */
async function updateWebhookStats(
  webhookId: string,
  success: boolean,
  statusCode: number
): Promise<void> {
  const supabase = createServiceClient()

  // Get current webhook stats
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('success_count, failure_count')
    .eq('id', webhookId)
    .single()

  if (!webhook) return

  if (success) {
    await supabase
      .from('webhooks')
      .update({
        success_count: (webhook.success_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
        failure_count: 0, // Reset failure count on success
      })
      .eq('id', webhookId)
  } else {
    await supabase
      .from('webhooks')
      .update({
        failure_count: (webhook.failure_count || 0) + 1,
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
      })
      .eq('id', webhookId)
  }
}

/**
 * Schedule a webhook retry (simplified - in production use a job queue)
 */
async function scheduleRetry(
  webhook: Webhook,
  payload: WebhookPayload,
  currentAttempt: number
): Promise<void> {
  if (currentAttempt >= webhook.max_retries) {
    return // Max retries reached
  }

  const supabase = createServiceClient()
  const nextRetryAt = new Date(Date.now() + webhook.retry_delay_seconds * 1000 * currentAttempt)

  // Update the log with next retry time
  await supabase
    .from('webhook_logs')
    .update({
      next_retry_at: nextRetryAt.toISOString(),
    })
    .eq('webhook_id', webhook.id)
    .eq('event', payload.event)
    .order('created_at', { ascending: false })
    .limit(1)

  // In production, this would add to a job queue like BullMQ or similar
  // For now, we'll use setTimeout (not ideal for production)
  setTimeout(async () => {
    await retryWebhook(webhook, payload, currentAttempt + 1)
  }, webhook.retry_delay_seconds * 1000)
}

/**
 * Retry a failed webhook
 */
async function retryWebhook(
  webhook: Webhook,
  payload: WebhookPayload,
  attempt: number
): Promise<void> {
  const supabase = createServiceClient()
  const startTime = Date.now()

  // Recreate signature (timestamp unchanged from original)
  const payloadString = JSON.stringify(payload)
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(payloadString)
    .digest('hex')

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Unicorn-Signature': signature,
        'X-Unicorn-Event': payload.event,
        'X-Unicorn-Timestamp': payload.timestamp,
        'X-Unicorn-Retry': String(attempt),
        ...(webhook.headers || {}),
      },
      body: payloadString,
    })

    const responseTime = Date.now() - startTime
    const success = response.ok

    // Log the retry
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event: payload.event,
      payload,
      status_code: response.status,
      response_time_ms: responseTime,
      success,
      attempt,
    } as unknown as Database['public']['Tables']['webhook_logs']['Insert'])

    // Update stats
    await updateWebhookStats(webhook.id, success, response.status)

    // Schedule another retry if still failing
    if (!success && attempt < webhook.max_retries) {
      await scheduleRetry(webhook, payload, attempt)
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event: payload.event,
      payload,
      response_time_ms: responseTime,
      success: false,
      error_message: errorMessage,
      attempt,
    } as unknown as Database['public']['Tables']['webhook_logs']['Insert'])

    await updateWebhookStats(webhook.id, false, 0)

    if (attempt < webhook.max_retries) {
      await scheduleRetry(webhook, payload, attempt)
    }
  }
}

/**
 * Helper to trigger entry events
 */
export async function triggerEntryWebhook(
  siteId: string,
  event: 'entry.created' | 'entry.updated' | 'entry.deleted' | 'entry.published' | 'entry.unpublished',
  entry: {
    id: string
    title?: string | null
    slug?: string | null
    status?: string
    content_type_id: string
    content_type_name?: string
  }
): Promise<void> {
  await triggerWebhooks(siteId, event, {
    id: entry.id,
    title: entry.title,
    slug: entry.slug,
    status: entry.status,
    content_type_id: entry.content_type_id,
    content_type_name: entry.content_type_name,
  })
}

/**
 * Helper to trigger content type events
 */
export async function triggerContentTypeWebhook(
  siteId: string,
  event: 'content_type.created' | 'content_type.updated' | 'content_type.deleted',
  contentType: {
    id: string
    name: string
    label_singular?: string
    slug?: string
  }
): Promise<void> {
  await triggerWebhooks(siteId, event, {
    id: contentType.id,
    name: contentType.name,
    label_singular: contentType.label_singular,
    slug: contentType.slug,
  })
}

/**
 * Helper to trigger field events
 */
export async function triggerFieldWebhook(
  siteId: string,
  event: 'field.created' | 'field.updated' | 'field.deleted',
  field: {
    id: string
    name: string
    type: string
    content_type_id: string
  }
): Promise<void> {
  await triggerWebhooks(siteId, event, {
    id: field.id,
    name: field.name,
    type: field.type,
    content_type_id: field.content_type_id,
  })
}

/**
 * Helper to trigger taxonomy/term events
 */
export async function triggerTaxonomyWebhook(
  siteId: string,
  event:
    | 'taxonomy.created'
    | 'taxonomy.updated'
    | 'taxonomy.deleted'
    | 'term.created'
    | 'term.updated'
    | 'term.deleted',
  data: {
    id: string
    name: string
    slug?: string
    taxonomy_id?: string
  }
): Promise<void> {
  await triggerWebhooks(siteId, event, data)
}

/**
 * Helper to trigger design-related events
 */
export async function triggerDesignWebhook(
  siteId: string,
  event:
    | 'variables.updated'
    | 'component.created'
    | 'component.updated'
    | 'component.deleted'
    | 'template.updated'
    | 'css.updated',
  data: Record<string, unknown> = {}
): Promise<void> {
  await triggerWebhooks(siteId, event, data)
}
