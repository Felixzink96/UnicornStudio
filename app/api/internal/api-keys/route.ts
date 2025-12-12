import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, hashApiKey } from '@/lib/api/auth'

/**
 * GET /api/internal/api-keys
 * List all API keys for the user's organization (uses session auth)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Get user's profile with organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return Response.json({ success: false, error: { message: 'Profile not found' } }, { status: 404 })
    }

    // Get API keys for the organization
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, allowed_sites, rate_limit, is_active, last_used_at, created_at, expires_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('API keys query error:', error)
      return Response.json({ success: false, error: { message: 'Failed to fetch API keys' } }, { status: 500 })
    }

    return Response.json({ success: true, data: apiKeys })
  } catch (error) {
    console.error('API keys GET error:', error)
    return Response.json({ success: false, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

/**
 * POST /api/internal/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Get user's profile with organization and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return Response.json({ success: false, error: { message: 'Profile not found' } }, { status: 404 })
    }

    // Check permission (only owner and admin can create API keys)
    if (!['owner', 'admin'].includes(profile.role)) {
      return Response.json({ success: false, error: { message: 'Permission denied' } }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { name, permissions, allowed_sites, rate_limit, expires_at, description } = body

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Response.json({ success: false, error: { message: 'Name is required' } }, { status: 400 })
    }

    // Validate permissions
    const validPermissions = ['read', 'write', 'delete', 'admin']
    const perms = permissions || ['read']
    if (!Array.isArray(perms) || perms.some((p: string) => !validPermissions.includes(p))) {
      return Response.json({ success: false, error: { message: 'Invalid permissions' } }, { status: 400 })
    }

    // Generate API key
    const { key, prefix, hash } = generateApiKey()

    // Create API key record
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: profile.organization_id,
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        permissions: perms,
        allowed_sites: allowed_sites || null,
        rate_limit: rate_limit || 1000,
        description: description || null,
        expires_at: expires_at || null,
        created_by: user.id,
        is_active: true,
      })
      .select('id, name, key_prefix, permissions, allowed_sites, rate_limit, is_active, created_at, expires_at')
      .single()

    if (error) {
      console.error('API key create error:', error)
      return Response.json({ success: false, error: { message: 'Failed to create API key' } }, { status: 500 })
    }

    // Return the key (only shown once!)
    return Response.json({
      success: true,
      data: {
        key, // Plain text key - only returned on creation
        apiKey,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('API keys POST error:', error)
    return Response.json({ success: false, error: { message: 'Internal server error' } }, { status: 500 })
  }
}

/**
 * DELETE /api/internal/api-keys?id=:id
 * Delete an API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // Get user's profile with organization and check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return Response.json({ success: false, error: { message: 'Profile not found' } }, { status: 404 })
    }

    // Check permission
    if (!['owner', 'admin'].includes(profile.role)) {
      return Response.json({ success: false, error: { message: 'Permission denied' } }, { status: 403 })
    }

    // Get key ID from query
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return Response.json({ success: false, error: { message: 'Key ID is required' } }, { status: 400 })
    }

    // Delete the key (only if it belongs to the user's organization)
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('organization_id', profile.organization_id)

    if (error) {
      console.error('API key delete error:', error)
      return Response.json({ success: false, error: { message: 'Failed to delete API key' } }, { status: 500 })
    }

    return Response.json({ success: true, data: { deleted: true, id: keyId } })
  } catch (error) {
    console.error('API keys DELETE error:', error)
    return Response.json({ success: false, error: { message: 'Internal server error' } }, { status: 500 })
  }
}
