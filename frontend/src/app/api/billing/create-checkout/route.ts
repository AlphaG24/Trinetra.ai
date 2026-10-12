import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { validateCoupon } from '@/lib/coupons'
import { calculateGSTBreakdown, validateGSTIN } from '@/lib/gst'

interface CartItem {
  type: 'subscription' | 'phone_number' | 'bundle' | 'number_pool' | 'number_renewal'
  key: string // 'starter', 'professional', bundle UUID, or 'phone_number'
  quantity: number
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    console.log('[CHECKOUT] Multi-item Cart Checkout Starting...')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      items, 
      use_same_profile,
      coupon_code,
      customer_gstin,
      customer_legal_name,
      save_gst_to_profile
    } = body as { 
      items: CartItem[]
      use_same_profile?: boolean
      coupon_code?: string
      customer_gstin?: string
      customer_legal_name?: string
      save_gst_to_profile?: boolean
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    
    // Load config values
    const { data: configs } = await adminClient.from('system_config').select('config_key, config_value')
    const config: Record<string, string> = {}
    configs?.forEach(c => { config[c.config_key] = c.config_value })

    const keyId = config.razorpay_test_key_id || config.razorpay_key_id || process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
    }

    // Load active bundles to verify bundle prices
    const { data: activeBundles } = await adminClient
      .from('product_bundles')
      .select('*')
      .eq('is_active', true)

    const bundleMap: Record<string, any> = {}
    activeBundles?.forEach(b => { bundleMap[b.id] = b })

    // Price mappings from system configs
    const subscriptionPrices: Record<string, number> = {
      starter: parseInt(config.starter_price_paisa || '499900', 10),
      professional: parseInt(config.professional_price_paisa || '1499900', 10),
      trial: parseInt(config.trial_price_paisa || '9900', 10)
    }
    const numberPrice = parseInt(config.inbound_number_cost_paisa || '49900', 10)

    // Verify strictly one-time trial restriction
    const hasTrial = items.some(item => item.type === 'subscription' && (item.key === 'trial' || item.key.endsWith('_trial')))
    if (hasTrial) {
      const { data: userProfile } = await adminClient
        .from('profiles')
        .select('plan_tier, trial_started_at')
        .eq('id', user.id)
        .maybeSingle()

      if (userProfile && (userProfile.plan_tier === 'starter' || userProfile.plan_tier === 'professional' || userProfile.trial_started_at)) {
        return NextResponse.json({
          error: 'The ₹99 7-Day Trial is a strictly one-time evaluation pack for new accounts. Your account has already utilized a trial or is on a paid plan. Please select a Starter or Professional plan.'
        }, { status: 400 })
      }
    }


    // Calculate dynamic cart pricing
    let subtotal = 0
    let discount = 0
    let totalAgentsQty = 0
    let totalNumbersQty = 0

    // Count item categories for quantity bulk discounts
    items.forEach(item => {
      if (item.type === 'subscription') {
        totalAgentsQty += item.quantity
      } else if (item.type === 'phone_number') {
        totalNumbersQty += item.quantity
      }
    })

    // Bulk discount percentages
    const bulkAgentDiscount2 = parseInt(config.bulk_discount_2_agents_percent || '10', 10)
    const bulkAgentDiscount3 = parseInt(config.bulk_discount_3_agents_percent || '15', 10)
    const bulkNumberDiscount2 = parseInt(config.bulk_discount_2_numbers_percent || '5', 10)
    const bulkNumberDiscount3 = parseInt(config.bulk_discount_3plus_numbers_percent || '10', 10)

    const agentDiscountPercent = totalAgentsQty === 2 ? bulkAgentDiscount2 : (totalAgentsQty >= 3 ? bulkAgentDiscount3 : 0)
    const numberDiscountPercent = totalNumbersQty === 2 ? bulkNumberDiscount2 : (totalNumbersQty >= 3 ? bulkNumberDiscount3 : 0)

    // Process items and add up subtotal/discount
    const detailsList: any[] = []

    for (const item of items) {
      if (item.type === 'subscription') {
        let tierKey = item.key.toLowerCase()
        if (tierKey.includes('professional') || tierKey.includes('pro')) {
          tierKey = 'professional'
        } else if (tierKey.includes('starter')) {
          tierKey = 'starter'
        } else if (tierKey.includes('trial')) {
          tierKey = 'trial'
        }

        const itemPrice = subscriptionPrices[tierKey] || subscriptionPrices[item.key] || 0
        const itemSubtotal = itemPrice * item.quantity
        const itemDiscount = Math.round(itemSubtotal * (agentDiscountPercent / 100))
        
        subtotal += itemSubtotal
        discount += itemDiscount
        detailsList.push({
          item: `Subscription Upgrade: ${item.key}`,
          rate: itemPrice,
          quantity: item.quantity,
          amount: itemSubtotal - itemDiscount,
          discount_applied: itemDiscount
        })
      } else if (item.type === 'phone_number') {
        const itemSubtotal = numberPrice * item.quantity
        const itemDiscount = Math.round(itemSubtotal * (numberDiscountPercent / 100))
        
        subtotal += itemSubtotal
        discount += itemDiscount
        detailsList.push({
          item: 'Virtual Phone Number provisioning',
          rate: numberPrice,
          quantity: item.quantity,
          amount: itemSubtotal - itemDiscount,
          discount_applied: itemDiscount
        })
      } else if (item.type === 'bundle') {
        const bundle = bundleMap[item.key]
        if (!bundle) {
          return NextResponse.json({ error: `Bundle ${item.key} is not available.` }, { status: 400 })
        }
        const itemSubtotal = bundle.bundle_price_paisa * item.quantity
        subtotal += itemSubtotal
        detailsList.push({
          item: `Bundle Offer: ${bundle.name}`,
          rate: bundle.bundle_price_paisa,
          quantity: item.quantity,
          amount: itemSubtotal,
          discount_applied: 0
        })
      }
    }

    const quantityDiscountedSubtotal = subtotal - discount
    let couponDiscountPaisa = 0
    let validatedCouponCode: string | null = null

    if (coupon_code && typeof coupon_code === 'string' && coupon_code.trim()) {
      const couponRes = await validateCoupon(adminClient, coupon_code.trim(), quantityDiscountedSubtotal / 100, user.id)
      if (couponRes.isValid) {
        couponDiscountPaisa = couponRes.discountAmountPaisa
        validatedCouponCode = couponRes.coupon!.code
      } else {
        return NextResponse.json({ error: couponRes.error || 'Invalid coupon code' }, { status: 400 })
      }
    }

    const isPureTrial = hasTrial && items.length === 1

    // Check Onboarding & Setup Fee (enabled via admin in /admin/plans)
    const onboardingFeeEnabled = config.onboarding_fee_enabled === 'true'
    const onboardingFeePaisa = (onboardingFeeEnabled && !isPureTrial)
      ? parseInt(config.onboarding_fee_paisa || '0', 10)
      : 0

    if (onboardingFeePaisa > 0) {
      detailsList.push({
        item: 'One-Time Onboarding & Setup Fee',
        rate: onboardingFeePaisa,
        quantity: 1,
        amount: onboardingFeePaisa,
        discount_applied: 0
      })
    }

    const baseTaxable = Math.max(0, quantityDiscountedSubtotal - couponDiscountPaisa)
    const taxableSubtotal = baseTaxable + onboardingFeePaisa

    let customerStateCode = '07' // Default Delhi
    let cleanGSTIN: string | null = null

    if (customer_gstin && typeof customer_gstin === 'string' && customer_gstin.trim()) {
      const gstinVal = validateGSTIN(customer_gstin.trim())
      if (!gstinVal.isValid) {
        return NextResponse.json({ error: gstinVal.message || 'Invalid GSTIN provided' }, { status: 400 })
      }
      cleanGSTIN = customer_gstin.trim().toUpperCase()
      customerStateCode = gstinVal.stateCode || '07'
    }

    const taxBreakdown = isPureTrial
      ? {
          isInterState: false,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          totalTaxAmount: 0,
          grandTotal: taxableSubtotal
        }
      : calculateGSTBreakdown(taxableSubtotal, cleanGSTIN ? customerStateCode : null)

    const totalAmount = isPureTrial ? taxableSubtotal : taxBreakdown.grandTotal

    console.log('[CHECKOUT] isPureTrial:', isPureTrial, 'Subtotal:', subtotal, 'Taxable:', taxableSubtotal, 'Tax:', taxBreakdown.totalTaxAmount, 'Total:', totalAmount)

    const auth = btoa(`${keyId}:${keySecret}`)
    const trialMeta = (body as any).trial_metadata || {}
    const targetPlanSlug = (trialMeta.targetPlanSlug || 'starter').toLowerCase()
    const rzpPlanKey = `razorpay_${targetPlanSlug}_plan_id`
    const rzpPlanId = config[rzpPlanKey] || (targetPlanSlug === 'professional' ? (config.razorpay_pro_plan_id || process.env.RAZORPAY_PROFESSIONAL_PLAN_ID || process.env.RAZORPAY_PRO_PLAN_ID) : (config.razorpay_starter_plan_id || process.env.RAZORPAY_STARTER_PLAN_ID))
    let subscriptionId: string | null = null

    // If admin has configured Razorpay Subscription plan ID, initiate recurring mandate via /v1/subscriptions
    if (isPureTrial && rzpPlanId) {
      try {
        const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({
            plan_id: rzpPlanId,
            total_count: 12,
            quantity: 1,
            customer_notify: 1,
            start_at: Math.floor((Date.now() + 7 * 86400000) / 1000),
            notes: {
              user_id: user.id,
              is_trial_mandate: 'true',
              target_plan: targetPlanSlug,
              selected_personalities: JSON.stringify(trialMeta.selectedPersonalities || []),
              agent_count: (trialMeta.agentCount || 2).toString(),
              use_same_profile: use_same_profile ? 'true' : 'false'
            }
          })
        })
        if (subRes.ok) {
          const subData = await subRes.json()
          subscriptionId = subData.id
          console.log('[CHECKOUT] Created Razorpay Subscription Mandate:', subscriptionId)
        } else {
          const subErr = await subRes.json().catch(() => ({}))
          console.warn('[CHECKOUT] Razorpay subscriptions note (falling back to standard order):', subErr)
        }
      } catch (e) {
        console.warn('[CHECKOUT] Error calling Razorpay subscriptions API:', e)
      }
    }

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: totalAmount,
        currency: 'INR',
        receipt: `tri_cart_${user.id.substring(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: { 
          user_id: user.id, 
          cart_items: JSON.stringify(items), 
          use_same_profile: use_same_profile ? 'true' : 'false',
          coupon_code: validatedCouponCode || '',
          coupon_discount_paisa: couponDiscountPaisa.toString(),
          customer_gstin: cleanGSTIN || '',
          customer_legal_name: customer_legal_name || '',
          customer_state_code: customerStateCode,
          save_gst_to_profile: save_gst_to_profile ? 'true' : 'false',
          is_trial_mandate: isPureTrial ? 'true' : 'false',
          target_plan: targetPlanSlug,
          mandate_renewal_date: trialMeta.renewalDate || ''
        }
      })
    })

    const order = await orderRes.json()
    if (!orderRes.ok) {
      console.error('[CHECKOUT] Razorpay error:', JSON.stringify(order))
      return NextResponse.json({ 
        error: 'Failed to create payment order', 
        detail: order.error?.description || order.error || 'Unknown Razorpay error'
      }, { status: 500 })
    }

    return NextResponse.json({
      key: keyId,
      order_id: order.id,
      subscription_id: subscriptionId,
      is_subscription_mandate: Boolean(subscriptionId),
      amount: totalAmount,
      currency: 'INR',
      cart_items: items,
      use_same_profile,
      coupon_code: validatedCouponCode,
      coupon_discount_paisa: couponDiscountPaisa,
      customer_gstin: cleanGSTIN,
      customer_legal_name,
      tax_breakdown: taxBreakdown,
      user_email: user.email || '',
      user_name: user.user_metadata?.full_name || ''
    })
  } catch (error: any) {
    console.error('[CHECKOUT] FATAL ERROR:', error.message)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}