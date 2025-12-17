import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ewlrsnkkgttjaofgunbo.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3bHJzbmtrZ3R0amFvZmd1bmJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUxMTgwMSwiZXhwIjoyMDgxMDg3ODAxfQ.unEffe8PpQLjeDSmymOi_aQjs53UXpyyKdNAaSoUpto'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function fixRLS() {
  console.log('Testing connection...')

  // Test: Try to read share_links
  const { data, error } = await supabase
    .from('share_links')
    .select('id, token')
    .limit(1)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Share links accessible:', data)
  }
}

fixRLS()
