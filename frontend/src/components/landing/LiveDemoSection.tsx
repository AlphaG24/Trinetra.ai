"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, MessageSquare, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useVoiceAgent, TranscriptMessage } from "../../../hooks/useVoiceAgent";

export interface DemoAgentItem {
  id: string;
  name: string;
  personality: string;
  archetype: string;
  voice_id: string;
  language: string;
  gender: string;
  description: string;
  greeting_message: string;
  accent_color: string;
  badge_color: string;
  suggested_prompts: string[];
  is_managed_by_dev: boolean;
  campaign_purpose?: string;
  industry_domain?: string;
}

// Initial calibrated fallback personas
const INITIAL_AGENTS: DemoAgentItem[] = [
  {
    id: "ac11e104-a37a-4ff1-aef6-fc8a2c97f4d7",
    name: "Arika",
    personality: "Warm & Consultative",
    archetype: "Enterprise Concierge",
    voice_id: "shreya",
    language: "Hinglish & English",
    gender: "female",
    description: "Speaks with cultural warmth and clear conversational cadence.",
    greeting_message: "Namaste! Main Vaakriti se Arika bol rahi hoon, aapki AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar sakti hoon?",
    accent_color: "#2E5A44", // Forest Sage
    badge_color: "bg-[#2E5A44]/10 text-[#2E5A44] border-[#2E5A44]/20",
    suggested_prompts: [
      "What solutions does Vaakriti offer?",
      "Tell me about your Indian language support.",
      "How do your voice agents handle calls?",
    ],
    is_managed_by_dev: true,
  },
  {
    id: "6bcdcdcd-6684-4e8a-8564-77a27a9376be",
    name: "Vikram",
    personality: "Persuasive & Energetic",
    archetype: "Sales Advisor",
    voice_id: "shubh",
    language: "Hindi & English",
    gender: "male",
    description: "Focused on business solutions, onboarding, and enterprise pilots.",
    greeting_message: "Hello! Main Vaakriti se Vikram bol raha hoon, an AI assistant. Yeh call quality review ke liye record ki ja sakti hai. Kya aap hamare enterprise solutions ke baare mein jaan-na chahte hain?",
    accent_color: "#C65B32", // Heritage Terracotta
    badge_color: "bg-[#C65B32]/10 text-[#C65B32] border-[#C65B32]/20",
    suggested_prompts: [
      "I want to explore an enterprise pilot.",
      "How does pricing work for high volume?",
      "Can you connect with our existing tools?",
    ],
    is_managed_by_dev: true,
  },
  {
    id: "15db1c28-7773-483b-be11-56fc383a0801",
    name: "Anika",
    personality: "Empathetic & Methodical",
    archetype: "Support & Bookings",
    voice_id: "anushka",
    language: "Hinglish & Regional Dialects",
    gender: "female",
    description: "Specializes in scheduling, inquiries, and customer assistance.",
    greeting_message: "Namaste, main Vaakriti scheduling team se Anika bol rahi hoon, ek AI assistant. Service quality ke liye call record ho sakti hai. Aapko appointment reschedule ya book karni hai?",
    accent_color: "#2B4C7E", // Royal Slate Blue
    badge_color: "bg-[#2B4C7E]/10 text-[#2B4C7E] border-[#2B4C7E]/20",
    suggested_prompts: [
      "Can you schedule a consultation for Friday?",
      "Do you support SMS confirmations?",
      "What details do you need to register?",
    ],
    is_managed_by_dev: true,
  },
  {
    id: "35398818-24de-4b55-999e-8d317141a3e2",
    name: "Dr. Aarav",
    personality: "Intellectual & Guiding",
    archetype: "Academic Mentor",
    voice_id: "shubh",
    language: "English & Hindi",
    gender: "male",
    description: "Guidance on adaptive learning, exam preparation, and education.",
    greeting_message: "Greetings! I am Dr. Aarav from Trinetra Shiksha, an AI academic guide. This session may be recorded for quality. How can I assist with your educational goals today?",
    accent_color: "#D97706", // Golden Saffron
    badge_color: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20",
    suggested_prompts: [
      "How does Trinetra Shiksha personalize questions?",
      "Explain cognitive profile mapping.",
      "Can you demonstrate a mock question?",
    ],
    is_managed_by_dev: true,
  },
];

