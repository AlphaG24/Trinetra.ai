import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) env[key.trim()] = rest.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Use a real auth user ID
const realUserId = '2a88a210-84fd-4b74-ab90-87377e1c5d65'; // testpartner123@gmail.com

const { data, error } = await supabase
  .from('partners')
  .insert({
    auth_user_id: realUserId,
    user_id: realUserId,
    email: 'testpartner123@gmail.com',
    full_name: 'Test Partner',
    referral_code: 'TESTPR01',
    status: 'active',
    commission_currency: 'INR',
    currency: 'INR',
  })
  .select('*')
  .single();

if (error) {
  console.log('Insert error:', error.message);
  console.log('Error code:', error.code);
  console.log('Details:', error.details);
} else {
  console.log('SUCCESS! Columns in partners table:');
  console.log(Object.keys(data).join(', '));
  console.log('\nFull row:');
  console.log(JSON.stringify(data, null, 2));
}
