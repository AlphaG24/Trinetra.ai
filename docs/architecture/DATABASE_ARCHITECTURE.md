# DATABASE ARCHITECTURE & FORENSIC SCHEMA AUDIT — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Direct-Database Operating Mode**:
> - Development and runtime point directly at the owner's primary Supabase project.
> - **Zero Remote DDL / Writes by AI**: The AI assistant must provide symmetric `up` and `down` SQL scripts. The owner applies them manually.
> - **Additive Migrations Only**: Never drop, rename, or retype existing columns or tables in production.

---

## 1. Database Overview & Technology Stack

- **Engine**: PostgreSQL 15.x hosted on Supabase (Mumbai `ap-south-1` region)
- **Security**: Row Level Security (RLS) enabled on all public tables
- **Isolation**: Tenant multi-tenancy enforced primarily via `organization_id UUID` or `user_id UUID`
- **Encryption**: Sensitive KYC and BYON credentials encrypted at application layer with AES-256-GCM before persistence
- **Migration Strategy**: 61 ordered migrations in `supabase/migrations/` plus symmetric up/down scripts

---

## 2. Complete Database Table Catalog

### 2.1 Core Telephony & Voice Tables

| Table Name | Primary Key | Key Foreign Keys | Purpose | Who Reads | Who Writes | RLS Policies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`phone_numbers`** | `id UUID` | `assigned_org_id -> organizations(id)`, `assigned_agent_id -> agents(id)` | Virtual phone number registry, carrier allocation, renewal dates, bidding flags | Dashboard, Inbound Webhooks, Dialer | Admin, Purchase Flow, Lifecycle Worker | Tenant can view assigned; Admin full access |
| **`voice_calls`** | `id UUID` | `organization_id -> organizations(id)`, `agent_id -> agents(id)` | Master call logs, duration, recording URL, sentiment, disclosure status | Dashboard analytics, Lead extractor, Call history | Inbound Webhooks, Outbound dialer, Agent post-call | Tenant reads own; Admin reads all |
| **`agents`** | `id UUID` | `organization_id -> organizations(id)` | AI voice agent definitions, system prompt, voice ID, language, gender | Dashboard agent list, Voice router, Agent worker | Customer agent builder, Admin | Tenant CRUD; Public read for marketplace templates |
| **`customer_contacts`** | `id UUID` | `organization_id -> organizations(id)` | Address book of callers and leads, call history notes, greeting memory | Inbound caller lookup, CRM dashboard | Post-call pipeline, CRM contact editor | Tenant reads/writes own contacts |
| **`appointments`** | `id UUID` | `organization_id -> organizations(id)`, `agent_id -> agents(id)` | Scheduled appointment slots booked by AI during calls | Dashboard calendar, Agent availability tool | Agent worker tools, Customer calendar UI | Tenant reads/writes own appointments |
| **`callbacks`** | `id UUID` | `organization_id -> organizations(id)`, `campaign_id -> campaigns(id)` | Callbacks requested by prospects during campaign calls | Callback scheduler worker, Campaign dashboard | Agent worker tools, Scheduler worker | Tenant reads/writes own callbacks |

---

### 2.2 Outbound Campaigns & Telephony Compliance Tables

| Table Name | Primary Key | Key Foreign Keys | Purpose | Who Reads | Who Writes | RLS Policies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`campaigns`** | `id UUID` | `organization_id -> organizations(id)`, `agent_id -> agents(id)` | Outbound calling campaign records, status, schedule, progress counts | Campaign dashboard, Outbound dialer | Customer campaign creator, Dialer worker | Tenant CRUD |
| **`campaign_contacts`**| `id UUID` | `campaign_id -> campaigns(id)` | Individual contacts in campaign, phone, call status, retry count | Dialer worker, Campaign contact table | CSV upload processor, Dialer worker | Tenant CRUD through campaign ownership |
| **`dnd_registry`** | `id UUID` | `organization_id -> organizations(id)` | Internal & TRAI National Do-Not-Call phone registry | Outbound dialer pre-call check | Customer DND manager, Inbound caller opt-out | Tenant CRUD; Global DND records readable by all |
| **`call_disclosure_opt_out_acknowledgments`** | `id UUID` | None | Statutory log of caller recording opt-outs or disclosure exemptions | Compliance auditor, Admin panel | Inbound call disclosure service | Insert-only; Admin read-only |
| **`number_lifecycle_missed_calls`** | `id UUID` | `phone_number_id -> phone_numbers(id)` | Logs inbound calls received while a number is in grace or hold | Digest worker, Admin lifecycle view | Inbound telephony webhook | Tenant owner & Admin read-only |
| **`number_lifecycle_digests`** | `id UUID` | `phone_number_id -> phone_numbers(id)` | Aggregated daily missed-call summaries dispatched to owner | Number lifecycle router, Email worker | Digest generator worker | Tenant owner & Admin read-only |

