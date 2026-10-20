"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Bot, PhoneCall, Search, CheckCircle2, ArrowRight, 
  Calendar, ShieldCheck, Zap, Headphones, Target, ChevronRight,
  TrendingUp, Activity, Check
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  status?: string;
  is_active?: boolean;
  marketplace_metadata?: {
    category?: string;
    personality?: string;
    language?: string;
    tagline?: string;
    features?: string[];
    use_cases?: string[];
  };
}

interface MarketplaceMarketingClientProps {
  initialServices: ServiceItem[];
}

const CATEGORIES = [
  "All Agents",
  "Voice Telephony",
  "Sales & Conversion",
  "Operations & Booking",
  "Customer Support",
];

export function MarketplaceMarketingClient({ initialServices }: MarketplaceMarketingClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All Agents");

  const filteredServices = initialServices.filter((service) => {
    const nameMatch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (service.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const taglineMatch = (service.marketplace_metadata?.tagline || "").toLowerCase().includes(searchQuery.toLowerCase());
    const categoryMatch =
      activeCategory === "All Agents" ||
      (activeCategory === "Voice Telephony" && (service.type === "voice" || !service.type)) ||
      (activeCategory === "Sales & Conversion" && service.marketplace_metadata?.category?.toLowerCase().includes("sales")) ||
      (activeCategory === "Operations & Booking" && service.marketplace_metadata?.category?.toLowerCase().includes("operations")) ||
      (activeCategory === "Customer Support" && service.marketplace_metadata?.category?.toLowerCase().includes("support"));

    return (nameMatch || descMatch || taglineMatch) && categoryMatch;
  });

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] font-sans selection:bg-blue-500/20">
      
      {/* ══════════════════════════════════════════════════════════════════
          1. HERO HEADER
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-10 overflow-hidden border-b border-slate-200/80">
        {/* Soft Ambient Radial Lights */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-blue-100/50 via-sky-50/20 to-transparent blur-[120px]" />
        
        <div className="max-w-5xl mx-auto text-center space-y-5 relative z-10">
          


          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Deploy Sovereign Voice Agents <br />
            <span className="text-blue-600">in 60 Seconds.</span>
          </h1>

          {/* Subheading */}
          <p className="text-slate-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
            Pre-tuned for Indian enterprise workflows, clinical appointments, high-velocity sales qualification, and 24/7 multilingual customer support with sub-450ms voice latency.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <span>Sub-450ms Voice Turn</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Zero Hallucination Guardrails</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Cal.com &amp; CRM Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-600" />
              <span>99.98% Telephony SLA</span>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. SEARCH & FILTER CONTROLS
          ══════════════════════════════════════════════════════════════════ */}
      <section className="py-8 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 sm:p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by agent name, capability, or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-transparent rounded-xl focus:outline-none placeholder:text-slate-400 text-slate-900"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. AGENTS GRID
          ══════════════════════════════════════════════════════════════════ */}
      <section className="pb-20 px-4 sm:px-6 lg:px-10 max-w-7xl mx-auto">
        {filteredServices.length === 0 ? (
          <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xs">
            <Bot className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No agents match your criteria</h3>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or switching to another category.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setActiveCategory("All Agents"); }}
              className="mt-2 text-xs font-bold text-blue-600 hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredServices.map((agent) => {
              const meta = agent.marketplace_metadata || {};
              const tagline = meta.tagline || agent.description || "Autonomous AI agent";
              const language = meta.language || "Hinglish + Hindi + English";
              const features = meta.features || [
                "Realtime voice reasoning with human barge-in recovery",
                "Automated scheduling and calendar booking sync",
                "Post-call SMS and WhatsApp conversation summary",
              ];

              return (
                <div
                  key={agent.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-2xs hover:shadow-md group relative overflow-hidden"
                >
                  {/* Top Row: Icon + Type Badge + Status */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                          <PhoneCall className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600">
                            {meta.category || "Voice Agent"}
                          </span>
                          <h3 className="text-xl font-bold text-slate-900 font-sans group-hover:text-blue-600 transition-colors">
                            {agent.name}
                          </h3>
                        </div>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        LIVE NOW
                      </span>
                    </div>

                    {/* Tagline */}
                    <p className="text-slate-600 text-xs sm:text-[13px] leading-relaxed mb-5">
                      {tagline}
                    </p>

                    {/* Voice Frequency Simulator preview */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span className="text-[11px] font-semibold text-slate-700">
                          Language Stack:
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {language}
                      </span>
                    </div>

                    {/* Feature Bullets */}
                    <ul className="space-y-2 mb-6">
                      {features.slice(0, 3).map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-[11px] font-mono text-slate-500">
                      Sub-450ms Latency
                    </span>

                    <Link
                      href={`/marketplace/${agent.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs group-hover:bg-blue-600 cursor-pointer"
                    >
                      <span>Explore Architecture &amp; Demo</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            4. CUSTOM ENTERPRISE PIPELINE CTA BANNER
            ══════════════════════════════════════════════════════════════════ */}
        <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600">
              Enterprise Custom Pipelines
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans">
              Need a custom voice agent integrated with your proprietary telephony?
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              We deploy private on-prem or isolated cloud SIP trunks connected to your internal CRM, ERP, and customer databases with custom SLAS.
            </p>
          </div>

          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs shrink-0"
          >
            <span>Request Custom Architecture</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </section>

    </div>
  );
}

export default MarketplaceMarketingClient;
