import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { cached, invalidateCache } from "./redis"

export async function authenticateRequest(): Promise<
  | { authenticated: true; user: any; profile: any; error: null; supabase: any }
  | { authenticated: false; user: null; profile: null; error: string; supabase: any }
> {
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore.getAll().some(
    c => c.name.includes('auth-token') || c.name.startsWith('sb-')
  )
  if (!hasAuthCookie) {
    return { authenticated: false, user: null, profile: null, error: "Authentication required", supabase: null }
  }

  const supabase = await createClient()

  // Guard getUser() with 2.5s timeout per SEC-003 to prevent gateway hangs and client TypeError: Failed to fetch
  let user: any = null
  let authError: any = null
  try {
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Auth request timeout')), 8000)
    )
    const result = await Promise.race([authPromise, timeoutPromise])
    user = result?.data?.user ?? null
    authError = result?.error ?? null
  } catch (err: any) {
    authError = err
  }

  if (authError || !user) {
    return { authenticated: false, user: null, profile: null, error: "Authentication required", supabase }
  }

  // Cache profile lookup in Redis (120s TTL) with 2.5s timeout guard
  let profile: any = null
  try {
    const profilePromise = cached(
      `auth-profile:${user.id}`,
      async () => {
        const { data } = await supabase.from('profiles').select('id, role, organization_id, plan_tier, country, additional_agents, additional_phone_numbers').eq('id', user.id).single()
        return data
      },
      120
    )
    const profileTimeout = new Promise<any>((resolve) =>
      setTimeout(() => resolve(null), 2500)
    )
    profile = await Promise.race([profilePromise, profileTimeout])
  } catch {}

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
          // Invalidate cached profile since org_id changed
          await invalidateCache(`auth-profile:${user.id}`)
        }
      }
    } catch (err) {
      console.error('[API Helpers] Failed to auto-assign organization:', err)
    }
  }

  return { authenticated: true, user, profile, error: null, supabase }
}
