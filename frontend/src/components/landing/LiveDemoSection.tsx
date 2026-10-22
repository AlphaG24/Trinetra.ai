"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  MessageSquare,
  X,
  ArrowRight,
  Calendar,
  Headphones,
  PhoneForwarded,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import { useVoiceAgent, TranscriptMessage } from "@/hooks/useVoiceAgent";

function getAgentIcon(name: string, category: string) {
  const lower = (name + " " + category).toLowerCase();
  if (lower.includes("appoint") || lower.includes("calendar") || lower.includes("booking")) return Calendar;
  if (lower.includes("support") || lower.includes("help")) return Headphones;
  if (lower.includes("sales") || lower.includes("outreach") || lower.includes("deal")) return PhoneForwarded;
  return PhoneCall;
}

export interface VoiceProductItem {
  id: string;
  name: string;
  category: string;
  tag: string;
  description: string;
  voice_id: string;
  language: string;
  gender: string;
  accent: string;
  suggested_prompts: string[];
}

// Exactly the real agents managed and configured in the developer account
const DEFAULT_DEVELOPER_AGENTS: VoiceProductItem[] = [
  {
    id: "dd4da4c1-9deb-4047-8927-5e12402e6b1f",
    name: "Shubh",
    category: "Appointment Booking",
    tag: "Auto-Calendar",
    description: "Schedules consultations, coordinates booking slots, and sends instant calendar confirmations.",
    voice_id: "shubh",
    language: "Hinglish & English",
    gender: "male",
    accent: "#C65B32",
    suggested_prompts: [
      "Can I book an appointment for tomorrow?",
      "What consultation slots are open this week?",
      "Can you reschedule my meeting?",
    ],
  },
  {
    id: "35398818-24de-4b55-999e-8d317141a3e2",
    name: "Anika",
    category: "Customer Support",
    tag: "Helpdesk",
    description: "Handles incoming customer queries, troubleshoots service requests, and guides callers patiently.",
    voice_id: "ritu",
    language: "Hindi & English",
    gender: "female",
    accent: "#2563EB",
    suggested_prompts: [
      "How do I check my service status?",
      "Can you help me update my account?",
      "I have a question about my booking.",
    ],
  },
  {
    id: "6bcdcdcd-6684-4e8a-8564-77a27a9376be",
    name: "Vikram",
    category: "Sales & Outreach",
    tag: "Lead Capture",
    description: "Engages high-intent leads, answers product questions, and qualifies customer requirements.",
    voice_id: "shubh",
    language: "Hindi & English",
    gender: "male",
    accent: "#4F46E5",
    suggested_prompts: [
      "What plans do you offer for high volume?",
      "Can you tell me about enterprise pricing?",
      "How quickly can our team go live?",
    ],
  },
  {
    id: "ac11e104-a37a-4ff1-aef6-fc8a2c97f4d7",
    name: "Arika",
    category: "Multilingual Receptionist",
    tag: "24/7 Front Desk",
    description: "Greets callers warmly, answers general inquiries, and routes calls smoothly without hold times.",
    voice_id: "shreya",
    language: "English & Hinglish",
    gender: "female",
    accent: "#0D9488",
    suggested_prompts: [
      "What are your business hours?",
      "Can I speak with customer support?",
      "Where is your office located?",
    ],
  },
];

