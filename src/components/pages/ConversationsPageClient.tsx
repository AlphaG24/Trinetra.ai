'use client'

import { useState } from 'react'
import { MessageSquare, Search, Filter, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface ConversationsPageClientProps {
  agents: any[]
}

export function ConversationsPageClient({ agents }: ConversationsPageClientProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-purple-400" /> Conversations
        </h1>
        <p className="text-gray-400 text-sm">Review text-based chat and WhatsApp customer interactions handled by your AI workforce</p>
      </div>

      {/* Filter strip */}
      <div className="flex flex-wrap gap-2 text-sm text-white/60 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
        <span>Active text channels: <strong className="text-white">Chat Widget, WhatsApp Business</strong></span>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search conversations by user or message content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <select
            value={activeTab}
            onChange={e => setActiveTab(e.target.value)}
            className="pl-10 pr-8 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
          >
            <option value="all">All Channels</option>
            <option value="chat">Web Chat</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Conversations Empty State */}
      <div className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
          <MessageCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No active conversations found</h3>
        <p className="text-white/50 text-sm max-w-sm">
          Once your deployed agents begin interacting with customers via Web Chat widgets or WhatsApp integrations, full records will display here.
        </p>
      </div>
    </div>
  )
}
