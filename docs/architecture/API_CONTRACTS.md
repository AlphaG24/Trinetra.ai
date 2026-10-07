# API CONTRACT INVENTORY & INTERFACE BASELINE — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Rule**: APIs are contracts. Future modifications must preserve backward compatibility.

---

## 1. FastAPI Backend API Contracts (Port 8000 / api.trinetraedu-ai.com)

### 1.1 Voice & Telephony Webhooks

#### `POST /livekit-token` (and `POST /api/voice/livekit-token`)
- **Purpose**: Generates an authenticated LiveKit room access token for client browser WebRTC demo or telephony bridging.
- **Auth**: User JWT cookie / bearer token or internal server request.
- **Request Body**: `{ "room_name": "string", "participant_name": "string", "agent_id": "UUID", "is_admin": false }`
- **Response**: `{ "token": "jwt_string", "ws_url": "wss://..." }`
- **Errors**: `400 Bad Request`, `401 Unauthorized`, `500 Internal Server Error`
- **DB Operations**: Reads `agents`, `organizations` to verify quota and voice configuration.
- **Callers**: `frontend/src/app/dashboard/agents/[slug]/demo/page.tsx`, `frontend/src/components/demo/VoiceDemo.tsx`

#### `GET/POST /webhooks/voice/exotel` & `/webhooks/voice/exotel/{organization_id}`
- **Purpose**: Inbound PSTN call webhook from Exotel domestic carrier. Resolves assigned agent, validates concurrency, and responds with ExoML.
- **Auth**: Exotel carrier request (header signature / IP allowlist).
- **Parameters**: Query/Form: `CallSid`, `From`, `To`, `CallType`, `Direction`.
- **Response**: ExoML XML response streaming audio to WebSocket endpoint.
- **DB Operations**: Reads `phone_numbers`, `agents`, `customer_contacts`, `wallets`. Writes initial record to `voice_calls`.
- **Callers**: Exotel telephony infrastructure.

#### `GET/POST /webhooks/voice/twilio` & `/webhooks/voice/twilio/{organization_id}`
- **Purpose**: Inbound PSTN call webhook from Twilio global carrier. Resolves assigned agent, handles expiry neutrality, and responds with TwiML.
- **Auth**: Twilio signature verification (`X-Twilio-Signature`).
- **Parameters**: Form: `CallSid`, `From`, `To`, `CallStatus`, `Direction`.
- **Response**: TwiML XML response streaming audio via `<Connect><Stream url="...">`.
- **DB Operations**: Reads `phone_numbers`, `agents`, `customer_contacts`, `wallets`. Writes initial record to `voice_calls`.
- **Callers**: Twilio telephony infrastructure.

#### `WebSocket /webhooks/voice/exotel/stream` & `/webhooks/voice/twilio/stream/{room_name}`
- **Purpose**: Full-duplex raw audio streaming between telephony carrier and LiveKit voice agent worker.
- **Auth**: Validated carrier stream handshake.
- **Protocols**: WebSocket bidirectional binary audio (8kHz/16kHz PCM/mu-law).
- **Callers**: Exotel / Twilio voice streaming gateways.

---

### 1.2 Wallet & Payment Webhooks

#### `POST /webhooks/razorpay`
- **Purpose**: Asynchronous payment notification webhook for wallet top-ups, number purchases, and renewals.
- **Auth**: HMAC SHA-256 signature verification via `X-Razorpay-Signature`.
- **Request Body**: Razorpay event payload (`payment.captured`, `order.paid`).
- **Response**: `{"status": "ok", "event_id": "..."}`
- **Invariants**: Idempotent processing via `processed_webhook_events`. Never double-credits wallet.
- **DB Operations**: Inserts `processed_webhook_events`, updates `wallets`, inserts `wallet_transactions`, inserts `invoices`.
- **Callers**: Razorpay Webhook Gateway.

#### `GET /api/wallet/balance`
- **Purpose**: Fetches the current organization prepaid wallet balance, currency, spend limit, and reliability score.
- **Auth**: Authenticated session; tenant-isolated.
- **Response**: `{"balance_inr": 1500.0, "currency": "INR", "spend_limit": 2500.0, "reliability_score": 85, "emergency_minutes_available": true}`
- **Callers**: Dashboard billing widgets.

