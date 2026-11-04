'use client'

import React from 'react'
import { 
  PhoneCall, 
  Brain, 
  Receipt, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Users, 
  ArrowRight, 
  Download, 
  Printer, 
  CheckCircle2, 
  Sparkles,
  Layers,
  MessageSquare,
  Lock,
  Clock,
  TrendingUp,
  Server,
  FileText
} from 'lucide-react'
import { VaakritiSymbolVector } from '@/components/ui/VaakritiSymbolVector'
import { VaakritiWordmark } from '@/components/ui/VaakritiWordmark'

export default function EnterpriseBrochurePage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-[#07010e] text-zinc-100 selection:bg-zinc-800 selection:text-white print:bg-white print:text-zinc-900">
      {/* Floating Action Bar (Hidden on print) */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 p-2 rounded-full shadow-2xl print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-zinc-200 transition shadow-md"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 md:py-20 space-y-24 print:space-y-12 print:p-0 print:max-w-none">
        
        {/* ========================================================================= */}
        {/* SECTION 1: EXECUTIVE COVER                                               */}
        {/* ========================================================================= */}
        <section className="relative rounded-3xl border border-zinc-800/80 bg-gradient-to-b from-zinc-900/50 via-zinc-950/80 to-[#07010e] p-10 md:p-16 overflow-hidden print:border-zinc-300 print:bg-white print:p-8">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-zinc-800/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-zinc-800/80 pb-8 print:border-zinc-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center p-2 text-white print:border-zinc-400">
                <VaakritiSymbolVector className="w-full h-full" />
              </div>
              <div className="h-7 w-36 text-white print:text-black">
                <VaakritiWordmark className="w-full h-full" />
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] font-mono tracking-wider text-zinc-300 print:text-zinc-700 print:border-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse print:bg-black" />
              ENTERPRISE VOICE PLATFORM SPECIFICATION
            </div>
          </div>

          <div className="mt-12 space-y-6 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-serif tracking-tight leading-[1.1] text-zinc-100 print:text-black">
              Autonomous Voice Infrastructure for Mission-Critical Businesses.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed font-light print:text-zinc-600">
              Beyond simple voice chatbots: A complete conversational operating system equipped with a real-time business brain, instant in-call GST invoicing, UPI QR dispatch, WhatsApp Vision OCR verification, and intelligent warm transfer.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-800/80 pt-8 print:border-zinc-300">
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-white print:text-black">&lt;100ms</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Turn Latency</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-white print:text-black">100%</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Non-Custodial UPI</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-white print:text-black">Instant</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">WhatsApp Vision OCR</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-white print:text-black">TRAI &amp; RBI</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Statutory Compliant</div>
            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* SECTION 2: THE PROBLEM VS VAAKRITI AI                                    */}
        {/* ========================================================================= */}
        <section className="space-y-8">
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Comparative Analysis</div>
            <h2 className="text-3xl font-serif tracking-tight text-white print:text-black">
              Why Generic Voice Agents Fail in Real Business Operations
            </h2>
            <p className="text-zinc-400 text-sm max-w-2xl print:text-zinc-600">
              Generic voice bots are conversational dead-ends: they cannot access today&apos;s changing slots, cannot accept payments, drop calls when asked for the owner, and hallucinate prices. Vaakriti AI was engineered from the ground up as a deterministic business operator.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Ordinary Bot Column */}
            <div className="p-8 rounded-2xl border border-rose-950/40 bg-rose-950/10 space-y-6 print:border-zinc-300 print:bg-zinc-50">
              <div className="flex items-center gap-3 text-rose-400 font-mono text-xs uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Ordinary Commercial Voice Bots
              </div>
              <ul className="space-y-4 text-sm text-zinc-400 print:text-zinc-600">
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 mt-0.5">✕</span>
                  <span><strong>Static Prompt Blindness:</strong> Cannot adapt when daily schedules, doctor timings, or salon hours change in real-time.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 mt-0.5">✕</span>
                  <span><strong>Dead-End Conversations:</strong> Caller agrees to buy or book, but the bot cannot create invoices or collect payment on the spot.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 mt-0.5">✕</span>
                  <span><strong>Infinite Forwarding Loops:</strong> When the caller asks for the owner, it calls the owner&apos;s forwarding line, creating an infinite phone loop.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-rose-400 mt-0.5">✕</span>
                  <span><strong>High Latency &amp; Crackles:</strong> 1.5s to 2.5s turn-taking pauses make calls feel robotic, clunky, and unnatural.</span>
                </li>
              </ul>
            </div>

            {/* Vaakriti Column */}
            <div className="p-8 rounded-2xl border border-zinc-700 bg-zinc-900/60 space-y-6 print:border-zinc-800 print:bg-white shadow-xl">
              <div className="flex items-center gap-3 text-emerald-400 print:text-black font-mono text-xs uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 print:bg-black" />
                Vaakriti Autonomous Voice Infrastructure
              </div>
              <ul className="space-y-4 text-sm text-zinc-300 print:text-zinc-800">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black mt-0.5 shrink-0" />
                  <span><strong>Live Operations Brain:</strong> Business owners speak or type daily directives (*&quot;Open at 10 AM today&quot;*), instantly updating agent facts without re-prompting.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black mt-0.5 shrink-0" />
                  <span><strong>Cash-to-Call &amp; Branded Invoicing:</strong> Creates custom GST invoices during the call, sends UPI QR codes on WhatsApp, and tracks revenue.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black mt-0.5 shrink-0" />
                  <span><strong>Smart Dual-SIM Warm Transfer:</strong> Recognizes family/VIPs, whispers call context to owner, and falls back to WhatsApp reassurance in 20s.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black mt-0.5 shrink-0" />
                  <span><strong>Sub-100ms Native 8kHz Telephony:</strong> Zero-latency streaming with Silero fast VAD and native PSTN audio passthrough.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* SECTION 3: THE 5 ENTERPRISE PILLARS                                      */}
        {/* ========================================================================= */}
        <section className="space-y-12">
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Architectural Core</div>
            <h2 className="text-3xl font-serif tracking-tight text-white print:text-black">
              Five Architectural Pillars That Power Vaakriti
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* PILLAR 1: OPERATIONS BRAIN */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <Brain className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">1. Operations Brain Hub</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Dynamic mission control where business owners post daily voice memos, sync live appointment slots, and manage inventory sheets. The live agent injects these facts on every call in real-time.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                Spoken Voice Directives + Multi-Doc Ingest
              </div>
            </div>

            {/* PILLAR 2: CUSTOM INVOICE & CASH TO CALL */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">2. Cash-to-Call &amp; Invoicing</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Converts verbal agreements into revenue. Generates branded B2B/B2C GST tax invoices on the fly featuring the company logo, terms, and custom UPI QR codes dispatched during the call.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                RBI Non-Custodial Direct Settlement
              </div>
            </div>

            {/* PILLAR 3: WHATSAPP VISION BOT */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">3. WhatsApp Vision Bot</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                When customers reply with payment screenshots (GPay, PhonePe, Paytm), Gemini Flash Vision OCR extracts the 12-digit UTR, auto-reconciles the ledger, and replies with confirmation.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                12-Digit UTR OCR &amp; Deal Reconciliation
              </div>
            </div>

            {/* PILLAR 4: WARM TRANSFER & VIP PROTECTION */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">4. Warm Transfer &amp; VIP Shield</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Dual-SIM loop prevention: Family &amp; VIP callers are transferred directly without pitch loops. If owner is busy, speaks an intelligent 20s reassurance and alerts owner on WhatsApp.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                Anti-Loop Telephony + Whisper Connect
              </div>
            </div>

            {/* PILLAR 5: SUB-100MS STREAMING PIPELINE */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">5. Sub-100ms Latency Engine</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Telecom-grade speed: 300ms endpointing delay, speculative token emission, zero-delay single frame prebuffering, and native 8kHz PSTN synthesis eliminate robotic pauses and voice crackles.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                Native 8kHz Passthrough + Silero Fast VAD
              </div>
            </div>

            {/* PILLAR 6: STATUTORY COMPLIANCE & GOVERNANCE */}
            <div className="p-7 rounded-2xl border border-zinc-800 bg-zinc-950/80 space-y-4 print:border-zinc-300 print:bg-white">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white print:border-zinc-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white print:text-black">6. Regulatory Compliance</h3>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                SEC-011 frozen compliance engine guarantees AI identity disclosure, call recording notice, TRAI DLT registry scrubbing, calling hour floors (09:00 - 21:00), and encrypted KYC vaults.
              </p>
              <div className="pt-2 text-[11px] font-mono text-zinc-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                TRAI DND + DPDP Act + SHA-256 CI Manifest
              </div>
            </div>

          </div>
        </section>


        {/* ========================================================================= */}
        {/* SECTION 4: END-TO-END CALL TO CASH WORKFLOW                              */}
        {/* ========================================================================= */}
        <section className="space-y-8 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-8 md:p-12 print:border-zinc-300 print:bg-white">
          <div className="space-y-2">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500">Operational Walkthrough</div>
            <h2 className="text-2xl md:text-3xl font-serif text-white print:text-black">
              How a Real Business Call Completes Automatically
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative pt-4">
            
            <div className="space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-white print:border-zinc-400 print:text-black">
                01
              </div>
              <h4 className="text-sm font-semibold text-white print:text-black">Call Connects</h4>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Caller dials company number. Bot states AI identity &amp; recording notice, addresses repeat callers by name, and references past interaction context.
              </p>
            </div>

            <div className="space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-white print:border-zinc-400 print:text-black">
                02
              </div>
              <h4 className="text-sm font-semibold text-white print:text-black">Brain Fact Check</h4>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Agent negotiates pricing or books slots by querying live directives and inventory in Operations Brain without slot overlapping or price hallucination.
              </p>
            </div>

            <div className="space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-white print:border-zinc-400 print:text-black">
                03
              </div>
              <h4 className="text-sm font-semibold text-white print:text-black">Instant Invoice Dispatch</h4>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Deal agreed verbally. Bot immediately generates custom GST invoice with UPI ID &amp; QR code and sends it to the caller&apos;s WhatsApp before the call ends.
              </p>
            </div>

            <div className="space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-white print:border-zinc-400 print:text-black">
                04
              </div>
              <h4 className="text-sm font-semibold text-white print:text-black">Vision Auto-Reconcile</h4>
              <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
                Caller sends payment screenshot. WhatsApp Vision Bot extracts 12-digit UTR, updates Cash-to-Call ledger to WON, and dispatches verified receipts.
              </p>
            </div>

          </div>
        </section>


        {/* ========================================================================= */}
        {/* SECTION 5: ENTERPRISE SECURITY & SLA                                      */}
        {/* ========================================================================= */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-3 print:border-zinc-300 print:bg-white">
            <Lock className="w-5 h-5 text-zinc-400 print:text-black" />
            <h4 className="text-base font-serif text-white print:text-black">Zero-Trust Security</h4>
            <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
              Role-based access control (RBAC), 30-minute idle session timeouts, step-up MFA, and encrypted AES-256 KYC vaults protecting Aadhaar and business records.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-3 print:border-zinc-300 print:bg-white">
            <Server className="w-5 h-5 text-zinc-400 print:text-black" />
            <h4 className="text-base font-serif text-white print:text-black">High Availability</h4>
            <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
              Mumbai data center edge routing (<span className="text-emerald-400 print:text-black">&lt;15ms</span> RTT to Indian carriers), automated daily backups, and zero in-call disconnect guarantees.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/40 space-y-3 print:border-zinc-300 print:bg-white">
            <TrendingUp className="w-5 h-5 text-zinc-400 print:text-black" />
            <h4 className="text-base font-serif text-white print:text-black">Direct Financial ROI</h4>
            <p className="text-xs text-zinc-400 leading-relaxed print:text-zinc-600">
              Replace expensive, fragmented call center setups with an automated operator that works 24/7, never misses a callback, and drives 3.4x faster payment closure.
            </p>
          </div>
        </section>


        {/* ========================================================================= */}
        {/* SECTION 6: CLOSING SPECIFICATION & CONTACT                                */}
        {/* ========================================================================= */}
        <footer className="border-t border-zinc-800 pt-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:border-zinc-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 text-white print:text-black">
                <VaakritiSymbolVector className="w-full h-full" />
              </div>
              <span className="font-serif font-semibold tracking-wider text-sm text-white print:text-black">VAAKRITI AI</span>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              Enterprise Voice &amp; Conversational Infrastructure • contact@vaakriti.com
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-500 print:text-zinc-600 text-left md:text-right space-y-0.5">
            <div>Deployment: Multi-Tenant Cloud &amp; Dedicated On-Premises</div>
            <div>Built for High-Growth Indian &amp; Global Enterprises</div>
          </div>
        </footer>

      </div>
    </div>
  )
}
