'use client'

import { useState } from 'react'
import { X, Headphones, MessageSquare, Bot, User, Clock, Sparkles, Copy, Check, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { CallAudioPlayer } from '@/src/components/shared/CallAudioPlayer'

interface LogObject {
  duration_seconds?: number
  transcript?: any
  recording_url?: string | null
  caller_name?: string
}

interface TranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  log?: LogObject | null
  
  // Backward compatibility fallbacks
  transcript?: any
  recordingUrl?: string | null
  callerName?: string
  autoPlay?: boolean
}

export function TranscriptModal({ 
  isOpen, 
  onClose, 
  log,
  transcript, 
  recordingUrl, 
  callerName = 'Customer',
  autoPlay = false
}: TranscriptModalProps) {
  const [copied, setCopied] = useState(false)

  // Resolve properties dynamically to support both new 'log' prop and legacy individual parameters
  const resolvedTranscript = log ? log.transcript : transcript
  const resolvedRecordingUrl = log ? log.recording_url : recordingUrl
  const resolvedCallerName = log ? (log.caller_name || 'Customer') : (callerName || 'Customer')
  const resolvedDuration = log ? log.duration_seconds : undefined

  // Helper to format duration to a clean mm:ss format
  const formatDuration = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return null
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Parses raw transcripts (strings, arrays, JSON objects) into message bubbles
  // Handles multi-line messages, non-colon formats, and standard speaker prefixes
  const parseTranscript = (raw: any): Array<{ id: number; speaker: 'AI' | 'USER'; text: string }> => {
    if (!raw) return []

    // If raw is an array already (e.g. [{ role: 'assistant', content: '...' }])
    if (Array.isArray(raw)) {
      return raw.map((item, idx): { id: number; speaker: 'AI' | 'USER'; text: string } => {
        if (typeof item === 'string') {
          const colonMatch = item.match(/^(USER|AI|CALLER|ASSISTANT|SYSTEM|AGENT|CUSTOMER):\s*(.*)$/i)
          if (colonMatch) {
            const rawSpeaker = colonMatch[1].toUpperCase()
            const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
            return { id: idx, speaker, text: colonMatch[2].trim() }
          }
          return { id: idx, speaker: 'AI', text: item }
        }
        if (typeof item === 'object' && item !== null) {
          const rawSpeaker = String(item.speaker || item.role || item.sender || '').toUpperCase()
          const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
          const text = String(item.text || item.content || item.message || item.transcript || item.utterance || '')
          return { id: idx, speaker, text }
        }
        return { id: idx, speaker: 'AI', text: String(item) }
      }).filter(msg => msg.text.trim().length > 0)
    }

    // If raw is an object (not null, not array)
    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw.messages)) return parseTranscript(raw.messages)
      if (Array.isArray(raw.turns)) return parseTranscript(raw.turns)
      if (raw.transcript) return parseTranscript(raw.transcript)
      if (raw.text) return parseTranscript(raw.text)
      if (raw.content) return parseTranscript(raw.content)
      // Fallback: stringify object
      return parseTranscript(JSON.stringify(raw, null, 2))
    }

    // Ensure raw is a string
    const rawString = typeof raw === 'string' ? raw : String(raw)
    const trimmed = rawString.trim()
    if (!trimmed) return []

    // Try parsing as JSON string if it looks like JSON array or object
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed) || (typeof parsed === 'object' && parsed !== null)) {
          return parseTranscript(parsed)
        }
      } catch {
        // Not JSON, continue to line-by-line parsing
      }
    }

    const lines = rawString
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const parsedMessages: Array<{ id: number; speaker: 'AI' | 'USER'; text: string }> = []
    let currentMessage: { id: number; speaker: 'AI' | 'USER'; text: string } | null = null

    lines.forEach((line, idx) => {
      // Matches standard patterns like "USER: message", "AI: message", "CALLER: message", "AGENT: message"
      const colonMatch = line.match(/^(USER|AI|CALLER|ASSISTANT|SYSTEM|AGENT|CUSTOMER):\s*(.*)$/i)
      
      if (colonMatch) {
        const rawSpeaker = colonMatch[1].toUpperCase()
        const text = colonMatch[2].trim()
        const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
        
        currentMessage = {
          id: idx,
          speaker,
          text
        }
        parsedMessages.push(currentMessage)
      } else {
        // Fallback for space separation e.g. "USER message"
        const spaceMatch = line.match(/^(USER|AI|CALLER|ASSISTANT|AGENT|CUSTOMER)\s+(.*)$/i)
        if (spaceMatch) {
          const rawSpeaker = spaceMatch[1].toUpperCase()
          const text = spaceMatch[2].trim()
          const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER' || rawSpeaker === 'CUSTOMER') ? 'USER' : 'AI'
          
          currentMessage = {
            id: idx,
            speaker,
            text
          }
          parsedMessages.push(currentMessage)
        } else if (currentMessage) {
          // If no speaker prefix is detected, but there is a preceding message, append to it (handles multi-line messages)
          currentMessage.text += '\n' + line
        } else {
          // Fallback if there is no preceding message
          currentMessage = {
            id: idx,
            speaker: 'AI',
            text: line
          }
          parsedMessages.push(currentMessage)
        }
      }
    })

    return parsedMessages
  }

  const messages = parseTranscript(resolvedTranscript)
  const durationLabel = formatDuration(resolvedDuration)

  const handleCopyTranscript = () => {
    if (!resolvedTranscript) return
    const textToCopy = typeof resolvedTranscript === 'string'
      ? resolvedTranscript
      : (typeof resolvedTranscript === 'object' ? JSON.stringify(resolvedTranscript, null, 2) : String(resolvedTranscript))
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast.success('Transcript copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden">
          
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
            className="relative w-full max-w-2xl bg-[var(--card-bg)] text-[var(--body)] border border-[var(--border)] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10 font-sans"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-[var(--background)]/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                  <MessageSquare className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--heading)] tracking-tight flex items-center gap-2 font-display">
                    {resolvedCallerName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[var(--muted)] font-bold tracking-wider uppercase font-montserrat">Call Transcript</span>
                    {durationLabel && (
                      <>
                        <span className="text-[var(--muted)] font-bold">•</span>
                        <div className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 font-mono font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {durationLabel}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {resolvedTranscript && (
                  <button 
                    onClick={handleCopyTranscript}
                    className="p-2 hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] rounded-xl transition-all border border-[var(--border)] cursor-pointer"
                    title="Copy Transcript"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-[var(--hover-bg)] text-[var(--muted)] hover:text-[var(--heading)] rounded-xl transition-all border border-[var(--border)] cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Audio Player for Every Call */}
            <div className="px-6 py-3 bg-[var(--background)]/80 border-b border-[var(--border)]">
              <CallAudioPlayer
                recordingUrl={resolvedRecordingUrl}
                transcript={resolvedTranscript}
                durationSeconds={resolvedDuration}
                autoPlay={autoPlay}
                callerName={resolvedCallerName}
              />
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 bg-[var(--background)]/30 scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
              {messages.length > 0 ? (
                messages.map((msg, index) => {
                  const isAI = msg.speaker === 'AI'
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
                      className={`flex w-full gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
                    >
                      {/* Left side Avatar for AI */}
                      {isAI && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                          <Bot className="w-4.5 h-4.5" />
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div className="flex flex-col max-w-[75%]">
                        <span className={`text-[10px] font-bold text-[var(--muted)] mb-1 px-1 tracking-wider uppercase font-montserrat ${isAI ? 'text-left' : 'text-right'}`}>
                          {isAI ? 'Trinetra AI' : 'User'}
                        </span>
                        
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                            isAI
                              ? 'bg-[var(--card-bg)] text-[var(--heading)] border border-[var(--border)] rounded-2xl rounded-tl-none shadow-sm'
                              : 'bg-violet-600 text-white rounded-2xl rounded-tr-none shadow-md'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* Right side Avatar for User */}
                      {!isAI && (
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-bg)] border border-[var(--border)] flex items-center justify-center text-[var(--body)] shrink-0 shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-52 text-center py-10">
                  <Sparkles className="w-8 h-8 text-[var(--muted)] mb-3 animate-pulse" />
                  <p className="text-sm font-bold text-[var(--heading)] font-display">No Transcript Available</p>
                  <p className="text-xs text-[var(--muted)] mt-1 max-w-xs leading-relaxed">
                    This call does not have transcript logs or they are currently compiling.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]/60 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Close Logs
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