#### `POST /api/wallet/pre-call-check`
- **Purpose**: Pre-call check validating whether an outbound or inbound call is permitted to start based on quota or wallet balance.
- **Auth**: Authenticated session or carrier internal request.
- **Request Body**: `{"organization_id": "UUID", "phone_number": "string"}`
- **Response**: `{"allowed": true, "reason": "OK", "balance": 1500.0}`
- **Rule**: Section 18.9: Strictly returns `allowed: true` for active in-progress calls. Only blocks subsequent new calls.

#### `POST /api/wallet/emergency-minutes/claim`
- **Purpose**: Allows eligible customers (Reliability Score > 80, 30-day cooldown) to claim 50 free overdraft buffer minutes when quota hits 100%.
- **Auth**: Authenticated tenant owner.
- **Response**: `{"success": true, "minutes_credited": 50, "next_claim_allowed_at": "..."}`
- **Callers**: Billing page emergency banner.

---

### 1.3 Outbound Campaigns & Telephony API

#### `POST /api/campaigns`
- **Purpose**: Creates a new outbound dialing campaign with uploaded contact list and consent attestation.
- **Auth**: Authenticated customer or admin.
- **Request Body**: Multipart form data with campaign name, agent ID, contacts CSV, schedule, and `consent_attestation: true`.
- **Response**: `{"id": "UUID", "name": "...", "total_contacts": 150, "status": "draft"}`
- **DB Operations**: Inserts `campaigns`, batch inserts `campaign_contacts`.
- **Callers**: `/dashboard/campaigns` modal.

#### `POST /api/campaigns/{id}/start` & `POST /api/campaigns/{id}/pause`
- **Purpose**: Starts or pauses the campaign background dialing worker.
- **Auth**: Campaign owner.
- **Enforcements**: Pre-call TRAI curfew (09:00–21:00) check, DND scrub against `dnd_registry`.
- **Callers**: Campaign detail page.

---

### 1.4 Virtual Number Lifecycle & BYON

#### `POST /api/numbers/{id}/expire`
- **Purpose**: Triggers virtual number expiration, transitions state to 15-day grace, and sets neutral unavailable announcement.
- **Auth**: System lifecycle worker / Admin.
- **Callers**: Automated number lifecycle service (`backend/app/services/number_lifecycle_service.py`).

#### `POST /api/numbers/{id}/reactivate`
- **Purpose**: One-click reactivation of a number currently in grace or administrative hold upon successful renewal payment.
- **Auth**: Verified number owner.
- **Callers**: Reactivation link in missed-call daily digest.

#### `POST /api/byon/credentials`
- **Purpose**: Vaults customer third-party Twilio or Exotel API credentials with AES-256 encryption.
- **Auth**: Authenticated tenant owner.
- **Request Body**: `{"carrier": "twilio|exotel", "account_sid": "...", "auth_token": "...", "friendly_name": "..."}`
- **Callers**: Integration settings UI.

---

### 1.5 Encrypted KYC Vault & Admin Operations

#### `POST /api/kyc/upload`
- **Purpose**: Uploads statutory KYC verification document (PAN/GST/Passport/Business ID). Raw Aadhaar prohibited by default.
- **Auth**: Authenticated tenant owner.
- **Request Body**: Multipart document file + metadata (`doc_type`, `country_code`).
- **Response**: `{"document_id": "UUID", "status": "pending_review"}`
- **Callers**: `/dashboard/kyc`.

#### `POST /api/kyc/documents/{id}/signed-url`
- **Purpose**: Generates a short-lived (<= 15 min) pre-signed URL to decrypt and view a KYC document.
- **Auth**: Admin only (`developer_tester` returns 403 Forbidden). Requires step-up re-authentication token.
- **Side Effect**: Immutably logs view action to `kyc_access_audit_logs`.
- **Callers**: `/admin/kyc` document viewer modal.

#### `POST /api/admin/step-up`
- **Purpose**: Validates admin password / TOTP challenge and issues a 15-minute privileged action token.
- **Auth**: Authenticated admin session.
- **Request Body**: `{"password": "...", "totp_code": "..."}`
- **Response**: `{"step_up_token": "jwt_string", "expires_in_seconds": 900}`
- **Callers**: Admin panel before executing KYC view, wallet adjustment, or price change.

