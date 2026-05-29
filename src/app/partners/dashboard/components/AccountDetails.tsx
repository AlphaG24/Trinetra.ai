'use client'

import { useState } from 'react'
import { PencilLine } from 'lucide-react'
import { formatDate } from '@/lib/formatters'
import CopyButton from './CopyButton'
import EditProfileModal from './EditProfileModal'
import StatusBadge from './StatusBadge'

interface AccountDetailsProps {
  partner: {
    id: string
    full_name: string | null
    company_name: string | null
    email: string | null
    phone: string | null
    payout_email: string | null
    approved_on: string | null
    tier: string | null
    status: string | null
    referral_code: string | null
    created_at: string | null
    updated_at: string | null
  }
  policy: {
    currency?: string | null
    cookie_duration_days?: number | null
  } | null
  referralLink: string
  effectiveRate: number
}

export default function AccountDetails({
  partner,
  policy,
  referralLink,
  effectiveRate,
}: AccountDetailsProps) {
  const [isEditing, setIsEditing] = useState(false)

  const items = [
    ['Full Name', partner.full_name || '-'],
    ['Company', partner.company_name || '-'],
    ['Email', partner.email || '-'],
    ['Phone', partner.phone || '-'],
    ['Payout Email', partner.payout_email || 'Not set (contact support)'],
    ['Member Since', formatDate(partner.approved_on)],
  ]

  const program = [
    ['Status', <StatusBadge key="status" status={partner.status || 'pending'} />],
    ['Currency', policy?.currency || '-'],
    [
      'Referral Code',
      <div key="code" className="flex flex-wrap items-center gap-2">
        <span>{partner.referral_code || '-'}</span>
        <CopyButton text={partner.referral_code || ''} />
      </div>,
    ],
    [
      'Referral Link',
      <div key="link" className="flex min-w-0 items-center gap-2">
        <span className="max-w-[220px] truncate text-white/70">{referralLink}</span>
        <CopyButton text={referralLink} />
      </div>,
    ],
    ['Cookie Window', `${policy?.cookie_duration_days ?? 0} days`],
    ['Created', formatDate(partner.created_at)],
    ['Last Updated', formatDate(partner.updated_at)],
  ]

  return (
    <>
      <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
              Account
            </p>
            <h2 className="text-xl font-semibold text-white">Account Details</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/15 px-3 py-2 text-sm text-white/70 transition hover:border-amber-500/40 hover:text-white"
          >
            <PencilLine className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <p className="text-sm font-semibold text-white">Partner Profile</p>
              <StatusBadge status={partner.tier || 'standard'} />
            </div>
            <div className="space-y-4">
              {items.map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-1 border-b border-amber-500/10 pb-4 last:border-b-0 last:pb-0"
                >
                  <span className="text-[11px] uppercase tracking-widest text-white/45">
                    {label}
                  </span>
                  <span className="text-sm text-white/85">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold text-white">Program Details</p>
            <div className="space-y-4">
              {program.map(([label, value]) => (
                <div
                  key={label as string}
                  className="flex flex-col gap-1 border-b border-amber-500/10 pb-4 last:border-b-0 last:pb-0"
                >
                  <span className="text-[11px] uppercase tracking-widest text-white/45">
                    {label}
                  </span>
                  <div className="text-sm text-white/85">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <EditProfileModal
        key={`${partner.id}-${partner.updated_at || 'new'}-${isEditing ? 'open' : 'closed'}`}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        partnerId={partner.id}
        partner={partner}
        effectiveRate={effectiveRate}
      />
    </>
  )
}
