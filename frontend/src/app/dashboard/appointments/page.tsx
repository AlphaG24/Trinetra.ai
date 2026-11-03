"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Calendar, Clock, Phone, User, Mail, Search, RefreshCw, 
  CheckCircle2, XCircle, Copy, Check, CalendarClock,
  ExternalLink, CalendarDays, Bot, AlertCircle, ArrowRight,
  FileSpreadsheet, Download, Plus, ChevronLeft, ChevronRight,
  Coffee, UserPlus, X, Trash2
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
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
  voice_call_id?: string;
  agent?: {
    id: string;
    name: string;
  };
}

interface ScheduleSlot {
  slotKey: string
  startTime: string
  endTime: string
  label: string
  isBooked: boolean
  isBreak: boolean
  appointment?: Appointment
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

  // View mode: 'sheet' (Excel schedule grid) | 'directory' (bookings list)
  const [viewMode, setViewMode] = useState<'sheet' | 'directory'>('sheet');
  const [scheduleDate, setScheduleDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Active Voice Directive (Operating Hours)
  const [voiceDirectiveTitle, setVoiceDirectiveTitle] = useState<string | null>(null);
  const [startHour, setStartHour] = useState<number>(10); // default 10:00 AM

  // Local breaks (e.g. Lunch break)
  const [breakSlots, setBreakSlots] = useState<Record<string, boolean>>({});

  // Filters for Directory View
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Modals & Actions
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Quick Book Modal
  const [quickBookSlot, setQuickBookSlot] = useState<ScheduleSlot | null>(null);
  const [manualClientName, setManualClientName] = useState("");
  const [manualClientPhone, setManualClientPhone] = useState("");
  const [manualService, setManualService] = useState("");

  // Form states for reschedule
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Fetch Voice Directive to dynamically configure opening hours
  const fetchDirective = async () => {
    try {
      const res = await fetch('/api/business-catalog?category=voice_directive');
      const json = await res.json();
      if (json.success && json.data?.items?.length > 0) {
        const active = json.data.items.find((i: any) => i.status === 'available') || json.data.items[0];
        setVoiceDirectiveTitle(active.title);
        // If transcript or mutations specify an hour (e.g. 10 AM)
        const mutStart = active.metadata?.mutations?.slot_start;
        if (mutStart && mutStart.includes('10')) {
          setStartHour(10);
        } else if (mutStart && mutStart.includes('11')) {
          setStartHour(11);
        } else if (mutStart && mutStart.includes('12')) {
          setStartHour(12);
        }
      }
    } catch (_) {}
  };

  const fetchAppointments = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else if (appointments.length === 0) setLoading(true);

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
      }
    } catch (err: any) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDirective();
    // Live in-call auto-polling: Polls every 6s so calls booking appointments update the XL sheet in real time!
    const interval = setInterval(() => {
      fetchAppointments(false);
    }, 6000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

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

  // Generate dynamic 30-min schedule slots based on startHour & operating window
  const scheduleSlots = useMemo(() => {
    const slots: ScheduleSlot[] = [];
    const endHour = 19; // 07:00 PM closing
    const start = Math.max(8, Math.min(startHour, 16));

    for (let h = start; h < endHour; h++) {
      for (const m of [0, 30]) {
        const startHStr = h.toString().padStart(2, '0');
        const startMStr = m.toString().padStart(2, '0');
        const nextM = m === 0 ? 30 : 0;
        const nextH = m === 0 ? h : h + 1;
        const endHStr = nextH.toString().padStart(2, '0');
        const endMStr = nextM.toString().padStart(2, '0');

        const startTime = `${startHStr}:${startMStr}`;
        const endTime = `${endHStr}:${endMStr}`;

        const format12 = (hour: number, min: number) => {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const h12 = hour % 12 || 12;
          return `${h12.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${ampm}`;
        };

        const label = `${format12(h, m)} - ${format12(nextH, nextM)}`;
        const slotKey = `${scheduleDate}_${startTime}`;

        // Find matching appointment for this slot
        const apt = appointments.find(a => {
          if (a.status === 'cancelled' || a.status === 'rejected') return false;
          try {
            const aptDate = format(new Date(a.scheduled_at), 'yyyy-MM-dd');
            if (aptDate !== scheduleDate) return false;
            const aptTime = format(new Date(a.scheduled_at), 'HH:mm');
            // Match within 30-min window
            return aptTime >= startTime && aptTime < endTime;
          } catch {
            return false;
          }
        });

        slots.push({
          slotKey,
          startTime,
          endTime,
          label,
          isBooked: !!apt,
          isBreak: !!breakSlots[slotKey],
          appointment: apt
        });
      }
    }
    return slots;
  }, [scheduleDate, startHour, appointments, breakSlots]);

  // Quick Manual Booking Submit
  const handleQuickBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBookSlot || !manualClientName.trim()) {
      toast.error("Client name is required");
      return;
    }

    try {
      setActionLoading(true);
      const scheduledDateTime = `${scheduleDate}T${quickBookSlot.startTime}:00`;

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_name: manualClientName.trim(),
          contact_phone: manualClientPhone.trim() || "+91 99999 00000",
          scheduled_at: scheduledDateTime,
          duration_minutes: 30,
          meeting_type: manualService.trim() || "In-Person Consultation",
          notes: `Booked via Live Schedule Sheet. ${manualService.trim()}`
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success(`Slot booked for ${manualClientName}!`);
        setQuickBookSlot(null);
        setManualClientName("");
        setManualClientPhone("");
        setManualService("");
        fetchAppointments(true);
      } else {
        toast.error(json.error || "Failed to book slot");
      }
    } catch {
      toast.error("Network error booking slot");
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Break Slot
  const toggleBreakSlot = (slotKey: string) => {
    setBreakSlots(prev => ({
      ...prev,
      [slotKey]: !prev[slotKey]
    }));
    toast.success(breakSlots[slotKey] ? "Break cleared, slot available" : "Slot marked as Break / Blocked");
  };

  // Export Schedule to CSV
  const handleExportScheduleCSV = () => {
    const headers = ["Time Slot", "Status", "Client Name", "Contact Phone", "Service / Reason", "Booked Via", "Scheduled Date"];
    const rows = scheduleSlots.map(s => [
      `"${s.label}"`,
      s.isBreak ? "Break / Blocked" : s.isBooked ? "Booked" : "Available",
      `"${s.appointment?.contact_name || ''}"`,
      `"${s.appointment?.contact_phone || ''}"`,
      `"${s.appointment?.notes || s.appointment?.meeting_type || ''}"`,
      `"${s.appointment?.booked_via || (s.isBooked ? 'AI Voice Call' : '')}"`,
      `"${scheduleDate}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `schedule_sheet_${scheduleDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Schedule spreadsheet exported");
  };

  // Accept Appointment
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
        toast.success(`Appointment accepted! Customer notified.`);
        setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: "confirmed" } : a));
      } else {
        toast.error(data.error || "Failed to accept appointment");
      }
    } catch {
      toast.error("Error accepting appointment");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Appointment
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
        toast.success(`Appointment declined.`);
        setAppointments(prev => prev.map(a => a.id === rejectTarget.id ? { ...a, status: "cancelled" } : a));
        setRejectTarget(null);
        setRejectReason("");
      } else {
        toast.error(data.error || "Failed to decline appointment");
      }
    } catch {
      toast.error("Error declining appointment");
    } finally {
      setActionLoading(false);
    }
  };

  // Reschedule Appointment
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !newDate || !newTime) {
      toast.error("Please select a valid date and time");
      return;
    }

    try {
      setActionLoading(true);
      const combinedDateTime = `${newDate}T${newTime}:00`;
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
        toast.success(`Appointment rescheduled!`);
        setAppointments(prev => prev.map(a => a.id === rescheduleTarget.id ? { ...a, status: "rescheduled", scheduled_at: combinedDateTime } : a));
        setRescheduleTarget(null);
        setNewDate("");
        setRescheduleReason("");
      } else {
        toast.error(data.error || "Failed to reschedule");
      }
    } catch {
      toast.error("Error rescheduling appointment");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--heading)] tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--heading)]" />
            <span>Appointments & Live Schedule</span>
          </h1>
          <p className="text-xs text-[var(--muted)] mt-1 max-w-2xl">
            Real-time schedule spreadsheet and customer booking directory. As incoming AI calls confirm appointments, slots update live.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => fetchAppointments(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Bookings"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {viewMode === 'sheet' && (
            <button
              onClick={handleExportScheduleCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-[var(--muted)]" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[var(--muted)]">Total Bookings</div>
          <div className="text-2xl font-black text-[var(--heading)]">{stats.total_count}</div>
          <p className="text-[11px] text-[var(--muted)]">All registered calls</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[var(--muted)]">Upcoming / Scheduled</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.scheduled_count}</div>
          <p className="text-[11px] text-[var(--muted)]">Pending sessions</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[var(--muted)]">Today's Schedule</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.today_count}</div>
          <p className="text-[11px] text-[var(--muted)]">Scheduled for today</p>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[var(--muted)]">Completed</div>
          <div className="text-2xl font-black text-[var(--heading)]">{stats.completed_count}</div>
          <p className="text-[11px] text-[var(--muted)]">Fulfilled sessions</p>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          onClick={() => setViewMode('sheet')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'sheet'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Live Schedule Sheet (Excel Grid)</span>
        </button>

        <button
          onClick={() => setViewMode('directory')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            viewMode === 'directory'
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'bg-[var(--card-bg)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Bookings Directory ({appointments.length})</span>
        </button>
      </div>

      {/* VIEW 1: LIVE SCHEDULE SPREADSHEET (EXCEL GRID) */}
      {viewMode === 'sheet' && (
        <div className="space-y-4">
          {/* Schedule Date Navigator & Operating Hours Banner */}
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  try {
                    const prev = subDays(new Date(scheduleDate), 1);
                    setScheduleDate(format(prev, 'yyyy-MM-dd'));
                  } catch (_) {}
                }}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="px-3 py-1.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
              />

              <button
                onClick={() => {
                  try {
                    const next = addDays(new Date(scheduleDate), 1);
                    setScheduleDate(format(next, 'yyyy-MM-dd'));
                  } catch (_) {}
                }}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--hover-bg)] text-[var(--heading)] cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setScheduleDate(format(new Date(), 'yyyy-MM-dd'))}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--hover-bg)] text-[11px] font-semibold text-[var(--heading)] border border-[var(--border)] cursor-pointer hover:bg-[var(--card-bg)] ml-1"
              >
                Today
              </button>
            </div>

            {/* Operating Directive Hint */}
            {voiceDirectiveTitle && (
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] bg-[var(--hover-bg)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-[var(--heading)]">Directive:</span>
                <span className="truncate max-w-sm">{voiceDirectiveTitle}</span>
              </div>
            )}
          </div>

          {/* Excel Spreadsheet Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                    <th className="py-3 px-4 font-bold w-48">Time Slot</th>
                    <th className="py-3 px-3 font-bold text-center w-28">Status</th>
                    <th className="py-3 px-4 font-bold">Client / Customer</th>
                    <th className="py-3 px-3 font-bold">Phone Number</th>
                    <th className="py-3 px-4 font-bold">Service / Purpose</th>
                    <th className="py-3 px-3 font-bold text-center">Booked Via</th>
                    <th className="py-3 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {scheduleSlots.map(slot => {
                    const isBooked = slot.isBooked;
                    const isBreak = slot.isBreak;
                    const apt = slot.appointment;

                    return (
                      <tr
                        key={slot.slotKey}
                        className={`hover:bg-[var(--hover-bg)]/60 transition-colors ${
                          isBooked ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : isBreak ? 'bg-zinc-100/40 dark:bg-zinc-900/40' : ''
                        }`}
                      >
                        {/* Time Slot */}
                        <td className="py-3 px-4 font-mono font-bold text-[var(--heading)] flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                          <span>{slot.label}</span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isBreak
                                ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                : isBooked
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-[var(--hover-bg)] text-[var(--muted)] border border-[var(--border)]'
                            }`}
                          >
                            {isBreak ? 'Break' : isBooked ? 'Booked' : 'Available'}
                          </span>
                        </td>

                        {/* Client Name */}
                        <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                          {isBooked ? (
                            <div className="flex items-center gap-1.5">
                              <span>{apt?.contact_name || 'Caller'}</span>
                            </div>
                          ) : isBreak ? (
                            <span className="italic text-[var(--muted)]">Blocked for Break / Maintenance</span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3 px-3 font-mono text-[11px] text-[var(--muted)]">
                          {isBooked && apt?.contact_phone ? (
                            <div className="flex items-center gap-1">
                              <span>{apt.contact_phone}</span>
                              <button
                                onClick={() => handleCopy(apt.contact_phone, apt.id)}
                                className="p-0.5 hover:text-[var(--heading)] cursor-pointer"
                                title="Copy Phone"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="opacity-40">-</span>
                          )}
                        </td>

                        {/* Service / Purpose */}
                        <td className="py-3 px-4 text-[var(--heading)]">
                          {isBooked ? (
                            <span className="line-clamp-1">{apt?.notes || apt?.meeting_type || 'Appointment'}</span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Booked Via */}
                        <td className="py-3 px-3 text-center">
                          {isBooked ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--muted)]">
                              {apt?.booked_via === 'voice' ? 'AI Voice Call' : 'Manual'}
                            </span>
                          ) : (
                            <span className="text-[var(--muted)]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isBooked && apt ? (
                              <>
                                <button
                                  onClick={() => setSelectedAppointment(apt)}
                                  className="px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] hover:bg-[var(--card-bg)] text-[var(--heading)] border border-[var(--border)] font-semibold text-[11px] cursor-pointer"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => setRejectTarget(apt)}
                                  className="px-2.5 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 text-[var(--muted)] hover:text-red-500 font-semibold text-[11px] cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setQuickBookSlot(slot)}
                                  disabled={isBreak}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold text-[11px] shadow-xs cursor-pointer disabled:opacity-30"
                                >
                                  <UserPlus className="w-3 h-3" />
                                  <span>Book</span>
                                </button>
                                <button
                                  onClick={() => toggleBreakSlot(slot.slotKey)}
                                  className="p-1 rounded-lg hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
                                  title={isBreak ? "Remove Break" : "Mark as Break"}
                                >
                                  <Coffee className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: BOOKINGS DIRECTORY LIST */}
      {viewMode === 'directory' && (
        <div className="space-y-4">
          {/* Search & Status Filters */}
          <div className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search by client name, phone number, service..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-xs text-[var(--heading)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </form>

            <div className="flex items-center gap-1.5 flex-wrap">
              {["all", "scheduled", "confirmed", "rescheduled", "completed", "cancelled"].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg capitalize text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs"
                      : "bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Appointments Table */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-xs">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--heading)]" />
                <p className="text-xs font-medium">Loading bookings...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-20 text-center text-[var(--muted)] space-y-2">
                <Calendar className="w-8 h-8 mx-auto text-[var(--muted)] stroke-1" />
                <h3 className="text-base font-bold text-[var(--heading)]">No bookings found</h3>
                <p className="text-xs max-w-sm mx-auto">
                  When your AI voice agents book customer appointments, they will be listed here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--hover-bg)] text-[var(--muted)] uppercase font-mono text-[10px] tracking-wider select-none">
                      <th className="py-3 px-4 font-bold">Client / Contact</th>
                      <th className="py-3 px-4 font-bold">Scheduled Time</th>
                      <th className="py-3 px-4 font-bold">Service / Purpose</th>
                      <th className="py-3 px-3 font-bold text-center">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {appointments.map(apt => (
                      <tr key={apt.id} className="hover:bg-[var(--hover-bg)]/60 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[var(--heading)]">
                          <div>{apt.contact_name || "Unknown Prospect"}</div>
                          <div className="text-[11px] font-mono text-[var(--muted)]">{apt.contact_phone}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[var(--heading)]">
                          {format(new Date(apt.scheduled_at), "EEE, MMM d • h:mm a")}
                        </td>
                        <td className="py-3 px-4 text-[var(--heading)] max-w-xs truncate">
                          {apt.notes || apt.meeting_type}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] capitalize">
                            {apt.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={() => handleAccept(apt)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Accept
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedAppointment(apt)}
                              className="px-2.5 py-1 rounded-lg bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-semibold text-[11px] cursor-pointer"
                            >
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Quick Book Modal */}
      {quickBookSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--heading)] flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>Book Slot ({quickBookSlot.label})</span>
              </h3>
              <button
                onClick={() => setQuickBookSlot(null)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickBookSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">Customer / Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Verma"
                  value={manualClientName}
                  onChange={e => setManualClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={manualClientPhone}
                  onChange={e => setManualClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--heading)] mb-1">Service / Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Haircut & Styling or Business Consultation"
                  value={manualService}
                  onChange={e => setManualService(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)] focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setQuickBookSlot(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Confirming..." : "Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--heading)] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Booking Details</span>
              </h3>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1 rounded text-[var(--muted)] hover:text-[var(--heading)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Client Name</span>
                <p className="font-bold text-sm text-[var(--heading)]">{selectedAppointment.contact_name}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Phone</span>
                <p className="font-mono text-xs text-[var(--heading)]">{selectedAppointment.contact_phone || 'None'}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Scheduled Date & Time</span>
                <p className="font-mono text-xs text-[var(--heading)]">
                  {format(new Date(selectedAppointment.scheduled_at), "EEEE, MMMM d, yyyy • h:mm a")}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Booked Via</span>
                <p className="text-xs text-[var(--heading)]">
                  {selectedAppointment.booked_via === 'voice' ? 'AI Voice Call Agent' : 'Manual Entry'}
                </p>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Notes</span>
                  <p className="p-2.5 rounded-xl bg-[var(--hover-bg)] text-[var(--heading)] mt-1">
                    {selectedAppointment.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--heading)] font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Appointment Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="font-bold text-sm text-[var(--heading)]">Decline Appointment</h3>
              <button onClick={() => setRejectTarget(null)} className="p-1 rounded text-[var(--muted)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <p className="text-[var(--muted)]">
                Are you sure you want to decline the booking for <strong className="text-[var(--heading)]">{rejectTarget.contact_name}</strong>?
              </p>
              <textarea
                rows={2}
                placeholder="Optional reason for cancellation..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full p-2.5 bg-[var(--hover-bg)] border border-[var(--border)] rounded-xl text-[var(--heading)]"
              />
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--hover-bg)] text-[var(--muted)] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Declining..." : "Decline Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
