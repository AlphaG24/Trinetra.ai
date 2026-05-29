import { Linkedin, Mail } from 'lucide-react'
import CopyButton from './CopyButton'

interface ReferralLinkBarProps {
  referralCode: string | null
  referralLink: string
}

export default function ReferralLinkBar({
  referralCode,
  referralLink,
}: ReferralLinkBarProps) {
  const linkedInShare = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    referralLink
  )}`
  const emailShare = `mailto:?subject=Try Trinetra AI&body=${encodeURIComponent(
    `I've been using Trinetra AI to automate my business. Check it out here: ${referralLink}`
  )}`

  return (
    <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.4fr_auto] xl:items-center">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-white/45">
            Referral Code
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold text-white">
              {referralCode || '-'}
            </span>
            <CopyButton text={referralCode || ''} label="Copy Code" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-white/45">
            Referral Link
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-white/70">
              {referralLink}
            </span>
            <CopyButton text={referralLink} label="Copy Link" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <a
            href={linkedInShare}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/15 px-3 py-2 text-sm text-white/70 transition hover:border-amber-500/40 hover:text-white"
          >
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </a>
          <a
            href={emailShare}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/15 px-3 py-2 text-sm text-white/70 transition hover:border-amber-500/40 hover:text-white"
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      </div>
    </section>
  )
}
