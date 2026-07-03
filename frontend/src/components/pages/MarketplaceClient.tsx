'use client'

import { useState } from 'react'
import { Bot, ExternalLink, Globe, Play, Search, Sparkles, X, Phone, Mic } from 'lucide-react'
import { VoiceDemo } from '../demo/VoiceDemo'

interface PlatformService {
  id: string
  name: string
  slug: string
  description: string | null
  type: string
  icon_url: string | null
  subdomain_url: string | null
  ui_config: any
  created_at: string
}

interface MarketplaceClientProps {
  services: PlatformService[]
}

export function MarketplaceClient({ services }: MarketplaceClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVoiceAgent, setSelectedVoiceAgent] = useState<PlatformService | null>(null)

  // Filter services by search query
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    service.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isVoiceAgent = (service: PlatformService) => {
    return service.slug === 'voice-agent' || service.type.toLowerCase() === 'voice'
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-amber-400" /> AI Tool Marketplace
          </h1>
          <p className="text-gray-400 text-sm mt-1">Discover and deploy autonomous AI agents across your business subdomains</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search AI tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1117]/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
          />
        </div>
      </div>

      {/* Grid of Tools */}
      {filteredServices.length === 0 ? (
        <div className="h-[280px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-8 text-center bg-black/10">
          <Bot className="w-12 h-12 text-zinc-600 mb-4 animate-bounce" />
          <h3 className="text-white font-semibold text-base">No AI tools found</h3>
          <p className="text-zinc-400 text-sm max-w-sm mt-1">
            Try adjusting your search query or check back later for new platform additions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const isVoice = isVoiceAgent(service)
            return (
              <div
                key={service.id}
                className="bg-[#0f1117]/90 border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 group relative overflow-hidden h-[240px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                <div className="space-y-4">
                  {/* Card Header (Icon & Type) */}
                  <div className="flex items-center justify-between">
                    {service.icon_url ? (
                      <img
                        src={service.icon_url}
                        alt={service.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-2xl">
                        {isVoice ? '📞' : '🤖'}
                      </div>
                    )}

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/5 border border-white/10 text-zinc-400">
                      {service.type}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {service.description || 'No description provided.'}
                    </p>
                  </div>
                </div>

                {/* Card Action CTA */}
                <div className="border-t border-white/5 pt-4 mt-4">
                  {service.subdomain_url ? (
                    <a
                      href={service.subdomain_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-4 bg-zinc-850 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-700 hover:border-white/20 font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <Globe className="w-4 h-4" /> Open Tool <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : isVoice ? (
                    <button
                      onClick={() => setSelectedVoiceAgent(service)}
                      className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" /> Try Live Demo
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 px-4 bg-white/5 text-zinc-500 border border-white/5 font-semibold rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Bot className="w-4 h-4" /> Service Ready
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Voice Demo Modal Overlay */}
      {selectedVoiceAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-[#0b0c10] border border-white/10 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            {/* Close Button */}
            <button
              onClick={() => setSelectedVoiceAgent(null)}
              className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 border-b border-white/5 pb-5 mb-6">
              {selectedVoiceAgent.icon_url ? (
                <img
                  src={selectedVoiceAgent.icon_url}
                  alt={selectedVoiceAgent.name}
                  className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-3xl">
                  📞
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {selectedVoiceAgent.name} <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">Voice Sandbox</span>
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">{selectedVoiceAgent.description}</p>
              </div>
            </div>

            {/* Embed the VoiceDemo Component */}
            <div className="bg-black/20 border border-white/5 rounded-2xl p-4">
              <VoiceDemo
                agentPhone="+1 (341) 441-8499"
                assignedVapiAgentId={selectedVoiceAgent.ui_config?.vapi_agent_id || null}
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 text-center text-xs text-zinc-500">
              Note: This call will log metrics under the <span className="text-zinc-400 font-mono">{selectedVoiceAgent.name}</span> telemetry record.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
