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
  const sql = `
    SELECT pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conname = 'agents_agent_type_check';
  `;

  // We can execute SQL query via a supabase function, RPC, or by querying pg_constraint.
  // Wait, does Supabase let us do arbitrary SQL queries via RPC?
  // Let's check if get_constraint_def RPC exists and what it returns:
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('get_constraint_def', { table_name: 'agents' });
  if (rpcErr) {
    console.error('RPC Error:', rpcErr);
  } else {
    console.log('RPC get_constraint_def result:');
    console.log(JSON.stringify(rpcRes, null, 2));
  }
}

run();
