### **Phase 0 — Stabilize the Voice Stack (Blocking Everything)**
> **Goal:** Make a real outbound call from a Campaign actually connect to the selected agent and speak naturally. Fix webcalls.

| # | Task | Details |
|---|------|---------|
| 0.1 | **Fix Twilio outbound → LiveKit agent** | Currently calls play a default greeting and hang up. The Twilio webhook must start a LiveKit room and connect the agent. Check `backend/agent.py` `create_outbound_session` and TwiML generation. |
| 0.2 | **Fix webcall (WebRTC)** | Agent voice not coming, quota not decreasing. Likely LiveKit token or audio stream misconfigured. Also ensure `demo_minutes_used` increments only after a successful call. |
| 0.3 | **Verify call transcript storage** | After any call, transcript, duration, sentiment, lead extraction must be saved to `voice_calls`. |
| 0.4 | **Error logging** | Add clear logs in FastAPI for: outbound call initiated, TwiML served, LiveKit room joined, agent response, call end. |

---

### **Phase 1 — Real Outbound Campaigns**
> **Goal:** User uploads CSV, starts campaign, agent dials numbers using Twilio (verified numbers for trial) and talks like the demo.

| # | Task | Details |
|---|------|---------|
| 1.1 | **Pass contact data to agent** | In `campaign_service.py`, before dialing each contact, fetch `campaign_contacts` fields (name, phone, company, notes, reason) and inject them into the agent's system prompt / conversation context. |
| 1.2 | **Rewrite sales/support prompts** | Use your demo conversation as a gold standard. Add: personal greeting, 2‑minute ask, objection handling, feature explanation (callbacks, campaigns, dashboard, reports), trial offer, demo CTA, website mention, polite close. |
| 1.3 | **Personalize every call** | The agent must refer to `{name}`, `{company}`, `{reason}` naturally. Use context variables. |
| 1.4 | **Callback scheduling from campaign call** | If the prospect says "call later", the agent must schedule a callback in `callbacks` table and the system should dial back at that time (re-use outbound pipeline). |
| 1.5 | **Lead extraction** | Ensure after every connected call, `lead_extraction` runs and saves to `leads` + links to campaign. |
| 1.6 | **Real-time progress** | Update campaign counters (`contacts_called`, `connected`, `leads_generated`) as calls happen. |

---

### **Phase 2 — Number Pool & Assignment**
> **Goal:** Admin buys numbers (from your Twilio account, later bulk), lists them in `/dashboard/phone-numbers` for users to purchase, and numbers get assigned to agents.

| # | Task | Details |
|---|------|---------|
| 2.1 | **Number pool table** | Use existing `phone_numbers` table. Add `is_assigned` boolean + `assigned_org_id` / `assigned_agent_id`. |
| 2.2 | **Admin purchase flow** | Admin can buy numbers via Twilio (using your account) and add them to the pool with a retail price. |
| 2.3 | **User purchase** | User selects an available number from pool → payment via Razorpay → number marked `assigned=true`, linked to their org. |
| 2.4 | **Assignment to agent** | After purchase, user can assign number to any of their agents (already built UI). |
| 2.5 | **Auto-release on non-renewal** | After 30 days, if not renewed, mark `assigned=false` so number returns to pool. |
| 2.6 | **Bundled purchase** | Bundle (agents+numbers) already implemented; ensure it auto-assigns numbers and agents. |

---

### **Phase 3 — Inbound Support Agent & Customer DB**
> **Goal:** Inbound calls to a user's number handled by their agent, with personalization and customer database updates.

| # | Task | Details |
|---|------|---------|
| 3.1 | **Inbound call → agent** | Twilio webhook (or VoiceLink later) → LiveKit room → selected agent picks up. |
| 3.2 | **Caller recognition** | On inbound, look up `customer_contacts` by phone number. If found, greet by name and reference previous query. |
| 3.3 | **Update customer DB** | During call, if new customer, collect name, query, email. After call, upsert into `customer_contacts`. |
| 3.4 | **Post-call notification** | After call, send Telegram/WhatsApp (via integration executor) to the business owner with query summary, response, and action items. Also send a message to the customer confirming receipt. |
| 3.5 | **Support vs Sales** | If agent has multi-personality enabled, use intent classifier to switch between sales/support based on caller. |

---

### **Phase 4 — Notifications & Reports**
> **Goal:** Instant lead/campaign reports via Telegram/WhatsApp + dashboard real-time updates.

| # | Task | Details |
|---|------|---------|
| 4.1 | **Campaign report** | When campaign ends (or after each call), generate report with: calls made, connected, leads, interested customers, conversion rate. Send to Telegram if connected. |
| 4.2 | **Welcome message to interested client** | If prospect expresses interest, send them a welcome/next-step message (SMS/WhatsApp) via integration. |
| 4.3 | **Lead alert** | On new lead, send immediate Telegram/WhatsApp alert with lead details. Already partially built; verify it works with real calls. |
| 4.4 | **Dashboard real-time** | Use Supabase Realtime to update KPIs, charts, and activity feed instantly. Verify all pages refetch on new data. |

---

### **Phase 5 — Developer/Marketing Account (Later)**
> **Goal:** A second "developer" account with extra permissions to manage marketing/demo calls, forms, and numbers.

| # | Task | Details |
|---|------|---------|
| 5.1 | **Role-based permissions** | Extend `profiles.role` to include a custom role (e.g., `marketing_admin`) with access to marketing tools, demo campaigns, and pool management. |
| 5.2 | **Homepage "Talk to Anika" form** | Already added; connect it to the outbound pipeline. When user submits name/phone/language, instantly trigger a Twilio outbound call using the marketing number and the marketing agent. |
| 5.3 | **Marketing dashboard** | For that account, show lead generation stats from the homepage form and demo calls. |

---

### **Immediate Next Actions**
1. **Fix Phase 0** — get outbound calls to actually speak with the selected agent. This is the #1 blocker.
2. **Rewrite sales prompt** with your demo conversation as the template.
3. **Implement contact context injection** in campaign service.
4. **Test full campaign** with your own verified phone number.
5. **Then** move to number pool and billing.