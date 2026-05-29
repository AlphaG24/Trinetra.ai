export interface Agent {
  id: string
  agent_type: 'voice' | 'chat' | 'whatsapp'
  name: string
  status: 'active' | 'idle' | 'error' | 'setting_up'
  // other fields omitted for utility
}

export interface Subscription {
  plan_id: string
  // other fields
}

export function getCardsForUser(agents: Agent[], subscription?: Subscription): string[] {
  const hasVoice = agents.some(a => a.agent_type === 'voice')
  const hasChat = agents.some(a => a.agent_type === 'chat')
  const hasWhatsApp = agents.some(a => a.agent_type === 'whatsapp')
  
  const cards: string[] = []
  
  if (hasVoice) {
    cards.push('voice_calls', 'voice_minutes')
  }
  if (hasChat || hasWhatsApp) {
    cards.push('chat_conversations')
  }
  if (hasWhatsApp) {
    cards.push('whatsapp_messages')
  }
  
  // Always add these
  cards.push('appointments', 'leads', 'active_now', 'cost_saved')
  
  return cards
}

export function hasAgentType(agents: Agent[], type: 'voice' | 'chat' | 'whatsapp'): boolean {
  return agents.some(a => a.agent_type === type)
}
