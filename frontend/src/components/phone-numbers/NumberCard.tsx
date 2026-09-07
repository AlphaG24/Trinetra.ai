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
    status: 'active' | 'provisioning' | 'available' | string;
    provisioned_at?: string;
    retail_price_paisa?: number;
    renewal_date?: string;
    bidding_enabled?: boolean;
    current_bid_paisa?: number;
    minimum_bid_paisa?: number;
    bid_count?: number;
    is_assigned?: boolean;
    assigned_agents?: Array<{
      agent_id: string;
      agent_name: string;
      is_primary: boolean;
    }>;
    display_price?: string;
  };
  onManage?: (id: string) => void;
  onRenew?: (id: string) => void;
  onBuyNow?: (num: any) => void;
  onPlaceBid?: (num: any) => void;
  onClaimBid?: (num: any) => void;
  isPoolItem?: boolean;
  isBuying?: boolean;
  hasWinningBid?: boolean;
}

export function NumberCard({ 
  phoneNumber, 
  onManage, 
  onRenew, 
  onBuyNow, 
  onPlaceBid,
  onClaimBid,
  isPoolItem = false,
  isBuying = false,
  hasWinningBid = false
}: NumberCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber.phone_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith("+91")) return `+91 ${phone.slice(3, 7)} ${phone.slice(7)}`;
    if (phone.startsWith("+1")) return `+1 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    return phone;
  };

  const formattedPrice = phoneNumber.retail_price_paisa 
    ? `₹${(phoneNumber.retail_price_paisa / 100).toFixed(0)}/mo` 
    : (phoneNumber.display_price || "₹299/mo");

  const formattedRenewal = phoneNumber.renewal_date
    ? new Date(phoneNumber.renewal_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : null;

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-violet-500/40 hover:shadow-md transition-all duration-150 p-5 flex flex-col justify-between text-left">
      <div>
        {/* Top Row: Status and Provider */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${phoneNumber.status === 'available' ? 'bg-emerald-500' : phoneNumber.status === 'active' ? 'bg-green-500' : 'bg-amber-500'}`} />
            <span className="text-xs font-semibold text-[var(--muted)] capitalize">{phoneNumber.status}</span>
          </div>
          <div className="px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            {phoneNumber.provider === 'sarvam' ? 'Sarvam AI' : phoneNumber.provider === 'twilio' ? 'Twilio' : phoneNumber.provider || 'Provider'}
          </div>
        </div>

        {/* Phone Number */}
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-xl font-mono font-bold tracking-wider text-[var(--heading)]">
            {formatPhone(phoneNumber.phone_number)}
          </h3>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            aria-label="Copy phone number"
            className="text-[var(--muted)] hover:text-[var(--heading)] transition-colors p-1"
          >
            {copied ? <Check size={16} className="text-green-500 scale-in" /> : <Copy size={16} />}
          </button>
        </div>

        {/* Location & Type */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--secondary)] text-xs text-[var(--muted)] font-medium">
            <MapPin size={11} aria-hidden="true" />
            <span>{phoneNumber.city || 'India'}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--secondary)] text-xs text-[var(--muted)] font-medium">
            <Smartphone size={11} aria-hidden="true" />
            <span className="capitalize">{phoneNumber.did_type || 'mobile'}</span>
          </div>
        </div>

        {/* Assigned Agents or Pool badge */}
        <div className="mb-4 min-h-[40px]">
          {isPoolItem ? (
            <div className="text-xs text-[var(--muted)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Ready for Instant Assignment
              </span>
            </div>
          ) : phoneNumber.assigned_agents && phoneNumber.assigned_agents.length > 0 ? (
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">Assigned Agent</span>
              <div className="flex items-center gap-2 flex-wrap">
                {phoneNumber.assigned_agents.slice(0, 2).map(agent => (
                  <div key={agent.agent_id} className="text-xs text-[var(--heading)] flex items-center gap-1.5 font-semibold">
                    <span>{agent.agent_name}</span>
                    {agent.is_primary && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wider font-bold">
                        Primary
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center text-xs text-[var(--muted)] italic">
              Unassigned to agent
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div className="flex flex-col text-left">
          <span className="text-[10px] font-bold text-violet-400 font-mono">{formattedPrice}</span>
          {phoneNumber.bidding_enabled && (
            <span className="text-[9px] font-bold text-emerald-400 font-mono mt-0.5">
              {phoneNumber.current_bid_paisa 
                ? `Highest Bid: ₹${(phoneNumber.current_bid_paisa / 100).toFixed(0)}`
                : phoneNumber.minimum_bid_paisa 
                  ? `Min Bid: ₹${(phoneNumber.minimum_bid_paisa / 100).toFixed(0)}` 
                  : "Bidding Open"}
            </span>
          )}
          {formattedRenewal && (
            <span className="text-[9px] text-[var(--muted)] font-medium">Renews: {formattedRenewal}</span>
          )}
        </div>

        {hasWinningBid ? (
          <button
            onClick={() => onClaimBid && onClaimBid(phoneNumber)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20 animate-pulse"
          >
            Claim Winning Bid
          </button>
        ) : isPoolItem ? (
          phoneNumber.bidding_enabled ? (
            <button
              onClick={() => onPlaceBid && onPlaceBid(phoneNumber)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-emerald-600/20"
            >
              {phoneNumber.is_assigned ? "Bid for Next Cycle" : "Bid Now"}
            </button>
          ) : (
            <button
              onClick={() => onBuyNow && onBuyNow(phoneNumber)}
              disabled={isBuying}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm shadow-violet-600/20"
            >
              {isBuying ? "Processing..." : "Buy Now"}
            </button>
          )
        ) : (
          <div className="flex items-center gap-2">
            {onRenew && (
              <button
                onClick={() => onRenew(phoneNumber.id)}
                className="text-xs font-bold text-violet-400 hover:underline"
              >
                Renew
              </button>
            )}
            {onManage && (
              <button 
                onClick={() => onManage(phoneNumber.id)}
                className="px-3 py-1 rounded-lg bg-[var(--secondary)] hover:bg-[var(--border)] text-xs font-bold text-[var(--heading)] transition-all"
              >
                Manage
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

