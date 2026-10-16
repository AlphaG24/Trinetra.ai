"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does Vaakriti achieve sub-480ms turnaround latency?",
    answer:
      "We use edge-streamed WebRTC via LiveKit paired with streaming acoustic models and parallel token processing. By avoiding buffered audio round-trips and using low-latency Indian data nodes, conversations feel human, with zero awkward pauses and instant reaction to interruptions.",
  },
  {
    question: "How does automated TRAI compliance and DND scrubbing work?",
    answer:
      "Every outbound call queue is pre-scrubbed in real time against the National Customer Preference Register (NCPR). Additionally, our telecom dispatch system enforces an automated hard lock from 21:00 to 09:00 IST, preventing calls outside statutory Indian telemarketing hours.",
  },
  {
    question: "Can Vaakriti handle mixed vernacular code-switching (e.g., Hinglish)?",
    answer:
      "Yes. Unlike generic Western voice models that stumble on Indian accents, Vaakriti is trained specifically on conversational Indian cadences. It fluently understands and speaks natural code-switching (e.g., mixing Hindi and English mid-sentence) while maintaining cultural politeness.",
  },
  {
    question: "How does it connect to our existing CRM, Calendar, and PBX?",
    answer:
      "Vaakriti integrates with Salesforce, Zoho CRM, HubSpot, and Google Calendar out of the box. For telephony, you can provision instant KYC-verified +91 virtual SIP lines through our platform or bridge your existing enterprise contact center via SIP trunking.",
  },
  {
    question: "Where is our customer data and call recordings stored?",
    answer:
      "All audio streams, call recordings, transcripts, and LLM inferences stay strictly within Indian sovereign borders (Mumbai & Delhi data centers). We provide automated PII redaction (masking Aadhaar, PAN, and card numbers) in compliance with the Digital Personal Data Protection (DPDP) Act 2023.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="w-full bg-transparent py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="mx-auto max-w-[960px]">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-white text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Everything You Need to Know
          </h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl">
            Clear answers on latency, Indian telephony regulations, integrations, and enterprise security.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3.5">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full py-5 px-6 sm:px-7 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    {faq.question}
                  </span>
                  <div className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 bg-slate-900 text-white" : "text-slate-600"}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-6 sm:px-7 pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
