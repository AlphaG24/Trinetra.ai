# STATE MANAGEMENT MAP & LIFECYCLE BASELINE — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Protected Baseline**: Maintain separation between edge cookies, client Zustand store, SWR cache, and server authoritative state.

---

## 1. Global & Local State Architecture

```
                                [ CLIENT BROWSER ]
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  [ HttpOnly Cookies ]            [ Zustand Store ]                 [ SWR Cache ]
  - sb-*-auth-token               - `dashboardStore.ts`             - Live campaign metrics
  - Domain: .trinetraedu-ai.com   - Sidebar / Navigation state      - Agent list & stats
  - Lifetime: 7d (user) / 30m     - Active Tenant Org Switcher      - Wallet balance
                                  - Notification Bell Unread        - SWR revalidation
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ▼
                             [ Supabase Realtime WS ]
                             - Channel: public:voice_calls
                             - Channel: public:leads
                             - Channel: public:campaigns
                             - Triggers automatic `mutate()`
                                         │
                                         ▼
                            [ PYTHON BACKEND RUNTIME ]
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
  [ LiveKit Voice Session State ]                                 [ In-Memory Guards ]
  - Room Participant WebRTC Tracks                                - VoiceTimingTracker
  - IntentClassifier State (Support <-> Sales)                   - ToolExecutionGuard
  - Transcript Buffer & Audio Chunks                              - No-Audio Watchdog
  - Appointment Tool Execution Context                            - Active Call Concurrency
```

---

## 2. Detailed State Layer Inventory

### 2.1 Zustand Global Store (`frontend/src/store/dashboardStore.ts`)
- **State Properties**:
  - `selectedOrgId: string | null`: Currently active organization in tenant switcher.
  - `unreadNotificationsCount: number`: Badge count on top navigation bell.
  - `isSidebarCollapsed: boolean`: Layout state for dashboard navigation.
  - `activeAgentSlug: string | null`: Currently edited agent in studio.
- **Persistence**: In-memory React state with optional `localStorage` synchronization for user UI preferences.
- **Reset Condition**: Hard page refresh or user logout (`supabase.auth.signOut()`).
- **Race Condition Safeguard**: Selected organization ID falls back to the primary profile organization if an invalid or unauthenticated ID is present.

---

### 2.2 SWR (Stale-While-Revalidate) Server State Cache
- **Scope**: Used across `/dashboard/overview`, `/dashboard/campaigns`, `/dashboard/billing`, and `/dashboard/leads`.
- **Behavior**:
  - Displays cached data immediately for instant, flicker-free page navigation.
  - Executes background fetch against Next.js API routes (`/api/dashboard/overview`, `/api/billing/wallet`).
  - Integrated with Supabase Realtime: When a new call or lead row is inserted, the WebSocket listener triggers `mutateOverview()` or `mutateCampaigns()`.

---

### 2.3 Supabase Realtime Channels
- **Implementation**: Connected in `frontend/src/app/dashboard/page.tsx` and `campaigns/[id]/page.tsx`.
- **Subscribed Tables**:
  - `voice_calls`: Triggers immediate re-fetch of recent activity table and KPI cards upon call completion.
  - `leads`: Updates lead generation counter and hot lead badges live.
  - `campaigns`: Updates real-time progress bars as the dialer places calls.
- **Lifecycle**: Channels subscribe on component mount (`useEffect`) and unsubscribe on component unmount to prevent memory leaks and zombie socket connections.

---

### 2.4 Browser Cookies & Edge Session State
- **Key Cookies**:
  - `sb-<ref>-auth-token`: Encrypted Supabase Auth JWT token and refresh token.
- **Domain Configuration**: Handled dynamically in `frontend/src/middleware.ts`:
  - Production: `.trinetraedu-ai.com` or `.trinetra.ai` to support seamless SSO across `app.*`, `admin.*`, and apex domain.
  - Localhost / Dev: Default host cookie domain.
- **Security Flags**: `HttpOnly: true`, `SameSite: Lax`, `Secure: true` in production.

---

### 2.5 Server-Side Runtime State (Python FastAPI & LiveKit Agent)

| State Object | Owner Process | Lifetime | Invalidation / Reset Condition |
| :--- | :--- | :--- | :--- |
| **`VoiceTimingTracker`** | `agent.py` session | Duration of single voice call | Cleaned up on participant disconnect |
| **`ToolExecutionGuard`** | Appointment tool thread | Lifetime of active tool call (max 5.0s)| Resets on tool finish or timeout |
| **`InCallNoAudioWatchdog`**| Background asyncio task | Active voice conversation turn | Resets on user speech committed |
| **`Active Call Counter`** | FastAPI in-memory / DB | Concurrent phone calls | Decremented on call hangup / status callback |
| **`Processed Webhooks`** | PostgreSQL table | Permanent idempotency ledger | Retained for 90 days |

---

## 3. Failure & Synchronization Safety Invariants

1. **State Reconciliation**:
   - The database (`wallets.balance`, `phone_numbers.is_assigned`, `voice_calls.status`) is the **authoritative single source of truth**.
   - Client-side optimistic UI updates must ALWAYS be verified against the backend response. If a backend operation fails, SWR automatically rolls back the optimistic state.

2. **Session Desynchronization Guard**:
   - If a client's Supabase session cookie expires while interacting with a page, Next.js Middleware redirects them to `/login?redirect=...`.
   - In Next.js middleware, an 8.0s timeout race guard guarantees that a transient Supabase Auth latency spike never results in a 504 Gateway Hang.
