'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, MessageSquare, ChevronDown, Plus, Loader2, 
  LifeBuoy, FolderOpen, X, AlertTriangle, FileText, CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'

const SUPPORT_EMAIL = "support@trinetraedu-ai.com"
const WHATSAPP_NUMBER = "919452045499"

const FAQS = [
  {
    question: "How does the JIT (Just-In-Time) quota provisioning work?",
    answer: "When you launch a new agent from the marketplace, our engine automatically provisions a secure sandbox with a default allocation of free compute credits (documents, minutes, or tasks) so you can test the deployment instantly."
  },
  {
    question: "Are my documents and telemetry data secure?",
    answer: "Yes. All agents operate on isolated, multi-tenant architectures. Event telemetry and processed data are encrypted at rest and strictly partitioned by your workspace ID."
  },
  {
    question: "How do I upgrade an agent to a production tier?",
    answer: "Navigate to the marketplace product page of the specific agent and select an enterprise or pay-as-you-go tier, or submit a Custom Deployment Request for tailored integration."
  },
  {
    question: "Can I connect these autonomous agents to my existing software?",
    answer: "Absolutely. Our deployment team specializes in custom API bridges, allowing agents to seamlessly sync with your current CRM, ERP, or proprietary databases."
  }
]

interface SupportTicket {
  id: string
  ticket_number: string
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at?: string
  resolved_at?: string
}

