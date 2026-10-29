'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, Save, RotateCcw, Loader2, Plus, Trash2, 
  UserCheck, ExternalLink, CheckCircle2, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/components/providers/AuthProvider';

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
  system_prompt?: string;
}

export function DemoAgentsManager() {
  const { role } = useAuth();
  const [agents, setAgents] = useState<DemoAgentItem[]>([]);
  const [allAgents, setAllAgents] = useState<any[]>([]);
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
      })
      .catch(async (err) => {
        console.warn('Developer demo endpoint notice, loading public fallback:', err.message);
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
  const boundDbAgent = allAgents.find((a) => a.id === currentAgent?.id);

  // Bind a real database agent into the active slot
  const handleSelectRealAgent = (agentId: string) => {
    if (!agentId) return;

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
        name: foundAgent.name?.replace(/^\[.*?\]\s*/, '')?.replace(/\s*-\s*Demo$/i, '') || foundAgent.name,
        personality: foundAgent.personality || copy[selectedAgentIndex].personality || 'Warm & Consultative',
        archetype: foundAgent.campaign_purpose || foundAgent.agent_type || 'Custom Agent',
        voice_id: foundAgent.voice_id || defaultVoice,
        language: foundAgent.language || 'Hinglish & English',
        gender: resolvedGender,
        description: foundAgent.description || copy[selectedAgentIndex].description || `Agent managed by your workspace.`,
        greeting_message: foundAgent.greeting_message || copy[selectedAgentIndex].greeting_message || `Namaste! Main Trinetra AI se bol raha hoon. Kaise madad kar sakta hoon?`,
        system_prompt: foundAgent.system_prompt || '',
        campaign_purpose: foundAgent.campaign_purpose || '',
        industry_domain: foundAgent.industry_domain || '',
        is_managed_by_dev: true,
      };
      return copy;
    });

    toast.success(`Slot #${selectedAgentIndex + 1} configured with "${foundAgent.name}"!`);
  };

  const handleAddNewAgentSlot = () => {
    const newSlotNumber = agents.length + 1;
    const defaultAgent = allAgents[0] || {};
    const newAgent: DemoAgentItem = {
      id: defaultAgent.id || `demo-${Date.now()}`,
      name: defaultAgent.name || `Agent ${newSlotNumber}`,
      personality: defaultAgent.personality || 'Warm & Consultative',
      archetype: defaultAgent.agent_type || 'Workspace Agent',
      campaign_purpose: defaultAgent.campaign_purpose || 'General Assistance',
      industry_domain: defaultAgent.industry_domain || 'General',
      voice_id: defaultAgent.voice_id || 'shreya',
      language: defaultAgent.language || 'Hinglish & English',
      gender: defaultAgent.gender || 'female',
      description: defaultAgent.description || 'Configured via your workspace agents.',
      greeting_message: defaultAgent.greeting_message || 'Namaste! Main Trinetra AI se bol rahi hoon. Kaise madad kar sakti hoon?',
      accent_color: '#0D9488',
      badge_color: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
      suggested_prompts: [
        'What solutions do you offer for my business?',
        'Can you demonstrate your live call capabilities?',
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

      toast.success('Live voice demo studio updated with your selected agents!');
    } catch (err: any) {
      toast.error(err.message || 'Error saving demo agents');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all demo agents to official defaults?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/public/demo-agents');
      const data = await res.json();
      if (data?.agents) {
        setAgents(data.agents);
        toast.info('Loaded defaults. Click "Save Configuration" to apply.');
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
        <span className="text-xs text-zinc-400">Loading your agents...</span>
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
                Live Voice Demo Studio Configuration
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Developer Studio'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Choose which of your agents to showcase in each demo slot. All prompts, voices, and personality settings are controlled directly from each agent&apos;s dashboard.
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
            title="Add another agent slot to the studio"
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

      {/* Clean Configuration Form */}
      <div className="p-6 space-y-6">
        
        {/* Dropdown: Pick from Available Agents */}
        <div className="p-5 rounded-2xl bg-zinc-950/80 border-2 border-emerald-500/50 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Select Agent for Slot #{selectedAgentIndex + 1} ({currentAgent.name})</span>
              </label>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Choose any agent from your workspace. When selected, this demo slot connects directly to that agent.
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
              ID: <strong className="text-emerald-300">{currentAgent.id}</strong>
            </span>
          </div>

          <div className="relative">
            <select
              value={allAgents.some((a) => a.id === currentAgent.id) ? currentAgent.id : ''}
              onChange={(e) => handleSelectRealAgent(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-emerald-500/60 rounded-xl text-xs text-white font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 cursor-pointer appearance-none"
            >
              <option value="" disabled>-- Select an Agent from your Workspace --</option>
              {allAgents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name?.replace(/^\[.*?\]\s*/, '')} — [Voice: {ag.voice_id || 'shreya'}, Status: {(ag.status || 'ACTIVE').toUpperCase()}]
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Bound Agent Info Card & Direct Dashboard Access */}
        <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {currentAgent.name?.slice(0, 2).toUpperCase() || 'AI'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{currentAgent.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active in Live Studio
                  </span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Voice: <strong className="text-zinc-200">{boundDbAgent?.voice_id || currentAgent.voice_id || 'shreya'}</strong> ({boundDbAgent?.voice_provider || 'Sarvam AI'}) • Language: <strong className="text-zinc-200">{boundDbAgent?.language || currentAgent.language || 'Hinglish'}</strong>
                </p>
              </div>
            </div>

            {/* Direct Link to Agent's Dashboard */}
            <Link
              href={`/dashboard/agents/${currentAgent.id}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              <span>Manage in Agent Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2 text-xs text-zinc-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              All prompt instructions, conversation behavior, objection handling, appointment calendar, and voice tuning are loaded in real time directly from this agent&apos;s dashboard.
            </span>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save &amp; Update Live Studio
          </button>
        </div>
      </div>
    </div>
  );
}
