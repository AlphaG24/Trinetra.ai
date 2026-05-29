import { formatDate } from '@/lib/formatters'
import StatusBadge from './StatusBadge'

interface WelcomeStripProps {
  partner: {
    full_name: string | null
    company_name: string | null
    approved_on: string | null
    status: string | null
  }
}

export default function WelcomeStrip({ partner }: WelcomeStripProps) {
  return (
    <section className="rounded-2xl border border-amber-500/15 bg-[radial-gradient(circle_at_top_left,rgba(245,197,24,0.18),transparent_35%),#100d1f] p-6 sm:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
            Partner Dashboard
          </p>
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">
            Welcome back, {partner.full_name || 'Partner'}
          </h1>
          <p className="text-sm text-white/55">
            {(partner.company_name || 'Independent partner') +
              ' - Partner since ' +
              formatDate(partner.approved_on)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={partner.status || 'pending'} />
          <div className="rounded-full border border-amber-500/15 bg-white/5 px-4 py-2 text-sm text-white/55">
            Last active: just now
          </div>
        </div>
      </div>
    </section>
  )
}
