"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CalendarClock, Clock, Tag, RefreshCw, CheckCircle2, 
  ExternalLink, Calendar, AlertTriangle, Check, Trash2
} from "lucide-react";
import { CallbackDetailModal } from "../callbacks/CallbackDetailModal";
import { toast } from "sonner";

interface Callback {
  id: string;
  prospect_name: string;
  prospect_phone: string;
  scheduled_at: string;
  priority: string;
  status: string;
  notes: string;
}

export function AgentCallbacksTab({ agent }: { agent: any }) {
  const [callbacks, setCallbacks] = useState<Callback[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    upcoming: 0,
    today: 0,
    missed: 0
  });

  const [selectedCallback, setSelectedCallback] = useState<Callback | null>(null);

  const fetchAgentCallbacks = async () => {
    if (!agent?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/callbacks?agent_id=${agent.id}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch agent callbacks");

      const list = data.data.callbacks || [];
      setCallbacks(list);
      
      // Calculate stats based on fetched list
      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const endOfToday = new Date();
      endOfToday.setHours(23,59,59,999);

      let upcoming = 0;
      let today = 0;
      let missed = 0;

      list.forEach((item: Callback) => {
        const itemDate = new Date(item.scheduled_at);
        if (item.status === "scheduled") {
          upcoming++;
          if (itemDate >= startOfToday && itemDate <= endOfToday) {
            today++;
          }
          if (itemDate < now) {
            missed++; // Scheduled but in the past = missed
          }
        } else if (item.status === "missed") {
          missed++;
        }
      });

      setStats({ upcoming, today, missed });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to load callbacks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentCallbacks();
  }, [agent?.id]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      
      toast.success(`Callback marked as ${newStatus}`);
      fetchAgentCallbacks();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleDeleteCallback = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this callback?")) return;
    try {
      const res = await fetch(`/api/callbacks/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete callback");
      toast.success("Callback deleted successfully");
      fetchAgentCallbacks();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const priorityColors: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-500 border-rose-500/25",
    normal: "bg-blue-500/10 text-blue-500 border-blue-500/25",
    low: "bg-gray-500/10 text-[var(--muted)] border-[var(--border)]"
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-[var(--hover-bg)] rounded-xl" />
          <div className="h-20 bg-[var(--hover-bg)] rounded-xl" />
          <div className="h-20 bg-[var(--hover-bg)] rounded-xl" />
        </div>
        <div className="h-48 bg-[var(--hover-bg)] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-montserrat">
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-base font-bold text-[var(--heading)] font-display uppercase tracking-wider">
            Agent Callbacks
          </h4>
          <p className="text-xs text-[var(--muted)] mt-1">
            Proactively follow up with prospects who requested calls
          </p>
        </div>
        <Link 
          href="/dashboard/callbacks" 
          className="inline-flex items-center gap-1.5 text-xs text-violet-500 hover:underline font-bold"
        >
          View Central Dashboard <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Mini Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Upcoming
          </span>
          <span className="text-xl font-bold text-[var(--heading)] font-mono">{stats.upcoming}</span>
        </div>
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Scheduled Today
          </span>
          <span className="text-xl font-bold text-[var(--heading)] font-mono">{stats.today}</span>
        </div>
        <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl p-4 flex flex-col text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Missed / Pending
          </span>
          <span className="text-xl font-bold text-[var(--heading)] font-mono">{stats.missed}</span>
        </div>
      </div>

      {/* List of callbacks */}
      <div className="space-y-3">
        {callbacks.length === 0 ? (
          <div className="py-12 border border-dashed border-[var(--border)] rounded-2xl text-center">
            <CalendarClock className="w-10 h-10 text-[var(--muted)]/20 mx-auto mb-3" />
            <h5 className="text-sm font-bold text-[var(--heading)]">No callbacks scheduled</h5>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-xs mx-auto">
              When prospects request a callback during calls with this agent, they will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {callbacks.map((item) => {
              const isPast = new Date(item.scheduled_at) < new Date() && item.status === "scheduled";
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedCallback(item)}
                  className="p-4 bg-[var(--background)] hover:bg-[var(--hover-bg)]/20 border border-[var(--border)] rounded-xl transition-all flex flex-col justify-between text-left cursor-pointer group relative"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-[var(--heading)] truncate">
                        {item.prospect_name || "Unknown"}
                      </span>
                      <span className={`px-2 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded border ${priorityColors[item.priority]}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--body)] font-mono flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[var(--muted)]" /> {item.prospect_phone}
                    </div>

                    <div className="text-[11px] text-[var(--body)] flex items-center gap-1.5 mt-1.5 font-mono">
                      <Clock className="w-3.5 h-3.5 text-[var(--muted)]" /> 
                      <span className={isPast ? "text-rose-500 font-bold" : ""}>
                        {new Date(item.scheduled_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      {isPast && <span className="text-[8px] uppercase tracking-wider px-1 bg-rose-500/10 text-rose-500 border border-rose-500/25 rounded">Overdue</span>}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-[var(--muted)] mt-2.5 line-clamp-2 italic border-l-2 border-[var(--border)] pl-2">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border)] flex gap-2 justify-between items-center opacity-75 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDeleteCallback(e, item.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/25 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                      title="Delete Callback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex gap-2">
                      {item.status === "scheduled" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(item.id, "completed") }}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/25 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                            title="Mark Complete"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedCallback(item) }}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/25 rounded-lg text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                            title="Reschedule"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Callback Detail Modal */}
      {selectedCallback && (
        <CallbackDetailModal
          isOpen={!!selectedCallback}
          onClose={() => setSelectedCallback(null)}
          callback={selectedCallback}
          onUpdate={() => {
            fetchAgentCallbacks();
            setSelectedCallback(null);
          }}
        />
      )}
    </div>
  );
}

// Simple Phone Icon helper since we only imported Lucide icons
function Phone({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}
