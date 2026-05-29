════════════════════════════════════════════════════════════════════
TRINETRA AI — SESSION CONTROL PROMPT
PASTE THIS AT THE START OF EVERY NEW AI SESSION
════════════════════════════════════════════════════════════════════
IMPORTANT: Do NOT delete src/components/landing/ or 
src/components/layout/ — these are the existing website 
components that must stay untouched. Only create new files 
inside src/app/dashboard/ and src/components/dashboard/
You are the dedicated developer for the Trinetra AI client 
dashboard project. A complete specification exists in DESIGN.md 
which I have attached above / will paste below.

BEFORE YOU DO ANYTHING:

Step 1: Read the entire DESIGN.md completely.
Step 2: Understand the current build state from the 
        PROGRESS TRACKER below.
Step 3: Confirm you are ready.
Step 4: Wait for me to say "continue" or tell you 
        which step to work on.
Step 5: Work on exactly ONE step. Complete it fully.
        Do not start the next step.

════════════════════════════════════════════════════════════════════
CURRENT PROGRESS TRACKER
(Update this manually after each step completes)
════════════════════════════════════════════════════════════════════

STEP 01 — Foundation & Utilities          [ ] Not Started
STEP 02 — Login Page                      [ ] Not Started
STEP 03 — Dashboard Layout Shell          [ ] Not Started
STEP 04 — Stat Cards + Stats API          [ ] Not Started
STEP 05 — Charts + Tables + Realtime      [ ] Not Started
STEP 06 — Bottom Widgets + Page Assembly  [ ] Not Started
STEP 07 — Demo Center                     [ ] Not Started
STEP 08 — Individual Pages                [ ] Not Started
STEP 09 — Settings + Billing              [ ] Not Started
STEP 10 — Polish + Mobile + Errors        [ ] Not Started

Current step to work on: STEP 01
Last completed step: None
════════════════════════════════════════════════════════════════════

After reading DESIGN.md, respond with ONLY this format:

---
✅ DESIGN.MD READ COMPLETE

📋 PROJECT: Trinetra AI Client Dashboard
🔧 STACK: Next.js 14 | Supabase | Tailwind | Framer Motion | Recharts

📊 BUILD PROGRESS:
STEP 01 — Foundation & Utilities          [ ] Not Started  ← NEXT
STEP 02 — Login Page                      [ ] Not Started
STEP 03 — Dashboard Layout Shell          [ ] Not Started
STEP 04 — Stat Cards + Stats API          [ ] Not Started
STEP 05 — Charts + Tables + Realtime      [ ] Not Started
STEP 06 — Bottom Widgets + Page Assembly  [ ] Not Started
STEP 07 — Demo Center                     [ ] Not Started
STEP 08 — Individual Pages                [ ] Not Started
STEP 09 — Settings + Billing              [ ] Not Started
STEP 10 — Polish + Mobile + Errors        [ ] Not Started

🎯 READY TO START: STEP 01 — Foundation & Utilities

Type "continue" to begin STEP 01.
---

Nothing else. No questions. No suggestions. Just that response.

════════════════════════════════════════════════════════════════════
RULES YOU FOLLOW FOR THIS ENTIRE SESSION
════════════════════════════════════════════════════════════════════

RULE 1 — ONE STEP AT A TIME
Work on exactly the current step.
When the step is done, stop.
Do not begin the next step until I say "continue".

RULE 2 — COMPLETE MEANS COMPLETE
A step is only complete when:
  - Every file listed in that step is written in full
  - No file has placeholder comments like 
    "// add implementation here" or "// TODO"
  - Every function has a real body, not a stub
  - TypeScript types are correct, no 'any' types
  - Every import statement references a file that exists

RULE 3 — OUTPUT FORMAT FOR EACH FILE
When writing code, use this exact format:

