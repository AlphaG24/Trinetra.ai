'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, Save, RotateCcw, Loader2, Sparkles, CheckCircle2, 
  Plus, Trash2, MessageSquare, Mic, UserCheck, ShieldCheck, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

export interface DemoAgentItem {
  id: string;
  name: string;
  personality: string;
  archetype: string;
  voice_id: string;
  language: string;
  gender: string;
  description: string;
  greeting_message: string;
  accent_color: string;
  badge_color: string;
  suggested_prompts: string[];
  is_managed_by_dev: boolean;
  campaign_purpose?: string;
  industry_domain?: string;
}

const VOICE_OPTIONS = [
  { id: 'shreya', label: 'Sarvam AI - Shreya (Female - Hinglish / Hindi)', gender: 'female' },
  { id: 'shubh', label: 'Sarvam AI - Shubh (Male - Hindi / English)', gender: 'male' },
  { id: 'anushka', label: 'Sarvam AI - Anushka (Female - Hinglish Dialect)', gender: 'female' },
  { id: 'priya', label: 'Sarvam AI - Priya (Female - Expressive Hindi)', gender: 'female' },
  { id: 'amartya', label: 'Sarvam AI - Amartya (Male - Hindi)', gender: 'male' },
  { id: 'arvind', label: 'Sarvam AI - Arvind (Male - Professional Hindi)', gender: 'male' },
  { id: 'ratan', label: 'Sarvam AI - Ratan (Male - Authoritative Hindi)', gender: 'male' },
  { id: 'deepgram-vikram', label: 'Deepgram Hindi - Vikram (Male - Dynamic Sales)', gender: 'male' },
];

const PERSONALITY_OPTIONS = [
  'Warm & Consultative',
  'Persuasive & Energetic',
  'Empathetic & Supportive',
  'Refined & Professional',
  'Assertive & Deal-Focused',
  'Intellectual & Guiding',
  'Friendly & Conversational',
];

