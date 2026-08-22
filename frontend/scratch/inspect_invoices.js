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
    .eq('invoice_number', 'TRI-INV-1786084186932')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Invoice Num:', data.invoice_number);
    console.log('PDF URL:', data.pdf_url);
  }
}

run();
