"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { VaakritiWordmark } from "@/components/ui/VaakritiWordmark";
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
  Phone,
  Pencil,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Clock,
  IndianRupee,
  Bell,
  CheckCircle2,
  Building2,
  Stethoscope,
  GraduationCap,
  ShoppingBag,
  Landmark,
  ChevronDown,
  Activity,
  Smile,
  Filter,
  X,
} from "lucide-react";

interface IndustryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INDUSTRIES: IndustryConfig[] = [
  { id: "real-estate", name: "Real Estate", icon: Building2 },
  { id: "healthcare", name: "Healthcare & OPD", icon: Stethoscope },
  { id: "banking", name: "BFSI & Wealth", icon: Landmark },
  { id: "education", name: "Higher Education", icon: GraduationCap },
  { id: "ecommerce", name: "E-Commerce & D2C", icon: ShoppingBag },
];

export function PersonalizedDashboardSection() {
  const [activeIndustryId, setActiveIndustryId] = useState<string>("real-estate");
  // Tab can be 'overview', 'analytics', or 'revenue'
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "revenue">("overview");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(3);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <section
      id="personalized-dashboard"
      className="w-full py-8 sm:py-10 lg:py-12 px-4 sm:px-6 lg:px-10 select-none overflow-hidden transition-colors duration-300 relative font-sans"
      style={{
        backgroundColor: "var(--theme-bg-eco, #FAFAFA)",
        borderTop: "1px solid var(--theme-border, #E5E5E5)",
      }}
    >
      <div className="w-full max-w-[1480px] mx-auto">
        
        {/* ── 1. SECTION EDITORIAL HEADER (CLEAN, NO BADGE, NO LAUNCH BUTTON, TIGHT SPACING) ── */}
        <div className="max-w-3xl mb-5 sm:mb-6">
          <h2
            className="text-2xl sm:text-3xl lg:text-[38px] font-bold tracking-tight leading-[1.14] mb-2 font-[family-name:var(--font-cal-sans)] transition-colors duration-300"
            style={{ color: "var(--theme-text-primary, #080D18)" }}
          >
            Get your personalized dashboard.
          </h2>
          <p
            className="text-sm sm:text-base lg:text-[16px] font-normal leading-relaxed font-sans transition-colors duration-300"
            style={{ color: "var(--theme-text-secondary, #4A5568)" }}
          >
            Select your industry below to preview your live autonomous control center — real-time latency telemetry, active voice agents, and verified intent conversion pipelines.
          </p>
        </div>

        {/* ── 2. INTERACTIVE INDUSTRY SELECTOR PILLS (COMPACT SPACING) ── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-5 sm:mb-6">
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            const isSelected = ind.id === activeIndustryId;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setActiveIndustryId(ind.id)}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap border shadow-2xs ${
                  isSelected
                    ? "scale-[1.02] shadow-sm font-bold"
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
                <Icon className="w-3.5 h-3.5" />
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
            className="w-full rounded-2xl sm:rounded-3xl border shadow-[0_20px_60px_rgba(8,13,24,0.07),0_4px_20px_rgba(49,92,255,0.04)] overflow-hidden transition-all duration-300"
            style={{
              backgroundColor: "var(--theme-surface, #FFFFFF)",
              borderColor: "var(--theme-border, #E2E8F0)",
            }}
          >
            
            {/* Top Mac Window Control Bar with Vaakriti Brand Text Logo & Profile */}
            <div
              className="w-full px-4 sm:px-6 py-3 border-b flex items-center justify-between text-xs transition-colors duration-300 bg-white"
              style={{
                borderColor: "var(--theme-border, #E2E8F0)",
              }}
            >
              {/* Left side: Window dots + VAAKRITI Brand Logo replacing name */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
                  <div className="w-3 h-3 rounded-full bg-[#10B981]/80" />
                </div>
                {/* Official Vaakriti Brand Text Logo (Text Only) */}
                <div className="flex items-center pl-2 border-l border-slate-200">
                  <VaakritiWordmark className="h-4 sm:h-4.5 w-auto text-slate-900" />
                </div>
              </div>

              {/* Right side: Bell icon + Interactive Notification Modal */}
              <div className="flex items-center gap-3 relative">
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  aria-label="Toggle notifications"
                  className="relative p-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer rounded-lg hover:bg-slate-100"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </button>

                {/* Interactive Notification Modal / Popover */}
                {showNotifications && (
                  <div className="absolute top-10 right-0 w-[300px] sm:w-[360px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-900" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                          Notifications
                        </h4>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setUnreadCount(0)}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          aria-label="Close"
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {[
                        {
                          title: "High-Intent Lead Captured",
                          desc: "Arika booked a site visit for Prestige Tech Park with Dr. Rajesh Gupta.",
                          time: "2m ago",
                          unread: true,
                        },
                        {
                          title: "Telephony Route Latency Optimized",
                          desc: "Carrier latency dropped to 14ms on Jio & Airtel SIP routes.",
                          time: "18m ago",
                          unread: true,
                        },
                        {
                          title: "Daily Inbound Target Exceeded",
                          desc: "1,250 calls processed with 94.6% first-call resolution.",
                          time: "1h ago",
                          unread: true,
                        },
                        {
                          title: "Knowledge Base Synchronized",
                          desc: "Updated 14 property floorplans and pricing sheets for Shubh.",
                          time: "3h ago",
                          unread: false,
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-xl text-left transition-colors ${
                            item.unread ? "bg-blue-50/60 border border-blue-100" : "bg-slate-50 border border-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 font-sans">
                              {item.title}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Autonomous Voice Alerts</span>
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    R
                  </div>
                  <span className="text-xs font-semibold text-slate-700 hidden sm:inline font-sans">
                    raghav
                  </span>
                </div>
              </div>
            </div>

            {/* ── REAL DASHBOARD GRID: SIDEBAR + CONTENT CANVAS ── */}
            <div className="flex flex-col lg:flex-row w-full min-h-[580px]">
              
              {/* Real Left Navigation Sidebar with Enhanced Spacing & Typographic Weight */}
              <div
                className="w-full lg:w-[240px] xl:w-[260px] border-b lg:border-b-0 lg:border-r p-4 sm:p-5 flex flex-col justify-between shrink-0 bg-white"
                style={{
                  borderColor: "var(--theme-border, #E2E8F0)",
                }}
              >
                {/* Top Navigation Items */}
                <nav className="space-y-2">
                  {[
                    { label: "Overview", icon: LayoutDashboard, id: "overview" },
                    { label: "Agents", icon: Bot, id: "agents" },
                    { label: "Calls", icon: PhoneCall, id: "calls" },
                    { label: "Leads", icon: Target, id: "leads" },
                    { label: "Appointments", icon: Calendar, id: "appointments" },
                    { label: "Customers", icon: Users, id: "customers" },
                    { label: "Campaigns", icon: Megaphone, id: "campaigns" },
                    { label: "Phone Numbers", icon: Phone, id: "phone-numbers" },
                    { label: "Analytics", icon: BarChart3, id: "analytics" },
                    { label: "Billing", icon: CreditCard, id: "billing" },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isCurrent =
                      (item.id === "overview" && activeTab === "overview") ||
                      (item.id === "analytics" && activeTab === "analytics") ||
                      (item.id === "billing" && activeTab === "revenue");
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          if (item.id === "overview") setActiveTab("overview");
                          else if (item.id === "analytics") setActiveTab("analytics");
                          else if (item.id === "billing") setActiveTab("revenue");
                        }}
                        className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 sm:py-3 rounded-xl text-[13.5px] sm:text-sm font-semibold transition-all text-left cursor-pointer ${
                          isCurrent
                            ? "bg-slate-900 text-white font-bold shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>

                {/* Bottom Navigation Section: Custom Agent, Settings, Support */}
                <div className="pt-4 mt-auto border-t border-slate-100">
                  <nav className="space-y-2">
                    {[
                      { label: "Custom Agent", icon: Pencil },
                      { label: "Settings", icon: Settings },
                      { label: "Support", icon: HelpCircle },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 sm:py-3 rounded-xl text-[13.5px] sm:text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium cursor-pointer transition-all"
                        >
                          <Icon className="w-4.5 h-4.5 shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      );
                    })}
                  </nav>
                </div>
              </div>

              {/* ── RIGHT MAIN DASHBOARD CANVAS (ANALYTICS & REVENUE PAGES INTERCHANGEABLE) ── */}
              <div className="flex-1 p-4 sm:p-6 lg:p-7 flex flex-col justify-between bg-[#FCFCFD]">
                
                {/* ── TOP HEADER OF DASHBOARD: ANALYTICS + INTERCHANGEABLE TAB PILLS ── */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-200">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                        {activeTab === "overview" ? "Overview" : activeTab === "analytics" ? "Analytics" : "Revenue & ROI"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed mt-0.5 font-sans">
                        {activeTab === "overview"
                          ? "Real-time command center: active voice agents, live calls, and enterprise KPIs"
                          : activeTab === "analytics"
                          ? "Monitor call activity, agent performance, and live sentiment attribution"
                          : "Commercial quotes captured from calls and verified closed revenue by source"}
                      </p>
                    </div>

                    {/* Interchangeable Tab Switcher */}
                    <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 self-start sm:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setActiveTab("overview")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          activeTab === "overview"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Overview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("analytics")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          activeTab === "analytics"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Analytics</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab("revenue")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          activeTab === "revenue"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                        }`}
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>Revenue &amp; ROI</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-700">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* ════════════════════════════════════════════════════════
                      VIEW 1: OVERVIEW & CALLS (ANALYTICS PAGE MATCHING IMAGE 5)
                      ════════════════════════════════════════════════════════ */}
                  {/* VIEW: OVERVIEW COMMAND CENTER & LIVE ACTIVITY STREAM */}
                  {activeTab === "overview" && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      
                      {/* Top Command Banner: System Health & Active Agents */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                            <Activity className="w-5 h-5 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 font-sans">
                                Real-Time Voice Infrastructure Active
                              </h4>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                99.98% UPTIME
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              8 AI Voice Agents active across 3 DIDs • Sub-500ms voice turn latency
                            </p>
                          </div>
                        </div>

                        {/* Quick CTA to analytics */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab("analytics")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>View Detailed Analytics</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 Overview KPI Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Total Calls Today
                          </span>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                              1,428
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">
                              +18.4%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            94.8% first-ring answer rate
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Avg Handle Time
                          </span>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                              2m 45s
                            </span>
                            <span className="text-xs font-semibold text-blue-600">
                              -68% vs human
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Zero caller hold time
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Lead Qualification
                          </span>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                              87.5%
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">
                              342 high-intent
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            142 meetings scheduled
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Pipeline Influenced
                          </span>
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                              ₹2.48 Cr
                            </span>
                            <span className="text-xs font-semibold text-emerald-600">
                              Verified
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            ₹48.6L deals closed directly
                          </p>
                        </div>
                      </div>

                      {/* Live Call Stream & Active Interactions Table */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="w-4 h-4 text-slate-700" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-sans">
                              Live Voice Activity Stream
                            </h4>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              STREAMING
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab("analytics")}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Full Analytics</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {[
                            {
                              name: "Dr. Rajesh Gupta",
                              intent: "Luxury Villa Site Visit & Brochure Inquiry",
                              agent: "Arika",
                              duration: "4m 12s",
                              outcome: "Site Visit Confirmed",
                              badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              sentiment: "98% Positive",
                              time: "2m ago",
                            },
                            {
                              name: "Priya Sharma",
                              intent: "Orthopedic OPD Consultation Slotting",
                              agent: "Shubh",
                              duration: "2m 34s",
                              outcome: "Appointment Booked",
                              badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
                              sentiment: "96% Positive",
                              time: "11m ago",
                            },
                            {
                              name: "Vikram Malhotra",
                              intent: "Commercial Space Lease (12,000 sq.ft)",
                              agent: "Arika",
                              duration: "5m 02s",
                              outcome: "Commercial Quote Transmitted",
                              badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
                              sentiment: "94% Positive",
                              time: "28m ago",
                            },
                            {
                              name: "Sneha Kulkarni",
                              intent: "Executive MBA Curriculum & Fee Structure",
                              agent: "Shubh",
                              duration: "3m 18s",
                              outcome: "Brochure Sent via WhatsApp",
                              badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                              sentiment: "99% Positive",
                              time: "42m ago",
                            },
                          ].map((call, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0">
                                  {call.name.split(" ").map((n) => n[0]).join("")}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900 font-sans">
                                      {call.name}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {call.time}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 font-sans">
                                    {call.intent}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-11 sm:pl-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${call.badgeColor}`}>
                                  {call.outcome}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  {call.duration}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md hidden md:inline">
                                  {call.sentiment}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* VIEW 1: DETAILED ANALYTICS */}
                  {activeTab === "analytics" && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      
                      {/* Filter Bar: Date Range + Filter by Agent */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                        {/* Date Range Selector */}
                        <div className="flex items-center gap-1.5">
                          {(["7d", "30d", "90d"] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setDateRange(r)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                                dateRange === r
                                  ? "bg-slate-900 text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              }`}
                            >
                              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
                            </button>
                          ))}
                        </div>

                        {/* Agent Selector Dropdown Mock */}
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                            Filter by agent:
                          </span>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-semibold cursor-pointer">
                            <span>All Agents</span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* 4 KPI Cards (Matching Image 5) */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Card 1: Total Calls */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Total Calls
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                              <Phone className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                              72
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Connected call attempts
                            </p>
                          </div>
                        </div>

                        {/* Card 2: Total Minutes */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Total Minutes
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                              121m
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Cumulative usage duration
                            </p>
                          </div>
                        </div>

                        {/* Card 3: Avg Call Duration */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Avg Call Duration
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                              <TrendingUp className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                              1.69m
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Average conversation length
                            </p>
                          </div>
                        </div>

                        {/* Card 4: Leads Generated */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              Leads Generated
                            </span>
                            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                              <Target className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                              10
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Interactions capturing contact info
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Row 1 Charts: Call Volume Over Time + Sentiment Analysis */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* Call Volume Over Time Spline Graph */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                                Call Volume Over Time
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Daily inbound and outbound call count
                              </p>
                            </div>
                            <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                              <Activity className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Spline Chart SVG */}
                          <div className="relative w-full h-40 pt-2">
                            <svg viewBox="0 0 500 130" className="w-full h-full overflow-visible" fill="none">
                              {/* Horizontal Grid lines */}
                              <line x1="20" y1="20" x2="490" y2="20" stroke="#F1F5F9" strokeWidth="1" />
                              <line x1="20" y1="55" x2="490" y2="55" stroke="#F1F5F9" strokeWidth="1" />
                              <line x1="20" y1="90" x2="490" y2="90" stroke="#F1F5F9" strokeWidth="1" />
                              <line x1="20" y1="120" x2="490" y2="120" stroke="#E2E8F0" strokeWidth="1" />

                              {/* Y-axis labels */}
                              <text x="12" y="24" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">12</text>
                              <text x="12" y="59" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">9</text>
                              <text x="12" y="94" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">3</text>
                              <text x="12" y="123" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">0</text>

                              {/* Spline Curve (Matching peaks from screenshot) */}
                              <path
                                d="M 25 22 C 35 22, 45 118, 55 120 C 65 120, 85 120, 105 120 C 115 120, 125 45, 135 48 C 145 52, 150 95, 160 95 C 170 95, 175 120, 185 120 C 190 120, 195 45, 205 48 C 215 52, 220 120, 235 120 C 255 120, 280 120, 310 120 C 320 120, 325 110, 335 112 C 345 115, 350 120, 360 120 C 370 120, 380 92, 390 92 C 400 92, 405 110, 415 110 C 425 110, 435 120, 480 120"
                                stroke="#1E293B"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>

                            {/* X-axis date labels */}
                            <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-mono pt-1 px-4">
                              <span>Sep 19</span>
                              <span>Sep 23</span>
                              <span>Sep 27</span>
                              <span>Sep 30</span>
                              <span>Oct 4</span>
                              <span>Oct 8</span>
                              <span>Oct 12</span>
                              <span>Oct 17</span>
                            </div>
                          </div>
                        </div>

                        {/* Call Sentiment Analysis Donut */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                                Call Sentiment Analysis
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Breakdown of transcript-derived mood
                              </p>
                            </div>
                            <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                              <Smile className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Donut Chart & Legend Row */}
                          <div className="flex items-center justify-around gap-4 py-2">
                            {/* Donut Graphic */}
                            <div className="relative w-28 h-28 flex items-center justify-center">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#F1F5F9"
                                  strokeWidth="14"
                                />
                                {/* Neutral: 81% */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#334155"
                                  strokeWidth="14"
                                  strokeDasharray="238.7"
                                  strokeDashoffset="45"
                                />
                                {/* Positive: 17% */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#0F172A"
                                  strokeWidth="14"
                                  strokeDasharray="40 238.7"
                                  strokeDashoffset="0"
                                />
                                {/* Negative: 3% */}
                                <circle
                                  cx="50"
                                  cy="50"
                                  r="38"
                                  fill="none"
                                  stroke="#94A3B8"
                                  strokeWidth="14"
                                  strokeDasharray="8 238.7"
                                  strokeDashoffset="-40"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-sm font-bold text-slate-900 leading-none">
                                  72
                                </span>
                                <span className="text-[8px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">
                                  Total Calls
                                </span>
                              </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                                <span className="font-medium text-slate-700">Positive</span>
                                <span className="font-mono text-slate-500 ml-auto font-semibold">12 (17%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                                <span className="font-medium text-slate-700">Neutral</span>
                                <span className="font-mono text-slate-500 ml-auto font-semibold">58 (81%)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                                <span className="font-medium text-slate-700">Negative</span>
                                <span className="font-mono text-slate-500 ml-auto font-semibold">2 (3%)</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Row 2 Charts: Lead Capture Funnel + Calls By Agent */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        
                        {/* Lead Capture Funnel */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                                Lead Capture Funnel
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Stage distribution of identified prospects
                              </p>
                            </div>
                            <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                              <Filter className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Horizontal Bar Funnel */}
                          <div className="space-y-2 pt-2">
                            {[
                              { stage: "New", count: 4, width: "50%", color: "bg-indigo-100 border-indigo-200" },
                              { stage: "Contacted", count: 0, width: "0%", color: "bg-slate-100" },
                              { stage: "Qualified", count: 4, width: "50%", color: "bg-slate-700 border-slate-800" },
                              { stage: "Hot", count: 0, width: "0%", color: "bg-slate-100" },
                              { stage: "Converted", count: 0, width: "0%", color: "bg-slate-100" },
                            ].map((s) => (
                              <div key={s.stage} className="flex items-center gap-3 text-xs">
                                <span className="w-20 text-[11px] text-slate-500 text-right truncate">
                                  {s.stage}
                                </span>
                                <div className="flex-1 h-3.5 rounded-md bg-slate-50 relative overflow-hidden">
                                  {s.count > 0 && (
                                    <div
                                      className={`h-full rounded-md ${s.color}`}
                                      style={{ width: s.width }}
                                    />
                                  )}
                                </div>
                                <span className="w-6 font-mono text-[11px] text-slate-600 text-left">
                                  {s.count}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Calls By Agent */}
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider font-sans">
                                Calls By Agent
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Traffic distribution across custom voice assistants
                              </p>
                            </div>
                            <div className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Agent Vertical Bars */}
                          <div className="flex items-end justify-around h-36 pt-4 pb-2 border-b border-slate-100">
                            {/* Arika: 48 calls */}
                            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="font-mono text-[10px] text-slate-500 font-semibold">48</span>
                              <div className="w-9 sm:w-11 bg-slate-200 rounded-t-lg transition-all" style={{ height: "75%" }} />
                              <span className="text-xs font-semibold text-slate-800 font-sans">Arika</span>
                            </div>

                            {/* Shubh: 24 calls */}
                            <div className="flex flex-col items-center gap-1.5 h-full justify-end">
                              <span className="font-mono text-[10px] text-slate-500 font-semibold">24</span>
                              <div className="w-9 sm:w-11 bg-slate-200 rounded-t-lg transition-all" style={{ height: "40%" }} />
                              <span className="text-xs font-semibold text-slate-800 font-sans">Shubh</span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Bottom Banner: Revenue Attribution & Pipeline (Clicks switch to Revenue view) */}
                      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                              Revenue Attribution &amp; Pipeline
                            </span>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                              Track quote estimates, confirmed deals, and AI return on investment
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              See commercial quotes captured from calls and verified closed revenue by source.
                            </p>
                          </div>
                        </div>

                        {/* Open Revenue & ROI CTA */}
                        <button
                          type="button"
                          onClick={() => setActiveTab("revenue")}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs shrink-0 cursor-pointer active:scale-[0.98]"
                        >
                          <span>Open Revenue &amp; ROI</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  )}

                  {/* ════════════════════════════════════════════════════════
                      VIEW 2: REVENUE & ROI (MATCHING REVENUE DASHBOARD CLIENT)
                      ════════════════════════════════════════════════════════ */}
                  {activeTab === "revenue" && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      
                      {/* Back button strip */}
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setActiveTab("overview")}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back to Overview</span>
                        </button>
                        <span className="text-[11px] font-mono font-semibold text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Verified Attribution Active
                        </span>
                      </div>

                      {/* Top ROI Highlight Hero Card */}
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-700/60">
                          <div>
                            <span className="text-[11px] font-mono uppercase text-slate-400">
                              You Paid Vaakriti
                            </span>
                            <div className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                              ₹14,200
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Telephony &amp; AI inference usage
                            </p>
                          </div>

                          <div className="pt-3 sm:pt-0 sm:pl-5">
                            <span className="text-[11px] font-mono uppercase text-slate-400">
                              Vaakriti Attributed
                            </span>
                            <div className="text-2xl sm:text-3xl font-bold font-serif text-emerald-400 mt-1">
                              ₹2,84,000
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              8 confirmed closed client deals
                            </p>
                          </div>

                          <div className="pt-3 sm:pt-0 sm:pl-5">
                            <span className="text-[11px] font-mono uppercase text-slate-400">
                              Net Return on Spend
                            </span>
                            <div className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1 flex items-baseline gap-2">
                              20x
                              <span className="text-xs font-mono font-semibold text-emerald-400">
                                +1,900% ROI
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Zero human sales rep overhead
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3 Metric Cards: Pipeline, Confirmed, Close Ratio */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Estimated Pipeline
                          </span>
                          <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                            ₹18,40,000
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            14 open quotes qualified by AI agents
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Confirmed Revenue
                          </span>
                          <div className="text-2xl font-bold font-serif text-emerald-600 mt-1">
                            ₹2,84,000
                          </div>
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            8 verified closed deals
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            Close Ratio
                          </span>
                          <div className="text-2xl font-bold font-serif text-slate-900 mt-1">
                            64%
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            8 won / 11 completed negotiations
                          </p>
                        </div>
                      </div>

                      {/* 2-Column: Revenue by Source + Recent Closed Deals */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Revenue by Source */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                            Revenue by Telephony Channel
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-700">Inbound Receptionist</span>
                                <span className="font-mono text-slate-900">₹1,76,000 (62%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-slate-900 rounded-full" style={{ width: "62%" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-700">Outbound Campaigns</span>
                                <span className="font-mono text-slate-900">₹68,000 (24%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-slate-700 rounded-full" style={{ width: "24%" }} />
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1">
                                <span className="text-slate-700">Automated Callback Rescue</span>
                                <span className="font-mono text-slate-900">₹40,000 (14%)</span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-slate-400 rounded-full" style={{ width: "14%" }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Recent Closed Deals Table */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
                            Attributed Commercial Deals
                          </h4>
                          <div className="space-y-2.5">
                            {[
                              { client: "DLF CyberHub Workspace Lease", amount: "₹95,000", status: "Won", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                              { client: "Apollo Clinics OPD Intake & Triage", amount: "₹48,000", status: "Won", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                              { client: "Tata Motors EV Fleet Telematics", amount: "₹1,41,000", status: "Won", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                              { client: "Sterling Holidays Vacation Club", amount: "₹62,000", status: "Pipeline", badge: "bg-blue-50 text-blue-700 border-blue-200" },
                            ].map((deal) => (
                              <div key={deal.client} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                                <div>
                                  <p className="font-semibold text-slate-900 leading-tight">
                                    {deal.client}
                                  </p>
                                  <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border mt-0.5 ${deal.badge}`}>
                                    {deal.status}
                                  </span>
                                </div>
                                <span className="font-serif font-bold text-slate-900 text-sm">
                                  {deal.amount}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* ── 4. GET YOUR PERSONALIZED DASHBOARD BOTTOM CTA (MATCHING PREVIOUS DESIGN) ── */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
              Ready to deploy your enterprise voice fleet?
            </h4>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Get started with live sub-480ms latency, native vernacular code-switching, and full statutory TRAI compliance.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <span>Get Your Personalized Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}

export default PersonalizedDashboardSection;
