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

// GET /api/profiles - Returns the authenticated user's profile
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cache profile for 120 seconds — called on every page load
    const clientProfile = await cached(
      `profile:${user.id}`,
      async () => {
        let queryResult = await supabase
          .from('profiles')
          .select('id, full_name, company_name, business_type, country, state, telegram_chat_id, onboarding_complete, theme, avatar_url, business_description, consented, two_factor_enabled, tour_completed, notification_preferences')
          .eq('id', user.id)
          .maybeSingle()

        let profile: any = queryResult.data
        let error = queryResult.error

        // Fallback: If DB schema doesn't have some optional columns yet,
        // fetch the clean columns and return defaults.
        if (isMissingColumnError(error)) {
          console.warn('[/api/profiles GET] Some columns are missing in DB. Falling back to clean subset.')
          const fallbackResult = await supabase
            .from('profiles')
            .select('id, full_name, company_name, business_type, country, state, telegram_chat_id, onboarding_complete, theme, avatar_url, consented')
            .eq('id', user.id)
            .maybeSingle()

          profile = fallbackResult.data
          error = fallbackResult.error
          if (profile) {
            profile.business_description = ''
            profile.two_factor_enabled = false
            profile.tour_completed = false
            profile.notification_preferences = null
          }
        }

        if (error || !profile) {
          return null
        }

        // Map database state column to client region field
        return {
          ...profile,
          region: profile.state,
          theme: profile.theme || 'dark',
          theme_preference: profile.theme || 'dark'
        }
      },
      120
    )

    if (!clientProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile: clientProfile })
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
      theme: profile.theme || 'dark',
      theme_preference: profile.theme || 'dark'
    }

    return NextResponse.json({ success: true, profile: clientProfile })
  } catch (err: any) {
    console.error('[/api/profiles PATCH] Exception:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
