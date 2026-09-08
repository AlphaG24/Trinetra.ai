### **Phase 0 — Stabilize the Voice Stack (Blocking Everything)**
> **Goal:** Make a real outbound call from a Campaign actually connect to the selected agent and speak naturally. Fix webcalls.

| # | Task | Status | Details |
|---|------|--------|---------|
| 0.1 | **Fix Twilio outbound → LiveKit agent** | ✅ COMPLETED | Twilio webhook streams call audio to LiveKit room and runs background VikramAgent. |
| 0.2 | **Fix webcall (WebRTC)** | ✅ COMPLETED | Fixed WebRTC Expressive TTS wrapper initialization and ensured usage quota decrements on disconnect. |
| 0.3 | **Verify call transcript storage** | ✅ COMPLETED | Transcript, duration, sentiment, and leads are extracted and saved on call completion, updating existing record to prevent duplicates. |
| 0.4 | **Error logging** | ✅ COMPLETED | Added rich logs in FastAPI, telephony, and agent execution. |

---

### **Phase 1 — Real Outbound Campaigns**
> **Goal:** User uploads CSV, starts campaign, agent dials numbers using Twilio (verified numbers for trial) and talks like the demo.

| # | Task | Status | Details |
|---|------|--------|---------|
| 1.1 | **Pass contact data to agent** | ✅ COMPLETED | Campaign service queries contact parameters and passes them via call query string webhooks. |
| 1.2 | **Rewrite sales/support prompts** | ✅ COMPLETED | VikramAgent includes Objection handling, feature explanations, custom trial CTA. |
| 1.3 | **Personalize every call** | ✅ COMPLETED | Prompt dynamically appends contact name, company name, notes context with safe empty fallbacks. |
| 1.4 | **Callback scheduling from campaign call** | ✅ COMPLETED | VikramAgent parses callback requests from transcript and inserts into callbacks table. |
| 1.5 | **Lead extraction** | ✅ COMPLETED | extract_and_save_lead parses transcript for intent, creates leads, and links to campaign. |
| 1.6 | **Real-time progress** | ✅ COMPLETED | Dialer updates contact statuses, increments leads_generated and called counters. |

---

### **Phase 2 — Number Pool, Bidding & Lifecycle Management**
> **Goal:** Admin lists pool numbers, users purchase or bid via Razorpay, numbers get assigned to agents, and renewal/release lifecycles are enforced.

| # | Task | Status | Details |
|---|------|--------|---------|
| 2.1 | **Number pool table & schema** | ✅ COMPLETED | `phone_numbers` table enhanced with `is_assigned`, `assigned_org_id`, `assigned_agent_id`, `retail_price_paisa`, `renewal_date`, and `bidding_enabled`. |
| 2.2 | **Admin pool management & provisioning** | ✅ COMPLETED | Admin can provision Twilio numbers, set retail prices, toggle bidding, and list them in the available pool. |
| 2.3 | **User purchase via Razorpay** | ✅ COMPLETED | Users purchase numbers from available pool via Razorpay checkout; ownership links to organization and sets 30-day `renewal_date`. |
| 2.4 | **Assignment to agent** | ✅ COMPLETED | Users can assign/unassign numbers to their voice agents directly from dashboard. |
| 2.5 | **Number Bidding / Auction system** | ✅ COMPLETED | Users can place bids on active numbers; if owner fails to renew, top bidder gets 24-hour priority purchase window. |
| 2.6 | **Bundled purchase flow** | ✅ COMPLETED | Agent + Number bundles handled via checkout and auto-provisioning. |
| 2.7 | **Manual 30-Day Renewal** | ✅ COMPLETED | Working via `/api/phone-numbers/[id]/renew` + Razorpay webhook extending `renewal_date` by +30 days. |
| 2.8 | **Universal Auto-Release on Non-Renewal** | ✅ COMPLETED | `/api/cron/process-auctions` handles both bidding auctions and universal auto-release of standard expired phone numbers back to the pool. |
| 2.9 | **Pre-Expiration Alerts & Dignity Quota Guarantee** | ✅ COMPLETED | Configurable `validity_days` in admin. Automatic 3-day and 24-hour alerts for phone numbers and voice agents via existing `notifications` table. Trinetra Dignity Quota Guarantee preserves active voice minutes even after timeline expiry. |
| 2.10 | **Domestic Telephony Architecture** | ✅ COMPLETED | Full Exotel carrier integration with dynamic DB credential management via Admin Portal (`/admin/telephony`), Indian virtual number pooling, assignment to agents, outbound calling & webhook routing. |
| 2.11 | **Database Audit & Dead Table Cleanup** | ✅ COMPLETED | Cleaned 13 legacy MSME/scheme tables (`schemes`, `msme_app_config`, `user_matches`, etc.) and structured lifecycle columns (`validity_days`, `subscription_expires_at`, `expiry_alerts_sent`). |


---

### **Phase 3 — Inbound Support Agent & Customer DB**
> **Goal:** Inbound calls to a user's number handled by their agent, with personalization and customer database updates.

| # | Task | Details |
|---|------|---------|
| 3.1 | **Inbound call → agent** | Twilio or Exotel webhook → LiveKit room → selected agent picks up. |
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

### **Phase 6 — The "Joe Girard Engine" (Top-of-Mind Lifecycle Nurturing & Referral Automation)**
> **Inspiration:** Joe Girard (Guinness World Record for World's Greatest Salesman — 13,000+ cars sold by staying top-of-mind with every lead through consistent occasion cards & relationship warmth).
> **Goal:** Transform Trinetra AI from a one-time dialer into an automated lifelong relationship & referral-generating machine for any business.

| # | Task | Status | Details |
|---|------|--------|---------|
| 6.1 | **Occasion & Festival Nurture Scheduler** | 📋 PLANNED | Scheduled engine that automatically sends personalized warm WhatsApp / SMS greetings (Diwali, New Year, Eid, Birthdays, Milestones) to *all* past leads (cold, closed, or open) with zero pitch. |
| 6.2 | **Zero-Pitch "Care Ping" Voice Call** | 📋 PLANNED | Low-friction 30-second AI check-in call scheduled 30/60 days after initial contact to keep the business top-of-mind (*"Sir, koi pitch nahi hai, bas ek quick check-in tha ki aapka kaam kaisa chal raha hai"*). |
| 6.3 | **Automated Referral Generator** | 📋 PLANNED | When lead sentiment is positive or after successful onboarding/appointment, agent naturally triggers referral request (*"Agar aapke circle me kisi ko automated voice agent ki need ho, toh unka contact zaroor share kijiyega"*). |
| 6.4 | **Reactivation Campaign Pipeline** | 📋 PLANNED | Automatic transition of "cold / not interested" leads into a 90-day re-engagement funnel with new offers or relevant value drops. |

---

### **Immediate Next Actions**
1. **Kick off Phase 3** — Inbound Support Agent & Customer DB (Inbound call handling, caller recognition, upserting customer profiles, and post-call notifications).
2. **Execute Database Migration in Supabase SQL Editor** — Run `database/migrations/20260908_db_cleanup_and_validity_lifecycle.sql` to permanently drop the empty legacy tables and add the check indexes.

