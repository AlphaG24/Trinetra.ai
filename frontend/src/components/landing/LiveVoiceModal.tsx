"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Mic, MicOff, PhoneOff, PhoneCall, Volume2, Sparkles, 
  MessageSquare, ShieldCheck, CheckCircle2, RefreshCw, Send, AlertCircle
} from "lucide-react";
import { useVoiceAgent, TranscriptMessage } from "../../../hooks/useVoiceAgent";
import { DemoAgentItem } from "@/app/api/public/demo-agents/route";
import { toast } from "sonner";

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: DemoAgentItem;
  allAgents: DemoAgentItem[];
  onSelectAgent: (agent: DemoAgentItem) => void;
}

export function LiveVoiceModal({
  isOpen,
  onClose,
  agent,
  allAgents,
  onSelectAgent,
}: LiveVoiceModalProps) {
  const [micPermissionGranted, setMicPermissionGranted] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"acoustic" | "transcript">("acoustic");
  const [simulatedAudioActive, setSimulatedAudioActive] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

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

  // Format call duration MM:SS
  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-scroll transcript feed on new messages
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Request mic permission & initiate call when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const launchSession = async () => {
      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            if (isMounted) setMicPermissionGranted(true);
          } catch (micErr) {
            console.warn("[LiveVoiceModal] Mic permission denied/cancelled:", micErr);
            if (isMounted) setMicPermissionGranted(false);
          }
        }
        
        clearTranscripts();
        const roomName = `vaakriti-demo-${agent.id.slice(0, 6)}-${Date.now().toString().slice(-5)}`;
        await startCall(roomName, "StudioGuest", agent.id);
      } catch (err: any) {
        console.warn("[LiveVoiceModal] Start call exception:", err);
      }
    };

    launchSession();

    return () => {
      isMounted = false;
    };
  }, [isOpen, agent.id, startCall, clearTranscripts]);

  const handleEndCall = () => {
    setSimulatedAudioActive(false);
    endCall();
  };

  const handleRestart = async () => {
    clearTranscripts();
    const roomName = `vaakriti-demo-${agent.id.slice(0, 6)}-${Date.now().toString().slice(-5)}`;
    await startCall(roomName, "StudioGuest", agent.id);
  };

  // Interactive quick prompt injection
  const handleSendPrompt = (promptText: string) => {
    if (connectionState !== "active") return;
    toast.info(`Prompt selected: "${promptText}". Speak into your microphone to talk to ${agent.name}.`);
  };

  if (!isOpen) return null;

  const isCallConnected = connectionState === "active";
  const isConnecting = connectionState === "connecting";
  const isEnded = connectionState === "ended";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/65 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#FAF7F2] border border-[#DDD3C2] text-[#171513] shadow-[0_25px_80px_rgba(23,21,19,0.35)] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* ── TOP LUXURY TELEMETRY BAR ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8DFC0]/70 bg-[#F5EFEB]/80">
            {/* Left: Persona Identity */}
            <div className="flex items-center gap-3.5">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center font-serif text-lg font-bold text-white shadow-sm"
                style={{ backgroundColor: agent.accent_color }}
              >
                {agent.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#171513] tracking-tight">
                    {agent.name}
                  </h3>
                  <span className={`text-[10px] font-sans font-semibold px-2.5 py-0.5 rounded-full border ${agent.badge_color}`}>
                    {agent.personality}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-[#7D7060]">
                  {agent.archetype} • <span className="text-[#171513] font-medium">{agent.language}</span>
                </p>
              </div>
            </div>

            {/* Right: Close */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleEndCall();
                  onClose();
                }}
                className="w-9 h-9 rounded-full bg-white border border-[#DDD3C2] hover:border-[#171513] text-[#7D7060] hover:text-[#171513] flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Close Voice Studio"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── AGENT PERSONA SWITCHER TABS ── */}
          <div className="flex items-center gap-2 px-6 py-2.5 bg-[#FAF7F2] border-b border-[#E8DFC0]/40 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-[#8C7D6D] shrink-0 mr-1">
              Switch Persona:
            </span>
            {allAgents.map((a) => {
              const isSelected = a.id === agent.id;
              return (
                <button
                  key={a.id}
                  onClick={() => {
                    if (!isSelected) {
                      handleEndCall();
                      onSelectAgent(a);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#171513] text-white shadow-xs font-medium"
                      : "bg-white/80 border border-[#E2D8C9] text-[#574B3E] hover:border-[#171513] hover:text-[#171513]"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: a.accent_color }}
                  />
                  <span>{a.name}</span>
                  <span className="text-[9px] opacity-70">({a.personality.split("&")[0].trim()})</span>
                </button>
              );
            })}
          </div>

          {/* ── MAIN STUDIO STAGE: SPLIT DUAL CHANNELS ── */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[380px] sm:min-h-[440px] max-h-[600px] overflow-hidden">
            
            {/* ── LEFT: BIOMETRIC ACOUSTIC RESONANCE CORE (7 cols) ── */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between items-center text-center bg-gradient-to-b from-[#FAF7F2] to-[#F5EFEB]/90 border-b lg:border-b-0 lg:border-r border-[#E8DFC0]/70 relative overflow-hidden">
              
              {/* Subtle acoustic grid background */}
              <div 
                className="pointer-events-none absolute inset-0 opacity-15"
                style={{
                  backgroundImage: "radial-gradient(#9C8E7E 0.7px, transparent 0.7px)",
                  backgroundSize: "22px 22px"
                }}
              />

              {/* Status Header & Timer */}
              <div className="relative z-10 w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    isCallConnected ? "bg-[#2E5A44] animate-ping" : isConnecting ? "bg-[#D97706] animate-pulse" : "bg-[#8C7D6D]"
                  }`} />
                  <span className="font-sans text-xs font-medium text-[#4A4036]">
                    {isCallConnected ? "Connected" : isConnecting ? "Connecting..." : "Ready to speak"}
                  </span>
                </div>

                <div className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-white/90 border border-[#DDD3C2] text-[#171513] shadow-xs">
                  {formatTimer(secondsConnected)}
                </div>
              </div>

              {/* Central Concentric Voice Orb */}
              <div className="relative z-10 my-6 sm:my-8 flex flex-col items-center justify-center">
                <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center">
                  
                  {/* Outer Harmonic Ring 3 */}
                  <motion.div
                    animate={
                      isCallConnected || simulatedAudioActive
                        ? { scale: [1, 1.25, 1], opacity: [0.15, 0.45, 0.15] }
                        : { scale: 1, opacity: 0.1 }
                    }
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full border border-dashed"
                    style={{ borderColor: agent.accent_color }}
                  />

                  {/* Outer Harmonic Ring 2 */}
                  <motion.div
                    animate={
                      isCallConnected || simulatedAudioActive
                        ? { scale: [1, 1.15, 1], opacity: [0.25, 0.6, 0.25] }
                        : { scale: 1, opacity: 0.15 }
                    }
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                    className="absolute inset-3 sm:inset-4 rounded-full border"
                    style={{ borderColor: agent.accent_color }}
                  />

                  {/* Radiating Energy Halo */}
                  <div
                    className="absolute inset-6 sm:inset-8 rounded-full blur-xl opacity-30 transition-all duration-700"
                    style={{ backgroundColor: agent.accent_color }}
                  />

                  {/* Center Tactile Orb */}
                  <div 
                    className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full shadow-[0_12px_40px_rgba(23,21,19,0.18)] flex flex-col items-center justify-center transition-all duration-500 overflow-hidden"
                    style={{
                      background: `radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F5EFEB 45%, ${agent.accent_color} 150%)`
                    }}
                  >
                    {/* Animated soundwaves when speaking */}
                    <div className="flex items-center gap-1 sm:gap-1.5 h-10">
                      {[0.4, 0.8, 1.2, 0.6, 1.0, 0.5, 0.9].map((heightScale, i) => (
                        <motion.span
                          key={i}
                          animate={
                            isCallConnected || simulatedAudioActive
                              ? { scaleY: [0.3, heightScale * 1.5, 0.3] }
                              : { scaleY: 0.25 }
                          }
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: i * 0.1,
                          }}
                          className="w-1 sm:w-1.5 bg-[#171513] rounded-full h-8"
                        />
                      ))}
                    </div>

                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#171513]/70 mt-1">
                      {isCallConnected ? "Active" : isConnecting ? "Dialing" : "Idle"}
                    </span>
                  </div>
                </div>

                {/* Status Guidance */}
                <div className="mt-2 space-y-1">
                  <p className="font-serif text-base sm:text-lg font-medium text-[#171513]">
                    {isCallConnected 
                      ? "Listening to your voice • Speak naturally" 
                      : isConnecting 
                      ? "Calibrating neural voice pipeline..." 
                      : "Session concluded."}
                  </p>
                  <p className="text-xs text-[#7D7060] font-sans max-w-sm">
                    {agent.description}
                  </p>
                </div>
              </div>

              {/* Bottom Tactile Action Deck */}
              <div className="relative z-10 w-full flex flex-col items-center gap-3">
                <div className="flex items-center gap-3">
                  {/* Mute Toggle */}
                  <button
                    onClick={toggleMute}
                    disabled={!isCallConnected}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 shadow-xs ${
                      isMuted 
                        ? "bg-rose-50 border-rose-200 text-rose-600" 
                        : "bg-white border-[#DDD3C2] hover:border-[#171513] text-[#29231D]"
                    }`}
                    title={isMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Primary Call / Hang Up Button */}
                  {isCallConnected || isConnecting ? (
                    <button
                      onClick={handleEndCall}
                      className="px-6 py-3 rounded-full bg-[#171513] hover:bg-rose-700 text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <PhoneOff className="w-4 h-4 text-rose-400" />
                      <span>End Conversation</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleRestart}
                      className="px-6 py-3 rounded-full text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                      style={{ backgroundColor: agent.accent_color }}
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Start Speaking With {agent.name}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT: LIVE STREAMING TRANSCRIPT & INTELLIGENCE TELEMETRY (5 cols) ── */}
            <div className="lg:col-span-5 p-6 flex flex-col justify-between bg-white text-left">
              
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DFC0]/60">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#C65B32]" />
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#171513]">
                    Live Streaming Transcript
                  </span>
                </div>
                <button
                  onClick={clearTranscripts}
                  className="text-[10px] font-sans text-[#8C7D6D] hover:text-[#171513] transition-colors"
                >
                  Clear
                </button>
              </div>

              {/* Streaming Conversation Scroll Feed */}
              <div 
                ref={transcriptScrollRef}
                className="flex-1 my-3 overflow-y-auto space-y-3.5 pr-2 max-h-[300px] sm:max-h-[340px]"
              >
                {/* Default Opening Agent Disclosure Greeting */}
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-sans text-[#7D7060]">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: agent.accent_color }} 
                    />
                    <span className="font-semibold text-[#171513]">{agent.name}</span>
                    <span>• Opening Greeting</span>
                  </div>
                  <div className="p-3.5 rounded-2xl rounded-tl-xs bg-[#FAF7F2] border border-[#E2D8C9] text-xs text-[#29231D] leading-relaxed shadow-xs">
                    {agent.greeting_message}
                  </div>
                </div>

                {/* Real-Time Live Transcripts from LiveKit Voice Channel */}
                {transcripts.map((t) => {
                  const isUser = t.speaker === "Customer" || t.speaker === "User";
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-sans text-[#7D7060]">
                        <span className="font-semibold text-[#171513]">
                          {isUser ? "You" : agent.name}
                        </span>
                        <span>
                          {typeof t.timestamp === "object" ? t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <div 
                        className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[90%] shadow-xs ${
                          isUser
                            ? "rounded-tr-xs bg-[#171513] text-white"
                            : "rounded-tl-xs bg-[#FAF7F2] border border-[#E2D8C9] text-[#29231D]"
                        }`}
                      >
                        {t.text}
                      </div>
                    </motion.div>
                  );
                })}

                {/* Real-time speaking status indicator */}
                {simulatedAudioActive && (
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DFC0] text-[11px] text-[#7D7060]">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#C65B32]" />
                    <span>{agent.name} is speaking...</span>
                  </div>
                )}
              </div>

              {/* Bottom Quick Starter Chips */}
              <div className="pt-3 border-t border-[#E8DFC0]/60 space-y-2">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#8C7D6D] block">
                  Quick Prompts to Speak:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {agent.suggested_prompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendPrompt(prompt)}
                      className="text-left text-[11px] font-sans px-2.5 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F5EFEB] border border-[#DDD3C2] hover:border-[#171513] text-[#4A4036] hover:text-[#171513] transition-all cursor-pointer"
                    >
                      &quot;{prompt}&quot;
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
