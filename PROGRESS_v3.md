# Implementation Plan - Trinetra AI MVP Final Polish

This document details the technical strategy, file modifications, and database schema updates required to implement the MVP Final Polish.

---

## User Review Required

> [!WARNING]
> **Database Schema Updates**: We will execute a database migration that adds the columns `consented` and `business_description` to `profiles`, and creates a new table `global_integrations` for tenant-wide API keys.
> 
> **GDPR Deletion Policy**: The "Delete Account" option will permanently delete the user's auth record via the Supabase Admin client, which will cascade-delete all of their organization info, subscriptions, configurations, and agent logs. This is irreversible.

---

## Open Questions

1. **2FA Implementation**: For the 2FA support toggle in Settings -> Security, should we implement a real QR Code and verification flow, or is a mock modal showing a QR code setup with simulated verification sufficient for the MVP?
2. **Invoice PDF Download**: Currently, the billing page has a mock text-based invoice builder for download. Should we integrate a formal PDF generation service, or is the text/raw invoice file download adequate?

---

## Proposed Changes

### Component 1: Routing & Gates (Part 2)

#### [MODIFY] [middleware.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/middleware.ts)
- Add a single-query fetch of `consented` status along with the user role and `onboarding_complete` status.
- Add redirect gates:
  - If `role === 'client'` and `!consented` and path is not `/consent` (and not static assets or consent APIs), redirect to `/consent`.
  - If already consented and trying to visit `/consent`, redirect to `/dashboard/onboarding` or `/dashboard`.

#### [MODIFY] [ConsentPage (page.tsx)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/%28auth%29/consent/page.tsx)
- Redesign page header to: **Data Privacy & Consent**.
- Change checkbox structure to render 3 mandatory checkboxes:
  1. Consent to Terms of Service and Privacy Policy
  2. Consent to Call Recording and analysis for services
  3. Confirmation of End-to-End Encryption & Secure storage
- Require all 3 to be checked to enable the submission button.

#### [MODIFY] [api/consent/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/consent/route.ts)
- After inserting into `consent_records`, update the user's profile to set `consented = true` and `onboarding_complete = false` (forces onboarding step next).

---

### Component 2: Onboarding & Personalization (Part 2 & 3)

#### [MODIFY] [OnboardingClient.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/onboarding/OnboardingClient.tsx)
- Add state variable `businessDescription` and pre-fill from profile data.
- Modify Step 1 form to include a textarea for **Business Description**.
- Send `business_description` in the PATCH payload to `/api/profiles`.
- Redirect users to `/dashboard/marketplace` instead of `/dashboard` upon completing onboarding.

#### [MODIFY] [api/profiles/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/profiles/route.ts)
- In the `GET` handler, select and return `business_description`, `consented`, and `two_factor_enabled`.
- In the `PATCH` handler, accept `business_description` and `two_factor_enabled` and update the database profile row.

#### [MODIFY] [api/agents/create/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/agents/create/route.ts)
- Retrieve the user profile's `business_description` and `business_type` (industry).
- Interpolate variables `{{business_description}}` and `{{industry}}` in prompt templates.
- Automatically append a `## BUSINESS CONTEXT` markdown section to the end of the `system_prompt` so all created agents carry the tenant's business description.
- Pre-fill greeting templates correctly.
- Update the deduplication demo error response to: `"You've already tried this demo. Please upgrade to continue."`

---

### Component 3: Sidebar & Modals Cleanup (Part 1)

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/dashboard/Sidebar.tsx)
- Remove `Callbacks` and `Integrations` from `topLinks`.
- Remove `channelLinks` and the `Channels` group rendering block entirely to hide Voice Calls/Chat/WhatsApp.
- Ensure `Phone Numbers` remains visible in the primary navigation list.

#### [MODIFY] [QuickActions.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/dashboard/QuickActions.tsx)
- Remove the standalone "Create Agent" quick action button.
- Replace it with a "Manage Phone Numbers" link pointing to `/dashboard/phone-numbers`.

