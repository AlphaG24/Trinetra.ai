## COMPLETE REMAINING WORK — CLIENT DASHBOARD

### CATEGORY 1: VOICE AGENT FIXES

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1.1 | ✅ Voice preview only shows 2-3 voices | Hardcoded voice list in AgentVoiceTab | Fetch full voice list from Sarvam API (10+ male/female speakers) and ElevenLabs API (all available voices) |
| 1.2 | ✅ Voice preview audio doesn't play | CSP blocking `media-src` and TTS endpoint returning wrong format | Fix CSP to allow audio sources. Fix `/api/voice/tts-test` to return playable audio |
| 1.3 | ✅ Speaking Speed & Pitch Shift — do they work? | Unknown | Verify they save to `agents` table and are passed to TTS on calls |
| 1.4 | ✅ Greeting delay — 6 seconds before agent speaks | AEC warmup blocking + Groq cold start | Set `aec_warmup_duration=0`, greet immediately on connect |
| 1.5 | ✅ Voice preview 500/422 error | TTS API request lacked text, and errors were unhandled | Added fallback text to preview request, forwarded backend JSON errors to frontend |

---

### CATEGORY 2: KNOWLEDGE BASE

| # | Issue | Fix |
|---|-------|-----|
| 2.1 | ✅ Documents stuck on "Parsing" | The PDF/DOCX parsing in `knowledge_router.py` is failing silently. Fix the parsing pipeline. Show clear status: Parsing → Extracting → Complete or Failed with reason |
| 2.2 | ✅ AI responses ignore uploaded documents | Knowledge base content not injected into LLM prompt. After parsing, store `content_excerpt` in DB, then append to system prompt when agent loads |
| 2.3 | ✅ Error messages unhelpful | Show: "Document uploaded. Extraction in progress..." → "Ready" or "Failed: Unsupported format. Use PDF/DOCX/TXT" |

---

### CATEGORY 3: BEHAVIOR TAB

| # | Issue | Fix |
|---|-------|-----|
| 3.1 | ✅ Prompt editor expects user to write prompts | Add an "Enhance" button: user writes basic description → Groq/Gemini expands it into a professional agent prompt. Example: "Be friendly and ask about budget" → full sales prompt |
| 3.2 | ✅ Temperature & Max Tokens sliders confuse users | Remove from user-facing dashboard. These will be set automatically based on agent template. Keep in admin panel only |
| 3.3 | ✅ Messaging Fallbacks — keep as-is | Add one more field: "Call ending message" (what agent says before hanging up). Default: "Dhanyavad ji, aapse baat karke accha laga. Goodbye!" |
| 3.4 | ✅ Fallback & Greeting Message TTS Enhancement | Removed individual enhance buttons. Messages are now bulk auto-enhanced for Sarvam TTS seamlessly on save via `/api/agents/enhance-messages`. |
| 3.5 | ✅ Enhance Prompt destroys personality | Updated `/api/agents/enhance-prompt` to append instructions to the existing prompt rather than regenerating it from scratch. Updated frontend to use `window.prompt` to gather user changes. |

---

### CATEGORY 4: CALL HISTORY

| # | Issue | Fix |
|---|-------|-----|
| 4.1 | ✅ `voice_calls.organization_id does not exist` | The API is querying a column that doesn't exist. Run: `ALTER TABLE voice_calls ADD COLUMN IF NOT EXISTS organization_id UUID;` then fix the query to use `user_id` as fallback |
| 4.2 | ✅ Call history shows empty | After fixing the column, verify the API returns real data from `voice_calls` table |

---

### CATEGORY 5: LEADS PAGE (COMPLETE)

| # | Issue | Fix |
|---|-------|-----|
| 5.1 | ✅ Leads data format | Ensure correct columns are present: `interest_level`, `budget_range`, `timeline`, `call_summary`, `extracted_data (JSONB)` |
| 5.2 | ✅ Lead extraction | At end of call, pass transcript to Groq. Return JSON with `is_lead`, `contact_name`, `interest_level`, etc. Save to `leads` table if `is_lead: true` |
| 5.3 | ✅ Leads Kanban doesn't show real data | Update `LeadsPageClient` to render extracted data correctly, show `interest_level` badge, and use actual DB fields |
| 5.4 | ✅ Save call transcript | After call ends, save transcript, duration, sentiment (via Groq), and status to `voice_calls` table |

---

### CATEGORY 6: ANALYTICS PAGE

