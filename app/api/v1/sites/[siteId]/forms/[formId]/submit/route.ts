import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface RouteParams {
  params: Promise<{ siteId: string; formId: string }>
}

// Create anonymous Supabase client for public form submissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/v1/sites/:siteId/forms/:formId/submit
 * Submit a form (public endpoint - no auth required)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { siteId, formId } = await params

    // Parse form data
    let formData: Record<string, unknown>
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      formData = await request.json()
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const data = await request.formData()
      formData = Object.fromEntries(data.entries())
    } else {
      return NextResponse.json(
        { error: 'Unsupported content type' },
        { status: 415 }
      )
    }

    // Get form configuration
    const { data: form, error: formError } = await supabase
      .from('components')
      .select('id, name, form_config')
      .eq('id', formId)
      .eq('site_id', siteId)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { error: 'Form not found' },
        { status: 404 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formConfig = form.form_config as any

    if (!formConfig) {
      return NextResponse.json(
        { error: 'Form not configured' },
        { status: 400 }
      )
    }

    // Collect metadata
    const metadata = {
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      referrer: request.headers.get('referer') || 'unknown',
      page_url: formData._page_url || null,
      submitted_at: new Date().toISOString(),
    }

    // Remove internal fields from form data
    delete formData._page_url
    delete formData._form_id

    // Save submission to database
    const { data: submission, error: submitError } = await supabase
      .from('form_submissions')
      .insert({
        site_id: siteId,
        form_id: formId,
        data: formData,
        metadata,
        is_spam: false,
        is_read: false,
      })
      .select()
      .single()

    if (submitError) {
      console.error('Form submission error:', submitError)
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500 }
      )
    }

    // Get WordPress config for email sending
    const { data: site } = await supabase
      .from('sites')
      .select('integrations')
      .eq('id', siteId)
      .single()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wpConfig = (site?.integrations as any)?.wordpress

    // If WordPress is configured, send email via WP
    if (wpConfig?.enabled && wpConfig?.api_url) {
      try {
        const emailPayload = {
          to: formConfig.recipient_email,
          subject: formConfig.subject || `Neue Nachricht: ${form.name}`,
          cc: formConfig.cc || [],
          bcc: formConfig.bcc || [],
          reply_to: formData.email || formConfig.reply_to,
          form_name: form.name,
          form_data: formData,
          submission_id: submission.id,
        }

        const webhookUrl = `${wpConfig.api_url.replace(/\/$/, '')}/form-submit`

        await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${wpConfig.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the submission if email fails
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: formConfig.success_message || 'Vielen Dank für Ihre Nachricht!',
      submission_id: submission.id,
    })
  } catch (error) {
    console.error('Form submit error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
