import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client bypasses RLS for administrative operations
function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  )
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 3. Fetch Tenant / Organization Detail
    const { data: org } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    let tenantData: any = null
    let targetOrgId = org?.id || null

    if (org) {
      // Find primary linked profile for additional attributes (demo minutes, business description)
      const { data: linkedProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      tenantData = {
        ...org,
        gst_number: org.gstin || linkedProfile?.gst_number || null,
        business_description: org.description || linkedProfile?.business_description || '',
        demo_minutes_limit: linkedProfile?.demo_minutes_limit ?? 10,
        billing_model: org.metadata?.billing_model || linkedProfile?.plan_tier || 'subscription',
        plan_tier: org.metadata?.billing_model || linkedProfile?.plan_tier || 'subscription',
        status: org.is_trial ? 'trial' : org.is_active ? 'active' : 'suspended',
        primary_email: org.primary_email || linkedProfile?.email || 'N/A',
      }
    } else {
      // If org not found, check if ID corresponds to a profile ID
      const { data: userProfile } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (!userProfile) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }

      targetOrgId = userProfile.organization_id || null
      if (!targetOrgId) {
        const { data: ownedOrg } = await adminClient
          .from('organizations')
          .select('id')
          .eq('owner_id', id)
          .maybeSingle()
        if (ownedOrg) {
          targetOrgId = ownedOrg.id
        }
      }

      tenantData = {
        ...userProfile,
        status: userProfile.is_active ? 'active' : 'suspended',
        billing_model: (userProfile as any).billing_model || 'subscription',
      }
    }

    const effectiveOrgId = targetOrgId || id

    // 4. Fetch Active Agents
    const { data: agents } = await adminClient
      .from('agents')
      .select('*')
      .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id},user_id.eq.${id}`)

    // 5. Fetch Recent Calls & Metrics
    const { data: calls } = await adminClient
      .from('voice_calls')
      .select('duration_seconds, is_lead, created_at')
      .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id},user_id.eq.${id}`)

    const totalCalls = calls?.length || 0
    const totalMinutes = Math.ceil((calls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) || 0) / 60)
    const totalLeads = calls?.filter(c => c.is_lead).length || 0

    // 6. Fetch Wallet Data (P3, P4, P5, P7, P8) using adminClient to bypass RLS
    const { data: wallet } = await adminClient
      .from('wallets')
      .select('*')
      .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id}`)
      .maybeSingle()

    // 7. Fetch Recent Wallet Ledger Transactions
    const { data: transactions } = await adminClient
      .from('wallet_transactions')
      .select('*')
      .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id}`)
      .order('created_at', { ascending: false })
      .limit(5)

    // Fetch dynamic default spend limit from system_config if available
    let defaultSpendLimitPaisa = 250000
    try {
      const { data: sysConfig } = await adminClient
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'default_spend_limit_paisa')
        .maybeSingle()
      if (sysConfig?.config_value) {
        defaultSpendLimitPaisa = parseInt(sysConfig.config_value, 10) || 250000
      }
    } catch {}

    return NextResponse.json({
      tenant: tenantData,
      wallet: wallet || {
        organization_id: effectiveOrgId,
        spend_limit_paisa: defaultSpendLimitPaisa,
        balance_paisa: 0,
        current_spend_paisa: 0,
        reliability_score: 85,
        emergency_minutes_available: 0,
      },
      transactions: transactions || [],
      agents: agents || [],
      metrics: {
        totalCalls,
        totalMinutes,
        totalLeads,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Authorize Admin Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
    }

    const adminClient = getAdminClient()

    // 3. Update Organization or Profile
    const { data: org } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    let updatedResult: any = null
    let targetOrgId = org?.id || null

    if (org) {
      const orgUpdate: Record<string, any> = {}
      if (body.admin_notes !== undefined) orgUpdate.admin_notes = body.admin_notes
      if (body.status !== undefined) {
        orgUpdate.is_active = body.status === 'active'
        orgUpdate.is_trial = body.status === 'trial'
      }

      // Store billing_model (P5: 'subscription' | 'credit_based' | 'outcome_based') in metadata
      const currentMeta = { ...(org.metadata || {}) }
      if (body.billing_model !== undefined) {
        const allowedModels = ['subscription', 'credit_based', 'outcome_based']
        if (allowedModels.includes(body.billing_model)) {
          currentMeta.billing_model = body.billing_model
        }
      }
      orgUpdate.metadata = currentMeta

      const { data: savedOrg, error: orgUpdateError } = await adminClient
        .from('organizations')
        .update(orgUpdate)
        .eq('id', id)
        .select()
        .single()

      if (orgUpdateError) {
        console.error('Failed to update organization:', orgUpdateError)
        return NextResponse.json({ error: orgUpdateError.message }, { status: 500 })
      }

      // Sync linked profile fields (demo_minutes_limit, is_active, plan_tier)
      const profileUpdate: Record<string, any> = {}
      if (body.demo_minutes_limit !== undefined) profileUpdate.demo_minutes_limit = body.demo_minutes_limit
      if (body.status !== undefined) profileUpdate.is_active = body.status === 'active'
      if (body.billing_model !== undefined) profileUpdate.plan_tier = body.billing_model

      if (Object.keys(profileUpdate).length > 0) {
        await adminClient
          .from('profiles')
          .update(profileUpdate)
          .eq('organization_id', id)
      }

      // Sync agents config.plan_tier for this organization
      if (body.billing_model !== undefined) {
        const { data: orgAgents } = await adminClient
          .from('agents')
          .select('id, config')
          .eq('organization_id', id)

        if (orgAgents && orgAgents.length > 0) {
          for (const ag of orgAgents) {
            const nextConfig = { ...(ag.config || {}), plan_tier: body.billing_model }
            await adminClient
              .from('agents')
              .update({ config: nextConfig })
              .eq('id', ag.id)
          }
        }
      }

      updatedResult = {
        ...savedOrg,
        billing_model: currentMeta.billing_model || 'subscription',
        plan_tier: currentMeta.billing_model || savedOrg.plan_tier || 'subscription',
        status: body.status || (savedOrg.is_trial ? 'trial' : savedOrg.is_active ? 'active' : 'suspended'),
      }
    } else {
      // Fallback: id corresponds to a profile
      const profUpdate: Record<string, any> = {}
      if (body.admin_notes !== undefined) profUpdate.admin_notes = body.admin_notes
      if (body.demo_minutes_limit !== undefined) profUpdate.demo_minutes_limit = body.demo_minutes_limit
      if (body.status !== undefined) profUpdate.is_active = body.status === 'active'
      if (body.billing_model !== undefined) profUpdate.plan_tier = body.billing_model

      const { data: savedProf, error: profUpdateError } = await adminClient
        .from('profiles')
        .update(profUpdate)
        .eq('id', id)
        .select()
        .single()

      if (profUpdateError) {
        console.error('Failed to update profile:', profUpdateError)
        return NextResponse.json({ error: profUpdateError.message }, { status: 500 })
      }

      updatedResult = savedProf
      targetOrgId = savedProf.organization_id || null

      if (!targetOrgId) {
        const { data: ownedOrg } = await adminClient
          .from('organizations')
          .select('id')
          .eq('owner_id', id)
          .maybeSingle()
        if (ownedOrg) {
          targetOrgId = ownedOrg.id
        } else {
          const { data: newOrg } = await adminClient
            .from('organizations')
            .insert({
              name: savedProf.company_name || `${savedProf.full_name || 'Tenant'}'s Organization`,
              owner_id: id,
              primary_email: savedProf.email
            })
            .select('id')
            .single()
          if (newOrg) {
            targetOrgId = newOrg.id
            await adminClient
              .from('profiles')
              .update({ organization_id: newOrg.id })
              .eq('id', id)
          }
        }
      }
    }

    const effectiveOrgId = targetOrgId || id
    let updatedWallet: any = null

    // Decision P8: Spend limit override per customer
    if (body.spend_limit_paisa !== undefined) {
      const spendLimitPaisa = Number(body.spend_limit_paisa)
      if (!isNaN(spendLimitPaisa) && spendLimitPaisa >= 0) {
        const nowIso = new Date().toISOString()

        // Check if wallet exists for this tenant
        const { data: existingWallet } = await adminClient
          .from('wallets')
          .select('*')
          .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id}`)
          .maybeSingle()

        if (existingWallet) {
          const { data: savedWallet, error: updateErr } = await adminClient
            .from('wallets')
            .update({
              spend_limit_paisa: spendLimitPaisa,
              updated_at: nowIso,
            })
            .eq('id', existingWallet.id)
            .select()
            .single()

          if (updateErr) {
            console.error('Failed to update spend limit in wallet:', updateErr)
            throw new Error(`Failed to update spend limit: ${updateErr.message}`)
          }
          updatedWallet = savedWallet
        } else {
          const { data: savedWallet, error: insertErr } = await adminClient
            .from('wallets')
            .insert({
              organization_id: effectiveOrgId,
              spend_limit_paisa: spendLimitPaisa,
              balance_paisa: 0,
              current_spend_paisa: 0,
              reliability_score: 85,
              emergency_minutes_available: 0,
              currency: 'INR',
              created_at: nowIso,
              updated_at: nowIso,
            })
            .select()
            .single()

          if (insertErr) {
            console.error('Failed to insert new wallet with spend limit:', insertErr)
            throw new Error(`Failed to save spend limit: ${insertErr.message}`)
          }
          updatedWallet = savedWallet
        }
      }
    }

    // P3 / P4: Admin adding/adjusting credit directly
    if (body.add_credit_paisa !== undefined && Number(body.add_credit_paisa) > 0) {
      const creditPaisa = Number(body.add_credit_paisa)
      const creditReason = body.credit_reason?.trim() || `Admin manual top-up of ₹${(creditPaisa / 100).toFixed(2)}`

      const { data: currentWallet } = await adminClient
        .from('wallets')
        .select('*')
        .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id}`)
        .maybeSingle()

      const newBal = (currentWallet?.balance_paisa || 0) + creditPaisa
      const nowIso = new Date().toISOString()

      if (currentWallet) {
        const { data: savedWallet, error: updateErr } = await adminClient
          .from('wallets')
          .update({
            balance_paisa: newBal,
            last_topup_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', currentWallet.id)
          .select()
          .single()

        if (updateErr) throw new Error(`Credit update failed: ${updateErr.message}`)
        updatedWallet = savedWallet
      } else {
        const { data: savedWallet, error: insertErr } = await adminClient
          .from('wallets')
          .insert({
            organization_id: effectiveOrgId,
            balance_paisa: newBal,
            currency: 'INR',
            spend_limit_paisa: 250000,
            current_spend_paisa: 0,
            reliability_score: 85,
            emergency_minutes_available: 0,
            last_topup_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso,
          })
          .select()
          .single()

        if (insertErr) throw new Error(`Credit insert failed: ${insertErr.message}`)
        updatedWallet = savedWallet
      }

      try {
        await adminClient
          .from('wallet_transactions')
          .insert({
            organization_id: effectiveOrgId,
            amount_paisa: creditPaisa,
            type: 'admin_credit',
            reference_id: `admin_adj_${Date.now()}`,
            balance_after_paisa: newBal,
            description: creditReason,
            created_at: nowIso,
          })
      } catch (txErr) {
        console.warn('Ledger transaction log skipped:', txErr)
      }
    }

    if (!updatedWallet) {
      const { data: freshWallet } = await adminClient
        .from('wallets')
        .select('*')
        .or(`organization_id.eq.${effectiveOrgId},organization_id.eq.${id}`)
        .maybeSingle()
      updatedWallet = freshWallet
    }

    // 4. Record Audit Log
    try {
      await adminClient.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: 'admin.tenant_updated',
        resource_type: 'organization',
        resource_id: effectiveOrgId,
        new_values: {
          billing_model: body.billing_model,
          status: body.status,
          spend_limit_paisa: body.spend_limit_paisa,
          demo_minutes_limit: body.demo_minutes_limit,
          add_credit_paisa: body.add_credit_paisa,
          credit_reason: body.credit_reason,
        },
      })
    } catch (auditErr) {
      console.warn('Audit log entry failed:', auditErr)
    }

    return NextResponse.json({
      success: true,
      tenant: updatedResult,
      wallet: updatedWallet,
    })
  } catch (error: any) {
    console.error('Error in PUT /api/admin/tenants/[id]:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
