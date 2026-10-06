import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cached, invalidateCache } from '@/lib/redis'

const isMissingColumnError = (err: any) => {
  if (!err) return false
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    (typeof err.message === 'string' && (
      err.message.includes('column') ||
      err.message.includes('schema cache') ||
      err.message.includes('business_description')
    ))
  )
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/profiles - Returns the authenticated user's profile
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile, error: dbError } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (dbError) {
      console.error('[/api/profiles GET] Error querying profile:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!profile) {
      const fallbackProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        role: 'client',
        plan_tier: 'free',
        onboarding_complete: false,
      }
      await admin.from('profiles').upsert(fallbackProfile)
      return NextResponse.json({ profile: fallbackProfile })
    }

    const resolvedEmail = profile.email || user.email || ''
    const resolvedFullName = profile.full_name || user.user_metadata?.full_name || ''

    return NextResponse.json({
      profile: {
        ...profile,
        email: resolvedEmail,
        full_name: resolvedFullName,
        region: profile.state || '',
        theme: profile.theme || 'light',
        theme_preference: profile.theme || 'light',
      }
    })
  } catch (err: any) {
    console.error('[/api/profiles GET] Exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/profiles - Updates allowed profile fields atomically
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Build database updates object mapping client fields to DB columns
    const updates: Record<string, any> = {}
    
    if (body.full_name !== undefined) updates.full_name = body.full_name
    if (body.company_name !== undefined) updates.company_name = body.company_name
    if (body.business_type !== undefined) updates.business_type = body.business_type
    if (body.country !== undefined) updates.country = body.country
    
    // Map region to state column
    if (body.region !== undefined) updates.state = body.region
    
    if (body.telegram_chat_id !== undefined) updates.telegram_chat_id = body.telegram_chat_id
    if (body.onboarding_complete !== undefined) updates.onboarding_complete = body.onboarding_complete
    if (body.theme !== undefined) updates.theme = body.theme
    if (body.theme_preference !== undefined) updates.theme = body.theme_preference
    if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url
    if (body.business_description !== undefined) updates.business_description = body.business_description
    if (body.consented !== undefined) updates.consented = body.consented
    if (body.two_factor_enabled !== undefined) updates.two_factor_enabled = body.two_factor_enabled
    if (body.tour_completed !== undefined) updates.tour_completed = body.tour_completed
    if (body.notification_preferences !== undefined) updates.notification_preferences = body.notification_preferences

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Use admin client with service role key to bypass RLS policies and allow updates/upserts
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if row exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    const runWrite = async (fieldsToUpdate: any) => {
      if (existingProfile) {
        return supabaseAdmin
          .from('profiles')
          .update({ ...fieldsToUpdate, updated_at: new Date().toISOString() })
          .eq('id', user.id)
          .select('id, full_name, company_name, business_type, country, state, telegram_chat_id, onboarding_complete, theme, avatar_url, business_description, consented, two_factor_enabled, tour_completed, notification_preferences')
          .maybeSingle()
      } else {
        return supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || fieldsToUpdate.full_name || '',
            ...fieldsToUpdate,
            updated_at: new Date().toISOString()
          })
          .select('id, full_name, company_name, business_type, country, state, telegram_chat_id, onboarding_complete, theme, avatar_url, business_description, consented, two_factor_enabled, tour_completed, notification_preferences')
          .maybeSingle()
      }
    }

    let writeResult = await runWrite(updates)
    let error = writeResult.error
    let profile: any = writeResult.data

    // Fallback: If DB schema doesn't support all columns yet,
    // progressively strip optional columns and retry.
    if (isMissingColumnError(error)) {
      console.warn('[/api/profiles PATCH] Missing columns in DB table. Filtering and retrying.')
      const cleanUpdates = { ...updates }
      // Strip columns that may not yet exist in the DB
      delete cleanUpdates.business_description
      delete cleanUpdates.two_factor_enabled
      delete cleanUpdates.tour_completed
      delete cleanUpdates.notification_preferences

      const safeSelect = 'id, full_name, company_name, business_type, country, state, telegram_chat_id, onboarding_complete, theme, avatar_url, consented'

      const retryResult = await (async () => {
        if (existingProfile) {
          return supabaseAdmin
            .from('profiles')
            .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select(safeSelect)
            .maybeSingle()
        } else {
          return supabaseAdmin
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || cleanUpdates.full_name || '',
              ...cleanUpdates,
              updated_at: new Date().toISOString()
            })
            .select(safeSelect)
            .maybeSingle()
        }
      })()

      profile = retryResult.data
      error = retryResult.error
      if (profile) {
        profile.business_description = updates.business_description || ''
        profile.two_factor_enabled = updates.two_factor_enabled || false
        profile.tour_completed = updates.tour_completed ?? profile.tour_completed
        profile.notification_preferences = updates.notification_preferences ?? null
      }
    }

    if (error || !profile) {
      console.error('[/api/profiles PATCH] Supabase error:', error)
      return NextResponse.json({ error: error ? error.message : 'Profile write returned null data' }, { status: 400 })
    }

    // Invalidate cached profile and auth-profile on update
    await invalidateCache(`profile:${user.id}`, `auth-profile:${user.id}`)

    const clientProfile = {
      ...profile,
      region: profile.state,
      theme: profile.theme || 'light',
      theme_preference: profile.theme || 'light'
    }

    return NextResponse.json({ success: true, profile: clientProfile })
  } catch (err: any) {
    console.error('[/api/profiles PATCH] Exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
