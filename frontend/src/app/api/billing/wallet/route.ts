import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getRazorpayConfig(adminClient: any) {
  const { data: configs } = await adminClient.from('system_config').select('config_key, config_value')
  const config: Record<string, string> = {}
  configs?.forEach((c: any) => { config[c.config_key] = c.config_value })

  const keyId = config.razorpay_test_key_id || config.razorpay_key_id || process.env.RAZORPAY_KEY_ID
  const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET

  return { keyId, keySecret }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization linked to profile' }, { status: 400 })
    }

    // Fetch or provision wallet
    const { data: wallet } = await adminClient
      .from('wallets')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle()

    const walletData = wallet || {
      organization_id: orgId,
      balance_paisa: 0,
      currency: 'INR',
      spend_limit_paisa: 250000,
      current_spend_paisa: 0,
      reliability_score: 85,
      emergency_minutes_available: 0,
      emergency_minutes_claimed_at: null,
      last_topup_at: null,
    }

    return NextResponse.json({
      success: true,
      wallet: {
        ...walletData,
        balance_inr: (walletData.balance_paisa || 0) / 100,
        spend_limit_inr: (walletData.spend_limit_paisa || 250000) / 100,
        current_spend_inr: (walletData.current_spend_paisa || 0) / 100,
      },
    })
  } catch (error: any) {
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('organization_id, role, full_name, company_name, state')
      .eq('id', user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization linked to profile' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const { action } = body

    if (action === 'claim_emergency_minutes') {
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      const reliabilityScore = wallet?.reliability_score ?? 85
      if (reliabilityScore <= 80) {
        return NextResponse.json({
          error: `Reliability Score must exceed 80 to unlock emergency minutes (current: ${reliabilityScore}).`,
        }, { status: 403 })
      }

      // Check 30-day cooldown
      if (wallet?.emergency_minutes_claimed_at) {
        const lastClaimed = new Date(wallet.emergency_minutes_claimed_at).getTime()
        const daysSince = (Date.now() - lastClaimed) / (1000 * 60 * 60 * 24)
        if (daysSince < 30) {
          return NextResponse.json({
            error: `Emergency minutes can only be claimed once every 30 days. Please wait ${Math.ceil(30 - daysSince)} more days.`,
          }, { status: 429 })
        }
      }

      const nowIso = new Date().toISOString()
      await adminClient.from('wallets').upsert({
        organization_id: orgId,
        emergency_minutes_available: 50,
        emergency_minutes_claimed_at: nowIso,
        updated_at: nowIso,
      }, { onConflict: 'organization_id' })

      return NextResponse.json({
        success: true,
        message: '50 emergency minutes successfully claimed.',
        emergency_minutes_available: 50,
      })
    }

    // 1. Create Razorpay Order for Real Top-Up
    if (action === 'create_order') {
      const amountInr = Number(body.amount_inr)
      if (!amountInr || amountInr < 100) {
        return NextResponse.json({ error: 'Minimum wallet top-up is ₹100' }, { status: 400 })
      }
      const amountPaisa = Math.round(amountInr * 100)

      const { keyId, keySecret } = await getRazorpayConfig(adminClient)
      if (!keyId || !keySecret) {
        return NextResponse.json({ error: 'Payment gateway is currently not configured' }, { status: 500 })
      }

      const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
      const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`
        },
        body: JSON.stringify({
          amount: amountPaisa,
          currency: 'INR',
          receipt: `wtop_${Date.now()}`.substring(0, 40),
          notes: {
            type: 'wallet_topup',
            user_id: user.id,
            organization_id: orgId,
            amount_inr: amountInr
          }
        })
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        console.error('[Wallet Topup] Razorpay order creation failed:', orderData)
        return NextResponse.json({ error: orderData.error?.description || 'Failed to create payment order' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        key: keyId,
        order_id: orderData.id,
        amount: orderData.amount,
        currency: 'INR',
        user_email: user.email,
        user_name: profile.full_name || ''
      })
    }

    // 2. Verify Razorpay Payment Signature & Credit Wallet
    if (action === 'verify_topup') {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount_inr } = body
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return NextResponse.json({ error: 'Missing payment signature verification parameters' }, { status: 400 })
      }

      const { keySecret } = await getRazorpayConfig(adminClient)
      if (!keySecret) {
        return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
      }

      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expectedSignature !== razorpay_signature) {
        console.error('[Wallet Topup] Signature mismatch:', { expectedSignature, razorpay_signature })
        return NextResponse.json({ error: 'Invalid payment signature. Verification failed.' }, { status: 400 })
      }

      // Idempotency check: prevent duplicate credit on identical payment ID
      const { data: existingTx } = await adminClient
        .from('wallet_transactions')
        .select('id')
        .eq('reference_id', razorpay_payment_id)
        .maybeSingle()

      if (existingTx) {
        return NextResponse.json({
          success: true,
          message: 'Payment has already been processed and credited.'
        })
      }

      const amountInrNum = Number(amount_inr) || 100
      const amountPaisa = Math.round(amountInrNum * 100)

      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      const currentBalance = wallet?.balance_paisa || 0
      const newBalance = currentBalance + amountPaisa
      const nowIso = new Date().toISOString()

      // Update wallet balance in database
      const { data: updatedWallet, error: updateErr } = await adminClient
        .from('wallets')
        .upsert({
          organization_id: orgId,
          balance_paisa: newBalance,
          last_topup_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'organization_id' })
        .select('*')
        .single()

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      // Insert transaction in double-entry ledger
      await adminClient.from('wallet_transactions').insert({
        organization_id: orgId,
        amount_paisa: amountPaisa,
        type: 'topup',
        reference_id: razorpay_payment_id,
        balance_after_paisa: newBalance,
        description: `Wallet top-up via Razorpay (${razorpay_payment_id})`,
        created_at: nowIso,
      })

      // Generate official GST Tax Invoice (VAK/ Series per Task 11)
      const countRes = await adminClient.from('invoices').select('id', { count: 'exact' })
      const invCount = (countRes.count || 0) + 1
      const invNumber = `VAK/26-27/${String(invCount).padStart(5, '0')}`

      const taxablePaisa = Math.round(amountPaisa / 1.18)
      const taxPaisa = amountPaisa - taxablePaisa
      const cgstPaisa = Math.round(taxPaisa / 2)
      const sgstPaisa = taxPaisa - cgstPaisa

      await adminClient.from('invoices').insert({
        organization_id: orgId,
        invoice_number: invNumber,
        fiscal_year: '2026-2027',
        invoice_date: nowIso,
        due_date: nowIso,
        payment_reference_id: razorpay_payment_id,
        transaction_type: 'wallet_topup',
        currency: 'INR',
        supplier_name: 'Vaakriti Technologies Private Limited',
        supplier_gstin: '07AAAAA0000A1Z5',
        customer_legal_name: profile.full_name || profile.company_name || user.email,
        place_of_supply: profile.state || 'Delhi',
        subtotal_paisa: taxablePaisa,
        cgst_rate_pct: 9.00,
        cgst_amount_paisa: cgstPaisa,
        sgst_rate_pct: 9.00,
        sgst_amount_paisa: sgstPaisa,
        total_tax_paisa: taxPaisa,
        grand_total_paisa: amountPaisa,
        ca_review_status: 'pending',
        status: 'paid',
        payment_method: 'Razorpay UPI/Card/Netbanking',
        created_at: nowIso,
        updated_at: nowIso,
      })

      return NextResponse.json({
        success: true,
        message: `Wallet successfully topped up by ₹${amountInrNum.toLocaleString('en-IN')}!`,
        invoice_number: invNumber,
        wallet: {
          ...updatedWallet,
          balance_inr: newBalance / 100,
        },
      })
    }

    // Fallback direct topup (retained for backward compatibility)
    if (action === 'topup') {
      const amountInr = Number(body.amount_inr)
      if (!amountInr || amountInr <= 0) {
        return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 })
      }
      const amountPaisa = Math.round(amountInr * 100)

      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()

      const currentBalance = wallet?.balance_paisa || 0
      const newBalance = currentBalance + amountPaisa
      const nowIso = new Date().toISOString()

      const { data: updatedWallet, error: updateErr } = await adminClient
        .from('wallets')
        .upsert({
          organization_id: orgId,
          balance_paisa: newBalance,
          last_topup_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'organization_id' })
        .select('*')
        .single()

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      // Also create an official GST Tax Invoice (VAK/ Series per Task 11)
      const countRes = await adminClient.from('invoices').select('id', { count: 'exact' })
      const invCount = (countRes.count || 0) + 1
      const invNumber = `VAK/26-27/${String(invCount).padStart(5, '0')}`

      const taxablePaisa = Math.round(amountPaisa / 1.18)
      const taxPaisa = amountPaisa - taxablePaisa
      const cgstPaisa = Math.round(taxPaisa / 2)
      const sgstPaisa = taxPaisa - cgstPaisa

      await adminClient.from('invoices').insert({
        organization_id: orgId,
        invoice_number: invNumber,
        fiscal_year: '2026-2027',
        invoice_date: nowIso,
        due_date: nowIso,
        payment_reference_id: `PAY-${Date.now()}`,
        transaction_type: 'wallet_topup',
        currency: 'INR',
        supplier_name: 'Vaakriti Technologies Private Limited',
        supplier_gstin: '07AAAAA0000A1Z5',
        customer_legal_name: profile.full_name || profile.company_name || user.email,
        place_of_supply: profile.state || 'Delhi',
        subtotal_paisa: taxablePaisa,
        cgst_rate_pct: 9.00,
        cgst_amount_paisa: cgstPaisa,
        sgst_rate_pct: 9.00,
        sgst_amount_paisa: sgstPaisa,
        total_tax_paisa: taxPaisa,
        grand_total_paisa: amountPaisa,
        status: 'paid',
        payment_method: 'Razorpay Instant UPI/Card',
        created_at: nowIso,
        updated_at: nowIso,
      })

      return NextResponse.json({
        success: true,
        message: `Wallet topped up by ₹${amountInr.toLocaleString('en-IN')}`,
        invoice_number: invNumber,
        wallet: {
          ...updatedWallet,
          balance_inr: newBalance / 100,
        },
      })
    }

    if (action === 'update_spend_limit') {
      const limitInr = Number(body.spend_limit_inr)
      if (limitInr === undefined || limitInr < 0) {
        return NextResponse.json({ error: 'Valid spend limit is required' }, { status: 400 })
      }
      const limitPaisa = Math.round(limitInr * 100)

      await adminClient.from('wallets').upsert({
        organization_id: orgId,
        spend_limit_paisa: limitPaisa,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })

      return NextResponse.json({
        success: true,
        message: `Spend limit updated to ₹${limitInr.toLocaleString('en-IN')}`,
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    console.error('Wallet POST error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
