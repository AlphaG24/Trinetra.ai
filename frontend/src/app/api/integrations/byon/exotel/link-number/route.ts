import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const body = await req.json()
    const { phone_number, friendly_name, sid } = body

    if (!phone_number) {
      return NextResponse.json({ error: 'phone_number is required' }, { status: 400 })
    }

    const formattedNumber = phone_number.startsWith('+') ? phone_number : `+${phone_number.replace(/^0+/, '')}`

    // Check if number already registered
    const { data: existing } = await admin
      .from('phone_numbers')
      .select('*')
      .or(`phone_number.eq.${formattedNumber},phone_number.eq.${phone_number}`)
      .maybeSingle()

    if (existing) {
      if (existing.organization_id && existing.organization_id !== profile.organization_id) {
        return NextResponse.json({ error: 'This phone number is registered with another organization.' }, { status: 409 })
      }

      // Re-assign to this org and set active
      const { error: updErr } = await admin
        .from('phone_numbers')
        .update({
          organization_id: profile.organization_id,
          assigned_org_id: profile.organization_id,
          status: 'active',
          is_assigned: true,
          provider: 'exotel',
          provider_number_id: sid || existing.provider_number_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `ExoPhone ${formattedNumber} linked to your workspace successfully!`
      })
    }

    // Insert new BYON Exotel record
    const { error: insErr } = await admin
      .from('phone_numbers')
      .insert({
        phone_number: formattedNumber,
        provider: 'exotel',
        provider_number_id: sid || `exo_${Date.now()}`,
        status: 'active',
        is_assigned: true,
        organization_id: profile.organization_id,
        assigned_org_id: profile.organization_id,
        did_type: 'local',
        city: friendly_name || 'Exotel BYON',
        metadata: {
          byon: true,
          carrier: 'exotel',
          linked_by: user.id,
          sid: sid || null
        }
      })

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 })
    }

    // Activity log entry
    await admin.from('activity_log').insert({
      user_id: user.id,
      activity_type: 'number_linked',
      title: 'Exotel Number Linked',
      description: `Linked BYON Exotel number ${formattedNumber}`,
      metadata: {
        organization_id: profile.organization_id,
        phone_number: formattedNumber,
        provider: 'exotel'
      }
    })

    return NextResponse.json({
      success: true,
      message: `ExoPhone ${formattedNumber} linked to your workspace! You can now assign it to an AI Agent.`
    })
  } catch (err: any) {
    console.error('[Link Exotel Number Error]', err)
    return NextResponse.json({ error: err.message || 'Failed to link number' }, { status: 500 })
  }
}
