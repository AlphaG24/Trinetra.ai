'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Send, Loader2, Calendar, Shield, Bot, AlertTriangle, 
  HelpCircle, MessageCircle, Clock, CheckCircle2, LifeBuoy, AlertCircle, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

interface TicketMessage {
  sender: 'client' | 'admin'
  sender_name: string
  message: string
  timestamp: string
}

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
  messages: TicketMessage[]
}

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params?.id as string

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${ticketId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setTicket(null)
          return
        }
        throw new Error("Failed to load ticket details.")
      }
      const data = await res.json()
      setTicket(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!ticketId) return

    fetchTicket()

    // Real-time status and message tracking
    const supabase = createClient()
    const channel = supabase
      .channel(`ticket_${ticketId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'support_tickets', 
          filter: `id=eq.${ticketId}` 
        },
        (payload: any) => {
          if (payload.new) {
            setTicket(payload.new)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId])

  // Scroll to bottom on load/new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket?.messages])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !ticket) return

    setIsSendingReply(true)
    try {
      const res = await fetch(`/api/support/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText })
      })

      if (!res.ok) throw new Error("Failed to submit reply.")
      
      const data = await res.json()
      if (ticket) {
        setTicket({
          ...ticket,
          messages: [...(ticket.messages || []), data.message]
        })
      }
      setReplyText('')
      toast.success("Reply submitted!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSendingReply(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2.5">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        <p className="text-xs text-[var(--muted)] font-medium font-montserrat">Retrieving ticket thread...</p>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-lg font-bold font-display text-[var(--heading)]">Ticket not found</h2>
        <Link href="/dashboard/support" className="text-xs text-violet-500 font-bold hover:underline font-montserrat">
          Back to Helpdesk
        </Link>
      </div>
    )
  }

  // Get status badge colors based on rules
  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'open') {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-500/20'
    } else if (s === 'in_progress' || s === 'waiting_on_client') {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-500/20'
    } else if (s === 'resolved' || s === 'closed') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-500/20'
    }
    return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400 border border-zinc-500/20'
  }

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'open') return 'Received'
    if (s === 'in_progress') return 'In Progress'
    if (s === 'waiting_on_client') return 'Waiting on Client'
    if (s === 'resolved') return 'Resolved'
    if (s === 'closed') return 'Closed'
    return status
  }

  const getStatusMessage = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'open') return 'Your ticket has been received. Our team will review it shortly.'
    if (s === 'in_progress' || s === 'waiting_on_client') return "We're working on your request. You'll be updated soon."
    if (s === 'resolved' || s === 'closed') return 'Your request has been fulfilled! If you need anything else, create a new ticket.'
    return ''
  }

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const isStepActive = (step: 'received' | 'in_progress' | 'resolved') => {
    const s = ticket.status.toLowerCase()
    if (step === 'received') return true
    if (step === 'in_progress') {
      return s === 'in_progress' || s === 'waiting_on_client' || s === 'resolved' || s === 'closed'
    }
    if (step === 'resolved') {
      return s === 'resolved' || s === 'closed'
    }
    return false
  }

  const isResolved = ticket.status.toLowerCase() === 'resolved' || ticket.status.toLowerCase() === 'closed'

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-6 text-left text-[var(--body)]">
      {/* Back Button */}
      <div>
        <Link 
          href="/dashboard/support" 
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--muted)] hover:text-[var(--heading)] transition-colors font-montserrat"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Helpdesk
        </Link>
      </div>

      {/* Celebratory Alert */}
      {isResolved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-555/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold font-montserrat">
            🎉 Your request has been fulfilled!
          </span>
        </motion.div>
      )}

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* Left Column (60% width): Thread */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header Block */}
            <div className="pb-6 border-b border-[var(--border)] space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-[var(--muted)] font-bold">{ticket.ticket_number || 'TRI-SUP'}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--primary-bg)] text-[var(--heading)] border border-[var(--border)] font-montserrat">
                  {ticket.category.replace('_', ' ')}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-montserrat ${getStatusBadgeClass(ticket.status)}`}>
                  {getStatusLabel(ticket.status)}
                </span>
              </div>
              {isResolved && ticket.resolved_at && (
                <p className="text-[11px] font-montserrat text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  Resolved on {formatTimestamp(ticket.resolved_at)}
                </p>
              )}
              <h1 className="text-2xl font-bold text-[var(--heading)] font-display tracking-tight leading-tight">
                {ticket.subject}
              </h1>
            </div>

            {/* Status Message Info Box */}
            <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 text-xs font-merriweather leading-relaxed text-[var(--body)] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-[var(--muted)] shrink-0 mt-0.5" />
              <span>{getStatusMessage(ticket.status)}</span>
            </div>

            {/* Message Thread */}
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar min-h-[250px]">
              {(ticket.messages || []).map((msg, i) => {
                const isAdmin = msg.sender === 'admin'
                return (
                  <div 
                    key={i} 
                    className={`flex gap-3 max-w-[85%] ${
                      isAdmin ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold font-montserrat shrink-0 border ${
                      isAdmin 
                        ? 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--muted)]' 
                        : 'bg-[var(--primary-bg)] border border-[var(--border)] text-[var(--heading)]'
                    }`}>
                      {isAdmin ? 'SUP' : 'YOU'}
                    </div>
                    <div className="space-y-1">
                      <div className={`p-4 rounded-xl text-sm leading-relaxed border font-merriweather ${
                        isAdmin 
                          ? 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--body)]' 
                          : 'bg-[var(--primary-bg)] border border-[var(--border)] text-[var(--heading)]'
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[10px] text-[var(--muted)] block px-1 font-merriweather">
                        {msg.sender_name} • {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} className="flex gap-2 border-t border-[var(--border)] pt-5">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply message here..."
                rows={2}
                className="flex-grow bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-merriweather resize-none"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                suppressHydrationWarning={true}
                className="px-5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider font-montserrat transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer shadow-md"
              >
                {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (40% width): Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-8 space-y-6 shadow-sm">
            <h3 className="text-base font-bold font-montserrat text-[var(--heading)]">Ticket Timeline</h3>
            
            <div className="relative border-l border-[var(--border)] pl-6 ml-3 space-y-8">
              {/* Step 1: Received */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all bg-[var(--card-bg)] ${
                  isStepActive('received') 
                    ? 'border-emerald-500 scale-110 shadow-sm shadow-emerald-500/20' 
                    : 'border-[var(--border)]'
                }`}>
                  {isStepActive('received') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-555" />}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold font-montserrat ${
                    isStepActive('received') ? 'text-[var(--heading)]' : 'text-[var(--muted)]'
                  }`}>
                    ✅ Received
                  </h4>
                  <p className="text-xs text-[var(--muted)] font-merriweather">
                    {formatTimestamp(ticket.created_at)}
                  </p>
                </div>
              </div>

              {/* Step 2: In Progress */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all bg-[var(--card-bg)] ${
                  isStepActive('in_progress') 
                    ? 'border-blue-500 scale-110 shadow-sm shadow-blue-500/20' 
                    : 'border-[var(--border)]'
                }`}>
                  {isStepActive('in_progress') && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold font-montserrat ${
                    isStepActive('in_progress') ? 'text-[var(--heading)]' : 'text-[var(--muted)]'
                  }`}>
                    🔄 In Progress
                  </h4>
                  <p className="text-xs text-[var(--muted)] font-merriweather">
                    {isStepActive('in_progress') ? formatTimestamp(ticket.updated_at || ticket.created_at) : 'Pending review'}
                  </p>
                </div>
              </div>

              {/* Step 3: Resolved */}
              <div className="relative">
                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all bg-[var(--card-bg)] ${
                  isStepActive('resolved') 
                    ? 'border-emerald-500 scale-110 shadow-sm shadow-emerald-500/20' 
                    : 'border-[var(--border)]'
                }`}>
                  {isStepActive('resolved') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-555" />}
                </div>
                <div className="space-y-1">
                  <h4 className={`text-sm font-bold font-montserrat ${
                    isStepActive('resolved') ? 'text-[var(--heading)]' : 'text-[var(--muted)]'
                  }`}>
                    ⏳ Resolved
                  </h4>
                  <p className="text-xs text-[var(--muted)] font-merriweather">
                    {isStepActive('resolved') ? formatTimestamp(ticket.resolved_at || ticket.updated_at || ticket.created_at) : 'Pending resolution'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
