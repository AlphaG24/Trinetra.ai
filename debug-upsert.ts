import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role to bypass RLS for debugging

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpsert() {
  console.log('Testing system_config upsert...')
  
  const upsertRows = [
    { config_key: 'maintenance_mode', config_value: 'true' }
  ]

  const { data, error } = await supabase
    .from('system_config')
    .upsert(upsertRows, { onConflict: 'config_key' })

  if (error) {
    console.error('UPSERT ERROR:', error)
  } else {
    console.log('UPSERT SUCCESS:', data)
  }
}

testUpsert()
