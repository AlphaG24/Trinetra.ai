// ==============================================================================
// Coupons & Promotions Service Layer
// Supports dual-mode persistence:
// 1. Primary: `public.coupons` and `public.coupon_redemptions` table in Supabase
// 2. Resilient Fallback: `system_config` table (config_key = 'system_coupons_vault')
// ==============================================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface Coupon {
  id: string
  code: string
  title: string
  description?: string
  discount_type: 'percentage' | 'flat'
  discount_value: number // percentage (e.g. 20) or flat Rupees (e.g. 500)
  max_discount_inr?: number | null // Max discount cap in Rupees
  min_order_inr: number // Min cart subtotal in Rupees
  is_public_offer: boolean // Show when user clicks "Check today's Offer"
  is_active: boolean
  first_purchase_only: boolean
  max_uses?: number | null
  used_count: number
  max_uses_per_user: number
  valid_from?: string
  expires_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface CouponValidationResult {
  isValid: boolean
  coupon?: Coupon
  discountAmountRupees: number
  discountAmountPaisa: number
  error?: string
}

// Zero mock data - only authentic coupons created by the admin exist
const DEFAULT_COUPONS: Coupon[] = []

const SYSTEM_CONFIG_KEY = 'system_coupons_vault'
const REDEMPTIONS_CONFIG_KEY = 'system_coupon_redemptions'

/**
 * Fetch all coupons from Supabase table or fallback vault in system_config
 */
