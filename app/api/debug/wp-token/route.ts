/**
 * Debug endpoint for WordPress token validation
 * This helps identify why token auth is failing
 *
 * REMOVE IN PRODUCTION!
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getServiceClient() {
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

    const debug: Record<string, unknown> = {
      step: 'start',
      tokenReceived: true,
    }

    // Step 1: Decode token
    let tokenData
    try {
      tokenData = JSON.parse(Buffer.from(wpToken, 'base64').toString('utf-8'))
      debug.step = 'decoded'
      debug.tokenData = {
        hasKey: !!tokenData.key,
        keyLength: tokenData.key?.length,
        keyPrefix: tokenData.key?.substring(0, 10) + '...',
        site: tokenData.site,
        page: tokenData.page,
        exp: tokenData.exp,
        expDate: tokenData.exp ? new Date(tokenData.exp * 1000).toISOString() : null,
        isExpired: tokenData.exp ? Date.now() / 1000 > tokenData.exp : false,
      }
    } catch (e) {
      return NextResponse.json({
        error: 'Invalid token format',
        debug,
        decodeError: String(e)
      }, { status: 400 })
    }

    // Step 2: Check expiration
    if (tokenData.exp && Date.now() / 1000 > tokenData.exp) {
      debug.step = 'expired'
      return NextResponse.json({
        error: 'Token expired',
        debug
      }, { status: 401 })
    }

    // Step 3: Hash API key and look up
    const keyHash = crypto.createHash('sha256').update(tokenData.key).digest('hex')
    debug.keyHash = keyHash.substring(0, 20) + '...'
    debug.step = 'hashed'

    const supabase = getServiceClient()

    // Step 4: Look up API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, organization_id, is_active, name')
      .eq('key_hash', keyHash)
      .single()

    debug.step = 'key_lookup'
    debug.keyLookup = {
      found: !!keyData,
      error: keyError?.message,
      errorCode: keyError?.code,
    }

    if (keyError || !keyData) {
      // Try to find any keys for debugging
      const { data: allKeys } = await supabase
        .from('api_keys')
        .select('id, name, is_active, key_hash')
        .limit(5)

      debug.existingKeys = allKeys?.map(k => ({
        id: k.id,
        name: k.name,
        is_active: k.is_active,
        hashPrefix: k.key_hash?.substring(0, 20) + '...'
      }))

      return NextResponse.json({
        error: 'API key not found in database',
        debug
      }, { status: 401 })
    }

    if (!keyData.is_active) {
      debug.step = 'key_inactive'
      return NextResponse.json({
        error: 'API key is inactive',
        debug
      }, { status: 401 })
    }

    debug.keyData = {
      id: keyData.id,
      name: keyData.name,
      organization_id: keyData.organization_id,
      is_active: keyData.is_active,
    }

    // Step 5: Verify site belongs to organization
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .select('id, name, organization_id')
      .eq('id', tokenData.site)
      .single()

    debug.step = 'site_lookup'
    debug.siteLookup = {
      found: !!siteData,
      error: siteError?.message,
    }

    if (siteError || !siteData) {
      return NextResponse.json({
        error: 'Site not found',
        debug
      }, { status: 404 })
    }

    debug.siteData = {
      id: siteData.id,
      name: siteData.name,
      organization_id: siteData.organization_id,
    }

    // Step 6: Check org match
    debug.orgMatch = siteData.organization_id === keyData.organization_id
    if (siteData.organization_id !== keyData.organization_id) {
      debug.step = 'org_mismatch'
      return NextResponse.json({
        error: 'Site does not belong to API key organization',
        debug
      }, { status: 403 })
    }

    // Step 7: Verify page exists
    const { data: pageData, error: pageError } = await supabase
      .from('pages')
      .select('id, name, site_id')
      .eq('id', tokenData.page)
      .eq('site_id', tokenData.site)
      .single()

    debug.step = 'page_lookup'
    debug.pageLookup = {
      found: !!pageData,
      error: pageError?.message,
    }

    if (pageError || !pageData) {
      return NextResponse.json({
        error: 'Page not found',
        debug
      }, { status: 404 })
    }

    debug.pageData = {
      id: pageData.id,
      name: pageData.name,
    }

    // All checks passed!
    debug.step = 'success'
    return NextResponse.json({
      success: true,
      message: 'Token is valid!',
      debug
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Validation failed',
      message: String(error)
    }, { status: 500 })
  }
}
