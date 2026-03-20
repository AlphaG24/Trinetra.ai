"use client";

import { Layout } from "@/components/layout/Layout";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import NextLink from "next/link";
import { Check, X, ChevronDown, Shield, RefreshCw, Activity, ArrowRight, ArrowRightCircle } from "lucide-react";

const faqs = [
  { q: "Can I switch plans mid-month?", a: "Yes. Upgrades take effect immediately and you're charged the prorated difference. Downgrades take effect at the start of your next billing cycle." },
  { q: "What happens if I exceed my limits?", a: "You'll receive alerts at 80% and 100% usage. Beyond your included limits, overage rates apply automatically. Your agents never stop working — we prioritize your business continuity." },
  { q: "Do unused minutes roll over?", a: "Currently, unused minutes do not roll over to the next month. We're exploring rollover options for annual plan subscribers." },
  { q: "What counts as one chat conversation?", a: "One conversation = one complete interaction from greeting to resolution, regardless of how many messages are exchanged within that conversation." },
  { q: "Can I add more agents without upgrading?", a: "On the Scale plan, additional agents beyond 7 are available at ₹3,000/agent/month. For Starter and Growth plans, you'll need to upgrade to add more agents." },
  { q: "Is there a free trial?", a: "We offer a live demo where you can experience the AI agent handling real scenarios for your business. We don't offer unattended free trials because each agent is custom-configured for your specific business." }
];

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showOverage, setShowOverage] = useState(false);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <Layout>
      <div className="flex flex-col bg-[#080010] min-h-screen">
        
        {/* HERO SECTION */}
        <section className="w-full pt-[140px] pb-[60px] text-center px-[20px] relative overflow-hidden">
          <div 
            className="absolute inset-0 z-0 pointer-events-none" 
            style={{ 
              background: 'radial-gradient(ellipse 600px 400px at top center, rgba(139,92,246,0.1) 0%, transparent 60%)' 
            }} 
          />
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-[800px] mx-auto flex flex-col items-center"
          >
            <div className="inline-block bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-medium text-[13px] px-[16px] py-[6px] rounded-full mb-[24px]">
              ✦ Pricing
            </div>
            <h1 className="font-display font-bold text-[36px] md:text-[48px] text-[#F5F3FF] tracking-[-0.02em] leading-tight mb-[16px]">
              Simple Pricing. <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #8B5CF6 0%, #FBBF24 100%)' }}>Real</span> Value.
            </h1>
            <p className="font-sans font-normal text-[16px] md:text-[18px] text-[#A8A0C0] max-w-[500px] mb-[40px]">
              No hidden fees. No surprises. Pay for what you use.
            </p>

            {/* TOGGLE SWITCH */}
            <div 
              className="w-[300px] h-[44px] bg-[#130224] border border-[#1E0A35] rounded-[100px] p-[4px] flex items-center justify-between mx-auto relative cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.05)]"
              onClick={() => setIsAnnual(!isAnnual)}
            >
              <motion.div 
                className="absolute top-[3px] bottom-[3px] bg-[#8B5CF6] rounded-[100px] shadow-[0_4px_10px_rgba(139,92,246,0.3)]"
                initial={false}
                animate={{ 
                  left: isAnnual ? "calc(50% + 2px)" : "4px",
                  width: isAnnual ? "calc(50% - 6px)" : "calc(50% - 6px)" 
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />

              <div className={`relative z-10 w-1/2 flex items-center justify-center py-[8px] transition-colors duration-300 font-sans font-semibold text-[14px] ${!isAnnual ? 'text-[#FFFFFF]' : 'text-[#6B6088]'}`}>
                Monthly
              </div>
              <div className={`relative z-10 w-1/2 flex items-center justify-center gap-[6px] py-[8px] transition-colors duration-300 font-sans font-semibold text-[14px] ${isAnnual ? 'text-[#FFFFFF]' : 'text-[#6B6088]'}`}>
                Annually 
                <motion.span 
                  className="bg-[rgba(16,185,129,0.15)] text-[#10B981] font-sans font-bold text-[10px] px-[6px] py-[2px] rounded-full whitespace-nowrap"
                  animate={isAnnual ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  Save 20%
                </motion.span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* PRICING CARDS */}
        <section className="w-full max-w-[1400px] mx-auto px-[20px] pb-[80px]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px]">
            
            {/* CARD 1: STARTER */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="bg-[#130224] border border-[#1E0A35] rounded-[20px] py-[40px] px-[32px] flex flex-col relative transition-all duration-300 hover:border-[#8B5CF6]/40"
            >
              <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[8px]">Starter</h3>
              <p className="font-sans font-normal text-[14px] text-[#A8A0C0] mb-[24px] min-h-[42px]">
                For small businesses beginning with AI
              </p>
              
              <div className="flex flex-col min-h-[140px]">
                {isAnnual && (
                  <div className="font-sans font-medium text-[16px] text-[#6B6088] line-through mb-[-4px]">
                    ₹4,999
                  </div>
                )}
                <div className="h-[48px] overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isAnnual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-baseline gap-[4px]"
                    >
                      <span className="font-display font-bold text-[44px] text-[#F5F3FF] leading-none">
                        {isAnnual ? "₹3,999" : "₹4,999"}
                      </span>
                      <span className="font-sans font-normal text-[14px] text-[#6B6088]">/month</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="h-[48px] mt-[8px]">
                  <AnimatePresence>
                    {isAnnual && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="font-sans font-normal text-[13px] text-[#6B6088]"
                      >
                        Billed ₹47,988/year
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="w-full h-[1px] bg-[#1E0A35] mb-[32px]" />

              <div className="flex flex-col gap-[14px] mb-[40px] flex-grow">
                {[
                  { text: "1 AI Agent (Voice or Chat or Social)", checked: true },
                  { text: "150 voice minutes included", checked: true },
                  { text: "OR 500 chat conversations", checked: true },
                  { text: "OR 30 social media posts", checked: true },
                  { text: "Hindi + English", checked: true },
                  { text: "Basic analytics", checked: true },
                  { text: "Email support (24hr response)", checked: true },
                  { text: "Agent setup included", checked: true },
                  { text: "ROI Dashboard", checked: false },
                  { text: "Custom voice", checked: false },
                  { text: "Priority support", checked: false }
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-[12px]">
                    {feat.checked ? (
                      <Check size={18} className="text-[#10B981] shrink-0 mt-[2px]" />
                    ) : (
                      <X size={18} className="text-[#6B6088] shrink-0 mt-[2px]" />
                    )}
                    <span className={`font-sans font-normal text-[14px] leading-tight ${feat.checked ? 'text-[#F5F3FF]' : 'text-[#6B6088] line-through'}`}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <NextLink href="/contact?plan=starter" className="w-full block text-center py-[14px] rounded-[10px] border border-[#8B5CF6] text-[#A78BFA] font-sans font-medium text-[15px] transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white">
                  Claim This Plan →
                </NextLink>
                <div className="text-[12px] text-[#6B6088] font-sans text-center mt-[12px]">
                  ₹12/min · ₹3/chat · ₹18/post beyond limits
                </div>
              </div>
            </motion.div>

            {/* CARD 2: GROWTH (HIGHLIGHTED) */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-gradient-to-b from-[rgba(139,92,246,0.05)] to-[#130224] border border-[#8B5CF6] rounded-[20px] py-[40px] px-[32px] flex flex-col relative transition-all duration-300 shadow-[0_0_50px_rgba(139,92,246,0.15)] scale-100 xl:-translate-y-[8px]"
            >
              <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-[rgba(139,92,246,0.15)] text-[#A78BFA] font-sans font-semibold text-[11px] px-[14px] py-[4px] rounded-[100px] border border-[#8B5CF6]/30 backdrop-blur-sm whitespace-nowrap uppercase tracking-[0.05em]">
                MOST POPULAR
              </div>
              
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#FBBF24] via-[#8B5CF6] to-[#06B6D4] rounded-t-[20px]" />

              <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[8px]">Growth</h3>
              <p className="font-sans font-normal text-[14px] text-[#A8A0C0] mb-[24px] min-h-[42px]">
                For growing businesses that need more
              </p>
              
              <div className="flex flex-col min-h-[140px]">
                {isAnnual && (
                  <div className="font-sans font-medium text-[16px] text-[#6B6088] line-through mb-[-4px]">
                    ₹11,999
                  </div>
                )}
                <div className="h-[48px] overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isAnnual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-baseline gap-[4px]"
                    >
                      <span className="font-display font-bold text-[44px] text-[#F5F3FF] leading-none">
                        {isAnnual ? "₹9,599" : "₹11,999"}
                      </span>
                      <span className="font-sans font-normal text-[14px] text-[#6B6088]">/month</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="h-[48px] mt-[8px]">
                  <AnimatePresence>
                    {isAnnual && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="font-sans font-normal text-[13px] text-[#6B6088]"
                      >
                        Billed ₹1,15,188/year
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="w-full h-[1px] bg-[#2D1255] mb-[32px]" />

              <div className="flex flex-col gap-[14px] mb-[40px] flex-grow">
                {[
                  { text: "Up to 3 AI Agents (any mix)", checked: true },
                  { text: "400 voice minutes included", checked: true },
                  { text: "1,500 chat conversations included", checked: true },
                  { text: "60 social media posts included", checked: true },
                  { text: "Hindi + English + 1 more language", checked: true },
                  { text: "ROI Dashboard", checked: true },
                  { text: "Priority support (6hr response)", checked: true },
                  { text: "Weekly performance reports", checked: true },
                  { text: "Custom agent personality", checked: true },
                  { text: "Custom AI voice", checked: false },
                  { text: "API access", checked: false }
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-[12px]">
                    {feat.checked ? (
                      <Check size={18} className="text-[#10B981] shrink-0 mt-[2px]" />
                    ) : (
                      <X size={18} className="text-[#6B6088] shrink-0 mt-[2px]" />
                    )}
                    <span className={`font-sans font-normal text-[14px] leading-tight ${feat.checked ? 'text-[#F5F3FF]' : 'text-[#6B6088] line-through'}`}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <NextLink href="/contact?plan=growth" className="w-full block text-center py-[14px] rounded-[10px] bg-[#8B5CF6] text-white font-sans font-semibold text-[15px] transition-all duration-300 hover:bg-[#7C3AED] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  Claim This Plan →
                </NextLink>
                <div className="text-[12px] text-[#6B6088] font-sans text-center mt-[12px]">
                  ₹10/min · ₹2/chat · ₹15/post beyond limits
                </div>
              </div>
            </motion.div>

            {/* CARD 3: SCALE */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-[#130224] border border-[#1E0A35] rounded-[20px] py-[40px] px-[32px] flex flex-col relative transition-all duration-300 hover:border-[#8B5CF6]/40"
            >
              <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[8px]">Scale</h3>
              <p className="font-sans font-normal text-[14px] text-[#A8A0C0] mb-[24px] min-h-[42px]">
                For established businesses and agencies
              </p>
              
              <div className="flex flex-col min-h-[140px]">
                {isAnnual && (
                  <div className="font-sans font-medium text-[16px] text-[#6B6088] line-through mb-[-4px]">
                    ₹24,999
                  </div>
                )}
                <div className="h-[48px] overflow-hidden relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isAnnual ? 'annual' : 'monthly'}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex items-baseline gap-[4px]"
                    >
                      <span className="font-display font-bold text-[44px] text-[#F5F3FF] leading-none">
                        {isAnnual ? "₹19,999" : "₹24,999"}
                      </span>
                      <span className="font-sans font-normal text-[14px] text-[#6B6088]">/month</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="h-[48px] mt-[8px]">
                  <AnimatePresence>
                    {isAnnual && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="font-sans font-normal text-[13px] text-[#6B6088]"
                      >
                        Billed ₹2,39,988/year
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="w-full h-[1px] bg-[#1E0A35] mb-[32px]" />

              <div className="flex flex-col gap-[14px] mb-[40px] flex-grow">
                {[
                  { text: "Up to 7 AI Agents (any combination)", checked: true },
                  { text: "1,200 voice minutes included", checked: true },
                  { text: "5,000 chat conversations included", checked: true },
                  { text: "120 social media posts included", checked: true },
                  { text: "All supported languages", checked: true },
                  { text: "Full ROI Dashboard + export", checked: true },
                  { text: "Dedicated account manager", checked: true },
                  { text: "Custom AI voice training", checked: true },
                  { text: "API access", checked: true },
                  { text: "Phone support (2hr response)", checked: true },
                  { text: "Monthly strategy call with founders", checked: true },
                  { text: "99.5% uptime commitment", checked: true }
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-[12px]">
                    {feat.checked ? (
                      <Check size={18} className="text-[#10B981] shrink-0 mt-[2px]" />
                    ) : (
                      <X size={18} className="text-[#6B6088] shrink-0 mt-[2px]" />
                    )}
                    <span className={`font-sans font-normal text-[14px] leading-tight ${feat.checked ? 'text-[#F5F3FF]' : 'text-[#6B6088] line-through'}`}>
                      {feat.text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <NextLink href="/contact?plan=scale" className="w-full block text-center py-[14px] rounded-[10px] border border-[#8B5CF6] text-[#A78BFA] font-sans font-medium text-[15px] transition-all duration-300 hover:bg-[#8B5CF6] hover:text-white">
                  Claim This Plan →
                </NextLink>
                <div className="text-[12px] text-[#6B6088] font-sans text-center mt-[12px]">
                  ₹8/min · ₹1.50/chat · ₹12/post · ₹3,000/extra agent
                </div>
              </div>
            </motion.div>

            {/* CARD 4: CUSTOM */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-transparent border border-dashed border-[#2D1255] rounded-[20px] py-[40px] px-[32px] flex flex-col relative transition-all duration-300 hover:bg-[rgba(139,92,246,0.02)]"
            >
              <h3 className="font-display font-semibold text-[20px] text-[#F5F3FF] mb-[8px]">Custom</h3>
              <p className="font-sans font-normal text-[14px] text-[#A8A0C0] mb-[24px]">
                Need something specific? Let's design your perfect setup.
              </p>
              
              <div className="flex flex-col min-h-[140px] justify-center text-center">
                 <div className="w-[60px] h-[60px] rounded-full bg-[rgba(245,158,11,0.1)] border border-[#F59E0B]/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                   <Shield className="text-[#FBBF24]" size={28} />
                 </div>
              </div>

              <div className="w-full h-[1px] bg-[#1E0A35] mb-[32px]" />

              <div className="flex flex-col gap-[16px] mb-[40px] flex-grow">
                {[
                  "Volume beyond Scale limits",
                  "White-label deployment",
                  "Custom integrations",
                  "Dedicated infrastructure",
                  "Custom SLA terms"
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-[12px]">
                    <span className="text-[#FBBF24] shrink-0 text-[18px] leading-none mt-[0px] font-bold">→</span>
                    <span className="font-sans font-normal text-[14px] leading-tight text-[#F5F3FF]">
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <NextLink href="/contact?plan=custom" className="w-full block text-center py-[14px] rounded-[10px] border border-[#F59E0B] text-[#FBBF24] font-sans font-medium text-[15px] transition-all duration-300 hover:bg-[#F59E0B] hover:text-[#080010] shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                  Talk to Us →
                </NextLink>
                <div className="text-[13px] text-[#6B6088] font-sans text-center mt-[12px]">
                  For businesses with unique requirements
                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* OVERAGE EXPLANATION AND INCLUSIONS */}
        <section className="w-full max-w-[1280px] mx-auto px-[20px] pb-[80px] flex flex-col items-center">
          
          {/* Overage Toggle */}
          <div className="w-full max-w-[600px] bg-[#130224] border border-[#1E0A35] rounded-[12px] overflow-hidden transition-all duration-300 mb-[60px]">
            <button 
              className="w-full py-[16px] px-[24px] flex items-center justify-between text-[#A8A0C0] hover:text-[#F5F3FF] transition-colors"
              onClick={() => setShowOverage(!showOverage)}
            >
              <span className="font-sans font-medium text-[14px]">How do overages work?</span>
              <ChevronDown size={18} className={`transition-transform duration-300 ${showOverage ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {showOverage && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-[24px] pb-[20px] pt-0 font-sans font-normal text-[14px] text-[#6B6088] leading-relaxed">
                    If you exceed your plan's included limits, additional usage is charged at the overage rates listed above. You'll receive email alerts at 80% and 100% usage. There are no surprise charges — you always know exactly where you stand.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border border-[#1E0A35] rounded-full px-[32px] py-[16px] inline-flex flex-col md:flex-row gap-[24px] md:gap-[40px] bg-[rgba(139,92,246,0.02)]">
            <div className="flex items-center gap-[12px]">
              <Shield size={20} className="text-[#8B5CF6]" />
              <span className="font-sans font-normal text-[14px] text-[#A8A0C0]">Free Setup & Onboarding</span>
            </div>
            <div className="flex items-center gap-[12px]">
              <RefreshCw size={20} className="text-[#8B5CF6]" />
              <span className="font-sans font-normal text-[14px] text-[#A8A0C0]">Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-[12px]">
              <Activity size={20} className="text-[#8B5CF6]" />
              <span className="font-sans font-normal text-[14px] text-[#A8A0C0]">Real-Time Monitoring</span>
            </div>
            <div className="flex items-center gap-[12px]">
              <span className="text-[20px] leading-none grayscale opacity-80">🇮🇳</span>
              <span className="font-sans font-normal text-[14px] text-[#A8A0C0]">Built for Indian Businesses</span>
            </div>
          </div>

        </section>

        {/* FAQ SECTION */}
        <section className="w-full bg-[#0C0118] py-[100px] border-t border-[#1E0A35]">
          <div className="max-w-[800px] mx-auto px-[20px]">
            <h2 className="font-display font-bold text-[32px] md:text-[36px] text-[#F5F3FF] text-center mb-[48px] tracking-[-0.02em]">
              Frequently Asked Questions
            </h2>

            <div className="flex flex-col gap-[8px]">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div 
                    key={idx} 
                    className="flex flex-col border-b border-[#1E0A35] py-[16px] last:border-0"
                  >
                    <button 
                      className="w-full flex items-center justify-between py-[8px] text-left cursor-pointer group"
                      onClick={() => toggleFaq(idx)}
                    >
                      <span className={`font-sans font-semibold text-[16px] transition-colors duration-200 ${isOpen ? 'text-[#A78BFA]' : 'text-[#F5F3FF] group-hover:text-[#A78BFA]'}`}>
                        {faq.q}
                      </span>
                      <ChevronDown 
                        size={20} 
                        className={`text-[#6B6088] transition-transform duration-300 shrink-0 ml-[16px] ${isOpen ? 'rotate-180 text-[#A78BFA]' : ''}`} 
                      />
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <p className="font-sans font-normal text-[15px] text-[#A8A0C0] pb-[16px] pt-[8px] leading-[1.6]">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </Layout>
  );
}
