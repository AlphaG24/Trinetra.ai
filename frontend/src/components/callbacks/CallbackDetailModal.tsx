"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  X, Calendar, User, Phone, Tag, AlignLeft, 
  CheckCircle2, XCircle, RefreshCw, AlertCircle, Copy, Check, Trash2, Globe 
} from "lucide-react";
import { toast } from "sonner";
import { TIMEZONE_OPTIONS, getUtcIsoFromTz } from "@/src/components/callbacks/ScheduleCallbackModal";

export interface CallbackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  callback: any;
  onUpdate: () => void;
}

export function CallbackDetailModal({
  isOpen,
  onClose,
  callback,
  onUpdate
}: CallbackDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [reschedTimezone, setReschedTimezone] = useState("Asia/Kolkata");
  const [reschedReason, setReschedReason] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && callback) {
      setIsRescheduling(false);
      setErrorMsg("");
      setReschedReason("");
      setReschedTimezone(callback.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata");
      
      // Default reschedule time: tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      setReschedDate(`${yyyy}-${mm}-${dd}`);
      setReschedTime("10:00");
    }
  }, [isOpen, callback]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!callback) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(callback.prospect_phone);
    setCopied(true);
    toast.success("Phone number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteCallback = async () => {
    if (!window.confirm("Are you sure you want to delete this callback?")) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/callbacks/${callback.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete callback");
      }

      toast.success("Callback deleted successfully!");
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/callbacks/${callback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update callback status");
      }

      toast.success(`Callback marked as ${newStatus}!`);
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedDate || !reschedTime) {
      setErrorMsg("Reschedule date and time are required.");
      return;
    }

    const scheduledIso = getUtcIsoFromTz(reschedDate, reschedTime, reschedTimezone);
    if (new Date(scheduledIso) <= new Date()) {
      setErrorMsg("Scheduled time must be in the future.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/callbacks/${callback.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: scheduledIso,
          timezone: reschedTimezone,
          reason: reschedReason.trim()
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reschedule callback");
      }

      toast.success("Callback rescheduled successfully!");
      onUpdate();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const priorityColors: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-500 border-rose-500/25",
    normal: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    low: "bg-gray-500/10 text-[var(--muted)] border-[var(--border)]"
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    missed: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    cancelled: "bg-gray-500/15 text-[var(--muted)] border-[var(--border)]"
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col text-left font-montserrat"
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-500" />
                <h3 className="text-lg font-bold text-[var(--heading)] font-display uppercase tracking-wider">
                  Callback Details
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl flex items-start gap-2.5 text-rose-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* General Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <User className="w-3 h-3" /> Prospect Info
                  </span>
                  <div className="text-sm font-bold text-[var(--heading)]">
                    {callback.prospect_name || "Unknown"}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs text-[var(--body)] font-medium font-mono">{callback.prospect_phone}</span>
                    <button
                      onClick={handleCopyPhone}
                      className="p-0.5 rounded text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer"
                      title="Copy phone"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3" /> Status & Priority
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border ${statusColors[callback.status]}`}>
                      {callback.status}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md border ${priorityColors[callback.priority]}`}>
                      {callback.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Agent Grid */}
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                <div>
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider mb-1 block">
                    Assigned Agent
                  </span>
                  <div className="text-sm font-bold text-[var(--heading)]">
                    {callback.agent?.name || "Unknown Agent"}
                  </div>
                </div>

                <div>
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider mb-1 block">
                    Scheduled Time
                  </span>
                  <div className="text-sm font-bold text-[var(--heading)] font-mono">
                    {new Date(callback.scheduled_at).toLocaleString(undefined, { 
                      dateStyle: 'medium', 
                      timeStyle: 'short',
                      timeZone: callback.timezone || undefined
                    })}
                  </div>
                  <span className="text-[10px] text-[var(--muted)] block font-medium mt-0.5">Timezone: {callback.timezone || "Asia/Kolkata"}</span>
                </div>
              </div>

              {/* Linked Records */}
              {(callback.lead || callback.original_call_id) && (
                <div className="border-t border-[var(--border)] pt-4 space-y-2">
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider block">
                    Linked Records
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {callback.lead && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg text-[var(--body)]">
                        Lead: {callback.lead.full_name}
                      </span>
                    )}
                    {callback.original_call_id && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--primary-bg)] border border-[var(--border)] rounded-lg text-[var(--body)] font-mono">
                        Call ID: {callback.original_call_id.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="border-t border-[var(--border)] pt-4 space-y-1.5">
                <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Conversation Notes & Reschedule History
                </span>
                <div className="p-3.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] font-medium leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto custom-scrollbar">
                  {callback.notes || "No additional notes provided."}
                </div>
              </div>

              {/* Rescheduling Form overlay inside modal */}
              {isRescheduling && (
                <form onSubmit={handleReschedule} className="border-t-2 border-violet-500/30 pt-4 space-y-3 mt-2 animate-in slide-in-from-bottom-2 duration-200">
                  <span className="text-[var(--heading)] text-sm font-bold block">Reschedule Callback</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider">New Date</label>
                      <input
                        type="date"
                        value={reschedDate}
                        onChange={(e) => setReschedDate(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--body)] focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider">New Time</label>
                      <input
                        type="time"
                        value={reschedTime}
                        onChange={(e) => setReschedTime(e.target.value)}
                        disabled={loading}
                        required
                        className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--body)] focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Globe className="w-3 h-3 text-violet-400" /> Timezone
                    </label>
                    <select
                      value={reschedTimezone}
                      onChange={(e) => setReschedTimezone(e.target.value)}
                      disabled={loading}
                      required
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 cursor-pointer"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                      {!TIMEZONE_OPTIONS.some(tz => tz.value === reschedTimezone) && (
                        <option value={reschedTimezone}>{reschedTimezone}</option>
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider">Reason for Rescheduling</label>
                    <input
                      type="text"
                      placeholder="e.g. Prospect busy, asked to call tomorrow"
                      value={reschedReason}
                      onChange={(e) => setReschedReason(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-xs text-[var(--body)] focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg border border-[var(--border)] text-[var(--heading)] hover:bg-[var(--hover-bg)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center"
                    >
                      Confirm
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Actions Bar */}
            {!isRescheduling && (
              <div className="p-5 border-t border-[var(--border)] bg-[var(--background)]/35 flex flex-wrap gap-2.5 items-center justify-end">
                <button
                  onClick={handleDeleteCallback}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer mr-auto"
                  title="Delete Callback"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                {callback.status === "scheduled" && (
                  <>
                    <button
                      onClick={() => handleStatusChange("completed")}
                      disabled={loading}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Complete
                    </button>
                    <button
                      onClick={() => handleStatusChange("cancelled")}
                      disabled={loading}
                      className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={() => setIsRescheduling(true)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" /> Reschedule
                    </button>
                  </>
                )}
                {callback.status === "missed" && (
                  <button
                    onClick={() => setIsRescheduling(true)}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 border border-blue-500/30 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" /> Reschedule
                  </button>
                )}
                <button
                  disabled
                  className="px-4 py-2 bg-[var(--primary-bg)] border border-[var(--border)] text-[var(--muted)] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-not-allowed opacity-65"
                  title="Will be implemented in Outbound Campaign Engine"
                >
                  Call Now
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