| # | Issue | Fix |
|---|-------|-----|
| 6.1 | ✅ Placeholder/mock data showing | The analytics API is returning hardcoded data. Fix `/api/dashboard/analytics` to query real `voice_calls` and `leads` tables |
| 6.2 | ✅ Charts show 0 values | Ensure the queries are scoped to user's `organization_id` or `user_id` |

---

### CATEGORY 7: INTEGRATIONS PAGE

| # | Issue | Fix |
|---|-------|-----|
| 7.1 | Only fixed tools available | Make integration list dynamic — admin can add/remove available integration types from `system_config` or a new `available_integrations` table |
| 7.2 | Complex setup process | For each integration, add a "Quick Connect" wizard with step-by-step instructions specific to that tool. Example for Telegram: Step 1: Go to @BotFather → Step 2: Type /newbot → Step 3: Copy token here. Include screenshots or GIFs |
| 7.3 | User must manually generate tokens | Can't fully automate (they need their own accounts), but provide direct links to create tokens (e.g., "Create Telegram Bot" links to t.me/BotFather, "Get Twilio Credentials" links to Twilio console) |

---

### CATEGORY 8: AGENT DASHBOARD DATA

| # | Issue | Fix |
|---|-------|-----|
| 8.1 | ✅ Overview tab shows all zeros | KPI API (`/api/agents/[id]/stats`) not returning real data. Fix the queries |
| 8.2 | ✅ Call history broken | Same as Category 4 |
| 8.3 | ✅ Analytics broken | Same as Category 6 |

---

### CATEGORY 9: OUTBOUND CALLING & PHONE NUMBERS

| # | Issue | Fix |
|---|-------|-----|
| 9.1 | No outbound call scheduling | Build Campaign tab or section: upload CSV of numbers, set schedule (date/time), select agent, start campaign. Backend: BullMQ queue that dials numbers during scheduled hours |
| 9.2 | No phone number purchase flow | Integrate Exotel/Twilio for number provisioning. When user upgrades to paid plan, auto-provision or show "Buy Number" button. If user wants to use own number: show call forwarding instructions |
| 9.3 | Callback scheduling | When prospect says "call me later", agent extracts time, saves to `appointments` table, sends notification to user. System calls back at scheduled time |
| 9.4 | Integration instructions needed | Every integration page needs simplified step-by-step instructions. User should never wonder "how do I get this API key?" |

---

## ✅ CATEGORY 10: COMPLETE — MULTI-AGENT TEMPLATE SYSTEM

| # | Issue | Status | Fix |
|---|-------|--------|-----|
| 10.1 | Only sales agent exists | ✅ DONE | Created 4 new professional templates: `support_agent.txt`, `appointment_agent.txt`, `lead_qualifier.txt`, `multi_agent.txt` in `backend/prompts/` |
| 10.2 | Multi-personality agent | ✅ DONE | `multi_agent.txt` — single agent with intent detection from first 10-15 words; dynamically switches between Sales/Support/Appointments/Lead Qualifier personalities |
| 10.3 | Personality Mode Selector | ✅ DONE (Prompt Level) | Intent detection baked into `multi_agent.txt` prompt — detects "I want pricing" → Sales, "problem ho rahi hai" → Support, "appointment chahiye" → Booking, "enquiry ki thi" → Lead Qualifier |
| 10.4 | Template auto-load on creation | ✅ DONE | `frontend/src/app/api/agents/create/route.ts` updated: reads correct `.txt` file from `backend/prompts/` based on `agent_type` slug; substitutes `{{agent_name}}` and `{{company_name}}` |
| 10.5 | Marketplace agent types | ✅ DONE | `database/migrations/20260729_multi_agent_templates.sql` — 5 new `platform_services` rows: `sales_agent`, `support_agent`, `appointment_agent`, `lead_qualifier`, `multi_agent` |
| 10.6 | Auto-detect logic | ✅ DONE | Full trigger word lists for all 4 intents baked into `multi_agent.txt` with mid-call switching support |

### Prompt Files Created:
- `backend/prompts/sales_agent.txt` — Hinglish sales with full objection handling + closing techniques
- `backend/prompts/support_agent.txt` — Empathetic support with de-escalation + escalation protocols
- `backend/prompts/appointment_agent.txt` — Precise booking with confirmation read-back + rescheduling/cancellation
- `backend/prompts/lead_qualifier.txt` — BANT qualification with Hot/Warm/Cold scoring + hot lead routing
- `backend/prompts/multi_agent.txt` — Intent-aware multi-personality agent (all 4 in one)

