"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Sparkles, CheckCircle2, Play, Pause, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";

interface DemoPersona {
  id: string;
  name: string;
  role: string;
  language: string;
  voiceId: string;
  color: string;
  sampleAudio: string;
  sampleScript: string;
  liveAgentId: string;
  greeting: string;
}

const PERSONAS: DemoPersona[] = [
  {
    id: "arika",
    name: "Arika",
    role: "Front-Desk Concierge",
    language: "Hinglish & English",
    voiceId: "shreya",
    color: "#059669", // Emerald
    sampleAudio: "/audio/greetings/hi.wav",
    sampleScript: "Namaste! Main Vaakriti se Arika bol rahi hoon. Aapka Apollo Clinic appointment kal shaam 5:30 baje confirm ho gaya hai.",
    liveAgentId: "ac11e104-a37a-4ff1-aef6-fc8a2c97f4d7",
    greeting: "Namaste! Main Vaakriti se Arika bol rahi hoon, ek AI assistant. Service quality ke liye call record ho sakti hai. Aaj main aapki kya madad kar sakti hoon?",
  },
  {
    id: "vikram",
    name: "Vikram",
    role: "Sales & Outbound Advisor",
    language: "Hindi & English",
    voiceId: "shubh",
    color: "#2563EB", // Blue accent
    sampleAudio: "/audio/greetings/en.wav",
    sampleScript: "Hello! Vikram calling from DLF regarding your inquiry for the 3BHK residence. Is Saturday 11 AM good for a private site tour?",
    liveAgentId: "6bcdcdcd-6684-4e8a-8564-77a27a9376be",
    greeting: "Hello! Main Vaakriti se Vikram bol raha hoon, an AI assistant. Call quality ke liye yeh call record ki ja sakti hai. Kya aap hamare enterprise solutions ke baare mein baat karna chahte hain?",
  },
  {
    id: "ananya",
    name: "Ananya",
    role: "Support & Billing Lead",
    language: "English (Indian Accent)",
    voiceId: "anushka",
    color: "#7C3AED", // Purple
    sampleAudio: "/audio/greetings/en.wav",
    sampleScript: "Good afternoon! Your invoice payment for October has been processed successfully. A receipt has been sent to your registered email.",
    liveAgentId: "f3f5d985-ceef-4263-a29c-dffe5ef26d21",
    greeting: "Hello, I am Ananya from Vaakriti AI, an enterprise assistant. This call may be recorded for quality assurance. How may I assist your team today?",
  },
  {
    id: "karthik",
    name: "Karthik",
    role: "Vernacular Specialist",
    language: "Tamil & English",
    voiceId: "shubh",
    color: "#D97706", // Amber
    sampleAudio: "/audio/greetings/ta.wav",
    sampleScript: "Vanakkam! Ungal order confirm aagivittadhu. Naalai maalai ungal veetukku delivery seiyyapadum.",
    liveAgentId: "b8133eed-19f2-48f0-876a-6f6946899fc6",
    greeting: "Vanakkam! Main Vaakriti AI se Karthik bol raha hoon, an AI assistant. Yeh call quality review ke liye record ki ja sakti hai. Eppadi ungalukku udhavi seiyya mudiyum?",
  },
];

