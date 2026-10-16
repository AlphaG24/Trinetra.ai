"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Calculator, ArrowRight, TrendingDown, Clock, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

export function RoiCalculator() {
  const [callVolume, setCallVolume] = useState<number>(5000);
  const [callDuration, setCallDuration] = useState<number>(3); // minutes

  // Calculations
  const totalMinutes = callVolume * callDuration;
  
  // Traditional Agent Costs:
  // Avg agent handles ~1,200 calls/mo at ₹28,000/mo salary + overhead
  const agentsRequired = Math.max(1, Math.ceil(callVolume / 1200));
  const humanAgentCost = agentsRequired * 28000;
  const humanInfraCost = agentsRequired * 4500; // seat licenses, hardware, telecom lines
  const traditionalTotal = humanAgentCost + humanInfraCost;

  // Vaakriti AI Cost:
  // Flat usage rate of approx ₹3.2/min
  const vaakritiCost = Math.round(totalMinutes * 3.2);

  // Net Savings
  const monthlySavings = Math.max(0, traditionalTotal - vaakritiCost);
  const annualSavings = monthlySavings * 12;
  const savingsPercent = Math.min(92, Math.round((monthlySavings / traditionalTotal) * 100));

  // Time saved
  const humanHoursSaved = Math.round((totalMinutes / 60));

  return (
    <section id="roi-calculator" className="w-full bg-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[1400px]">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-4">
            <Calculator className="w-3.5 h-3.5 text-emerald-600" />
            <span>INTERACTIVE ROI &amp; SAVINGS CALCULATOR</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl">
            See how much your business saves with autonomous voice.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl">
            Replace escalating manual calling floor salaries, agent churn, and night-shift premiums with intelligent, always-available Indian AI agents.
          </p>
        </div>

        {/* Dual Column Calculator Card */}
        <div className="rounded-[2.2rem] lg:rounded-[2.8rem] border border-slate-200/90 bg-slate-50/60 p-6 sm:p-10 lg:p-14 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.05)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left Column: Sliders & Inputs */}
            <div className="lg:col-span-6 space-y-8">
              
              {/* Slider 1: Monthly Calls */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Monthly Call Volume
                  </span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-600">
                    {callVolume.toLocaleString()} calls
                  </span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={50000}
                  step={500}
                  value={callVolume}
                  onChange={(e) => setCallVolume(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                  <span>500 calls</span>
                  <span>25,000 calls</span>
                  <span>50,000 calls</span>
                </div>
              </div>

              {/* Slider 2: Average Call Duration */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    Average Call Duration
                  </span>
                  <span className="text-base sm:text-lg font-mono font-extrabold text-emerald-600">
                    {callDuration} mins
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={callDuration}
                  onChange={(e) => setCallDuration(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                  <span>1 min (quick confirmation)</span>
                  <span>5 mins</span>
                  <span>10 mins (deep consultation)</span>
                </div>
              </div>

              {/* Breakdown Metric Checkpoints */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Monthly Hours Saved</span>
                  </div>
                  <div className="text-xl font-mono font-bold text-slate-900">
                    {humanHoursSaved.toLocaleString()} hrs
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Redirected to core business
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Operating Cost Cut</span>
                  </div>
                  <div className="text-xl font-mono font-bold text-emerald-600">
                    ~{savingsPercent}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Lower customer acquisition cost
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Comparative Results Card */}
            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.06)]">
                
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-1">
                  ESTIMATED ECONOMIC COMPARISON
                </span>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  Monthly Cost Breakdown
                </h3>

                {/* Comparison Bar: Traditional */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                    <span>Traditional Human Call Center ({agentsRequired} reps)</span>
                    <span className="font-mono text-slate-900">₹{traditionalTotal.toLocaleString()}/mo</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full w-full" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Salaries, desk overhead, training, &amp; night shift allowances
                  </span>
                </div>

                {/* Comparison Bar: Vaakriti AI */}
                <div className="mb-8">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 mb-2">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5" />
                      Vaakriti Autonomous Voice
                    </span>
                    <span className="font-mono text-emerald-600 font-extrabold">₹{vaakritiCost.toLocaleString()}/mo</span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-emerald-100 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(8, Math.min(100, (vaakritiCost / traditionalTotal) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                    24/7 instantaneous answering, zero hiring delay, zero absenteeism
                  </span>
                </div>

                {/* Total Savings Highlight Box */}
                <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/60 p-6 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                      Your Net Estimated Monthly Savings:
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                      {savingsPercent}% SAVED
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-700">
                    ₹{monthlySavings.toLocaleString()}
                    <span className="text-sm font-sans font-medium text-emerald-800 ml-1">/ month</span>
                  </div>
                  <div className="text-xs text-emerald-800/80 font-medium mt-1">
                    Equivalent to <span className="font-bold font-mono">₹{annualSavings.toLocaleString()}</span> in annual operational capital retained.
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between gap-4">
                  <a
                    href="#live-demo"
                    className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>Test Voice Studio Live</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
