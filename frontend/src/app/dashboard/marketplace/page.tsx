import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MarketplaceCard } from './components/MarketplaceCard'
import { Box, Terminal, Cpu, ShieldCheck } from 'lucide-react'

export const metadata = {
  title: 'AI Tool Marketplace — Trinetra OS',
  description: 'Deploy advanced, production-grade autonomous voice and chat agents, data extraction structurers, and operations processors to your workspace.',
}

export default async function MarketplacePage() {
  // 1. Initialize Supabase SSR and fetch user session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Query platform_services for active & visible tools
  const { data: services, error } = await supabase
    .from('platform_services')
    .select('*')
    .eq('is_active', true)
    .eq('is_visible_in_marketplace', true)
    .order('name', { ascending: true })

  return (
    <main className="min-h-screen bg-[#0a0a0f] py-4 space-y-8 animate-fade-in">
      {/* Premium Header Banner */}
      <section className="relative overflow-hidden border border-zinc-800 bg-zinc-950/60 p-8 md:p-10 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Banner Glowing Backdrops */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-zinc-800/5 to-transparent blur-3xl opacity-60 pointer-events-none" />
        
        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 text-xs font-medium">
            <Box className="w-3.5 h-3.5" />
            <span>Neural Sandboxing Sandbox Live</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
            AI Tool Marketplace
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Deploy production-ready autonomous voice agents, custom data extraction pipelines, and cognitive business engines directly into your workspace. Deployments allocate dynamic credits instantly.
          </p>
        </div>

        {/* Highlight Stats Panels */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto relative z-10">
          <div className="border border-zinc-800 bg-[#0c0c12]/90 p-4 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500">
              <Cpu className="w-3 h-3 text-orange-500" />
              <span>Available Systems</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {services?.length || 0} Tools
            </div>
          </div>
          <div className="border border-zinc-800 bg-[#0c0c12]/90 p-4 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Security</span>
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              Isolated
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Marketplace Cards */}
      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Autonomous Workloads & Cognitive Engines
          </h2>
        </div>

        {!services || services.length === 0 ? (
          <div className="border border-zinc-800 bg-[#0c0c12] p-12 rounded-xl text-center space-y-3">
            <Cpu className="w-8 h-8 text-zinc-600 mx-auto animate-pulse" />
            <h3 className="text-base font-bold text-white">No Marketplace Tools Active</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              We are currently provisioning new cognitive business engines. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((tool) => (
              <MarketplaceCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
