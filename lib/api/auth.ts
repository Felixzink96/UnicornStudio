import { createClient as createServiceClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import crypto from 'crypto'
import type { Database } from '@/types/database'

// Service Role Client (bypasses RLS for API key validation)
function createServiceRoleClient() {
  return createServiceClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface APIAuthResult {
  success: boolean
  apiKeyId?: string
  organizationId?: string
  permissions?: string[]
  allowedSites?: string[] | null
  error?: string
  errorCode?: string
}

/**
 * Authenticates an API request using Bearer token
 * Returns auth result with organization access info
 */
export async function authenticateAPIRequest(): Promise<APIAuthResult> {
  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (!authHeader) {
    return {
      success: false,
      error: 'Missing Authorization header',
      errorCode: 'MISSING_AUTH',
    }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      success: false,
      error: 'Invalid Authorization header format. Use: Bearer <api_key>',
      errorCode: 'INVALID_AUTH_FORMAT',
    }
  }

  const apiKey = authHeader.replace('Bearer ', '')

  if (!apiKey || apiKey.length < 20) {
    return {
      success: false,
      error: 'Invalid API key format',
      errorCode: 'INVALID_KEY_FORMAT',
    }
  }

  // Hash the key for lookup
  const keyHash = hashApiKey(apiKey)

  const supabase = createServiceRoleClient()

  // Look up the API key
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single()

  if (error || !keyData) {
    return {
      success: false,
      error: 'Invalid API key',
      errorCode: 'INVALID_KEY',
    }
  }

  // Check expiration
  if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
    return {
      success: false,
      error: 'API key has expired',
      errorCode: 'KEY_EXPIRED',
    }
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(supabase, keyData.id)
  if (!withinLimit) {
    return {
      success: false,
      error: 'Rate limit exceeded. Please wait before making more requests.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
    }
  }

  // Get client IP
  const forwardedFor = headersList.get('x-forwarded-for')
  const clientIP = forwardedFor?.split(',')[0]?.trim() || null

  // Update last used timestamp
  await supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      last_used_ip: clientIP,
    })
    .eq('id', keyData.id)

  return {
    success: true,
    apiKeyId: keyData.id,
    organizationId: keyData.organization_id,
    permissions: keyData.permissions || ['read'],
    allowedSites: keyData.allowed_sites,
  }
}

/**
 * Check if the auth has a specific permission
 */
export function hasPermission(auth: APIAuthResult, permission: string): boolean {
  if (!auth.permissions) return false
  return auth.permissions.includes(permission) || auth.permissions.includes('admin')
}

/**
 * Check if the auth can access a specific site
 */
export function canAccessSite(auth: APIAuthResult, siteId: string): boolean {
  // null = all sites allowed
  if (!auth.allowedSites || auth.allowedSites.length === 0) return true
  return auth.allowedSites.includes(siteId)
}

/**
 * Hash an API key for secure storage/lookup
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `sk-us-${crypto.randomBytes(4).toString('hex')}`
  const randomPart = crypto.randomBytes(24).toString('hex')
  const key = `${prefix}-${randomPart}`
  const hash = hashApiKey(key)

  return { key, prefix, hash }
}

/**
 * Check and update rate limit
 */
async function checkRateLimit(
  supabase: ReturnType<typeof createServiceRoleClient>,
  apiKeyId: string
): Promise<boolean> {
  const { data: keyData } = await supabase
    .from('api_keys')
    .select('rate_limit, requests_this_hour, rate_limit_reset_at')
    .eq('id', apiKeyId)
    .single()

  if (!keyData) return false

  const now = new Date()
  const resetAt = keyData.rate_limit_reset_at ? new Date(keyData.rate_limit_reset_at) : null

  // Reset counter if hour has passed
  if (!resetAt || resetAt < now) {
    await supabase
      .from('api_keys')
      .update({
        requests_this_hour: 1,
        rate_limit_reset_at: new Date(now.getTime() + 3600000).toISOString(),
      })
      .eq('id', apiKeyId)
    return true
  }

  // Check if under limit
  if ((keyData.requests_this_hour || 0) < (keyData.rate_limit || 1000)) {
    await supabase
      .from('api_keys')
      .update({
        requests_this_hour: (keyData.requests_this_hour || 0) + 1,
      })
      .eq('id', apiKeyId)
    return true
  }

  return false
}

/**
 * Create a Supabase client for API operations
 * Uses service role to bypass RLS, but access is restricted by API key permissions
 */
export function createAPIClient() {
  return createServiceRoleClient()
}

/**
 * Validate that a site belongs to the organization
 */
export async function validateSiteAccess(
  auth: APIAuthResult,
  siteId: string
): Promise<{ valid: boolean; error?: string }> {
  if (!canAccessSite(auth, siteId)) {
    return { valid: false, error: 'Access to this site is not allowed' }
  }

  const supabase = createAPIClient()

  const { data: site, error } = await supabase
    .from('sites')
    .select('id, organization_id')
    .eq('id', siteId)
    .single()

  if (error || !site) {
    return { valid: false, error: 'Site not found' }
  }

  if (site.organization_id !== auth.organizationId) {
    return { valid: false, error: 'Site does not belong to your organization' }
  }

  return { valid: true }
}
