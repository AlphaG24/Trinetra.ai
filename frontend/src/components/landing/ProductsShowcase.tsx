"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PhoneCall, 
  PhoneOutgoing, 
  Cpu, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Zap,
  Clock,
  ShieldCheck,
  Calendar,
  Layers
} from "lucide-react";
import Link from "next/link";

interface CapabilityTab {
  id: string;
  badge: string;
  title: string;
  outcome: string;
  metrics: { label: string; value: string }[];
  visual: {
    statusBadge: string;
    headline: string;
    subline: string;
    actionDone: string;
    latency: string;
  };
}

const TABS: CapabilityTab[] = [
  {
    id: "inbound",
    badge: "INBOUND CONCIERGE",
    title: "24/7 Front-Desk Resolution",
    outcome: "Zero wait times. Answers questions, qualifies callers, and books calendar slots instantly.",
    metrics: [
      { label: "Hold Time", value: "0 sec" },
      { label: "Resolution", value: "94.2%" },
      { label: "Concurrency", value: "Unlimited" },
    ],
    visual: {
      statusBadge: "LIVE CALL // APPOINTMENT CONFIRMED",
      headline: "Apollo Clinic: Dr. Sharma consultation booked",
      subline: "Patient requested tomorrow 5:30 PM slot in Hinglish. Slot locked in Google Calendar.",
      actionDone: "WhatsApp confirmation & SMS link dispatched instantly",
      latency: "410ms turn-taking",
    },
  },
  {
    id: "outbound",
    badge: "OUTBOUND SCALE",
    title: "10,000+ Concurrent Outreach",
    outcome: "Autonomous lead follow-ups, payment reminders, and renewals with strict TRAI pacing.",
    metrics: [
      { label: "Dial Pacing", value: "Instant" },
      { label: "DND Scrub", value: "100% Pre-Call" },
      { label: "Pickup Rate", value: "3.8x higher" },
    ],
    visual: {
      statusBadge: "ACTIVE CAMPAIGN // HOT LEAD QUALIFIED",
      headline: "DLF Luxury: 3BHK visit scheduled for Saturday",
      subline: "Prospect budget verified (₹2.4 Cr). Call auto-transferred to senior relationship manager.",
      actionDone: "Lead status synced to Salesforce & CRM tag updated",
      latency: "440ms turn-taking",
    },
  },
  {
    id: "intelligence",
    badge: "LIVE INTELLIGENCE",
    title: "CRM Sync & Sentiment Audit",
    outcome: "Every conversation transcribed, summarized, and scored for QA without human note-taking.",
    metrics: [
      { label: "CRM Sync", value: "Real-time" },
      { label: "QA Scoring", value: "Automated" },
      { label: "PII Masked", value: "100%" },
    ],
    visual: {
      statusBadge: "AUDIT COMPLETE // SENTIMENT: POSITIVE",
      headline: "Autonomous Call Summary & QA Rating: 98/100",
      subline: "Key intents extracted: Price inquiry, immediate delivery needed, location: Whitefield, Bangalore.",
      actionDone: "Structured JSON pushed to webhook endpoint & Zoho CRM",
      latency: "Edge transcription",
    },
  },
];

export function ProductsShowcase() {
  const [activeTab, setActiveTab] = useState<string>("inbound");
  const current = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <section id="products" className="w-full bg-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-100">
      <div className="mx-auto max-w-[1360px]">
        
        {/* Section Header: Minimal & Punchy */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-200/80 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <span>CAPABILITIES</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Autonomous Voice for Every Workflow
            </h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md font-normal leading-relaxed">
            Replace manual call centers and rigid IVR menus with intelligent conversational agents tailored for Indian enterprise scale.
          </p>
        </div>

        {/* Tab Controls: Minimalist Segmented Bar */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                    : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400" : "bg-slate-400"}`} />
                {tab.badge}
              </button>
            );
          })}
        </div>

        {/* Interactive Capability Card: Clean, Compact, High-Impact */}
        <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/30 p-6 sm:p-10 shadow-sm overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
            >
              {/* Left Column: Direct Impact & Metrics */}
              <div className="lg:col-span-5 flex flex-col justify-center">
                <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-700 uppercase mb-2">
                  {current.badge}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
                  {current.title}
                </h3>
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-8">
                  {current.outcome}
                </p>

                {/* 3 Hard Numbers */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/80">
                  {current.metrics.map((m, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {m.value}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <a
                    href="#live-demo"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs sm:text-sm font-semibold hover:bg-black transition-all"
                  >
                    <span>Test This In Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Right Column: Live Outcome Visualization Card */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
                  
                  {/* Status Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-[11px] font-mono font-bold tracking-wider text-slate-700">
                        {current.visual.statusBadge}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full font-semibold">
                      {current.visual.latency}
                    </span>
                  </div>

                  {/* Core Result Preview */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                        {current.visual.headline}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {current.visual.subline}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/50 text-emerald-900 text-xs sm:text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{current.visual.actionDone}</span>
                    </div>
                  </div>

                  {/* Subtle Telemetry Strip */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>STATUS: RESOLVED</span>
                    <span>SECURITY: DPDP COMPLIANT</span>
                  </div>

                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
