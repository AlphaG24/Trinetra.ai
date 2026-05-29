'use client'

import { X, FileText, Headphones, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface TranscriptModalProps {
  isOpen: boolean
  onClose: () => void
  transcript: string | null
  recordingUrl: string | null
  callerName?: string
}

export function TranscriptModal({ 
  isOpen, 
  onClose, 
  transcript, 
  recordingUrl,
  callerName = 'Customer'
}: TranscriptModalProps) {

  // Chat Bubble parser: separates and cleans speaker prefix
  const parseTranscript = (raw: string | null) => {
    if (!raw) return []
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map((line, idx) => {
        let speaker: 'AI' | 'User' = 'AI'
        let text = line

        if (/^AI:/i.test(line)) {
          speaker = 'AI'
          text = line.replace(/^AI:\s*/i, '')
        } else if (/^User:/i.test(line)) {
          speaker = 'User'
          text = line.replace(/^User:\s*/i, '')
        } else {
          // If no prefix, check if it's user or system. Defaulting to AI or system message
          speaker = 'AI'
        }

        return {
          id: idx,
          speaker,
          text
        }
      })
  }

  const parsedBubbles = parseTranscript(transcript)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#080810]/80 backdrop-blur-sm z-50"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 250 }}
            className="fixed inset-y-0 right-0 z-50 w-full md:w-1/2 h-full bg-zinc-950 border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Ingested Call Session
                  </h3>
                  <p className="text-xs text-white/50">
                    Interact with the audio recording and parsed AI transcript for <span className="text-purple-400 font-semibold">{callerName}</span>.
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 flex flex-col overflow-hidden gap-6">
              
              {/* 1. Safe Audio Player Container */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Headphones className="w-3.5 h-3.5 text-purple-400" />
                    Call Recording Audio
                  </span>
                  {recordingUrl && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Ready to Play
                    </span>
                  )}
                </div>
                
                {recordingUrl ? (
                  <div className="w-full">
                    <audio 
                      src={recordingUrl} 
                      controls 
                      className="w-full h-10 accent-purple-500 bg-transparent rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-full py-2.5 px-4 bg-white/[0.01] border border-dashed border-white/10 rounded-xl text-center">
                    <span className="text-zinc-500 text-sm italic font-mono">
                      Audio recording processing or unavailable.
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Interactive Chat Bubble Transcript */}
              <div className="flex-1 flex flex-col min-h-0">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-1.5 font-mono mb-3 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                  Conversation Flow
                </span>

                <div className="flex-1 overflow-y-auto bg-black/40 border border-white/5 rounded-2xl p-6 custom-scrollbar space-y-4">
                  {parsedBubbles.length > 0 ? (
                    parsedBubbles.map((bubble) => {
                      const isAI = bubble.speaker === 'AI'
                      return (
                        <motion.div
                          key={bubble.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: Math.min(bubble.id * 0.05, 0.5) }}
                          className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`flex flex-col max-w-[80%] gap-1`}>
                            {/* Speaker Header Label */}
                            <span className={`text-[10px] font-mono tracking-wider text-white/30 px-1 ${isAI ? 'text-left' : 'text-right'}`}>
                              {isAI ? '⚡ TRINETRA AI' : '👤 CALLER'}
                            </span>
                            {/* The Bubble */}
                            <div
                              className={`px-4 py-3 text-sm leading-relaxed border shadow-sm ${
                                isAI
                                  ? 'bg-purple-500/20 text-purple-100 border-purple-500/10 rounded-tr-xl rounded-br-xl rounded-bl-xl'
                                  : 'bg-zinc-800 text-zinc-100 border-zinc-700/50 rounded-tl-xl rounded-bl-xl rounded-br-xl'
                              }`}
                            >
                              {bubble.text}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6">
                      <MessageSquare className="w-8 h-8 text-white/10 mb-2" />
                      <p className="text-sm text-white/40 font-mono italic">
                        No transcript content available for this session.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/[0.01] flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-mono text-xs font-semibold rounded-xl transition-all border border-zinc-700 hover:border-zinc-600 shadow-md hover:shadow-lg"
              >
                Close Output
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
