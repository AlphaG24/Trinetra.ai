"use client";

import { Copy, MapPin, Smartphone, Check } from "lucide-react";
import { useState } from "react";

export interface NumberCardProps {
  phoneNumber: {
    id: string;
    phone_number: string;
    city: string;
    did_type: string;
    provider: string;
    status: 'active' | 'provisioning' | string;
    provisioned_at: string;
    assigned_agents: Array<{
      agent_id: string;
      agent_name: string;
      is_primary: boolean;
    }>;
    display_price?: string;
  };
  onManage: (id: string) => void;
}

export function NumberCard({ phoneNumber, onManage }: NumberCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber.phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPhone = (phone: string) => {
    // E.g. +91 022 456789 -> wait, it's just a visual format, let's just do a basic spacing
    // If it's +91 or +1 we can add spaces after country code
    if (phone.startsWith("+91")) return `+91 ${phone.slice(3, 7)} ${phone.slice(7)}`;
    if (phone.startsWith("+1")) return `+1 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    return phone;
  };

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl shadow-sm hover:border-[var(--primary-bg)] hover:shadow-md hover:-translate-y-[2px] transition-all duration-150 p-5 cursor-pointer">
      {/* Top Row: Status and Provider */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${phoneNumber.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="text-xs text-[var(--muted)] capitalize">{phoneNumber.status}</span>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-xs text-[var(--muted)]">
          {phoneNumber.provider === 'voicelink' ? 'VoiceLink' : phoneNumber.provider === 'twilio' ? 'Twilio' : 'Provider'}
        </div>
      </div>

      {/* Phone Number */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-2xl font-bold tracking-wide text-[var(--heading)]">
          {formatPhone(phoneNumber.phone_number)}
        </h3>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          aria-label="Copy phone number"
          className="text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
        >
          {copied ? <Check size={18} className="text-green-500 scale-in" /> : <Copy size={18} />}
        </button>
      </div>

      {/* Location & Type */}
      <div className="flex flex-row gap-2 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--secondary)] text-xs text-[var(--muted)]">
          <MapPin size={12} aria-hidden="true" />
          <span>{phoneNumber.city || 'Any'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--secondary)] text-xs text-[var(--muted)]">
          <Smartphone size={12} aria-hidden="true" />
          <span className="capitalize">{phoneNumber.did_type}</span>
        </div>
      </div>

      {/* Assigned Agents */}
      <div className="mb-6 h-12">
        {phoneNumber.assigned_agents && phoneNumber.assigned_agents.length > 0 ? (
          <div>
            <span className="text-xs text-[var(--muted)] block mb-1">Assigned to:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {phoneNumber.assigned_agents.slice(0, 2).map(agent => (
                <div key={agent.agent_id} className="text-sm text-[var(--heading)] flex items-center gap-1.5">
                  <span className="font-medium hover:underline">{agent.agent_name}</span>
                  {agent.is_primary && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-wider font-semibold">
                      Primary
                    </span>
                  )}
                </div>
              ))}
              {phoneNumber.assigned_agents.length > 2 && (
                <span className="text-xs text-[var(--muted)]">+{phoneNumber.assigned_agents.length - 2} more</span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center">
            <span className="text-sm text-[var(--muted)] italic">Not assigned</span>
          </div>
        )}
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
        <span className="text-sm text-[var(--muted)]">
          {phoneNumber.display_price || "Billed monthly"}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onManage(phoneNumber.id); }}
          className="text-sm font-medium text-[var(--heading)] hover:underline"
        >
          Manage
        </button>
      </div>
    </div>
  );
}
