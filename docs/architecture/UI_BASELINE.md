# UI/UX BASELINE & INTERFACE PROTECTION CONTRACT — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: `design.md`, `rules.md`, and Frontend Implementation  
> **Rule**: ADD FEATURES AROUND EXISTING DESIGN. DO NOT REDESIGN EXISTING SCREENS MERELY FOR AESTHETIC PREFERENCE.

---

## 1. Design System & Visual Tokens

The frontend design system uses a dark futuristic glassmorphism aesthetic built on Next.js 16, Tailwind CSS 4, and shadcn/ui components.

### 1.1 Color Palette Tokens
- **Background Root**: `#090514` (Deep obsidian indigo)
- **Card / Surface Background**: `rgba(255, 255, 255, 0.03)` with `backdrop-blur-md`
- **Surface Border**: `rgba(255, 255, 255, 0.08)` / `border-white/10`
- **Primary Accent**: `#A855F7` (Vibrant purple) to `#6366F1` (Indigo gradient)
- **Primary Text**: `#FAF7FF` (Near white)
- **Muted / Secondary Text**: `#8E86A8` / `#94A3B8`
- **Success Badge / Indicator**: `#10B981` (Emerald green)
- **Warning / Grace Indicator**: `#F59E0B` (Amber gold)
- **Destructive / Error**: `#EF4444` (Ruby red)
- **Developer / Test Badge**: `#8B5CF6` (Distinct purple border and badge)

### 1.2 Typography & Spacing
- **Typography**: Inter / Outfit sans-serif hierarchy; font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold).
- **Spacing Units**: Standard 4px grid (`gap-2`, `gap-4`, `p-6`, `rounded-xl`, `rounded-2xl`).
- **Interactive Micro-Animations**: Smooth hover states, 150–200ms transition curves (`transition-all duration-200 hover:scale-[1.01]`).

---

## 2. Key Screen Blueprints

### 2.1 Client Dashboard (`/dashboard`)
- **Header**: Organization switcher dropdown, notification bell with unread badge count, user profile avatar.
- **Top Metrics Row**: 4 KPI stat cards (Minutes Used, Active Numbers, Leads Captured, Wallet Balance).
- **Main Section**: Real-time conversion chart (`recharts`), recent voice calls table, quick action buttons (Create Agent, Buy Number, Start Campaign).
- **Responsive Layout**: Collapsible sidebar navigation with auto-hiding on mobile breakpoints (`md:block`).

### 2.2 Agent Studio & WebRTC Demo (`/dashboard/agents/[slug]/demo`)
- **Layout**: Split view: Agent voice configuration & prompt editor on the left; interactive WebRTC Voice Waveform visualizer on the right.
- **Controls**: "Start Call" button with pulsing animated waves, real-time audio latency meter, mute button, transcript live feed.

### 2.3 Outbound Campaign Hub (`/dashboard/campaigns`)
- **Components**: Campaign overview table, CSV drag-and-drop file uploader, consent attestation checkbox, real-time progress bar.
- **Actions**: Start, Pause, Resume, and Retry failed contacts.

### 2.4 Virtual Numbers & Pool (`/dashboard/phone-numbers`)
- **Components**: Active numbers card grid, renewal countdown timer, bidding auction modal, carrier tag (Twilio / Exotel).
- **Status Badges**: `Active` (Green), `Grace Period` (Amber), `Administrative Hold` (Red).

### 2.5 Billing & In-App Invoice Vault (`/dashboard/billing`)
- **Components**: Wallet balance card with quick top-up buttons (₹500, ₹1,000, ₹2,500), Reliability Score indicator, emergency minutes claim banner, itemized invoice history table with PDF download buttons.

### 2.6 Admin Operations Panel (`/admin`)
- **Components**: Single-pane-of-glass overview, tenant management table, virtual number provisioning, carrier telephony configuration, support ticket queue, privileged step-up auth modal.

---

## 3. UI Protection List (Protected Components)

The following UI components are **PROTECTED** and must NOT be casually redesigned, recolored, or restructured:

| Screen / Component | File Path | Protected Elements | Rationale |
| :--- | :--- | :--- | :--- |
| **Voice Demo Widget** | `frontend/src/components/demo/VoiceDemo.tsx` | WebRTC audio waveform, connect/disconnect lifecycle, live transcript display | Core customer product showcase; tightly coupled with LiveKit room events. |
| **Dashboard Layout & Sidebar** | `frontend/src/app/dashboard/layout.tsx` | Navigation links, tenant switcher, notification bell | Universal navigation framework for all customer features. |
| **Campaign Manager & Uploader** | `frontend/src/app/dashboard/campaigns/page.tsx` | CSV parsing modal, consent attestation checkbox | Legal consent attestation must remain visible and affirmative before dialing. |
| **Wallet & Billing Interface** | `frontend/src/app/dashboard/billing/page.tsx` | Top-up buttons, Razorpay modal trigger, GST breakdown | Financial checkout flow; verified with accounting and tax layouts. |
| **Virtual Numbers Grid** | `frontend/src/app/dashboard/phone-numbers/page.tsx` | Expiry countdown, status badges, one-click reactivation | Critical for preventing number loss during grace and hold periods. |
| **KYC Document Upload Modal** | `frontend/src/app/dashboard/kyc/page.tsx` | Document type dropdown, statutory consent advisory | Statutory compliance interface; verified against DPDP rules. |
| **Admin Step-Up Modal** | `frontend/src/components/admin/StepUpAuthModal.tsx` | Password/TOTP prompt, error handling, session timer | High-risk gate protecting privileged actions. |
| **Educational Shiksha Section** | `frontend/src/components/landing/TrinetraShikshaSection.tsx` | Mock exam graphics, student topic analytics card | Core product vertical representation for educational clients. |
