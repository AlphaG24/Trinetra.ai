import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-helpers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, supabase } = await authenticateRequest()
    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    const { poolNumberId, agentId } = body

    if (!poolNumberId || !agentId) {
      return NextResponse.json({ error: 'Missing poolNumberId or agentId.' }, { status: 400 })
    }

    // Initialize Service Role Admin Client to bypass RLS policies
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Fetch available pool number from phone_numbers table
    const { data: poolNumber, error: poolError } = await supabaseAdmin
      .from('phone_numbers')
      .select('*')
      .eq('id', poolNumberId)
      .eq('is_assigned', false)
      .single()

    if (poolError || !poolNumber) {
      return NextResponse.json({ error: 'Selected number is no longer available or invalid.' }, { status: 404 })
    }

    // 2. Fetch agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (agentError || !agent) {
      return NextResponse.json({ error: 'Target agent not found in your organization.' }, { status: 404 })
    }

    // 3. Mock Razorpay transaction
    const mockTransactionId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`
    console.log(`[Razorpay Mock] Success. TxId: ${mockTransactionId}`)

    // 4. Update the number status in phone_numbers
    const { data: phoneRow, error: phoneUpdateError } = await supabaseAdmin
      .from('phone_numbers')
      .update({
        is_assigned: true,
        status: 'active',
        assigned_org_id: profile.organization_id,
        organization_id: profile.organization_id,
        assigned_agent_id: agentId,
        metadata: {
          transaction_id: mockTransactionId
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', poolNumberId)
      .select()
      .single()

    if (phoneUpdateError || !phoneRow) {
      console.error('[Pool Purchase] phone_numbers update error:', phoneUpdateError)
      return NextResponse.json({ error: 'Failed to provision number to organization inventory.' }, { status: 500 })
    }

    // 5. Delete any existing mappings for this agent
    await supabaseAdmin
      .from('agent_phone_numbers')
      .delete()
      .eq('agent_id', agentId)

    // 6. Insert into agent_phone_numbers
    const { error: mappingError } = await supabaseAdmin
      .from('agent_phone_numbers')
      .insert({
        agent_id: agentId,
        phone_number_id: phoneRow.id,
        is_primary: true
      })

    if (mappingError) {
      console.error('[Pool Purchase] agent_phone_numbers mapping error:', mappingError)
      return NextResponse.json({ error: 'Failed to bind phone number to selected agent.' }, { status: 500 })
    }

    // Keep agents table in sync
    await supabaseAdmin
      .from('agents')
      .update({
        phone_number: phoneRow.phone_number,
        telephony_provider: phoneRow.provider || 'sarvam'
      })
      .eq('id', agentId)

    // Log Activity
    try {
      await supabaseAdmin.from('activity_log').insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        activity_type: 'number_provisioned',
        title: 'Phone Number Purchased',
        description: `Purchased and assigned ${poolNumber.phone_number} to agent "${agent.name}"`
      })
    } catch (e) {
      console.warn('Logging activity failed:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number purchased and assigned successfully.',
      phone_number: phoneRow
    })

  } catch (error: any) {
    console.error('[Purchase Phone Number Error]:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 550 })
  }
}
