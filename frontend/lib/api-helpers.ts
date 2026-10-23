import { createClient } from "@/lib/server"
import { cookies } from "next/headers"
import { cached, invalidateCache } from "./redis"
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

  // Guard getUser() with timeout per SEC-003
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

  // Profile lookup with Redis caching & resilient admin fallback
  let profile: any = null
  try {
    const profilePromise = cached(
      `auth-profile:${user.id}`,
      async () => {
        const admin = getAdminClient()
        const { data, error: pErr } = await admin
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        if (pErr) {
          console.warn('[api-helpers] Admin profile lookup notice:', pErr.message)
        }
        return data
      },
      120
    )
    const profileTimeout = new Promise<any>((resolve) =>
      setTimeout(() => resolve(null), 3000)
    )
    profile = await Promise.race([profilePromise, profileTimeout])
  } catch (cacheErr) {
    console.warn('[api-helpers] Profile cache lookup notice:', cacheErr)
  }

  // If DB lookup timed out or failed, query directly with admin once
  if (!profile) {
    try {
      const admin = getAdminClient()
      const { data } = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) {
        profile = data
      }
    } catch {}
  }

  // Fallback profile if record is still missing in database
  if (!profile) {
    profile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Partner',
      role: user.app_metadata?.role || user.user_metadata?.role || 'client',
      organization_id: user.id,
      plan_tier: 'starter',
      paid_minutes_limit: 100,
      paid_minutes_used: 0,
      demo_minutes_limit: 15,
      demo_minutes_used: 0,
    }
  }

  // Auto-heal missing organization_id using admin client
  if (!profile.organization_id) {
    try {
      const supabaseAdmin = getAdminClient()
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
        
        if (!updateErr) {
          profile.organization_id = orgId
          await invalidateCache(`auth-profile:${user.id}`)
        }
      }
    } catch (err) {
      console.error('[API Helpers] Failed to auto-assign organization:', err)
      profile.organization_id = user.id
    }
  }

  return { authenticated: true, user, profile, error: null, supabase }
}
