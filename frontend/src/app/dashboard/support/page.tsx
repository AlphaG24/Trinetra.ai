'use client'

import { useState } from 'react'
import { Mail, MessageSquare, ChevronDown } from 'lucide-react'

const SUPPORT_EMAIL = "support@trinetraedu-ai.com";
const WHATSAPP_NUMBER = "919452045499";

const FAQS = [
  {
    question: "How does the JIT (Just-In-Time) quota provisioning work?",
    answer: "When you launch a new agent from the marketplace, our engine automatically provisions a secure sandbox with a default allocation of free compute credits (documents, minutes, or tasks) so you can test the deployment instantly."
  },
  {
    question: "Are my documents and telemetry data secure?",
    answer: "Yes. All agents operate on isolated, multi-tenant architectures. Event telemetry and processed data are encrypted at rest and strictly partitioned by your workspace ID."
  },
  {
    question: "How do I upgrade an agent to a production tier?",
    answer: "Navigate to the marketplace product page of the specific agent and select an enterprise or pay-as-you-go tier, or submit a Custom Deployment Request for tailored integration."
  },
  {
    question: "Can I connect these autonomous agents to my existing software?",
    answer: "Absolutely. Our deployment team specializes in custom API bridges, allowing agents to seamlessly sync with your current CRM, ERP, or proprietary databases."
  }
]

export default function SupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-12 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      
      {/* Header */}
      <div className="space-y-2 text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3 font-display">
          🎧 Help & Support
        </h1>
        <p className="text-violet-300/60 text-sm">
          Get technical assistance, browse our FAQ guides, or contact support directly.
        </p>
      </div>

      {/* Top Section: Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Email Support */}
        <div className="flex flex-col justify-between items-start space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400 border border-violet-500/15">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Email Support</h2>
              <p className="text-xs text-zinc-400">Response within 24 hours</p>
            </div>
          </div>
          <button
            onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}`, '_blank')}
            className="w-full sm:w-auto px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-violet-500/20 active:scale-[0.98] cursor-pointer"
          >
            Open Support Ticket
          </button>
        </div>

        {/* WhatsApp Support */}
        <div className="flex flex-col justify-between items-start space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/15">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Live WhatsApp Chat</h2>
              <p className="text-xs text-zinc-400">Instant chat assistance</p>
            </div>
          </div>
          <button
            onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank')}
            className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-zinc-200 hover:text-white font-semibold text-sm rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            Chat on WhatsApp
          </button>
        </div>

      </div>

      {/* Bottom Section: Interactive FAQ */}
      <div className="space-y-6 pt-8 border-t border-white/5">
        <div>
          <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-violet-300/40 mt-1">Quick self-help answers for autonomous agent operations.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div 
                key={index} 
                className="bg-[#12101A] border border-white/5 rounded-xl overflow-hidden transition-all duration-200 hover:bg-white/[0.02]"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-medium text-sm text-zinc-200 hover:text-white transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown 
                    className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-400' : ''}`} 
                  />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-zinc-400 leading-relaxed border-t border-white/5 bg-black/10 animate-in slide-in-from-top-1 duration-200">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