#### [MODIFY] [agents/page.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/dashboard/agents/page.tsx)
- Remove the "Create First Agent" button opening the setup modal.
- Replace it with a "Browse Marketplace to Create Agent" button that sets the active tab to the Marketplace.

---

### Component 4: Agent Settings & Reset (Part 1, 3, 5)

#### [MODIFY] [AgentNumbersTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentNumbersTab.tsx)
- Remove the "Set as Primary" and "Unassign" action buttons to make the numbers list read-only.
- Add a "Manage All Numbers" link/button directing users to `/dashboard/phone-numbers`.

#### [NEW] [AgentSettingsTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentSettingsTab.tsx)
- A new tab component under the agent workspace that contains admin settings:
  - **Reset Entire Agent**: Triggers a POST to `/api/agents/[id]/reset` with `reset_type: 'all'`.
  - **Delete Agent**: Destructive confirmation dialog calling `/api/agents/[id]` DELETE.

#### [MODIFY] [AgentDetailPageClient.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/dashboard/agents/%5Bslug%5D/AgentDetailPageClient.tsx)
- Add a `settings` tab to the tab list (using the Lucide `Settings` icon).
- Remove the legacy delete button from the top header and delegate it to the new Settings tab.
- Update `isExpired` to evaluate if the free demo agent creation date is > 5 days old:
  ```typescript
  const isDemoAgeExpired = tier === 'free_demo' && agentCreatedAt && (Date.now() - agentCreatedAt.getTime() > 5 * 24 * 60 * 60 * 1000)
  const isExpired = tier === 'free_demo' && (remainingMinutes <= 0 || isDemoAgeExpired)
  ```

#### [MODIFY] [AgentBehaviorTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentBehaviorTab.tsx)
- Update button label to "Reset to Default" (instead of "Reset Behavior").
- Strip "Reset Entire Agent" actions (since they now reside in the Settings tab).

#### [MODIFY] [backend/voice_router.py](file:///c:/Users/Ketan%252520singh/trinetra-workspace/trinetra-fresh/backend/voice_router.py)
- Inside `generate_livekit_token`:
  - Fetch agent detail if `req.agent_id` is supplied.
  - If the agent is a demo agent, calculate its age. Reject with a `403` status if `age > 5 days` or if `demo_minutes_used >= demo_minutes_limit`.

---

### Component 5: Integrations Restructuring (Part 4)

#### [NEW] [api/integrations/global/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/integrations/global/route.ts)
- Expose `GET` and `POST` handlers in Next.js to load and save global credentials to/from the `global_integrations` table.

#### [MODIFY] [IntegrationsTab.tsx (Settings Page)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/settings/IntegrationsTab.tsx)
- Fetch the global credentials from `/api/integrations/global` on mount.
- On saving or testing connection, write the configuration values to the `global_integrations` table.
- Redesign each integration accordion to include a beautiful layman-friendly **Step-by-Step setup guide** (with details on BotFather, API keys, etc.).

#### [MODIFY] [AgentIntegrationsTab.tsx (Agent Workspace)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentIntegrationsTab.tsx)
- Fetch both global configurations and active agent integrations.
- Render available integrations:
  - If the global key for that integration is NOT set in Settings: display a "Configure in Settings" button.
  - If the global key IS set: render a Toggle switch to connect/disconnect the agent.
  - When toggling ON: invoke `/api/integrations/connect`, passing the copied configuration from the global credentials table.
  - When toggling OFF: invoke `/api/integrations/[id]/disconnect` to safely disconnect.

---

### Component 6: Admin Panel & Maintenance (Part 5)

#### [MODIFY] [SystemConfigPage (page.tsx)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/%28admin%29/admin/system/page.tsx)
- Add state variable and toggler for `maintenance_mode`.
- Add a new "Global System Controls" card to activate/deactivate maintenance mode.

#### [MODIFY] [DashboardLayout (layout.tsx)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/dashboard/layout.tsx)
- Query `system_config` table for `maintenance_mode`.
- If `maintenance_mode === 'true'` and the current user is NOT an admin/super_admin: render a premium full-screen "System Under Maintenance" page to block access.

