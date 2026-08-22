'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ArrowRight,
  FileText,
  Search,
  Wrench,
  Rocket,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mjgnkbay'

const SCALE_OPTIONS = [
  '1,000 – 5,000 executions/month',
  '5,000 – 10,000 executions/month',
  '10,000 – 50,000 executions/month',
  '50,000+ executions/month',
]

interface AgentOption {
  name: string
  slug: string
}

export default function ContactPage() {
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [honeypot, setHoneypot] = useState('')
  const [formData, setFormData] = useState({
    agent: '',
    scale: '',
    stack: '',
    requirements: '',
    name: '',
    email: '',
    phone: '',
    company: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Fetch available agents from platform_services
  useEffect(() => {
    async function loadAgents() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('platform_services')
          .select('name, slug')
          .eq('is_visible', true)
          .order('name')

        if (!error && data) {
          setAgents(data)
        } else {
          // Fallback agents if the DB call fails
          setAgents([
            { name: 'Anika – AI Voice Assistant', slug: 'anika' },
            { name: 'Custom AI Agent', slug: 'custom' },
          ])
        }
      } catch {
        setAgents([
          { name: 'Anika – AI Voice Assistant', slug: 'anika' },
          { name: 'Custom AI Agent', slug: 'custom' },
        ])
      }
    }
    loadAgents()
  }, [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name || formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email || !emailRegex.test(formData.email)) newErrors.email = 'Please enter a valid email.'
    if (!formData.requirements || formData.requirements.length < 10) newErrors.requirements = 'Please provide at least 10 characters describing your requirements.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (honeypot || !validateForm()) return

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const payload = {
        formType: 'Custom Agent Request',
        agent: formData.agent || 'Not specified',
        scale: formData.scale || 'Not specified',
        currentStack: formData.stack || 'Not specified',
        requirements: formData.requirements,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || 'Not provided',
        company: formData.company || 'Not provided',
      }

      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSubmitStatus('success')
        setFormData({ agent: '', scale: '', stack: '', requirements: '', name: '', email: '', phone: '', company: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch (err) {
      console.error('Form submission failed:', err)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = (field?: string) =>
    `w-full bg-[var(--background)] border ${field && errors[field] ? 'border-red-500' : 'border-[var(--border)]'} text-[var(--heading)] placeholder-[var(--muted)] text-sm font-merriweather rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/20 transition-all`

  const labelClass = 'block text-sm font-medium font-montserrat text-[var(--heading)] mb-1.5'

  // ─── SUCCESS STATE ───
  if (submitStatus === 'success') {
    return (
      <div className="space-y-6 text-left pb-12">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight">
            Request a Custom Agent
          </h1>
          <p className="text-sm text-[var(--body)] font-merriweather leading-relaxed">
            Tell us what you need and we&apos;ll build the perfect AI agent for your business.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold font-display text-[var(--heading)] mb-3">
            Request Submitted!
          </h2>
          <p className="text-sm text-[var(--body)] font-merriweather leading-relaxed mb-8 max-w-sm">
            We&apos;ll review your requirements and get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all"
            >
              Browse Marketplace
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => setSubmitStatus('idle')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--background)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all cursor-pointer"
            >
              Submit Another
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── MAIN FORM VIEW ───
  return (
    <div className="space-y-6 text-left pb-12">
      {/* Header */}
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold font-display text-[var(--heading)] tracking-tight">
          Request a Custom Agent
        </h1>
        <p className="text-sm text-[var(--body)] font-merriweather leading-relaxed">
          Tell us what you need and we&apos;ll build the perfect AI agent for your business.
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* ─── LEFT: Form Card (3/5 width) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Honeypot */}
            <input
              type="text"
              name="_honey"
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
            />

            {/* Agent Selection */}
            <div>
              <label htmlFor="agent" className={labelClass}>Agent Selection</label>
              <select
                id="agent"
                name="agent"
                value={formData.agent}
                onChange={handleChange}
                className={`${inputClass()} cursor-pointer appearance-none`}
                suppressHydrationWarning={true}
              >
                <option value="">Select an agent type...</option>
                {agents.map(a => (
                  <option key={a.slug} value={a.name}>{a.name}</option>
                ))}
                <option value="Custom / Other">Custom / Other</option>
              </select>
            </div>

            {/* Estimated Scale */}
            <div>
              <label htmlFor="scale" className={labelClass}>Estimated Monthly Execution Scale</label>
              <select
                id="scale"
                name="scale"
                value={formData.scale}
                onChange={handleChange}
                className={`${inputClass()} cursor-pointer appearance-none`}
                suppressHydrationWarning={true}
              >
                <option value="">Select estimated scale...</option>
                {SCALE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Current Stack */}
            <div>
              <label htmlFor="stack" className={labelClass}>Current Software / Data Stack</label>
              <input
                id="stack"
                type="text"
                name="stack"
                value={formData.stack}
                onChange={handleChange}
                placeholder="e.g. Salesforce, HubSpot, Custom ERP"
                className={inputClass()}
                suppressHydrationWarning={true}
              />
            </div>

            {/* Requirements */}
            <div>
              <label htmlFor="requirements" className={labelClass}>
                Custom Workflow &amp; Integration Requirements <span className="text-red-400">*</span>
              </label>
              <textarea
                id="requirements"
                name="requirements"
                rows={4}
                value={formData.requirements}
                onChange={handleChange}
                placeholder="Describe the workflows, automations, or integrations you need..."
                className={`${inputClass('requirements')} resize-none`}
                suppressHydrationWarning={true}
              />
              {errors.requirements && (
                <span className="text-xs text-red-400 font-merriweather mt-1 block">{errors.requirements}</span>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)] my-2" />

            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className={labelClass}>
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={inputClass('name')}
                  suppressHydrationWarning={true}
                />
                {errors.name && (
                  <span className="text-xs text-red-400 font-merriweather mt-1 block">{errors.name}</span>
                )}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className={inputClass('email')}
                  suppressHydrationWarning={true}
                />
                {errors.email && (
                  <span className="text-xs text-red-400 font-merriweather mt-1 block">{errors.email}</span>
                )}
              </div>
            </div>

            {/* Phone + Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className={labelClass}>Phone</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className={inputClass()}
                  suppressHydrationWarning={true}
                />
              </div>
              <div>
                <label htmlFor="company" className={labelClass}>Company</label>
                <input
                  id="company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company name"
                  className={inputClass()}
                  suppressHydrationWarning={true}
                />
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="text-sm text-red-400 font-merriweather">
                    Something went wrong. Please try again.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              suppressHydrationWarning={true}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </form>
        </motion.div>

        {/* ─── RIGHT: Info Card (2/5 width) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Schedule a Call Card */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[var(--heading)]" />
              </div>
              <div>
                <h3 className="text-base font-bold font-montserrat text-[var(--heading)]">Prefer to talk?</h3>
                <p className="text-xs text-[var(--muted)] font-merriweather">15-minute consultation call</p>
              </div>
            </div>

            <p className="text-sm text-[var(--body)] font-merriweather leading-relaxed mb-5">
              Schedule a quick call with our team to discuss your requirements and get personalized recommendations.
            </p>

            <a
              href="https://cal.com/alpha24/15min"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--secondary)] text-[var(--heading)] hover:opacity-90 border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all"
            >
              <Calendar className="w-4 h-4" />
              Schedule a Call
            </a>
          </div>

          {/* What happens next? */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8">
            <h3 className="text-base font-bold font-montserrat text-[var(--heading)] mb-5">
              What happens next?
            </h3>

            <div className="space-y-4">
              {[
                { icon: FileText, label: 'Submit the form or schedule a call', step: 1 },
                { icon: Search, label: 'We review your requirements', step: 2 },
                { icon: Wrench, label: 'We build a custom proposal', step: 3 },
                { icon: Rocket, label: 'Your custom agent goes live', step: 4 },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold font-montserrat text-[var(--heading)]">{item.step}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1.5">
                    <item.icon className="w-4 h-4 text-[var(--muted)] shrink-0" />
                    <span className="text-sm text-[var(--body)] font-merriweather">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick help */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-[var(--muted)]" />
              <div>
                <p className="text-sm font-medium font-montserrat text-[var(--heading)]">Need quick help?</p>
                <p className="text-xs text-[var(--muted)] font-merriweather mt-0.5">
                  Reach us at{' '}
                  <a href="mailto:support@trinetraedu-ai.com" className="text-[var(--heading)] underline underline-offset-2 hover:opacity-80 transition-opacity">
                    support@trinetraedu-ai.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
