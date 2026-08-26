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

    // 1. Fetch available pool number
    const { data: poolNumber, error: poolError } = await supabase
      .from('phone_number_pool')
      .select('*')
      .eq('id', poolNumberId)
      .eq('status', 'available')
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

    // Initialize Service Role Admin Client to bypass RLS policies
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Mock Razorpay transaction
    const mockTransactionId = `pay_mock_${Math.random().toString(36).substring(2, 12)}`
    console.log(`[Razorpay Mock] Success. TxId: ${mockTransactionId}`)

    // 4. Update the number status in phone_number_pool
    const { error: poolUpdateError } = await supabaseAdmin
      .from('phone_number_pool')
      .update({
        status: 'assigned',
        assigned_organization_id: profile.organization_id
      })
      .eq('id', poolNumberId)

    if (poolUpdateError) {
      return NextResponse.json({ error: `Pool reservation failed: ${poolUpdateError.message}` }, { status: 500 })
    }

    // 5. Insert number into phone_numbers table
    const { data: phoneRow, error: phoneInsertError } = await supabaseAdmin
      .from('phone_numbers')
      .insert({
        organization_id: profile.organization_id,
        provider: 'twilio',
        phone_number: poolNumber.phone_number,
        did_type: 'mobile',
        status: 'active',
        monthly_cost_paisa: poolNumber.monthly_cost_paisa,
        retail_price_paisa: poolNumber.retail_price_paisa,
        metadata: {
          transaction_id: mockTransactionId,
          pool_id: poolNumber.id
        }
      })
      .select()
      .single()

    if (phoneInsertError || !phoneRow) {
      console.error('[Pool Purchase] phone_numbers insert error:', phoneInsertError)
      // Rollback pool allocation
      await supabaseAdmin.from('phone_number_pool').update({ status: 'available', assigned_organization_id: null }).eq('id', poolNumberId)
      return NextResponse.json({ error: 'Failed to provision number to organization inventory.' }, { status: 500 })
    }

    // 6. Delete any existing mappings for this agent
    await supabaseAdmin
      .from('agent_phone_numbers')
      .delete()
      .eq('agent_id', agentId)

    // 7. Insert into agent_phone_numbers
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
