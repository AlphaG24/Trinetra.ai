import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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
    const { items, use_same_profile } = body as { items: CartItem[], use_same_profile?: boolean }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    
    // Load config values
    const { data: configs } = await adminClient.from('system_config').select('config_key, config_value')
    const config: Record<string, string> = {}
    configs?.forEach(c => { config[c.config_key] = c.config_value })

    const keyId = config.razorpay_test_key_id || config.razorpay_key_id
    const keySecret = config.razorpay_test_key_secret || config.razorpay_key_secret

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
        const itemPrice = subscriptionPrices[item.key] || 0
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

    const discountedSubtotal = subtotal - discount
    
    // Add 18% GST (9% CGST + 9% SGST)
    const taxAmount = Math.round(discountedSubtotal * 0.18)
    const totalAmount = discountedSubtotal + taxAmount

    console.log('[CHECKOUT] Subtotal:', subtotal, 'Discount:', discount, 'Tax (18%):', taxAmount, 'Total:', totalAmount)

    const auth = btoa(`${keyId}:${keySecret}`)
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
          use_same_profile: use_same_profile ? 'true' : 'false'
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
      amount: totalAmount,
      currency: 'INR',
      cart_items: items,
      use_same_profile,
      user_email: user.email || '',
      user_name: user.user_metadata?.full_name || ''
    })
  } catch (error: any) {
    console.error('[CHECKOUT] FATAL ERROR:', error.message)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}