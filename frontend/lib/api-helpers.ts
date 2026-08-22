import { createClient } from "@/utils/supabase/server"

export async function authenticateRequest(): Promise<
  | { authenticated: true; user: any; profile: any; error: null; supabase: any }
  | { authenticated: false; user: null; profile: null; error: string; supabase: any }
> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { authenticated: false, user: null, profile: null, error: "Authentication required", supabase }
  }
  const { data: profile } = await supabase.from('profiles').select('id, role, organization_id, plan_tier, country, additional_agents, additional_phone_numbers').eq('id', user.id).single()
  if (!profile) {
    return { authenticated: false, user: null, profile: null, error: "Profile not found", supabase }
  }

  // Auto-heal missing organization_id using admin client to bypass RLS during auth initialization
  if (!profile.organization_id) {
    try {
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: existingOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      
      let orgId = existingOrg?.id

      if (!orgId) {
        const { data: newOrg } = await supabaseAdmin
          .from('organizations')
          .insert({ name: 'Default Org' })
          .select('id')
          .single()
        orgId = newOrg?.id
      }

      if (orgId) {
        const { error: updateErr } = await supabaseAdmin
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('id', user.id)
        
        if (updateErr) {
          console.error('[API Helpers] Failed to update organization_id in profiles:', updateErr)
        } else {
          profile.organization_id = orgId
        }
      }
    } catch (err) {
      console.error('[API Helpers] Failed to auto-assign organization:', err)
    }
  }

  return { authenticated: true, user, profile, error: null, supabase }
}