export function LiveDemoSection() {
  const [products, setProducts] = useState<VoiceProductItem[]>(DEFAULT_DEVELOPER_AGENTS);
  const [selectedProduct, setSelectedProduct] = useState<VoiceProductItem>(DEFAULT_DEVELOPER_AGENTS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const transcriptBottomRef = useRef<HTMLDivElement>(null);

  // LiveKit WebRTC Voice Hook
  const {
    connectionState,
    isMuted,
    transcripts,
    startCall,
    endCall,
    toggleMute,
  } = useVoiceAgent();

  const isCallConnected = connectionState === "active";
  const isConnecting = connectionState === "connecting";

  // Dynamically load exact agents configured in the developer account
  useEffect(() => {
    fetch("/api/public/demo-agents")
      .then((res) => res.json())
      .then((json) => {
        if (json?.agents && Array.isArray(json.agents) && json.agents.length > 0) {
          const mapped: VoiceProductItem[] = json.agents.map((agent: any, idx: number) => {
            const fallback = DEFAULT_DEVELOPER_AGENTS[idx % DEFAULT_DEVELOPER_AGENTS.length];
            return {
              id: agent.id || fallback.id,
              name: agent.name || fallback.name,
              category: agent.archetype || agent.campaign_purpose || fallback.category,
              tag: agent.campaign_purpose || fallback.tag,
              description: agent.system_prompt
                ? agent.system_prompt.length > 120
                  ? agent.system_prompt.slice(0, 120) + "..."
                  : agent.system_prompt
                : agent.description || fallback.description,
              voice_id: agent.voice_id || fallback.voice_id,
              language: agent.language === "english" ? "Hinglish & English" : (agent.language || fallback.language),
              gender: agent.gender || fallback.gender,
              accent: agent.accent_color || fallback.accent,
              suggested_prompts: agent.suggested_prompts && agent.suggested_prompts.length > 0
                ? agent.suggested_prompts
                : fallback.suggested_prompts,
            };
          });
          setProducts(mapped);
          setSelectedProduct(mapped[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll transcript container
  useEffect(() => {
    if (isModalOpen) {
      transcriptBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcripts, isModalOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isCallConnected, isConnecting]);

  const handleCardClick = (product: VoiceProductItem) => {
    if (product.id !== selectedProduct.id) {
      if (isCallConnected || isConnecting) {
        endCall();
      }
      setSelectedProduct(product);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isCallConnected || isConnecting) {
      endCall();
    }
    setIsModalOpen(false);
  };

  const handleStartCall = async () => {
    try {
      const roomName = `vaakriti-demo-${selectedProduct.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
      await startCall(roomName, "StudioGuest", selectedProduct.id);
      toast.success("Connected! Start speaking into your microphone.");
    } catch {
      toast.error("Failed to connect live session. Please check your microphone.");
    }
  };

  const handleEndCall = () => {
    endCall();
    toast.info("Call ended");
  };

  const handleToggleCall = () => {
    if (isCallConnected || isConnecting) {
      handleEndCall();
    } else {
      handleStartCall();
    }
  };

  const handleSwitchProductInModal = (newProduct: VoiceProductItem) => {
    if (newProduct.id === selectedProduct.id) return;
    if (isCallConnected || isConnecting) {
      handleEndCall();
    }
    setSelectedProduct(newProduct);
  };

  const handleSendPrompt = (promptText: string) => {
    if (!isCallConnected && !isConnecting) {
      handleStartCall().then(() => {
        toast.info(`Ask into your microphone: "${promptText}"`);
      });
      return;
    }
    toast.info(`Ask into your microphone: "${promptText}"`);
  };

  // Duplicate developer agents 4x for smooth infinite marquee
  const loopedProducts = [...products, ...products, ...products, ...products];

  return (
    <section
      id="live-demo"
      className="relative w-full pt-6 pb-12 sm:pt-8 sm:pb-16 select-none overflow-hidden bg-[#FAFAFA] text-[#0F172A]"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header: Reduced top spacing, clean typography */}
        <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-8">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3 text-[#0F172A] leading-tight font-sans">
            Engage Customers with Living Voice AI
          </h2>

          <p className="text-sm sm:text-base font-normal font-sans text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Intelligent voice agents configured in your workspace. Tap any card to test a live voice conversation and see real-time transcripts.
          </p>
        </div>

        {/* ── FULL-WIDTH CURVY 3D ROTATING CAROUSEL (Deep Z-axis curve with flowing blue gradient) ── */}
        <div
          className="relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden py-10"
          style={{ perspective: "1000px" }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Blue flowing luminous gradient ribbon moving behind the cards */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[280px] pointer-events-none -z-10 overflow-hidden">
            <div
              className="w-[300%] h-full opacity-40 blur-3xl"
              style={{
                background: "linear-gradient(90deg, rgba(37,99,235,0) 0%, rgba(37,99,235,0.28) 25%, rgba(56,189,248,0.42) 50%, rgba(37,99,235,0.28) 75%, rgba(37,99,235,0) 100%)",
                animation: "vaakritiFlowingGradient 16s linear infinite",
                animationPlayState: isPaused ? "paused" : "running",
              }}
            />
          </div>

          {/* Continuous Infinite Rotating Track */}
          <div
            className="flex gap-7 w-max items-center px-10"
            style={{
              animation: "vaakritiCurvedScroll 48s linear infinite",
              animationPlayState: isPaused ? "paused" : "running",
              transformStyle: "preserve-3d",
            }}
          >
            {loopedProducts.map((product, idx) => {
              // Smooth symmetrical curve flow: gentle harmonic vertical arc without any tilting to one side
              const phase = (idx % products.length) / products.length;
              const curveArc = Math.sin(phase * Math.PI); // 0 to 1
              const translateY = -curveArc * 14; // smooth subtle upward wave in center
              const scale = 0.97 + curveArc * 0.05; // 0.97x to 1.02x
              const zIndexVal = Math.round(50 + curveArc * 20);

              const IconComponent = getAgentIcon(product.name, product.category);

              return (
                <div
                  key={`${product.id}-${idx}`}
                  onClick={() => handleCardClick(product)}
                  style={{
                    transform: `translateY(${translateY}px) scale(${scale})`,
                    zIndex: zIndexVal,
                  }}
                  className="group relative w-[265px] sm:w-[290px] h-[365px] sm:h-[395px] rounded-3xl overflow-hidden shrink-0 shadow-[0_10px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_20px_45px_rgba(37,99,235,0.20)] border border-slate-200/90 transition-all duration-300 hover:-translate-y-3 cursor-pointer bg-white flex flex-col justify-between p-6"
                >
                  {/* Top Header inside Card */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${product.accent}, #0F172A)` }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2563EB] border border-blue-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Voice Preview
                    </span>
                  </div>

                  {/* Mid Card Content: Name, Role, Language, Description */}
                  <div className="my-auto">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block mb-1">
                      {product.category}
                    </span>
                    <h3 className="text-xl font-bold text-[#0F172A] tracking-tight mb-1.5 leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-[11.5px] font-medium text-slate-500 mb-2">
                      Speaks {product.language}
                    </p>
                    <p className="text-xs text-[#64748B] leading-relaxed line-clamp-3">
                      {product.description}
                    </p>
                  </div>

                  {/* Bottom Action Pill */}
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-[#2563EB] text-slate-800 group-hover:text-white flex items-center justify-between text-xs font-semibold transition-all duration-200">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-[#2563EB] group-hover:text-white transition-colors" />
                      <span>Tap to Speak</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          LIGHT THEME PREVIEW MODAL (Clean, simple, no technical noise)
         ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm -z-10"
            />

            {/* Modal Dialog Card (Clean White Light Theme) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-[#0F172A] my-auto max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs font-bold text-base"
                    style={{ backgroundColor: selectedProduct.accent }}
                  >
                    {selectedProduct.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {selectedProduct.name}
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      {selectedProduct.category} • {selectedProduct.language}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Agent Switcher Pills */}
                  <div className="hidden sm:flex items-center gap-1 p-1 rounded-full bg-slate-200/60 border border-slate-200 overflow-x-auto no-scrollbar">
                    {products.map((p) => {
                      const isSelected = p.id === selectedProduct.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSwitchProductInModal(p)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? "bg-white text-[#0F172A] font-bold shadow-xs"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {p.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
                
                {/* Left Column: Voice Button & Controls */}
                <div className="md:col-span-6 p-6 sm:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50">
                  
                  <div className="my-6 flex flex-col items-center text-center">
                    <motion.button
                      type="button"
                      onClick={handleToggleCall}
                      disabled={isConnecting}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="relative cursor-pointer focus:outline-none rounded-full"
                    >
                      {/* Ripple Halo */}
                      <motion.div
                        animate={
                          isCallConnected
                            ? { scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }
                            : { scale: [1, 1.08, 1], opacity: [0.12, 0.25, 0.12] }
                        }
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                        style={{
                          background: isCallConnected
                            ? "radial-gradient(circle, #2563EB 0%, transparent 75%)"
                            : "radial-gradient(circle, rgba(37,99,235,0.4) 0%, transparent 75%)",
                        }}
                      />

                      {/* Button Core with Soundwave Bars */}
                      <div
                        className="relative w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-2 bg-white"
                        style={{
                          borderColor: isCallConnected ? "#2563EB" : "#E2E8F0",
                        }}
                      >
                        <div className="flex items-center gap-1.5 h-10">
                          {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9].map((scale, i) => (
                            <motion.span
                              key={i}
                              animate={
                                isCallConnected
                                    ? { scaleY: [0.3, scale * 1.5, 0.3] }
                                  : { scaleY: 0.3 }
                              }
                              transition={{
                                duration: 0.6,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: i * 0.08,
                              }}
                              className="w-1.5 rounded-full h-7 transition-colors duration-300"
                              style={{
                                backgroundColor: isCallConnected ? "#2563EB" : "#94A3B8",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.button>

                    <p className="mt-4 text-sm font-semibold text-[#0F172A]">
                      {isCallConnected
                        ? "Listening... Speak now"
                        : isConnecting
                        ? "Connecting..."
                        : "Tap to talk"}
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {isCallConnected ? "Tap again to end conversation" : "Speak naturally using your microphone"}
                    </p>
                  </div>

                  {/* Call Controls */}
                  {isCallConnected && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={toggleMute}
                        className={`px-4 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isMuted
                            ? "bg-rose-50 text-rose-600 border-rose-200"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                        <span>{isMuted ? "Unmute" : "Mute"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleEndCall}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        End Call
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Live Conversation & Questions */}
                <div className="md:col-span-6 p-6 flex flex-col justify-between bg-white min-h-[360px]">
                  <div>
                    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200">
                      <MessageSquare className="w-4 h-4 text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Conversation
                      </span>
                    </div>

                    {/* Transcript Box */}
                    <div className="h-44 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                      {transcripts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#64748B] p-4">
                          <p>No messages yet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Tap the microphone button to start. The live transcript will appear here.
                          </p>
                        </div>
                      ) : (
                        <>
                          {transcripts.map((msg: TranscriptMessage, idx: number) => {
                            const isUser = msg.speaker?.toLowerCase() === "user" || msg.speaker?.toLowerCase() === "client";
                            return (
                              <div
                                key={msg.id || idx}
                                className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                  isUser
                                    ? "bg-blue-50 border border-blue-100 ml-4 text-blue-950 font-medium"
                                    : "bg-slate-100 border border-slate-200/80 mr-4 text-slate-800"
                                }`}
                              >
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#64748B] mb-0.5">
                                  {isUser ? "You" : selectedProduct.name}
                                </span>
                                {msg.text}
                              </div>
                            );
                          })}
                          <div ref={transcriptBottomRef} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Suggested Questions */}
                  <div className="pt-4 border-t border-slate-200 mt-3">
                    <span className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2">
                      Try asking:
                    </span>
                    <div className="space-y-1.5">
                      {selectedProduct.suggested_prompts.map((prompt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendPrompt(prompt)}
                          className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-200 text-xs text-slate-700 hover:text-[#2563EB] transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate pr-2 font-medium">&ldquo;{prompt}&rdquo;</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global CSS Animation for Seamless Marquee Carousel */}
      <style jsx global>{`
        @keyframes vaakritiCurvedScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-25%);
          }
        }
        @keyframes vaakritiFlowingGradient {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
}

export default LiveDemoSection;
