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
  const orgId = 'b1ddf1e9-abc1-4ff4-90f5-3ac66913738a';
  
  const agentPayload = {
    user_id: userId,
    organization_id: orgId,
    name: '[sales_agent] Test Sales Agent',
    agent_type: 'voice', // Changed from sales_agent to voice
    voice_provider: 'sarvam',
    voice_id: 'shubh',
    status: 'active',
    system_prompt: 'Test prompt',
    greeting_message: 'Hello test',
    fallback_message: 'Mujhe yeh samajh nahi aaya, kripya dubara bataiye.',
    config: {
      plan_tier: 'starter',
      minutes_limit: 1000
    }
  };

  const { data, error } = await supabase
    .from('agents')
    .insert(agentPayload)
    .select();

  if (error) {
    console.error('Insert Failed! Error details:');
    console.error(JSON.stringify(error, null, 2));
  } else {
    console.log('Insert Succeeded! Deployed agent ID:', data[0].id);
    // Cleanup
    await supabase.from('agents').delete().eq('id', data[0].id);
  }
}

run();
