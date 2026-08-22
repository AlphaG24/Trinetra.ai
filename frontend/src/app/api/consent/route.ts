import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    // 1. Get authenticated user session
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Read request body
    const body = await request.json()
    const { recordings_consent } = body

    // 3. Initialize Supabase Admin client to bypass RLS policies and safely insert/update
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Collect headers for logging
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const consentToken = crypto.randomUUID()

    const dataCategories = ['personal_data', 'business_details']
    if (recordings_consent) {
      dataCategories.push('call_recordings')
    }

    // 4. Insert consent record
    const { error: insertError } = await supabaseAdmin
      .from('consent_records')
      .insert({
        user_id: user.id,
        consent_type: 'dpdp_consent',
        consent_version: '1.0.0',
        status: 'granted',
        purpose_text: 'To collect and process personal data, business details, and optional call recordings for service delivery under the DPDP Act 2023.',
        data_categories: dataCategories,
        ip_address: ip,
        user_agent: userAgent,
        consent_token: consentToken,
        granted_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('[Consent API] Failed to insert consent record:', insertError)
      return NextResponse.json({ 
        error: 'Failed to insert consent record: ' + insertError.message,
        details: insertError,
        code: insertError.code,
        hint: insertError.hint
      }, { status: 500 })
    }

    // 5. Update profiles.consented = true, onboarding_complete = false
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        consented: true,
        onboarding_complete: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[Consent API] Failed to update profile status:', profileError)
      // Do not fail the whole call if consent insert succeeded but profile update had an issue,
      // but log it to server console.
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Consent API] Internal error:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
