══════════════════════════════════════════════════════════════════
MASTER PROMPT — TRINETRA AI CLIENT DASHBOARD
COMPLETE FULL-STACK BUILD INSTRUCTION
══════════════════════════════════════════════════════════════════

You are building the complete client dashboard for Trinetra AI 
(trinetraai.com), a Next.js 14 App Router application using 
Supabase (PostgreSQL), Tailwind CSS, Framer Motion, and Recharts.

READ THIS ENTIRE PROMPT BEFORE WRITING A SINGLE LINE OF CODE.

═══════════════════════════════════════════════════════════════════
SECTION A: PROJECT CONTEXT & AESTHETIC
═══════════════════════════════════════════════════════════════════

WHAT YOU ARE BUILDING:
A client dashboard where paying customers of Trinetra AI can:
1. See their AI agents' real-time performance
2. Test their agents via a demo center
3. View calls, transcripts, appointments, leads
4. Track ROI and usage against plan limits
5. Manage settings and integrations

EXISTING WEBSITE AESTHETIC (MUST MATCH EXACTLY):
The existing Trinetra AI website uses this design language:
- Background: Deep black/near-black (#0a0a0f, #080810)
- Cards: Dark glass morphism (#0f1117, #111827 with 
  1px borders of rgba(255,255,255,0.06))
- Primary accent: Vivid purple (#7c3aed, #8b5cf6, #a855f7)
- Secondary accent: Electric blue (#3b82f6, #60a5fa)
- Success: Emerald (#10b981)
- Warning: Amber (#f59e0b)
- Error: Rose (#ef4444)
- Text: White (#f9fafb) primary, (#9ca3af) secondary, 
  (#6b7280) muted
- Typography: Inter font (already imported)
- Borders: rgba(255,255,255,0.06) to rgba(255,255,255,0.1)
- Shadows: 0 0 40px rgba(124,58,237,0.15) purple glow on key elements
- Gradients: Linear from purple to blue on CTAs and headers
  "bg-gradient-to-r from-violet-600 to-blue-500"
- Animations: Smooth, subtle, never jarring
  - Page transitions: opacity + translateY (0→1, 20px→0)
  - Hover: Scale 1.01-1.02, subtle glow increase
  - Number counters: Count up animation on load
  - Skeleton: Pulse animation (animate-pulse)
  - Charts: Animate in on mount
- No sharp corners on key elements 
  (rounded-xl, rounded-2xl standard)
- Backdrop blur on modals and dropdowns

DO NOT: Use white backgrounds, light themes, Material UI 
components, Bootstrap, or any pre-built component libraries 
other than shadcn/ui (already installed).
DO NOT: Add any Tailwind classes that don't exist or 
invent CSS that doesn't work.

═══════════════════════════════════════════════════════════════════
SECTION B: TECHNICAL STACK (NON-NEGOTIABLE)
═══════════════════════════════════════════════════════════════════

Framework: Next.js 14 App Router (not pages router)
Database: Supabase (PostgreSQL + Auth + Realtime)
Styling: Tailwind CSS (only existing classes)
Animations: Framer Motion
Charts: Recharts
Icons: Lucide React
State: Zustand (for global) + React hooks (for local)
Real-time: Supabase Realtime subscriptions
Forms: React Hook Form + Zod validation
Notifications: react-hot-toast
Date handling: date-fns (with IST timezone)
Number formatting: Intl.NumberFormat with 'en-IN' locale

FILE STRUCTURE TO CREATE:

app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          ← REDESIGNED login page
│   └── layout.tsx
├── dashboard/
│   ├── layout.tsx            ← Main dashboard layout
│   ├── page.tsx              ← Main overview
│   ├── demo/
│   │   └── page.tsx          ← Demo/testing center
│   ├── agents/
│   │   ├── page.tsx          ← All agents overview
│   │   └── [id]/
│   │       └── page.tsx      ← Individual agent detail
│   ├── calls/
│   │   └── page.tsx          ← Call history (conditional)
│   ├── conversations/
│   │   └── page.tsx          ← Chat history (conditional)
│   ├── appointments/
│   │   └── page.tsx          ← Appointments
│   ├── leads/
│   │   └── page.tsx          ← Leads kanban
│   ├── analytics/
│   │   └── page.tsx          ← Full analytics
│   ├── notifications/
│   │   └── page.tsx          ← All notifications
│   ├── settings/
│   │   ├── page.tsx          ← Settings home
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── agents/
│   │   │   └── page.tsx
│   │   ├── integrations/
│   │   │   └── page.tsx
│   │   └── notifications/
│   │       └── page.tsx
│   ├── billing/
│   │   └── page.tsx          ← Billing + GST
│   └── support/
│       └── page.tsx
├── api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── me/route.ts
│   ├── dashboard/
│   │   ├── stats/route.ts
│   │   ├── activity/route.ts
│   │   └── chart-data/route.ts
│   ├── agents/
│   │   ├── route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── status/route.ts
│   ├── calls/
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   └── [id]/audio/route.ts
│   ├── conversations/route.ts
│   ├── appointments/route.ts
│   ├── leads/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── demo/
│   │   ├── start/route.ts
│   │   └── history/route.ts
│   ├── analytics/route.ts
│   ├── notifications/route.ts
│   ├── settings/
│   │   ├── profile/route.ts
│   │   └── integrations/route.ts
│   └── billing/
│       ├── subscription/route.ts
│       └── invoices/route.ts
components/
├── dashboard/
│   ├── DashboardLayout.tsx
│   ├── Sidebar.tsx           ← Smart conditional sidebar
│   ├── Topbar.tsx
│   ├── AgentHealthBar.tsx    ← Always-visible status bar
│   ├── OnboardingBanner.tsx  ← Progress banner
│   ├── StatCard.tsx          ← Dynamic stat card
│   ├── StatCardsGrid.tsx     ← Renders correct cards
│   ├── AgentPanel.tsx        ← Agent status panel
│   ├── ActivityFeed.tsx      ← Live feed
│   ├── CallsTable.tsx
│   ├── ConversationsTable.tsx
│   ├── AppointmentsPanel.tsx
│   ├── UsagePanel.tsx
│   ├── ROIWidget.tsx
│   └── charts/
│       ├── VolumeChart.tsx
│       ├── SentimentChart.tsx
│       └── IntentChart.tsx
├── demo/
│   ├── DemoCenter.tsx
│   ├── VoiceDemo.tsx
│   └── ChatDemo.tsx
├── modals/
│   ├── AudioPlayerModal.tsx
│   ├── TranscriptDrawer.tsx
│   └── ShareDemoModal.tsx
├── ui/
│   ├── SkeletonCard.tsx
│   ├── EmptyState.tsx
│   └── ErrorState.tsx
lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── queries.ts           ← All DB queries centralized
├── utils/
│   ├── formatters.ts        ← INR, IST, duration formatters
│   ├── agentDetection.ts    ← Dashboard builder logic
│   └── roiCalculator.ts
hooks/
├── useAgents.ts
├── useDashboardStats.ts
├── useRealtimeActivity.ts
└── useOnboarding.ts
store/
└── dashboardStore.ts        ← Zustand store

═══════════════════════════════════════════════════════════════════
SECTION C: DELETE EXISTING CODE FIRST
═══════════════════════════════════════════════════════════════════

BEFORE BUILDING ANYTHING:
1. Delete app/(auth)/login/page.tsx (old login page)
2. Delete everything inside app/dashboard/ (old dashboard)
3. Delete any old dashboard components in components/
4. Keep: Auth utilities, Supabase client setup, 
         middleware.ts (update if needed)
5. Keep: All existing public pages (home, pricing, blog, etc.)
6. Keep: Global CSS, Tailwind config, next.config.js

═══════════════════════════════════════════════════════════════════
SECTION D: LOGIN PAGE — COMPLETE SPECIFICATION
═══════════════════════════════════════════════════════════════════

FILE: app/(auth)/login/page.tsx

VISUAL DESIGN:
Full screen split layout:
- LEFT HALF (hidden on mobile): 
  Animated background showing abstract AI visualization
  - Deep black background
  - Floating purple/blue orbs (CSS animation, not canvas)
  - Trinetra AI logo centered
  - Tagline: "Your AI. Always Working."
  - Three trust points below:
    "✓ 247 calls handled while you sleep"
    "✓ Appointments booked automatically"  
    "✓ Every lead captured"
  - These numbers animate/count up when page loads

- RIGHT HALF (full screen on mobile):
  Login form on dark card with glass effect
  - Trinetra logo (mobile only, hidden on desktop)
  - "Welcome back" heading (white, bold)
  - "Sign in to your dashboard" (muted)
  - Email input (dark bg, purple focus ring)
  - Password input (with show/hide toggle)
  - "Forgot password?" link (purple, right aligned)
  - [Sign In] button:
    Full width, gradient purple-to-blue
    Loading spinner while authenticating
    Text changes: "Sign In" → "Signing in..." → redirect
  - Divider: "— or —"
  - [Continue with Google] button (dark, white text, Google icon)
  - Bottom: "Don't have an account? Start free trial →"

ERROR HANDLING:
- Invalid credentials: Red toast + shake animation on form
- Network error: "Connection failed. Check your internet."
- Account not found: "No account found. Did you mean to sign up?"

SUCCESS:
- Check onboarding_complete on profile
- If false → redirect to /dashboard/onboarding
- If true → redirect to /dashboard

ANIMATION:
- Form slides in from right on mount (framer motion)
- Left side orbs float continuously (CSS keyframes)
- Input focus triggers subtle purple glow

IMPLEMENTATION:
'use client'
Use Supabase client for auth:
const { data, error } = await supabase.auth.signInWithPassword({
  email, password
})

═══════════════════════════════════════════════════════════════════
SECTION E: DASHBOARD LAYOUT — COMPLETE SPECIFICATION
═══════════════════════════════════════════════════════════════════

FILE: app/dashboard/layout.tsx

ON LAYOUT MOUNT:
1. Verify session with Supabase (server-side)
2. Fetch user profile (profiles table)
3. Fetch subscription + plan (subscriptions + plans)
4. Fetch agents list (agents table)
5. Detect which agent types exist (agentDetection utility)
6. Pass context down via React Context / Zustand
7. Subscribe to Supabase Realtime channels

LAYOUT STRUCTURE (desktop):
┌─────────────────────────────────────────────────────────────┐
│ TOPBAR (fixed, 64px height, w-full, z-50)                  │
│ bg: rgba(8,8,16,0.9) backdrop-blur-xl                      │
│ border-bottom: 1px solid rgba(255,255,255,0.06)            │
├────────┬────────────────────────────────────────────────────┤
│        │                                                     │
│SIDEBAR │  MAIN CONTENT AREA                                 │
│(fixed) │  (scrollable, pt-16 for topbar offset)            │
│240px   │  padding: 24px                                     │
│        │  max-width: 1400px, centered                       │
│        │                                                     │
└────────┴────────────────────────────────────────────────────┘

TOPBAR COMPONENT (Topbar.tsx):
Left:
- Hamburger icon (mobile only)
- "Trinetra" wordmark with gradient (no tagline)

Right (flex, gap-3, items-center):
- NOTIFICATION BELL:
  Position relative
  Red badge: absolute, top-0 right-0
  Count from DB query [Q20]
  Click → popover dropdown (not page navigation)
  Dropdown: 
    "Notifications" header + "Mark all read" button
    Last 5 notifications (icon + title + time ago)
    Each: hover bg rgba(255,255,255,0.04)
    "View all →" at bottom → /dashboard/notifications
  
- PLAN BADGE:
  Small pill: rounded-full, bg gradient purple
  Text: plan name (from subscription → plan join)
  Click → /dashboard/billing
  
- USER AVATAR + NAME:
  Avatar: 32px circle, gradient bg with initials
  Name: truncated to 15 chars
  Dropdown on click (framer motion AnimatePresence):
    Profile Settings → /dashboard/settings/profile
    Billing & Plan → /dashboard/billing
    Help & Support → /dashboard/support
    Sign Out → supabase.auth.signOut() → /login

SIDEBAR COMPONENT (Sidebar.tsx):
Width: 240px desktop, 0px mobile (slides in)
Background: rgba(8,8,16,0.95)
Border-right: 1px solid rgba(255,255,255,0.06)
Position: fixed, left-0, top-64px, h-full

TOP: User info mini card (name + plan)

NAVIGATION ITEMS (conditional rendering):
ALWAYS SHOW:
- 🏠 Overview → /dashboard
- 🧪 Demo → /dashboard/demo [highlighted with NEW badge]
- 🤖 Agents → /dashboard/agents
- 📅 Appointments → /dashboard/appointments
- 🎯 Leads → /dashboard/leads
- 📊 Analytics → /dashboard/analytics

CONDITIONAL (only if agent type exists):
- 📞 Voice Calls → /dashboard/calls 
  [ONLY IF hasVoiceAgent === true]
- 💬 Chat → /dashboard/conversations 
  [ONLY IF hasChatAgent === true]
- 📱 WhatsApp → /dashboard/whatsapp 
  [ONLY IF hasWhatsApp === true]

ALWAYS SHOW (BOTTOM):
- ⚙️ Settings → /dashboard/settings
- 💳 Billing → /dashboard/billing
- 🎧 Support → /dashboard/support

ACTIVE STATE:
- bg: rgba(124,58,237,0.15)
- left border: 3px solid #7c3aed
- text: white (not muted)
- icon: purple tinted

INACTIVE STATE:
- text: #6b7280
- hover: bg rgba(255,255,255,0.04), text #9ca3af
- transition: 150ms

═══════════════════════════════════════════════════════════════════
SECTION F: MAIN DASHBOARD PAGE — COMPLETE SPECIFICATION  
═══════════════════════════════════════════════════════════════════

FILE: app/dashboard/page.tsx

PAGE LOAD SEQUENCE:
1. Show skeleton screens immediately
2. Fire all API calls in parallel using Promise.all
3. Replace skeletons with data as it arrives
4. WebSocket already active from layout

PAGE SECTIONS IN ORDER:

──────────────────────────────────────────────
F.1 ONBOARDING BANNER (conditional)
──────────────────────────────────────────────
SHOW IF: onboarding_progress.is_complete = false 
         AND dismissed = false

DESIGN:
Full-width card
bg: linear gradient rgba(124,58,237,0.1) to rgba(59,130,246,0.1)
border: 1px solid rgba(124,58,237,0.3)
rounded-xl, p-4, mb-6

LEFT: Progress indicator
  "Setup Progress" label
  Step dots or progress bar
  "3 of 5 steps complete"

CENTER: Current task
  "Next: Connect your Google Calendar"
  Sub: "So your agent can book appointments automatically"

RIGHT:
  [Continue Setup →] button (purple gradient)
  [✕ Dismiss] icon (small, grey)

STEPS TRACKED:
business_info, agent_configured, demo_call_made, 
calendar_connected, widget_installed

──────────────────────────────────────────────
F.2 AGENT HEALTH BAR (always visible)
──────────────────────────────────────────────
FILE: components/dashboard/AgentHealthBar.tsx

DESIGN:
Full-width card
bg: rgba(15,17,23,0.8)
border: 1px solid rgba(255,255,255,0.06)
rounded-xl, p-3, mb-6
Flex row, space-between

LEFT: "Your AI Agents" label (small, muted)

CENTER: Agent pills (one per agent they have)
Each pill:
  bg: rgba(255,255,255,0.04)
  rounded-full, px-3 py-1.5
  Agent type icon + name + status dot + last activity

  Status dots:
  ● Active (green #10b981, with pulse animation)
  ● Idle (grey #4b5563, no pulse)
  ● Error (red #ef4444, pulse)
  ● Setting up (purple #8b5cf6, pulse)

RIGHT: [🧪 Test Your Agent] button
  bg: transparent, border: 1px solid rgba(124,58,237,0.4)
  text: purple
  hover: bg rgba(124,58,237,0.1)
  onClick → navigate to /dashboard/demo

DATA: From agents query [Q10]
Realtime: Updates via Supabase Realtime on agents table

──────────────────────────────────────────────
F.3 STAT CARDS GRID (dynamic)
──────────────────────────────────────────────
FILE: components/dashboard/StatCardsGrid.tsx
FILE: components/dashboard/StatCard.tsx

GRID LAYOUT:
CSS Grid, responsive:
- 1 col mobile
- 2 cols tablet  
- 4 cols desktop (if 4+ cards)
- Cards auto-fill, never overflow

WHICH CARDS SHOW:
Determined by agentDetection utility:

const getCardsForUser = (agents, subscription) => {
  const hasVoice = agents.some(a => a.agent_type === 'voice')
  const hasChat = agents.some(a => a.agent_type === 'chat')
  const hasWhatsApp = agents.some(a => a.agent_type === 'whatsapp')
  
  const cards = []
  
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

STAT CARD DESIGN (each card):
bg: rgba(15,17,23,0.9)
border: 1px solid rgba(255,255,255,0.06)
rounded-2xl
p-6
hover: border-color rgba(124,58,237,0.3), 
       shadow 0 0 20px rgba(124,58,237,0.1)
transition: all 200ms
cursor: pointer (onClick → drill-down page)

CARD INNER LAYOUT:
TOP ROW:
  Left: Title (small, muted, uppercase tracking-wide)
  Right: Icon (24px, muted color matching accent)

CENTER:
  Big number (40px, bold, white)
  Count-up animation using useCountUp hook
  Format with en-IN locale:
    Calls: "247"
    Minutes: "184 min"
    Rupees: "₹42,300"
    Percentage: "18.4%"

BOTTOM ROW:
  Left: Sub-label (small, muted)
  Right: Trend badge:
    Green up arrow + "+23%" if positive
    Red down arrow + "-5%" if negative
    Grey dash if 0% change
    No trend for "Active Now" card

SKELETON STATE (while loading):
Same card layout but all text replaced with 
animate-pulse grey blocks:
  - Title: w-24 h-3 rounded bg-white/10
  - Number: w-16 h-10 rounded bg-white/10
  - Trend: w-20 h-3 rounded bg-white/10

SPECIFIC CARD CONFIGS:

voice_calls card:
  title: "Voice Calls"
  icon: Phone (blue tint)
  value: data.total_calls from [Q2]
  sublabel: "this month"
  trend: calc from [Q3]
  onClick: /dashboard/calls

voice_minutes card:
  title: "Minutes Used"
  icon: Clock (purple tint)
  value: data.minutes_used formatted as "184 min"
  sublabel: "of {plan_limit} included"
  SPECIAL: Add mini progress ring (SVG circle)
    green 0-70%, amber 70-90%, red 90%+
  trend: vs last month
  onClick: /dashboard/billing

chat_conversations card:
  title: "Conversations"
  icon: MessageCircle (green tint)
  value: data.total_conversations from [Q5]
  sublabel: "{resolution_rate}% resolved by AI"
  trend: vs last month
  onClick: /dashboard/conversations

appointments card:
  title: "Appointments"
  icon: Calendar (orange tint)
  value: data.total_month from [Q6]
  sublabel: "{total_week} this week"
  trend: vs last month
  onClick: /dashboard/appointments

leads card:
  title: "Leads Generated"
  icon: Target (yellow tint)
  value: data.total_leads from [Q7]
  sublabel: "{qualified_leads} qualified"
  trend: vs last month
  onClick: /dashboard/leads

active_now card:
  title: "Active Now"
  icon: Activity (green tint)
  value: total active from [Q8]
  sublabel: "live interactions"
  NO trend
  SPECIAL: Pulsing green dot if value > 0
  Updates via Supabase Realtime (no cache)

cost_saved card:
  title: "Saved This Month"
  icon: IndianRupee (gold tint #f59e0b)
  value: calculated ROI value
  format: ₹{amount} with en-IN formatting
  sublabel: "vs hiring human staff"
  trend: vs last month
  SPECIAL: Slightly larger card OR gold border
  CALCULATION: 
    (voice_minutes × 15) + (chat_count × 20) +
    (appointments × 200) + (leads × 280)
  tooltip on hover: Shows breakdown

──────────────────────────────────────────────
F.4 MAIN CONTENT ROW (2 columns)
──────────────────────────────────────────────

LEFT COLUMN (60% width):
Agent Performance Panel (AgentPanel.tsx)

  DESIGN:
  bg: rgba(15,17,23,0.9)
  border: 1px solid rgba(255,255,255,0.06)
  rounded-2xl, p-6

  HEADER:
  "Your AI Agents" title
  [+ Add Agent] button if plan allows more
    (grey if at limit, purple if can add)

  AGENT CARDS (one per agent):
  Each agent card:
  bg: rgba(255,255,255,0.03)
  border: 1px solid rgba(255,255,255,0.06)
  rounded-xl, p-4, mb-3
  
  LEFT: Agent icon (type-specific) + status dot
  CENTER:
    Agent name (bold, white)
    Type badge (rounded-full, small)
    Language badge (e.g., "Hindi + English")
    Today's stats row:
      Voice: "32 calls | 4m avg | 8 booked"
      Chat: "89 chats | 84% resolved | 12 leads"
  RIGHT:
    [Details →] button
    Toggle switch (active/inactive)
    Toggle calls PATCH /api/agents/:id/status
    Optimistic update (toggle immediately, rollback if error)

  EMPTY STATE (no agents):
  Center icon (Robot or Cpu from Lucide)
  "No agents deployed yet"
  "Your AI agents will appear here once configured"
  [Get Started] → /dashboard/onboarding

RIGHT COLUMN (40% width):
Live Activity Feed (ActivityFeed.tsx)

  DESIGN:
  bg: rgba(15,17,23,0.9)
  border: 1px solid rgba(255,255,255,0.06)
  rounded-2xl, p-6
  height: match agent panel height
  overflow-y: scroll (custom scrollbar, thin purple)

  HEADER:
  "Live Activity" title
  Green pulsing dot if connected to realtime
  "Live" text in green

  FEED ITEMS:
  Each item (AnimatePresence, items slide in from top):
  
  Layout: flex, gap-3
  Left: Icon circle (24px, bg matching activity type)
  Center:
    Title (white, small, semi-bold)
    Description (muted, x-small)
  Right: Time ago (x-small, muted)
  
  Activity types → icons → colors:
  call_started → Phone → blue
  call_ended → PhoneOff → green/red based on sentiment
  appointment_booked → Calendar → orange
  lead_captured → Target → yellow
  chat_started → MessageCircle → green
  missed_call → PhoneMissed → red
  usage_alert → AlertTriangle → amber
  demo_call → FlaskConical → purple

  REALTIME: 
  Subscribe to Supabase Realtime:
  supabase
    .channel('activity-feed')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_log',
      filter: `user_id=eq.${userId}`
    }, (payload) => {
      // Prepend to feed, animate in
      // Show toast for important events
    })
    .subscribe()

  EMPTY STATE:
  "No activity yet"
  "Activity will appear here as your agents 
   start handling interactions"

──────────────────────────────────────────────
F.5 CHARTS ROW
──────────────────────────────────────────────

LEFT CHART (60% width):
VolumeChart.tsx
  
  TYPE: AreaChart from Recharts
  DATA: From [Q11] and [Q12] combined
  
  HEADER:
  "Interactions Over Time"
  Toggle buttons: [7 days] [30 days] [3 months]
  Active toggle: bg purple gradient

  CHART STYLE:
  bg: transparent
  grid lines: rgba(255,255,255,0.05)
  x-axis: muted grey text, IST dates
  y-axis: muted grey text
  
  AREAS:
  Voice calls: 
    stroke: #7c3aed (purple)
    fill: url(#purpleGradient) — gradient from purple to transparent
  Chat conversations:
    stroke: #3b82f6 (blue)  
    fill: url(#blueGradient) — gradient from blue to transparent
  WhatsApp (if exists):
    stroke: #10b981 (green)
    fill: url(#greenGradient)
  
  ONLY SHOWS LINES for agent types user has
  
  TOOLTIP:
  bg: rgba(15,17,23,0.95)
  border: 1px solid rgba(255,255,255,0.1)
  rounded-xl, p-3
  Shows date + each metric value
  
  ANIMATION: 
  Areas animate in on mount (animationDuration: 1000)
  
  EMPTY STATE:
  Show empty chart outline (axes only, no data lines)
  "No data for this period"
  Do NOT draw fake lines

RIGHT CHART (40% width):
IntentChart.tsx

  TYPE: PieChart (donut) from Recharts
  DATA: From [Q13]
  
  HEADER: "What People Ask About"
  
  CHART:
  innerRadius: 60, outerRadius: 90
  Colors: purple, blue, green, orange, amber, rose
  
  CENTER TEXT:
  "Total" (small)
  "{total_count}" (bold, large)
  
  LEGEND:
  Below chart, 2-column grid
  Each: colored dot + intent name + percentage
  
  EMPTY STATE:
  "Not enough data yet"
  "This fills in as your agents handle more conversations"

──────────────────────────────────────────────
F.6 RECENT INTERACTIONS TABLE
──────────────────────────────────────────────
FILE: components/dashboard/CallsTable.tsx

DESIGN:
Full-width card
bg: rgba(15,17,23,0.9)
border: 1px solid rgba(255,255,255,0.06)
rounded-2xl, p-6

HEADER ROW:
"Recent Interactions" title
TABS (if multiple channels):
  [Voice Calls] [Chat] [WhatsApp]
  Only shows tabs for channels user has
  Active tab: border-bottom purple
[View All →] button (top right, links to full page)

TABLE:
thead: text-xs uppercase tracking-wider text-gray-500
thead border-bottom: 1px solid rgba(255,255,255,0.06)
tbody rows: border-bottom rgba(255,255,255,0.04)
tbody row hover: bg rgba(255,255,255,0.02)

COLUMNS (Voice Calls tab):
1. CALLER
   Avatar (initials in colored circle, 32px)
   Name (if captured) or "Unknown"
   Phone (masked: +91 98765 ****)

2. AGENT
   Agent name + small type badge

3. DURATION
   "4:32" format
   Color: green >2min, muted <1min
   "Missed" in red for missed calls

4. TIME
   Relative: "2 hours ago"
   Absolute on hover (tooltip)
   IST timezone always

5. SENTIMENT
   Emoji + badge:
   😊 Positive: green badge
   😐 Neutral: grey badge  
   😞 Negative: red badge

6. OUTCOME
   Icon + text:
   📅 Appointment Booked
   🎯 Lead Captured
   ✅ Resolved
   ↗️ Escalated
   ❌ Unresolved

7. ACTIONS
   [▶] Play button → AudioPlayerModal
   [📄] Transcript button → TranscriptDrawer
   [⋮] More dropdown → Share, Download, Flag

LOADING STATE:
5 skeleton rows
Each row: pulse animation on all cells

EMPTY STATE:
Phone icon (large, centered, muted)
"No calls yet this month"
"Your voice agent's call history will appear here"

──────────────────────────────────────────────
F.7 BOTTOM ROW
──────────────────────────────────────────────

LEFT (50%): AppointmentsPanel.tsx
  
  DESIGN: Same card style as above
  
  HEADER:
  "Upcoming Appointments"
  [View All →] → /dashboard/appointments
  
  APPOINTMENT CARDS (next 5):
  Data from [Q17]
  
  Each card:
  bg: rgba(255,255,255,0.03)
  border-left: 3px solid #7c3aed
  rounded-lg, p-3, mb-2
  
  Content:
  TOP: Date/time (IST, bold) + status badge
  MIDDLE: Contact name + phone
  BOTTOM: "Booked via {agent_name}" + meeting type icon
  ACTIONS: [Join] [Reschedule] [Cancel]
  
  EMPTY STATE:
  Calendar icon + "No upcoming appointments"
  "Appointments booked by your agents appear here"

RIGHT (50%): UsagePanel.tsx

  DESIGN: Same card style
  
  HEADER:
  "Plan Usage This Month"
  Plan name badge (top right)
  
  USAGE BARS (only for resources in their plan):
  Data from [Q19]
  
  Each resource:
  Label row: "{resource}" (left) + "{used}/{limit}" (right)
  Progress bar:
    bg: rgba(255,255,255,0.1), rounded-full
    Fill: gradient, color based on percentage:
      0-70%: purple gradient
      70-90%: amber gradient
      90%+: red gradient + warn icon
    transition: width 800ms ease (animates on load)
  Percentage text: right-aligned, colored
  
  RENEWAL:
  "Renews Feb 1, 2025 (18 days)"
  
  UPGRADE PROMPT (if any resource > 80%):
  Small card below bars:
  bg: rgba(124,58,237,0.1)
  border: 1px solid rgba(124,58,237,0.3)
  "🚀 Running low on {resource}"
  [Upgrade Plan →] button
  
  EMPTY (new account, day 0):
  Show bars at 0% with correct limits
  "Start using your agents to track usage"

──────────────────────────────────────────────
F.8 ROI WIDGET
──────────────────────────────────────────────
FILE: components/dashboard/ROIWidget.tsx

Full-width card at bottom of dashboard

DESIGN:
bg: linear gradient, subtle purple/blue tint
border: 1px solid rgba(124,58,237,0.3)
rounded-2xl, p-6

LAYOUT (3 columns):

LEFT:
"Your ROI This Month" title
"You paid: ₹{plan_cost}/month"
"Your AI saved: ₹{total_value}"

BIG NUMBER CENTER:
"{roi_percentage}%" in massive font (gradient text)
"Return on Investment" label below

RIGHT: Calculation breakdown
4 rows with icons:
📞 "{calls} calls × ₹15/min = ₹{calls_value}"
💬 "{chats} chats × ₹20 = ₹{chat_value}"  
📅 "{appointments} booked × ₹200 = ₹{appt_value}"
🎯 "{leads} leads × ₹280 = ₹{leads_value}"
──────────────────
Total: ₹{total_value}

[Share This Report] → WhatsApp share (India primary)
[Download PDF] → Generate and download

DATA: From [Q9] roi_metrics table
If no roi_metrics entry for this month:
Calculate on-the-fly from other queries

═══════════════════════════════════════════════════════════════════
SECTION G: DEMO CENTER — COMPLETE SPECIFICATION
═══════════════════════════════════════════════════════════════════

FILE: app/dashboard/demo/page.tsx
COMPONENTS: components/demo/DemoCenter.tsx, VoiceDemo.tsx

PAGE HEADER:
"🧪 Test Your AI Agent"
Subtitle: "Hear and see your AI agent in action before sharing with customers"

AGENT SELECTOR (if multiple agents):
Tab or card selector showing each agent they have
Only show demo options for agent types they have

VOICE DEMO SECTION (if hasVoiceAgent):

CARD DESIGN:
bg: rgba(15,17,23,0.9)
border: 1px solid rgba(124,58,237,0.2)
rounded-2xl, p-6

OPTION A - BROWSER CALL:
"Test from Browser" label
"No phone needed - talk directly through your computer"
[🎙️ Start Test Call] button
  - bg: purple gradient
  - Click: Request microphone permission
  - If denied: Show helper modal with browser settings screenshot
  - If allowed: Initiate WebRTC call to agent

OPTION B - PHONE:
"Call directly" label
Agent phone number in large, clear font:
"+91 80 XXXX XXXX"
[📋 Copy Number] button
  onClick: navigator.clipboard.writeText(phone)
  Button changes to "Copied! ✓" for 2 seconds
[📱 Share on WhatsApp]
  Opens: https://wa.me/?text=Test+my+AI+agent:+{phone}

LIVE TRANSCRIPT PANEL:
Shows when call is active
bg: rgba(255,255,255,0.02)
border: 1px dashed rgba(255,255,255,0.1)
rounded-xl, p-4
min-height: 300px

States:
WAITING: "Waiting for call to start..." (muted, centered)
ACTIVE: Shows messages streaming in real-time
  Agent messages: right-aligned, purple bubble
  User messages: left-aligned, dark bubble
  Each with timestamp
  Auto-scrolls to bottom

CALL CONTROLS (during active call):
[⏸ Pause] [🔚 End Call] [📊 View Live Stats]
Duration counter: counting up "0:32"
"● Recording" indicator (red dot + text)

POST-CALL SUMMARY:
Appears automatically when call ends
Card with:
  Duration
  Sentiment detected: emoji + label
  Key topics discussed: bullet list
  Actions triggered: "Appointment booking attempted"
  [▶ Play Recording]
  [📄 View Full Transcript]
  [📤 Share This Demo]

CHAT DEMO SECTION (if hasChatAgent):
Embedded chat widget preview
Shows the chat interface as customers see it
Client can type and interact
[See how to embed on your website →]

DEMO HISTORY (last 5 tests):
Table:
Date/Time | Type | Duration | Sentiment | Actions
Each row: [▶ Play] [View Transcript] [Share]

DATABASE:
Save each demo call to demo_calls table
Generate share_token for shareable links
Expire share links after 7 days

SHARE MODAL:
Opens when [Share This Demo] clicked
bg: rgba(15,17,23,0.98) overlay
rounded-2xl, p-6

"Share This Demo" title
"Let others see how your AI agent works"

Preview card of what they'll see
Shareable link: 
  https://trinetraai.com/demo/{share_token}
  [Copy Link] button

Share via:
[📱 WhatsApp] → Opens WhatsApp with pre-filled message
[📧 Email] → Opens email client
[🔗 Copy Link] → Clipboard

"This link expires in 7 days" note

═══════════════════════════════════════════════════════════════════
SECTION H: OTHER PAGES — SPECIFICATIONS
═══════════════════════════════════════════════════════════════════

H.1 CALLS PAGE (/dashboard/calls)
ONLY RENDER IF: hasVoiceAgent === true
If user navigates here without voice agent: 
  Redirect to /dashboard OR show locked state

DESIGN: Same dark aesthetic
FILTERS BAR:
Date range (custom range picker, IST dates)
Agent selector (dropdown, if multiple voice agents)
Sentiment filter (All/Positive/Neutral/Negative)
Outcome filter
Search (searches within caller name and transcript)

STATS STRIP:
"Showing {count} calls | Total: {hours}h {min}m | 
 Avg: {avg_duration} | {positive_pct}% positive"

FULL TABLE: Same as dashboard but ALL calls, 25 per page
Pagination: Page numbers + prev/next

MISSED CALLS SECTION (India-specific):
Separate card below main table
"Missed Calls ({count} this week)"
"These callers couldn't reach your agent"
Each row: masked phone + time + [Follow up via WhatsApp]

AUDIO PLAYER MODAL:
Appears as slide-up sheet (mobile) or centered modal (desktop)
bg: rgba(15,17,23,0.98) with backdrop blur

CONTENTS:
Header: Caller name + phone + date/time + agent
Audio waveform (static visual if not using waveform library,
  just use a Recharts bar chart to visualize audio peaks stored in DB)
Controls: [⏮ -10s] [▶/⏸] [⏭ +10s] with seek bar
Speed: [0.75x] [1x] [1.5x] [2x]
Time: "1:23 / 4:32"
[⬇ Download]

TRANSCRIPT PANEL (right side or below player):
Auto-scrolls with playback
Agent lines: Right, purple bubble
User lines: Left, dark bubble
Current line: highlighted border
[📋 Copy Transcript]

AI SUMMARY:
"Call Summary" card below transcript
2-3 sentence summary
"Key Points:" bullet list
"Outcome:" what happened
"Follow-up needed:" yes/no

H.2 APPOINTMENTS PAGE (/dashboard/appointments)

TABS: [Upcoming] [Today] [Past] [Cancelled]

MINI CALENDAR:
Month view, dots on appointment dates
Current month default, navigate with arrows
Click date → filters list to that date
bg: rgba(15,17,23,0.9), rounded-2xl

APPOINTMENT LIST:
Each appointment card:
bg: rgba(15,17,23,0.9)
border-left: 3px solid status-color
  green=confirmed, amber=pending, grey=completed, red=cancelled
rounded-xl, p-4, mb-3

Content:
Date/time (prominent, IST)
Contact: name + email + phone
"Booked via: {agent_name}" with agent type icon
Meeting link if exists: [Join Meeting] button
Status badge
Actions: [Confirm] [Reschedule] [Cancel] [Mark Complete]
Reminders: "✉ Confirmation sent | ⏰ Reminder: 1hr before"

H.3 LEADS PAGE (/dashboard/leads)

VIEW TOGGLE: [Kanban] [List]

KANBAN:
Columns:
🆕 New | 📧 Contacted | 🗣️ Qualified | 
📅 Demo Scheduled | ✅ Converted | ❌ Lost

Each column:
Header: name + count badge
Lead cards:
  bg: rgba(15,17,23,0.9)
  border: 1px solid rgba(255,255,255,0.06)
  rounded-xl, p-3
  Name + company
  Score: progress bar + number (color: green>70, amber>40, red<40)
  Source: agent icon + channel
  Days in stage: "3 days"
  Contact buttons: [📞] [📱 WhatsApp] [📧]
  Click card → Lead detail slide-over

Drag to move between columns (optional: click + dropdown if drag too complex)

LEAD DETAIL SLIDE-OVER:
Slides from right, 480px wide
bg: rgba(8,8,16,0.98) backdrop-blur
Content:
  Name, company, contact info
  Score breakdown (visual)
  Source conversation link
  Activity timeline
  Notes (editable textarea)
  Stage dropdown
  [Save Changes]

H.4 BILLING PAGE (/dashboard/billing)

CURRENT PLAN:
Big card, gradient border
Plan name + price (₹{price}/month)
Status: ✅ Active badge
Renews: date + days remaining
Auto-pay method (last 4 digits)
[Upgrade] [Manage] buttons

WHAT'S INCLUDED:
List of features with check icons
Agent types, limits, add-ons

USAGE THIS MONTH:
Same progress bars as dashboard UsagePanel

INVOICE TABLE:
Columns: Invoice # | Date | Amount | GST | Status | Download
Format amounts as ₹{amount} en-IN
[⬇] Download each invoice

GST SECTION:
Card for GST details
"Add your GST number for compliant invoices"
Input for GST number
Input for company name (as per GST)
"Trinetra AI GST: XXXXXXXXXX"
"SAC Code: 998314"
[Save] button

H.5 SETTINGS PAGES

PROFILE (/dashboard/settings/profile):
Avatar upload (drag/drop or click)
Full name, email, phone, company name
Business type (dropdown)
City, state
Preferred language (Hindi/English)
Timezone (locked to Asia/Kolkata for now, with note)
[Save Profile] → PATCH /api/settings/profile

AGENT SETTINGS (/dashboard/settings/agents):
Accordion: one section per agent
Each section:
  Agent name
  System prompt (large textarea, monospace-ish font)
  Voice selection (if voice agent):
    3-4 voice options with [▶ Preview] each
  Language settings
  Business hours: Mon-Sun toggles + time pickers
  Escalation email
  [Save Agent Settings]

INTEGRATIONS (/dashboard/settings/integrations):
Cards for each integration:

Google Calendar:
  Status: Connected/Not Connected
  If connected: which calendar + [Disconnect]
  If not: [Connect Google Calendar] → OAuth
  
WhatsApp Business:
  Status: Connected/Not Connected
  Setup steps if not connected
  
Razorpay:
  Subscription status (view only)
  Next payment date

NOTIFICATION SETTINGS:
Toggle per notification type
Email: New appointment, New lead, Usage alerts, 
       Weekly summary, Payment receipts
[Save Preferences]

═══════════════════════════════════════════════════════════════════
SECTION I: REAL-TIME IMPLEMENTATION
═══════════════════════════════════════════════════════════════════

USE SUPABASE REALTIME (not Pusher):

In dashboard layout, after auth check:

const setupRealtime = (userId: string) => {
  const channel = supabase
    .channel(`dashboard-${userId}`)
    
    // Activity feed updates
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'activity_log',
      filter: `user_id=eq.${userId}`
    }, handleNewActivity)
    
    // Active calls counter
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'voice_calls',
      filter: `user_id=eq.${userId}`
    }, handleCallChange)
    
    // Agent status changes
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'agents',
      filter: `user_id=eq.${userId}`
    }, handleAgentUpdate)
    
    // New notifications
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, handleNewNotification)
    
    .subscribe()
    
  return channel
}

WHAT UPDATES IN REAL-TIME:
- Activity feed (new items prepend with animation)
- Active Now card count
- Agent health bar status dots
- Notification bell count
- Toast for: appointment_booked, lead_captured (score>70)

═══════════════════════════════════════════════════════════════════
SECTION J: API ROUTES — COMPLETE IMPLEMENTATION
═══════════════════════════════════════════════════════════════════

ALL ROUTES MUST:
1. Create Supabase server client
2. Verify session: const { data: { session } } = await supabase.auth.getSession()
3. If no session: return NextResponse.json({error:'Unauthorized'},{status:401})
4. All queries use session.user.id as user_id
5. Never trust user_id from request body/params
6. Rate limit: use upstash or simple in-memory for now

GET /api/dashboard/stats:
Runs queries [Q2],[Q3],[Q4],[Q5],[Q6],[Q7],[Q8] in parallel
Returns: { voice, minutes, chat, appointments, leads, activeNow, roi }
Cache: 5 minutes (use Next.js cache or manual timestamp)

GET /api/dashboard/activity:
Runs query [Q18]
Returns: { activities: [...] }
No cache (needs to be fresh)

GET /api/dashboard/chart-data?range=7d:
Runs [Q11] and [Q12] based on user's agents
Returns: { callData: [...], chatData: [...] }
Cache: 5 minutes

GET /api/agents:
Runs [Q10]
Returns: { agents: [...] }

PATCH /api/agents/[id]/status:
Body: { status: 'active' | 'inactive' }
Verify: agent.user_id === session.user.id
Update: agents table
Trigger: activity_log entry
Return: { agent: updatedAgent }

GET /api/calls?page=1&limit=25:
Runs [Q15] with pagination
Verify user owns all returned calls (RLS handles this)
Return: { calls: [...], total: n, page: n }

GET /api/calls/[id]/audio:
Verify call belongs to user
Generate signed URL from Supabase Storage
Expires: 3600 seconds
Return: { url: signedUrl }

GET /api/calls/[id]:
Runs [Q23]
Verify ownership
Return: { call: { ...callData, messages: [...] } }

GET /api/conversations?page=1:
Runs [Q16]
Return: { conversations: [...], total: n }

GET /api/appointments?tab=upcoming:
Runs [Q17] or past variant based on tab
Return: { appointments: [...] }

GET /api/leads:
Runs [Q22]
Return: { leads: [...] }

PATCH /api/leads/[id]:
Body: { stage, notes }
Verify ownership
Update leads table
Return: { lead: updatedLead }

GET /api/demo/history:
Runs [Q24]
Return: { demos: [...] }

POST /api/demo/start:
Body: { agent_id, call_type }
Verify: agent belongs to user
Initiate call (placeholder → your actual telephony API)
Return: { session_id, call_id, phone_number }

GET /api/analytics?range=30d:
Runs [Q11],[Q12],[Q13],[Q14] for range
Return: { volume: [...], intent: [...], sentiment: [...] }

GET /api/notifications:
Runs [Q20]
Return: { unread_count, notifications: [...] }

PATCH /api/notifications/read-all:
UPDATE notifications SET is_read = true WHERE user_id = $1
Return: { success: true }

GET /api/billing/subscription:
JOIN subscriptions + plans + subscription_features
Return: { plan, features, usage, renewalDate }

GET /api/billing/invoices:
Query invoices table
Return: { invoices: [...] }

PATCH /api/settings/profile:
Body: profile fields
Validate with Zod
UPDATE profiles WHERE id = session.user.id
Return: { profile: updatedProfile }

═══════════════════════════════════════════════════════════════════
SECTION K: UTILITY FUNCTIONS
═══════════════════════════════════════════════════════════════════

lib/utils/formatters.ts:

// Indian rupee formatting
export const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
  // Output: "₹42,300"
}

// Indian number formatting (with en-IN locale)
export const formatNumber = (n: number): string => {
  if (n >= 100000) return `${(n/100000).toFixed(1)}L`
  if (n >= 1000) return `${(n/1000).toFixed(1)}k`
  return n.toLocaleString('en-IN')
}

// Call duration
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// IST time formatting
export const formatIST = (timestamp: string): string => {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(timestamp))
}

// Time ago in IST
export const timeAgo = (timestamp: string): string => {
  const now = new Date()
  const then = new Date(timestamp)
  const diff = now.getTime() - then.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

// Mask phone number for display
export const maskPhone = (phone: string): string => {
  if (!phone) return 'Unknown'
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
  // "+91 98765 ****"
}

lib/utils/agentDetection.ts:

export interface AgentCapabilities {
  hasVoice: boolean
  hasChat: boolean
  hasWhatsApp: boolean
  hasSocial: boolean
  hasCustom: boolean
  agents: Agent[]
  statCards: string[]
  sidebarItems: string[]
  chartTypes: string[]
  tableTabs: string[]
  demoOptions: string[]
}

export const detectCapabilities = (agents: Agent[]): AgentCapabilities => {
  const hasVoice = agents.some(a => a.agent_type === 'voice' && a.status !== 'error')
  const hasChat = agents.some(a => a.agent_type === 'chat' && a.status !== 'error')
  const hasWhatsApp = agents.some(a => a.agent_type === 'whatsapp' && a.status !== 'error')
  const hasSocial = agents.some(a => a.agent_type === 'social' && a.status !== 'error')
  const hasCustom = agents.some(a => a.agent_type === 'custom' && a.status !== 'error')

  const statCards = [
    hasVoice && 'voice_calls',
    hasVoice && 'voice_minutes', 
    (hasChat || hasWhatsApp) && 'chat_conversations',
    hasWhatsApp && 'whatsapp_messages',
    'appointments',
    'leads',
    'active_now',
    'cost_saved',
  ].filter(Boolean) as string[]

  const sidebarItems = [
    'overview', 'demo', 'agents',
    hasVoice && 'calls',
    (hasChat || hasWhatsApp) && 'conversations',
    hasWhatsApp && 'whatsapp',
    'appointments', 'leads', 'analytics',
    'settings', 'billing', 'support'
  ].filter(Boolean) as string[]

  const demoOptions = [
    hasVoice && 'voice',
    hasChat && 'chat',
  ].filter(Boolean) as string[]

  return {
    hasVoice, hasChat, hasWhatsApp, hasSocial, hasCustom,
    agents, statCards, sidebarItems, 
    chartTypes: [], tableTabs: [], demoOptions
  }
}

lib/utils/roiCalculator.ts:

const ROI_RATES = {
  per_voice_minute: 15,   // ₹15 per minute human cost
  per_chat: 20,           // ₹20 per chat handled
  per_appointment: 200,   // ₹200 per appointment booked
  per_lead: 280,          // ₹280 per lead captured
}

export const calculateROI = (stats: {
  voiceMinutes: number
  chatCount: number
  appointmentsCount: number
  leadsCount: number
  planCost: number
}) => {
  const callsValue = stats.voiceMinutes * ROI_RATES.per_voice_minute
  const chatValue = stats.chatCount * ROI_RATES.per_chat
  const appointmentsValue = stats.appointmentsCount * ROI_RATES.per_appointment
  const leadsValue = stats.leadsCount * ROI_RATES.per_lead
  const totalValue = callsValue + chatValue + appointmentsValue + leadsValue
  const netRoi = totalValue - stats.planCost
  const roiPercentage = stats.planCost > 0 
    ? Math.round((netRoi / stats.planCost) * 100) 
    : 0

  return {
    callsValue, chatValue, appointmentsValue, leadsValue,
    totalValue, netRoi, roiPercentage
  }
}

═══════════════════════════════════════════════════════════════════
SECTION L: CRITICAL UI COMPONENTS
═══════════════════════════════════════════════════════════════════

SkeletonCard.tsx:
Props: { lines?: number, hasChart?: boolean }
Returns pulse-animated placeholder matching real card shape
Use: animate-pulse, bg-white/10 rounded blocks
Never use "Loading..." text, always use skeleton shapes

EmptyState.tsx:
Props: { icon, title, description, actionLabel?, actionHref? }
Design:
  Center-aligned in parent container
  Icon: 48px, text-gray-600
  Title: text-gray-400 font-medium
  Description: text-gray-600 text-sm
  Action button (if provided): outlined purple

ErrorState.tsx:
Props: { message, onRetry }
Design:
  Same as EmptyState but red/orange tones
  AlertCircle icon
  Retry button triggers onRetry callback
  Never show technical error messages to users
  User-friendly: "Something went wrong. Try again."

AudioPlayerModal.tsx:
Props: { call: VoiceCall, onClose: () => void }
Framer motion: AnimatePresence + slide up animation
Full implementation with:
  Waveform visualization (use stored peak data or 
    generate visual from transcript length as proxy)
  Play/pause with Howler.js or native Audio API
  Seek bar with click-to-seek
  Speed control: 0.75x, 1x, 1.25x, 1.5x, 2x
  Transcript sync (highlight current line by timestamp)
  Download button using anchor tag + blob URL

TranscriptDrawer.tsx:
Slides from right side
640px wide on desktop, full width on mobile
Scrollable transcript
Agent vs user message differentiation
Copy full transcript button
Close button (X) top right

═══════════════════════════════════════════════════════════════════
SECTION M: PERFORMANCE & QUALITY RULES
═══════════════════════════════════════════════════════════════════

MANDATORY:

1. ALL PAGES: Use React Suspense + loading.tsx files
   app/dashboard/loading.tsx → Skeleton of dashboard
   app/dashboard/calls/loading.tsx → Skeleton of table

2. ALL DATA FETCHES: Parallel with Promise.all, never sequential

3. ALL NUMBERS: Animate with useCountUp hook on mount
   Simple implementation:
   const useCountUp = (target: number, duration = 1000) => {
     const [count, setCount] = useState(0)
     useEffect(() => {
       let start = 0
       const step = target / (duration / 16)
       const timer = setInterval(() => {
         start += step
         if (start >= target) { setCount(target); clearInterval(timer) }
         else setCount(Math.floor(start))
       }, 16)
       return () => clearInterval(timer)
     }, [target])
     return count
   }

4. ALL FORMS: Loading state on submit button
   Button disabled during submission
   Show spinner (Loader2 from Lucide, animate-spin)
   Toast on success/error (react-hot-toast)

5. NO LAYOUT SHIFT: All cards have fixed heights where possible
   Skeleton same height as real content

6. IMAGES: Next.js Image component always
   Avatar fallback: CSS initials, never broken image

7. ACCESSIBILITY:
   All interactive elements have aria-labels
   Focus rings visible (ring-2 ring-purple-500 on focus)
   
8. ERROR BOUNDARIES: Wrap each dashboard section
   If one section fails, others still render

9. MOBILE: 
   Sidebar: Sheet component (slides from left)
   Tables: Horizontal scroll on mobile
   Charts: Full width, reduced height on mobile
   Bottom nav bar on mobile (not sidebar)

10. CONSOLE: Zero console errors in production
    No uncaught promises
    All async errors have try/catch

═══════════════════════════════════════════════════════════════════
SECTION N: WHAT TO BUILD IN EXACTLY THIS ORDER
═══════════════════════════════════════════════════════════════════

BUILD SEQUENCE (do not skip steps):

STEP 1: Foundation
  ├── Install missing deps (recharts, framer-motion, 
  │   react-hot-toast, date-fns, zustand if not installed)
  ├── Create lib/supabase/client.ts and server.ts
  ├── Create lib/utils/formatters.ts
  ├── Create lib/utils/agentDetection.ts
  ├── Create lib/utils/roiCalculator.ts
  └── Update middleware.ts for auth protection

STEP 2: Delete old, build new auth
  ├── Delete old login page
  ├── Build new app/(auth)/login/page.tsx
  └── Test: Login works, redirects correctly

STEP 3: Dashboard layout shell
  ├── app/dashboard/layout.tsx
  ├── components/dashboard/Sidebar.tsx (conditional nav)
  ├── components/dashboard/Topbar.tsx
  ├── components/ui/SkeletonCard.tsx
  ├── components/ui/EmptyState.tsx
  └── components/ui/ErrorState.tsx

STEP 4: Main dashboard page
  ├── components/dashboard/AgentHealthBar.tsx
  ├── components/dashboard/OnboardingBanner.tsx
  ├── components/dashboard/StatCard.tsx
  ├── components/dashboard/StatCardsGrid.tsx
  ├── app/api/dashboard/stats/route.ts
  └── Test: Stats load correctly for a real user

STEP 5: Charts and tables
  ├── components/dashboard/charts/VolumeChart.tsx
  ├── components/dashboard/charts/IntentChart.tsx
  ├── components/dashboard/CallsTable.tsx
  ├── components/dashboard/ActivityFeed.tsx
  ├── app/api/dashboard/chart-data/route.ts
  ├── app/api/dashboard/activity/route.ts
  └── Wire up realtime subscriptions

STEP 6: Bottom widgets
  ├── components/dashboard/AppointmentsPanel.tsx
  ├── components/dashboard/UsagePanel.tsx
  ├── components/dashboard/ROIWidget.tsx
  └── Assemble final app/dashboard/page.tsx

STEP 7: Demo center
  ├── app/dashboard/demo/page.tsx
  ├── components/demo/VoiceDemo.tsx
  ├── app/api/demo/history/route.ts
  ├── app/api/demo/start/route.ts
  └── components/modals/ShareDemoModal.tsx

STEP 8: Individual pages
  ├── app/dashboard/calls/page.tsx
  ├── app/dashboard/conversations/page.tsx
  ├── app/dashboard/appointments/page.tsx
  ├── app/dashboard/leads/page.tsx
  ├── All related API routes
  └── AudioPlayerModal + TranscriptDrawer

STEP 9: Settings and billing
  ├── All settings pages
  ├── Billing page with GST section
  └── All settings API routes

STEP 10: Polish
  ├── All loading.tsx skeleton screens
  ├── All error.tsx error boundaries
  ├── Mobile responsive pass
  ├── Framer motion animations
  └── Console error cleanup

═══════════════════════════════════════════════════════════════════
SECTION O: ABSOLUTE RULES — NEVER VIOLATE
═══════════════════════════════════════════════════════════════════

1. ZERO FAKE DATA: If no data exists → empty state
   NEVER hard-code example data in production components

2. ZERO BROKEN PAGES: Every page has loading + error states

3. ZERO DATA LEAKS: Every API route verifies ownership
   Supabase RLS is backup, not primary security

4. ZERO WRONG LOCALE: All numbers en-IN, all times IST

5. ZERO GENERIC DASHBOARDS: 
   If client has no voice agent → No voice UI anywhere
   If client has no chat agent → No chat UI anywhere

6. ALWAYS SHOW DEMO: Demo option always visible
   It is the #1 trust builder

7. ALWAYS SHOW ROI: ROI widget always on main dashboard
   It is the #1 retention tool

8. PERFORMANCE: Skeleton before any actual content
   Never blank white flash, never "Loading..." text

9. MOBILE FIRST MENTALLY: Even if building desktop first,
   Test every component on 375px width

10. INDIA FIRST:
    ₹ not $, IST not UTC display, WhatsApp not SMS,
    en-IN formatting, Mon-Sat hours default,
    GST compliance in billing

══════════════════════════════════════════════════════════════════
END OF MASTER PROMPT
══════════════════════════════════════════════════════════════════

This document contains everything needed to build the complete 
Trinetra AI client dashboard. Every component, every API route,
every database query, every design decision is specified above.

Do not add features not specified here.
Do not skip features specified here.
Do not use placeholder data.
Build in the order specified in Section N.
When in doubt, refer back to Section A for aesthetic guidance.