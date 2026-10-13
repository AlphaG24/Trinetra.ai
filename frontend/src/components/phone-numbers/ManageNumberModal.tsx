"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  X, Copy, MapPin, Smartphone, Globe, CreditCard, 
  Trash2, UserPlus, AlertTriangle, Check, PhoneForwarded,
  CheckCircle2, HelpCircle, Send, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardStore } from "@/store/dashboardStore";

export interface ManageNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: {
    id: string;
    phone_number: string;
    city: string;
    did_type: string;
    provider: string;
    status: string;
    provisioned_at: string;
    retail_price_paisa?: number;
    assigned_agents: Array<{
      agent_id: string;
      agent_name: string;
      is_primary: boolean;
    }>;
    display_price?: string;
  };
  agents?: any[];
  onUpdate: () => void;
}

export function ManageNumberModal({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  agents: propAgents,
  onUpdate 
}: ManageNumberModalProps) {
  const [copied, setCopied] = useState(false);
  const [isReleaseExpanded, setIsReleaseExpanded] = useState(false);
  const [releaseConfirmText, setReleaseConfirmText] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);
  
  const { agents: storeAgents } = useDashboardStore();
  const [localAgents, setLocalAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  
  const agents = (propAgents && propAgents.length > 0)
    ? propAgents
    : localAgents.length > 0
    ? localAgents
    : (storeAgents || []);

  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignedAgentIds = phoneNumber.assigned_agents?.map(a => a.agent_id) || [];
  const unassignedAgents = (agents || [])
    .filter(a => !assignedAgentIds.includes(a.id))
    .filter(a => a.status !== 'deleted');

  const formattedPrice = (phoneNumber as any).retail_price_paisa 
    ? `₹${((phoneNumber as any).retail_price_paisa / 100).toFixed(0)}/mo` 
    : (phoneNumber.display_price || "₹299/mo");

  // Task 3.10: Call Forwarding Unconditional (CFU) Setup & Carrier Support State
  const CARRIERS = [
    { id: "jio", name: "Reliance Jio (India)", prefix: "*401*", suffix: "", deact: "*402", note: "Dial *401*<target> and wait for confirmation tone" },
    { id: "airtel", name: "Bharti Airtel (India)", prefix: "*21*", suffix: "#", deact: "##21#", note: "Dial *21*<target># and tap Call" },
    { id: "vi", name: "Vodafone Idea / Vi (India)", prefix: "*21*", suffix: "#", deact: "##21#", note: "Dial *21*<target># and tap Call" },
    { id: "bsnl", name: "BSNL (India)", prefix: "*21*", suffix: "#", deact: "##21#", note: "Dial *21*<target># and tap Call" },
    { id: "att", name: "AT&T Wireless (USA)", prefix: "*21*", suffix: "#", deact: "##21#", note: "Dial *21*<target># and press Send" },
    { id: "verizon", name: "Verizon Wireless (USA)", prefix: "*72", suffix: "", deact: "*73", note: "Dial *72 followed immediately by number, press Send" },
    { id: "tmobile", name: "T-Mobile (USA)", prefix: "**21*", suffix: "#", deact: "##21#", note: "Dial **21*<target># and press Call" },
    { id: "other", name: "Standard GSM / Global", prefix: "*21*", suffix: "#", deact: "##21#", note: "Standard GSM unconditional forwarding code" },
  ];

  const [activeTab, setActiveTab] = useState<"manage" | "cfu">("manage");
  const [selectedCarrier, setSelectedCarrier] = useState("jio");
  const [cfuCodeCopied, setCfuCodeCopied] = useState(false);
  const [showSupportTicketForm, setShowSupportTicketForm] = useState(false);
  const [sourcePhone, setSourcePhone] = useState("");
  const [ticketNotes, setTicketNotes] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const activeCarrierObj = CARRIERS.find(c => c.id === selectedCarrier) || CARRIERS[0];
  const targetCleanPhone = (phoneNumber.phone_number || "").replace(/\s+/g, "");
  const computedDialCode = `${activeCarrierObj.prefix}${targetCleanPhone}${activeCarrierObj.suffix}`;

  const handleCopyCfuCode = () => {
    navigator.clipboard.writeText(computedDialCode);
    setCfuCodeCopied(true);
    toast.success(`Copied dial code: ${computedDialCode}`);
    setTimeout(() => setCfuCodeCopied(false), 2000);
  };

  const handleCfuTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePhone.trim()) {
      toast.error("Please enter your existing mobile/business phone number");
      return;
    }
    setIsSubmittingTicket(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `CFU Setup Request: ${phoneNumber.phone_number} (${activeCarrierObj.name})`,
          category: "cfu_forwarding",
          priority: "urgent",
          message: `Customer requesting assisted Call Forwarding Unconditional (CFU) configuration.\n\n- Carrier: ${activeCarrierObj.name}\n- Existing Business Number: ${sourcePhone.trim()}\n- Forward-To Virtual Number: ${phoneNumber.phone_number}\n- Additional Notes: ${ticketNotes.trim() || "None"}\n\nSLA: Urgent (4h standard resolution).`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit support ticket");
      toast.success("Support ticket created! Telecom team will assist you within 4 hours (Urgent SLA).");
      setShowSupportTicketForm(false);
      setSourcePhone("");
      setTicketNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit ticket");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Dynamically load agents if not present in props or Zustand store
  useEffect(() => {
    if (isOpen && agents.length === 0) {
      const fetchLocalAgents = async () => {
        try {
          setLoadingAgents(true);
          const { createClient } = await import('@/utils/supabase/client');
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('organization_id')
              .eq('id', user.id)
              .single();

            if (profile?.organization_id) {
              const { data: dbAgents } = await supabase
                .from('agents')
                .select('id, name, status, is_demo, agent_type')
                .eq('organization_id', profile.organization_id)
                .neq('status', 'deleted');

              if (dbAgents) {
                setLocalAgents(dbAgents);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching local agents in ManageNumberModal:", err);
        } finally {
          setLoadingAgents(false);
        }
      };
      fetchLocalAgents();
    }
  }, [isOpen, agents.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber.phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRelease = async () => {
    if (releaseConfirmText !== "RELEASE") return;
    setIsReleasing(true);
    
    try {
      const res = await fetch(`/api/phone-numbers/${phoneNumber.id}/release`, {
        method: "POST"
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to release number");
      }
      
      toast.success("Number released successfully");
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to release number");
    } finally {
      setIsReleasing(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedAgentId) return;
    setIsAssigning(true);
    
    try {
      const res = await fetch(`/api/phone-numbers/${phoneNumber.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: selectedAgentId, is_primary: isPrimary })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign agent");
      }
      
      toast.success("Agent assigned successfully");
      setSelectedAgentId("");
      setIsPrimary(false);
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign agent");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async (agentId: string) => {
    if (!confirm("Are you sure you want to unassign this agent from this number?")) return;
    
    try {
      const res = await fetch(`/api/phone-numbers/${phoneNumber.id}/unassign`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unassign agent");
      }
      
      toast.success("Agent unassigned");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to unassign agent");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md overflow-y-auto"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-5 md:p-6 shadow-2xl my-auto max-h-[88vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 id="manage-modal-title" className="text-3xl font-bold tracking-wide text-[var(--heading)]">
                {phoneNumber.phone_number}
              </h2>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy phone number"
                className="text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1 cursor-pointer"
              >
                {copied ? <Check size={20} className="text-green-500 scale-in" /> : <Copy size={20} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${phoneNumber.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-xs text-[var(--muted)] capitalize">{phoneNumber.status}</span>
            </div>
          </div>

          {/* Tabs: Settings vs CFU Setup Wizard (Task 3.10) */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] mb-5 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("manage")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "manage"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--secondary)]"
              }`}
            >
              <Smartphone size={14} />
              <span>Agents & Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cfu")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "cfu"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--heading)] bg-[var(--secondary)]"
              }`}
            >
              <PhoneForwarded size={14} />
              <span>Call Forwarding (CFU)</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase font-black">
                Wizard
              </span>
            </button>
          </div>

          {activeTab === "manage" ? (
            <>
              {/* Number Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-[var(--secondary)] p-4 border border-[var(--border)] mb-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--muted)] flex items-center gap-1.5"><MapPin size={12}/> City</span>
                  <span className="text-sm text-[var(--heading)]">{phoneNumber.city || "N/A"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--muted)] flex items-center gap-1.5"><Smartphone size={12}/> Type</span>
                  <span className="text-sm text-[var(--heading)] capitalize">{phoneNumber.did_type}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--muted)] flex items-center gap-1.5"><Globe size={12}/> Provider</span>
                  <span className="text-sm text-[var(--heading)] capitalize">{phoneNumber.provider}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-[var(--muted)] flex items-center gap-1.5"><CreditCard size={12}/> Pricing</span>
                  <span className="text-sm font-semibold text-[var(--heading)]">{formattedPrice}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="text-xs text-[var(--muted)]">Provisioned At</span>
                  <span className="text-sm text-[var(--heading)]">{new Date(phoneNumber.provisioned_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Assigned Agents */}
              <div className="mb-8">
                <h3 className="font-playfair text-lg font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
                  <UserPlus size={18} /> Assigned Agents ({phoneNumber.assigned_agents?.length || 0})
                </h3>
                
                {phoneNumber.assigned_agents && phoneNumber.assigned_agents.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {phoneNumber.assigned_agents.map(agent => (
                      <div key={agent.agent_id} className="flex items-center justify-between rounded-lg bg-[var(--secondary)] border border-[var(--border)] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--heading)]">{agent.agent_name}</span>
                          {agent.is_primary && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-wider font-semibold">
                              Primary
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnassign(agent.agent_id)}
                          className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Unassign
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                    <p className="text-sm text-[var(--muted)]">No agents assigned to this number.</p>
                    <p className="text-xs text-[var(--muted)] mt-1">Select an agent below to assign calls.</p>
                  </div>
                )}

                {/* Quick Assign Form */}
                {loadingAgents && agents.length === 0 ? (
                  <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/40 animate-pulse space-y-2">
                    <div className="h-3 w-28 bg-[var(--border)] rounded" />
                    <div className="h-9 w-full bg-[var(--background)] rounded-lg" />
                  </div>
                ) : unassignedAgents.length > 0 ? (
                  <div className="mt-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)] flex flex-col gap-3">
                    <span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">Assign to Agent</span>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-violet-500 transition-colors cursor-pointer"
                    >
                      <option value="">Select Agent...</option>
                      {unassignedAgents.map((agent: any) => {
                        const cleanName = (agent.name || '')
                          .replace(/^\[[^\]]+\]\s*/, '')
                          .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
                          .replace(/\s*-\s*Trial\s*$/i, ' (Trial)');
                        return (
                          <option key={agent.id} value={agent.id}>
                            {cleanName}
                          </option>
                        );
                      })}
                    </select>
                    
                    <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                      <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) => setIsPrimary(e.target.checked)}
                        className="rounded border-[var(--border)] bg-[var(--background)] text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-xs text-[var(--muted)] font-medium">Set as primary number for this agent</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleAssign}
                      disabled={!selectedAgentId || isAssigning}
                      className="w-full bg-[var(--primary-bg)] hover:opacity-90 active:scale-[0.98] text-[var(--heading)] font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 disabled:active:scale-100 mt-2 font-montserrat shadow-md hover:shadow-lg cursor-pointer"
                    >
                      {isAssigning ? "Assigning..." : "Assign Agent"}
                    </button>
                  </div>
                ) : agents.length > 0 ? (
                  <div className="mt-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 text-center">
                    <p className="text-xs text-[var(--muted)]">All available agents are already assigned to this number.</p>
                  </div>
                ) : null}
              </div>

              {/* Danger Zone */}
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 overflow-hidden">
                <button
                  onClick={() => setIsReleaseExpanded(!isReleaseExpanded)}
                  className="flex w-full items-center justify-between text-left focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-red-500" />
                    <span className="font-medium text-red-400">Release Number</span>
                  </div>
                  <span className={`text-red-400 text-sm transition-transform duration-200 ${isReleaseExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                
                <AnimatePresence>
                  {isReleaseExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 flex flex-col gap-4">
                        <p className="text-sm text-red-400">
                          This will permanently release <strong className="text-red-500">{phoneNumber.phone_number}</strong>. All agents using this number will lose inbound/outbound capability. This cannot be undone.
                        </p>
                        
                        <div>
                          <label className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 block">Type RELEASE to confirm</label>
                          <input
                            type="text"
                            value={releaseConfirmText}
                            onChange={(e) => setReleaseConfirmText(e.target.value)}
                            placeholder="RELEASE"
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--heading)] outline-none focus:border-red-500/50"
                          />
                        </div>
                        
                        <button
                          onClick={handleRelease}
                          disabled={releaseConfirmText !== "RELEASE" || isReleasing}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 py-2.5 font-medium text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 disabled:hover:text-red-400"
                        >
                          <Trash2 size={16} />
                          {isReleasing ? "Releasing..." : "Release Number"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            /* CFU (Call Forwarding Unconditional) Wizard - Task 3.10 */
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-[var(--heading)]">
                <p className="font-semibold text-violet-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={14} /> Instant Call Forwarding
                </p>
                <p className="text-[var(--muted)] leading-relaxed">
                  Keep your existing business phone number while allowing AI to answer all incoming calls. Just dial the carrier activation code below on your mobile.
                </p>
              </div>

              {/* Carrier Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                  Select Your Mobile Carrier
                </label>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 text-xs text-[var(--heading)] outline-none focus:border-violet-500 transition-colors cursor-pointer"
                >
                  {CARRIERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--muted)] italic mt-1">
                  {activeCarrierObj.note}
                </p>
              </div>

              {/* Computed Dial Code Box */}
              <div className="p-4 rounded-xl bg-[var(--secondary)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Carrier Dial Code
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                    Unconditional (CFU)
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 bg-[var(--background)] border border-[var(--border)] rounded-lg p-3">
                  <span className="font-mono text-base font-black text-violet-400 tracking-wider select-all">
                    {computedDialCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCfuCode}
                    className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    {cfuCodeCopied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{cfuCodeCopied ? "Copied!" : "Copy Code"}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--muted)] pt-1">
                  <span>To cancel forwarding anytime:</span>
                  <span className="font-mono font-bold text-rose-400">{activeCarrierObj.deact}</span>
                </div>
              </div>

              {/* 3-Step Setup Instructions */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block">
                  How To Complete Forwarding (30 Seconds)
                </span>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--secondary)]/60 border border-[var(--border)] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black flex items-center justify-center shrink-0">1</span>
                    <span className="text-[var(--heading)]">Open the Phone / Dialer app on your mobile SIM.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--secondary)]/60 border border-[var(--border)] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black flex items-center justify-center shrink-0">2</span>
                    <span className="text-[var(--heading)]">Dial <strong className="text-violet-400 font-mono">{computedDialCode}</strong> and tap the Call button.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--secondary)]/60 border border-[var(--border)] flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-black flex items-center justify-center shrink-0">3</span>
                    <span className="text-[var(--heading)]">Wait for confirmation screen. Inbound customer calls will now ring your AI agent!</span>
                  </div>
                </div>
              </div>

              {/* Support Ticket Integration (Task 3.10) */}
              <div className="pt-2 border-t border-[var(--border)]">
                {!showSupportTicketForm ? (
                  <button
                    type="button"
                    onClick={() => setShowSupportTicketForm(true)}
                    className="w-full py-2.5 rounded-xl border border-[var(--border)] bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 text-xs text-[var(--heading)] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <HelpCircle size={14} className="text-violet-400" />
                    <span>Need Carrier Assistance? Request Support Ticket</span>
                  </button>
                ) : (
                  <form onSubmit={handleCfuTicketSubmit} className="p-4 rounded-xl border border-violet-500/20 bg-[var(--secondary)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--heading)] flex items-center gap-1.5">
                        <HelpCircle size={14} className="text-violet-400" />
                        Request CFU Setup Ticket
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSupportTicketForm(false)}
                        className="text-[10px] text-[var(--muted)] hover:text-[var(--heading)]"
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                        Your Current Business Phone Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +91 98765 43210"
                        value={sourcePhone}
                        onChange={(e) => setSourcePhone(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--heading)] outline-none focus:border-violet-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
                        Additional Notes (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dual SIM Jio connection, MMI code gives error"
                        value={ticketNotes}
                        onChange={(e) => setTicketNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--heading)] outline-none focus:border-violet-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="w-full py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      {isSubmittingTicket ? "Submitting..." : "Submit CFU Assistance Ticket (Urgent SLA 4h)"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