#### [MODIFY] [TenantDetailPage (page.tsx)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/%28admin%29/admin/tenants/%5Bid%5D/page.tsx)
- Display the client's `business_description` (under Organization Information if available).

---

### Component 7: GDPR Compliance & Danger Zone (Part 6)

#### [NEW] [api/profiles/export-data/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/profiles/export-data/route.ts)
- Query all tables containing user information: `profiles`, `agents`, `subscriptions`, `invoices`, `voice_calls`.
- Email the compiled JSON payload to the user (via Resend) and return it to the client as a `.json` file attachment.

#### [NEW] [api/profiles/delete-account/route.ts](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/api/profiles/delete-account/route.ts)
- Authenticate the user session.
- Initialize the Supabase Admin client and invoke `auth.admin.deleteUser(user.id)`.
- Wipe RLS-bypassed references and ensure compliance with GDPR deletion regulations.

#### [MODIFY] [SecurityTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/settings/SecurityTab.tsx)
- Bind the Two-Factor Authentication toggle to save to `profiles.two_factor_enabled`.
- Add a new **Danger Zone & Data Protection** section:
  - Button for "Download My Data" (calls `/api/profiles/export-data`).
  - Button for "Permanently Delete Account" with a confirmation dialog (calls `/api/profiles/delete-account`).

---

## Additions & Extensions

### Addition 1: Invoice Template Fixes ✅

#### [MODIFY] Invoice HTML Template
- **Signature alignment**: Proper alignment of the signature image in the signoff section using explicit table layout structures and CSS styling.
- **Spacing consistency**: Fix vertical/horizontal misalignment between sections. Ensure uniform padding/margins throughout.
- **Table expansion**: Make sure the items table expands correctly dynamically when multiple products are purchased (tested with 1, 3, and 6 line items).
- **Fonts**: Use brand typography: Playfair Display (headings), Montserrat (subheadings), Merriweather (body).
- **Color Palette**: Light theme colors: Background (`#F0F2F5`), Card (`#FFFFFF`), Headings (`#1F2937`), Body (`#4B5563`), Muted (`#6B7280`), Violet Accent (`#8B5CF6`), Gold Highlight (`#F59E0B`).

---

### Addition 2: Bundled Purchasing System ✅

#### [NEW] Database Migration
- Create `product_bundles` table: `id` (UUID), `name`, `description`, `products` (JSONB array), `individual_price_paisa`, `bundle_price_paisa`, `discount_percent`, `is_active`, `created_at`.
- Enable RLS: Public read for authenticated users, admin write.
- Seed `system_config` with bulk discounts:
  - `bulk_discount_2_agents_percent`: 10
  - `bulk_discount_3_agents_percent`: 15
  - `bulk_discount_2_numbers_percent`: 5
  - `bulk_discount_3plus_numbers_percent`: 10

#### [NEW] Admin Bundles Page (`/admin/bundles`)
- Create route `/admin/bundles/page.tsx` to allow super admins to create, edit, activate/deactivate bundles, set custom prices, and view performance metrics (purchase count).

#### [MODIFY] Checkout/Billing Page
- Allow selecting multiple items in a single cart: agents, phone numbers (with quantity selectors), and bundles.
- Render dynamic Cart Summary showing all individual items and prices.
- Apply bundle discounts and quantity discounts automatically.
- Provide a checkbox: "Use same business profile for all agents?"
  - If checked, all agents share the same profile context.
  - If unchecked, redirect to configure each agent individually.
- Generate a single aggregated invoice record for the transaction.

---

### Addition 3: Email Templates ✅

#### [NEW] Email Files (`frontend/src/emails/`)
- All templates use inline CSS and compatible table-based layouts for email client compatibility:
  - `welcome.html`: Welcome message + "Go to Dashboard" CTA button.
  - `reset-password.html`: Reset link button + 1 hour expiry notice.
  - `invoice.html`: Dynamic payment summary.
  - `usage-warning.html`: 80% usage alert + upgrade CTA.
  - `agent-paused.html`: 100% agent pause alert + upgrade CTA.
  - `data-export.html`: Export request confirmation with data attachment.