export function InteractiveVoiceWidget() {
  const [selectedPersona, setSelectedPersona] = useState<DemoPersona>(PERSONAS[0]);
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Live WebRTC Voice Agent hook for live microphone testing
  const {
    connectionState,
    isMuted,
    transcripts,
    startCall,
    endCall,
    toggleMute,
  } = useVoiceAgent();

  const isConnecting = connectionState === 'connecting';
  const isCallConnected = connectionState === 'active';
  const isSpeaking = connectionState === 'active';

  // Stop sample audio if live call starts
  useEffect(() => {
    if (isCallConnected && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSample(false);
    }
  }, [isCallConnected]);

  const handleToggleSample = () => {
    if (isCallConnected) {
      endCall();
    }

    if (isPlayingSample) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlayingSample(false);
    } else {
      if (audioRef.current) {
        audioRef.current.src = selectedPersona.sampleAudio;
        audioRef.current.play()
          .then(() => setIsPlayingSample(true))
          .catch(() => {
            // Synthesize fallback
            setIsPlayingSample(true);
            setTimeout(() => setIsPlayingSample(false), 3000);
          });
        audioRef.current.onended = () => setIsPlayingSample(false);
      }
    }
  };

  const handleSwitchPersona = (persona: DemoPersona) => {
    if (isCallConnected) {
      endCall();
    }
    if (isPlayingSample && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSample(false);
    }
    setSelectedPersona(persona);
  };

  return (
    <section id="live-demo" className="w-full bg-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-slate-100">
      <audio ref={audioRef} className="hidden" />

      <div className="mx-auto max-w-[1240px]">
        
        {/* Header: Clean & Punchy */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-[11px] font-mono font-bold tracking-widest text-slate-700 uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>INTERACTIVE SOUND STUDIO</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            Hear Real Voice Agents at Work
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 font-normal">
            Listen to calibrated Indian personas or connect your microphone to experience sub-480ms live turn-taking.
          </p>
        </div>

        {/* The Studio Console (Single, Focused, High-Impact) */}
        <div className="rounded-[2.2rem] border border-slate-200/90 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40 p-6 sm:p-10 shadow-sm">
          
          {/* Persona Selector Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
            {PERSONAS.map((p) => {
              const isSelected = p.id === selectedPersona.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSwitchPersona(p)}
                  className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-2.5 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                      : "bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name}</span>
                  <span className={`text-[10px] font-mono hidden sm:inline ${isSelected ? "text-slate-400" : "text-slate-500"}`}>
                    ({p.role.split(" ")[0]})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Persona Studio Viewport */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Persona Details & Script */}
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{selectedPersona.name}</span>
                      <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedPersona.language}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                      {selectedPersona.role}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full font-semibold">
                    LATENCY: &lt; 480MS
                  </span>
                </div>

                {/* Script Quote / Sample */}
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-5 relative">
                  <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">
                    {isCallConnected ? "LIVE CALL IN PROGRESS" : "REPRESENTATIVE VOICE UTTERANCE"}
                  </div>
                  <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed italic">
                    "{isCallConnected 
                      ? (transcripts.length > 0 
                          ? transcripts[transcripts.length - 1].text 
                          : selectedPersona.greeting)
                      : selectedPersona.sampleScript}"
                  </p>
                </div>

                {/* Telemetry Chips */}
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500 pt-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Indian Code-Switching</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>TRAI Compliant</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Actions & Audio Spectrum */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center">
                
                {/* Animated Waveform Visualizer */}
                <div className="h-16 flex items-center justify-center gap-1.5 mb-6">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: (isPlayingSample || (isCallConnected && isSpeaking))
                          ? [12, Math.max(16, (i % 5) * 11 + 18), 12]
                          : 8,
                      }}
                      transition={{
                        duration: 0.4 + (i % 4) * 0.1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.05,
                      }}
                      className={`w-1 rounded-full transition-colors ${
                        (isPlayingSample || (isCallConnected && isSpeaking))
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Action Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                  
                  {/* Sample Audio Play Button */}
                  <button
                    type="button"
                    onClick={handleToggleSample}
                    className={`w-full flex-1 py-3 px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isPlayingSample
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                        : "bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 shadow-2xs"
                    }`}
                  >
                    {isPlayingSample ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pause Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-emerald-600" />
                        <span>Listen to Voice</span>
                      </>
                    )}
                  </button>

                  {/* Live WebRTC Microphone Call Button */}
                  <button
                    type="button"
                    onClick={isCallConnected ? () => { endCall(); } : () => { startCall(undefined, undefined, selectedPersona.liveAgentId); }}
                    disabled={isConnecting}
                    className={`w-full flex-1 py-3 px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isCallConnected
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                        : "bg-slate-900 hover:bg-black text-white shadow-md shadow-slate-900/10"
                    }`}
                  >
                    {isConnecting ? (
                      <span>Connecting...</span>
                    ) : isCallConnected ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>End Live Call</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-emerald-400" />
                        <span>Talk via Mic</span>
                      </>
                    )}
                  </button>

                </div>

                <p className="text-[11px] text-slate-500 font-mono mt-3">
                  {isCallConnected 
                    ? "LiveKit WebRTC active • Speak into your microphone" 
                    : "No login or credit card required to test"}
                </p>

              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
