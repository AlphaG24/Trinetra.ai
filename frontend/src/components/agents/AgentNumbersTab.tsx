import React, { useEffect, useState } from "react";
import { Phone, Copy, Check, Info, PhoneOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface AgentNumbersTabProps {
  agentId: string;
  organizationId: string;
}

export function AgentNumbersTab({ agentId, organizationId }: AgentNumbersTabProps) {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchNumbers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phone-numbers?organization_id=${organizationId}`);
      if (!res.ok) throw new Error("Failed to fetch numbers");
      const data = await res.json();
      
      // Filter numbers assigned to this agent
      const numbersList = data.data?.phone_numbers || data.data || [];
      const assigned = Array.isArray(numbersList) 
        ? numbersList.filter((n: any) => n.assigned_agents?.some((a: any) => a.agent_id === agentId))
        : [];
      setNumbers(assigned);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load assigned phone numbers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers();
  }, [agentId, organizationId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Number copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg" />
        <div className="h-20 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg p-4 text-center">
        <p className="text-sm font-medium mb-3">{error}</p>
        <button 
          onClick={fetchNumbers}
          className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (numbers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl flex items-center justify-center text-[var(--muted)] mb-4">
          <PhoneOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-[var(--heading)] font-display mb-2">No number assigned</h3>
        <p className="text-[var(--muted)] text-sm max-w-sm mb-6">
          This agent does not have any assigned phone numbers. Assign an existing number or provision a new one centrally.
        </p>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/phone-numbers"
            className="bg-violet-600 hover:bg-violet-700 text-white transition-all rounded-lg px-5 py-2 font-bold text-xs uppercase tracking-wider shadow-md"
          >
            Manage Phone Numbers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--heading)] font-display">Phone Numbers</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Numbers assigned to this agent (read-only)</p>
        </div>
        <Link 
          href="/dashboard/phone-numbers"
          className="text-xs font-bold text-[var(--secondary)] hover:opacity-80 transition-opacity"
        >
          Manage All Numbers &rarr;
        </Link>
      </div>

      <div className="space-y-3">
        {numbers.map(number => {
          const assignment = number.assigned_agents?.find((a: any) => a.agent_id === agentId);
          const isPrimary = assignment?.is_primary;

          return (
            <div 
              key={number.id} 
              className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 transition-colors hover:border-[var(--primary-bg)]/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-[var(--heading)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-[var(--heading)] font-mono">{number.phone_number}</span>
                    <button 
                      onClick={() => handleCopy(number.phone_number, number.id)}
                      className="text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
                    >
                      {copiedId === number.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {isPrimary && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
                    <span className="capitalize">{number.city}, {number.did_type.toLowerCase()}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                    <span>&bull;</span>
                    <span>Billed monthly</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 flex items-start sm:items-center gap-3">
        <Info className="w-5 h-5 text-[var(--heading)] shrink-0 mt-0.5 sm:mt-0" />
        <div className="flex-1">
          <p className="text-sm text-[var(--heading)]">
            Phone numbers are managed centrally on the Phone Numbers console. You can assign and configure them for any agent there.
          </p>
        </div>
        <Link 
          href="/dashboard/phone-numbers"
          className="shrink-0 bg-violet-650 text-white hover:bg-violet-600 transition-all rounded-lg px-4 py-2 font-bold text-xs uppercase tracking-wider shadow-md"
        >
          Manage Numbers &rarr;
        </Link>
      </div>
    </div>
  );
}