#### [MODIFY] Backend Email Triggers
- Wire triggers to automatically send emails via Supabase mail templates or Resend:
  - Signup -> `welcome.html`
  - Password Reset Request -> `reset-password.html`
  - Payment Verification -> `invoice.html`
  - 80% Usage Check -> `usage-warning.html`
  - 100% Limit Exhaustion -> `agent-paused.html`
  - Data Export Request -> `data-export.html`

---

### Addition 4: Invoice Storage & Management ✅

#### [MODIFY] Post-Payment Flow
- Convert invoice HTML template to PDF on backend.
- Upload PDF to a new Supabase Storage bucket `invoices`.
- Save the storage URL to the invoice database record.
- Attach the invoice PDF to the confirmation email.

#### [MODIFY] Transaction History Page
- Show the last 3 invoices.
- Display notice: "Invoices older than 3 months are automatically removed. Please download for your records."
- Super admins see all invoices permanently under `/admin` routes.

---

### Addition 5: Demo Expiry Overlay ✅

#### [MODIFY] [AgentDetailPageClient.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/dashboard/agents/%5Bslug%5D/AgentDetailPageClient.tsx)
- When a free demo agent is expired (reaches 5 days age OR 10 minutes usage limit), display a full-page overlay on the agent dashboard.
- Display Title: "Your Free Demo Has Ended".
- Display Message: "Upgrade to continue using this agent with full features and unlimited access."
- Button: "View Plans" -> redirects to billing.
- Do NOT delete the agent.

---

### Addition 6: 2FA Decision ✅

#### [MODIFY] [SecurityTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/settings/SecurityTab.tsx)
- Keep 2FA section showing an amber pill badge "Coming Soon".
- Description: "Add an extra layer of security to your account. This feature will be available soon."
- Disable the toggle switch with reduced opacity, removing any placeholders.

---

### Addition 7: Agent Description Page Polish ✅

#### [MODIFY] [ToolDetailClient.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/marketplace/ToolDetailClient.tsx)
- Redesign the Marketplace detail workspace layout using a n8n-style two-column template:
  - **Left Column**: Overview/details, bulleted features list, ideal use cases, documentation links, and FAQ list.
  - **Right Column (Sticky Sidebar)**: Branded Image/video preview card (falls back to a beautiful placeholder frame if no media is uploaded), and checkout action buttons.
  - **Bottom Section**: Pricing plans comparison card (Free Demo / ₹99 Trial / Subscription plans) with clear, high-contrast CTA buttons.
- Ensure all copy is written in clear, professional layman language.
- Restructure design elements to use brand styling tokens (Playfair Display for headers, Montserrat for subheadings, Merriweather for body, and light colors background).

---

### Addition 8: Post-Payment Agent Setup Wizard ✅

#### [NEW] Premium Agent Setup Wizard (`/dashboard/agents/[id]/setup`)
- Create a new setup wizard page `/dashboard/agents/[id]/setup/page.tsx` for premium agents (Trial/Paid) after payment.
- Display fields: **Business Name**, **Industry**, **Services Offered**, and **Target Audience**.
- Pre-fill input values from the user profile if already configured.
- On form submit: invoke the prompt builder utility to update the agent's system prompt (interpolating these values) and redirect to the agent dashboard console.

---

### Addition 9: Demo Call Storage ✅

#### [MODIFY] Demo Call Pipeline
- Update backend call processing hooks (in python backend and frontend webhook handlers) to ensure all calls made using demo agents are logged in the `voice_calls` (or `agent_call_logs`) table.
- Generate full transcripts, record sentiment analysis, and save the audio recording files to Supabase storage.
- Display call logs in the agent's Analytics/Calls tabs identically to paid agent logs.

---

### Addition 10: Integration Execution Layer (with SMTP Email Integration) ✅

