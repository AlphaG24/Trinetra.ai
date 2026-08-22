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
  const { data: cols, error } = await supabase
    .rpc('get_constraint_info', { table_name: 'agents' }); // Wait, let's just query via RPC or general query

  // Or let's just query a single row from agents to see what keys it has:
  const { data: agent, error: err } = await supabase
    .from('agents')
    .select('*')
    .limit(1);

  if (err) {
    console.error('Error fetching agent:', err);
  } else {
    console.log('Sample agent keys:', agent && agent[0] ? Object.keys(agent[0]) : 'No rows');
    console.log('Sample agent row:', agent && agent[0] ? JSON.stringify(agent[0], null, 2) : 'No rows');
  }
}

run();
