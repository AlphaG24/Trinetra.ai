'use client'

import { useState } from 'react'
import { CreditCard, Download, Check, AlertTriangle, Loader2, Save } from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import toast from 'react-hot-toast'

export function BillingPageClient({ subscription, invoices, profile }: {
  subscription: any
  invoices: any[]
  profile: any
}) {
  const { stats } = useDashboardStats([])
  const [gst, setGst] = useState(profile?.gst_number || '')
  const [company, setCompany] = useState(profile?.company_name || '')
  const [savingGst, setSavingGst] = useState(false)

  const plan = subscription?.plan
  const voiceLimit = plan?.features?.voice_minutes_limit || 100
  const chatLimit = plan?.features?.chat_sessions_limit || 500

  const usageItems = [
    { label: 'Voice Calls', used: stats?.total_calls || 0, limit: voiceLimit, color: 'bg-purple-500' },
    { label: 'Chat Sessions', used: stats?.total_conversations || 0, limit: chatLimit, color: 'bg-blue-500' },
  ]

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null
  const daysLeft = renewalDate
    ? Math.ceil((renewalDate.getTime() - Date.now()) / 86400000)
    : null

  const saveGst = async () => {
    setSavingGst(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gst_number: gst, company_name: company }),
      })
      if (!res.ok) throw new Error()
      toast.success('GST details saved!')
    } catch {
      toast.error('Failed to save. Please try again.')
    } finally {
      setSavingGst(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-amber-400" /> Billing
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage your plan, invoices, and GST details</p>
      </div>

      {/* Current Plan Card */}
      <div className="relative bg-[#0f1117]/90 rounded-2xl p-6 overflow-hidden border border-amber-500/30">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">{plan?.name || 'Free Plan'}</h2>
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" /> Active
              </span>
            </div>
            <p className="text-3xl font-extrabold text-amber-500">
              ₹{(plan?.price || 0).toLocaleString('en-IN')}
              <span className="text-base font-normal text-white/50">/month</span>
            </p>
            {renewalDate && (
              <p className="text-sm text-white/50 mt-2">
                Renews on {renewalDate.toLocaleDateString('en-IN')} 
                <span className="ml-2 text-amber-500 font-medium">({daysLeft} days left)</span>
              </p>
            )}
          </div>
          <div className="flex gap-3 shrink-0">
            <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm">
              Upgrade Plan
            </button>
            <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold rounded-xl transition-colors text-sm">
              Manage
            </button>
          </div>
        </div>

        {/* Features */}
        {plan?.features && (
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(plan.features as Record<string, string>).slice(0, 6).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-sm text-white/70">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                <span className="capitalize">{key.replace(/_/g, ' ')}: <strong className="text-white">{String(val)}</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage This Month */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-5">Usage This Month</h2>
        <div className="space-y-5">
          {usageItems.map((item, i) => {
            const pct = Math.min(100, Math.round((item.used / item.limit) * 100)) || 0
            return (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">{item.label}</span>
                  <span className="text-white/50">
                    <span className="text-white font-semibold">{item.used}</span> / {item.limit}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : item.color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                {pct > 90 && (
                  <div className="flex items-center gap-1.5 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" /> Running low — consider upgrading
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Invoices</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-white/40 text-sm">
            No invoices yet
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white/50 uppercase bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">GST</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-white/80">{inv.invoice_number || `INV-${inv.id.slice(0, 8).toUpperCase()}`}</td>
                    <td className="px-6 py-4 text-white/60">{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-white font-semibold">₹{(inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-white/60">₹{(inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {inv.status || 'Paid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Download Invoice">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GST Section */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">GST Details</h2>
          <p className="text-sm text-white/50 mt-1">Add your GST number to receive GST-compliant invoices</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">GST Number</label>
            <input
              type="text"
              value={gst}
              onChange={e => setGst(e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Company Name (as per GST)</label>
            <input
              type="text"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="Your Company Pvt. Ltd."
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t border-white/5">
          <div className="text-xs text-white/40 space-y-1">
            <p>Trinetra AI GST: <span className="font-mono text-white/60">07AAAAA0000A1Z5</span></p>
            <p>SAC Code: <span className="font-mono text-white/60">998314</span></p>
          </div>
          <button
            onClick={saveGst}
            disabled={savingGst}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-xl transition-colors text-sm"
          >
            {savingGst ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save GST Details
          </button>
        </div>
      </div>
    </div>
  )
}
