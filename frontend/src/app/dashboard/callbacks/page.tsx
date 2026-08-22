"use client";

import { useEffect, useState } from "react";
import { 
  CalendarClock, Clock, Tag, RefreshCw, CheckCircle2, 
  Search, SlidersHorizontal, Plus, Calendar, AlertTriangle, 
  Trash2, XCircle, Copy, Check, MoreVertical, Phone
} from "lucide-react";
import { useDashboardStore } from "@/store/dashboardStore";
import { ScheduleCallbackModal } from "@/src/components/callbacks/ScheduleCallbackModal";
import { CallbackDetailModal } from "@/src/components/callbacks/CallbackDetailModal";
import { toast } from "sonner";
import UpgradePrompt from "@/src/components/shared/UpgradePrompt";

interface Callback {
  id: string;
  prospect_name: string;
  prospect_phone: string;
  scheduled_at: string;
  priority: string;
  status: string;
  notes: string;
  agent?: {
    id: string;
    name: string;
  };
  lead?: {
    id: string;
    full_name: string;
  };
  original_call_id?: string;
  timezone: string;
}

const cleanAgentName = (name: string) => {
  if (!name) return "Unknown";
  return name
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
    .replace(/\s*-\s*Trial\s*$/i, ' (Trial)');
};

export default function CallbacksDashboardPage() {
  const { agents, profile } = useDashboardStore();

  if (!profile) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userPlanTier = (profile as any)?.plan_tier?.toLowerCase() || 'free';
  if (userPlanTier === 'free' || userPlanTier === 'free_demo') {
    return (
      <UpgradePrompt 
        title="Callbacks Scheduling"
        message="Callback scheduling is available on paid plans. Upgrade to the ₹99 Trial or a paid plan to schedule and track callbacks."
        upgradeLink="/dashboard/billing"
      />
    );
  }
  
  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);

  // States
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [stats, setStats] = useState({
    scheduled_count: 0,
    today_count: 0,
    missed_count: 0,
    completed_count: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Dropdown menu state per row
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/callbacks/stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const fetchCallbacks = async () => {
    try {
      setLoading(true);
      let url = `/api/callbacks?status=${statusFilter}&agent_id=${agentFilter}&priority=${priorityFilter}`;
      if (dateFilter) {
        url += `&date=${dateFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setCallbacks(data.data.callbacks || []);
      } else {
        throw new Error(data.error || "Failed to fetch callbacks");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load callbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCallbacks();
  }, [statusFilter, agentFilter, priorityFilter, dateFilter]);

  const handleCopyPhone = (e: React.MouseEvent, id: string, phone: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    toast.success("Phone number copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      
      toast.success(`Callback marked as ${newStatus}`);
      fetchStats();
      fetchCallbacks();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleDeleteCallback = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!window.confirm("Are you sure you want to delete this callback record?")) return;
    
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete callback");
      
      toast.success("Callback deleted successfully");
      fetchStats();
      fetchCallbacks();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  // Filter list locally based on search query
  const filteredCallbacks = callbacks.filter(item => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.prospect_name || "").toLowerCase().includes(query) ||
      (item.prospect_phone || "").includes(query)
    );
  });

  const priorityColors: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-500 border-rose-500/25",
    normal: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    low: "bg-gray-500/15 text-[var(--muted)] border-[var(--border)]"
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    missed: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    cancelled: "bg-gray-500/15 text-[var(--muted)] border-[var(--border)]"
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 pt-28 md:pt-28 font-montserrat text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--heading)] font-display uppercase tracking-wider">
            Scheduled Callbacks
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            Manage, schedule, and track automated or manual callback sessions with prospects.
          </p>
        </div>
        <button
          onClick={() => setIsScheduleOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Schedule Callback
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Scheduled / Upcoming */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" /> Upcoming Callbacks
          </span>
          <span className="text-2xl font-black text-[var(--heading)] font-mono">{stats.scheduled_count}</span>
        </div>

        {/* Scheduled Today */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-emerald-500" /> Scheduled Today
          </span>
          <span className="text-2xl font-black text-[var(--heading)] font-mono">{stats.today_count}</span>
        </div>

        {/* Completed */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Completed
          </span>
          <span className="text-2xl font-black text-[var(--heading)] font-mono">{stats.completed_count}</span>
        </div>

        {/* Missed */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm relative overflow-hidden flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Missed / Pending
          </span>
          <span className="text-2xl font-black text-[var(--heading)] font-mono">{stats.missed_count}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[var(--heading)] font-bold text-xs uppercase tracking-wider pb-3 border-b border-[var(--border)]">
          <SlidersHorizontal className="w-4 h-4 text-violet-500" /> Filters & Controls
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search prospect or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] placeholder-[var(--muted)] focus:outline-none focus:border-violet-500 transition-colors font-medium h-[38px]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 font-medium h-[38px] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Agent filter */}
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 font-medium h-[38px] cursor-pointer"
          >
            <option value="all">All Agents</option>
            {agents && agents.map((agent: any) => (
              <option key={agent.id} value={agent.id}>
                {cleanAgentName(agent.agent_name || agent.name || "")}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 font-medium h-[38px] cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>

          {/* Date Picker */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--body)] focus:outline-none focus:border-violet-500 font-medium h-[38px] cursor-pointer"
          />
        </div>
      </div>

      {/* Callbacks List / Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-[var(--hover-bg)]/20 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredCallbacks.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <CalendarClock className="w-14 h-14 text-[var(--muted)]/20 mb-4" />
            <h3 className="text-lg font-bold text-[var(--heading)] font-display uppercase tracking-wider">
              No Scheduled Callbacks
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1.5 max-w-sm leading-relaxed">
              When prospects request a callback during voice calls, they will appear here automatically. You can also schedule them manually.
            </p>
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="mt-6 px-5 py-2.5 bg-[var(--primary-bg)] hover:bg-[var(--hover-bg)] border border-[var(--border)] text-[var(--heading)] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              + Schedule Callback
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]/20 text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4 text-left">Prospect</th>
                    <th className="px-6 py-4 text-left">Phone</th>
                    <th className="px-6 py-4 text-left">Agent</th>
                    <th className="px-6 py-4 text-left">Scheduled Time</th>
                    <th className="px-6 py-4 text-center">Priority</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredCallbacks.map((item) => {
                    const isPast = new Date(item.scheduled_at) < new Date() && item.status === "scheduled";
                    
                    return (
                      <tr 
                        key={item.id} 
                        onClick={() => setSelectedCallback(item)}
                        className="hover:bg-[var(--hover-bg)]/20 transition-colors text-xs cursor-pointer group"
                      >
                        {/* Prospect */}
                        <td className="px-6 py-4 text-left font-bold text-[var(--heading)]">
                          {item.prospect_name || "Unknown"}
                          {item.lead && (
                            <span className="block text-[10px] font-medium text-[var(--muted)] mt-0.5">
                              Lead: {item.lead.full_name}
                            </span>
                          )}
                        </td>

                        {/* Phone */}
                        <td className="px-6 py-4 text-left font-mono text-[var(--body)] font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{item.prospect_phone}</span>
                            <button
                              onClick={(e) => handleCopyPhone(e, item.id, item.prospect_phone)}
                              className="p-1 rounded text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--hover-bg)] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Agent */}
                        <td className="px-6 py-4 text-left font-semibold text-[var(--body)]">
                          {cleanAgentName(item.agent?.name || "")}
                        </td>

                        {/* Scheduled Time */}
                        <td className="px-6 py-4 text-left font-mono font-medium text-[var(--body)]">
                          <div className={isPast ? "text-rose-500 font-bold" : ""}>
                            {new Date(item.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          {isPast ? (
                            <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold block mt-0.5">Overdue</span>
                          ) : (
                            <span className="text-[9px] text-[var(--muted)] font-medium block mt-0.5">Timezone: {item.timezone}</span>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded border ${priorityColors[item.priority]}`}>
                            {item.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded-md border ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right relative">
                          <div className="flex justify-end gap-2">
                            {item.status === "scheduled" && (
                              <>
                                <button
                                  onClick={(e) => handleStatusChange(e, item.id, "completed")}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/25 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                                  title="Mark Complete"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleStatusChange(e, item.id, "cancelled")}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                                  title="Cancel Callback"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(item.status === "completed" || item.status === "cancelled" || item.status === "missed") && (
                              <button
                                onClick={(e) => handleDeleteCallback(e, item.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-lg hover:shadow-sm transition-all cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-[var(--border)] p-4 space-y-4">
              {filteredCallbacks.map((item) => {
                const isPast = new Date(item.scheduled_at) < new Date() && item.status === "scheduled";
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedCallback(item)}
                    className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl flex flex-col justify-between text-left cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-[var(--heading)]">
                          {item.prospect_name || "Unknown"}
                        </span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded border ${priorityColors[item.priority]}`}>
                            {item.priority}
                          </span>
                          <span className={`px-2 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded-md border ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--body)] font-mono flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-[var(--muted)]" /> {item.prospect_phone}
                      </div>

                      <div className="text-xs text-[var(--body)] flex items-center gap-1.5 mt-2 font-mono">
                        <Clock className="w-4 h-4 text-[var(--muted)]" />
                        <span className={isPast ? "text-rose-500 font-bold" : ""}>
                          {new Date(item.scheduled_at).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-xs text-[var(--body)] font-semibold mt-2">
                        Agent: <span className="text-[var(--heading)]">{cleanAgentName(item.agent?.name || "")}</span>
                      </div>

                      {item.notes && (
                        <p className="text-xs text-[var(--muted)] mt-3 italic line-clamp-2 border-l-2 border-[var(--border)] pl-2">
                          "{item.notes}"
                        </p>
                      )}
                    </div>

                    {item.status === "scheduled" && (
                      <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-2 justify-end">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(e, item.id, "completed") }}
                          className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/25 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          Complete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStatusChange(e, item.id, "cancelled") }}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Manual Schedule Modal */}
      <ScheduleCallbackModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        onSuccess={() => {
          fetchStats();
          fetchCallbacks();
        }}
      />

      {/* Callback Detail Modal */}
      {selectedCallback && (
        <CallbackDetailModal
          isOpen={!!selectedCallback}
          onClose={() => setSelectedCallback(null)}
          callback={selectedCallback}
          onUpdate={() => {
            fetchStats();
            fetchCallbacks();
            setSelectedCallback(null);
          }}
        />
      )}
    </div>
  );
}
