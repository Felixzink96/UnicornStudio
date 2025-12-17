import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin-only endpoint to run migrations
// Use service role to execute SQL

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Create page_versions table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.page_versions (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
          version_number integer NOT NULL,
          html_content text,
          content jsonb,
          created_at timestamptz DEFAULT now(),
          created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
          change_summary text,
          UNIQUE(page_id, version_number)
        );

        CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON public.page_versions(page_id);
        CREATE INDEX IF NOT EXISTS idx_page_versions_created_at ON public.page_versions(created_at DESC);

        ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;
      `
    })

    if (tableError) {
      // Try direct SQL via raw query
      const result = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      })

      return NextResponse.json({
        success: false,
        error: tableError.message,
        hint: 'Migration muss manuell in Supabase Dashboard ausgeführt werden'
      })
    }

    return NextResponse.json({ success: true, message: 'Migration erfolgreich' })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
