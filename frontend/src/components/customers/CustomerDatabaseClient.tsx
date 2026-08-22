'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Users, Search, Plus, Upload, Trash2, Edit3, Filter, 
  Phone, Mail, Briefcase, Tag, ChevronRight, X, Loader2, 
  CheckCircle2, AlertCircle, FileSpreadsheet, Play, Pause, Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface CustomerContact {
  id: string
  phone_number: string
  full_name: string
  email: string | null
  company: string | null
  tags: string[]
  notes: string | null
  total_calls: number
  last_contact_at: string | null
  import_source: string
  created_at: string
}

interface CallLog {
  id: string
  started_at: string
  status: string
  duration_seconds: number
  sentiment: string | null
  recording_url: string | null
  direction: string
}

export function CustomerDatabaseClient() {
  const [customers, setCustomers] = useState<CustomerContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('all')
  const [allTags, setAllTags] = useState<string[]>([])
  
  // Modal states
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<CustomerContact | null>(null)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  
  // Slide-over call history state
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<CustomerContact | null>(null)
  const [customerCalls, setCustomerCalls] = useState<CallLog[]>([])
  const [loadingCalls, setLoadingCalls] = useState(false)
  
  // Form states
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [savingForm, setSavingForm] = useState(false)
  
  // CSV states
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; error: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Audio Player states
  const [playingCallId, setPlayingCallId] = useState<string | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/customers')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      
      const list = data.customers || []
      setCustomers(list)
      
      // Aggregate tags
      const tagsSet = new Set<string>()
      list.forEach((c: CustomerContact) => {
        if (c.tags && Array.isArray(c.tags)) {
          c.tags.forEach(t => tagsSet.add(t))
        }
      })
      setAllTags(Array.from(tagsSet))
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to load customer list")
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setEditingCustomer(null)
    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormCompany('')
    setFormTags('')
    setFormNotes('')
    setIsCrudModalOpen(true)
  }

  const handleOpenEdit = (customer: CustomerContact) => {
    setEditingCustomer(customer)
    setFormName(customer.full_name || '')
    setFormPhone(customer.phone_number || '')
    setFormEmail(customer.email || '')
    setFormCompany(customer.company || '')
    setFormTags(customer.tags ? customer.tags.join(', ') : '')
    setFormNotes(customer.notes || '')
    setIsCrudModalOpen(true)
  }

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formPhone.trim()) {
      toast.error("Phone number is required")
      return
    }

    setSavingForm(true)
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers'
      const method = editingCustomer ? 'PATCH' : 'POST'
      
      const payload = {
        phone_number: formPhone,
        full_name: formName,
        email: formEmail,
        company: formCompany,
        tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
        notes: formNotes
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText)
      }

      toast.success(editingCustomer ? "Contact updated successfully" : "Contact added successfully")
      setIsCrudModalOpen(false)
      fetchCustomers()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to save contact")
    } finally {
      setSavingForm(false)
    }
  }

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this customer?")) return

    try {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      
      toast.success("Customer removed successfully")
      fetchCustomers()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to delete contact")
    }
  }

  const handleCSVUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!csvFile) return

    setCsvImporting(true)
    setImportResults(null)
    
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const text = event.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
        
        // Find header indexes
        const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('number') || h.includes('mobile'))
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('full'))
        const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail'))
        const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('firm'))
        const tagsIdx = headers.findIndex(h => h.includes('tag'))
        const notesIdx = headers.findIndex(h => h.includes('note') || h.includes('detail'))

        if (phoneIdx === -1) {
          toast.error("CSV must contain a phone column (e.g. phone, phone_number, mobile)")
          setCsvImporting(false)
          return
        }

        const contacts = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue
          
          // Simple split, handles basic commas
          const values = line.split(',')
          const rawPhone = values[phoneIdx]
          if (!rawPhone) continue

          const name = nameIdx !== -1 ? values[nameIdx] : 'Unknown'
          const email = emailIdx !== -1 ? values[emailIdx] : ''
          const company = companyIdx !== -1 ? values[companyIdx] : ''
          const rawTags = tagsIdx !== -1 ? values[tagsIdx] : ''
          const notes = notesIdx !== -1 ? values[notesIdx] : ''

          contacts.push({
            phone_number: rawPhone.replace(/[^\d+]/g, ''),
            full_name: name,
            email: email || null,
            company: company || null,
            tags: rawTags ? rawTags.split(';').map(t => t.trim()) : [], // semicolon separated tags in cell
            notes: notes || null
          })
        }

        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts })
        })

        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        
        setImportResults({ success: data.count, error: contacts.length - data.count })
        toast.success(`Successfully imported ${data.count} contacts!`)
        fetchCustomers()
      }
      reader.readAsText(csvFile)
    } catch (err: any) {
      console.error(err)
      toast.error("Import failed. Make sure the file matches the format.")
    } finally {
      setCsvImporting(false)
    }
  }

  const fetchCallHistory = async (customer: CustomerContact) => {
    setSelectedCustomerForHistory(customer)
    setLoadingCalls(true)
    setCustomerCalls([])
    
    try {
      const supabase = createClient()
      const cleanPhone = customer.phone_number.replace(/\D/g, "")
      
      // Search for matches in caller_number or agent_number
      const { data, error } = await supabase
        .from('voice_calls')
        .select('*')
        .or(`caller_number.ilike.%${cleanPhone}%,agent_number.ilike.%${cleanPhone}%`)
        .order('started_at', { ascending: false })

      if (error) throw error
      setCustomerCalls(data || [])
    } catch (err: any) {
      console.error("Error fetching call history:", err)
      toast.error("Failed to load call log history")
    } finally {
      setLoadingCalls(false)
    }
  }

  const handlePlayAudio = (callId: string, url: string) => {
    if (playingCallId === callId) {
      audio?.pause()
      setPlayingCallId(null)
      return
    }
    if (audio) {
      audio.pause()
    }
    const newAudio = new Audio(url)
    newAudio.play()
    newAudio.onended = () => setPlayingCallId(null)
    setAudio(newAudio)
    setPlayingCallId(callId)
  }

  // Filter logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone_number?.includes(searchQuery) ||
      c.company?.toLowerCase().includes(searchQuery.toLowerCase())
      
    const matchesTag = selectedTag === 'all' || c.tags?.includes(selectedTag)
    
    return matchesSearch && matchesTag
  })

  // Aggregates
  const totalCalls = customers.reduce((acc, c) => acc + (c.total_calls || 0), 0)
  const averageCalls = customers.length ? (totalCalls / customers.length).toFixed(1) : 0

  return (
    <div className="p-6 space-y-6 text-left max-w-[1600px] mx-auto min-h-screen">
      
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-[var(--heading)] flex items-center gap-3">
            <Users className="w-8 h-8 text-violet-400" /> Customer Database
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1 font-sans">
            Centralized directory for caller personalization, tags management, and outbound campaigns.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setCsvFile(null)
              setImportResults(null)
              setIsCsvModalOpen(true)
            }}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] hover:bg-[var(--hover-bg)] text-xs font-montserrat font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Bulk Import CSV
          </button>
          
          <button 
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] border border-[var(--border)] hover:bg-[var(--hover-bg)] text-xs font-montserrat font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-violet-500/10 rounded-xl text-violet-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--heading)]">{customers.length}</div>
            <div className="text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">Total Contacts</div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--heading)]">{totalCalls}</div>
            <div className="text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">Calls Logged</div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--heading)]">{averageCalls}</div>
            <div className="text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">Avg Calls/Cust</div>
          </div>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-pink-500/10 rounded-xl text-pink-400">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-[var(--heading)]">{allTags.length}</div>
            <div className="text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--muted)]">Unique Tags</div>
          </div>
        </div>
      </div>

      {/* Directory Filter / Search Section */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
            <input 
              type="text" 
              placeholder="Search by name, phone, company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl pl-11 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans"
            />
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-[var(--muted)]" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-montserrat font-bold uppercase tracking-wider cursor-pointer"
            >
              <option value="all">Filter By Tag: All</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Customer Directory Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--muted)]">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <span className="text-xs uppercase font-bold tracking-wider font-montserrat">Loading directories...</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted)] text-center">
            <Users className="w-12 h-12 text-[var(--muted)]/50 mb-3" />
            <p className="font-semibold text-sm">No customers found</p>
            <p className="text-xs mt-1">Try modifying your filters or import contacts to begin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--background)] border-b border-[var(--border)] text-[10px] font-bold uppercase font-montserrat tracking-wider text-[var(--muted)]">
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone / Email</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Tags</th>
                  <th className="px-6 py-4">Total Calls</th>
                  <th className="px-6 py-4">Last Contact</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-xs font-sans">
                {filteredCustomers.map(customer => (
                  <tr 
                    key={customer.id} 
                    className="hover:bg-[var(--hover-bg)]/20 transition-all cursor-pointer group"
                    onClick={() => fetchCallHistory(customer)}
                  >
                    <td className="px-6 py-4 font-semibold text-[var(--heading)]">
                      {customer.full_name}
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      <div className="font-mono text-xs">{customer.phone_number}</div>
                      {customer.email && <div className="text-[10px] text-[var(--muted)]">{customer.email}</div>}
                    </td>
                    <td className="px-6 py-4 text-[var(--body)]">
                      {customer.company || <span className="text-[var(--muted)]/55">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags && customer.tags.length > 0 ? (
                          customer.tags.map(t => (
                            <span 
                              key={t}
                              className="text-[9px] uppercase font-bold font-montserrat tracking-wider px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-[var(--muted)]">No tags</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[var(--heading)]">
                      {customer.total_calls}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted)]">
                      {customer.last_contact_at ? new Date(customer.last_contact_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handleOpenEdit(customer)}
                          className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-violet-400 transition-all cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteContact(customer.id)}
                          className="p-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-[var(--muted)] group-hover:translate-x-1 transition-all" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Call History Side Panel */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 overflow-hidden text-left">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCustomerForHistory(null)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[var(--card-bg)] border-l border-[var(--border)] shadow-2xl flex flex-col">
              
              {/* Header */}
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold font-display text-[var(--heading)]">
                    {selectedCustomerForHistory.full_name}
                  </h3>
                  <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
                    {selectedCustomerForHistory.phone_number}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedCustomerForHistory(null)}
                  className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--muted)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Notes and quick details */}
                <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Customer Profile Notes
                  </h4>
                  {selectedCustomerForHistory.notes ? (
                    <p className="text-xs text-[var(--body)] font-sans whitespace-pre-line leading-relaxed">
                      {selectedCustomerForHistory.notes}
                    </p>
                  ) : (
                    <p className="text-xs text-[var(--muted)] font-sans italic">No profile notes added yet.</p>
                  )}

                  {selectedCustomerForHistory.company && (
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)] mt-2 pt-2 border-t border-[var(--border)]/60">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Company: <strong className="text-[var(--body)]">{selectedCustomerForHistory.company}</strong></span>
                    </div>
                  )}
                  {selectedCustomerForHistory.email && (
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email: <strong className="text-[var(--body)]">{selectedCustomerForHistory.email}</strong></span>
                    </div>
                  )}
                </div>

                {/* Call History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Call History Log</h4>
                  
                  {loadingCalls ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--muted)]">Searching logs...</span>
                    </div>
                  ) : customerCalls.length === 0 ? (
                    <div className="text-center py-10 text-[var(--muted)] border border-dashed border-[var(--border)] rounded-xl">
                      <Phone className="w-8 h-8 text-[var(--muted)]/40 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No calls logged yet</p>
                      <p className="text-[10px] mt-0.5">Calls connected with this customer will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerCalls.map(call => (
                        <div 
                          key={call.id}
                          className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-3 transition-all hover:border-[var(--border)] hover:scale-[1.01]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-[var(--muted)]">
                              {new Date(call.started_at).toLocaleString()}
                            </span>
                            <span className={`text-[9px] uppercase font-bold font-montserrat px-2 py-0.5 rounded ${
                              call.status === 'completed' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {call.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[var(--body)] font-medium">
                              Duration: <strong className="font-mono">{call.duration_seconds}s</strong>
                            </span>
                            {call.sentiment && (
                              <span className="text-[10px] font-montserrat font-bold uppercase tracking-wider text-pink-400">
                                {call.sentiment} Sentiment
                              </span>
                            )}
                          </div>

                          {call.recording_url && (
                            <button
                              onClick={() => handlePlayAudio(call.id, call.recording_url!)}
                              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--primary-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-xs font-montserrat font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              {playingCallId === call.id ? (
                                <><Pause className="w-3.5 h-3.5" /> Pause Call Recording</>
                              ) : (
                                <><Play className="w-3.5 h-3.5" /> Listen Call Recording</>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Add / Edit Modal */}
      {isCrudModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCrudModalOpen(false)} />
          
          <div className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl space-y-6 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h3 className="text-lg font-bold font-display text-[var(--heading)]">
                {editingCustomer ? "Edit Customer Details" : "Add New Customer"}
              </h3>
              <button 
                onClick={() => setIsCrudModalOpen(false)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Full Name</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ketan Singh"
                  required
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Phone Number (E.164 / 10 Digits)</label>
                <input 
                  type="tel" 
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  required
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Email Address</label>
                <input 
                  type="email" 
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="e.g. ketan@trinetra.ai"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Company Name</label>
                <input 
                  type="text" 
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Trinetra Inc."
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Tags (Comma Separated)</label>
                <input 
                  type="text" 
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. VIP, Warm Lead, Outbound"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-montserrat uppercase font-bold tracking-wider"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)]">Customer Notes</label>
                <textarea 
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Enter context, past purchases, or special instructions..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCrudModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--hover-bg)] font-montserrat font-bold text-xs uppercase tracking-wider text-[var(--body)] transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {savingForm ? <Loader2 className="w-4 h-4 animate-spin" /> : editingCustomer ? 'Update Contact' : 'Create Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCsvModalOpen(false)} />
          
          <div className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 md:p-8 shadow-2xl space-y-6 text-left animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <h3 className="text-lg font-bold font-display text-[var(--heading)]">
                Bulk Import Contacts
              </h3>
              <button 
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCSVUpload} className="space-y-4">
              <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider font-montserrat text-[var(--muted)] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Required CSV Headers
                </h4>
                <p className="text-[10px] text-[var(--muted)] font-sans leading-relaxed">
                  Your CSV file must include a column named <code className="text-violet-400">phone</code> or <code className="text-violet-400">phone_number</code>. Other optional columns: <code className="text-[var(--body)]">name</code>, <code className="text-[var(--body)]">email</code>, <code className="text-[var(--body)]">company</code>, <code className="text-[var(--body)]">tags</code>, <code className="text-[var(--body)]">notes</code>.
                </p>
              </div>

              <div className="border border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:bg-[var(--hover-bg)]/20 transition-all flex flex-col items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-[var(--muted)]" />
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef}
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="sr-only"
                  id="csv-file-upload"
                />
                <label htmlFor="csv-file-upload" className="text-xs font-montserrat font-bold uppercase tracking-wider text-violet-500 hover:text-violet-600 cursor-pointer">
                  {csvFile ? csvFile.name : 'Select CSV File'}
                </label>
                <span className="text-[10px] text-[var(--muted)] font-sans">CSV spreadsheets up to 15MB</span>
              </div>

              {importResults && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Import Complete
                  </div>
                  <div className="text-[11px] text-[var(--muted)] font-mono">
                    Success: {importResults.success} | Failed: {importResults.error}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--hover-bg)] font-montserrat font-bold text-xs uppercase tracking-wider text-[var(--body)] transition-all cursor-pointer text-center"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={csvImporting || !csvFile}
                  className="flex-1 py-3.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-montserrat font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {csvImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import CSV'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