---

### 2.3 Financial, Wallet & Billing Tables

| Table Name | Primary Key | Key Foreign Keys | Purpose | Who Reads | Who Writes | RLS Policies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`wallets`** | `id UUID` | `organization_id -> organizations(id)` (UNIQUE) | Organization prepaid balance, currency, spend limit | Pre-call checker, Billing UI | Razorpay webhook, Usage decrementer, Admin adjust | Tenant reads own; Admin reads/adjusts with audit |
| **`wallet_transactions`** | `id UUID` | `wallet_id -> wallets(id)` | Immutable ledger of all debits, credits, top-ups, emergency minutes | Billing history UI, Revenue dashboard | Webhook processor, Usage decrementer, Admin | Append-only ledger; Tenant reads own |
| **`invoices`** | `id UUID` | `organization_id -> organizations(id)` | Statutory GST tax invoices (VAK/ series) with CGST/SGST breakdown | Invoice vault UI, PDF downloader | Auto-generated by billing processor | Tenant reads own; Admin / CA review access |
| **`invoice_line_items`** | `id UUID` | `invoice_id -> invoices(id)` | Itemized invoice breakdown (plans, minutes, number renewals) | PDF generator, Invoice detail UI | Invoice generator service | Tenant reads own |
| **`invoice_ca_reviews`** | `id UUID` | `invoice_id -> invoices(id)` | CA audit sign-off, tax period reconciliation notes | CA review dashboard, Admin | Authorized CA / Admin reviewer | Admin & CA reviewer only |
| **`processed_webhook_events`** | `id UUID` | None (`event_id` UNIQUE) | Idempotency log for payment and carrier webhooks | Razorpay / Carrier webhook handlers | Webhook service | System write/read only |

---

### 2.4 Security, KYC & Administration Tables

| Table Name | Primary Key | Key Foreign Keys | Purpose | Who Reads | Who Writes | RLS Policies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`profiles`** | `id UUID` | References `auth.users(id)` | User metadata, role (`customer`, `developer_tester`, `admin`), reliability score | Middleware, Auth hooks, Billing UI | User profile editor, Auth trigger, Admin | User reads own; Admin reads all; Role edit restricted |
| **`kyc_documents`** | `id UUID` | `organization_id -> organizations(id)` | Encrypted statutory KYC documents, doc type, verification status | Admin KYC review, Profile KYC tab | Customer upload flow, Admin review | Tenant reads own status; Admin views via step-up |
| **`kyc_access_audit_logs`** | `id UUID` | `document_id -> kyc_documents(id)` | Immutable audit record of every KYC document view or URL generation | Security audit dashboard | KYC vault service | Write-once, append-only; Admin read-only |
| **`admin_audit_trail`** | `id UUID` | `admin_user_id -> profiles(id)` | Immutable audit log of all privileged administrative actions | Admin audit viewer | Admin auth service, Admin operations | Append-only; Admin read-only |
| **`byon_carrier_credentials`** | `id UUID` | `organization_id -> organizations(id)` | Encrypted third-party Twilio / Exotel API credentials | BYON sync worker, Dialing engine | Customer integration settings | Encrypted at rest; Tenant CRUD; Secrets masked |
| **`byon_phone_numbers`** | `id UUID` | `credential_id -> byon_carrier_credentials(id)` | Customer-owned virtual numbers synced from BYON carriers | Dashboard number selector | BYON sync worker | Tenant reads/assigns own |
| **`support_tickets`** | `id UUID` | `organization_id -> organizations(id)` | Support ticket queue (CFU setup, porting, billing, KYC) | Customer support UI, Admin queue | Customer creator, Admin replier | Tenant reads own; Admin reads/updates all |
| **`system_config`** | `key TEXT` | None | Global key-value operational configuration, feature toggles, maintenance mode | Backend services, Next.js API | Admin super-admin panel | Public read of non-secrets; Admin write |

