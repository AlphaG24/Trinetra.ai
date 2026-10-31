export interface BlogPostItem {
  id: string
  title: string
  slug: string
  excerpt: string
  content?: string
  cover_image_url: string
  category: string
  tags: string[]
  author_name: string
  author_avatar_url: string
  read_time_minutes: number
  published_at: string
  created_at: string
  status: 'published' | 'draft'
}

export const FALLBACK_BLOG_POSTS: BlogPostItem[] = [
  {
    id: 'f001-blog-voice-ai-multilingual',
    title: 'Scaling Multilingual Voice AI Across Indian Dialects',
    slug: 'scaling-multilingual-voice-ai-india',
    excerpt: 'How Vaakriti achieves sub-480ms speech latency with real-time code-switching between 11 Indian regional dialects, conversational Hinglish, and English.',
    category: 'Architecture',
    tags: ['Voice AI', 'Multilingual', 'Speech Pipeline', 'Latency'],
    author_name: 'Vaakriti Engineering',
    author_avatar_url: '/logo-transparent.png',
    read_time_minutes: 5,
    published_at: '2026-10-25T10:00:00.000Z',
    created_at: '2026-10-25T10:00:00.000Z',
    status: 'published',
    cover_image_url: '/images/vaakriti_blog.jpg',
    content: `
# Scaling Multilingual Voice AI Across Indian Dialects

Building conversational voice systems for the Indian subcontinent presents a unique set of acoustic and linguistic challenges. With over 22 recognized official languages, hundreds of regional dialects, and ubiquitous code-switching between regional tongues and English (Hinglish, Tanglish, Kanglish), standard monolithic speech-to-text models fail rapidly in live production telephony.

## The Architecture of Fluid Turn-Taking

At Vaakriti, our voice pipeline eliminates the traditional cascading delays associated with transcription, language translation, LLM reasoning, and text-to-speech generation. 

By employing streaming audio chunking at 20ms frame sizes and speculative semantic decoding, our conversational engine begins formulating responses while the caller is completing their thought.

### Key Pillars of the System:
1. **Vernacular Phoneme Recognition**: Custom acoustic models trained specifically on colloquial Indian speech cadences, accents, and common telephony compression artifacts.
2. **Sub-480ms Round-Trip Response**: Turn-by-turn latency consistently below 480 milliseconds, creating a natural dialogue that eliminates awkward pauses.
3. **Adaptive Tone Switching**: Whether answering consultative inquiries or booking calendar appointments, our agents adapt their tone and phrasing to match customer intent dynamically.
    `.trim()
  },
  {
    id: 'f002-blog-sub-480ms-latency',
    title: 'Engineering Sub-480ms Turn-by-Turn Conversational Pipelines',
    slug: 'sub-480ms-telephony-pipeline',
    excerpt: 'An in-depth architectural breakdown of our zero-jitter audio streaming, speculative LLM decoding, and acoustic echo cancellation for real telephony.',
    category: 'Architecture',
    tags: ['Architecture', 'WebRTC', 'SIP', 'Performance'],
    author_name: 'Vaakriti Infrastructure',
    author_avatar_url: '/logo-transparent.png',
    read_time_minutes: 7,
    published_at: '2026-10-20T14:30:00.000Z',
    created_at: '2026-10-20T14:30:00.000Z',
    status: 'published',
    cover_image_url: '/images/vaakriti_arch.jpg',
    content: `
# Engineering Sub-480ms Turn-by-Turn Conversational Pipelines

In telephonic conversation, any delay exceeding 600 milliseconds triggers human conversational overlap: callers assume the line is dead or speak over the agent. Reaching sub-480ms latency over standard PSTN and SIP trunking requires stripping every microsecond of overhead.

## Zero-Jitter Streaming & WebSocket Optimization

Rather than waiting for the entire audio buffer to arrive before initiating inference:
- Audio packets are processed as continuous Opus/PCM streams.
- Deepgram and Sarvam low-latency speech pipelines run concurrent with speech activity detection (VAD).
- The moment voice termination is registered, the first token is already being emitted by the LLM.

The result is an effortless, human-grade conversational pace that feels immediate and authentic.
    `.trim()
  },
  {
    id: 'f003-blog-compliance-trai-dpdp',
    title: 'Sovereign Telephony: Full Regulatory Compliance with TRAI & DPDP Act',
    slug: 'sovereign-ai-voice-telephony-compliance',
    excerpt: 'Automated DND scrubbing, verified caller IDs, strict calling hour boundaries, and consent preservation in mission-critical outbound operations.',
    category: 'Guide',
    tags: ['Compliance', 'TRAI', 'DPDP Act', 'Security'],
    author_name: 'Compliance & Legal Engineering',
    author_avatar_url: '/logo-transparent.png',
    read_time_minutes: 6,
    published_at: '2026-10-18T09:15:00.000Z',
    created_at: '2026-10-18T09:15:00.000Z',
    status: 'published',
    cover_image_url: '/images/vaakriti_blog.jpg',
    content: `
# Sovereign Telephony: Full Regulatory Compliance with TRAI & DPDP Act

Automated voice calling must never compromise caller trust or violate statutory communication boundaries. In India, regulations established by TRAI under the Telecom Commercial Communications Customer Preference Regulations (TCCCPR 2018) and the Digital Personal Data Protection (DPDP) Act impose strict legal standards on outreach.

## Compliance by Design

Vaakriti embeds compliance directly into every outbound campaign:
- **Calling Hour Guardrails**: Automated calls are programmatically restricted to statutory calling hours (09:00 to 21:00 local recipient time).
- **Automated DND Registry Filtering**: National DND numbers are scrubbed before dialing runs.
- **AI Identity & Recording Notice**: Every outbound call begins with clear AI identity disclosure and quality recording notifications.
    `.trim()
  },
  {
    id: 'f004-blog-logistics-freight-automation',
    title: 'Automating Consultative Freight Logistics and Dispatch with Voice Agents',
    slug: 'autonomous-lead-qualification-freight-logistics',
    excerpt: 'How modern logistics and fleet operators use conversational voice agents to match truck loads, negotiate tender rates, and book appointments 24/7.',
    category: 'Product',
    tags: ['Logistics', 'Fleet Management', 'Automation', 'Case Study'],
    author_name: 'Vaakriti Product Team',
    author_avatar_url: '/logo-transparent.png',
    read_time_minutes: 4,
    published_at: '2026-10-15T12:00:00.000Z',
    created_at: '2026-10-15T12:00:00.000Z',
    status: 'published',
    cover_image_url: '/images/vaakriti_arch.jpg',
    content: `
# Automating Consultative Freight Logistics and Dispatch with Voice Agents

In India's highly fragmented freight transport and trucking industry, hundreds of calls are placed daily between brokers, fleet owners, and manufacturing tender holders to negotiate route pricing, confirm vehicle capacity, and secure return loads.

## 24/7 Voice Operations for Fleets

By deploying consultative AI voice agents, transport operators like Purvi Roadlines can:
- Instantly qualify available truck tonnage and trailer types.
- Confirm transport lane availability (e.g. Kanpur to Pan-India).
- Immediately deliver route rate cards to prospective shippers via WhatsApp upon verbal agreement.
- Seamlessly book return loads, maximizing vehicle utilization and profitability.
    `.trim()
  }
]

