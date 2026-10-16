"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Bot,
  Users,
  PhoneCall,
  Megaphone,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  Calendar,
  Target,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  Phone,
  Sparkles,
  ShieldCheck,
  Zap,
  Building2,
  Stethoscope,
  GraduationCap,
  ShoppingBag,
  Landmark,
} from "lucide-react";

interface IndustryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  greetingBusiness: string;
  kpis: {
    interactions: string;
    interactionsChange: string;
    agentsCount: string;
    leadsCount: string;
    leadsChange: string;
    resolutionRate: string;
    revenueSaved: string;
  };
  activeAgents: {
    name: string;
    role: string;
    languages: string;
    status: "Live on Call" | "Standby / Ready" | "Dialing Outbound";
    latency: string;
  }[];
  recentActivities: {
    id: string;
    phone: string;
    event: string;
    outcome: string;
    time: string;
    tag: string;
    tagColor: string;
  }[];
}

const INDUSTRIES: IndustryConfig[] = [
  {
    id: "real-estate",
    name: "Real Estate",
    icon: Building2,
    tagline: "Instant site-visit bookings & zero missed high-ticket buyers.",
    greetingBusiness: "Lodha & Prestige Luxury Living",
    kpis: {
      interactions: "18,420",
      interactionsChange: "+24.8% this month",
      agentsCount: "3 Active Closers",
      leadsCount: "2,140 High-Intent",
      leadsChange: "+38% visit conversions",
      resolutionRate: "91.2%",
      revenueSaved: "₹42.8 Lakhs",
    },
    activeAgents: [
      {
        name: "Vikram Property Closer",
        role: "Inbound Buyer Inquiries & Budget Qualification",
        languages: "Hindi • Hinglish • English",
        status: "Live on Call",
        latency: "410ms",
      },
      {
        name: "Meera Site-Visit Booker",
        role: "Calendar Synchronization & WhatsApp Confirmations",
        languages: "Marathi • Hindi • English",
        status: "Standby / Ready",
        latency: "390ms",
      },
      {
        name: "Arika Outbound Follow-up",
        role: "Pre-Launch VIP Buyer Outreach (TRAI Consented)",
        languages: "Gujarati • Hindi • English",
        status: "Dialing Outbound",
        latency: "430ms",
      },
    ],
    recentActivities: [
      {
        id: "re-1",
        phone: "+91 98201 ****4",
        event: "Site Visit Scheduled",
        outcome: "3BHK Sky Villa • Saturday 11:30 AM",
        time: "1m ago",
        tag: "High Intent",
        tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      {
        id: "re-2",
        phone: "+91 98912 ****8",
        event: "Budget Qualified",
        outcome: "₹2.5 Cr - ₹3 Cr range • Downpayment ready",
        time: "4m ago",
        tag: "VIP Buyer",
        tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      },
      {
        id: "re-3",
        phone: "+91 91672 ****1",
        event: "Brochure & Pricing Dispatched",
        outcome: "Sent via WhatsApp with payment breakdown",
        time: "9m ago",
        tag: "Automated",
        tagColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare & Clinics",
    icon: Stethoscope,
    tagline: "24/7 doctor appointments, emergency triage & OPD inquiries.",
    greetingBusiness: "Apollo Health & Wellness Hospitals",
    kpis: {
      interactions: "26,850",
      interactionsChange: "+31.2% this month",
      agentsCount: "4 Triage Agents",
      leadsCount: "3,890 Appointments",
      leadsChange: "99.4% slot fill rate",
      resolutionRate: "94.6%",
      revenueSaved: "₹28.4 Lakhs",
    },
    activeAgents: [
      {
        name: "Dr. Arika Triage Desk",
        role: "OPD Appointments & Speciality Triage",
        languages: "Hindi • Tamil • English",
        status: "Live on Call",
        latency: "385ms",
      },
      {
        name: "Vikram Emergency Queue",
        role: "Night-Shift Escalations & Ambulance Routing",
        languages: "Kannada • Hindi • English",
        status: "Standby / Ready",
        latency: "370ms",
      },
      {
        name: "Neha Lab Report Assistant",
        role: "Test Result Dispatch & Pre-Fast Guidance",
        languages: "Telugu • Hindi • English",
        status: "Standby / Ready",
        latency: "415ms",
      },
    ],
    recentActivities: [
      {
        id: "hc-1",
        phone: "+91 94440 ****2",
        event: "Cardiology OPD Confirmed",
        outcome: "Dr. K. Mehta • Tomorrow 09:15 AM",
        time: "2m ago",
        tag: "Slot Confirmed",
        tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      {
        id: "hc-2",
        phone: "+91 99805 ****7",
        event: "Pre-Surgery Fasting Brief",
        outcome: "Audio instructions played in Tamil",
        time: "7m ago",
        tag: "Patient Care",
        tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      },
      {
        id: "hc-3",
        phone: "+91 98450 ****9",
        event: "Lab Report Summary Dispatched",
        outcome: "Full Blood Count verified & SMS sent",
        time: "12m ago",
        tag: "Automated",
        tagColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      },
    ],
  },
  {
    id: "education",
    name: "EdTech & Colleges",
    icon: GraduationCap,
    tagline: "Instant admission counselling, fee inquiries & doubt clearing.",
    greetingBusiness: "Trinetra Shiksha Academy & Institutes",
    kpis: {
      interactions: "34,120",
      interactionsChange: "+44.1% admission surge",
      agentsCount: "5 Vernacular Counselors",
      leadsCount: "4,620 Enrolled Leads",
      leadsChange: "+52% counseling throughput",
      resolutionRate: "93.8%",
      revenueSaved: "₹36.2 Lakhs",
    },
    activeAgents: [
      {
        name: "Shiksha AI Admission Tutor",
        role: "Vernacular Course Counseling & Fee Structure",
        languages: "Bengali • Hindi • English",
        status: "Live on Call",
        latency: "405ms",
      },
      {
        name: "Karan Entrance Exam Desk",
        role: "Mock Test Registrations & Cut-Off Guidance",
        languages: "Punjabi • Hindi • English",
        status: "Dialing Outbound",
        latency: "420ms",
      },
      {
        name: "Pooja Scholarship Counselor",
        role: "Financial Aid Evaluation & Document Checklist",
        languages: "Malayalam • Hindi • English",
        status: "Standby / Ready",
        latency: "395ms",
      },
    ],
    recentActivities: [
      {
        id: "ed-1",
        phone: "+91 98300 ****3",
        event: "JEE Advanced Counseling",
        outcome: "Prospect booked live demo seat with parents",
        time: "Just now",
        tag: "Enrolled",
        tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      {
        id: "ed-2",
        phone: "+91 94331 ****6",
        event: "Fee Concession Query",
        outcome: "Verified income slab & dispatched brochure",
        time: "5m ago",
        tag: "Scholarship",
        tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      },
      {
        id: "ed-3",
        phone: "+91 98711 ****9",
        event: "Webinar Seat Reservation",
        outcome: "Reminder WhatsApp calendar invite synced",
        time: "11m ago",
        tag: "Automated",
        tagColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      },
    ],
  },
  {
    id: "finance",
    name: "Finance & BFSI",
    icon: Landmark,
    tagline: "Instant loan eligibility, KYC assistance & EMI recovery calls.",
    greetingBusiness: "BharatFin Capital & Micro-Credit",
    kpis: {
      interactions: "41,900",
      interactionsChange: "+19.7% compliance verified",
      agentsCount: "6 Certified Agents",
      leadsCount: "5,310 KYC Cleared",
      leadsChange: "98.2% on-time EMI recovery",
      resolutionRate: "89.5%",
      revenueSaved: "₹84.6 Lakhs",
    },
    activeAgents: [
      {
        name: "Vikram Loan Eligibility Officer",
        role: "CIBIL Check & Pre-Approved Sanction Letters",
        languages: "Hindi • Gujarati • English",
        status: "Live on Call",
        latency: "425ms",
      },
      {
        name: "Sunita Soft Recovery Officer",
        role: "Polite RBI-Compliant Reminders (09:00 - 19:00)",
        languages: "Marathi • Hindi • English",
        status: "Dialing Outbound",
        latency: "390ms",
      },
      {
        name: "Rohan KYC Verification Assistant",
        role: "Aadhaar & PAN Address Confirmation",
        languages: "Tamil • Hindi • English",
        status: "Standby / Ready",
        latency: "410ms",
      },
    ],
    recentActivities: [
      {
        id: "bf-1",
        phone: "+91 98220 ****5",
        event: "Business Loan Sanctioned",
        outcome: "₹15 Lakh eligibility verified in 3m 40s",
        time: "3m ago",
        tag: "High Value",
        tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      {
        id: "bf-2",
        phone: "+91 97690 ****1",
        event: "EMI Autopay Link Sent",
        outcome: "Payment received via UPI link (Razorpay)",
        time: "6m ago",
        tag: "Recovered",
        tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      },
      {
        id: "bf-3",
        phone: "+91 98190 ****8",
        event: "Video KYC Slot Booked",
        outcome: "Identity confirmed with Aadhaar OTP",
        time: "14m ago",
        tag: "KYC Verified",
        tagColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      },
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce & D2C",
    icon: ShoppingBag,
    tagline: "Instant COD order confirmations, NDR returns & tracking updates.",
    greetingBusiness: "NexStore India & D2C Brands",
    kpis: {
      interactions: "52,300",
      interactionsChange: "+36.5% peak festive sales",
      agentsCount: "4 Dispatch Agents",
      leadsCount: "8,940 Orders Confirmed",
      leadsChange: "-42% RTO return reduction",
      resolutionRate: "95.1%",
      revenueSaved: "₹51.2 Lakhs",
    },
    activeAgents: [
      {
        name: "Arika COD Verifier",
        role: "Instant Order Confirmation & Address Correction",
        languages: "Hindi • Hinglish • English",
        status: "Live on Call",
        latency: "395ms",
      },
      {
        name: "Vikram NDR Delivery Rescue",
        role: "Undelivered Shipment Rescheduling & Location Sync",
        languages: "Bengali • Hindi • English",
        status: "Live on Call",
        latency: "410ms",
      },
      {
        name: "Pooja Return & Refund Assistant",
        role: "Instant Replacement Authorization & Status",
        languages: "Kannada • Hindi • English",
        status: "Standby / Ready",
        latency: "380ms",
      },
    ],
    recentActivities: [
      {
        id: "ec-1",
        phone: "+91 98110 ****4",
        event: "COD Order Confirmed",
        outcome: "Address verified with landmark • Pincode 110001",
        time: "Just now",
        tag: "Dispatched",
        tagColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      },
      {
        id: "ec-2",
        phone: "+91 99200 ****7",
        event: "NDR Re-Attempt Scheduled",
        outcome: "Customer requested evening 6 PM delivery",
        time: "4m ago",
        tag: "RTO Prevented",
        tagColor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      },
      {
        id: "ec-3",
        phone: "+91 93220 ****2",
        event: "Instant Refund Initiated",
        outcome: "Verified unboxed defect via WhatsApp image",
        time: "10m ago",
        tag: "Automated",
        tagColor: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      },
    ],
  },
];

export function PersonalizedDashboardSection() {
  const [activeIndustryId, setActiveIndustryId] = useState<string>("real-estate");
  const [activeTab, setActiveTab] = useState<"overview" | "agents" | "calls">("overview");

  const currentIndustry =
    INDUSTRIES.find((ind) => ind.id === activeIndustryId) || INDUSTRIES[0];

  return (
    <section
      id="personalized-dashboard"
      className="w-full py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-10 select-none overflow-hidden transition-colors duration-300 relative font-sans"
      style={{
        backgroundColor: "var(--theme-bg-eco, #FAFAFA)",
        borderTop: "1px solid var(--theme-border, #E5E5E5)",
      }}
    >
      <div className="w-full max-w-[1480px] mx-auto">
        
        {/* ── 1. SECTION EDITORIAL HEADER (2-WAY TYPOGRAPHY) ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border tracking-wide uppercase font-mono"
              style={{
                backgroundColor: "rgba(49, 92, 255, 0.08)",
                borderColor: "rgba(49, 92, 255, 0.25)",
                color: "var(--theme-accent, #315CFF)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real Platform Interface</span>
            </div>

            <h2
              className="text-3xl sm:text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.12] mb-3 font-[family-name:var(--font-cal-sans)] transition-colors duration-300"
              style={{ color: "var(--theme-text-primary, #080D18)" }}
            >
              Get your personalized dashboard.
            </h2>
            <p
              className="text-base sm:text-lg lg:text-[18px] font-normal leading-relaxed font-sans transition-colors duration-300"
              style={{ color: "var(--theme-text-secondary, #4A5568)" }}
            >
              Select your industry below to preview your live autonomous control center — real-time latency telemetry, active voice agents, and verified intent conversion pipelines.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "var(--theme-accent, #315CFF)",
                color: "var(--theme-accent-contrast, #FFFFFF)",
              }}
            >
              <span>Launch Your Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* ── 2. INTERACTIVE INDUSTRY SELECTOR PILLS ── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8">
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            const isSelected = ind.id === activeIndustryId;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setActiveIndustryId(ind.id)}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap border shadow-2xs ${
                  isSelected
                    ? "scale-[1.03] shadow-sm font-bold"
                    : "hover:bg-slate-100/80 opacity-80 hover:opacity-100"
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: "var(--theme-structure-bg, #080D18)",
                        color: "var(--theme-structure-text, #F4F7FC)",
                        borderColor: "var(--theme-structure-bg, #080D18)",
                      }
                    : {
                        backgroundColor: "var(--theme-surface, #FFFFFF)",
                        color: "var(--theme-text-primary, #080D18)",
                        borderColor: "var(--theme-border, #E2E8F0)",
                      }
                }
              >
                <Icon className="w-4 h-4" />
                <span>{ind.name}</span>
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "var(--theme-accent-secondary, #45C5FF)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── 3. REAL VAAKRITI DASHBOARD SIMULATOR FRAME (DESKTOP CHROME SHELL) ── */}
        <div className="relative">
          {/* Subtle Backlight Radiance */}
          <div className="pointer-events-none absolute -inset-6 sm:-inset-10 rounded-3xl bg-radial from-[#315CFF]/6 via-transparent to-transparent blur-3xl -z-10" />

          <div
            className="w-full rounded-2xl sm:rounded-3xl border shadow-[0_24px_70px_rgba(8,13,24,0.08),0_4px_24px_rgba(49,92,255,0.05)] overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "var(--theme-surface, #FFFFFF)",
              borderColor: "var(--theme-border, #E2E8F0)",
            }}
          >
            
            {/* Top Mac Window Control Bar */}
            <div
              className="w-full px-4 sm:px-6 py-3.5 border-b flex items-center justify-between text-xs transition-colors duration-300"
              style={{
                backgroundColor: "#F8FAFC",
                borderColor: "var(--theme-border, #E2E8F0)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]/80" />
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-[#E2E8F0] shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span
                    className="font-mono text-[11px] font-medium text-[#4A5568]"
                  >
                    app.trinetraedu-ai.com/console/{activeIndustryId}
                  </span>
                </div>
              </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE WORKSPACE
              </span>
              <span
                className="text-[11px] font-mono hidden md:inline"
                style={{ color: "var(--theme-text-secondary, #64748B)" }}
              >
                TRAI DLT Verified
              </span>
            </div>
          </div>

          {/* ── REAL DASHBOARD GRID: SIDEBAR + CONTENT CANVAS ── */}
          <div className="flex flex-col lg:flex-row w-full min-h-[580px]">
            
            {/* Real Left Navigation Sidebar */}
            <div
              className="w-full lg:w-[240px] xl:w-[260px] border-b lg:border-b-0 lg:border-r p-4 sm:p-5 flex flex-col justify-between shrink-0 transition-colors duration-300"
              style={{
                backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                borderColor: "var(--theme-border, #CBD5E1)",
              }}
            >
              <div>
                {/* Organization Brand Capsule */}
                <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-200/80">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs"
                    style={{
                      backgroundColor: "var(--theme-accent, #315CFF)",
                      color: "var(--theme-accent-contrast, #FFFFFF)",
                    }}
                  >
                    V
                  </div>
                  <div className="truncate">
                    <p
                      className="text-xs font-bold truncate leading-tight font-sans"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      {currentIndustry.greetingBusiness}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Enterprise Suite • +91 Virtual PBX
                    </p>
                  </div>
                </div>

                {/* Sidebar Menu Navigation Links */}
                <nav className="space-y-1">
                  {[
                    { label: "Overview", icon: LayoutDashboard, id: "overview" },
                    { label: "Agents & Voices", icon: Bot, id: "agents" },
                    { label: "Call Records", icon: PhoneCall, id: "calls" },
                    { label: "Leads Qualified", icon: Target, id: "leads" },
                    { label: "Appointments", icon: Calendar, id: "appointments" },
                    { label: "Campaigns & DND", icon: Megaphone, id: "campaigns" },
                    { label: "Analytics & ROI", icon: BarChart3, id: "analytics" },
                    { label: "Prepaid Wallet", icon: CreditCard, id: "billing" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          if (item.id === "overview" || item.id === "agents" || item.id === "calls") {
                            setActiveTab(item.id);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                          isActive
                            ? "font-bold shadow-2xs"
                            : "hover:bg-slate-200/50 text-slate-600"
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: "var(--theme-surface, #FFFFFF)",
                                color: "var(--theme-accent, #315CFF)",
                              }
                            : undefined
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Footer Support / Status */}
              <div className="pt-4 border-t border-slate-200/80 text-[11px] space-y-2 mt-4 hidden lg:block">
                <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                  <span>Sub-480ms WebRTC</span>
                  <span className="text-emerald-600 font-bold">● Active</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-200/50 border border-slate-300/60">
                  <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                    Statutory Consent Floor
                  </p>
                  <p className="text-[9.5px] text-slate-500 leading-relaxed mt-0.5">
                    Calling hours restricted: 09:00 - 21:00 IST
                  </p>
                </div>
              </div>
            </div>

            {/* ── RIGHT MAIN DASHBOARD CANVAS ── */}
            <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between">
              
              <div>
                {/* 1. Dashboard Welcome Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
                  <div>
                    <h3
                      className="text-xl sm:text-2xl font-bold tracking-tight font-[family-name:var(--font-cal-sans)]"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      Good afternoon, {currentIndustry.name} Team 👋
                    </h3>
                    <p
                      className="text-xs sm:text-[13px] mt-0.5 font-sans"
                      style={{ color: "var(--theme-text-secondary, #475569)" }}
                    >
                      {currentIndustry.tagline}
                    </p>
                  </div>

                  {/* Realtime Telemetry Pill */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                      <Zap className="w-3.5 h-3.5 text-blue-600" />
                      Live Latency: 410ms
                    </span>
                  </div>
                </div>

                {/* 2. Real KPI Cards Row (Total Interactions, Active Tools, Leads, Resolution) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                  {/* Metric 1 */}
                  <div
                    className="p-4 rounded-2xl border shadow-2xs transition-all"
                    style={{
                      backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                        Calls Handled
                      </span>
                      <Activity className="w-4 h-4 text-blue-500" />
                    </div>
                    <div
                      className="text-2xl sm:text-3xl font-bold tracking-tight font-mono"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      {currentIndustry.kpis.interactions}
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">
                      {currentIndustry.kpis.interactionsChange}
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div
                    className="p-4 rounded-2xl border shadow-2xs transition-all"
                    style={{
                      backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                        Active Voice Agents
                      </span>
                      <Bot className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div
                      className="text-2xl sm:text-3xl font-bold tracking-tight font-mono"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      {currentIndustry.kpis.agentsCount}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      0s Queue Hold Time
                    </p>
                  </div>

                  {/* Metric 3 */}
                  <div
                    className="p-4 rounded-2xl border shadow-2xs transition-all"
                    style={{
                      backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                        Pipeline Qualified
                      </span>
                      <Target className="w-4 h-4 text-purple-500" />
                    </div>
                    <div
                      className="text-2xl sm:text-3xl font-bold tracking-tight font-mono"
                      style={{ color: "var(--theme-text-primary, #080D18)" }}
                    >
                      {currentIndustry.kpis.leadsCount}
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium mt-1">
                      {currentIndustry.kpis.leadsChange}
                    </p>
                  </div>

                  {/* Metric 4 */}
                  <div
                    className="p-4 rounded-2xl border shadow-2xs transition-all"
                    style={{
                      backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
                        Direct ROI Saved
                      </span>
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div
                      className="text-2xl sm:text-3xl font-bold tracking-tight font-mono"
                      style={{ color: "var(--theme-accent, #315CFF)" }}
                    >
                      {currentIndustry.kpis.revenueSaved}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      {currentIndustry.kpis.resolutionRate} 1st-call resolved
                    </p>
                  </div>
                </div>

                {/* 3. Two-Column Core Operational Showcase: (Left: Active Agents Swarm, Right: Live Call Stream) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  
                  {/* Left Column: Configured Active Agents Swarm */}
                  <div
                    className="p-4 sm:p-5 rounded-2xl border"
                    style={{
                      backgroundColor: "var(--theme-surface, #FFFFFF)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-blue-600" />
                        <h4
                          className="text-sm font-bold tracking-tight"
                          style={{ color: "var(--theme-text-primary, #080D18)" }}
                        >
                          Configured Agent Swarm ({currentIndustry.name})
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Autonomous 24/7
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {currentIndustry.activeAgents.map((agent, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"
                          style={{
                            backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                            borderColor: "var(--theme-border, #E2E8F0)",
                          }}
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-xs font-bold leading-tight truncate"
                                style={{ color: "var(--theme-text-primary, #080D18)" }}
                              >
                                {agent.name}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                                  agent.status === "Live on Call"
                                    ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                                    : agent.status === "Dialing Outbound"
                                    ? "bg-blue-500/15 text-blue-700 border border-blue-500/30"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {agent.status}
                              </span>
                            </div>
                            <p className="text-[10.5px] text-slate-500 truncate mt-0.5 font-sans">
                              {agent.role}
                            </p>
                            <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                              {agent.languages} • Latency {agent.latency}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-[10px] font-mono font-semibold text-blue-600 hover:underline cursor-pointer">
                              Inspect Voice →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Live Inbound/Outbound Call Stream */}
                  <div
                    className="p-4 sm:p-5 rounded-2xl border"
                    style={{
                      backgroundColor: "var(--theme-surface, #FFFFFF)",
                      borderColor: "var(--theme-border, #E2E8F0)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-emerald-600" />
                        <h4
                          className="text-sm font-bold tracking-tight"
                          style={{ color: "var(--theme-text-primary, #080D18)" }}
                        >
                          Live Intent & Call Stream
                        </h4>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-600 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Streaming
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {currentIndustry.recentActivities.map((act) => (
                        <div
                          key={act.id}
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"
                          style={{
                            backgroundColor: "var(--theme-surface-alt, #F8FAFC)",
                            borderColor: "var(--theme-border, #E2E8F0)",
                          }}
                        >
                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold text-slate-800">
                                {act.phone}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${act.tagColor}`}
                              >
                                {act.tag}
                              </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">
                              {act.event}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {act.outcome}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-[10px] font-mono text-slate-400">
                              {act.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. Bottom Quick Launcher Banner */}
              <div
                className="mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
                style={{ borderColor: "var(--theme-border, #E2E8F0)" }}
              >
                <div className="flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Ready to deploy for <strong>{currentIndustry.name}</strong>. Zero custom coding required.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="font-bold underline underline-offset-4 cursor-pointer text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    Open Live Demo Dashboard →
                  </Link>
                </div>
              </div>

            </div>

          </div>

        </div>

        </div>

      </div>
    </section>
  );
}

export default PersonalizedDashboardSection;
