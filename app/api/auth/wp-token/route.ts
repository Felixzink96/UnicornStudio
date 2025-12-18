/**
 * WordPress Token Authentication
 *
 * Validates a WordPress token and creates a session for iframe embedding.
 * The token contains the API key which we validate against our database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Create service role client
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const { wpToken } = await request.json()

    if (!wpToken) {
      return NextResponse.json({ error: 'Missing wpToken' }, { status: 400 })
    }

    // Decode the token
    let tokenData
    try {
      tokenData = JSON.parse(Buffer.from(wpToken, 'base64').toString('utf-8'))
    } catch {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 })
    }

    const { key: apiKey, site: siteId, page: pageId, exp, wp_site } = tokenData

    // Check expiration
    if (exp && Date.now() / 1000 > exp) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }

    // Validate the API key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const supabase = createServiceClient()

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, organization_id, is_active')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !keyData || !keyData.is_active) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    // Verify the site belongs to this organization
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, organization_id')
      .eq('id', siteId)
      .single()

    if (siteError || !siteData || siteData.organization_id !== keyData.organization_id) {
      return NextResponse.json({ error: 'Site access denied' }, { status: 403 })
    }

    // Create a temporary session token for the iframe
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store the session (you could use a database table or Redis in production)
    // For now, we'll just return the validated data
    return NextResponse.json({
      success: true,
      session: {
        token: sessionToken,
        siteId,
        pageId,
        organizationId: keyData.organization_id,
        expiresAt: expiresAt.toISOString(),
        wpSite: wp_site,
      },
    })
  } catch (error) {
    console.error('WP Token auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
