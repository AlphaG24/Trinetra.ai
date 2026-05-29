'use client'

import { useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/formatters'

interface AddReferralModalProps {
  isOpen: boolean
  onClose: () => void
  partnerId: string
  commissionRate: number
  currency: string
  referralCode: string | null
}

const products = [
  'AI Voice Agent',
  'AI Chat Agent',
  'AI Social Agent',
  'AI Workflow Agent',
  'Other',
]

const sources = ['direct', 'linkedin', 'email', 'website', 'event', 'other']

export default function AddReferralModal({
  isOpen,
  onClose,
  partnerId,
  commissionRate,
  currency,
  referralCode,
}: AddReferralModalProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const [form, setForm] = useState({
    referral_name: '',
    referral_email: '',
    referral_company: '',
    product: products[0],
    source: sources[0],
    deal_value: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const estimatedCommission = useMemo(() => {
    const dealValue = Number(form.deal_value || 0)
    return (dealValue * commissionRate) / 100
  }, [commissionRate, form.deal_value])

  if (!isOpen) return null

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const dealValue = Number(form.deal_value || 0)
    const { error: insertError } = await supabase.from('partner_referrals').insert({
      partner_id: partnerId,
      referred_name: form.referral_name,
      referred_email: form.referral_email || null,
      referral_code: referralCode || 'DIRECT',
      lead_source: form.source,
      referral_status: 'pending',
      conversion_value: dealValue,
      commission_amount: (dealValue * commissionRate) / 100,
      currency,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    toast.success('Referral submitted successfully')
    onClose()
    router.refresh()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-amber-500/15 bg-[#100d1f] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
              New Referral
            </p>
            <h3 className="text-xl font-semibold text-white">Add Referral</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-amber-500/15 p-2 text-white/55 transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Referral Name*"
              name="referral_name"
              value={form.referral_name}
              onChange={handleChange}
              required
            />
            <Field
              label="Referral Email"
              name="referral_email"
              type="email"
              value={form.referral_email}
              onChange={handleChange}
            />
            <Field
              label="Referral Company"
              name="referral_company"
              value={form.referral_company}
              onChange={handleChange}
            />
            <SelectField
              label="Product"
              name="product"
              value={form.product}
              onChange={handleChange}
              options={products}
            />
            <SelectField
              label="Source*"
              name="source"
              value={form.source}
              onChange={handleChange}
              options={sources}
            />
            <Field
              label="Deal Value"
              name="deal_value"
              type="number"
              min="0"
              step="0.01"
              value={form.deal_value}
              onChange={handleChange}
            />
          </div>

          <label className="block">
            <span className="mb-2 block text-sm text-white/75">Notes</span>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-xl border border-amber-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500/40"
            />
          </label>

          <div className="rounded-xl border border-amber-500/10 bg-[#130f22] px-4 py-3">
            <p className="text-sm text-white/75">
              Estimated commission:{' '}
              <span className="font-semibold text-[#f5c518]">
                {formatCurrency(estimatedCommission, currency)}
              </span>
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-amber-500/15 px-4 py-3 text-sm text-white/70 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/75">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-amber-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500/40"
      />
    </label>
  )
}

function SelectField({
  label,
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/75">{label}</span>
      <select
        {...props}
        className="w-full rounded-xl border border-amber-500/15 bg-[#130f22] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-500/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
