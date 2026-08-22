const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let supabaseUrl = '';
let supabaseServiceRole = '';

if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  env.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') supabaseServiceRole = val;
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

async function run() {
  const { data: bundles, error } = await supabase
    .from('product_bundles')
    .select('*');

  if (error) {
    console.error('Error fetching bundles:', error);
  } else {
    console.log('Bundles count:', bundles.length);
    bundles.forEach(b => {
      console.log(`ID: ${b.id}, Name: ${b.name}, Active: ${b.is_active}, Products:`, JSON.stringify(b.products));
    });
  }
}

run();
