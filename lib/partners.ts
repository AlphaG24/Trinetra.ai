import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/admin'

interface AuthUserInput {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

function buildReferralCode(email?: string | null) {
  const base = (email ?? 'partner')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, 'X')

  return `${base}${randomBytes(2).toString('hex').toUpperCase()}`
}

export function deriveTier(commissionRate?: number | null) {
  const rate = Number(commissionRate ?? 0)

  if (rate >= 30) return 'platinum'
  if (rate >= 25) return 'gold'
  if (rate >= 20) return 'silver'
  return 'standard'
}

export interface NormalizedPartner {
  [key: string]: unknown
  id: string
  auth_user_id: string
  user_id: string
  full_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  payout_email: string | null
  referral_code: string | null
  status: string | null
  commission_rate: number
  commission_rate_override: number | null
  currency: string
  approved_on: string | null
  tier: string
  created_at: string | null
  updated_at: string | null
}

export function normalizePartner(partner: Record<string, unknown>): NormalizedPartner {
  const commissionRate = Number(
    partner.commission_rate ?? partner.commission_rate_override ?? 20
  )

  return {
    ...partner,
    id: String(partner.id ?? ''),
    auth_user_id: String(partner.auth_user_id ?? partner.user_id ?? ''),
    user_id: String(partner.user_id ?? partner.auth_user_id ?? ''),
    full_name: (partner.full_name as string | null) ?? null,
    company_name: (partner.company_name as string | null) ?? null,
    email: (partner.email as string | null) ?? null,
    phone: (partner.phone as string | null) ?? null,
    payout_email: (partner.payout_email as string | null) ?? null,
    referral_code: (partner.referral_code as string | null) ?? null,
    status: (partner.status as string | null) ?? null,
    commission_rate: commissionRate,
    commission_rate_override:
      partner.commission_rate_override != null
        ? Number(partner.commission_rate_override)
        : null,
    currency:
      String(
        partner.currency ??
          partner.commission_currency ??
          'USD'
      ) || 'USD',
    approved_on:
      (partner.approved_on as string | null | undefined) ??
      (partner.approved_at as string | null | undefined) ??
      null,
    tier:
      (partner.tier as string | null | undefined) ??
      deriveTier(commissionRate),
    created_at: (partner.created_at as string | null) ?? null,
    updated_at: (partner.updated_at as string | null) ?? null,
  } as NormalizedPartner
}

export function normalizeReferral(referral: Record<string, unknown>) {
  const status =
    (referral.status as string | null | undefined) ??
    (referral.referral_status as string | null | undefined) ??
    'pending'

  const paidAt =
    (referral.payout_date as string | null | undefined) ??
    (referral.paid_at as string | null | undefined) ??
    null

  const commissionStatus =
    (referral.commission_status as string | null | undefined) ??
    (paidAt ? 'paid' : status === 'converted' ? 'approved' : 'pending')

  return {
    ...referral,
    id: String(referral.id ?? ''),
    referral_name:
      (referral.referral_name as string | null | undefined) ??
      (referral.referred_name as string | null | undefined) ??
      null,
    referral_email:
      (referral.referral_email as string | null | undefined) ??
      (referral.referred_email as string | null | undefined) ??
      null,
    referral_company:
      (referral.referral_company as string | null | undefined) ?? null,
    product: (referral.product as string | null | undefined) ?? null,
    source:
      (referral.source as string | null | undefined) ??
      (referral.lead_source as string | null | undefined) ??
      null,
    status,
    commission_status: commissionStatus,
    commission_rate:
      referral.commission_rate != null
        ? Number(referral.commission_rate)
        : null,
    deal_value: Number(
      referral.deal_value ?? referral.conversion_value ?? 0
    ),
    commission_amount: Number(referral.commission_amount ?? 0),
    created_at:
      (referral.created_at as string | null | undefined) ??
      (referral.referred_at as string | null | undefined) ??
      null,
    payment_date:
      (referral.payment_date as string | null | undefined) ??
      (referral.converted_at as string | null | undefined) ??
      null,
    payout_date: paidAt,
    notes: (referral.notes as string | null | undefined) ?? null,
    invoice_number:
      (referral.invoice_number as string | null | undefined) ?? null,
  }
}

export async function findOrCreatePartnerForUser(user: AuthUserInput) {
  const supabase = createAdminClient()

  const { data: existing, error: existingError } = await supabase
    .from('partners')
    .select('*')
    .or(`auth_user_id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    return normalizePartner(existing)
  }

  let lastError: string | null = null

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = buildReferralCode(user.email)
    const payload = {
      auth_user_id: user.id,
      user_id: user.id,
      email: user.email ?? null,
      full_name:
        (user.user_metadata?.full_name as string | undefined) ??
        (user.email?.split('@')[0] ?? 'Partner'),
      company_name:
        (user.user_metadata?.company_name as string | undefined) ?? null,
      referral_code: referralCode,
      status: 'active',
      commission_rate: 20,
      commission_currency: 'INR',
      currency: 'INR',
    }

    const { data: created, error: createError } = await supabase
      .from('partners')
      .insert(payload)
      .select('*')
      .single()

    if (!createError && created) {
      return normalizePartner(created)
    }

    const { data: racedPartner } = await supabase
      .from('partners')
      .select('*')
      .or(`auth_user_id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    if (racedPartner) {
      return normalizePartner(racedPartner)
    }

    lastError = createError?.message ?? 'Failed to create partner record'
  }

  throw new Error(lastError ?? 'Failed to create partner record')
}
