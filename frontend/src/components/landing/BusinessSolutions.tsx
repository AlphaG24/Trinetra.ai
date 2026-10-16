"use client";

import React, { useState } from "react";
import { 
  Headphones, 
  TrendingUp, 
  CreditCard, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Layers
} from "lucide-react";
import Link from "next/link";

interface SolutionItem {
  id: string;
  badge: string;
  title: string;
  metric: string;
  metricLabel: string;
  headline: string;
  description: string;
  capabilities: string[];
  icon: React.ElementType;
}

const SOLUTIONS: SolutionItem[] = [
  {
    id: "support",
    badge: "01 // CUSTOMER SUPPORT",
    title: "Inbound Support & Front Desk",
    metric: "82%",
    metricLabel: "Autonomous Deflection",
    headline: "Zero hold times. Instant answers and automated ticket resolution 24/7.",
    description:
      "Field incoming phone calls with an agent that understands Indian English, Hindi, and regional accents. Solves common queries, verifies caller accounts, and escalates complex tickets gracefully.",
    capabilities: [
      "Zero ring-time drop-offs with unlimited concurrent line scale",
      "Native calendar integration for instant booking & scheduling",
      "Automated WhatsApp & SMS summary dispatch to callers",
    ],
    icon: Headphones,
  },
  {
    id: "sales",
    badge: "02 // SALES & REVENUE",
    title: "Outbound Sales & Lead Qualification",
    metric: "3.8x",
    metricLabel: "Faster Lead Conversion",
    headline: "Engage web leads in under 15 seconds. Qualify intent and book demos.",
    description:
      "Eliminate lead decay by reaching prospects while they are actively evaluating your product. The agent handles common objections, checks budget criteria, and transfers qualified leads directly to senior reps.",
    capabilities: [
      "Speed-to-lead under 15 seconds from form submission",
      "Dynamic lead scoring & automated CRM field synchronization",
      "Seamless warm transfer to live human sales specialists",
    ],
    icon: TrendingUp,
  },
  {
    id: "operations",
    badge: "03 // BILLING & OPERATIONS",
    title: "Collections & Operational Logistics",
    metric: "64%",
    metricLabel: "Cost Reduction",
    headline: "Automate EMI reminders, KYC follow-ups, and COD order confirmations.",
    description:
      "Execute high-volume outbound campaigns with automated TRAI 09:00–21:00 hours enforcement and real-time National DND registry scrubbing. Secure, compliant, and cost-efficient.",
    capabilities: [
      "Strict TRAI calling hour floor locks (09:00 - 21:00 IST)",
      "Automated real-time DND scrubbing before each call dispatch",
      "Payment link dispatch via WhatsApp and SMS during call",
    ],
    icon: CreditCard,
  },
  {
    id: "healthcare",
    badge: "04 // HEALTHCARE & CLINICS",
    title: "Patient Triage & Appointment Logistics",
    metric: "94%",
    metricLabel: "Appointment Show-Up Rate",
    headline: "OPD scheduling, fasting prep instructions, and post-op checkups.",
    description:
      "Designed for hospital chains and specialty clinics. Ingests doctor rosters, manages patient appointments, answers pre-diagnostic prep queries, and sends directions on WhatsApp.",
    capabilities: [
      "Full doctor roster & clinic calendar synchronization",
      "Empathetic Hinglish and regional vernacular patient triage",
      "Automated pre-consultation fasting & diagnostic prep reminders",
    ],
    icon: Stethoscope,
  },
];

export function BusinessSolutions() {
  const [selectedSolution, setSelectedSolution] = useState<string>("support");
  const current = SOLUTIONS.find((s) => s.id === selectedSolution) || SOLUTIONS[0];

  return (
    <section id="solutions" className="w-full bg-slate-50/70 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[1360px]">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/80 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>ENTERPRISE SOLUTIONS</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Purpose-Built for Core Business Workflows
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md font-normal leading-relaxed">
            Replace manual call floor salaries and rigid IVR menus with autonomous voice agents trained on your domain.
          </p>
        </div>

        {/* 4 Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SOLUTIONS.map((sol) => {
            const Icon = sol.icon;
            const isSelected = sol.id === selectedSolution;

            return (
              <div
                key={sol.id}
                onClick={() => setSelectedSolution(sol.id)}
                className={`rounded-2xl border p-7 sm:p-8 flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "border-slate-900 bg-white shadow-lg ring-1 ring-slate-900/10 -translate-y-1"
                    : "border-slate-200/90 bg-white/90 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div>
                  {/* Top Bar: Icon & Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-900">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                      {sol.badge.split("//")[0].trim()}
                    </span>
                  </div>

                  {/* Impact Stat */}
                  <div className="mb-4">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {sol.metric}
                    </span>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-semibold mt-0.5">
                      {sol.metricLabel}
                    </p>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-2">
                    {sol.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mb-6">
                    {sol.headline}
                  </p>

                  {/* 3 Capabilities */}
                  <div className="space-y-2.5 pt-4 border-t border-slate-100">
                    {sol.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>Explore Workflow</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
