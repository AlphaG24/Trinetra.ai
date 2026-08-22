const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setSuperAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('email', 'nexus.ai.ops@gmail.com');
  
  if (error) {
    console.error("Error updating profile:", error);
    return;
  }
  
  console.log("Successfully updated nexus.ai.ops@gmail.com to super_admin");
}

setSuperAdmin();
