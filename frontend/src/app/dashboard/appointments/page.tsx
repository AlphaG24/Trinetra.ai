"use client";

import { useEffect, useState } from "react";
import { 
  Calendar, Clock, Phone, User, Mail, Search, RefreshCw, 
  CheckCircle2, XCircle, Copy, Check, CalendarClock,
  ExternalLink, CalendarDays, Bot, Sparkles, AlertCircle, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Appointment {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  agent_id?: string;
  scheduled_at: string;
  duration_minutes?: number;
  status: "scheduled" | "completed" | "cancelled" | "confirmed" | "rejected" | "rescheduled" | "pending";
  meeting_type: string;
  notes?: string;
  meeting_link?: string;
  booked_via?: string;
  created_at: string;
  agent?: {
    id: string;
    name: string;
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_count: 0,
    scheduled_count: 0,
    completed_count: 0,
    today_count: 0
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modals & Actions
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for reschedule
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const fetchAppointments = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setAppointments(json.data.appointments || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      } else {
        toast.error(json.error || "Failed to load appointments");
      }
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
      toast.error("Could not connect to appointments service");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments();
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Phone number copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Accept Appointment
  const handleAccept = async (apt: Appointment) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: apt.id,
          status: "confirmed",
          action: "accept"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Appointment accepted! Confirmation notification sent via WhatsApp & Email.`);
        setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: "confirmed" } : a));
      } else {
        toast.error(data.error || "Failed to accept appointment");
      }
    } catch (e) {
      toast.error("Error accepting appointment");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Appointment
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;

    try {
      setActionLoading(true);
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rejectTarget.id,
          status: "cancelled",
          action: "reject",
          reason: rejectReason.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Appointment rejected. Rejection notice delivered to customer.`);
        setAppointments(prev => prev.map(a => a.id === rejectTarget.id ? { ...a, status: "cancelled" } : a));
        setRejectTarget(null);
        setRejectReason("");
      } else {
        toast.error(data.error || "Failed to reject appointment");
      }
    } catch (e) {
      toast.error("Error rejecting appointment");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Reschedule Appointment
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !newDate || !newTime) {
      toast.error("Please select a valid date and time");
      return;
    }

    try {
      setActionLoading(true);
      const combinedDateTime = new Date(`${newDate}T${newTime}:00`).toISOString();

      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rescheduleTarget.id,
          status: "rescheduled",
          scheduled_at: combinedDateTime,
          action: "reschedule",
          reason: rescheduleReason.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Appointment rescheduled! Updated notice sent via WhatsApp & Email.`);
        setAppointments(prev => prev.map(a => a.id === rescheduleTarget.id ? { ...a, status: "rescheduled", scheduled_at: combinedDateTime } : a));
        setRescheduleTarget(null);
        setNewDate("");
        setRescheduleReason("");
      } else {
        toast.error(data.error || "Failed to reschedule appointment");
      }
    } catch (e) {
      toast.error("Error rescheduling appointment");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-heading tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                Appointments & Consultations
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                  Live Operations
                </span>
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Manage, accept, reject, or reschedule bookings confirmed by your AI voice agents
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAppointments(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#120E22] hover:bg-zinc-50 dark:hover:bg-white/5 text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-600 dark:text-violet-400 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs flex items-center gap-4 hover:border-violet-500/30 transition-all">
          <div className="p-3.5 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{stats.total_count}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Bookings</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs flex items-center gap-4 hover:border-amber-500/30 transition-all">
          <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">{stats.scheduled_count}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Upcoming / Scheduled</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs flex items-center gap-4 hover:border-emerald-500/30 transition-all">
          <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 relative">
            <CalendarClock className="w-6 h-6" />
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{stats.today_count}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Today's Schedule</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-xs flex items-center gap-4 hover:border-violet-500/30 transition-all">
          <div className="p-3.5 bg-violet-500/10 rounded-xl text-violet-600 dark:text-violet-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white">{stats.completed_count}</div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Completed Sessions</div>
          </div>
        </div>
      </div>

      {/* Directory Filter / Search Toolbar */}
      <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl p-4 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search by client name, phone number, service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {["all", "scheduled", "confirmed", "rescheduled", "completed", "cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize text-xs font-bold tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-violet-600 text-white shadow-xs"
                    : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-white/10"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointments List / Table */}
      <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Loading bookings from database...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">No appointments found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
              {searchQuery || statusFilter !== "all" 
                ? "No appointments match your filters. Try clearing your search."
                : "When your AI Voice Agents confirm client bookings, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-white/5">
                  <th className="py-3.5 px-6">Client / Contact</th>
                  <th className="py-3.5 px-6">Scheduled Date & Time</th>
                  <th className="py-3.5 px-6">Meeting Service</th>
                  <th className="py-3.5 px-6">Agent</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-white/5">
                {appointments.map((apt) => {
                  let formattedDate = "Pending Date";
                  try {
                    formattedDate = format(new Date(apt.scheduled_at), "EEE, MMM d, yyyy • h:mm a");
                  } catch (e) {
                    formattedDate = apt.scheduled_at;
                  }

                  const isPendingOrScheduled = apt.status === "scheduled" || apt.status === "confirmed" || apt.status === "pending" || apt.status === "rescheduled";

                  return (
                    <tr key={apt.id} className="hover:bg-zinc-50/80 dark:hover:bg-white/5 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-sm">
                            {(apt.contact_name || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                              {apt.contact_name || "Unknown Prospect"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              <span>{apt.contact_phone || "No phone"}</span>
                              {apt.contact_phone && (
                                <button
                                  onClick={() => handleCopy(apt.contact_phone, apt.id)}
                                  className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                                  title="Copy Phone"
                                >
                                  {copiedId === apt.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-zinc-900 dark:text-white font-medium flex items-center gap-2 text-xs">
                          <Clock className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          {formattedDate} (IST)
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {apt.duration_minutes ? `${apt.duration_minutes} Mins Duration` : "30 Mins Consultation"}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-zinc-900 dark:text-white font-medium text-xs">{apt.meeting_type || "AI Demo Consultation"}</div>
                        {apt.notes && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[220px]" title={apt.notes}>
                            {apt.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 px-2.5 py-1 rounded-lg">
                          <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          {apt.agent?.name || apt.booked_via || "Arika"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          apt.status === "confirmed" || apt.status === "scheduled"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                            : apt.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                            : apt.status === "rescheduled"
                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span className="capitalize">{apt.status}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {isPendingOrScheduled && (
                            <>
                              {apt.status !== "confirmed" && (
                                <button
                                  onClick={() => handleAccept(apt)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-xs font-bold hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                                  title="Accept and notify user via WhatsApp & Email"
                                >
                                  Accept
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setRescheduleTarget(apt);
                                  try {
                                    const d = new Date(apt.scheduled_at);
                                    setNewDate(d.toISOString().split("T")[0]);
                                    setNewTime(d.toTimeString().slice(0, 5));
                                  } catch {
                                    setNewDate("");
                                    setNewTime("10:00");
                                  }
                                }}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/25 text-xs font-bold hover:bg-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                                title="Reschedule date/time and notify user"
                              >
                                Reschedule
                              </button>

                              <button
                                onClick={() => setRejectTarget(apt)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25 text-xs font-bold hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                                title="Reject and send cancellation notice"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => setSelectedAppointment(apt)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                            title="View Full Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-base">Reschedule Appointment</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Notify {rescheduleTarget.contact_name} on WhatsApp & Email</p>
                </div>
              </div>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">New Appointment Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">New Appointment Time (IST)</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div>
                <label className="font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Reason / Note to Customer (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rescheduled due to technical briefing conflict. Look forward to our discussion."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-700 dark:text-violet-300 leading-relaxed">
                ⚡ Submitting will immediately update the database and dispatch automated confirmation alerts via <strong>WhatsApp (+91...)</strong> and <strong>Email</strong> to the customer.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Dispatching..." : "Confirm & Send Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reject Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-base">Decline Appointment</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Send cancellation notification to {rejectTarget.contact_name}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block mb-1">Reason for Rejection / Cancellation</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Service slot currently booked out. Please reach out to schedule for next week."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 rounded-xl p-3 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                ⚠️ The appointment will be marked cancelled and a formal cancellation message will be sent to the customer on WhatsApp and Email.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Declining..." : "Decline & Notify"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#120E22] border border-zinc-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white text-base">Appointment Intelligence Details</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">ID: {selectedAppointment.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Client Name</label>
                  <p className="text-zinc-900 dark:text-white font-semibold mt-1 text-sm">{selectedAppointment.contact_name || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Phone Number</label>
                  <p className="text-zinc-900 dark:text-white font-semibold mt-1 text-sm">{selectedAppointment.contact_phone || "Not specified"}</p>
                </div>
              </div>

              <div>
                <label className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Scheduled Date & Time</label>
                <p className="text-violet-600 dark:text-violet-400 font-semibold mt-1 text-sm">
                  {format(new Date(selectedAppointment.scheduled_at), "EEEE, MMMM d, yyyy • h:mm a")} (IST)
                </p>
              </div>

              <div>
                <label className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Meeting Type / Purpose</label>
                <p className="text-zinc-900 dark:text-white mt-1 font-medium">{selectedAppointment.meeting_type || "AI Voice Demo Consultation"}</p>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <label className="text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">Call Summary & Notes</label>
                  <div className="mt-1 p-3 rounded-xl bg-zinc-50 dark:bg-[#1C1530] border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 text-xs leading-relaxed">
                    {selectedAppointment.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5 font-bold text-xs text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
