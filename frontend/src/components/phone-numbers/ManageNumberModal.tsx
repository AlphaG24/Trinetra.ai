"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  X, Copy, MapPin, Smartphone, Globe, CreditCard, 
  Trash2, UserPlus, AlertTriangle, Check
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
    assigned_agents: Array<{
      agent_id: string;
      agent_name: string;
      is_primary: boolean;
    }>;
    display_price?: string;
  };
  onUpdate: () => void;
}

export function ManageNumberModal({ 
  isOpen, 
  onClose, 
  phoneNumber, 
  onUpdate 
}: ManageNumberModalProps) {
  const [copied, setCopied] = useState(false);
  const [isReleaseExpanded, setIsReleaseExpanded] = useState(false);
  const [releaseConfirmText, setReleaseConfirmText] = useState("");
  const [isReleasing, setIsReleasing] = useState(false);
  
  const { agents } = useDashboardStore();
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const assignedAgentIds = phoneNumber.assigned_agents?.map(a => a.agent_id) || [];
  const unassignedAgents = (agents || [])
    .filter(a => !assignedAgentIds.includes(a.id))
    .filter(a => !(a.is_demo === true || a.status === 'draft' || a.status === 'beta' || a.agent_type === 'free_demo' || a.name?.startsWith('[')));

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto"
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
          className="relative w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] p-5 md:p-6 shadow-2xl my-8 sm:my-auto max-h-none sm:max-h-[85vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--heading)] transition-colors"
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
                className="text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
              >
                {copied ? <Check size={20} className="text-green-500 scale-in" /> : <Copy size={20} />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${phoneNumber.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-xs text-[var(--muted)] capitalize">{phoneNumber.status}</span>
            </div>
          </div>

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
              <span className="text-sm text-[var(--heading)]">{phoneNumber.display_price || "Billed monthly"}</span>
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
                      className="text-xs font-medium text-red-500 hover:text-red-400 transition-colors"
                    >
                      Unassign
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
                <p className="text-sm text-[var(--muted)]">No agents assigned to this number.</p>
                <p className="text-xs text-[var(--muted)] mt-1">Manage assignments from the agent settings page.</p>
              </div>
            )}

            {/* Quick Assign Form */}
            {unassignedAgents.length > 0 && (
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
                  className="w-full bg-[var(--primary-bg)] hover:opacity-90 active:scale-[0.98] text-[var(--heading)] font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 disabled:active:scale-100 mt-2 font-montserrat shadow-md hover:shadow-lg"
                >
                  {isAssigning ? "Assigning..." : "Assign Agent"}
                </button>
              </div>
            )}
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

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