### Critical Language Rules Applied to ALL Templates:
1. ✅ NEVER uses bookish Hindi — always natural Hinglish
2. ✅ Real Indian conversation style: "Dekhiye", "Actually", "Haan ji", "Theek hai"
3. ✅ Emotional expression: warmth, empathy, acknowledgment
4. ✅ Responses: 2-3 sentences max
5. ✅ Language matching: adapts to caller's English/Hindi/Hinglish

### Sub-Fixes (Session 2):
| # | Fix | Files Changed |
|---|-----|--------------|
| 10.A | Template resolution now reads `marketplace_metadata.template_file` from DB first (most authoritative), then falls back to slug map, then blueprint | `route.ts` |
| 10.B | Legacy slug `anika-voice` → `sales_agent.txt`; all file name keys (`sales_agent.txt`) also accepted as direct passthrough | `route.ts` |
| 10.C | Voice defaults now use Sarvam per agent type: Sales/Lead/Multi → `shubh`; Support/Appointment → `anushka`. Replaced old OpenAI `shimmer-openai` fallback | `route.ts` |
| 10.D | Greeting functions per agent type now use arrow-function generators (name + company), replacing hardcoded template-literal map | `route.ts` |
| 10.E | `ToolDetailClient` now renders **Use Cases section** (was missing from page layout) | `ToolDetailClient.tsx` |
| 10.F | `FeaturesSection` and `UseCasesSection` now detect plain-string arrays and render as clean checklists instead of showing "Optimized automation pipeline." filler text | `ToolDetailSections.tsx` |

### Sub-Fixes (Session 3):
| # | Fix | Files Changed |
|---|-----|--------------|
| 10.G | ✅ Bypassed database RLS on configurations by using Service Role client in `/api/public/config`. Correctly resolves free demo minutes limit to 10 min for free tier users instead of showing 100 min. | `/api/public/config/route.ts` |
| 10.H | ✅ Agent name creation fallback to `platformService.name` instead of slug, and greeting formatting to use clean agent name (stripping `- Demo` and `[slug]`). | `/api/agents/create/route.ts` |
| 10.I | ✅ Updated female voice lists to include `ritu`, and added speaker validation check for `bulbul:v3` to fall back to `anushka` / `shubh`. | `agent.py` |
| 10.J | ✅ Automatically extract and parse default greetings from system prompt templates in the python worker (`entrypoint` and `run_agent` methods) to format greetings correctly with agent/company names. | `agent.py` |

---

### CATEGORY 11: BILLING & RAZORPAY (COMPLETE)

| # | Issue | Fix |
|---|-------|-----|
| 11.1 | ? Different pricing per tool | Each `platform_service` has its own pricing in `marketplace_metadata`. Billing page shows pricing for the specific tool being purchased |
| 11.2 | ? Razorpay integration | Integrate Razorpay checkout: create order → open checkout → handle webhook → activate subscription. Keys already in `system_config` |
| 11.3 | ? Payment history for user | Show last 7 days of transactions. "Download" button for each. Warning: "Transaction history auto-deletes after 7 days. Download for your records." |
| 11.4 | ? Payment records for admin | Store all transactions permanently in `invoices` table. Admin can view all, download, delete manually after 8 years. Never auto-delete for admin |
| 11.5 | ? Monthly limit enforcement | Track `usage_tracking.voice_minutes_used`. When approaching limit (80%), send warning. At 100%, pause agent and notify user to upgrade |
| 11.6 | ? Post-purchase notification | On successful payment: email/SMS/Telegram notification. "Your agent is being provisioned. This takes ~60 seconds." If delay: "Your phone number is being provisioned. This may take up to 5 minutes due to carrier verification." |
| 11.7 | ? Real-time dashboard update | When payment confirmed: admin sees new subscriber, user sees dashboard unlock instantly |

---

### CATEGORY 12: LIVE TRANSCRIPT & TEST CALL

