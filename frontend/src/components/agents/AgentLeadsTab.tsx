import { useState, useEffect } from 'react'
import { Users, Mail, Phone, Calendar, MessageSquare, Loader2, Save, FileText, Trash2, X, Building } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { LockedFeature } from './LockedFeature'
import { toast } from 'sonner'

interface Lead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  company_name: string | null
  status: string
  stage: string | null
  notes: string | null
  interest_level?: string | null
  budget_range?: string | null
  timeline?: string | null
  source?: string | null
  call_summary?: string | null
  extracted_data?: any
  created_at: string
  converted_at?: string | null
  lead_score?: number | null
  score?: number | null
}

interface AgentLeadsTabProps {
  agent: any
  unlocked: boolean
  upgradeUrl: string
}

const STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'hot', label: 'Hot' },
  { id: 'converted', label: 'Converted' },
  { id: 'lost', label: 'Lost' }
]

export function AgentLeadsTab({ agent, unlocked, upgradeUrl }: AgentLeadsTabProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [noteText, setNoteText] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)

  const supabase = createClient()
  const agentId = agent.id

  const fetchLeads = async () => {
    try {
      setLoading(true)
      // Fetch leads linked to this user/agent
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Filter leads that are processed by this agent or if agent_id isn't defined, show all leads for the user
      // (safely fallback to all user leads if agent_id column isn't mapped inside the leads rows)
      const filtered = data ? data.filter((l: any) => !l.agent_id || l.agent_id === agentId) : []
      setLeads(filtered)
    } catch (err: any) {
      console.error('Failed to fetch leads:', err)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (unlocked && agentId) {
      fetchLeads()
    }
  }, [unlocked, agentId])

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('text/plain')
    if (!leadId) return

    // Optimistic Update
    const originalLeads = [...leads]
    setLeads(prev => prev.map(l => l.id === leadId ? { 
      ...l, 
      status: targetStage,
      stage: targetStage,
      converted_at: targetStage === 'converted' ? new Date().toISOString() : l.converted_at 
    } : l))

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: targetStage }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to update status')

      toast.success(`Lead status updated to ${targetStage.toUpperCase()}`)
    } catch (err: any) {
      setLeads(originalLeads)
      toast.error('Failed to update stage: ' + err.message)
    }
  }

  const handleMoveStage = async (leadId: string, targetStage: string) => {
    const originalLeads = [...leads]
    setLeads(prev => prev.map(l => l.id === leadId ? { 
      ...l, 
      status: targetStage,
      stage: targetStage,
      converted_at: targetStage === 'converted' ? new Date().toISOString() : l.converted_at 
    } : l))

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: targetStage }),
      })

      const resData = await response.json()
      if (!response.ok) throw new Error(resData.error || 'Failed to update status')

      toast.success(`Lead moved to ${targetStage.toUpperCase()}`)
    } catch (err: any) {
      setLeads(originalLeads)
      toast.error('Failed to update stage: ' + err.message)
    }
  }

  // 1. Manual Delete handler
  const handleDeleteLead = async (leadId: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to delete lead');

      setLeads(prev => prev.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) {
        setSelectedLead(null);
      }
      toast.success("Lead deleted successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete lead");
    }
  };

  // 2. Stage Change handler
  const handleStageChange = async (leadId: string, newStage: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to update stage');

      // Update local state
      setLeads(prev => prev.map(l => {
        if (l.id === leadId) {
          const isConverted = newStage.toLowerCase() === 'converted';
          return {
            ...l,
            status: newStage,
            stage: newStage,
            converted_at: isConverted ? new Date().toISOString() : l.converted_at,
            updated_at: new Date().toISOString()
          };
        }
        return l;
      }));

      // Update selectedLead modal state if open
      setSelectedLead(prev => prev && prev.id === leadId ? {
        ...prev,
        status: newStage,
        stage: newStage,
        converted_at: newStage.toLowerCase() === 'converted' ? new Date().toISOString() : prev.converted_at,
        updated_at: new Date().toISOString()
      } : prev);

      toast.success(`Stage updated to ${newStage.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update stage");
    }
  };

  const openLeadModal = (lead: Lead) => {
    setSelectedLead(lead)
    setNoteText(lead.notes || '')
  }

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead) return

    setSavingDetails(true)
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          notes: noteText,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id)

      if (error) throw error
      
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, notes: noteText } : l))
      setSelectedLead(prev => prev ? { ...prev, notes: noteText } : null)
      toast.success('Lead notes updated successfully!')
    } catch (err: any) {
      toast.error('Failed to save details: ' + err.message)
    } finally {
      setSavingDetails(false)
    }
  }

  if (!unlocked) {
    return (
      <LockedFeature 
        title="Leads Pipeline"
        description="Track and manage prospective leads captured by your voice agent, complete with custom sales pipelines and engagement cards."
        upgradeUrl={upgradeUrl}
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      <div>
        <h2 className="text-xl font-bold font-display text-[var(--heading)] flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" /> Sales Leads Pipeline
        </h2>
        <p className="text-xs text-[var(--muted)] font-sans">
          Drag and drop lead cards across stages to organize follow-ups and conversions.
        </p>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          <p className="text-xs text-[var(--muted)]">Loading pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter(l => (l.status || 'new').toLowerCase() === stage.id)

            return (
              <div 
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-4 flex flex-col gap-3 min-w-[200px] min-h-[450px]"
              >
                {/* Column Header */}
                <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-montserrat font-bold uppercase tracking-wider text-[var(--heading)]">{stage.label}</span>
                  <span className="text-[10px] font-mono font-bold bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--muted)]">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-grow flex flex-col gap-2.5 overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => openLeadModal(lead)}
                      className="bg-[var(--background)]/40 border border-[var(--border)] hover:border-violet-500/30 rounded-xl p-3.5 hover:bg-[var(--hover-bg)]/20 transition-all cursor-pointer select-none space-y-3 relative group"
                    >
                      <div className="space-y-1 pr-6">
                        <h4 className="text-xs font-bold text-[var(--heading)] font-sans truncate">{lead.full_name || 'Anonymous Lead'}</h4>
                        {lead.company_name && <p className="text-[10px] text-[var(--muted)] truncate">{lead.company_name}</p>}
                        {lead.phone && <p className="text-[10px] font-mono text-[var(--muted)]">{lead.phone}</p>}
                      </div>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Permanently delete this lead?")) {
                            await handleDeleteLead(lead.id);
                          }
                        }}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Manual Move Helper (mobile friendly / screen readers) */}
                      <div className="flex justify-between items-center pt-2 border-t border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-[var(--muted)] font-sans uppercase">Move:</span>
                        <select
                          value={lead.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleMoveStage(lead.id, e.target.value)}
                          className="bg-[var(--card-bg)] border border-[var(--border)] rounded px-1 py-0.5 text-[8px] focus:outline-none text-[var(--heading)] font-sans cursor-pointer"
                        >
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-3xl max-w-4xl w-full flex flex-col max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-left">
            
            {/* Sticky Header */}
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-[var(--card-bg)] shrink-0">
              <div>
                <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest bg-[var(--primary-bg)] px-2 py-0.5 rounded border border-[var(--border)]">
                  Lead Profiler
                </span>
                <span className="block text-[10px] font-mono text-[var(--muted)] mt-1">Lead ID: {selectedLead.id}</span>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-2 text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 flex-grow">
              
              {/* Header Info Block */}
              <div className="border-b border-[var(--border)] pb-6">
                <h2 className="text-2xl font-bold text-[var(--heading)] font-serif tracking-tight leading-tight">
                  {selectedLead.full_name || 'Anonymous Lead'}
                </h2>
              </div>

              {/* Redesigned Two-Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                  <div className="space-y-4 bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5">
                    <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-2">Contact Details</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-[var(--body)]">
                        <Phone className="w-4 h-4 text-violet-500 shrink-0" />
                        {selectedLead.phone ? (
                          <a href={`tel:${selectedLead.phone}`} className="hover:underline text-[var(--heading)] font-mono font-semibold">{selectedLead.phone}</a>
                        ) : (
                          <span className="text-[var(--muted)] italic">Not provided</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--body)]">
                        <Mail className="w-4 h-4 text-violet-500 shrink-0" />
                        {selectedLead.email ? (
                          <a href={`mailto:${selectedLead.email}`} className="hover:underline text-[var(--heading)] font-semibold truncate">{selectedLead.email}</a>
                        ) : (
                          <span className="text-[var(--muted)] italic">Not provided</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--body)]">
                        <Building className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="truncate text-[var(--heading)] font-semibold">{selectedLead.company_name || 'Not provided'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5">
                    <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-2">Funnel Alignment</h4>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">Traffic Source:</span>
                      <span className="font-bold text-[var(--heading)] bg-[var(--hover-bg)] px-2.5 py-0.5 rounded border border-[var(--border)] text-[10px]">
                        {selectedLead.source || 'Direct'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)]">Pipeline Stage:</span>
                      <span className="font-bold text-[var(--heading)] bg-[var(--hover-bg)] px-2.5 py-0.5 rounded border border-[var(--border)] text-[10px] uppercase">
                        {selectedLead.status || 'New'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                  <div className="bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5 space-y-4">
                    <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-2">Qualification Metrics</h4>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)] font-medium">Interest Level:</span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded border ${
                        (selectedLead.interest_level || 'medium').toLowerCase() === 'hot'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : (selectedLead.interest_level || 'medium').toLowerCase() === 'high'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : (selectedLead.interest_level || 'medium').toLowerCase() === 'medium'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                      }`}>
                        {selectedLead.interest_level || 'Not specified'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)] font-medium">Budget Range:</span>
                      <span className="font-bold text-emerald-500">{selectedLead.budget_range || 'Not specified'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)] font-medium">Timeline:</span>
                      <span className="font-bold text-[var(--heading)]">{selectedLead.timeline || 'Not specified'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--muted)] font-medium">Lead Score:</span>
                      <span className="font-bold text-amber-500 font-mono">{selectedLead.lead_score || selectedLead.score || 0} / 100</span>
                    </div>
                  </div>

                  <div className="bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5 space-y-2.5">
                    <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-2 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-violet-500" /> AI Call Summary
                    </h4>
                    <p className="text-xs text-[var(--body)] leading-relaxed whitespace-pre-wrap">
                      {selectedLead.call_summary || selectedLead.notes || 'No summary available.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* EXTRACTED DATA SECTION */}
              {selectedLead.extracted_data && Object.keys(selectedLead.extracted_data).length > 0 && (
                <div className="bg-[var(--background)]/40 border border-[var(--border)] rounded-2xl p-5 space-y-2.5">
                  <h4 className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider border-b border-[var(--border)] pb-2">Extracted AI Data Attributes</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(selectedLead.extracted_data).map(([key, value]) => {
                      if (['is_lead', 'interest_level', 'budget_range', 'timeline', 'call_summary', 'full_name', 'phone', 'email', 'company_name'].includes(key)) return null;
                      return (
                        <div key={key} className="flex flex-col bg-[var(--background)]/20 border border-[var(--border)]/50 rounded-xl p-3">
                          <span className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-wider capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-[var(--heading)] font-semibold mt-1">{String(value)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notes & Updates Form */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider font-montserrat font-bold text-[var(--muted)] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-violet-400" /> Lead Interaction Notes
                </h4>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record custom follow-up status, user preferences, or details..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--heading)]/25 text-[var(--heading)] font-sans resize-none"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-6 border-t border-[var(--border)] flex items-center justify-between bg-[var(--card-bg)] shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (confirm("Permanently delete this lead?")) {
                    await handleDeleteLead(selectedLead.id);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Lead
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-5 py-2.5 rounded-xl bg-[var(--background)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--heading)] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary-bg)] text-[var(--heading)] hover:bg-[var(--hover-bg)] border border-[var(--border)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Note
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
