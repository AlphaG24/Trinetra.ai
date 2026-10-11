'use client'

import { useState } from 'react'
import {
  Tag,
  RefreshCw,
  Check,
  X,
  Building2,
  Receipt,
  HelpCircle,
  Percent,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { validateGSTIN, INDIAN_GST_STATES, SUPPLIER_STATE_CODE } from '@/lib/gst'

export interface PublicOffer {
  id: string
  code: string
  title: string
  description?: string
  discount_type: 'percentage' | 'flat'
  discount_value: number
  max_discount_inr?: number | null
  min_order_inr: number
  expires_at?: string | null
}

export interface AppliedCouponInfo {
  code: string
  title?: string
  discountRupees: number
  discountPaisa: number
  discount_type?: 'percentage' | 'flat'
  discount_value?: number
}

interface CheckoutPromoAndGSTSectionProps {
  subtotalRupees: number
  appliedCoupon: AppliedCouponInfo | null
  onApplyCoupon: (code: string) => Promise<boolean>
  onRemoveCoupon: () => void
  isClaimingGst: boolean
  onToggleClaimGst: (val: boolean) => void
  gstin: string
  onGstinChange: (val: string) => void
  legalName: string
  onLegalNameChange: (val: string) => void
  saveGstToProfile: boolean
  onToggleSaveGst: (val: boolean) => void
}

export default function CheckoutPromoAndGSTSection({
  subtotalRupees,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  isClaimingGst,
  onToggleClaimGst,
  gstin,
  onGstinChange,
  legalName,
  onLegalNameChange,
  saveGstToProfile,
  onToggleSaveGst
}: CheckoutPromoAndGSTSectionProps) {
  // Coupon manual input
  const [manualCode, setManualCode] = useState('')
  const [applyingCode, setApplyingCode] = useState(false)

  // GST Auto-Verification state
  const [isVerifyingGst, setIsVerifyingGst] = useState(false)
  const [verifiedGstData, setVerifiedGstData] = useState<any>(null)

  // Today's Offers Drawer
  const [showOffers, setShowOffers] = useState(false)
  const [loadingOffers, setLoadingOffers] = useState(false)
  const [publicOffers, setPublicOffers] = useState<PublicOffer[]>([])
  const [hasFetchedOffers, setHasFetchedOffers] = useState(false)

  // Fetch / Refresh Today's Offers
  const handleCheckTodaysOffer = async () => {
    try {
      setLoadingOffers(true)
      setShowOffers(true)
      const res = await fetch('/api/billing/coupons/public-offers')
      if (!res.ok) throw new Error('Failed to load today\'s offers')
      const data = await res.json()
      setPublicOffers(data.offers || [])
      setHasFetchedOffers(true)
      if (!data.offers || data.offers.length === 0) {
        toast.info('No public promotional offers active right now. You can enter a private promo code if you have one.')
      } else {
        toast.success(`Found ${data.offers.length} active offer${data.offers.length > 1 ? 's' : ''}!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error loading offers')
    } finally {
      setLoadingOffers(false)
    }
  }

  const handleManualApply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!manualCode.trim()) {
      toast.error('Please enter a coupon code')
      return
    }

    try {
      setApplyingCode(true)
      const success = await onApplyCoupon(manualCode.trim().toUpperCase())
      if (success) {
        setManualCode('')
      }
    } finally {
      setApplyingCode(false)
    }
  }

  // Automated GST Government Taxpayer Verification & Name Fetch
  const handleGstinInputChange = async (val: string) => {
    const cleanVal = val.toUpperCase().replace(/[^0-9A-Z]/g, '')
    onGstinChange(cleanVal)

    if (cleanVal.length === 15) {
      try {
        setIsVerifyingGst(true)
        const res = await fetch('/api/billing/gst/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gstin: cleanVal })
        })
        const data = await res.json()
        if (res.ok && data.valid && data.legal_name) {
          onLegalNameChange(data.legal_name)
          setVerifiedGstData(data)
          toast.success(`Taxpayer Verified: ${data.legal_name}`)
        } else {
          setVerifiedGstData(null)
          if (data.error) toast.error(data.error)
        }
      } catch (err) {
        console.warn('GST verification lookup failed:', err)
      } finally {
        setIsVerifyingGst(false)
      }
    } else {
      setVerifiedGstData(null)
    }
  }

  // GST Live Validation
  const gstinClean = gstin.trim().toUpperCase()
  const gstinValidation = gstinClean ? validateGSTIN(gstinClean) : null
  const isInterState = gstinValidation?.stateCode && gstinValidation.stateCode !== SUPPLIER_STATE_CODE

  return (
    <div className="space-y-6">
      {/* 1. COUPON CODE & TODAY'S OFFERS SECTION */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-zinc-900 dark:text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--heading)] font-display">
              Promo Code & Discounts
            </h3>
          </div>

          {/* "Check today's Offer" Refresh-style Button (CRITICAL USER SPEC) */}
          <button
            type="button"
            onClick={handleCheckTodaysOffer}
            disabled={loadingOffers}
            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all cursor-pointer self-start sm:self-auto active:scale-95 disabled:opacity-50"
          >
            <span>Check today's Offer</span>
            <RefreshCw className={`w-3 h-3 text-amber-600 dark:text-amber-400 transition-transform duration-500 ${loadingOffers ? 'animate-spin' : 'group-hover:rotate-180'}`} />
          </button>
        </div>

        {/* Applied Coupon Banner */}
        {appliedCoupon ? (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    {appliedCoupon.code}
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                    Applied
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  You saved <strong className="font-mono">₹{appliedCoupon.discountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> on this order!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onRemoveCoupon}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 hover:underline font-bold px-2 py-1 rounded transition cursor-pointer shrink-0"
            >
              Remove
            </button>
          </div>
        ) : (
          /* Manual Promo Input */
          <form onSubmit={handleManualApply} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Enter coupon code (e.g. WELCOME10)"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={applyingCode || !manualCode.trim()}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-40 active:scale-95 shrink-0"
            >
              {applyingCode ? 'Checking...' : 'Apply'}
            </button>
          </form>
        )}

        {/* Revealed Today's Offers Drawer */}
        {showOffers && (
          <div className="pt-2 border-t border-[var(--border)]/60 space-y-2.5 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <span>Today's Available Offers:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowOffers(false)}
                className="text-[11px] text-[var(--muted)] hover:text-[var(--heading)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Hide</span>
                <ChevronUp className="w-3 h-3" />
              </button>
            </div>

            {loadingOffers ? (
              <div className="py-4 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Checking promotional servers...</span>
              </div>
            ) : publicOffers.length === 0 ? (
              <div className="p-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-center text-xs text-[var(--muted)]">
                No active public offers right now. Check back soon!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {publicOffers.map((offer) => {
                  const isCurrentApplied = appliedCoupon?.code === offer.code
                  const isMinOrderMet = subtotalRupees >= (offer.min_order_inr || 0)

                  return (
                    <div
                      key={offer.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isCurrentApplied
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-[var(--background)] border-[var(--border)] hover:border-zinc-400 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[var(--heading)] tracking-wider">
                            {offer.code}
                          </span>
                          <span className="text-xs font-bold text-[var(--heading)]">
                            {offer.discount_type === 'percentage'
                              ? `${offer.discount_value}% OFF`
                              : `₹${offer.discount_value} FLAT OFF`}
                          </span>
                        </div>
                        {offer.description && (
                          <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                            {offer.description}
                          </p>
                        )}
                        {offer.min_order_inr > 0 && (
                          <span className="text-[10px] text-zinc-500 block font-mono">
                            Min. cart subtotal: ₹{offer.min_order_inr.toLocaleString('en-IN')}
                            {!isMinOrderMet && (
                              <span className="text-amber-500 font-semibold ml-1">(Add items to unlock)</span>
                            )}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isCurrentApplied || !isMinOrderMet}
                        onClick={() => onApplyCoupon(offer.code)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                          isCurrentApplied
                            ? 'bg-emerald-600 text-white cursor-default'
                            : isMinOrderMet
                            ? 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 active:scale-95 shadow-sm'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                        }`}
                      >
                        {isCurrentApplied ? 'Applied' : 'Apply Offer'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. ENTERPRISE GST NUMBER & ITC CLAIM SECTION */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        {/* Toggle Checkbox */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="claimGstCheckbox"
            checked={isClaimingGst}
            onChange={(e) => onToggleClaimGst(e.target.checked)}
            className="w-4 h-4 rounded border-[var(--border)] accent-zinc-900 dark:accent-white text-zinc-900 dark:text-white focus:ring-zinc-900 dark:focus:ring-white bg-[var(--background)] mt-0.5 cursor-pointer"
          />
          <div className="flex-1">
            <label htmlFor="claimGstCheckbox" className="text-xs font-bold text-[var(--heading)] flex items-center gap-2 cursor-pointer select-none">
              <Building2 className="w-3.5 h-3.5 text-zinc-900 dark:text-white" />
              <span>Claim GST Input Tax Credit (ITC)</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                B2B Invoice
              </span>
            </label>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              Have a registered business GSTIN? Enter it to get a tax invoice and claim 18% GST Input Tax Credit.
            </p>
          </div>
        </div>

        {/* Expanded GST Form */}
        {isClaimingGst && (
          <div className="pt-3 border-t border-[var(--border)]/70 space-y-3.5 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* GSTIN Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[var(--heading)] uppercase tracking-wider">
                    Company GSTIN (15 Chars) <span className="text-red-500">*</span>
                  </label>
                  {isVerifyingGst && (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-mono">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Verifying...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  value={gstin}
                  onChange={(e) => handleGstinInputChange(e.target.value)}
                  className={`w-full bg-[var(--background)] border rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none transition-colors ${
                    gstinClean.length === 15
                      ? gstinValidation?.isValid
                        ? 'border-emerald-500 focus:border-emerald-500'
                        : 'border-red-500 focus:border-red-500'
                      : 'border-[var(--border)] focus:border-zinc-900 dark:focus:border-white'
                  }`}
                />
              </div>

              {/* Legal Entity Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-[var(--heading)] uppercase tracking-wider">
                    Registered Legal Entity
                  </label>
                  {verifiedGstData ? (
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Auto-Fetched
                    </span>
                  ) : null}
                </div>
                <input
                  type="text"
                  placeholder={isVerifyingGst ? "Fetching government taxpayer name..." : "e.g. Acme Technologies Private Limited"}
                  value={legalName}
                  onChange={(e) => onLegalNameChange(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs font-semibold text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-colors"
                />
                {verifiedGstData?.entity_type && (
                  <span className="text-[10px] text-[var(--muted)] mt-1 block">
                    Entity: {verifiedGstData.entity_type} • Status: {verifiedGstData.status}
                  </span>
                )}
              </div>
            </div>

            {/* Live State Detection Feedback */}
            {gstinClean.length >= 2 && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                gstinValidation?.isValid
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                  : gstinClean.length === 15
                  ? 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}>
                <div className="flex items-center gap-2">
                  {gstinValidation?.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div>
                    {gstinValidation?.isValid ? (
                      <div>
                        <span className="font-bold">Detected State: {gstinValidation.state} ({gstinValidation.stateCode})</span>
                        <span className="text-[10px] block opacity-80">
                          {isInterState
                            ? 'Inter-State Supply: 18% Integrated GST (IGST) applicable'
                            : 'Intra-State Supply (Delhi): 9% CGST + 9% SGST applicable'}
                        </span>
                      </div>
                    ) : (
                      <span>{gstinValidation?.message || `State prefix: ${INDIAN_GST_STATES[gstinClean.substring(0, 2)] || 'Enter valid 15-digit GSTIN'}`}</span>
                    )}
                  </div>
                </div>

                {gstinValidation?.isValid && (
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 shrink-0">
                    {isInterState ? 'IGST 18%' : 'CGST+SGST 18%'}
                  </span>
                )}
              </div>
            )}

            {/* Save to Profile Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="saveGstProfile"
                checked={saveGstToProfile}
                onChange={(e) => onToggleSaveGst(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[var(--border)] accent-zinc-900 dark:accent-white text-zinc-900 dark:text-white cursor-pointer"
              />
              <label htmlFor="saveGstProfile" className="text-[11px] text-[var(--muted)] cursor-pointer select-none">
                Save this GSTIN & business details to my account profile for future billing
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
