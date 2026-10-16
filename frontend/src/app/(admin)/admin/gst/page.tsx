'use client'

import { useState, useEffect } from 'react'
import {
  Receipt,
  Download,
  Building2,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Globe2,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronRight,
  Landmark,
  Send,
  Mail,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface GSTSummary {
  totalTaxCollectedInr: number
  totalTaxableInr: number
  totalGrandTotalInr: number
  intraState: {
    cgstInr: number
    sgstInr: number
    totalIntraInr: number
  }
  interState: {
    igstInr: number
  }
  b2bInvoicesCount: number
  b2cInvoicesCount: number
  totalInvoices: number
  supplierGstin: string
  supplierState: string
}

interface B2BCustomer {
  legalName: string
  gstin: string
  state: string
  stateCode: string
  invoiceCount: number
  totalTaxableInr: number
  totalTaxInr: number
  lastInvoiceDate: string
  lastInvoiceNumber: string
}

interface StateDistribution {
  stateName: string
  stateCode: string
  invoiceCount: number
  taxableInr: number
  taxInr: number
}

export default function AdminGSTMonitorPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<GSTSummary | null>(null)
  const [b2bCustomers, setB2bCustomers] = useState<B2BCustomer[]>([])
  const [stateDistribution, setStateDistribution] = useState<StateDistribution[]>([])
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'customers' | 'invoices'>('customers')
  const [exporting, setExporting] = useState(false)
  const [resendModalInvoice, setResendModalInvoice] = useState<any | null>(null)
  const [resendChannel, setResendChannel] = useState<'email' | 'whatsapp' | 'both'>('email')
  const [resendEmail, setResendEmail] = useState('')
  const [resendPhone, setResendPhone] = useState('')
  const [isResending, setIsResending] = useState(false)

  const handleOpenResend = (inv: any) => {
    setResendModalInvoice(inv)
    setResendChannel('email')
    setResendEmail(inv.customer_email || '')
    setResendPhone(inv.customer_phone || '')
  }

  const handleExecuteResend = async () => {
    if (!resendModalInvoice) return
    try {
      setIsResending(true)
      const res = await fetch(`/api/admin/gst/invoices/${resendModalInvoice.id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: resendChannel,
          recipient_email: resendEmail,
          recipient_phone: resendPhone
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to re-send invoice')
      }
      const data = await res.json()
      toast.success(data.message || 'Invoice re-sent successfully! ✉️')
      setResendModalInvoice(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsResending(false)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/gst/summary')
      if (!res.ok) throw new Error('Failed to load GST data')
      const data = await res.json()
      setSummary(data.summary)
      setB2bCustomers(data.b2bCustomers || [])
      setStateDistribution(data.stateDistribution || [])
      setRecentInvoices(data.recentInvoices || [])
    } catch (err: any) {
      toast.error(err.message || 'Error loading GST monitoring data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleExportGSTR1 = async () => {
    try {
      setExporting(true)
      toast.info('Generating statutory GSTR-1 CSV report...')
      const res = await fetch('/api/admin/gst/export')
      if (!res.ok) throw new Error('Failed to export GSTR-1 report')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `GSTR-1_Report_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('GSTR-1 CSV exported successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const formatInr = (num: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num)
  }

  const filteredCustomers = b2bCustomers.filter(c =>
    c.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.state.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvoices = recentInvoices.filter(i =>
    (i.invoice_number && i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.customer_legal_name && i.customer_legal_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (i.customer_gstin && i.customer_gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            <Landmark className="w-3.5 h-3.5 text-violet-500" />
            <span>Statutory Tax & B2B Compliance</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--heading)] tracking-tight flex items-center gap-2.5">
            GST & B2B Monitor
          </h1>
          <p className="text-xs text-[var(--body)] mt-1">
            Track business customer GSTINs, intra vs inter-state tax liabilities, and statutory GSTR-1 reporting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2.5 text-[var(--muted)] hover:text-[var(--heading)] rounded-xl bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer shadow-xs"
            title="Refresh records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportGSTR1}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer shrink-0 disabled:opacity-50 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Export GSTR-1 (CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Supplier Registration Banner */}
      <div className="p-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[var(--heading)] font-bold">Supplier Entity: Vaakriti Technologies Private Limited</div>
            <div className="text-[var(--body)] font-mono text-[11px]">
              GSTIN: <span className="text-violet-600 dark:text-violet-400 font-bold">{summary?.supplierGstin || '07AAAAA0000A1Z5'}</span> | State: {summary?.supplierState || 'Delhi'} (Code 07) | SAC: 998311
            </div>
          </div>
        </div>
        <div className="text-[11px] text-[var(--muted)] font-medium sm:text-right">
          Standard 18% GST (CGST 9% + SGST 9% or IGST 18%)
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GST Collected */}
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Total GST Collected</span>
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">
            {formatInr(summary?.totalTaxCollectedInr)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            From {formatInr(summary?.totalTaxableInr)} taxable value
          </div>
        </div>

        {/* Intra-State Pool */}
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Intra-State Pool (Delhi)</span>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded">
              CGST + SGST
            </span>
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">
            {formatInr(summary?.intraState.totalIntraInr)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1 font-mono">
            CGST: {formatInr(summary?.intraState.cgstInr)} | SGST: {formatInr(summary?.intraState.sgstInr)}
          </div>
        </div>

        {/* Inter-State Pool */}
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">Inter-State Pool</span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
              IGST 18%
            </span>
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">
            {formatInr(summary?.interState.igstInr)}
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            Eligible for cross-state Input Tax Credit
          </div>
        </div>

        {/* B2B vs B2C Ratio */}
        <div className="p-5 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted)]">B2B Business Customers</span>
            <Building2 className="w-4 h-4 text-[var(--muted)]" />
          </div>
          <div className="text-2xl font-black text-[var(--heading)] mt-2 font-mono">
            {summary?.b2bInvoicesCount || 0}
            <span className="text-xs font-normal text-[var(--muted)] ml-1.5">/ {summary?.totalInvoices || 0} Invoices</span>
          </div>
          <div className="text-[11px] text-[var(--muted)] mt-1">
            {b2bCustomers.length} unique registered GSTIN entities
          </div>
        </div>
      </div>

      {/* State-by-State Tax Distribution */}
      {stateDistribution.length > 0 && (
        <div className="p-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[var(--heading)] flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-violet-500" />
              State-wise Tax Distribution (Place of Supply)
            </h3>
            <span className="text-[11px] text-[var(--muted)]">{stateDistribution.length} Active Territories</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stateDistribution.map(s => (
              <div key={s.stateCode} className="p-3.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold bg-[var(--card-bg)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--heading)]">
                      {s.stateCode}
                    </span>
                    <span className="text-xs font-semibold text-[var(--heading)]">{s.stateName}</span>
                  </div>
                  <div className="text-[11px] text-[var(--muted)] mt-1">
                     {s.invoiceCount} {s.invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatInr(s.taxInr)}</div>
                  <div className="text-[10px] text-[var(--muted)] font-mono">Taxable: {formatInr(s.taxableInr)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--card-bg)] border border-[var(--border)] p-3 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search business, GSTIN, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-[var(--heading)] text-[var(--card-bg)] shadow-xs font-bold'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            Registered B2B Customers ({b2bCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'invoices'
                ? 'bg-[var(--heading)] text-[var(--card-bg)] shadow-xs font-bold'
                : 'text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
            }`}
          >
            Tax Invoices Log ({recentInvoices.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Registered B2B Customers */}
      {activeTab === 'customers' && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="flex items-center justify-center p-16">
              <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Building2 className="w-12 h-12 text-[var(--muted)] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[var(--heading)]">No B2B Customers Found</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-sm mx-auto">
                Customers who enter a GSTIN at checkout to claim Input Tax Credit will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--muted)] bg-[var(--hover-bg)] tracking-wider">
                    <th className="py-3.5 px-4">Business Legal Name</th>
                    <th className="py-3.5 px-4">GSTIN</th>
                    <th className="py-3.5 px-4">Place of Supply</th>
                    <th className="py-3.5 px-4">Invoices</th>
                    <th className="py-3.5 px-4">Total Taxable Value</th>
                    <th className="py-3.5 px-4">Total GST Paid</th>
                    <th className="py-3.5 px-4 text-right">Last Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {filteredCustomers.map((c) => (
                    <tr key={c.gstin} className="hover:bg-[var(--hover-bg)] transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[var(--heading)]">{c.legalName}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--hover-bg)] border border-[var(--border)] text-violet-600 dark:text-violet-300">
                          {c.gstin}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[var(--body)]">{c.state}</span>
                        <span className="text-[var(--muted)] text-[10px] ml-1.5 font-mono">({c.stateCode})</span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[var(--body)]">
                        {c.invoiceCount}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[var(--heading)]">
                        {formatInr(c.totalTaxableInr)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatInr(c.totalTaxInr)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="text-[11px] font-mono text-[var(--body)]">{c.lastInvoiceNumber}</div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {new Date(c.lastInvoiceDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recent Tax Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Receipt className="w-12 h-12 text-[var(--muted)] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold text-[var(--heading)]">No Invoices Found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--muted)] bg-[var(--hover-bg)] tracking-wider">
                    <th className="py-3.5 px-4">Invoice #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Taxable</th>
                    <th className="py-3.5 px-4">CGST / SGST</th>
                    <th className="py-3.5 px-4">IGST</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-xs">
                  {filteredInvoices.map((inv) => {
                    const hasGst = inv.customer_gstin && inv.customer_gstin !== 'N/A'
                    const taxable = (inv.subtotal_paisa || inv.subscription_amount || 0) / 100
                    const cgst = (inv.cgst_amount_paisa || 0) / 100
                    const sgst = (inv.sgst_amount_paisa || 0) / 100
                    const igst = (inv.igst_amount_paisa || 0) / 100
                    const grandTotal = (inv.grand_total_paisa || inv.total_amount || 0) / 100

                    return (
                      <tr key={inv.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-xs text-[var(--heading)]">
                          {inv.invoice_number}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[var(--muted)] text-[11px]">
                          {new Date(inv.created_at).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[var(--heading)] line-clamp-1 max-w-[160px]">
                            {inv.customer_legal_name || 'Individual'}
                          </div>
                          {hasGst && (
                            <div className="font-mono text-[10px] text-violet-600 dark:text-violet-400">{inv.customer_gstin}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            hasGst
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20'
                              : 'bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)]'
                          }`}>
                            {hasGst ? 'B2B (ITC)' : 'B2C'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[var(--body)]">
                          {formatInr(taxable)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[var(--muted)]">
                          {cgst > 0 ? `${formatInr(cgst)} + ${formatInr(sgst)}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                          {igst > 0 ? formatInr(igst) : '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-[var(--heading)]">
                          {formatInr(grandTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            {inv.status || 'paid'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenResend(inv)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] hover:bg-violet-600/15 border border-[var(--border)] text-[var(--body)] hover:text-violet-600 dark:hover:text-violet-300 transition text-[11px] font-medium cursor-pointer"
                            title="Re-send invoice to WhatsApp or Email"
                          >
                            <Send className="w-3 h-3" /> Re-send
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoice Re-send Modal */}
      {resendModalInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                  <Send className="w-4 h-4 text-violet-500" />
                  Manual Invoice Re-send
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5 font-mono">
                  Invoice #{resendModalInvoice.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setResendModalInvoice(null)}
                className="text-[var(--muted)] hover:text-[var(--heading)] p-1 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--heading)] block mb-1.5">
                  Delivery Channel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['email', 'whatsapp', 'both'] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setResendChannel(ch)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                        resendChannel === ch
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                          : 'bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              {(resendChannel === 'email' || resendChannel === 'both') && (
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="customer@company.com"
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              {(resendChannel === 'whatsapp' || resendChannel === 'both') && (
                <div>
                  <label className="text-xs font-semibold text-[var(--heading)] block mb-1">
                    Recipient WhatsApp Phone
                  </label>
                  <input
                    type="text"
                    value={resendPhone}
                    onChange={(e) => setResendPhone(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-[var(--hover-bg)] border border-[var(--border)] text-xs text-[var(--muted)] space-y-1">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="font-semibold text-[var(--heading)]">{resendModalInvoice.customer_legal_name || 'Individual'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-semibold text-[var(--heading)] font-mono">
                    ₹{((resendModalInvoice.grand_total_paisa || resendModalInvoice.total_amount || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setResendModalInvoice(null)}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] hover:bg-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResending}
                onClick={handleExecuteResend}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm shadow-violet-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                {isResending ? 'Dispatching...' : 'Dispatch Re-send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
