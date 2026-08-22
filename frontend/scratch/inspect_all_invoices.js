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
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Total invoices:', data.length);
    data.forEach(inv => {
      console.log(`- Num: ${inv.invoice_number}, Status: ${inv.status}, Date: ${inv.created_at}, PDF URL: ${inv.pdf_url ? inv.pdf_url.substring(0, 80) + '...' : null}`);
    });
  }
}

run();