#### [NEW] [integration_executor.py](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/backend/app/services/integration_executor.py)
- Dispatch lead capture, call completed, and callback scheduled data to connected integrations (Telegram, Webhook, SMTP email).
- **Email Follow-ups**: SMTP Email integration triggers automated follow-up emails directly to leads (using dynamic fields like `recipient_name`, `recipient_email`), notification emails to the team, and appointment confirmations.
- Includes a template generator helper `_build_email_template` supporting high-quality responsive brand HTML.

#### [MODIFY] [backend/agent.py](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/backend/agent.py)
- Integrate trigger hooks within the core background agent execution flow to call the executor on key events.

#### [MODIFY] Integration Settings UI
- Update the connection wizard to accept trigger checkboxes, message template customization textareas, and pre-fill them using business context.
- Support config keys for email triggers: `lead_captured` (follow-up to lead), `appointment_booked` (confirmation to lead + alert to user), `callback_scheduled` (reminder to user), and `payment_received` (receipt to customer).

---

### Addition 11: Call Forwarding & Setup Documentation ✅

#### [NEW] [AgentSetupGuide.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentSetupGuide.tsx)
- Create a user documentation component showing getting started instructions, numbers, and provider-specific call forwarding instructions (*21*, **21*, MyJio).

#### [NEW] [AgentCallingStatus.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/agents/AgentCallingStatus.tsx)
- Display status badge: 🟢 Ready for Calls, 🟡 Test Mode Only, 🔴 Not Configured.

---

### Addition 12: Integration Settings Schema & Pre-filled Templates ✅

#### [MODIFY] Database Migration
- Add `settings_schema` JSONB column to `integration_types` table.

#### [MODIFY] Seed Data
- Seed default templates for Telegram, WhatsApp, Google Calendar, Zoho CRM, Salesforce, SMTP email, and Webhook. Update SMTP settings schema to include sender display name, reply-to, and default template triggers.

---

### Addition 13: Real Outbound Calling Readiness Indicators ✅

#### [MODIFY] Campaigns Page & Agent Overview Tab
- Add status banner warning the user if numbers or agents are unassigned/unconfigured.
- Update "Make Test Call" button dynamically depending on simulated/real calling status.

---

### Addition 14: Interactive Product Tour / Onboarding Walkthrough ✅

#### [NEW] [ProductTour.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/onboarding/ProductTour.tsx)
- Introduce a guided guided tour on first login using `react-joyride` or custom premium walkthrough layout.
- Steps include Marketplace highlights, test calls, metrics analysis, and number setup.
- Allow skipping the tour and save `tour_completed` inside user `profiles`.

---

### Addition 15: Smart Notification Preferences ✅

#### [MODIFY] [NotificationsTab.tsx](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/components/settings/NotificationsTab.tsx)
- Extend user notification configurations to support granular controls: channel settings (email, Telegram, dashboard) per event type, quite hours (start/end parameters), and Digest mode toggles.
- Persist settings in profiles JSONB `notification_preferences` column.

---

### Addition 16: Agent Comparison Scorecard ✅

#### [NEW] Overview Card & Comparison Page (`/dashboard/agents/compare`)
- Add a widget comparing key metrics of all organization agents (monthly calls, conversions, average sentiment).
- Create a dedicated comparative view with sortable metric matrices.

---

### Addition 17: Call Transcript Search ✅

#### [MODIFY] Analytics / Call Logs Tabs
- Implement an elastic-style full-text search field filtering calls by matching transcript snippets.
- Support advanced sorting by date range, specific agent, and caller sentiment.

---

### Addition 18: Industry Agent Templates ✅

#### [MODIFY] [Marketplace (Industry templates)](file:///c:/Users/Ketan%2520singh/trinetra-workspace/trinetra-fresh/frontend/src/app/dashboard/marketplace/page.tsx)
- Implement actual functional pre-configured agent templates for specific industries:
  - **Real Estate**: Loaded with property terminology, site visit scheduling logic, natural real estate greetings, and calendar suggestions.
  - **Healthcare**: Loaded with medical terminology, appointment booking categories, symptom triage workflows, natural clinical greetings, and calendar sync suggestions.
  - **Education**: Pre-configured with course catalog keywords, admissions FAQ prompt extensions, admissions counselor greetings, and CRM sync recommendations.
  - **E-commerce**: Loaded with order status check prompts, return policies, delivery tracking support rules, active greeting statements, and webhook triggers.
  - **Banking**: Configured with account and loan options, secure KYC support instructions, high-security greetings, and secure webhook logs.
