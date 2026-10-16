"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, MessageSquare, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useVoiceAgent, TranscriptMessage } from "@/hooks/useVoiceAgent";

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
  personalities?: Record<string, boolean>;
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
    accent_color: "#315CFF", // Electric Cobalt
    badge_color: "bg-[#315CFF]/10 text-[#315CFF] border-[#315CFF]/20",
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
    accent_color: "#45C5FF", // Signal Cyan
    badge_color: "bg-[#45C5FF]/10 text-[#45C5FF] border-[#45C5FF]/20",
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
    accent_color: "#315CFF", // Electric Cobalt
    badge_color: "bg-[#315CFF]/10 text-[#315CFF] border-[#315CFF]/20",
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
    accent_color: "#45C5FF", // Signal Cyan
    badge_color: "bg-[#45C5FF]/10 text-[#45C5FF] border-[#45C5FF]/20",
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

    // Fetch developer-configured agents only if authenticated to avoid 401 on public landing page
    try {
      const supabase = createClient();
      supabase.auth.getUser().then((res: { data: { user: unknown } }) => {
        const user = res?.data?.user;
        if (user) {
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
        }
      }).catch(() => {});
    } catch {}
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
    toast.success(`Selected real agent "${customDemoAgent.name}"`);
  };

  // Switch personality on the fly for the selected agent
  const handleSelectPersonality = (newPersonality: string) => {
    setSelectedAgent((prev) => ({
      ...prev,
      personality: newPersonality,
    }));
    toast.info(`Switched personality to "${newPersonality}"`);
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
    <section
      id="live-demo"
      className="relative w-full py-16 sm:py-24 select-none transition-colors duration-300"
      style={{
        backgroundColor: "var(--theme-bg-demo, #080D18)",
      }}
    >

      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
        
        {/* Section Header with 2-Way Typography (Cal Sans + Inter) */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase mb-3 border bg-[#18243A] border-[#1E2D4A] text-[#45C5FF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#45C5FF] animate-pulse" />
            <span>Enterprise Voice Studio • Sub-480ms WebRTC</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-3 font-[family-name:var(--font-cal-sans)] transition-colors duration-300 text-white"
          >
            Talk to Our AI Agents — Live
          </h2>
          <p
            className="text-sm sm:text-base font-normal font-sans tracking-normal transition-colors duration-300 text-slate-300 max-w-2xl mx-auto"
          >
            Full-duplex conversational intelligence powered by LiveKit WebRTC. Select a persona and tap the button to experience natural conversational latency with real audio.
          </p>
        </div>

        {/* ── SIMPLE & SLEEK VOICE STUDIO MODAL CONTAINER WITH RADIANT BACKLIGHT ── */}
        <div className="relative">

          {/* 1. Left Lateral Accent Glow */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -left-14 sm:-left-28 w-[280px] sm:w-[420px] h-[45%] -z-10 rounded-full opacity-60 blur-[65px] transition-colors duration-300"
            style={{
              background:
                "radial-gradient(ellipse at 15% 50%, rgba(49, 92, 255, 0.25) 0%, transparent 80%)",
            }}
          />

          {/* 2. Right Lateral Accent Glow */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -right-14 sm:-right-28 w-[280px] sm:w-[420px] h-[45%] -z-10 rounded-full opacity-60 blur-[65px] transition-colors duration-300"
            style={{
              background:
                "radial-gradient(ellipse at 85% 50%, rgba(69, 197, 255, 0.22) 0%, transparent 80%)",
            }}
          />

          {/* ── VOICE STUDIO MODAL CARD ── */}
          <div
            className="rounded-2xl sm:rounded-3xl border shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col transition-all duration-300"
            style={{
              backgroundColor: "var(--theme-demo-surface, #0E1626)",
              borderColor: "var(--theme-demo-border, #1E2D4A)",
            }}
          >
          
          {/* Sleek Top Bar: Persona Identity & Unified Segmented Tabs */}
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3.5 border-b transition-colors duration-300"
            style={{
              backgroundColor: "var(--theme-demo-surface-alt, #18243A)",
              borderColor: "var(--theme-demo-border, #1E2D4A)",
            }}
          >
            {/* Active Persona Identity */}
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs transition-colors"
                style={{ backgroundColor: selectedAgent.accent_color || '#315CFF' }}
              >
                {selectedAgent.name.charAt(0)}
              </div>
              <div>
                <h3
                  className="font-[family-name:var(--font-cal-sans)] text-sm sm:text-base font-bold tracking-tight text-white"
                >
                  {selectedAgent.name}
                </h3>
                <p
                  className="text-[11px] font-sans text-slate-400"
                >
                  {selectedAgent.archetype} • <span className="font-medium text-white">{selectedAgent.language}</span>
                </p>
              </div>
            </div>

            {/* Persona Switcher Tabs + Developer Tester Unrestricted Agent Dropdown */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Persona Switcher Tabs */}
              <div
                className="p-1 rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar border"
                style={{
                  backgroundColor: "#080D18",
                  borderColor: "#1E2D4A",
                }}
              >
                {agents.map((a) => {
                  const isSelected = a.id === selectedAgent.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleSwitchAgent(a)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? "shadow-2xs font-bold bg-[#315CFF] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: isSelected ? "#45C5FF" : (a.accent_color || '#315CFF') }}
                      />
                      <span>{a.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Developer Real Agent Selector */}
              {(myDeveloperAgents.length > 0 || allPlatformAgents.length > 0) && (
                <div className="relative inline-flex items-center">
                  <select
                    onChange={(e) => handleSelectRealAgent(e.target.value)}
                    value={selectedAgent.id}
                    className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-full bg-[#18243A] border border-[#1E2D4A] text-[#F4F7FC] hover:border-[#315CFF]/60 transition cursor-pointer focus:outline-none shadow-xs"
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
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Modal Console Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] sm:min-h-[420px] overflow-hidden">
            
            {/* Left: Sleek Acoustic Chamber with Modern Illuminated Voice Studio Button (7 cols) */}
            <div
              className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between items-center text-center border-b lg:border-b-0 lg:border-r relative transition-colors duration-300"
              style={{
                backgroundColor: "var(--theme-demo-surface, #0E1626)",
                borderColor: "var(--theme-demo-border, #1E2D4A)",
              }}
            >
              
              {/* Header Status & Timer */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    isCallConnected ? "bg-[#45C5FF] animate-ping" : isConnecting ? "bg-amber-400 animate-pulse" : "bg-slate-500"
                  }`} />
                  <span
                    className="text-xs font-medium font-sans text-slate-300"
                  >
                    {isCallConnected ? "Live WebRTC Audio Active" : isConnecting ? "Connecting via LiveKit..." : "Voice Studio"}
                  </span>
                </div>

                <div
                  className="font-mono text-xs font-semibold px-2.5 py-1 rounded-full border bg-[#18243A] border-[#1E2D4A] text-[#F4F7FC]"
                >
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
                        ? { scale: [1, 1.25, 1], opacity: [0.35, 0.75, 0.35] }
                        : { scale: [1, 1.08, 1], opacity: [0.15, 0.3, 0.15] }
                    }
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full blur-xl pointer-events-none"
                    style={{
                      background: isCallConnected
                        ? "radial-gradient(circle, #315CFF 0%, transparent 80%)"
                        : "radial-gradient(circle, rgba(49, 92, 255, 0.35) 0%, transparent 80%)",
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
                    className="absolute inset-1.5 rounded-full border border-dashed transition-colors duration-300 pointer-events-none"
                    style={{
                      borderColor: isCallConnected ? "#45C5FF" : "#1E2D4A",
                    }}
                  />

                  {/* Main illuminated core button */}
                  <div 
                    className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl border-2 bg-[#18243A] hover:bg-[#1E2D4A]"
                    style={{
                      borderColor: isCallConnected ? "#45C5FF" : "#315CFF",
                    }}
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
                          className="w-1 sm:w-1.5 rounded-full h-7 transition-colors duration-300"
                          style={{
                            backgroundColor: isCallConnected ? "#45C5FF" : "#315CFF",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.button>

                {/* Subtext Instruction below button */}
                <p
                  className="mt-3 text-xs sm:text-sm font-sans font-medium text-slate-300"
                >
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
                    className="px-4 py-1.5 rounded-full border text-xs font-sans flex items-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      backgroundColor: isMuted ? "rgba(225,29,72,0.15)" : "#18243A",
                      borderColor: isMuted ? "#E11D48" : "#1E2D4A",
                      color: isMuted ? "#E11D48" : "#FFFFFF",
                    }}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    <span>{isMuted ? "Unmute Mic" : "Mute Mic"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Sleek Live Dialogue & Quick Prompts (5 cols) */}
            <div
              className="lg:col-span-5 p-6 flex flex-col justify-between text-left transition-colors duration-300 border-t lg:border-t-0"
              style={{
                backgroundColor: "var(--theme-demo-surface, #0E1626)",
                borderColor: "var(--theme-demo-border, #1E2D4A)",
              }}
            >
              
              {/* Header */}
              <div
                className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#315CFF]" />
                  <span
                    className="text-xs font-bold font-sans text-white"
                  >
                    Live Conversation Feed
                  </span>
                </div>
                {transcripts.length > 0 && (
                  <button
                    onClick={() => clearTranscripts()}
                    className="text-[11px] font-sans hover:text-[#45C5FF] text-slate-400 transition-colors cursor-pointer"
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
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400 text-xs font-sans">
                    {isCallConnected ? (
                      <div className="flex flex-col items-center gap-2 text-[#45C5FF]">
                        <Volume2 className="w-6 h-6 animate-pulse" />
                        <span className="font-medium text-white">Live audio channel connected.</span>
                        <span className="text-[11px] text-slate-400">Speak into your mic to begin speaking with {selectedAgent.name}.</span>
                      </div>
                    ) : isConnecting ? (
                      <div className="flex flex-col items-center gap-2 text-amber-400">
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
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <span className="font-semibold text-slate-200">
                            {isUser ? "You" : t.speaker}
                          </span>
                          {formattedTime && <span>{formattedTime}</span>}
                        </div>
                        <div 
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-2xs font-sans ${
                            isUser
                              ? "rounded-tr-xs bg-[#315CFF] text-white"
                              : "rounded-tl-xs bg-[#18243A] border border-[#1E2D4A] text-[#F4F7FC]"
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
              <div className="pt-3 border-t border-[#1E2D4A] space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  Suggested topics to ask:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.suggested_prompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendPrompt(prompt)}
                      className="text-left text-[11px] font-sans px-3 py-1.5 rounded-full bg-[#18243A] hover:bg-[#315CFF]/15 border border-[#1E2D4A] hover:border-[#315CFF] text-slate-200 hover:text-[#45C5FF] transition-all cursor-pointer shadow-2xs"
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

      </div>
    </section>
  );
}

export default LiveDemoSection;
