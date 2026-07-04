'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  Mic, MicOff, Phone, PhoneOff, Play, Pause, Settings, 
  Sliders, Volume2, Shield, Activity, RefreshCw, MessageSquare, Send 
} from 'lucide-react'

interface VoiceAgentConsoleProps {
  service: any
  quota: any
}

interface TranscriptLine {
  id: string
  speaker: 'user' | 'agent' | 'system'
  text: string
  time: string
}

export function VoiceAgentConsole({ service, quota }: VoiceAgentConsoleProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active' | 'speaking'>('idle')
  const [voice, setVoice] = useState('anika-hindi-v2')
  const [isMuted, setIsMuted] = useState(false)
  const [speed, setSpeed] = useState(1.0)
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([
    { id: '1', speaker: 'system', text: 'Anika Voice sandbox initialized successfully.', time: 'Just now' }
  ])
  const [inputText, setInputText] = useState('')
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  // Simple simulator for demo purposes
  const startSession = () => {
    setStatus('connecting')
    setTranscripts(prev => [
      ...prev,
      { id: Date.now().toString(), speaker: 'system', text: 'Connecting to Trinetra Neural voice pipeline...', time: 'Now' }
    ])

    setTimeout(() => {
      setStatus('active')
      setTranscripts(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), speaker: 'system', text: 'Voice channel secured. Ready to speak.', time: 'Now' },
        { id: (Date.now() + 2).toString(), speaker: 'agent', text: 'Namaste! Main Anika hoon, aapki AI sahayak. Aaj main aapki kya madad kar sakti hoon?', time: 'Now' }
      ])
      setStatus('speaking')
    }, 1500)
  }

  const stopSession = () => {
    setStatus('idle')
    setTranscripts(prev => [
      ...prev,
      { id: Date.now().toString(), speaker: 'system', text: 'Voice session terminated by user.', time: 'Now' }
    ])
  }

  const sendMockUserSpeech = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim()) return

    const userMsg = inputText.trim()
    setInputText('')

    setTranscripts(prev => [
      ...prev,
      { id: Date.now().toString(), speaker: 'user', text: userMsg, time: 'Now' }
    ])

    setStatus('active')

    // Simulate Agent Reply
    setTimeout(() => {
      setStatus('speaking')
      let reply = 'Dhanyabaad! Main aapke prashn ka uttar dene ke liye taiyaar hoon.'
      if (userMsg.toLowerCase().includes('hello') || userMsg.toLowerCase().includes('namaste')) {
        reply = 'Namaste! Main sun rahi hoon. Bahiye, kya sawaal hai aapka?'
      } else if (userMsg.toLowerCase().includes('status') || userMsg.toLowerCase().includes('lead')) {
        reply = 'Aapke dashboard ke anusaar, aaj 12 naye leads generate hue hain aur unka pipeline active hai.'
      }
      
      setTranscripts(prev => [
        ...prev,
        { id: Date.now().toString(), speaker: 'agent', text: reply, time: 'Now' }
      ])
    }, 1800)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Waveform & Action Console */}
      <div className="lg:col-span-2 space-y-6">
        <div className="border border-zinc-800/80 bg-[#0c0c12] rounded-2xl p-6 relative overflow-hidden flex flex-col items-center justify-between min-h-[420px]">
          {/* Header */}
          <div className="w-full flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status === 'idle' ? 'bg-zinc-500' :
                status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-emerald-500 animate-ping'
              }`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {status === 'idle' && 'Console Offline'}
                {status === 'connecting' && 'Connecting...'}
                {status === 'active' && 'Listening'}
                {status === 'speaking' && 'Anika Speaking'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800/80 px-2.5 py-1 rounded-lg text-xs text-zinc-400">
              <Shield className="w-3.5 h-3.5 text-orange-500" />
              <span>Secure Session</span>
            </div>
          </div>

          {/* Visualizer Waveform */}
          <div className="my-8 flex items-center justify-center h-32 w-full gap-1.5">
            {status === 'idle' && (
              <div className="text-zinc-500 text-sm flex flex-col items-center gap-2">
                <MicOff className="w-8 h-8 opacity-40 text-zinc-600" />
                <span>Click "Start Conversation" below to enable voice link</span>
              </div>
            )}
            {status === 'connecting' && (
              <div className="flex items-center justify-center gap-1">
                <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                <span className="text-zinc-400 text-sm ml-2">Connecting SIP Trunk...</span>
              </div>
            )}
            {(status === 'active' || status === 'speaking') && (
              <div className="flex items-end gap-1.5 h-20">
                {[...Array(16)].map((_, i) => {
                  const delay = i * 0.1
                  const baseHeight = status === 'speaking' 
                    ? [40, 70, 30, 90, 50, 80, 20, 60][i % 8]
                    : [20, 30, 15, 40, 25, 35, 10, 30][i % 8]
                  
                  return (
                    <div
                      key={i}
                      className="w-1.5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full transition-all"
                      style={{
                        height: `${baseHeight}px`,
                        animation: `bounce 1s ease-in-out infinite alternate`,
                        animationDelay: `${delay}s`
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Large Action Buttons */}
          <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 z-10">
            {status === 'idle' ? (
              <button
                onClick={startSession}
                className="w-full sm:w-auto py-3.5 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-lg shadow-orange-500/10 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Phone className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                Start Conversation
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-full sm:w-auto py-3 px-6 border rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                    isMuted 
                      ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isMuted ? 'Muted' : 'Mute Microphone'}
                </button>
                
                <button
                  onClick={stopSession}
                  className="w-full sm:w-auto py-3.5 px-8 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {/* Real-time Transcripts */}
        <div className="border border-zinc-800/80 bg-[#0c0c12] rounded-2xl p-6 flex flex-col h-[320px]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            Live Dialogue Transcript
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-zinc-800">
            {transcripts.map((t) => (
              <div 
                key={t.id} 
                className={`flex flex-col max-w-[85%] ${
                  t.speaker === 'user' ? 'ml-auto items-end' : 'items-start'
                }`}
              >
                <span className="text-[10px] text-zinc-500 mb-1 px-1">{
                  t.speaker === 'user' ? 'You' : 
                  t.speaker === 'agent' ? 'Anika (AI Agent)' : 
                  'System'
                }</span>
                <div className={`p-3 rounded-xl text-sm ${
                  t.speaker === 'user' 
                    ? 'bg-orange-500/15 border border-orange-500/25 text-orange-100 rounded-tr-none' 
                    : t.speaker === 'agent'
                    ? 'bg-zinc-900 border border-zinc-800/80 text-zinc-100 rounded-tl-none'
                    : 'bg-zinc-950 text-zinc-500 border border-zinc-900 italic text-xs w-full text-center py-2'
                }`}>
                  {t.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          {status !== 'idle' && (
            <form onSubmit={sendMockUserSpeech} className="mt-4 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type message to simulate your speech..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="submit"
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 p-2.5 rounded-xl text-orange-500 hover:text-orange-400 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Voice Controls / Parameters */}
      <div className="space-y-6">
        <div className="border border-zinc-800/80 bg-[#0c0c12] rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Sliders className="w-4 h-4 text-orange-500" />
            Acoustic Controls
          </h3>

          {/* Voice Model Selector */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-semibold">Active Neural Voice Model</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
            >
              <option value="anika-hindi-v2">Anika (Hindi Neural v2)</option>
              <option value="anika-english-us">Anika (English Custom Acc.)</option>
              <option value="anika-hinglish-hybrid">Anika (Hinglish Hybrid v1)</option>
            </select>
          </div>

          {/* Speed slider */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-zinc-400">
              <span className="font-semibold">Speech Speed Rate</span>
              <span className="text-orange-500 font-bold">{speed}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>

          {/* Prompt Instructions */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-semibold">System Directives & Context</label>
            <textarea
              defaultValue="You are Anika, a professional relationship manager at Trinetra AI. Converse politely in Hindi. Answer queries regarding pipeline updates, leads status, and system operations."
              rows={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-orange-500 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Extra options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Echo Cancellation</span>
              <span className="text-emerald-500 font-semibold">Enabled</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Audio Codec</span>
              <span className="text-zinc-500">Opus Fullband (48kHz)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Voice Activity Detection</span>
              <span className="text-zinc-500">Intelligent (VAD 2.0)</span>
            </div>
          </div>
        </div>

        {/* Sandbox Quota Stats */}
        <div className="border border-zinc-800/80 bg-[#0c0c12] rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-orange-500" />
            Sandbox Limits
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Quota Used</span>
              <span className="text-white font-semibold">{quota.quota_used} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Quota Allocated</span>
              <span className="text-white font-semibold">{quota.quota_allocated} min</span>
            </div>
            <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full" 
                style={{ width: `${(quota.quota_used / quota.quota_allocated) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
