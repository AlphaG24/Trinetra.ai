# ENVIRONMENT VARIABLES INVENTORY & CONFIGURATION BASELINE

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: `.env.example` (Backend & Frontend) & Codebase References  
> **Rule**: Never expose plaintext secrets in documentation or logs. Frontend visibility requires strict `NEXT_PUBLIC_` auditing.

---

## 1. Secrets Hygiene Audit & Verification

- **Git Tracking Check**: Verified that `.env` and `.env.local` are listed in `.gitignore`.
- **Hardcoded Secret Scan**: Completed scan of repository source code.
  - No active plaintext production API keys found committed in tracked files.
  - Sample test keys (`devkey`, `secret`) in `.env.example` templates represent standard local development placeholders.
  - Warning: Pre-commit hook in `scripts/setup-hooks.sh` blocks future commits of any file matching `.env*` except `.env.example`.

---

## 2. Master Environment Variables Registry

### 2.1 Backend Environment Variables (`backend/.env`)

| Variable Name | Purpose | Visibility | Required / Optional | Where Used | Security Sensitivity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SUPABASE_URL`** | Supabase project REST/PostgreSQL API URL | Backend Only | **REQUIRED** | `backend/database.py` | Low (URL endpoint) |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Elevated service role key bypassing RLS | Backend Only | **REQUIRED** | `backend/database.py`, workers | **CRITICAL (Full DB Access)** |
| **`SUPABASE_ANON_KEY`** | Supabase public anonymous API key | Backend Only | Optional (Fallback) | `backend/database.py` | Medium |
| **`LIVEKIT_URL`** | LiveKit WebRTC server WebSocket URL | Backend Only | **REQUIRED** | `backend/agent.py`, `voice_router.py` | Medium |
| **`LIVEKIT_API_KEY`** | LiveKit project API key | Backend Only | **REQUIRED** | `backend/agent.py`, `voice_router.py` | **HIGH** |
| **`LIVEKIT_API_SECRET`** | LiveKit cryptographic secret | Backend Only | **REQUIRED** | `backend/agent.py`, `voice_router.py` | **CRITICAL** |
| **`SARVAM_API_KEY`** | Sarvam AI Indic Speech-to-Text & Text-to-Speech API key | Backend Only | **REQUIRED** | `backend/agent.py`, `voice_router.py` | **HIGH** |
| **`ELEVENLABS_API_KEY`** | ElevenLabs global voice synthesis API key | Backend Only | Optional (English) | `backend/agent.py` | **HIGH** |
| **`DEEPGRAM_API_KEY`** | Deepgram English Speech-to-Text API key | Backend Only | Optional (English) | `backend/agent.py` | **HIGH** |
| **`GROQ_API_KEY`** | Groq ultra-low latency LLaMA 3.3 LLM API key | Backend Only | **REQUIRED** | `backend/agent.py`, `blog_ai_router.py` | **HIGH** |
| **`GOOGLE_API_KEY`** | Google Gemini 2.0 Flash LLM API key | Backend Only | Optional | `backend/agent.py` | **HIGH** |
| **`TWILIO_ACCOUNT_SID`** | Twilio master carrier account identifier | Backend Only | Optional (BYON/Master) | `backend/telephony_router.py` | **HIGH** |
| **`TWILIO_AUTH_TOKEN`** | Twilio master authentication token | Backend Only | Optional (BYON/Master) | `backend/telephony_router.py` | **CRITICAL** |
| **`EXOTEL_API_KEY`** | Exotel Indian telephony API key | Backend Only | Optional (Domestic) | `backend/telephony_router.py` | **HIGH** |
| **`EXOTEL_API_TOKEN`** | Exotel Indian telephony authentication token | Backend Only | Optional (Domestic) | `backend/telephony_router.py` | **CRITICAL** |
| **`EXOTEL_SUB_ACCOUNT`** | Exotel virtual account identifier | Backend Only | Optional (Domestic) | `backend/telephony_router.py` | Medium |
| **`RAZORPAY_KEY_ID`** | Razorpay merchant API key ID | Backend Only | **REQUIRED** | `backend/app/services/wallet_service.py` | Medium |
| **`RAZORPAY_KEY_SECRET`** | Razorpay merchant API secret | Backend Only | **REQUIRED** | `backend/app/services/wallet_service.py` | **CRITICAL** |
| **`RAZORPAY_WEBHOOK_SECRET`** | HMAC secret for verifying incoming payment webhooks | Backend Only | **REQUIRED** | `backend/app/routers/wallet_router.py` | **CRITICAL** |
| **`TELEGRAM_BOT_TOKEN`** | Telegram bot token for real-time lead and error alerts | Backend Only | Optional | `backend/app/services/notification_service.py` | **HIGH** |
| **`TELEGRAM_CHAT_ID`** | Target Telegram chat ID for administrative alerts | Backend Only | Optional | `backend/app/services/notification_service.py` | Medium |
| **`SENTRY_DSN`** | Sentry error tracking ingestion DSN | Backend Only | Optional | `backend/app/services/observability_service.py` | Low |
| **`ENCRYPTION_KEY`** | AES-256 master key for BYON & KYC document encryption | Backend Only | **REQUIRED** | `backend/app/services/kyc_vault_service.py` | **CRITICAL** |

---

### 2.2 Frontend Environment Variables (`frontend/.env.local`)

| Variable Name | Purpose | Visibility | Required / Optional | Where Used | Security Sensitivity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`NEXT_PUBLIC_SUPABASE_URL`** | Supabase project URL for browser client & SSR | **PUBLIC (Client)** | **REQUIRED** | `@/utils/supabase/client.ts` | Low |
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | Supabase anonymous key for browser client & SSR | **PUBLIC (Client)** | **REQUIRED** | `@/utils/supabase/client.ts` | Medium (Protected by RLS) |
| **`SUPABASE_SERVICE_ROLE_KEY`** | Elevated service role key for Next.js API admin operations | Backend Only | **REQUIRED** | `@/utils/supabase/admin.ts` | **CRITICAL (Never expose client-side)** |
| **`NEXT_PUBLIC_BACKEND_URL`** | URL of the FastAPI backend router (`https://api.trinetraedu-ai.com`)| **PUBLIC (Client)** | **REQUIRED** | API client helpers, rewrites | Low |
| **`NEXT_PUBLIC_SITE_URL`** | Base canonical URL of the web application | **PUBLIC (Client)** | **REQUIRED** | Sitemap, robots, OpenGraph | Low |
| **`NEXT_PUBLIC_RAZORPAY_KEY_ID`** | Razorpay public key ID for client-side checkout modal | **PUBLIC (Client)** | **REQUIRED** | Checkout modal component | Low (Public key) |
| **`RESEND_PRIVATE_KEY`** | Resend API key for transactional emails & digests | Backend Only | Optional | `frontend/lib/email.ts` | **HIGH** |
| **`ADMIN_PASSWORD`** | Administrative step-up verification credential | Backend Only | **REQUIRED** | `frontend/src/app/api/admin/step-up` | **CRITICAL (Never prefix with NEXT_PUBLIC_)** |
| **`ENABLE_HSTS`** | Toggles HTTP Strict Transport Security header | Backend Only | Optional (Prod only)| `frontend/next.config.ts` | Low |
| **`BROADCAST_WEBHOOK_SECRET`** | Secret validating internal broadcast webhook dispatches | Backend Only | Optional | `frontend/src/app/api/broadcast-email` | **HIGH** |

---

## 3. Configuration Guardrails

1. **Strict Prefix Auditing**:
   - Variables prefixed with `NEXT_PUBLIC_` are bundled directly into client-side JavaScript.
   - **RULE**: NEVER prefix private keys (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `RAZORPAY_KEY_SECRET`, `ENCRYPTION_KEY`) with `NEXT_PUBLIC_`.

2. **IPv4 Networking Directive**:
   - `dns.setDefaultResultOrder("ipv4first")` in `frontend/next.config.ts` and `_getaddrinfo_ipv4_first` in `backend/database.py` guarantee that network connections resolve using IPv4 to avoid latency penalties on cloud providers.