export async function getAllCoupons(adminClient: SupabaseClient): Promise<Coupon[]> {
  try {
    // 1. Try public.coupons table if it exists
    const { data, error } = await adminClient
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch (err) {
    // Table does not exist, proceed to vault
  }

  // 2. Vault in system_config (real authentic admin-stored data)
  try {
    const { data: configRow } = await adminClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', SYSTEM_CONFIG_KEY)
      .maybeSingle()

    if (configRow?.config_value !== undefined && configRow?.config_value !== null) {
      try {
        const parsed = JSON.parse(configRow.config_value)
        if (Array.isArray(parsed)) {
          return parsed
        }
      } catch (parseErr) {
        console.error('[Coupons] Invalid JSON in system_coupons_vault:', parseErr)
      }
    }

    return []
  } catch (fallbackErr) {
    console.error('[Coupons] Failed to load from vault:', fallbackErr)
    return []
  }
}

/**
 * Save / Update a coupon in Supabase table or fallback vault
 */
export async function saveCoupon(adminClient: SupabaseClient, coupon: Partial<Coupon> & { code: string }): Promise<Coupon> {
  const normalizedCode = coupon.code.trim().toUpperCase()
  const payload = {
    ...coupon,
    code: normalizedCode,
    updated_at: new Date().toISOString()
  }

  // 1. Try public.coupons table if it exists
  try {
    if (payload.id && !payload.id.startsWith('cpn_')) {
      const { data, error } = await adminClient
        .from('coupons')
        .update(payload)
        .eq('id', payload.id)
        .select()
        .single()
      if (!error && data) return data
    } else {
      const { data, error } = await adminClient
        .from('coupons')
        .insert([payload])
        .select()
        .single()
      if (!error && data) return data
    }
  } catch (err) {
    // Table not found, proceed to vault
  }

  // 2. Fallback to system_config vault with explicit onConflict
  const coupons = await getAllCoupons(adminClient)
  let updatedList: Coupon[]
  let targetCoupon: Coupon

  if (payload.id) {
    const codeConflict = coupons.some(c => c.id !== payload.id && c.code.toUpperCase() === normalizedCode)
    if (codeConflict) {
      throw new Error(`Coupon with code ${normalizedCode} already exists`)
    }

    let found = false
    updatedList = coupons.map(c => {
      if (c.id === payload.id) {
        found = true
        targetCoupon = { ...c, ...payload } as Coupon
        return targetCoupon
      }
      return c
    })
    if (!found) {
      targetCoupon = {
        id: payload.id,
        created_at: new Date().toISOString(),
        used_count: 0,
        ...payload
      } as Coupon
      updatedList = [targetCoupon, ...coupons]
    }
  } else {
    // Check if code already exists
    const exists = coupons.some(c => c.code.toUpperCase() === normalizedCode)
    if (exists) {
      throw new Error(`Coupon with code ${normalizedCode} already exists`)
    }
    targetCoupon = {
      id: 'cpn_' + Math.random().toString(36).substring(2, 10),
      created_at: new Date().toISOString(),
      used_count: 0,
      ...payload
    } as Coupon
    updatedList = [targetCoupon, ...coupons]
  }

  const { error: upsertErr } = await adminClient.from('system_config').upsert({
    config_key: SYSTEM_CONFIG_KEY,
    config_value: JSON.stringify(updatedList),
    description: 'System Coupons Vault'
  }, { onConflict: 'config_key' })

  if (upsertErr) {
    console.error('[Coupons] Failed to save in system_config vault:', upsertErr)
    throw new Error(upsertErr.message || 'Failed to save coupon in vault')
  }

  return targetCoupon!
}

/**
 * Delete / Archive a coupon
 */
export async function deleteCoupon(adminClient: SupabaseClient, id: string): Promise<boolean> {
  const target = id.trim()
  // 1. Attempt delete from physical table
  try {
    await adminClient.from('coupons').delete().or(`id.eq.${target},code.eq.${target}`)
  } catch (e) {
    // Table might not exist
  }

  // 2. Delete from system_config vault
  const coupons = await getAllCoupons(adminClient)
  const filtered = coupons.filter(c => c.id !== target && c.code.toUpperCase() !== target.toUpperCase())

  const { error: upsertErr } = await adminClient.from('system_config').upsert({
    config_key: SYSTEM_CONFIG_KEY,
    config_value: JSON.stringify(filtered),
    description: 'System Coupons Vault'
  }, { onConflict: 'config_key' })

  if (upsertErr) {
    console.error('[Coupons] Failed to delete from system_config vault:', upsertErr)
    throw new Error(upsertErr.message || 'Failed to delete coupon from vault')
  }

  return true
}

/**
 * Get active public offers for client "Check today's Offer" drawer
 */
export async function getPublicOffers(adminClient: SupabaseClient): Promise<Coupon[]> {
  const all = await getAllCoupons(adminClient)
  const now = new Date()

  return all.filter(c => {
    if (!c.is_active || !c.is_public_offer) return false
    if (c.expires_at && new Date(c.expires_at) < now) return false
    if (c.valid_from && new Date(c.valid_from) > now) return false
    if (c.max_uses !== null && c.max_uses !== undefined && c.used_count >= c.max_uses) return false
    return true
  })
}

/**
 * Validate a coupon code against a subtotal in Rupees
 */
export async function validateCoupon(
  adminClient: SupabaseClient,
  code: string,
  subtotalRupees: number,
  userId?: string
): Promise<CouponValidationResult> {
  const cleanCode = code.trim().toUpperCase()
  const all = await getAllCoupons(adminClient)
  const coupon = all.find(c => c.code.toUpperCase() === cleanCode)

  if (!coupon) {
    return { isValid: false, discountAmountRupees: 0, discountAmountPaisa: 0, error: 'Invalid coupon code' }
  }

  if (!coupon.is_active) {
    return { isValid: false, discountAmountRupees: 0, discountAmountPaisa: 0, error: 'This coupon is no longer active' }
  }

  const now = new Date()
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { isValid: false, discountAmountRupees: 0, discountAmountPaisa: 0, error: 'This coupon is not valid yet' }
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < now) {
    return { isValid: false, discountAmountRupees: 0, discountAmountPaisa: 0, error: 'This coupon has expired' }
  }

  if (coupon.max_uses !== null && coupon.max_uses !== undefined && coupon.used_count >= coupon.max_uses) {
    return { isValid: false, discountAmountRupees: 0, discountAmountPaisa: 0, error: 'This coupon has reached its total usage limit' }
  }

  if (subtotalRupees < (coupon.min_order_inr || 0)) {
    return {
      isValid: false,
      discountAmountRupees: 0,
      discountAmountPaisa: 0,
      error: `Minimum order amount of ₹${coupon.min_order_inr.toLocaleString('en-IN')} required to use this coupon`
    }
  }

  // Calculate discount
  let discountRupees = 0
  if (coupon.discount_type === 'percentage') {
    discountRupees = Math.round((subtotalRupees * (coupon.discount_value / 100)) * 100) / 100
    if (coupon.max_discount_inr && discountRupees > coupon.max_discount_inr) {
      discountRupees = coupon.max_discount_inr
    }
  } else {
    // Flat discount
    discountRupees = Math.min(coupon.discount_value, subtotalRupees)
  }

  const discountPaisa = Math.round(discountRupees * 100)

  return {
    isValid: true,
    coupon,
    discountAmountRupees: discountRupees,
    discountAmountPaisa: discountPaisa
  }
}

