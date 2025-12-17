import { createClient } from '@/lib/supabase/client'
import { nanoid } from 'nanoid'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

export interface ShareLink {
  id: string
  site_id: string
  page_id: string | null
  token: string
  password_hash: string | null
  expires_at: string | null
  view_count: number
  allow_comments: boolean
  created_by: string | null
  created_at: string
}

export interface ShareComment {
  id: string
  share_link_id: string
  page_id: string | null
  author_name: string
  author_email: string | null
  content: string
  position_x: number
  position_y: number
  status: 'open' | 'resolved'
  created_at: string
}

export interface CreateShareLinkInput {
  site_id: string
  page_id?: string
  password?: string
  expires_at?: Date
  allow_comments?: boolean
}

export interface CreateCommentInput {
  share_link_id: string
  page_id?: string
  author_name: string
  author_email?: string
  content: string
  position_x: number
  position_y: number
}

// ============================================
// SHARE LINKS
// ============================================

/**
 * Get all share links for a site
 */
export async function getShareLinks(siteId: string): Promise<ShareLink[]> {
  const supabase = createClient() as AnySupabase as AnySupabase
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as ShareLink[]
}

/**
 * Get a share link by token (public access)
 */
export async function getShareLinkByToken(token: string): Promise<ShareLink | null> {
  const supabase = createClient() as AnySupabase
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data as ShareLink
}

/**
 * Create a new share link
 */
export async function createShareLink(input: CreateShareLinkInput): Promise<ShareLink> {
  const supabase = createClient() as AnySupabase

  // Generate unique token
  const token = nanoid(12)

  // Hash password if provided (simple hash for now - consider bcrypt in production)
  let passwordHash = null
  if (input.password) {
    // Simple hash using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(input.password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      site_id: input.site_id,
      page_id: input.page_id || null,
      token,
      password_hash: passwordHash,
      expires_at: input.expires_at?.toISOString() || null,
      allow_comments: input.allow_comments ?? true,
      created_by: user?.id || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as ShareLink
}

/**
 * Delete a share link
 */
export async function deleteShareLink(id: string): Promise<void> {
  const supabase = createClient() as AnySupabase
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Validate share link access
 */
export async function validateShareLink(
  token: string,
  password?: string
): Promise<{ valid: boolean; error?: string; shareLink?: ShareLink }> {
  const shareLink = await getShareLinkByToken(token)

  if (!shareLink) {
    return { valid: false, error: 'Link nicht gefunden' }
  }

  // Check expiration
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    return { valid: false, error: 'Link ist abgelaufen' }
  }

  // Check password
  if (shareLink.password_hash) {
    if (!password) {
      return { valid: false, error: 'Passwort erforderlich' }
    }

    // Hash provided password
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const providedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (providedHash !== shareLink.password_hash) {
      return { valid: false, error: 'Falsches Passwort' }
    }
  }

  // Increment view count
  const supabase = createClient() as AnySupabase
  await supabase.rpc('increment_share_view', { p_token: token })

  return { valid: true, shareLink }
}

/**
 * Check if share link has password
 */
export async function shareLinkrequiresPassword(token: string): Promise<boolean> {
  const shareLink = await getShareLinkByToken(token)
  return shareLink?.password_hash !== null
}

// ============================================
// SHARE COMMENTS
// ============================================

/**
 * Get comments for a share link
 */
export async function getShareComments(
  shareLinkId: string,
  pageId?: string
): Promise<ShareComment[]> {
  const supabase = createClient() as AnySupabase

  let query = supabase
    .from('share_comments')
    .select('*')
    .eq('share_link_id', shareLinkId)
    .order('created_at', { ascending: true })

  if (pageId) {
    query = query.eq('page_id', pageId)
  }

  const { data, error } = await query

  if (error) throw error
  return data as ShareComment[]
}

/**
 * Create a new comment
 */
export async function createShareComment(input: CreateCommentInput): Promise<ShareComment> {
  const supabase = createClient() as AnySupabase
  const { data, error } = await supabase
    .from('share_comments')
    .insert({
      share_link_id: input.share_link_id,
      page_id: input.page_id || null,
      author_name: input.author_name,
      author_email: input.author_email || null,
      content: input.content,
      position_x: input.position_x,
      position_y: input.position_y,
      status: 'open',
    })
    .select()
    .single()

  if (error) throw error
  return data as ShareComment
}

/**
 * Update comment status
 */
export async function updateCommentStatus(
  id: string,
  status: 'open' | 'resolved'
): Promise<void> {
  const supabase = createClient() as AnySupabase
  const { error } = await supabase
    .from('share_comments')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

/**
 * Delete a comment
 */
export async function deleteShareComment(id: string): Promise<void> {
  const supabase = createClient() as AnySupabase
  const { error } = await supabase
    .from('share_comments')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get comment count for a share link
 */
export async function getCommentCount(
  shareLinkId: string,
  status?: 'open' | 'resolved'
): Promise<number> {
  const supabase = createClient() as AnySupabase

  let query = supabase
    .from('share_comments')
    .select('id', { count: 'exact', head: true })
    .eq('share_link_id', shareLinkId)

  if (status) {
    query = query.eq('status', status)
  }

  const { count, error } = await query

  if (error) throw error
  return count || 0
}
