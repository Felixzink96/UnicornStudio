import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This endpoint is called by Vercel Cron
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" }] }

// Use service role for cron job (server-side only, not exposed to clients)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // In production, verify the cron secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Find all scheduled entries that should be published
    const { data: scheduledEntries, error: fetchError } = await supabase
      .from('entries')
      .select('id, title, site_id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (fetchError) {
      console.error('Error fetching scheduled entries:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    if (!scheduledEntries || scheduledEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No scheduled entries to publish',
        published: 0,
      })
    }

    // Publish each entry
    const results = await Promise.allSettled(
      scheduledEntries.map(async (entry) => {
        const { error } = await supabase.rpc('publish_entry', {
          target_entry_id: entry.id,
        })

        if (error) {
          console.error(`Failed to publish entry ${entry.id}:`, error)
          throw error
        }

        console.log(`Published scheduled entry: ${entry.title} (${entry.id})`)
        return entry.id
      })
    )

    const published = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      success: true,
      message: `Published ${published} entries, ${failed} failed`,
      published,
      failed,
      details: scheduledEntries.map((e, i) => ({
        id: e.id,
        title: e.title,
        status: results[i].status,
      })),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request)
}