/**
 * Record a coupon redemption after successful checkout
 */
export async function recordCouponRedemption(
  adminClient: SupabaseClient,
  couponCode: string,
  userId: string,
  orderId: string,
  paymentId: string,
  discountPaisa: number,
  subtotalPaisa: number
) {
  const cleanCode = couponCode.trim().toUpperCase()

  // 1. Increment used_count in coupons table if present
  try {
    const { data: cpn } = await adminClient.from('coupons').select('id, used_count').eq('code', cleanCode).maybeSingle()
    if (cpn) {
      await adminClient.from('coupons').update({ used_count: (cpn.used_count || 0) + 1 }).eq('id', cpn.id)
      await adminClient.from('coupon_redemptions').insert({
        coupon_id: cpn.id,
        coupon_code: cleanCode,
        user_id: userId,
        order_id: orderId,
        payment_id: paymentId,
        discount_amount_paisa: discountPaisa,
        cart_subtotal_paisa: subtotalPaisa
      })
      return
    }
  } catch (err) {
    // Fallback
  }

  // Fallback to system_config
  try {
    const coupons = await getAllCoupons(adminClient)
    const updatedCoupons = coupons.map(c => {
      if (c.code.toUpperCase() === cleanCode) {
        return { ...c, used_count: (c.used_count || 0) + 1 }
      }
      return c
    })
    await adminClient.from('system_config').upsert({
      config_key: SYSTEM_CONFIG_KEY,
      config_value: JSON.stringify(updatedCoupons),
      description: 'System Coupons Vault'
    }, { onConflict: 'config_key' })

    // Log redemption into redemptions vault
    const { data: redemptionsRow } = await adminClient
      .from('system_config')
      .select('config_value')
      .eq('config_key', REDEMPTIONS_CONFIG_KEY)
      .maybeSingle()

    let redemptionsList: any[] = []
    if (redemptionsRow?.config_value) {
      try { redemptionsList = JSON.parse(redemptionsRow.config_value) } catch (e) {}
    }

    redemptionsList.push({
      coupon_code: cleanCode,
      user_id: userId,
      order_id: orderId,
      payment_id: paymentId,
      discount_amount_paisa: discountPaisa,
      cart_subtotal_paisa: subtotalPaisa,
      created_at: new Date().toISOString()
    })

    await adminClient.from('system_config').upsert({
      config_key: REDEMPTIONS_CONFIG_KEY,
      config_value: JSON.stringify(redemptionsList),
      description: 'System Coupon Redemptions'
    }, { onConflict: 'config_key' })
  } catch (e) {
    console.error('[Coupons] Failed to record redemption:', e)
  }
}
