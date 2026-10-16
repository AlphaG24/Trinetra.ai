"use client";

import React from "react";
import { 
  ShieldCheck, 
  Lock, 
  Clock, 
  Server, 
  Zap, 
  Globe2, 
  CheckCircle2, 
  Check 
} from "lucide-react";

const TRUST_PILLARS = [
  {
    icon: Zap,
    metric: "< 480ms",
    title: "Sub-Second Edge Latency",
    desc: "Instant conversational turn-taking with immediate speech recognition. Understands caller interruptions naturally.",
  },
  {
    icon: Globe2,
    metric: "12+ Dialects",
    title: "Vernacular Code-Switching",
    desc: "Effortless fluid switching between English, Hindi, Hinglish, and regional languages mid-sentence with cultural warmth.",
  },
  {
    icon: Clock,
    metric: "09:00 - 21:00",
    title: "Automated TRAI Pacing",
    desc: "Hard-locked calling hour enforcement and real-time NCPR DND registry scrubbing on every single outbound dial.",
  },
  {
    icon: Server,
    metric: "100% Sovereign",
    title: "Indian DPDP Data Residency",
    desc: "Audio streams, call logs, and inferences stay strictly in Mumbai and Delhi nodes. Automated PII masking on phone and Aadhaar numbers.",
  },
];

const TRUST_BADGES = [
  "TRAI Certified Pacing",
  "NCPR DND Pre-Scrubbed",
  "DPDP Act 2023 In-Country",
  "Automated PII Redaction",
  "Statutory Telecom KYC",
  "99.99% Enterprise Uptime",
];

export function ComplianceTrust() {
  return (
    <section id="compliance" className="w-full bg-transparent py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[1360px]">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/80 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>ENTERPRISE ARCHITECTURE &amp; TRUST</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Built for Indian Telecom Scale &amp; Legal Compliance
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md font-normal leading-relaxed">
            Zero regulatory liability. We manage telecom filings, caller reputation, and data sovereignty out of the box.
          </p>
        </div>

        {/* 4 Clean Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {TRUST_PILLARS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-800">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm font-mono font-bold text-emerald-700">
                      {item.metric}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Horizontal Compliance Ribbon */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-mono font-bold text-slate-900 tracking-wider uppercase">
              STATUTORY COMPLIANCE ASSURANCE
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {TRUST_BADGES.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>{badge}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
