'use client'

import React, { useState } from 'react'
import { 
  Printer, 
  Download, 
  Check, 
  X, 
  Brain, 
  Receipt, 
  MessageSquare, 
  PhoneForwarded, 
  Zap, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  Clock, 
  FileCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { VaakritiWordmark } from '@/components/ui/VaakritiWordmark'

export default function EnterpriseDocumentPage() {
  const [themeMode, setThemeMode] = useState<'paper' | 'dark'>('paper')

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className={`min-h-screen py-10 px-4 transition-colors ${
      themeMode === 'paper' 
        ? 'bg-zinc-200 text-zinc-900' 
        : 'bg-[#06000c] text-zinc-100'
    } print:bg-white print:text-black print:p-0`}>
      
      {/* Top Floating Control Bar (Hidden on print) */}
      <header className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 px-5 py-2.5 rounded-full shadow-2xl print:hidden">
        <div className="flex items-center gap-2 pr-3 border-r border-zinc-700 text-xs font-mono text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>VAAKRITI EXECUTIVE WHITE-PAPER (7 PAGES)</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setThemeMode(themeMode === 'paper' ? 'dark' : 'paper')}
            className="px-3 py-1.5 rounded-full text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
          >
            {themeMode === 'paper' ? '🌙 Dark Mode' : '📄 Paper Mode'}
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 transition shadow-md"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </header>

      {/* DOCUMENT WRAPPER: Multi-page A4 Stack */}
      <main className="max-w-[210mm] mx-auto space-y-10 print:space-y-0 print:max-w-none">

        {/* ========================================================================= */}
        {/* PAGE 1: COVER SHEET                                                      */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          {/* Cover Header */}
          <div className="border-b-2 border-zinc-900 pb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-zinc-950 flex items-center justify-center p-2 text-white">
                <VaakritiSymbolVector className="w-full h-full" />
              </div>
              <div className="h-6 w-32 text-zinc-950">
                <VaakritiWordmark className="w-full h-full" />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Document Dossier</div>
              <div className="text-xs font-mono font-semibold text-zinc-900">REF: VAAK-ENT-2026-V1</div>
            </div>
          </div>

          {/* Cover Hero Title */}
          <div className="my-auto py-12 space-y-6">
            <div className="inline-block px-3 py-1 bg-zinc-100 border border-zinc-300 text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-700 rounded">
              ENTERPRISE PLATFORM SPECIFICATION
            </div>
            <h1 className="text-5xl font-serif tracking-tight leading-[1.1] text-zinc-950 font-bold">
              Autonomous Enterprise Voice Infrastructure
            </h1>
            <p className="text-xl font-serif text-zinc-600 leading-snug">
              Closed-Loop Conversational Operations, Real-Time Business Brain &amp; Instant Financial Settlement Engine.
            </p>
            <div className="w-24 h-1 bg-zinc-950 pt-0.5" />
            <p className="text-sm text-zinc-600 leading-relaxed max-w-xl">
              An architectural whitepaper detailing how Vaakriti replaces conventional, static voice bots with a deterministic operational system capable of live schedule adaptation, in-call GST invoicing, WhatsApp Vision OCR verification, and loop-proof human escalation.
            </p>
          </div>

          {/* Cover Metadata Footer */}
          <div className="border-t border-zinc-300 pt-6 grid grid-cols-3 gap-6 text-xs">
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Classification</div>
              <div className="font-semibold text-zinc-900 mt-0.5">Commercial in Confidence</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Target Domain</div>
              <div className="font-semibold text-zinc-900 mt-0.5">Telecom, Retail, Clinics, Logistics</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase text-zinc-500 tracking-wider">Release Date</div>
              <div className="font-semibold text-zinc-900 mt-0.5">Fiscal Year 2026–2027</div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-zinc-400 text-center pt-4">
            CONFIDENTIAL • COPYRIGHT © 2026 VAAKRITI AI • ALL RIGHTS RESERVED
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 2: EXECUTIVE SUMMARY & THE 4 PARADIGM FAILURES                     */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          {/* Running Header */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 01: EXECUTIVE SUMMARY</span>
          </div>

          <div className="space-y-6 flex-1 py-6">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">01. Overview</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                The Limitations of First-Generation Voice Agents
              </h2>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              Between 2023 and 2025, commercial voice AI focused almost exclusively on basic LLM text-to-speech wrappers. While these bots demonstrated fluent English or Hindi speech, enterprises attempting to deploy them in high-stake business environments encountered critical operational breakdown points:
            </p>

            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-mono">1</span>
                  <span>Static Prompt Blindness</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed pl-7">
                  Real businesses are fluid. A clinic doctor runs 45 minutes late; a logistics firm runs out of 20ft containers; a retail store closes early for maintenance. First-generation bots rely on fixed system prompts and cannot adapt without developer intervention, booking phantom slots and frustrating customers.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-mono">2</span>
                  <span>Inability to Close Financial Transactions (Dead-End Calls)</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed pl-7">
                  A voice conversation that ends with *&quot;Please visit our website to pay&quot;* suffers an 85% drop-off rate. Traditional bots lack non-custodial financial infrastructure to generate statutory tax invoices, calculate GST, and push UPI QR payment links to the caller&apos;s phone while the customer is still on the line.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-mono">3</span>
                  <span>Infinite Call Forwarding Loops</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed pl-7">
                  When a business owner forwards their mobile phone to an AI agent, any caller asking to speak to the owner creates an infinite looping failure: the bot forwards back to the owner&apos;s number, which forwards back to the bot. Without dual-SIM recognition and VIP whitelisting, the system breaks.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900">
                  <span className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-mono">4</span>
                  <span>High Latency &amp; Audio Crackling in PSTN Networks</span>
                </div>
                <p className="text-[11px] text-zinc-600 leading-relaxed pl-7">
                  Most voice bots use 24kHz or 48kHz sampling rates with 1.5s–2.0s conversational endpointing. Over Indian carrier networks (Airtel, Jio, Vi), software downsampling to 8kHz linear PCM creates audible crackles, clipping, and robotic awkward pauses.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-zinc-900 text-white space-y-2 mt-4">
              <div className="text-xs font-bold font-serif flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                The Vaakriti AI Resolution
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                Vaakriti bridges the gap between conversational AI and operational execution. By uniting a dynamic Operations Brain, in-call GST invoicing, WhatsApp Vision OCR verification, and sub-100ms native telephony streaming, Vaakriti acts as an autonomous operator that negotiates, executes, settles, and escalates.
              </p>
            </div>
          </div>

          {/* Running Footer */}
          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 02 OF 07</span>
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 3: DEEP DIVE — OPERATIONS BRAIN & INVOICE ENGINE                    */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 02: CORE PLATFORM ENGINES</span>
          </div>

          <div className="space-y-6 flex-1 py-6">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">02. Deep Architectural Systems</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                Pillars 1 &amp; 2: The Operations Brain &amp; In-Call Cash Settlement
              </h2>
            </div>

            {/* Pillar 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <Brain className="w-4 h-4 text-zinc-900" />
                <span>Pillar 1: The Operations Brain Hub (Dynamic Fact Ingestion)</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Rather than treating the voice bot as a static prompt, Vaakriti integrates a live business knowledge layer composed of three synchronized sub-systems:
              </p>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-left space-y-1">
                  <div className="text-[11px] font-bold text-zinc-900">Spoken Voice Directives</div>
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    Owners speak voice memos (*&quot;Doctor Sharma 11 baje aayenge, tab tak appointments mat lena&quot;*). AI parses, confirms, and injects into all live calls immediately.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-left space-y-1">
                  <div className="text-[11px] font-bold text-zinc-900">Live Slots &amp; Calendar</div>
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    Two-way synchronized appointment sheets ensure zero overlapping bookings. As soon as a slot is taken on a call, it is blacked out for subsequent callers.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded text-left space-y-1">
                  <div className="text-[11px] font-bold text-zinc-900">Inventory &amp; Pricing Sheet</div>
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    Tracks item quantities, vehicle capacities, route availability, and minimum negotiation price floors to enable real-time factual deal closing.
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <Receipt className="w-4 h-4 text-zinc-900" />
                <span>Pillar 2: Cash-to-Call Engine &amp; Branded GST Invoicing</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                When a customer verbally agrees to an appointment, order, or service during a call, the bot triggers the non-custodial Cash-to-Call engine:
              </p>
              
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-900 text-[11px]">1. Real-Time Quotation Extraction:</span>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Monitors speech tokens for negotiated pricing (e.g. ₹1,200), item descriptions, and tax rates.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-900 text-[11px]">2. Statutory Invoice Generation:</span>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Produces sequential tax invoices (e.g. VAAK/26-27/0001) with tenant GSTIN, SAC/HSN codes, CGST/SGST breakdown, and tamper-proof SHA-256 hashes.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1 border-t border-zinc-200">
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-900 text-[11px]">3. Direct Non-Custodial Settlement:</span>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Funds flow directly to the tenant&apos;s verified bank account or UPI VPA (GPay/PhonePe). Vaakriti holds zero customer funds, adhering strictly to RBI guidelines.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-zinc-900 text-[11px]">4. Mid-Call WhatsApp Dispatch:</span>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Dispatches the branded invoice PDF, UPI payment deep link, and dynamic QR code to the caller&apos;s WhatsApp before the call disconnects.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Spec Box */}
            <div className="p-3 bg-zinc-100 border border-zinc-300 rounded text-[11px] font-mono text-zinc-700 flex items-center justify-between">
              <span>LEDGER MODEL: Append-Only Tamper-Evident SHA-256</span>
              <span>SETTLEMENT: RBI Non-Custodial Direct UPI</span>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 03 OF 07</span>
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 4: DEEP DIVE — WHATSAPP VISION OCR & WARM FORWARDING                 */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 03: INTELLIGENT DISPATCH &amp; FORWARDING</span>
          </div>

          <div className="space-y-6 flex-1 py-6">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">03. Automated Settlement &amp; Escalation</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                Pillars 3 &amp; 4: WhatsApp Vision OCR &amp; Dual-SIM Warm Transfer
              </h2>
            </div>

            {/* Pillar 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <MessageSquare className="w-4 h-4 text-zinc-900" />
                <span>Pillar 3: Multimodal WhatsApp Vision OCR Bot</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                When callers complete their payment, they reply on WhatsApp with a screenshot or transaction reference. Generic systems fail to process inbound media. Vaakriti includes an autonomous multimodal receiver:
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded space-y-1.5">
                  <div className="font-semibold text-zinc-900 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-900" />
                    Gemini Flash Vision Inspection
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Downloads payment screenshots via Meta Cloud API / Twilio and feeds them to Gemini Flash Vision. Identifies the banking application (GPay, PhonePe, Paytm, BHIM, HDFC/ICICI NetBanking), validates payment status (SUCCESS vs PENDING/FAILED), and extracts the 12-digit numeric UPI reference (UTR).
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded space-y-1.5">
                  <div className="font-semibold text-zinc-900 text-[11px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-900" />
                    Automated Ledger Reconciliation
                  </div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Matches the caller&apos;s phone number and paid amount against open deals in <code className="bg-zinc-200 px-1 py-0.5 rounded text-[9px]">revenue_events</code>. Marks the order as WON, stores proof URLs, fires confirmation messages to the caller, and pushes an instant WhatsApp notification to the owner.
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <PhoneForwarded className="w-4 h-4 text-zinc-900" />
                <span>Pillar 4: Dual-SIM Loop-Proof Warm Forwarding</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Enables owners to forward incoming calls to the AI without sacrificing personal accessibility:
              </p>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded text-xs">
                  <span className="font-mono text-zinc-900 font-bold">A.</span>
                  <div>
                    <span className="font-semibold text-zinc-900 text-[11px]">Dual-SIM Architectural Routing:</span>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Owners configure their personal line (SIM 2) as the dedicated escalation target. The AI forwards only to SIM 2, eliminating infinite forwarding loops.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded text-xs">
                  <span className="font-mono text-zinc-900 font-bold">B.</span>
                  <div>
                    <span className="font-semibold text-zinc-900 text-[11px]">Family &amp; VIP Instant Whitelist:</span>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      Numbers flagged as Family/VIP bypass all sales pitches and directives, transferring immediately to the owner. They are also scrubbed from all outbound marketing campaigns.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded text-xs">
                  <span className="font-mono text-zinc-900 font-bold">C.</span>
                  <div>
                    <span className="font-semibold text-zinc-900 text-[11px]">20-Second Reassurance Fallback:</span>
                    <p className="text-[10px] text-zinc-600 leading-relaxed">
                      If the owner does not answer within 20s, the bot reassures the caller (*&quot;Raghav ji vyast hain, maine aapka urgent message unhe WhatsApp par bhej diya hai&quot;*) and dispatches a high-priority WhatsApp push alert to the owner.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 04 OF 07</span>
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 5: SUB-100MS LATENCY & STATUTORY COMPLIANCE                          */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 04: INFRASTRUCTURE &amp; COMPLIANCE</span>
          </div>

          <div className="space-y-6 flex-1 py-6">
            <div className="space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">04. Speed &amp; Regulatory Governance</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                Pillars 5 &amp; 6: Telecom Latency (<span className="font-mono">&lt;100ms</span>) &amp; Statutory Compliance
              </h2>
            </div>

            {/* Pillar 5 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <Zap className="w-4 h-4 text-zinc-900" />
                <span>Pillar 5: Telecom-Grade Latency Architecture</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Conversational turn-taking speed determines whether callers trust the AI. Vaakriti achieves natural human cadence through four deliberate engineering decisions:
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                  <div className="font-semibold text-zinc-900 text-[11px]">300ms Fast VAD Endpointing</div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Silero VAD configured with 150ms speech duration, 250ms silence detection, and 300ms turn endpointing delay—cutting 600ms of dead air off every turn.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                  <div className="font-semibold text-zinc-900 text-[11px]">Native 8kHz PSTN Passthrough</div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Telephony calls synthesize natively at 8,000Hz, completely bypassing software rate conversion (<code className="text-[9px]">audioop.ratecv</code>) and eliminating audio crackles.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                  <div className="font-semibold text-zinc-900 text-[11px]">Speculative Preemptive Generation</div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Groq LLM streaming begins speculatively before the user speech boundary finishes, achieving 60ms–90ms Time-To-First-Token (TTFT).
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded space-y-1">
                  <div className="font-semibold text-zinc-900 text-[11px]">Zero-Delay Prebuffer Pacing</div>
                  <p className="text-[10px] text-zinc-600 leading-relaxed">
                    Playout begins on the very first received audio frame (40ms Exotel, 20ms Twilio), completely eliminating the previous 120ms jitter delay.
                  </p>
                </div>
              </div>
            </div>

            {/* Pillar 6 */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-zinc-950 border-b border-zinc-200 pb-1.5">
                <ShieldCheck className="w-4 h-4 text-zinc-900" />
                <span>Pillar 6: Statutory Compliance &amp; Frozen Rules (SEC-011)</span>
              </div>
              <p className="text-xs text-zinc-700 leading-relaxed">
                Indian telecommunications and digital privacy laws demand uncompromising compliance. Vaakriti enforces immutable guardrails checked via CI SHA-256 manifests:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-zinc-900 text-[11px]">Truthful AI Identity Disclosure</span>
                    <p className="text-[10px] text-zinc-600">Bot explicitly states it is an AI assistant in opening line (*&quot;Main Vaakriti se bol rahi hoon, ek AI assistant&quot;*).</p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 text-[9px] font-mono rounded font-bold">MANDATORY</span>
                </div>

                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-zinc-900 text-[11px]">Recording Transparency Notice</span>
                    <p className="text-[10px] text-zinc-600">Explicit disclosure stating calls may be recorded for service quality before any prospect interaction.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 text-[9px] font-mono rounded font-bold">MANDATORY</span>
                </div>

                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-zinc-900 text-[11px]">TRAI DLT &amp; Calling Hours Enforced</span>
                    <p className="text-[10px] text-zinc-600">Hard calling window floor (09:00 to 21:00 IST), real-time internal DND scrubbing, and consent tracking.</p>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-200 text-zinc-800 text-[9px] font-mono rounded font-bold">MANDATORY</span>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 05 OF 07</span>
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 6: WHY CHOOSE US — DETAILED COMPARISON MATRIX                        */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none page-break-after-always break-after-page">
          
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 05: COMPETITIVE BENCHMARK</span>
          </div>

          <div className="space-y-5 flex-1 py-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">05. Competitive Analysis</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                Why Enterprises Choose Vaakriti AI
              </h2>
              <p className="text-xs text-zinc-600">
                A rigorous side-by-side technical evaluation against human BPO call centers and generic voice bot platforms.
              </p>
            </div>

            {/* COMPARISON TABLE */}
            <div className="border border-zinc-300 rounded-lg overflow-hidden text-[10px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900 text-white font-mono text-[9px] uppercase tracking-wider">
                    <th className="p-2.5 border-r border-zinc-700 w-1/4">Capability / Dimension</th>
                    <th className="p-2.5 border-r border-zinc-700 w-1/4">Traditional Human BPO</th>
                    <th className="p-2.5 border-r border-zinc-700 w-1/4">Generic Voice Bots (Vapi/Bland)</th>
                    <th className="p-2.5 bg-zinc-950 text-emerald-400 font-bold w-1/4">Vaakriti AI System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  
                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Operational Adaptability</td>
                    <td className="p-2 text-zinc-600">Requires daily staff briefings; high human error</td>
                    <td className="p-2 text-rose-600">Static prompt only; cannot adapt to daily changes</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Spoken Voice Directives + Live Brain Sync</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">In-Call Transaction Settlement</td>
                    <td className="p-2 text-zinc-600">Manual payment links; delays of 2–6 hours</td>
                    <td className="p-2 text-rose-600">None; sends caller to website (85% drop-off)</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Instant GST Tax Invoice + UPI QR on WhatsApp</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Payment Proof Verification</td>
                    <td className="p-2 text-zinc-600">Manual review by accounts staff (24h SLA)</td>
                    <td className="p-2 text-rose-600">None; cannot inspect images or receipts</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Gemini Flash Vision OCR for 12-Digit UTRs</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Human Owner Escalation</td>
                    <td className="p-2 text-zinc-600">Transfer queues with 3–15 min hold times</td>
                    <td className="p-2 text-rose-600">Infinite forwarding loop or dropped calls</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Dual-SIM Anti-Loop + 20s Spoken Fallback</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">End-to-End Latency</td>
                    <td className="p-2 text-zinc-600">Natural human (200ms–400ms)</td>
                    <td className="p-2 text-rose-600">1,500ms – 2,500ms (robotic pauses)</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">&lt;100ms Processing + 300ms Fast Endpointing</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">PSTN Audio Quality</td>
                    <td className="p-2 text-zinc-600">Human PSTN voice</td>
                    <td className="p-2 text-rose-600">Software resampled 24kHz (crackles &amp; clipping)</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Native 8kHz Passthrough (Crystal Clear PSTN)</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Family / VIP Protection</td>
                    <td className="p-2 text-zinc-600">Requires manual caller ID checks</td>
                    <td className="p-2 text-rose-600">Pitches owner&apos;s family members as leads</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">Instant Whitelist + Campaign Auto-Scrub</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Statutory Compliance</td>
                    <td className="p-2 text-zinc-600">Inconsistent agent compliance scripts</td>
                    <td className="p-2 text-rose-600">No identity disclosure; TRAI violation risk</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">SEC-011 Frozen Guardrails + DLT Scrubbing</td>
                  </tr>

                  <tr>
                    <td className="p-2 font-semibold text-zinc-900 bg-zinc-50">Cost Efficiency</td>
                    <td className="p-2 text-zinc-600">₹25,000 – ₹40,000 per seat/month</td>
                    <td className="p-2 text-zinc-600">₹8 – ₹15 / minute (usage only)</td>
                    <td className="p-2 bg-emerald-50/50 font-semibold text-zinc-950">75% Lower Total Cost of Ownership (TCO)</td>
                  </tr>

                </tbody>
              </table>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1.5">
              <span className="font-serif font-bold text-xs text-zinc-950">Key Competitive Takeaway</span>
              <p className="text-[11px] text-zinc-700 leading-relaxed">
                Generic voice tools stop when the phone hangs up. Vaakriti manages the complete business loop: from answering with contextual memory, checking daily capacity, dispatching tax invoices, collecting verified UPI payments, and gracefully transferring VIP callers.
              </p>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 06 OF 07</span>
          </div>
        </article>


        {/* ========================================================================= */}
        {/* PAGE 7: COMMERCIAL ROI & 3-STEP DEPLOYMENT ROADMAP                        */}
        {/* ========================================================================= */}
        <article className="w-[210mm] min-h-[297mm] p-[20mm] mx-auto bg-white text-zinc-900 shadow-2xl rounded-sm flex flex-col justify-between print:shadow-none print:m-0 print:p-[15mm] print:w-full print:min-h-[297mm] print:rounded-none">
          
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 text-[10px] font-mono text-zinc-500">
            <span>VAAKRITI AI • EXECUTIVE SPECIFICATION</span>
            <span>SECTION 06: COMMERCIAL ROADMAP</span>
          </div>

          <div className="space-y-6 flex-1 py-6">
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">06. Deployment &amp; Engagement</span>
              <h2 className="text-2xl font-serif font-bold text-zinc-950">
                Enterprise Commercial Model &amp; Rapid Rollout
              </h2>
            </div>

            {/* Financial ROI Highlights */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                <div className="text-2xl font-serif font-bold text-zinc-950">3.4x</div>
                <div className="text-[10px] font-mono uppercase text-zinc-600 font-semibold">Payment Acceleration</div>
                <p className="text-[9px] text-zinc-500">Mid-call UPI QR dispatch closes deals within 15 minutes of verbal agreement.</p>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                <div className="text-2xl font-serif font-bold text-zinc-950">75%</div>
                <div className="text-[10px] font-mono uppercase text-zinc-600 font-semibold">Operational Cost Savings</div>
                <p className="text-[9px] text-zinc-500">Eliminates after-hours human staffing overhead while achieving 24/7 availability.</p>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1">
                <div className="text-2xl font-serif font-bold text-zinc-950">100%</div>
                <div className="text-[10px] font-mono uppercase text-zinc-600 font-semibold">Call Capture Rate</div>
                <p className="text-[9px] text-zinc-500">Zero missed calls, automatic callback scheduling, and instant owner notifications.</p>
              </div>
            </div>

            {/* 3-STEP ROLLOUT ROADMAP */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-900">
                3-Step Enterprise Deployment Plan (4-Day Turnaround)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                    D1
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-[11px]">Day 1: Operations Brain Setup &amp; Knowledge Ingestion</div>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Connect business catalog, upload price lists, sync appointment slots, and attest non-custodial UPI payout credentials.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                    D2
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-[11px]">Days 2–3: Telephony Integration &amp; Sandbox Verification</div>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Assign Exotel/Twilio numbers, configure dual-SIM forwarding rules, verify WhatsApp webhook callbacks, and test Hindi/Hinglish speech edge cases.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded flex items-start gap-3">
                  <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                    D4
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-[11px]">Day 4: Live Carrier Activation &amp; Enterprise Cutover</div>
                    <p className="text-[10px] text-zinc-600 leading-normal">
                      Activate full SIP routing, verify live carrier DLT registrations, and grant role-based admin dashboard visibility to your executive team.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Sign-off */}
            <div className="p-4 bg-zinc-900 text-white rounded-lg flex items-center justify-between mt-4">
              <div className="space-y-1">
                <div className="font-serif font-bold text-sm">Ready to Deploy Vaakriti Enterprise?</div>
                <div className="text-[10px] text-zinc-300 font-mono">Contact: enterprise@vaakriti.com • Phone: +91 95138 86363</div>
              </div>
              <div className="text-right text-[10px] font-mono text-emerald-400">
                SLA: 99.9% UPTIME GUARANTEED
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3 flex justify-between items-center text-[10px] font-mono text-zinc-400">
            <span>CONFIDENTIAL • VAAKRITI AI</span>
            <span>PAGE 07 OF 07</span>
          </div>
        </article>

      </main>
    </div>
  )
}
