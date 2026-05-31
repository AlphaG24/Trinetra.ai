'use client'

import { useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserClient } from '@/lib/supabase/client'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  partnerId: string
  partner: {
    full_name: string | null
    phone: string | null
    company_name: string | null
    payout_email: string | null
    email: string | null
    referral_code: string | null
  }
  effectiveRate: number
}

export default function EditProfileModal({
  isOpen,
  onClose,
  partnerId,
  partner,
  effectiveRate,
}: EditProfileModalProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const initialForm = {
    full_name: partner.full_name || '',
    phone: partner.phone || '',
    company_name: partner.company_name || '',
    payout_email: partner.payout_email || '',
  }
  const [form, setForm] = useState({
    ...initialForm,
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: updateError } = await supabase
      .from('partners')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        company_name: form.company_name || null,
        payout_email: form.payout_email || null,
      })
      .eq('id', partnerId)

    if (updateError) {
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    toast.success('Profile updated')
    onClose()
    router.refresh()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/15 bg-[#100d1f] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
              Profile
            </p>
            <h3 className="text-xl font-semibold text-white">Edit Profile</h3>
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
          <Field
            label="Full Name"
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
          />
          <Field
            label="Company Name"
            name="company_name"
            value={form.company_name}
            onChange={handleChange}
          />
          <Field
            label="Payout Email"
            name="payout_email"
            type="email"
            value={form.payout_email}
            onChange={handleChange}
          />

          <LockedField
            label="Email"
            value={partner.email || 'Contact support to change email'}
          />
          <LockedField
            label="Referral Code"
            value={partner.referral_code || 'Cannot be changed'}
          />
          <LockedField
            label="Commission Rate"
            value={`${effectiveRate}% - Set by Trinetra AI`}
          />

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
              Save Changes
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

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/10 bg-[#130f22] px-4 py-3">
      <span className="mb-2 flex items-center gap-2 text-sm text-white/55">
        <Lock className="h-4 w-4" />
        {label}
      </span>
      <p className="text-sm text-white/40">{value}</p>
    </div>
  )
}