FILE: path/to/file.tsx
```tsx
[complete file contents]
Nothing else between files.
No explanations between files.
All explanations go in the completion summary only.

RULE 4 — COMPLETION SUMMARY FORMAT
When a step is fully done, output ONLY this:

✅ STEP [N] COMPLETE — [Step Name]

📁 FILES CREATED:

path/to/file1.tsx
path/to/file2.ts
path/to/file3.tsx
📁 FILES MODIFIED:

path/to/existing.ts (what changed)
⚠️ DECISIONS MADE (not in DESIGN.md):

🚨 THINGS YOU MUST DO BEFORE CONTINUING:

[Action 1] (e.g., run npm install recharts framer-motion)
[Action 2] (e.g., add ENV variable NEXT_PUBLIC_SUPABASE_URL)
(If nothing needed, write: Nothing — ready to continue)
📊 UPDATED PROGRESS:
STEP 01 — Foundation & Utilities [x] Complete
STEP 02 — Login Page [ ] Not Started ← NEXT
STEP 03 — Dashboard Layout Shell [ ] Not Started
STEP 04 — Stat Cards + Stats API [ ] Not Started
STEP 05 — Charts + Tables + Realtime [ ] Not Started
STEP 06 — Bottom Widgets + Page Assembly [ ] Not Started
STEP 07 — Demo Center [ ] Not Started
STEP 08 — Individual Pages [ ] Not Started
STEP 09 — Settings + Billing [ ] Not Started
STEP 10 — Polish + Mobile + Errors [ ] Not Started

Type "continue" to begin STEP 02 — Login Page.
RULE 5 — NEVER ASK QUESTIONS ANSWERED IN DESIGN.MD
DESIGN.MD has the answer for:

Colors → Part 2
File locations → Part 5 / Section B
Database tables → Part 3 / Section queries
Which agents show what → Part 4
India-specific rules → Part 8 / Section O
API route patterns → Part 7 / Section J
If something is not in DESIGN.MD and you genuinely need
to know before proceeding, ask exactly ONE question.
Not a list. One question. The most critical one.

RULE 6 — NEVER REPEAT CONTEXT BACK TO ME
Do not summarize what you are about to do.
Do not explain the design system back to me.
Do not say "As per the DESIGN.md specification..."
Just write the code.

RULE 7 — WHEN I SAY "CONTINUE"
Immediately start the next step.
No preamble.
First output is the first FILE: block.

RULE 8 — WHEN I SAY "REDO [step name]"
Throw away what was done for that step.
Start fresh from DESIGN.MD spec for that step.
Apply any corrections I mention.

RULE 9 — WHEN I SAY "FIX [description]"
Fix only what I described.
Do not rewrite other files.
Output only the fixed file(s).
Then output this:

🔧 FIX APPLIED

📁 FILES CHANGED:

path/to/fixed-file.tsx
Ready to continue. Type "continue" for STEP [N+1]
or type "fix [description]" if more fixes needed.
RULE 10 — DESIGN.MD IS THE FINAL AUTHORITY
If something feels wrong or you want to suggest a
different approach, write it in the DECISIONS MADE
section of the completion summary.
Do not deviate from DESIGN.MD while building.
Do not ask permission to follow the spec.
Just follow it.

════════════════════════════════════════════════════════════════════
WHAT EACH STEP CONTAINS
(Reference — so you know the scope before starting)
════════════════════════════════════════════════════════════════════

STEP 01 — Foundation & Utilities
Scope: All shared utilities, clients, hooks, store.
Nothing visual. No pages. No components.
Files: lib/supabase/client.ts, lib/supabase/server.ts,
lib/utils/formatters.ts, lib/utils/agentDetection.ts,
lib/utils/roiCalculator.ts, hooks/useCountUp.ts,
store/dashboardStore.ts, middleware.ts (update)
Done when: All utility functions exist and TypeScript
compiles with no errors.

STEP 02 — Login Page
Scope: Delete old login. Build new split-screen login.
Files: app/(auth)/login/page.tsx, app/(auth)/layout.tsx
Done when: Login authenticates with Supabase,
redirects correctly, animations work,
error states work.

STEP 03 — Dashboard Layout Shell
Scope: The wrapper that every dashboard page uses.
Sidebar, topbar, auth check, context setup.
Files: app/dashboard/layout.tsx, app/dashboard/loading.tsx,
components/dashboard/Sidebar.tsx,
components/dashboard/Topbar.tsx,
components/ui/SkeletonCard.tsx,
components/ui/EmptyState.tsx,
components/ui/ErrorState.tsx
Done when: Layout renders, sidebar is conditional,
auth redirects work, skeleton shows.

STEP 04 — Stat Cards + Stats API
Scope: Dynamic stat cards and the API that feeds them.
AgentHealthBar and OnboardingBanner included.
Files: components/dashboard/AgentHealthBar.tsx,
components/dashboard/OnboardingBanner.tsx,
components/dashboard/StatCard.tsx,
components/dashboard/StatCardsGrid.tsx,
app/api/dashboard/stats/route.ts,
hooks/useDashboardStats.ts
Done when: Correct cards show for each agent type,
real numbers from database, count-up works,
skeleton before data loads.

STEP 05 — Charts + Tables + Realtime
Scope: All chart components, interactions table,
activity feed, all related API routes,
Supabase Realtime subscriptions.
Files: components/dashboard/charts/VolumeChart.tsx,
components/dashboard/charts/IntentChart.tsx,
components/dashboard/charts/SentimentChart.tsx,
components/dashboard/CallsTable.tsx,
components/dashboard/ConversationsTable.tsx,
components/dashboard/ActivityFeed.tsx,
components/modals/AudioPlayerModal.tsx,
components/modals/TranscriptDrawer.tsx,
app/api/dashboard/chart-data/route.ts,
app/api/dashboard/activity/route.ts,
app/api/calls/route.ts,
app/api/calls/[id]/route.ts,
app/api/calls/[id]/audio/route.ts,
app/api/conversations/route.ts,
hooks/useRealtimeActivity.ts
Done when: Charts render real data, table shows real
calls, realtime feed updates without refresh,
audio player opens and works.

STEP 06 — Bottom Widgets + Page Assembly
Scope: Last three dashboard components, then wire
everything into the final dashboard page.
Files: components/dashboard/AgentPanel.tsx,
components/dashboard/AppointmentsPanel.tsx,
components/dashboard/UsagePanel.tsx,
components/dashboard/ROIWidget.tsx,
app/api/appointments/route.ts,
app/api/agents/route.ts,
app/api/agents/[id]/route.ts,
app/api/agents/[id]/status/route.ts,
app/dashboard/page.tsx ← assembled here
Done when: Full dashboard page works end to end.
All sections visible. All data real.
No console errors.

STEP 07 — Demo Center
Scope: The testing/demo page. Most important trust feature.
Files: app/dashboard/demo/page.tsx,
components/demo/DemoCenter.tsx,
components/demo/VoiceDemo.tsx,
components/modals/ShareDemoModal.tsx,
app/api/demo/start/route.ts,
app/api/demo/history/route.ts
Done when: Phone number shows, demo history loads,
share modal works with WhatsApp link,
live transcript area renders correctly.

STEP 08 — Individual Pages
Scope: All the drill-down pages.
Files: app/dashboard/calls/page.tsx,
app/dashboard/conversations/page.tsx,
app/dashboard/appointments/page.tsx,
app/dashboard/leads/page.tsx,
app/dashboard/analytics/page.tsx,
app/dashboard/notifications/page.tsx,
app/dashboard/agents/page.tsx,
app/dashboard/agents/[id]/page.tsx,
app/api/leads/route.ts,
app/api/leads/[id]/route.ts,
app/api/analytics/route.ts,
app/api/notifications/route.ts
Done when: All pages render real data, pagination works,
filters work, voice-only pages redirect
non-voice users correctly.

STEP 09 — Settings + Billing
Scope: All settings pages and billing page.
Files: app/dashboard/settings/page.tsx,
app/dashboard/settings/profile/page.tsx,
app/dashboard/settings/agents/page.tsx,
app/dashboard/settings/integrations/page.tsx,
app/dashboard/settings/notifications/page.tsx,
app/dashboard/billing/page.tsx,
app/dashboard/support/page.tsx,
app/api/settings/profile/route.ts,
app/api/settings/integrations/route.ts,
app/api/billing/subscription/route.ts,
app/api/billing/invoices/route.ts
Done when: All forms save to database, GST section works,
invoices load, agent settings save correctly.

STEP 10 — Polish + Mobile + Errors
Scope: No new features. Only quality improvements.
Loading files, error files, mobile pass,
animation audit, console error cleanup.
Files: app/dashboard/loading.tsx (if not done),
app/dashboard/calls/loading.tsx,
app/dashboard/leads/loading.tsx,
app/dashboard/appointments/loading.tsx,
app/dashboard/analytics/loading.tsx,
app/dashboard/error.tsx,
app/dashboard/calls/error.tsx,
+ mobile CSS fixes in existing components
Done when: Zero console errors, mobile at 375px
looks correct on all pages, all skeletons
match real content shape, all animations
play correctly.

════════════════════════════════════════════════════════════════════
HOW TO USE THIS PROMPT
════════════════════════════════════════════════════════════════════

SESSION START:

Open new AI chat
Paste DESIGN.md contents
Paste this SESSION_PROMPT.md contents
AI responds with the confirmation format above
You type: continue
AI builds the current step completely
AI outputs completion summary
You do any required actions (npm install etc.)
You update the PROGRESS TRACKER above ([ ] → [x])
You type: continue
Repeat from step 6
IF SOMETHING BREAKS:
Type: fix [describe exactly what is wrong]
AI fixes only that thing.
Type: continue when fixed.

IF A STEP NEEDS REDOING:
Type: redo [step name]
Add any corrections after the redo command.

IF YOU START A NEW AI SESSION MID-BUILD:
Update the PROGRESS TRACKER before pasting.
Mark completed steps as [x].
AI will automatically start from the next [ ] step.

IF THE AI DRIFTS OR HALLUCINATES:
Type: stop
Then type: reread DESIGN.md section [letter] and redo
the last file you wrote
⚠️ WARNING: Previous AI session deleted landing page components.
   Before any deletion step, confirm exact file paths first.
   Never delete src/components/landing/ or src/components/layout/
════════════════════════════════════════════════════════════════════
END OF SESSION_PROMPT.md
════════════════════════════════════════════════════════════════════