| # | Issue | Fix |
|---|-------|-----|
| 12.1 | ✅ Real-time transcript not working in test call modal | The transcript component isn't receiving data from LiveKit. Fix: subscribe to transcript events from the LiveKit room and display in real-time |
| 12.2 | Human replica quality | Already mostly there with Sarvam Bulbul v3. For behavior: the prompt handles objections, interruptions, rapport. For voice: Sarvam provides 10+ natural voices. The multi-agent template approach will cover different behaviors |
| 12.3 | ✅ Voice Connection Speed (Connection Delay Reduced) | Resolved cold start and connection latency (~10s -> ~2s): Preloaded Silero VAD globally at startup, wrapped blocking DB calls in `asyncio.to_thread` for concurrent execution, removed sleeps, enabled `num_idle_processes=1` to pre-warm agent workers, and added UI Connecting spinner. |
| 12.4 | ✅ Analytics & Lead Syncing on Call Disconnect | Fixed unmount and process termination timing: Modified frontend component cleanup to ensure minutes are synced on unmount, and synchronously awaited `extract_and_save_lead` inside the worker's `finally` block before exiting to guarantee data persistence. |

---

### CATEGORY 13: DEFAULT SETTINGS STRATEGY

| Principle |
|----------|
| Every agent template comes with BEST default settings pre-configured |
| User only changes what they want to customize |
| If user never touches a setting, it works perfectly with defaults |
| Voice: Shubh (male) or Anushka (female) depending on template |
| Prompt: Professionally written per agent type |
| Knowledge base: Optional enhancement, not required |
| Integrations: Optional, agent works without them |

---

## CATEGORY 14: VOICE & LANGUAGE FIXES

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 14.1 | ✅ ElevenLabs voices returning 402 "paid_plan_required" | Free ElevenLabs accounts can only use pre-made voices (Rachel, Adam, Antoni, etc.), not library or cloned voices via API | Filter voice list to only show free-tier voices. Handle 402 errors gracefully in preview — show "This voice requires a paid ElevenLabs plan" instead of crashing |
| 14.2 | ✅ No language selector in Voice tab or agent settings | Language selection was never built into the UI | Add language dropdown to Agent Voice tab: Hinglish, Hindi, English (India), English (US), English (UK). Default based on `profiles.country` |
| 14.3 | ✅ Country/region not wired to agent behavior | `profiles.country` exists but isn't used for STT/TTS routing | When country=IN → default Hinglish + Sarvam. When country=US/UK → default English + ElevenLabs. Agent worker reads country from profile and routes accordingly |
| 14.4 | ✅ Male voice says "Main apki assistant baat kar rahi hu" (feminine) | Greeting is hardcoded with feminine grammar | Make greeting gender-aware. Detect speaker gender from voice_id (Sarvam: shubh/arvind=male → "raha hoon", anushka/aditi=female → "rahi hoon". ElevenLabs: use voice labels) |
| 14.5 | ✅ Voice preview errors not handled gracefully | 402/401 errors crash the preview instead of showing a helpful message | Catch errors per voice. Show inline message: "Preview unavailable for this voice" with tooltip explaining why (e.g., "Requires ElevenLabs paid plan") |

--

### CATEGORY 14: DASHBOARD OPTIMIZATION

| # | Issue | Fix |
|---|-------|-----|
| 14.1 | ✅ Dashboard loading too slow | Consolidated API calls into `/api/dashboard/overview`, implemented SWR caching, created `loading.tsx` skeleton, and added DB indexes for performance |

---

### CATEGORY 15: VAPI REMOVAL

| # | Issue | Fix |
|---|-------|-----|
| 15.1 | ✅ Remove Vapi entirely | Uninstalled package, removed webhooks/logic, cleaned frontend UI references, scrubbed environment config, and provided SQL cleanup script |
| 15.2 | ✅ Remove Vapi from Marketplace & Restore Demo Button | Replaced Vapi agent provisioning in marketplace tool detail with direct DB flow, and restored View Demo Tools button on dashboard page |

---

### CATEGORY 11: BILLING & RAZORPAY (COMPLETE) INTEGRATION (COMPLETE)

| # | Issue | Fix |
|---|-------|-----|
| 11.1 | Demo quota logic | Updated AgentOverviewTab and AgentDetailPageClient to use tier-based dynamic quota limits from system_config |
| 11.2 | Billing UI Dynamic Pricing | Updated BillingPageClient to fetch prices (trial, starter, professional) directly from system_config without hardcoding |
| 11.3 | Razorpay Checkout | Built /api/billing/create-checkout/route.ts to create Razorpay orders for subscriptions |
| 11.4 | Razorpay Verification | Built /api/billing/verify-payment/route.ts to verify signatures with crypto, update profiles, and insert into invoices |
| 11.5 | Payment History | Added Payment History data table to the billing page fetching from invoices |
