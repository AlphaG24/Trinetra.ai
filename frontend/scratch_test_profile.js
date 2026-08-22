const { createClient } = require('@supabase/supabase-js')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euoucnrjfucowzqdeqpy.supabase.co'
// Use the service key to bypass RLS for quick inspection
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not defined in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  if (error) {
    console.error('Error fetching profile:', error)
  } else {
    console.log('Profile columns:', Object.keys(data[0] || {}))
    console.log('Sample profile data:', data[0])
  }
}

test()