- Dynamic prompts, starter knowledge bases, and default mappings are immediately editable by the user post-creation.

---

### Addition 19: Admin Call Quality Dashboard ✅

#### [NEW] `/admin/call-quality` Page
- Admin console listing flagged calls, quality score distributions, hallucination warning flags, and alert trends for deteriorating configurations.

---

## Postponed Enhancements (Post-MVP)

The following enhancements are excluded from the initial MVP release and marked for post-launch execution:
1. **Bulk Agent Actions** (Pause/Resume/Delete multiple agents concurrently).
2. **Custom Dashboard Widgets** (User-rearrangeable layout grids).
3. **Dark Mode for Admin Console** (Currently super admin pages use a static dark theme).

---

## Verification Plan

### Automated Tests
- Build test command: `npm run build` to verify TypeScript compile and component layouts.
- API testing via curl/postman:
  - Test `/api/consent` insertion and profile updates.
  - Test `/api/profiles/export-data` and `/api/profiles/delete-account`.
  - Verify cart price calculations and discount rules.

### Manual Verification
- Test user signup, consent screen, and stepper onboarding sequence.
- Confirm redirect to `/dashboard/marketplace` on completion.
- Validate that the Sidebar has no Callbacks, Integrations, or Voice Calls links.
- Test browser live call on demo agents; verify that demo agents expire after 5 days or 10 minutes, and display the upgrade prompt modal.
- Verify global configurations in Settings -> Integrations, and toggle them on/off per-agent.
- Verify maintenance mode blocking in the admin system config.
- **Test invoice rendering** with 1, 3, and 6 line items to confirm correct scaling and alignment.
- **Purchase a bundle** from the dashboard; verify that a single invoice is generated with the bundle discount applied.
- **Purchase multiple agents** using the "same profile" option and confirm that all agents inherit the business description.
- **Check all email templates** to verify styling compatibility in HTML email clients.
- **Verify demo expiry overlay** blocks access on the agent detail page once the limits are triggered.
- **Verify invoice PDF** is created, saved in Supabase storage, and sent as an email attachment.
- **Test downloading past invoices** from the transaction history log.
- **Redesigned Marketplace details page**: Verify n8n-style two-column scaling and bottom pricing cards.
- **Post-Payment Setup Wizard**: Complete checkout and verify redirection to the premium setup wizard, prefilling details, and personalization of prompts.
- **Demo Call Logs Verification**: Execute a WebRTC/Mic demo call and confirm the record is correctly stored in the DB, showing in the agent's Call Logs tab.
- **Integration Trigger Events**: Send test lead, callback, and call data to verify Telegram bot message delivery and webhook callback requests.
- **Call Forwarding Guide**: Open documentation and verify operator-specific code display.
- **Ready/Test mode badges**: Confirm simulated/live status badges are correctly styled and functional.
- **Agent Send Email Integration**: Configure test SMTP details and trigger an active call flow; verify follow-up email is received containing conversation summary and styled with brand branding styles.
- **Product Tour Verification**: Ensure that the product tour initiates correctly upon fresh registration, focuses elements correctly, and respects skip clicks.
- **Granular Notifications**: Toggle quiet hours and digest options to verify settings are updated.
- **Comparison scorecard**: View comparison dashboard to confirm correct calculations of calls and conversion percentages.
- **Transcript Search**: Input keyword in Search Bar and confirm results only return calls where matching phrase appears in transcript.
- **Admin Quality Dashboard**: Verify super admin can view quality scoring alerts.
- **Industry templates**: Launch a new agent using the Healthcare template and confirm that system prompt contains preloaded triage and appointment booking configurations.
