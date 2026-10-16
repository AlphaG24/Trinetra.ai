"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";

const TESTIMONIALS = [
  {
    id: 1,
    quote:
      "Arika handled over 8,500 patient appointments across our Mumbai and Pune clinics in Hinglish without a single breakdown. The voice quality, medical politeness, and zero hold times transformed our patient experience.",
    author: "Dr. Ananya Sen",
    role: "Chief of Operations",
    company: "CarePulse Health & Multispecialty Clinics",
    location: "Mumbai",
    metric: "8,500+ calls answered with zero hold time",
  },
  {
    id: 2,
    quote:
      "Our property advisors used to take 4 to 6 hours to call back portal leads. With Vaakriti, our outbound agent engages buyers within 15 seconds, qualifies their budget, and schedules weekend site visits directly on Google Calendar.",
    author: "Rajesh Verma",
    role: "Director of Sales & Growth",
    company: "Nexus Real Estate Group",
    location: "Gurugram / NCR",
    metric: "3.4x jump in qualified site visits",
  },
  {
    id: 3,
    quote:
      "Telecom compliance was our biggest fear. Vaakriti's automatic TRAI DND scrubbing and strict 9am-9pm pacing gave our legal team 100% confidence. Our EMI reminder collections speed increased by 42%.",
    author: "Vikramaditya Singhania",
    role: "Head of Digital Collections",
    company: "FinFirst Lending Capital",
    location: "Bengaluru",
    metric: "42% faster loan installment recovery",
  },
];

export function Testimonials() {
  const [activeIdx, setActiveIdx] = useState(0);

  const prev = () => setActiveIdx((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1));

  const curr = TESTIMONIALS[activeIdx];

  return (
    <section id="testimonials" className="w-full bg-white py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[1400px]">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-4">
            <MessageSquareQuote className="w-3.5 h-3.5 text-emerald-600" />
            <span>ENTERPRISE CLIENT VALIDATION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl">
            Trusted by operational leaders across India.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl">
            See how clinics, real estate developers, and financial institutions deploy Vaakriti to solve high-volume customer communications.
          </p>
        </div>

        {/* Testimonial Showcase Carousel */}
        <div className="max-w-4xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={curr.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-[2.2rem] sm:rounded-[2.8rem] border border-slate-200/90 bg-slate-50/70 p-8 sm:p-12 lg:p-16 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.04)] relative"
            >
              {/* Stars & Metric Pill */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-800 border border-emerald-200 uppercase">
                  {curr.metric}
                </span>
              </div>

              {/* Quote Text */}
              <blockquote className="text-lg sm:text-xl md:text-2xl font-medium text-slate-800 leading-relaxed mb-10 italic">
                &ldquo;{curr.quote}&rdquo;
              </blockquote>

              {/* Author Info & Nav Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t border-slate-200/80">
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900">
                    {curr.author}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 font-medium">
                    {curr.role} &bull; <span className="text-slate-800 font-semibold">{curr.company}</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {curr.location}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    aria-label="Previous testimonial"
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={next}
                    aria-label="Next testimonial"
                    className="w-10 h-10 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  activeIdx === i ? "w-8 bg-slate-900" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
