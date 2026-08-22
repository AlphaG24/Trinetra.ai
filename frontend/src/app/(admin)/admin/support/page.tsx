'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  LifeBuoy, 
  Sparkles, 
  ArrowLeft, 
  Search, 
  FolderOpen, 
  Loader2, 
  User, 
  Clock, 
  Check, 
  Send, 
  ShieldAlert, 
  AlertCircle, 
  Lock, 
  MessageSquare, 
  FileText 
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface TicketMessage {
  sender: 'client' | 'admin'
  sender_name: string
  message: string
  timestamp: string
}

interface InternalNote {
  author: string
  note: string
  timestamp: string
}

interface SupportTicket {
  id: string
  ticket_number: string
  organization_id: string
  submitted_by: string
  subject: string
  category: string
  status: string
  priority: string
  assigned_to: string | null
  messages: TicketMessage[]
  internal_notes: InternalNote[] | null
  created_at: string
  updated_at: string
}

interface AdminProfile {
  id: string
  full_name: string | null
  role: string | null
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  
  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Detail Subtabs
  const [detailTab, setDetailTab] = useState<'chat' | 'internal'>('chat')

  // Replying & Actions
  const [replyText, setReplyText] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [internalNoteText, setInternalNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)

  // System Admins (for assignment)
  const [adminsList, setAdminsList] = useState<AdminProfile[]>([])

