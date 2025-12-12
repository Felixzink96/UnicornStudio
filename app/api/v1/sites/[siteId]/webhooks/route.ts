import { NextRequest } from 'next/server'
import crypto from 'crypto'
import {
  authenticateAPIRequest,
  createAPIClient,
  validateSiteAccess,
  hasPermission,
} from '@/lib/api/auth'
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
  validationErrorResponse,
  createdResponse,
} from '@/lib/api/responses'

interface RouteParams {
  params: Promise<{ siteId: string }>
}

// Valid webhook events
const VALID_EVENTS = [
  'entry.created',
  'entry.updated',
  'entry.deleted',
  'entry.published',
  'entry.unpublished',
  'content_type.created',
  'content_type.updated',
  'content_type.deleted',
  'field.created',
  'field.updated',
  'field.deleted',
  'taxonomy.created',
  'taxonomy.updated',
  'taxonomy.deleted',
  'term.created',
  'term.updated',
  'term.deleted',
  'variables.updated',
  'component.created',
  'component.updated',
  'component.deleted',
  'template.updated',
  'css.updated',
] as const

/**
 * GET /api/v1/sites/:siteId/webhooks
 * List all webhooks for a site
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    const { siteId } = await params

    // 2. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 3. Query webhooks
    const supabase = createAPIClient()

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Webhooks query error:', error)
      return serverErrorResponse('Failed to fetch webhooks', error.message)
    }

    // 4. Format response (hide secrets)
    const formattedWebhooks = webhooks?.map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: wh.events,
      headers: wh.headers,
      max_retries: wh.max_retries,
      retry_delay_seconds: wh.retry_delay_seconds,
      is_active: wh.is_active,
      last_triggered_at: wh.last_triggered_at,
      last_status_code: wh.last_status_code,
      success_count: wh.success_count,
      failure_count: wh.failure_count,
      created_at: wh.created_at,
      updated_at: wh.updated_at,
    }))

    return successResponse(formattedWebhooks)
  } catch (error) {
    console.error('Webhooks API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * POST /api/v1/sites/:siteId/webhooks
 * Register a new webhook
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    // 2. Check write permission
    if (!hasPermission(auth, 'write')) {
      return forbiddenResponse('Write permission required to create webhooks')
    }

    const { siteId } = await params

    // 3. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 4. Parse and validate request body
    const body = await request.json()
    const { url, events, headers, max_retries, retry_delay_seconds } = body

    // Validate URL
    if (!url || typeof url !== 'string') {
      return validationErrorResponse('URL is required', { url: ['URL is required'] })
    }

    try {
      new URL(url)
    } catch {
      return validationErrorResponse('Invalid URL format', { url: ['Invalid URL format'] })
    }

    // Validate URL is HTTPS (for security)
    if (!url.startsWith('https://')) {
      return validationErrorResponse('URL must use HTTPS', { url: ['URL must use HTTPS'] })
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return validationErrorResponse('At least one event is required', {
        events: ['At least one event is required'],
      })
    }

    const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e as typeof VALID_EVENTS[number]))
    if (invalidEvents.length > 0) {
      return validationErrorResponse(`Invalid events: ${invalidEvents.join(', ')}`, {
        events: [`Invalid events: ${invalidEvents.join(', ')}`],
      })
    }

    // 5. Generate webhook secret
    const secret = crypto.randomBytes(32).toString('hex')

    // 6. Create webhook
    const supabase = createAPIClient()

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        site_id: siteId,
        url,
        secret,
        events,
        headers: headers || {},
        max_retries: max_retries || 3,
        retry_delay_seconds: retry_delay_seconds || 60,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Webhook create error:', error)
      return serverErrorResponse('Failed to create webhook', error.message)
    }

    // 7. Return with secret (only shown once!)
    return createdResponse({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      headers: webhook.headers,
      max_retries: webhook.max_retries,
      retry_delay_seconds: webhook.retry_delay_seconds,
      is_active: webhook.is_active,
      secret, // Only returned on creation!
      created_at: webhook.created_at,
      message: 'Webhook created. Save the secret - it will not be shown again!',
    })
  } catch (error) {
    console.error('Webhook create API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}

/**
 * DELETE /api/v1/sites/:siteId/webhooks?id=:webhookId
 * Delete a webhook
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const auth = await authenticateAPIRequest()
    if (!auth.success) {
      return unauthorizedResponse(auth.error)
    }

    // 2. Check delete permission
    if (!hasPermission(auth, 'delete') && !hasPermission(auth, 'admin')) {
      return forbiddenResponse('Delete permission required to remove webhooks')
    }

    const { siteId } = await params

    // 3. Validate site access
    const access = await validateSiteAccess(auth, siteId)
    if (!access.valid) {
      return forbiddenResponse(access.error)
    }

    // 4. Get webhook ID from query
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return validationErrorResponse('Webhook ID is required', { id: ['Webhook ID is required'] })
    }

    // 5. Delete webhook
    const supabase = createAPIClient()

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('site_id', siteId)

    if (error) {
      console.error('Webhook delete error:', error)
      return serverErrorResponse('Failed to delete webhook', error.message)
    }

    return successResponse({ deleted: true, id: webhookId })
  } catch (error) {
    console.error('Webhook delete API error:', error)
    return serverErrorResponse('An unexpected error occurred')
  }
}