export function LiveDemoSection() {
  const [agents, setAgents] = useState<DemoAgentItem[]>(INITIAL_AGENTS);
  const [myDeveloperAgents, setMyDeveloperAgents] = useState<any[]>([]);
  const [allPlatformAgents, setAllPlatformAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DemoAgentItem>(INITIAL_AGENTS[0]);

  // Hook into real WebRTC LiveKit voice agent (natural Sarvam TTS/STT, no robotic browser synth)
  const {
    connectionState,
    isMuted,
    secondsConnected,
    transcripts,
    startCall,
    endCall,
    toggleMute,
    clearTranscripts,
  } = useVoiceAgent();

  const isCallConnected = connectionState === "active";
  const isConnecting = connectionState === "connecting";

  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  // Load dynamically managed agents & developer-managed agents
  useEffect(() => {
    fetch("/api/public/demo-agents")
      .then((res) => res.json())
      .then((data) => {
        if (data?.agents && Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents(data.agents);
          setSelectedAgent(data.agents[0]);
        }
      })
      .catch((err) => console.warn("[LiveDemoSection] Notice loading public agents:", err));

    fetch("/api/developer/demo-agents")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.my_agents && Array.isArray(data.my_agents)) {
          setMyDeveloperAgents(data.my_agents);
        }
        if (data?.all_agents && Array.isArray(data.all_agents)) {
          setAllPlatformAgents(data.all_agents);
        }
      })
      .catch(() => {});
  }, []);

  // Format timer MM:SS
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-scroll transcripts when new spoken items arrive
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // ── START CALL (CONNECTS REAL LIVEKIT WEBRTC AGENT) ──
  const handleStartCall = async (targetAgent?: DemoAgentItem) => {
    const agentToUse = targetAgent || selectedAgent;
    clearTranscripts();

    try {
      // Generate clean room name with agent prefix
      const roomName = `vaakriti-demo-${agentToUse.id.slice(0, 8)}-${Date.now().toString().slice(-5)}`;
      toast.info(`Connecting to ${agentToUse.name}...`);
      await startCall(roomName, "StudioGuest", agentToUse.id);
    } catch (err: any) {
      console.warn("[LiveDemoSection] Error starting live voice call:", err);
      toast.error("Failed to connect live call. Ensure backend is running.");
    }
  };

  // ── END CALL ──
  const handleEndCall = () => {
    endCall();
    toast.info("Call ended");
  };

  // Toggle call on/off
  const handleToggleCall = () => {
    if (isCallConnected || isConnecting) {
      handleEndCall();
    } else {
      handleStartCall();
    }
  };

  const handleSwitchAgent = (newAgent: DemoAgentItem) => {
    if (newAgent.id === selectedAgent.id) return;
    if (isCallConnected || isConnecting) {
      handleEndCall();
    }
    setSelectedAgent(newAgent);
  };

  // Select any real agent managed by developer ID or from platform
  const handleSelectRealAgent = (agentId: string) => {
    const found =
      myDeveloperAgents.find((a) => a.id === agentId) ||
      allPlatformAgents.find((a) => a.id === agentId);
    if (!found) return;

    if (isCallConnected || isConnecting) {
      handleEndCall();
    }

    const isFemale =
      found.gender === "female" ||
      ["shreya", "anushka", "priya"].includes(found.voice_id);
    const resolvedGender = isFemale ? "female" : "male";
    const defaultVoice = isFemale ? "shreya" : "shubh";

    const customDemoAgent: DemoAgentItem = {
      id: found.id,
      name:
        found.name?.replace(/^\[.*?\]\s*/, "")?.replace(/\s*-\s*Demo$/i, "") ||
        found.name,
      personality: found.personality || "Warm & Consultative",
      archetype:
        found.campaign_purpose || found.archetype || "Autonomous Agent",
      voice_id: found.voice_id || defaultVoice,
      language: found.language || "Hinglish & English",
      gender: resolvedGender,
      description:
        found.description ||
        `Real agent managed by developer ID ${found.user_id || "active"}.`,
      greeting_message:
        found.greeting_message ||
        `Namaste! Main Trinetra AI se ${found.name} bol ${
          resolvedGender === "female" ? "rahi" : "raha"
        } hoon, ek AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar ${
          resolvedGender === "female" ? "sakti" : "sakta"
        } hoon?`,
      accent_color:
        found.accent_color || (resolvedGender === "female" ? "#2E5A44" : "#C65B32"),
      badge_color:
        resolvedGender === "female"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
          : "bg-amber-50 text-amber-700 border-amber-200/60",
      suggested_prompts:
        found.suggested_prompts && found.suggested_prompts.length > 0
          ? found.suggested_prompts
          : [
              "What solutions does Vaakriti offer?",
              "Tell me about your voice architecture.",
              "Can you handle high volume calling?",
            ],
      is_managed_by_dev: true,
    };

    if (!agents.some((a) => a.id === found.id)) {
      setAgents((prev) => [customDemoAgent, ...prev]);
    }
    setSelectedAgent(customDemoAgent);
    toast.success(`Selected agent "${customDemoAgent.name}"`);
  };

  const handleSendPrompt = (promptText: string) => {
    if (!isCallConnected && !isConnecting) {
      handleStartCall().then(() => {
        toast.info(`Once connected, ask: "${promptText}" into your microphone.`);
      });
      return;
    }
    toast.info(`Ask into your microphone: "${promptText}"`);
  };

  return (
    <section id="demo" className="relative w-full pt-4 pb-20 sm:pb-28 bg-white overflow-hidden select-none">
      
      {/* ── 1. VIBRANT PLASMA BLUE RADIANT AURA EMERGING BEHIND THE MODAL ── */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1150px] sm:w-[1380px] h-[650px] sm:h-[800px] opacity-85 blur-[105px] z-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 50%, rgba(37, 99, 235, 0.38) 0%, rgba(6, 182, 212, 0.32) 35%, rgba(99, 102, 241, 0.22) 65%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] h-[450px] sm:h-[550px] opacity-75 blur-[80px] z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(14, 165, 233, 0.35) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 80%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <h2 
            className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#0B0F17] mb-2.5"
            style={{ fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}
          >
            The AI Voice Platform
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-normal font-[family-name:var(--font-playfair),Georgia,serif] tracking-wide">
            Real-time conversational agents for customer support, lead qualification, and enterprise operations.
          </p>
        </div>

        {/* ── SIMPLE & SLEEK VOICE STUDIO MODAL ── */}
        <div className="rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-[0_20px_50px_rgba(37,99,235,0.08),0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col transition-all">
          
          {/* Sleek Top Bar: Persona Identity & Unified Segmented Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-b border-slate-100 bg-slate-50/50">
            {/* Active Persona Identity */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs transition-colors"
                style={{ backgroundColor: selectedAgent.accent_color || '#2563EB' }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-playfair),Georgia,serif] text-sm sm:text-base font-bold text-[#0B0F17] tracking-tight">
                  {selectedAgent.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-[family-name:var(--font-playfair),Georgia,serif]">
                  {selectedAgent.archetype} • <span className="text-slate-800 font-medium">{selectedAgent.language}</span>
                </p>
              </div>
            </div>

            {/* Persona Switcher Tabs + Developer Tester Unrestricted Agent Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-slate-200/70 p-1 rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar">
                {agents.map((a) => {
                  const isSelected = a.id === selectedAgent.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSwitchAgent(a)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-[family-name:var(--font-playfair),Georgia,serif] transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-white text-slate-900 shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: a.accent_color || '#2563EB' }}
                      />
                      <span>{a.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Developer Real Agent Selector (Managed by Developer ID & Platform) */}
              {(myDeveloperAgents.length > 0 || allPlatformAgents.length > 0) && (
                <div className="relative inline-flex items-center">
                  <select
                    onChange={(e) => handleSelectRealAgent(e.target.value)}
                    value={selectedAgent.id}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition cursor-pointer focus:outline-none shadow-xs"
                    title="Select any agent managed by your developer ID or platform"
                  >
                    <option value="" disabled>Select Real Agent...</option>
                    {myDeveloperAgents.length > 0 && (
                      <optgroup label="🌟 My Developer Agents">
                        {myDeveloperAgents.map((pa) => (
                          <option key={pa.id} value={pa.id}>
                            {pa.name} ({pa.language || "Hinglish"})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {allPlatformAgents.length > 0 && (
                      <optgroup label="🏢 Platform Agents">
                        {allPlatformAgents.map((pa) => (
                          <option key={pa.id} value={pa.id}>
                            {pa.name} ({pa.language || "Hinglish"})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-800 absolute right-2.5 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Modal Console Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] sm:min-h-[420px] overflow-hidden">
            
            {/* Left: Sleek Acoustic Chamber with Modern Illuminated Voice Studio Button (7 cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between items-center text-center bg-white border-b lg:border-b-0 lg:border-r border-slate-100 relative">
              
              {/* Header Status & Timer */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    isCallConnected ? "bg-emerald-500 animate-ping" : isConnecting ? "bg-amber-500 animate-pulse" : "bg-slate-400"
                  }`} />
                  <span className="font-[family-name:var(--font-playfair),Georgia,serif] text-xs font-medium text-slate-500">
                    {isCallConnected ? "Live WebRTC Audio Active" : isConnecting ? "Connecting via LiveKit..." : "Voice Studio"}
                  </span>
                </div>

                <div className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {formatTimer(secondsConnected)}
                </div>
              </div>

              {/* ── MODERN ILLUMINATED DYNAMIC VOICE STUDIO BUTTON ── */}
              <div className="my-6 sm:my-8 flex flex-col items-center justify-center">
                <motion.button
                  type="button"
                  onClick={handleToggleCall}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center cursor-pointer group focus:outline-none"
                  aria-label={isCallConnected ? "End call" : `Talk to ${selectedAgent.name}`}
                  title={isCallConnected ? "Click to end conversation" : `Click to talk with ${selectedAgent.name}`}
                >
                  {/* Expanding outer audio halo ripple */}
                  <motion.div
                    animate={
                      isCallConnected
                        ? { scale: [1, 1.25, 1], opacity: [0.25, 0.65, 0.25] }
                        : { scale: [1, 1.08, 1], opacity: [0.12, 0.25, 0.12] }
                    }
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                    style={{
                      background: isCallConnected
                        ? "radial-gradient(circle, rgba(16, 185, 129, 0.40) 0%, rgba(6, 182, 212, 0.35) 50%, transparent 80%)"
                        : "radial-gradient(circle, rgba(37, 99, 235, 0.35) 0%, rgba(6, 182, 212, 0.25) 50%, transparent 80%)",
                    }}
                  />

                  {/* Concentric subtle animated energy boundary ring */}
                  <motion.div
                    animate={
                      isCallConnected
                        ? { rotate: 360, scale: [1, 1.04, 1] }
                        : { rotate: 0, scale: 1 }
                    }
                    transition={{
                      rotate: { duration: 16, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                    }}
                    className={`absolute inset-1.5 rounded-full border border-dashed transition-colors duration-300 pointer-events-none ${
                      isCallConnected
                        ? "border-emerald-400/60"
                        : "border-cyan-400/40 group-hover:border-cyan-500/60"
                    }`}
                  />

                  {/* Main illuminated core button */}
                  <div 
                    className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                      isCallConnected
                        ? "bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-400/80 shadow-emerald-500/20"
                        : "bg-gradient-to-b from-slate-900 via-[#0B132B] to-[#0A0E1A] border-2 border-cyan-400/50 shadow-cyan-500/20 group-hover:border-cyan-300 group-hover:shadow-cyan-500/30"
                    }`}
                  >
                    {/* Live Dancing Equalizer Soundwave Bars */}
                    <div className="flex items-center gap-1.5 h-10">
                      {[0.35, 0.75, 1.3, 0.55, 1.1, 0.45, 0.85].map((scale, i) => (
                        <motion.span
                          key={i}
                          animate={
                            isCallConnected
                              ? { scaleY: [0.25, scale * 1.5, 0.25] }
                              : { scaleY: 0.28 }
                          }
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.09,
                          }}
                          className={`w-1 sm:w-1.5 rounded-full h-7 transition-colors duration-300 ${
                            isCallConnected
                              ? i % 2 === 0 ? "bg-emerald-400" : "bg-cyan-300"
                              : "bg-cyan-400 group-hover:bg-cyan-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.button>

                {/* Subtext Instruction below button */}
                <p className="mt-3 text-xs sm:text-sm font-[family-name:var(--font-playfair),Georgia,serif] text-slate-600 font-medium">
                  {isCallConnected 
                    ? "Live WebRTC call in progress — Tap button to end" 
                    : isConnecting 
                    ? "Connecting to real AI agent via LiveKit..." 
                    : `Tap button to speak with ${selectedAgent.name}`}
                </p>
              </div>

              {/* Bottom Mute Control (Only shown when call is connected) */}
              <div className="w-full flex items-center justify-center h-10">
                {isCallConnected && (
                  <button
                    onClick={toggleMute}
                    className={`px-4 py-1.5 rounded-full border text-xs font-[family-name:var(--font-playfair),Georgia,serif] flex items-center gap-1.5 transition-all cursor-pointer ${
                      isMuted 
                        ? "bg-rose-50 border-rose-200 text-rose-600" 
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Sleek Live Dialogue & Quick Prompts (5 cols) */}
            <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-slate-50/30 text-left">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-[family-name:var(--font-playfair),Georgia,serif] font-bold text-slate-800">
                    Live Conversation Feed
                  </span>
                </div>
                {transcripts.length > 0 && (
                  <button
                    onClick={() => clearTranscripts()}
                    className="text-[11px] font-[family-name:var(--font-playfair),Georgia,serif] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Transcript Scroll Feed (REAL LIVE SPOKEN TRANSCRIPTS) */}
              <div 
                ref={transcriptScrollRef}
                className="flex-1 my-3 overflow-y-auto space-y-3 pr-2 min-h-[220px] max-h-[260px] sm:max-h-[300px]"
              >
                {transcripts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs font-[family-name:var(--font-playfair),Georgia,serif]">
                    {isCallConnected ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <Volume2 className="w-6 h-6 animate-pulse" />
                        <span className="font-medium">Live audio channel connected.</span>
                        <span className="text-[11px] text-slate-500">Speak into your mic to begin speaking with {selectedAgent.name}.</span>
                      </div>
                    ) : isConnecting ? (
                      <div className="flex flex-col items-center gap-2 text-amber-600">
                        <Sparkles className="w-6 h-6 animate-spin" />
                        <span>Initializing WebRTC audio pipe...</span>
                      </div>
                    ) : (
                      <p>
                        Tap the glowing button to connect with {selectedAgent.name}.
                      </p>
                    )}
                  </div>
                ) : (
                  transcripts.map((t) => {
                    const isUser = t.speaker === "Customer" || t.speaker === "You" || t.speaker === "User";
                    const formattedTime =
                      typeof t.timestamp === "object"
                        ? t.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : typeof t.timestamp === "string"
                        ? new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "";

                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-[family-name:var(--font-playfair),Georgia,serif] text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {isUser ? "You" : t.speaker}
                          </span>
                          {formattedTime && <span>{formattedTime}</span>}
                        </div>
                        <div 
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-2xs font-[family-name:var(--font-playfair),Georgia,serif] ${
                            isUser
                              ? "rounded-tr-xs bg-slate-900 text-white"
                              : "rounded-tl-xs bg-white border border-slate-200/80 text-slate-800"
                          }`}
                        >
                          {t.text}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Quick Prompts to Speak */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-[family-name:var(--font-playfair),Georgia,serif] font-bold uppercase tracking-wider text-slate-500 block">
                  Suggested topics to ask:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.suggested_prompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendPrompt(prompt)}
                      className="text-left text-[11px] font-[family-name:var(--font-playfair),Georgia,serif] px-3 py-1.5 rounded-full bg-white hover:bg-cyan-50 border border-slate-200/80 hover:border-cyan-300 text-slate-700 hover:text-cyan-950 transition-all cursor-pointer shadow-2xs"
                    >
                      &quot;{prompt}&quot;
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

export default LiveDemoSection;