  const fetchTickets = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/support/tickets')
      if (!res.ok) throw new Error("Failed to fetch tickets")
      const data = await res.json()
      setTickets(data || [])
    } catch (err: any) {
      toast.error("Failed to load tickets: " + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAdmins = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['admin', 'super_admin'])
      
      if (!error) {
        setAdminsList(data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchTickets()
    fetchAdmins()
  }, [])

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
      
      const subjectMatch = t.subject.toLowerCase().includes(searchQuery.toLowerCase())
      const numMatch = (t.ticket_number || '').toLowerCase().includes(searchQuery.toLowerCase())
      return subjectMatch || numMatch
    })
  }, [tickets, statusFilter, categoryFilter, searchQuery])

  // Update status, priority, or assignee
  const handleUpdateField = async (fields: { status?: string, priority?: string, assigned_to?: string | null }) => {
    if (!selectedTicket) return
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      })
      if (!res.ok) throw new Error("Failed to update ticket parameters")
      const updated = await res.json()

      // Update local state
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
      setSelectedTicket(updated)
      toast.success("Ticket updated successfully!")
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Reply message
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedTicket) return

    setIsSendingReply(true)
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText })
      })
      if (!res.ok) throw new Error("Failed to send reply")
      const updated = await res.json()

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
      setSelectedTicket(updated)
      setReplyText('')
      toast.success("Reply posted successfully!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSendingReply(false)
    }
  }

  // Submit internal note
  const handleSaveInternalNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!internalNoteText.trim() || !selectedTicket) return

    setIsSavingNote(true)
    try {
      const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_note: internalNoteText })
      })
      if (!res.ok) throw new Error("Failed to save note")
      const updated = await res.json()

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t))
      setSelectedTicket(updated)
      setInternalNoteText('')
      toast.success("Internal note added!")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSavingNote(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl animate-in fade-in duration-300 py-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2 font-display">
            <LifeBuoy className="w-6 h-6 text-violet-500" /> Support Desk Console
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Platform Helpdesk Control Center. Review customer tickets, escalate errors, and respond to organizations.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin
        </Link>
      </div>

      {/* Main Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Tickets list and Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search ticket # or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-black border border-white/5 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 shadow-inner"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-black border border-white/5 rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_client">Waiting on Client</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-black border border-white/5 rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none focus:border-violet-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="agent_issue">Agent Issue</option>
                <option value="bug_report">Bug Report</option>
                <option value="onboarding">Onboarding</option>
                <option value="feature_request">Feature Request</option>
                <option value="account">Account</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl p-8 text-center text-zinc-500 text-xs">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-zinc-700" />
                No support tickets found.
              </div>
            ) : (
              filteredTickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all ${
                    selectedTicket?.id === t.id
                      ? 'bg-violet-600/10 border-violet-500/50'
                      : 'bg-[#0f111a]/60 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-mono text-zinc-500">{t.ticket_number}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      t.status === 'open' 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : t.status === 'in_progress'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-1.5 truncate">{t.subject}</h4>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-white/5 mt-2">
                    <span className="capitalize">{t.category.replace('_', ' ')}</span>
                    <span className={`text-[9px] uppercase font-bold ${
                      t.priority === 'urgent' ? 'text-rose-400' : t.priority === 'high' ? 'text-orange-400' : 'text-zinc-500'
                    }`}>
                      {t.priority || 'medium'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Ticket Conversation Detail and Actions */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-[#0f111a]/60 border border-white/5 rounded-3xl p-6 space-y-6">
              
              {/* Detail Header / Actions Panel */}
              <div className="pb-4 border-b border-white/5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">{selectedTicket.ticket_number}</span>
                      <span className="text-[9px] font-black uppercase text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 capitalize">
                        {selectedTicket.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Select */}
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateField({ status: e.target.value })}
                      className="bg-black border border-white/5 rounded-xl px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_on_client">Waiting on Client</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* Assignment & Urgency controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Assigned To:</span>
                    <select
                      value={selectedTicket.assigned_to || ''}
                      onChange={(e) => handleUpdateField({ assigned_to: e.target.value || null })}
                      className="bg-black border border-white/5 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer flex-1"
                    >
                      <option value="">Unassigned</option>
                      {adminsList.map(admin => (
                        <option key={admin.id} value={admin.id}>{admin.full_name || 'Admin member'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500">Priority:</span>
                    <select
                      value={selectedTicket.priority || 'medium'}
                      onChange={(e) => handleUpdateField({ priority: e.target.value })}
                      className="bg-black border border-white/5 rounded-xl px-3 py-1 text-xs text-white focus:outline-none focus:border-violet-500 cursor-pointer flex-1"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subtabs for Client Chat and Internal Notes */}
              <div className="flex gap-4 border-b border-white/5 pb-2 text-xs font-bold uppercase tracking-wider">
                <button
                  onClick={() => setDetailTab('chat')}
                  className={`pb-2 border-b-2 cursor-pointer transition-all ${
                    detailTab === 'chat' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Client Chat
                  </span>
                </button>
                <button
                  onClick={() => setDetailTab('internal')}
                  className={`pb-2 border-b-2 cursor-pointer transition-all ${
                    detailTab === 'internal' ? 'border-violet-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Internal Notes
                  </span>
                </button>
              </div>

              {/* CHAT TIMELINE TAB */}
              {detailTab === 'chat' && (
                <div className="space-y-4">
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 my-4">
                    {(selectedTicket.messages || []).map((msg, i) => {
                      const isClient = msg.sender === 'client'
                      return (
                        <div 
                          key={i} 
                          className={`flex gap-3 max-w-[85%] ${
                            isClient ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isClient ? 'bg-white/5 text-zinc-300' : 'bg-violet-600/20 text-violet-400 border border-violet-500/20'
                          }`}>
                            {isClient ? 'CLI' : 'YOU'}
                          </div>
                          <div className="space-y-1">
                            <div className={`p-3 rounded-2xl text-xs leading-relaxed border ${
                              isClient 
                                ? 'bg-zinc-900 border-white/5 text-white'
                                : 'bg-violet-500/5 border-violet-500/10 text-zinc-300'
                            }`}>
                              {msg.message}
                            </div>
                            <span className="text-[8px] text-zinc-600 block px-1">
                              {msg.sender_name} • {new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <form onSubmit={handleSendReply} className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type response to send to the client..."
                      className="flex-1 bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyText.trim()}
                      className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isSendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}

              {/* INTERNAL NOTES TAB */}
              {detailTab === 'internal' && (
                <div className="space-y-4">
                  <div className="bg-amber-950/10 border border-amber-500/10 rounded-2xl p-4 flex gap-2.5 text-xs text-amber-500/95 leading-relaxed">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>Internal notes are only visible to platform support staff and administrators. Clients can never see these messages.</p>
                  </div>

                  {/* Notes List */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2 my-2">
                    {(!selectedTicket.internal_notes || selectedTicket.internal_notes.length === 0) ? (
                      <div className="p-6 text-center text-zinc-500 text-xs">
                        No internal notes added yet.
                      </div>
                    ) : (
                      selectedTicket.internal_notes.map((note, i) => (
                        <div key={i} className="p-3 bg-[#16131c] border border-white/5 rounded-xl space-y-1">
                          <div className="flex justify-between items-center text-[10px] text-zinc-500">
                            <span className="font-bold text-violet-400">{note.author}</span>
                            <span>{new Date(note.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-xs text-zinc-300 leading-relaxed font-light">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSaveInternalNote} className="flex gap-2">
                    <input
                      type="text"
                      value={internalNoteText}
                      onChange={(e) => setInternalNoteText(e.target.value)}
                      placeholder="Add private staff annotation..."
                      className="flex-1 bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={isSavingNote || !internalNoteText.trim()}
                      className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Note'}
                    </button>
                  </form>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-[#0f111a]/40 border border-dashed border-white/5 rounded-3xl p-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center min-h-[480px]">
              <AlertCircle className="w-10 h-10 text-zinc-700 mb-2 animate-bounce" />
              Select a support ticket from the list to view conversations and take actions.
            </div>
          )}
        </div>

      </div>

    </div>
  )
}