---

### 1.6 Statutory Caller Rights & Data Retention

#### `POST /api/caller-rights/search` & `POST /api/caller-rights/delete`
- **Purpose**: Executes Data Subject Access Requests (DSAR). Searches or irreversibly scrubs caller personal records, call logs, transcripts, and CRM contacts for a given phone number.
- **Auth**: Verified caller DSAR request or Admin.
- **Invariant**: Financial billing invoices (`invoices`) are statutorily retained and NOT deleted.
- **Callers**: Privacy compliance officer / Admin.

---

## 2. Next.js App Router API Routes (`frontend/src/app/api/`)

| Route Path | HTTP Method | Primary Responsibility | Auth Required | Backend Proxy / Direct Supabase |
| :--- | :--- | :--- | :--- | :--- |
| `/api/voice/livekit-token` | `POST` | Fetches LiveKit WebRTC access token | Yes | Proxies to FastAPI `/livekit-token` |
| `/api/billing/topup` | `POST` | Creates Razorpay order for wallet top-up | Yes | Direct Razorpay SDK + Supabase |
| `/api/billing/verify-payment`| `POST` | Validates Razorpay payment signature | Yes | Direct Supabase wallet update |
| `/api/billing/invoices/download`| `GET` | Fetches and streams GST invoice PDF | Yes | Proxies to FastAPI `/api/invoices/{id}/pdf` |
| `/api/phone-numbers/available` | `GET` | Lists available virtual numbers in pool | Yes | Direct Supabase query |
| `/api/phone-numbers/purchase` | `POST` | Completes virtual number purchase checkout | Yes | Direct Supabase + Razorpay |
| `/api/phone-numbers/[id]/renew`| `POST` | Extends virtual number 30-day renewal | Yes | Direct Supabase + Webhook |
| `/api/phone-numbers/[id]/bid` | `POST` | Places priority auction bid on expired number| Yes | Direct Supabase |
| `/api/campaigns` | `GET`, `POST`| Lists or creates outbound dialing campaigns | Yes | Direct Supabase + FastAPI dialer |
| `/api/campaigns/[id]/start` | `POST` | Starts outbound campaign dialing worker | Yes | Proxies to FastAPI `/api/campaigns/{id}/start` |
| `/api/kyc` | `GET`, `POST`| Fetches KYC status or uploads document | Yes | Direct Supabase Storage + FastAPI |
| `/api/admin/step-up` | `POST` | Executes privileged admin re-authentication | Yes (Admin) | Direct Supabase Auth + JWT |
| `/api/admin/kyc/[id]/signed-url`| `GET` | Obtains short-lived KYC download link | Yes (Admin) | Proxies to FastAPI KYC vault |
| `/api/support/tickets` | `GET`, `POST`| Creates or lists CFU support tickets | Yes | Direct Supabase |
| `/api/support/tickets/[id]/reply`| `POST`| Appends response to ticket thread | Yes | Direct Supabase |
| `/api/blog/enhance` | `POST` | Enhances blog draft using AI | Yes | Proxies to FastAPI `/api/blog/enhance` |
| `/api/public/config` | `GET` | Fetches non-sensitive public platform config | No | Direct Supabase `system_config` |

---

## 3. Backward Compatibility & Extension Rules

1. **Strict Immutability**: Endpoint paths, HTTP methods, and parameter schemas cannot be modified without impact analysis.
2. **Additive Extensibility**: New fields may only be appended to existing JSON responses as optional keys. Existing response fields must never be removed or renamed.
3. **Status Code Standardization**:
   - `200 OK`: Successful synchronous operation.
   - `201 Created`: Resource successfully created.
   - `400 Bad Request`: Validation failure with structured `{ "error": "...", "detail": "..." }`.
   - `401 Unauthorized`: Missing or invalid session/token.
   - `403 Forbidden`: Role permission failure or step-up authentication required.
   - `404 Not Found`: Target entity not found in tenant scope.
   - `429 Too Many Requests`: Rate limit threshold exceeded.
   - `500 Internal Server Error`: Unhandled server exception (scrubbed of internal stack traces).
