'use client'

import { useState } from 'react'
import { HeadphonesIcon, MessageCircle, Mail, Phone, ChevronDown, ChevronUp, Send, Loader2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const FAQ = [
  {
    q: 'How do I connect my phone number to the voice agent?',
    a: 'After signing up, go to Settings → Agent Settings. Under your voice agent, you can configure the phone number. Our team will provision a dedicated number for you within 24 hours of setup.',
  },
  {
    q: 'Can my AI agent speak in Hindi?',
    a: 'Yes! Trinetra AI supports Hindi, Hinglish (Hindi + English mix), and English. You can configure the preferred language in Settings → Agent Settings under your agent\'s language preferences.',
  },
  {
    q: 'What happens if my plan runs out of minutes?',
    a: 'Your agent will continue to operate. You\'ll receive an email alert at 80% usage. If you hit 100%, calls may be queued until the next billing cycle or you upgrade. We recommend upgrading before running out.',
  },
  {
    q: 'How are appointments synced to my calendar?',
    a: 'Connect Google Calendar from Settings → Integrations. Once connected, every appointment your AI books will automatically appear in your calendar with the customer\'s details and meeting link.',
  },
  {
    q: 'Is my customer data secure?',
    a: 'All data is stored in ISO 27001-certified servers in India. We comply with India\'s IT Act and DPDP Bill. Customer data is never shared with third parties. You can request a data export or deletion at any time.',
  },
  {
    q: 'Can I customize what my AI says?',
    a: 'Absolutely. Go to Settings → Agent Settings and update the System Prompt for each agent. This controls your agent\'s personality, what it says, what topics it handles, and when it escalates to a human.',
  },
]

export function SupportPageClient({ user }: { user: any }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [ticketForm, setTicketForm] = useState({ subject: '', message: '', priority: 'normal' })
  const [sending, setSending] = useState(false)

  const submitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.message) {
      toast.error('Please fill in subject and message.')
      return
    }
    setSending(true)
    try {
      // Would POST to /api/support/ticket in production
      await new Promise(res => setTimeout(res, 1200))
      toast.success('Support ticket submitted! We\'ll reply within 4 hours.')
      setTicketForm({ subject: '', message: '', priority: 'normal' })
    } catch {
      toast.error('Failed to submit. Please try WhatsApp or email instead.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <HeadphonesIcon className="w-8 h-8 text-purple-400" /> Help & Support
        </h1>
        <p className="text-gray-400 text-sm mt-1">We're here to help. Average response time: under 4 hours.</p>
      </div>

      {/* Quick contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <a
          href="https://wa.me/918047483921?text=Hi%2C+I+need+help+with+my+Trinetra+AI+dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center gap-3 p-6 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 rounded-2xl transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            📱
          </div>
          <div className="text-center">
            <p className="font-bold text-white">WhatsApp</p>
            <p className="text-xs text-white/50 mt-1">Fastest response</p>
            <p className="text-sm text-green-400 font-mono mt-2">+91 80 4748 3921</p>
          </div>
        </a>

        <a
          href="mailto:support@trinetraai.com"
          className="group flex flex-col items-center gap-3 p-6 bg-blue-500/10 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl transition-all cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            ✉️
          </div>
          <div className="text-center">
            <p className="font-bold text-white">Email Support</p>
            <p className="text-xs text-white/50 mt-1">Within 4 hours</p>
            <p className="text-sm text-blue-400 mt-2">support@trinetraai.com</p>
          </div>
        </a>

        <div className="group flex flex-col items-center gap-3 p-6 bg-purple-500/10 border border-purple-500/30 hover:border-purple-500/60 rounded-2xl transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            📞
          </div>
          <div className="text-center">
            <p className="font-bold text-white">Phone Support</p>
            <p className="text-xs text-white/50 mt-1">Mon–Sat, 9AM–7PM IST</p>
            <p className="text-sm text-purple-400 font-mono mt-2">+91 80 4748 3921</p>
          </div>
        </div>
      </div>

      {/* Submit Ticket */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-white">Submit a Support Ticket</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Subject</label>
            <input
              type="text"
              value={ticketForm.subject}
              onChange={e => setTicketForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="e.g. Voice agent not answering calls"
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Priority</label>
            <select
              value={ticketForm.priority}
              onChange={e => setTicketForm(p => ({ ...p, priority: e.target.value }))}
              className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none"
            >
              <option value="low">Low — General question</option>
              <option value="normal">Normal — Need help soon</option>
              <option value="high">High — Agent is down</option>
              <option value="urgent">Urgent — Business critical</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Describe your issue</label>
          <textarea
            value={ticketForm.message}
            onChange={e => setTicketForm(p => ({ ...p, message: e.target.value }))}
            rows={5}
            placeholder="Please describe what's happening, what you expected, and any steps to reproduce..."
            className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
          />
        </div>

        <button
          onClick={submitTicket}
          disabled={sending}
          className="flex items-center gap-2 px-8 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit Ticket
        </button>
      </div>

      {/* FAQ */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
        </div>
        <div className="divide-y divide-white/5">
          {FAQ.map((item, i) => (
            <div key={i} className="px-6">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left gap-4"
              >
                <span className="text-sm font-semibold text-white/90 group-hover:text-white">{item.q}</span>
                {openFaq === i
                  ? <ChevronUp className="w-4 h-4 text-purple-400 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-white/40 shrink-0" />
                }
              </button>
              {openFaq === i && (
                <div className="pb-5 text-sm text-white/60 leading-relaxed -mt-1">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Docs link */}
      <a
        href="https://docs.trinetraai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-5 bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/50 rounded-2xl transition-all group"
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">📚</span>
          <div>
            <p className="font-bold text-white">Documentation & Guides</p>
            <p className="text-sm text-white/50">Step-by-step setup guides, API docs, and video tutorials</p>
          </div>
        </div>
        <ExternalLink className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  )
}