export default function SupportPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoadingTickets, setIsLoadingTickets] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  
  // New ticket modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [message, setMessage] = useState('')
  const [isCreatingTicket, setIsCreatingTicket] = useState(false)

  // Fetch tickets
  const fetchTickets = async () => {
    setIsLoadingTickets(true)
    try {
      const res = await fetch('/api/support/tickets')
      if (!res.ok) throw new Error("Failed to fetch tickets")
      const data = await res.json()
      setTickets(data || [])
    } catch (err: any) {
      toast.error("Failed to load tickets: " + err.message)
    } finally {
      setIsLoadingTickets(false)
    }
  }

  useEffect(() => {
    fetchTickets()

    const supabase = createClient()
    const channel = supabase
      .channel(`support_tickets_list_realtime_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        fetchTickets()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index)
  }

  // Create ticket handler
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message description are required.")
      return
    }

    setIsCreatingTicket(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, priority, message })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to submit ticket")
      }

      toast.success("Support ticket created successfully!")
      
      // Reset form
      setSubject('')
      setCategory('general')
      setPriority('medium')
      setMessage('')
      setIsModalOpen(false)
      
      // Refresh list
      fetchTickets()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsCreatingTicket(false)
    }
  }

  const priorityColor = (pri: string) => {
    const p = pri.toLowerCase()
    if (p === 'urgent' || p === 'high') return 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
    if (p === 'medium') return 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
    return 'bg-zinc-100 dark:bg-white/5 border-zinc-200 dark:border-white/5 text-zinc-500'
  }

  const statusColor = (st: string) => {
    const s = st.toLowerCase()
    if (s === 'open') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-500/20'
    } else if (s === 'in_progress' || s === 'waiting_on_client') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-500/20'
    } else if (s === 'resolved' || s === 'closed') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-500/20'
    }
    return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400 border border-zinc-500/20'
  }

  const activeTickets = tickets.filter(t => 
    t.status.toLowerCase() === 'open' || 
    t.status.toLowerCase() === 'in_progress' || 
    t.status.toLowerCase() === 'waiting_on_client'
  )

  const recentlyResolvedTickets = tickets.filter(t => 
    t.status.toLowerCase() === 'resolved' || 
    t.status.toLowerCase() === 'closed'
  )

  const renderTicketsGrid = (ticketList: SupportTicket[], emptyTitle: string, emptyMessage: string) => {
    if (ticketList.length === 0) {
      return (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-12 text-center text-[var(--muted)] shadow-sm max-w-xl mx-auto space-y-3">
          <FolderOpen className="w-10 h-10 mx-auto text-[var(--muted)] animate-pulse" />
          <h3 className="text-sm font-bold text-[var(--heading)] font-display">{emptyTitle}</h3>
          <p className="text-xs text-[var(--body)] font-merriweather">{emptyMessage}</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ticketList.map((t) => (
          <div
            key={t.id}
            onClick={() => router.push(`/dashboard/support/${t.id}`)}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:bg-[var(--hover-bg)]/20 transition-all cursor-pointer flex flex-col justify-between h-[165px]"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-[var(--muted)] font-bold">{t.ticket_number || 'TRI-SUP'}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border font-montserrat ${statusColor(t.status)}`}>
                  {t.status.toLowerCase() === 'open' ? 'Received' : t.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-xs font-bold text-[var(--heading)] font-display mt-3 truncate">{t.subject}</h3>
              <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mt-1 font-montserrat">{t.category.replace('_', ' ')}</p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] mt-4">
              <div className="flex flex-col text-[8px] text-[var(--muted)] font-merriweather gap-0.5">
                <span>Created: {new Date(t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                <span>Updated: {new Date(t.updated_at || t.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border font-montserrat ${priorityColor(t.priority)}`}>
                  {t.priority}
                </span>
                <span className="text-[9px] font-bold text-violet-500 hover:text-violet-600 font-montserrat">
                  View
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 text-left text-[var(--body)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--heading)] flex items-center gap-3 font-display">
            <LifeBuoy className="w-6 h-6 text-violet-555" /> Help & Support
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Submit technical issues, search FAQs, or interact directly with platform helpdesk staff.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Support Ticket
        </button>
      </div>

      {/* Tickets List Section */}
      <div className="space-y-8">
        
        {/* Active Tickets */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] font-display">Active Tickets</h2>
          {isLoadingTickets ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-555 animate-spin" />
            </div>
          ) : (
            renderTicketsGrid(
              activeTickets, 
              "No active tickets",
              "If you encounter any API constraints, call setup delays, or invoicing queries, please submit a ticket."
            )
          )}
        </div>

        {/* Recently Resolved */}
        <div className="space-y-4 pt-6 border-t border-[var(--border)]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--muted)] font-display">Recently Resolved</h2>
          {isLoadingTickets ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-violet-555 animate-spin" />
            </div>
          ) : (
            renderTicketsGrid(
              recentlyResolvedTickets, 
              "No recently resolved tickets",
              "Tickets resolved within the last 30 days will appear here."
            )
          )}
        </div>

      </div>

      {/* Guides & direct channels section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--border)]">
        
        {/* Email Support */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between items-start space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--heading)] font-display">Direct Email Assistance</h3>
              <p className="text-[10px] text-[var(--muted)]">Guaranteed responses within 24 business hours</p>
            </div>
          </div>
          <button
            onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`, '_blank')}
            className="px-4 py-2 bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Send Support Mail
          </button>
        </div>

        {/* WhatsApp Support */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between items-start space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--heading)] font-display">Live Instant Chat</h3>
              <p className="text-[10px] text-[var(--muted)]">Reach our deployment engineers directly</p>
            </div>
          </div>
          <button
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
            className="px-4 py-2 bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Launch WhatsApp Chat
          </button>
        </div>

      </div>

      {/* Interactive FAQ */}
      <div className="space-y-4 pt-6 border-t border-[var(--border)]">
        <div>
          <h2 className="text-sm font-bold text-[var(--heading)] font-display uppercase tracking-wider">Frequently Asked Questions</h2>
          <p className="text-xs text-[var(--muted)] mt-1">Instant self-service answers for general platform concerns.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index
            return (
              <div 
                key={index} 
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs text-[var(--heading)] cursor-pointer border-none bg-transparent"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    className={`w-4 h-4 text-[var(--muted)] shrink-0 transition-transform duration-250 ${isOpen ? 'rotate-180 text-violet-555' : ''}`} 
                  />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-[var(--body)] leading-relaxed border-t border-[var(--border)] bg-[var(--background)]">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CREATE TICKET MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            
            {/* Modal Close */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[var(--heading)] font-display">Create a Helpdesk Ticket</h2>
              <p className="text-xs text-[var(--muted)]">We usually resolve developer concerns within 4 hours.</p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. API credential provisioning delay"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder-[var(--muted)] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] cursor-pointer focus:outline-none"
                  >
                    <option value="general">General Inquiry</option>
                    <option value="billing">Billing & Pricing</option>
                    <option value="agent_issue">Voice Agent Concerns</option>
                    <option value="bug_report">System Bug / Error</option>
                    <option value="onboarding">Setup / Onboarding Help</option>
                    <option value="feature_request">Feature Suggestions</option>
                    <option value="account">Account & Security</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Urgency</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] cursor-pointer focus:outline-none"
                  >
                    <option value="low">Low - General query</option>
                    <option value="medium">Medium - Normal issue</option>
                    <option value="high">High - Service degraded</option>
                    <option value="urgent">Urgent - Complete break</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Detailed Description</label>
                <textarea
                  rows={4}
                  placeholder="Provide precise telemetry data, agent IDs, or billing invoices so we can troubleshoot instantly."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder-[var(--muted)] leading-relaxed focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreatingTicket}
                  className="w-full py-3 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isCreatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Support Ticket'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}
