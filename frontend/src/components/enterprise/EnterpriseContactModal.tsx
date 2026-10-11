'use client'

import { useState } from 'react'
import { Building2, Mail, Phone, Server, Send, Sparkles, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface EnterpriseContactModalProps {
  isOpen: boolean
  onClose: () => void
  initialPlanSlug?: string
}

export default function EnterpriseContactModal({
  isOpen,
  onClose,
  initialPlanSlug = 'enterprise'
}: EnterpriseContactModalProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    work_email: '',
    company_name: '',
    phone_number: '',
    deployment_type: 'cloud',
    infrastructure_needs: 'Bespoke volume (10,000+ min/month), dedicated virtual numbers, custom SLA',
    message: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.work_email || !formData.company_name) {
      toast.error('Please enter your work email and company name')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/enterprise-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit inquiry')
      }

      setSuccess(true)
      toast.success('Your Enterprise inquiry has been received! Our team will reach out within 24 hours.')
    } catch (err: any) {
      toast.error(err.message || 'Error submitting request')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSuccess(false)
    setFormData({
      work_email: '',
      company_name: '',
      phone_number: '',
      deployment_type: 'cloud',
      infrastructure_needs: 'Bespoke volume (10,000+ min/month), dedicated virtual numbers, custom SLA',
      message: ''
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-[var(--background)] hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] flex items-center justify-center text-sm transition cursor-pointer border border-[var(--border)]"
        >
          ✕
        </button>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-[var(--heading)]">Enterprise Request Received</h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 max-w-md mx-auto leading-relaxed">
                Thank you! Our solutions architect will review your company's call volume requirements and reach out via email within 24 hours.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm hover:opacity-90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" /> Custom Architecture
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--heading)]">
                Connect with Enterprise Solutions
              </h2>
              <p className="text-xs text-[var(--muted)] mt-1">
                Tell us about your call center capacity, telephony infrastructure, or custom AI agent integration requirements.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                    Company Legal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="text"
                      required
                      placeholder="Acme Corp Pvt Ltd"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                    Corporate Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="email"
                      required
                      placeholder="director@acme.com"
                      value={formData.work_email}
                      onChange={(e) => setFormData({ ...formData, work_email: e.target.value })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                    Direct Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                    Deployment Mode
                  </label>
                  <select
                    value={formData.deployment_type}
                    onChange={(e) => setFormData({ ...formData, deployment_type: e.target.value })}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs text-[var(--heading)] focus:outline-none focus:border-zinc-500 transition-colors"
                  >
                    <option value="cloud">Managed Trinetra Cloud (High Availability)</option>
                    <option value="dedicated">Dedicated Private Tenant / VPC</option>
                    <option value="on_premise">On-Premises / Air-Gapped Telephony</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                  Expected Monthly Minutes & Agents
                </label>
                <input
                  type="text"
                  placeholder="e.g. 25,000 minutes/month with 10 concurrent agents"
                  value={formData.infrastructure_needs}
                  onChange={(e) => setFormData({ ...formData, infrastructure_needs: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--heading)] mb-1">
                  Specific Requirements or Questions
                </label>
                <textarea
                  rows={3}
                  placeholder="CRM integration (Salesforce/HubSpot), custom fine-tuned voice models, SLA uptime agreements..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none focus:border-zinc-500 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
                <span className="text-[10px] text-[var(--muted)]">
                  Guaranteed response within 1 business day.
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