export function DemoAgentsManager() {
  const [agents, setAgents] = useState<DemoAgentItem[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [developerId, setDeveloperId] = useState<string>('');
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/developer/demo-agents')
      .then((res) => {
        if (!res.ok) throw new Error('Developer endpoint returned status ' + res.status);
        return res.json();
      })
      .then((data) => {
        if (data?.agents && Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
        if (data?.all_agents && Array.isArray(data.all_agents)) {
          setAllAgents(data.all_agents);
        }
        if (data?.my_agents && Array.isArray(data.my_agents)) {
          setMyAgents(data.my_agents);
        }
        if (data?.developer_id) {
          setDeveloperId(data.developer_id);
        }
      })
      .catch(async (err) => {
        console.warn('Developer demo endpoint notice, loading public fallback:', err.message);
        // Fallback: load public agents so UI is always functional
        try {
          const pubRes = await fetch('/api/public/demo-agents');
          const pubData = await pubRes.json();
          if (pubData?.agents) {
            setAgents(pubData.agents);
          }
        } catch {}
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const currentAgent = agents[selectedAgentIndex];

  // Select a real database agent and bind into the active slot
  const handleSelectRealAgent = (agentId: string) => {
    if (!agentId) return;

    if (agentId === '__CREATE_NEW__') {
      const newAgentName = prompt('Enter name for the new developer agent:', 'My AI Agent');
      if (!newAgentName) return;

      const newId = `dev-agent-${Date.now()}`;
      setAgents((prev) => {
        const copy = [...prev];
        copy[selectedAgentIndex] = {
          ...copy[selectedAgentIndex],
          id: newId,
          name: newAgentName,
          personality: 'Warm & Consultative',
          archetype: 'Custom Developer Persona',
          voice_id: 'shreya',
          language: 'Hinglish & English',
          gender: 'female',
          description: `Custom real agent managed by developer ID ${developerId || 'active'}.`,
          greeting_message: `Namaste! Main Trinetra AI se ${newAgentName} bol rahi hoon, aapki AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar sakti hoon?`,
          is_managed_by_dev: true,
        };
        return copy;
      });
      toast.success(`Created agent draft "${newAgentName}". Click "Save Configuration" to register in database!`);
      return;
    }

    const foundAgent = allAgents.find((a) => a.id === agentId);
    if (!foundAgent) return;

    const isFemale = foundAgent.gender === 'female' || ['shreya', 'anushka', 'priya'].includes(foundAgent.voice_id);
    const resolvedGender = isFemale ? 'female' : 'male';
    const defaultVoice = isFemale ? 'shreya' : 'shubh';

    setAgents((prev) => {
      const copy = [...prev];
      copy[selectedAgentIndex] = {
        ...copy[selectedAgentIndex],
        id: foundAgent.id,
        name: foundAgent.name?.replace(/^\[.*?\]\s*/, '')?.replace(/\s*-\s*Demo$/i, '') || copy[selectedAgentIndex].name,
        personality: foundAgent.personality || copy[selectedAgentIndex].personality || 'Warm & Consultative',
        voice_id: foundAgent.voice_id || defaultVoice,
        language: foundAgent.language || 'Hinglish & English',
        gender: resolvedGender,
        description: foundAgent.description || copy[selectedAgentIndex].description,
        greeting_message: foundAgent.greeting_message || `Namaste! Main Trinetra AI se ${foundAgent.name} bol ${resolvedGender === 'female' ? 'rahi' : 'raha'} hoon, ek AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar ${resolvedGender === 'female' ? 'sakti' : 'sakta'} hoon?`,
        is_managed_by_dev: true,
      };
      return copy;
    });

    toast.success(`Connected real agent "${foundAgent.name}" (ID: ${foundAgent.id}) to this slot!`);
  };

  const handleAddNewAgentSlot = () => {
    const newSlotNumber = agents.length + 1;
    const defaultAgent = allAgents[0] || {};
    const newAgent: DemoAgentItem = {
      id: defaultAgent.id || `demo-${Date.now()}`,
      name: defaultAgent.name || `Agent ${newSlotNumber}`,
      personality: 'Warm & Consultative',
      archetype: 'Inbound Specialist',
      campaign_purpose: 'Customer Service & Inbound Triage',
      industry_domain: 'Hospitality / Concierge Booking',
      voice_id: defaultAgent.voice_id || 'shreya',
      language: 'Hinglish & English',
      gender: 'female',
      description: 'Custom AI agent calibrated for natural voice conversations.',
      greeting_message: 'Namaste! Main Trinetra AI se bol rahi hoon, aapki AI assistant. Service quality ke liye yeh call record ki ja sakti hai. Aaj main aapki kya madad kar sakti hoon?',
      accent_color: '#0D9488',
      badge_color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      suggested_prompts: [
        'Room unavailable on desired dates / alternate options',
        'Early check-in or late check-out fee waiver requested',
        'Cancellation penalty / refund dispute resolution',
      ],
      is_managed_by_dev: true,
    };
    setAgents((prev) => [...prev, newAgent]);
    setSelectedAgentIndex(agents.length);
    toast.info(`Added new slot #${newSlotNumber}`);
  };

  const handleRemoveCurrentSlot = () => {
    if (agents.length <= 1) {
      toast.error('Must keep at least 1 agent slot.');
      return;
    }
    setAgents((prev) => prev.filter((_, idx) => idx !== selectedAgentIndex));
    setSelectedAgentIndex(0);
    toast.info('Removed agent slot.');
  };

  const handleUpdateField = (field: keyof DemoAgentItem, value: any) => {
    setAgents((prev) => {
      const copy = [...prev];
      copy[selectedAgentIndex] = {
        ...copy[selectedAgentIndex],
        [field]: value,
      };
      return copy;
    });
  };

  const handleUpdatePrompt = (promptIndex: number, value: string) => {
    setAgents((prev) => {
      const copy = [...prev];
      const prompts = [...(copy[selectedAgentIndex].suggested_prompts || [])];
      prompts[promptIndex] = value;
      copy[selectedAgentIndex] = {
        ...copy[selectedAgentIndex],
        suggested_prompts: prompts,
      };
      return copy;
    });
  };

  const handleAddPrompt = () => {
    setAgents((prev) => {
      const copy = [...prev];
      const prompts = [...(copy[selectedAgentIndex].suggested_prompts || [])];
      prompts.push('New call scenario / objection prompt...');
      copy[selectedAgentIndex] = {
        ...copy[selectedAgentIndex],
        suggested_prompts: prompts,
      };
      return copy;
    });
  };

  const handleRemovePrompt = (promptIndex: number) => {
    setAgents((prev) => {
      const copy = [...prev];
      const prompts = [...(copy[selectedAgentIndex].suggested_prompts || [])];
      prompts.splice(promptIndex, 1);
      copy[selectedAgentIndex] = {
        ...copy[selectedAgentIndex],
        suggested_prompts: prompts,
      };
      return copy;
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/developer/demo-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save demo agents');

      if (data?.agents && Array.isArray(data.agents)) {
        setAgents(data.agents);
      }

      toast.success('Live demo agents saved and synchronized with database! Real agent is active.');
    } catch (err: any) {
      toast.error(err.message || 'Error saving demo agents');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all demo agents to official Trinetra defaults?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/public/demo-agents');
      const data = await res.json();
      if (data?.agents) {
        setAgents(data.agents);
        toast.info('Loaded defaults. Click "Save Configuration" to publish.');
      }
    } catch {
      toast.error('Failed to reset defaults');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-8 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs text-zinc-400">Loading demo agents configuration...</span>
      </div>
    );
  }

  if (!currentAgent) {
    return null;
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl mb-8">
      {/* Header */}
      <div className="p-5 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Voice Demo Studio Agents
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Developer Tester
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select real database agents managed by your developer ID, tune their personalities, and deploy them to the live studio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/10 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      {/* Slot Selector Tabs */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 bg-zinc-900/20">
        <div className="flex items-center gap-2 overflow-x-auto">
          {agents.map((agent, idx) => {
            const isSelected = idx === selectedAgentIndex;
            return (
              <button
                key={agent.id || idx}
                type="button"
                onClick={() => setSelectedAgentIndex(idx)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: agent.accent_color || '#10B981' }}
                />
                <span>{agent.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">#{idx + 1}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleAddNewAgentSlot}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition cursor-pointer"
            title="Add another agent slot to the live studio"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slot</span>
          </button>
        </div>

        {agents.length > 1 && (
          <button
            type="button"
            onClick={handleRemoveCurrentSlot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition cursor-pointer"
            title="Remove this slot"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Slot</span>
          </button>
        )}
      </div>

      {/* Editor Body */}
      <form onSubmit={handleSave} className="p-6 space-y-6">
        
        {/* ── 1. PROMINENT REAL AGENT SELECTOR (MANAGED BY DEVELOPER ID) ── */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border-2 border-emerald-500/50 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Select Real Agent Managed by My Developer ID</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800">
              Active Agent ID: <strong className="text-emerald-300">{currentAgent.id}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-8 relative">
              <select
                value={allAgents.some((a) => a.id === currentAgent.id) ? currentAgent.id : ''}
                onChange={(e) => handleSelectRealAgent(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-emerald-500/60 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 cursor-pointer appearance-none"
              >
                <option value="" disabled>-- Pick Real Database Agent for &quot;{currentAgent.name}&quot; --</option>
                
                {/* My Developer Agents (Highest Priority) */}
                {myAgents.length > 0 && (
                  <optgroup label="🌟 My Developer Agents (Managed by My ID)">
                    {myAgents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.language || 'Hinglish'}) — [{ag.status ? ag.status.toUpperCase() : 'ACTIVE'}] — ID: {ag.id}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* All Platform Agents */}
                <optgroup label="🏢 All Platform / System Agents">
                  {allAgents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.language || 'Hinglish'}) — [{ag.status ? ag.status.toUpperCase() : 'ACTIVE'}] — ID: {ag.id}
                    </option>
                  ))}
                </optgroup>

                {/* Create New Agent Option */}
                <optgroup label="✨ Create New Real Agent">
                  <option value="__CREATE_NEW__">+ Create New Agent Registered to My Developer ID</option>
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="sm:col-span-4 text-[11px] text-zinc-400 leading-tight">
              Selecting an agent binds this slot to the real agent record. When calls connect, the live voice pipeline runs this specific agent.
            </div>
          </div>
        </div>

        {/* ── 2. AGENT PROFILE ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Agent Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Agent Name
            </label>
            <input
              type="text"
              value={currentAgent.name}
              onChange={(e) => handleUpdateField('name', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-medium"
              placeholder="e.g. Vikram"
              required
            />
          </div>

          {/* Calling Campaign / Purpose */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Calling Campaign / Purpose
            </label>
            <input
              type="text"
              value={currentAgent.campaign_purpose || currentAgent.archetype || ''}
              onChange={(e) => {
                handleUpdateField('campaign_purpose', e.target.value);
                handleUpdateField('archetype', e.target.value);
              }}
              className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-medium"
              placeholder="e.g. Customer Service / Inbound Booking"
              required
            />
          </div>

          {/* Industry / Domain */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Industry / Domain
            </label>
            <input
              type="text"
              value={currentAgent.industry_domain || 'Hospitality / Concierge Booking'}
              onChange={(e) => handleUpdateField('industry_domain', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-medium"
              placeholder="e.g. Hospitality / Concierge Booking"
              required
            />
          </div>
        </div>

        {/* ── 3. VOICE, TONE & GENDER ROW ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Voice Model / Provider */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Voice Model / Provider
            </label>
            <div className="relative">
              <select
                value={currentAgent.voice_id || 'shreya'}
                onChange={(e) => {
                  const opt = VOICE_OPTIONS.find((v) => v.id === e.target.value);
                  handleUpdateField('voice_id', e.target.value);
                  if (opt) handleUpdateField('gender', opt.gender);
                }}
                className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none font-medium cursor-pointer"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Tone / Personality */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Tone / Personality
            </label>
            <div className="relative">
              <select
                value={currentAgent.personality || 'Warm & Consultative'}
                onChange={(e) => handleUpdateField('personality', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 appearance-none font-medium cursor-pointer"
              >
                {PERSONALITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* AI Gender */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              AI Gender
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleUpdateField('gender', 'male')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  currentAgent.gender === 'male'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => handleUpdateField('gender', 'female')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  currentAgent.gender === 'female'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                Female
              </button>
            </div>
          </div>
        </div>

        {/* ── 4. OPENING GREETING (WITH SEC-011 COMPLIANCE BADGE) ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Opening Greeting (Or Excel/CSV Auto-Fill for Outbound Calls)
            </label>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              SEC-011 Mandate: AI Identity + Call Recording Notice
            </span>
          </div>
          <textarea
            value={currentAgent.greeting_message}
            onChange={(e) => handleUpdateField('greeting_message', e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            placeholder="Namaste! Main Trinetra AI se Vikram bol raha hoon, an AI assistant. Service quality ke liye yeh call record ki ja sakti hai..."
            required
          />
        </div>

        {/* ── 5. CANONICAL OBJECTION / CALL SCENARIO PROMPTS ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Suggested Objection Handling / Call Scenario Prompts
            </label>
            <button
              type="button"
              onClick={handleAddPrompt}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Scenario
            </button>
          </div>
          <div className="space-y-2">
            {(currentAgent.suggested_prompts || []).map((prompt, pIdx) => (
              <div key={pIdx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => handleUpdatePrompt(pIdx, e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePrompt(pIdx)}
                  className="p-2 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                  title="Remove scenario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Configurations
          </button>
        </div>
      </form>
    </div>
  );
}
