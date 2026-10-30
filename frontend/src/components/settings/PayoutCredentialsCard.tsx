'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard,
  QrCode,
  Link as LinkIcon,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PayoutCredentials {
  id?: string
  upi_id?: string | null
  payment_link_url?: string | null
  qr_code_url?: string | null
  bank_name?: string | null
  account_number_masked?: string | null
  ifsc_code?: string | null
  beneficiary_name?: string | null
  is_active: boolean
  consent_attested: boolean
  attested_at?: string | null
}

export function PayoutCredentialsCard() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)

  // Form State
  const [upiId, setUpiId] = useState('')
  const [paymentLinkUrl, setPaymentLinkUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountNumberMasked, setAccountNumberMasked] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [beneficiaryName, setBeneficiaryName] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [consentAttested, setConsentAttested] = useState(false)
  const [lastAttestedAt, setLastAttestedAt] = useState<string | null>(null)

  const fetchCredentials = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/kyc/payout')
      if (!res.ok) throw new Error('Failed to load payout credentials')
      const data = await res.json()
      if (data.credentials) {
        const c = data.credentials
        setUpiId(c.upi_id || '')
        setPaymentLinkUrl(c.payment_link_url || '')
        setQrCodeUrl(c.qr_code_url || '')
        setBankName(c.bank_name || '')
        setAccountNumberMasked(c.account_number_masked || '')
        setIfscCode(c.ifsc_code || '')
        setBeneficiaryName(c.beneficiary_name || '')
        setIsActive(Boolean(c.is_active))
        setConsentAttested(Boolean(c.consent_attested))
        setLastAttestedAt(c.attested_at || null)
      }
    } catch (err: any) {
      console.warn('[PayoutCredentialsCard] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCredentials()
  }, [])

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Only PNG, JPG, or WEBP images are allowed.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('QR code image must be under 5MB.')
      return
    }

    setUploadingQr(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/kyc/payout/upload-qr', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to upload QR code')
      }

      const data = await res.json()
      setQrCodeUrl(data.qr_code_url)
      toast.success('UPI QR Code uploaded successfully!')
    } catch (err: any) {
      toast.error(err.message || 'QR upload failed')
    } finally {
      setUploadingQr(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isActive && !consentAttested) {
      toast.error('You must affirmatively certify ownership of these payment credentials.')
      return
    }

    if (isActive && !upiId.trim() && !paymentLinkUrl.trim() && !qrCodeUrl.trim() && !bankName.trim()) {
      toast.error('Please configure at least one payment method (UPI ID, Link, QR, or Bank) before enabling dispatches.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/kyc/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: upiId.trim(),
          payment_link_url: paymentLinkUrl.trim(),
          qr_code_url: qrCodeUrl.trim(),
          bank_name: bankName.trim(),
          account_number: accountNumber.trim() || undefined,
          ifsc_code: ifscCode.trim(),
          beneficiary_name: beneficiaryName.trim(),
          is_active: isActive,
          consent_attested: consentAttested
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to save payout credentials')
      }

      const data = await res.json()
      toast.success('Direct Settlement Credentials saved successfully!')
      if (data.credentials) {
        setAccountNumberMasked(data.credentials.account_number_masked || '')
        setAccountNumber('')
        setLastAttestedAt(data.credentials.attested_at || null)
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving payout credentials')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
        <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
        Loading payout & settlement credentials...
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 md:p-8 space-y-6 shadow-xs text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </span>
            <h3 className="text-base font-bold font-montserrat text-zinc-900 dark:text-white uppercase tracking-wider">
              Direct Payout & In-Call Settlement Credentials
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-merriweather">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">100% Non-Custodial:</span> Payments made by your callers settle directly into your business bank account or UPI ID. Vaakriti never holds or pools your money.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
          </label>
          <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            {isActive ? 'In-Call Dispatches Active' : 'Dispatches Disabled'}
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* 1. UPI ID / VPA */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold font-montserrat text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              Business UPI ID / VPA
            </label>
            <input
              type="text"
              value={upiId}
              onChange={e => setUpiId(e.target.value)}
              placeholder="e.g. purviroadlines@okaxis or merchant@upi"
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Dispatched via WhatsApp/SMS to callers asking to pay via Google Pay, PhonePe, or Paytm.
            </p>
          </div>

          {/* 2. Razorpay / Custom Payment Link */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold font-montserrat text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
              Direct Payment Link (Razorpay / Stripe)
            </label>
            <input
              type="url"
              value={paymentLinkUrl}
              onChange={e => setPaymentLinkUrl(e.target.value)}
              placeholder="https://rzp.io/l/your-business-advance"
              className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all"
            />
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
              Must start with <span className="font-mono text-zinc-600 dark:text-zinc-300">https://</span>. Callers can click to pay via Credit Card, NetBanking, or UPI.
            </p>
          </div>

        </div>

        {/* 3. Static UPI QR Code Upload */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold font-montserrat text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-emerald-500" />
            Static Business UPI QR Code
          </label>
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50/50 dark:bg-zinc-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {qrCodeUrl ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shrink-0 bg-white p-1">
                  <img src={qrCodeUrl} alt="UPI QR Preview" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <QrCode className="w-8 h-8" />
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">
                  {qrCodeUrl ? 'UPI QR Code Configured' : 'Upload your Shop / Company QR Code'}
                </p>
                <p className="text-[10px] text-zinc-400">
                  Sent as an image directly to callers on WhatsApp for scan-and-pay transactions.
                </p>
                {qrCodeUrl && (
                  <a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:underline pt-1"
                  >
                    View uploaded QR <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <div>
              <input
                type="file"
                id="payout-qr-upload"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleQrUpload}
                disabled={uploadingQr}
                className="hidden"
              />
              <label
                htmlFor="payout-qr-upload"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-xs font-bold rounded-xl cursor-pointer transition-all inline-flex items-center gap-2 shadow-xs"
              >
                {uploadingQr ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> {qrCodeUrl ? 'Replace QR Image' : 'Upload QR Image'}
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* 4. Optional Bank Details for Wire Transfers */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50/40 dark:bg-zinc-800/20 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider font-montserrat">
            <Landmark className="w-4 h-4 text-amber-500" />
            <span>Optional: Corporate Bank Details (For High-Value B2B RTGS / NEFT)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Beneficiary Name
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={e => setBeneficiaryName(e.target.value)}
                placeholder="Account Holder Legal Name"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-sans rounded-lg p-2.5 text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI, ICICI"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-sans rounded-lg p-2.5 text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={e => setIfscCode(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono uppercase rounded-lg p-2.5 text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Account Number {accountNumberMasked && <span className="text-emerald-500 lowercase">({accountNumberMasked})</span>}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                placeholder={accountNumberMasked || 'Enter account number'}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-xs font-mono rounded-lg p-2.5 text-zinc-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Affirmative Statutory Consent */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAttested}
              onChange={e => setConsentAttested(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 dark:border-white/20 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
              I affirmatively confirm and certify that these payment credentials belong to our verified legal entity. I authorize Vaakriti AI to dispatch this payment link, UPI ID, or QR code to callers upon their verbal request or transaction agreement during calls. <span className="text-zinc-400 font-mono">[CONFIRM WITH A LAWYER]</span>
            </span>
          </label>
          {lastAttestedAt && (
            <p className="text-[10px] text-zinc-400 mt-1 pl-6">
              Last attested on: {new Date(lastAttestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving Credentials...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Save Payout Credentials
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