---

### 2.5 Educational, Content & Marketplace Tables

| Table Name | Primary Key | Key Foreign Keys | Purpose | Who Reads | Who Writes | RLS Policies |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`available_agents`** | `id UUID` | None | Public marketplace agent templates (coaching counselor, real estate, salon) | Marketplace UI, Onboarding | Admin catalog manager | Public read; Admin write |
| **`prompt_templates`** | `id UUID` | None | Reusable prompt personas and educational exam consultation templates | Agent creator, Prompt enhancer | Admin prompt editor | Public / Tenant read; Admin write |
| **`product_bundles`** | `id UUID` | None | Bundled pricing packages (Agent + Virtual Number + Minutes) | Checkout UI, Pricing page | Admin pricing manager | Public read; Admin write |
| **`subscribers`** | `id UUID` | None | Newsletter and marketing blog subscribers | Blog admin, Email broadcast | Public newsletter signup form | Admin read; Public insert |
| **`banned_words`** | `id UUID` | None | Content moderation dictionary for blog comments and user prompts | Blog AI router, PromptGuard | Admin moderation UI | System read; Admin write |

---

## 3. Database Dependency Matrix

| Table | Read By Subsystems | Written By Subsystems | Depends On Tables | Criticality Level |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Auth, Middleware, Billing, Admin | Auth triggers, User profile, Admin | `auth.users` | **CRITICAL** |
| `organizations` | All tenant features | Onboarding, Registration | `profiles` | **CRITICAL** |
| `wallets` | Dialer, Voice agent, Billing, Admin | Topup webhook, Usage decrementer | `organizations` | **CRITICAL** |
| `wallet_transactions` | Billing history, Invoice generator | Webhook service, Usage engine | `wallets` | **CRITICAL** |
| `phone_numbers` | Inbound router, Outbound dialer | Carrier provisioning, Admin, Renewal | `organizations`, `agents` | **CRITICAL** |
| `voice_calls` | Analytics, Leads, Contacts, Billing | Webhooks, Voice agent, Dialer | `organizations`, `agents` | **CRITICAL** |
| `agents` | WebRTC demo, Telephony, Voice worker| Agent studio, Setup wizard | `organizations` | **CRITICAL** |
| `campaigns` | Campaign UI, Dialer worker | Campaign creator, Dialer worker | `organizations`, `agents` | **HIGH** |
| `campaign_contacts` | Dialer worker, Campaign reports | CSV parser, Dialer worker | `campaigns` | **HIGH** |
| `customer_contacts` | Inbound caller lookup, CRM UI | Post-call extractor, Contact editor | `organizations` | **HIGH** |
| `kyc_documents` | Admin review, Profile KYC | Customer upload, Admin review | `organizations` | **CRITICAL** |
| `invoices` | Billing vault, CA review | Invoice generator service | `organizations` | **HIGH** |
| `support_tickets` | Support UI, Admin triage queue | Customer, Admin | `organizations` | **MEDIUM** |
| `system_config` | All backend & frontend services | Admin super-admin | None | **HIGH** |

---

## 4. Database Forensic Risks & Invariants

1. **Transaction Boundaries**:
   - Wallet deduction during usage must remain strictly atomic (`UPDATE wallets SET balance = balance - ... WHERE id = ... AND balance >= ...`).
   - Section 18.9: Active in-call minutes must never trigger an abort transaction mid-call.

2. **Index Optimization**:
   - High-throughput lookup indexes verified:
     - `idx_phone_numbers_phone_number` on `phone_numbers(phone_number)`
     - `idx_voice_calls_org_created` on `voice_calls(organization_id, created_at DESC)`
     - `idx_customer_contacts_phone_org` on `customer_contacts(phone, organization_id)`
     - `idx_wallets_org_id` on `wallets(organization_id)`
     - `idx_kyc_docs_org_status` on `kyc_documents(organization_id, status)`

3. **RLS Performance Safeguard**:
   - In Supabase, RLS policies that invoke subqueries on other tables must use indexed foreign keys to prevent sequential table scans during high concurrency.
   - Background worker queries (e.g. `number_lifecycle_service.py` and `agent.py`) use `supabase_admin` (Service Role Key) to execute authoritative system queries without RLS latency overhead.

4. **Zero Remote DDL Invariant**:
   - Any schema modification must be created as an additive SQL migration with a corresponding down-migration script before execution.
