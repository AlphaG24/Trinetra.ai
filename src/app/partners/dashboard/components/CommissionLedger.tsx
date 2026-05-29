'use client'

import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Search, Users } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/formatters'
import AddReferralModal from './AddReferralModal'
import EmptyState from './EmptyState'
import StatusBadge from './StatusBadge'

type FilterKey =
  | 'all'
  | 'pending'
  | 'qualified'
  | 'converted'
  | 'paid'
  | 'clawback'

type SortKey = 'date' | 'commission' | 'deal'

interface ReferralRecord {
  id: string
  referral_name: string | null
  referral_email: string | null
  referral_company: string | null
  product: string | null
  source: string | null
  deal_value: number | string | null
  commission_rate: number | string | null
  commission_amount: number | string | null
  status: string | null
  commission_status: string | null
  created_at: string | null
  invoice_number?: string | null
  notes?: string | null
  payment_date?: string | null
  payout_date?: string | null
}

interface CommissionLedgerProps {
  referrals: ReferralRecord[]
  currency: string
  partnerId: string
  commissionRate: number
  referralLink: string
  referralCode: string | null
}

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'converted', label: 'Converted' },
  { key: 'paid', label: 'Paid' },
  { key: 'clawback', label: 'Clawback' },
]

export default function CommissionLedger({
  referrals,
  currency,
  partnerId,
  commissionRate,
  referralLink,
  referralCode,
}: CommissionLedgerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [sortBy, setSortBy] = useState<SortKey>('date')
  const [search, setSearch] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    const scoped = referrals.filter((referral) => {
      const matchesFilter =
        activeFilter === 'all'
          ? true
          : activeFilter === 'paid'
            ? referral.commission_status === 'paid'
            : activeFilter === 'clawback'
              ? referral.status === 'clawback' ||
                referral.commission_status === 'clawback'
              : referral.status === activeFilter

      const haystack = `${referral.referral_name || ''} ${referral.referral_company || ''}`.toLowerCase()
      const matchesSearch =
        normalizedSearch.length === 0 || haystack.includes(normalizedSearch)

      return matchesFilter && matchesSearch
    })

    return scoped.sort((a, b) => {
      if (sortBy === 'commission') {
        return Number(b.commission_amount ?? 0) - Number(a.commission_amount ?? 0)
      }

      if (sortBy === 'deal') {
        return Number(b.deal_value ?? 0) - Number(a.deal_value ?? 0)
      }

      return (
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
      )
    })
  }, [activeFilter, referrals, search, sortBy])

  const totalCommissionShown = filtered.reduce(
    (sum, referral) => sum + Number(referral.commission_amount ?? 0),
    0
  )

  const handleCopyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink)
    toast.success('Copied to clipboard!', { duration: 2000 })
  }

  return (
    <>
      <section className="rounded-xl border border-amber-500/15 bg-[#100d1f] p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
              Referrals
            </p>
            <h2 className="text-xl font-semibold text-white">Commission Ledger</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            Add New Referral
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeFilter === filter.key
                    ? 'border-[#f5c518] bg-[#f5c518]/15 text-white'
                    : 'border-amber-500/15 text-white/55 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search referral or company"
                className="w-full rounded-xl border border-amber-500/15 bg-[#130f22] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-amber-500/40 sm:w-[260px]"
              />
            </label>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortKey)}
              className="rounded-xl border border-amber-500/15 bg-[#130f22] px-4 py-2.5 text-sm text-white outline-none transition focus:border-amber-500/40"
            >
              <option value="date">Sort by date</option>
              <option value="commission">Sort by commission</option>
              <option value="deal">Sort by deal value</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-amber-500/10 bg-[#130f22]">
            <EmptyState
              icon={Users}
              title="No referrals recorded yet."
              description="Share your referral link to start earning commission."
              actionLabel="Copy Referral Link"
              onAction={handleCopyReferralLink}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-amber-500/10">
              <table className="min-w-[1080px] w-full">
                <thead className="bg-[#130f22]">
                  <tr>
                    {[
                      'Referral',
                      'Company',
                      'Product',
                      'Source',
                      'Deal Value',
                      'Rate',
                      'Commission',
                      'Status',
                      'Payout Status',
                      'Date',
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-4 py-3 text-left text-[11px] font-normal uppercase tracking-widest text-white/45"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((referral) => {
                    const isExpanded = expandedRow === referral.id
                    const isClawback =
                      referral.status === 'clawback' ||
                      referral.commission_status === 'clawback'

                    return (
                      <Fragment key={referral.id}>
                        <tr
                          onClick={() =>
                            setExpandedRow((current) =>
                              current === referral.id ? null : referral.id
                            )
                          }
                          className={`cursor-pointer border-t border-amber-500/10 transition-colors hover:bg-[#130f22] ${
                            isClawback ? 'bg-red-500/5' : ''
                          }`}
                        >
                          <td
                            className={`px-4 py-4 ${
                              isClawback ? 'border-l-2 border-red-500' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {referral.referral_name || '-'}
                                </p>
                                <p className="text-xs text-white/45">
                                  {referral.referral_email || '-'}
                                </p>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-white/35" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-white/35" />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-white/80">
                            {referral.referral_company || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/80">
                            {referral.product || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/80">
                            {capitalize(referral.source)}
                          </td>
                          <td className="px-4 py-4 text-sm text-white">
                            {formatCurrency(Number(referral.deal_value ?? 0), currency)}
                          </td>
                          <td className="px-4 py-4 text-sm text-white">
                            {Number(referral.commission_rate ?? commissionRate)}%
                          </td>
                          <td className="px-4 py-4 text-sm text-white">
                            {formatCurrency(
                              Number(referral.commission_amount ?? 0),
                              currency
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <StatusBadge status={referral.status || 'pending'} />
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <StatusBadge
                              status={referral.commission_status || 'pending'}
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-white/80">
                            {formatDate(referral.created_at)}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="border-t border-amber-500/10 bg-[#130f22]">
                            <td colSpan={10} className="px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <DetailItem
                                  label="Invoice #"
                                  value={referral.invoice_number || '-'}
                                />
                                <DetailItem
                                  label="Payment Date"
                                  value={formatDate(referral.payment_date || null)}
                                />
                                <DetailItem
                                  label="Payout Date"
                                  value={formatDate(referral.payout_date || null)}
                                />
                                <DetailItem
                                  label="Notes"
                                  value={referral.notes || '-'}
                                />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing {filtered.length} of {referrals.length} referrals
              </p>
              <p>
                Total commission shown:{' '}
                <span className="font-medium text-white">
                  {formatCurrency(totalCommissionShown, currency)}
                </span>
              </p>
            </div>
          </>
        )}
      </section>

      <AddReferralModal
        key={`${partnerId}-${isAdding ? 'open' : 'closed'}`}
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        partnerId={partnerId}
        commissionRate={commissionRate}
        currency={currency}
        referralCode={referralCode}
      />
    </>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-amber-500/10 bg-[#100d1f] px-4 py-3">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-white/45">
        {label}
      </p>
      <p className="text-sm leading-6 text-white/80">{value}</p>
    </div>
  )
}

function capitalize(value: string | null) {
  if (!value) return '-'
  return value.charAt(0).toUpperCase() + value.slice(1)
}
