"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Calendar, User, Phone, Tag, AlignLeft, AlertCircle, Globe } from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import { toast } from "sonner";

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "America/New_York", label: "US Eastern (EST/EDT)" },
  { value: "America/Chicago", label: "US Central (CST/CDT)" },
  { value: "America/Denver", label: "US Mountain (MST/MDT)" },
  { value: "America/Los_Angeles", label: "US Pacific (PST/PDT)" },
  { value: "Europe/London", label: "UK / London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central Europe (CET/CEST)" },
  { value: "Asia/Dubai", label: "UAE / Dubai (GST, UTC+4)" },
  { value: "Asia/Singapore", label: "Singapore / Malaysia (SGT, UTC+8)" },
  { value: "Australia/Sydney", label: "Australia (AEST/AEDT)" },
  { value: "UTC", label: "Universal UTC (UTC+0)" },
];

export function getUtcIsoFromTz(dateStr: string, timeStr: string, timeZone: string): string {
  const targetDate = new Date(`${dateStr}T${timeStr}:00`);
  try {
    const invDate = new Date(targetDate.toLocaleString('en-US', { timeZone }));
    const diff = targetDate.getTime() - invDate.getTime();
    return new Date(targetDate.getTime() + diff).toISOString();
  } catch (e) {
    return targetDate.toISOString();
  }
}

export interface ScheduleCallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialLeadId?: string;
  initialName?: string;
  initialPhone?: string;
}

export function ScheduleCallbackModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialName,
  initialPhone
}: ScheduleCallbackModalProps) {
  const { agents } = useDashboardStore();
  
  const [prospectName, setProspectName] = useState(initialName || "");
  const [prospectPhone, setProspectPhone] = useState(initialPhone || "");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch (e) {
      return "Asia/Kolkata";
    }
  });
  const [priority, setPriority] = useState("normal");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Filter out free demo agents
  const filteredAgents = (agents || []).filter((agent: any) => {
    const rawName = agent.agent_name || agent.name || '';
    const cleanName = rawName.replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase();
    const isNameDemo = cleanName === 'demo' || cleanName.startsWith('demo');
    const isFreeDemo = agent.is_demo === true || 
                       agent.agent_type === 'free_demo' || 
                       isNameDemo;
    return !isFreeDemo;
  });

  // Initialize selected agent
  useEffect(() => {
    if (filteredAgents && filteredAgents.length > 0) {
      setSelectedAgentId(filteredAgents[0].id);
    } else {
      setSelectedAgentId("");
    }
  }, [agents]);

  // Set initial props when opened
  useEffect(() => {
    if (isOpen) {
      setProspectName(initialName || "");
      setProspectPhone(initialPhone || "");
      setErrorMsg("");
      setNotes("");
      setPriority("normal");
      
      // Default scheduled time: tomorrow at 10 AM local
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
      setTime("10:00");
    }
  }, [isOpen, initialName, initialPhone]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!prospectPhone.trim()) {
      setErrorMsg("Prospect phone number is required.");
      return;
    }
    if (!selectedAgentId) {
      setErrorMsg("Please select an agent.");
      return;
    }
    if (!date || !time) {
      setErrorMsg("Please select both date and time.");
      return;
    }

    const scheduledIso = getUtcIsoFromTz(date, time, timezone);
    if (new Date(scheduledIso) <= new Date()) {
      setErrorMsg("Scheduled time must be in the future.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/callbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          prospect_name: prospectName.trim() || "Unknown",
          prospect_phone: prospectPhone.trim(),
          scheduled_at: scheduledIso,
          timezone: timezone,
          notes: notes.trim(),
          priority,
          lead_id: initialLeadId || null
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule callback");
      }

      toast.success("Callback scheduled successfully!");
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md max-h-[min(600px,80vh)] bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col text-left font-montserrat"
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-bold text-[var(--heading)] font-display uppercase tracking-wider">
                  Schedule Callback
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-colors"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-rose-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Prospect Name */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Prospect Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={prospectName}
                  onChange={(e) => setProspectName(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium"
                />
              </div>

              {/* Prospect Phone */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={prospectPhone}
                  onChange={(e) => setProspectPhone(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium"
                />
              </div>

              {/* Agent Selection */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Assigned Agent <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium appearance-none cursor-pointer"
                  >
                    {filteredAgents && filteredAgents.length > 0 ? (
                      filteredAgents.map((agent: any) => {
                        const cleanName = (agent.agent_name || agent.name || '')
                          .replace(/^\[[^\]]+\]\s*/, '')
                          .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
                          .replace(/\s*-\s*Trial\s*$/i, ' (Trial)');
                        return (
                          <option key={agent.id} value={agent.id}>
                            {cleanName}
                          </option>
                        );
                      })
                    ) : (
                      <option value="">No agents found</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium cursor-pointer"
                  />
                </div>
              </div>

              {/* Timezone Selection */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Timezone <span className="text-rose-500">*</span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium cursor-pointer"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {!TIMEZONE_OPTIONS.some(tz => tz.value === timezone) && (
                    <option value={timezone}>{timezone}</option>
                  )}
                </select>
              </div>

              {/* Priority Selection */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Priority
                </label>
                <div className="flex gap-4">
                  {["low", "normal", "high"].map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer text-sm text-[var(--body)] font-medium capitalize">
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={priority === p}
                        onChange={() => setPriority(p)}
                        disabled={loading}
                        className="text-violet-500 focus:ring-violet-500 bg-[var(--background)] border-[var(--border)]"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[var(--muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Notes / Context
                </label>
                <textarea
                  placeholder="Reason for callback or context..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--body)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors text-sm font-medium resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-[var(--border)] bg-[var(--card-bg)] flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--hover-bg)] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Schedule"
                )}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
