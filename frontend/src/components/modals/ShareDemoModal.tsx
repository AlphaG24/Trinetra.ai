'use client'

import { useState } from 'react'
import { X, Copy, Check, Smartphone, Mail, Link as LinkIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ShareDemoModalProps {
  isOpen: boolean
  onClose: () => void
  shareToken: string
}

export function ShareDemoModal({ isOpen, onClose, shareToken }: ShareDemoModalProps) {
  const [copied, setCopied] = useState(false)
  const shareLink = `https://trinetraai.com/demo/${shareToken}`

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#080810]/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white">Share This Demo</h3>
                <p className="text-sm text-white/50 mt-1">Let others see how your AI agent works</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Preview Card */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-lg">🤖</span>
                  </div>
                  <div>
                    <div className="font-semibold text-amber-500">Trinetra AI Demo</div>
                    <div className="text-xs text-white/50">Interactive AI Agent Preview</div>
                  </div>
                </div>
              </div>

              {/* Link Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider">Shareable Link</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareLink}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50"
                  />
                  <button 
                    onClick={copyLink}
                    className="p-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl transition-colors shrink-0 flex items-center justify-center"
                    title="Copy Link"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-amber-500/70 text-right mt-1">This link expires in 7 days</p>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-3 gap-3">
                <a 
                  href={`https://wa.me/?text=Check+out+my+AI+agent+demo:+${encodeURIComponent(shareLink)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <Smartphone className="w-5 h-5 text-green-400" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </a>
                <a 
                  href={`mailto:?subject=Test my AI Agent&body=Check out my interactive AI agent demo here: ${encodeURIComponent(shareLink)}`}
                  className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <Mail className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-medium">Email</span>
                </a>
                <button 
                  onClick={copyLink}
                  className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-white"
                >
                  <LinkIcon className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-medium">Copy Link</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
