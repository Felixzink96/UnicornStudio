import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local manually
const envFile = readFileSync('.env.local', 'utf-8');
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('URL:', supabaseUrl ? 'Found' : 'Missing');
console.log('Key:', supabaseServiceKey ? 'Found' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSchema() {
  // Test connection
  const { data, error } = await supabase.from('sites').select('id').limit(1);

  if (error) {
    console.log('Connection Error:', error.message);
    return;
  }
  console.log('Connection OK');

  // Check which columns are missing
  const columnsToCheck = ['robots_txt', 'logo_dark_url', 'favicon_url', 'tagline', 'og_image_url'];
  const missingColumns = [];

  for (const col of columnsToCheck) {
    const { error: colError } = await supabase
      .from('sites')
      .select(col)
      .limit(1);

    if (colError && colError.message.includes(col)) {
      missingColumns.push(col);
      console.log(`❌ ${col} - MISSING`);
    } else {
      console.log(`✅ ${col} - exists`);
    }
  }

  if (missingColumns.length > 0) {
    console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
    console.log('\nRun this SQL in Supabase Dashboard → SQL Editor:\n');
    console.log('---');
    for (const col of missingColumns) {
      console.log(`ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS ${col} TEXT;`);
    }
    console.log('---');
  } else {
    console.log('\n✅ All columns exist!');
  }
}

fixSchema().catch(console.error);
