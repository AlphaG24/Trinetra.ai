'use client'

import { useState } from 'react'
import { X, Headphones, MessageSquare, Bot, User, Clock, Sparkles, Copy, Check, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface LogObject {
  duration_seconds?: number
  transcript?: string | null
  recording_url?: string | null
  caller_name?: string
}

interface TranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  log?: LogObject | null
  
  // Backward compatibility fallbacks
  transcript?: string | null
  recordingUrl?: string | null
  callerName?: string
}

export function TranscriptModal({ 
  isOpen, 
  onClose, 
  log,
  transcript, 
  recordingUrl,
  callerName = 'Customer'
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

  // Parses raw transcripts (e.g. "USER: text \n AI: text") into message bubbles
  // Handles multi-line messages, non-colon formats, and standard speaker prefixes
  const parseTranscript = (raw: string | null | undefined) => {
    if (!raw) return []
    const lines = raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const parsedMessages: Array<{ id: number; speaker: 'AI' | 'USER'; text: string }> = []
    let currentMessage: { id: number; speaker: 'AI' | 'USER'; text: string } | null = null

    lines.forEach((line, idx) => {
      // Matches standard patterns like "USER: message", "AI: message", "CALLER: message"
      const colonMatch = line.match(/^(USER|AI|CALLER|ASSISTANT|SYSTEM):\s*(.*)$/i)
      
      if (colonMatch) {
        const rawSpeaker = colonMatch[1].toUpperCase()
        const text = colonMatch[2].trim()
        const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER') ? 'USER' : 'AI'
        
        currentMessage = {
          id: idx,
          speaker,
          text
        }
        parsedMessages.push(currentMessage)
      } else {
        // Fallback for space separation e.g. "USER message"
        const spaceMatch = line.match(/^(USER|AI|CALLER|ASSISTANT)\s+(.*)$/i)
        if (spaceMatch) {
          const rawSpeaker = spaceMatch[1].toUpperCase()
          const text = spaceMatch[2].trim()
          const speaker: 'AI' | 'USER' = (rawSpeaker === 'USER' || rawSpeaker === 'CALLER') ? 'USER' : 'AI'
          
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
    navigator.clipboard.writeText(resolvedTranscript)
    setCopied(true)
    toast.success('Transcript copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-hidden">
          
          {/* iOS-Style Premium Glass Backdrop with heavy blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-2xl bg-zinc-950/90 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(99,102,241,0.2)] flex flex-col max-h-[85vh] backdrop-blur-xl z-10"
          >
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <MessageSquare className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
                    {resolvedCallerName}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-400 font-medium tracking-wide uppercase">Call Transcript</span>
                    {durationLabel && (
                      <>
                        <span className="text-zinc-700 font-bold">•</span>
                        <div className="flex items-center gap-1 text-[11px] text-indigo-400 font-mono font-medium">
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
                    className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all border border-transparent hover:border-zinc-800/60"
                    title="Copy Transcript"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
                
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all border border-transparent hover:border-zinc-800/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sticky Audio Player */}
            {resolvedRecordingUrl && (
              <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-800/60 flex items-center gap-4">
                <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <Headphones className="w-4 h-4 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="flex-1 flex items-center gap-3">
                  <audio 
                    src={resolvedRecordingUrl} 
                    controls 
                    className="w-full h-9 rounded-lg accent-indigo-500 filter invert"
                  />
                  <a 
                    href={resolvedRecordingUrl} 
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-xl transition-all shrink-0"
                    title="Download Recording"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 bg-black/10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                          <Bot className="w-4.5 h-4.5" />
                        </div>
                      )}

                      {/* Message Bubble Container */}
                      <div className="flex flex-col max-w-[75%]">
                        <span className={`text-[10px] font-semibold text-zinc-500 mb-1 px-1 tracking-wider uppercase ${isAI ? 'text-left' : 'text-right'}`}>
                          {isAI ? 'Trinetra AI' : 'User'}
                        </span>
                        
                        <div
                          className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                            isAI
                              ? 'bg-zinc-900 text-zinc-100 border border-zinc-800/80 rounded-2xl rounded-tl-none shadow-sm'
                              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-none shadow-lg shadow-indigo-500/10'
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>

                      {/* Right side Avatar for User */}
                      {!isAI && (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0 shadow-sm">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-52 text-center py-10">
                  <Sparkles className="w-8 h-8 text-zinc-700 mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-zinc-400">No Transcript Available</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                    This call does not have transcript logs or they are currently compiling.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/20 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold rounded-xl transition-all border border-zinc-800 hover:border-zinc-700/80 shadow-md cursor-pointer"
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
