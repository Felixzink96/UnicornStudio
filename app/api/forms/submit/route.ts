import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Rate limiting store (in production use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT = 10
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

// Form data schema - basic validation
const formDataSchema = z.record(z.string(), z.unknown()).refine(
  (data) => {
    // Reject if data is too large (prevent DoS)
    const jsonSize = JSON.stringify(data).length
    return jsonSize < 100000 // 100KB limit
  },
  { message: 'Form data too large' }
)

// Use anon key - RLS will handle permissions
// Service role should NEVER be used in public endpoints
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.', success: false },
        { status: 429 }
      )
    }

    // Get origin to find site
    const origin = request.headers.get('origin') || request.headers.get('referer') || ''
    const referer = request.headers.get('referer') || ''

    // Parse form data
    let formData: Record<string, unknown>
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      formData = await request.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const data = await request.formData()
      formData = Object.fromEntries(data.entries())
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 })
    }

    // Validate form data
    const validationResult = formDataSchema.safeParse(formData)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ungültige Formulardaten', success: false },
        { status: 400 }
      )
    }

    // Extract internal fields
    const pagePath = formData._page || referer
    const timestamp = formData._timestamp || new Date().toISOString()
    delete formData._page
    delete formData._timestamp

    // Try to find site by domain
    let siteId: string | null = null

    if (origin) {
      try {
        const domain = new URL(origin).hostname

        // Check custom domains first
        const { data: siteByDomain } = await supabase
          .from('sites')
          .select('id')
          .eq('custom_domain', domain)
          .single()

        if (siteByDomain) {
          siteId = siteByDomain.id
        } else {
          // Check subdomain
          const subdomainMatch = domain.match(/^([^.]+)\./)
          if (subdomainMatch) {
            const { data: siteBySubdomain } = await supabase
              .from('sites')
              .select('id')
              .eq('subdomain', subdomainMatch[1])
              .single()

            if (siteBySubdomain) {
              siteId = siteBySubdomain.id
            }
          }
        }
      } catch {
        // Invalid URL, continue without site
      }
    }

    // Collect metadata (sanitized)
    const metadata = {
      ip: ip.substring(0, 45), // Limit IP length
      user_agent: (request.headers.get('user-agent') || 'unknown').substring(0, 500),
      referrer: referer.substring(0, 2000),
      page_path: String(pagePath).substring(0, 500),
      origin: origin.substring(0, 500),
      submitted_at: timestamp,
    }

    // Store submission
    if (siteId) {
      // RLS policy allows form submissions for valid sites
      const { error: submitError } = await supabase
        .from('form_submissions')
        .insert({
          site_id: siteId,
          form_id: null,
          page_id: null,
          data: formData,
          metadata,
          is_spam: false,
          is_read: false,
        })

      if (submitError) {
        console.error('Form submission error:', submitError)
        // Don't expose internal errors to user
      }
    } else {
      // Log submission even if no site found (for debugging)
      console.log('Form submission (no site found):', {
        origin: origin.substring(0, 100),
        ip,
      })
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Vielen Dank! Ihre Nachricht wurde gesendet.',
    })
  } catch (error) {
    console.error('Form submit error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Senden', success: false },
      { status: 500 }
    )
  }
}

// CORS preflight - restrict origins in production
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*'

  // In production, validate origin against allowed domains
  // For now, allow all origins for form submissions

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}
