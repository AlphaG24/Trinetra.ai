import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// List all users with pagination
const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 100 });
console.log('All auth users:');
for (const user of userList?.users || []) {
  const confirmed = user.email_confirmed_at ? 'YES' : 'NO';
  console.log(`  ${user.email} | confirmed: ${confirmed} | id: ${user.id}`);
  
  if (!user.email_confirmed_at) {
    // Use admin API to update user and confirm email
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_confirm: true }),
    });
    const result = await res.json();
    console.log(`    -> Auto-confirmed: ${res.ok ? 'SUCCESS' : 'FAILED: ' + JSON.stringify(result)}`);
  }
}

// Check partner records
const { data: partners } = await supabase.from('partners').select('*');
console.log(`\nPartner records: ${partners?.length || 0}`);
partners?.forEach(p => {
  console.log(`  ${p.email} | user_id: ${p.user_id} | status: ${p.status}`);
});
