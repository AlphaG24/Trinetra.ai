"use client";

import React, { useState } from "react";
import { 
  Building2, 
  Stethoscope, 
  Landmark, 
  GraduationCap, 
  ShoppingBag, 
  ArrowRight,
  Sparkles,
  TrendingUp
} from "lucide-react";

interface IndustryMetric {
  id: string;
  name: string;
  icon: React.ElementType;
  metric: string;
  metricLabel: string;
  result: string;
  tags: string[];
}

const INDUSTRIES: IndustryMetric[] = [
  {
    id: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    metric: "94%",
    metricLabel: "Show-Up Rate",
    result: "Automated 24/7 doctor appointment scheduling, triage, and post-op follow-ups in Hinglish.",
    tags: ["OPD Booking", "Doctor Roster Sync", "WhatsApp Reminder"],
  },
  {
    id: "realestate",
    name: "Real Estate Developers",
    icon: Building2,
    metric: "3.8x",
    metricLabel: "Visit Velocity",
    result: "Speed-to-lead under 15 seconds. Pre-qualifies budget and books site tours directly for agents.",
    tags: ["Lead Qualification", "Site Visits", "Calendar Sync"],
  },
  {
    id: "bfsi",
    name: "BFSI & Lending",
    icon: Landmark,
    metric: "62%",
    metricLabel: "Cost Reduction",
    result: "EMI reminders, KYC verification, and document collection with strict TRAI 09:00–21:00 compliance.",
    tags: ["EMI Reminders", "KYC Follow-up", "TRAI Locked"],
  },
  {
    id: "edtech",
    name: "EdTech & Education",
    icon: GraduationCap,
    metric: "4.1x",
    metricLabel: "Demo Attendance",
    result: "Warm counselor follow-ups for parent inquiries, counseling slot confirmations, and fee reminders.",
    tags: ["Counselor Calls", "Demo Bookings", "Parent Updates"],
  },
  {
    id: "d2c",
    name: "D2C & E-Commerce",
    icon: ShoppingBag,
    metric: "-48%",
    metricLabel: "RTO Drop",
    result: "Instant Cash-on-Delivery address verification and abandoned cart recovery calls across 12 languages.",
    tags: ["COD Verification", "Address Confirmation", "12 Languages"],
  },
];

export function IndustriesWeServe() {
  const [selectedId, setSelectedId] = useState<string>("healthcare");

  return (
    <section id="industries" className="w-full bg-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-100">
      <div className="mx-auto max-w-[1360px]">
        
        {/* Header: Minimal & Clear */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/80 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>MEASURABLE OUTCOMES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Proven Results Across Indian Verticals
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md font-normal leading-relaxed">
            Every vertical deployment includes custom vernacular dialogue models, CRM webhooks, and regulatory safeguards.
          </p>
        </div>

        {/* 5-Column Clean Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            const isSelected = ind.id === selectedId;

            return (
              <div
                key={ind.id}
                onClick={() => setSelectedId(ind.id)}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10 -translate-y-1"
                    : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-900"
                }`}
              >
                <div>
                  {/* Top Bar: Icon & Name */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-800"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                      isSelected ? "text-emerald-400" : "text-emerald-700"
                    }`}>
                      VERIFIED
                    </span>
                  </div>

                  <h3 className={`text-base font-bold tracking-tight mb-4 ${isSelected ? "text-white" : "text-slate-900"}`}>
                    {ind.name}
                  </h3>

                  {/* Big Impact Metric */}
                  <div className="mb-4">
                    <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                      isSelected ? "text-emerald-400" : "text-slate-900"
                    }`}>
                      {ind.metric}
                    </span>
                    <p className={`text-[11px] font-mono uppercase tracking-wider mt-0.5 ${
                      isSelected ? "text-slate-400" : "text-slate-500"
                    }`}>
                      {ind.metricLabel}
                    </p>
                  </div>

                  <p className={`text-xs leading-relaxed mb-6 ${
                    isSelected ? "text-slate-300" : "text-slate-600"
                  }`}>
                    {ind.result}
                  </p>
                </div>

                {/* Bottom Tags */}
                <div className="pt-4 border-t border-slate-100/10 flex flex-wrap gap-1.5">
                  {ind.tags.map((t, i) => (
                    <span
                      key={i}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        isSelected 
                          ? "bg-white/10 text-slate-300" 
                          : "bg-slate-100 text-slate-600 border border-slate-200/60"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
