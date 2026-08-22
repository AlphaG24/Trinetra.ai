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
  const userId = '9363a829-8d11-42ae-bfff-d8ea5c17a71b';
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching agents:', error);
  } else {
    console.log('Agents count:', agents.length);
    agents.forEach(agent => {
      console.log(`ID: ${agent.id}, Name: ${agent.name}, Type: ${agent.agent_type}, Status: ${agent.status}`);
    });
  }
}

run();
