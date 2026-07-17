---
description: Here's a comprehensive prompt for performing a security audit on your codebase:
---


---

## Security Audit Prompt

> Perform a thorough security audit of my entire codebase. Follow these steps in order:
>
> ---
>
> ### Phase 1: Gitignore Audit
>
> 1. Read the current `.gitignore` file and list what's currently being ignored.
> 2. Scan the entire repository for files that should be in `.gitignore` but are currently tracked or missing. Specifically check for:
>    - `.env` and `.env.*` files (local, production, development, example)
>    - `node_modules/` and any package manager lock files that shouldn't be committed
>    - Database files: `.db`, `.sqlite`, `*.sql` dumps, migration backups, Supabase migration snapshots
>    - Build output: `.next/`, `dist/`, `build/`, `out/`, `.vercel/`, `.turbo/`
>    - IDE and editor files: `.vscode/`, `.idea/`, `*.swp`, `*.swo`, `.DS_Store`, `Thumbs.db`
>    - Testing artifacts: `coverage/`, `.nyc_output/`, `cypress/videos/`, `cypress/screenshots/`, `playwright-report/`
>    - Debug logs: `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`
>    - OS-generated files: `.DS_Store`, `Thumbs.db`, `desktop.ini`
>    - Environment and config: `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`, any files containing secrets or credentials
>    - API key files: `serviceAccount.json`, `*.pem`, `*.key`, `credentials.json`
>    - Docker and container artifacts if applicable
>    - Any `.zip`, `.tar`, `.gz` backup archives
> 3. Generate a complete, updated `.gitignore` file with all missing entries. Organize it into clearly commented sections.
> 4. If any sensitive files are currently tracked by git, flag them with clear warnings and provide the exact commands to untrack them.
>
> ---
>
> ### Phase 2: Hardcoded Secrets & Credentials Audit
>
> 1. Scan the entire codebase — every file, every directory — for hardcoded secrets, including:
>    - API keys and tokens (OpenAI, Google, Stripe, Razorpay, Twilio, Vapi, etc.)
>    - Database connection strings and credentials
>    - JWT secrets, session secrets, encryption keys
>    - Supabase anon key, service role key, project URL
>    - OAuth client IDs and client secrets
>    - Webhook signing secrets
>    - SMTP credentials and email service passwords
>    - Any string that looks like a secret (long random strings, base64 encoded values, anything assigned to variables named `secret`, `key`, `token`, `password`, `api_key`)
> 2. Check specifically:
>    - `app/`, `pages/`, `components/`, `lib/`, `utils/`, `config/`, `constants/` directories
>    - All `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.yml`, `.yaml`, `.toml`, `.env` files
>    - Middleware files and API route handlers
>    - Any test files that might contain real credentials instead of mocks
> 3. For every hardcoded secret found:
>    - Report the exact file path and line number
>    - Show the variable name and a masked version of the value (show first 4 and last 4 characters only)
>    - Provide the exact code change needed to replace it with an environment variable
>    - Flag it as CRITICAL, HIGH, MEDIUM, or LOW severity
>
> ---
>
> ### Phase 3: Endpoint & API Exposure Audit
>
> 1. Map all API endpoints in the codebase — both frontend API calls and backend route handlers
> 2. For each endpoint, check:
>    - Is authentication required? If not, should it be?
>    - Is authorization checked (does the user have permission to access this data)?
>    - Is Row Level Security (RLS) properly enforced on the corresponding database operations?
>    - Are rate limits in place?
>    - Is input validated and sanitized?
>    - Are error messages generic (not leaking database structure, stack traces, or internal logic)?
> 3. Flag any endpoint that:
>    - Returns more data than necessary (over-fetching)
>    - Accepts unfiltered user input that touches the database
>    - Exposes internal IDs, database error messages, or stack traces
>    - Is unauthenticated but accesses user data
>    - Uses GET requests for state-changing operations
>
> ---
>
> ### Phase 4: Security Vulnerability Testing
>
> Write and explain the following security tests (provide the actual test code):
>
> **A. SQL Injection Test**
> - Attempt SQL injection on all user-input fields that interact with the database
> - Test vectors: `' OR '1'='1`, `'; DROP TABLE users;--`, `1; SELECT * FROM users`, etc.
> - Verify parameterized queries are used everywhere
> - Flag any string concatenation or template literals used to build SQL queries
>
> **B. Authentication & Authorization Test**
> - Test accessing protected routes without authentication
> - Test accessing another user's data by manipulating IDs in URLs or request bodies
> - Test session token handling — expiration, refresh, tampering
> - Test password reset flow for token reuse and enumeration
> - Test if rate limiting exists on login endpoints
>
> **C. Input Validation Test**
> - Test all form inputs and API parameters with:
>   - Excessively long strings (buffer overflow)
>   - Special characters (`<script>alert('xss')</script>`, `../../../etc/passwd`)
>   - Unicode and emoji characters
>   - Negative numbers where only positive should be accepted
>   - Null, undefined, empty strings
>   - Malformed JSON bodies
>
> **D. Man-in-the-Middle (MITM) Protection Test**
> - Verify all API calls use HTTPS (no hardcoded `http://` endpoints)
> - Check for HSTS headers
> - Verify cookies have `Secure`, `HttpOnly`, and `SameSite` attributes
> - Check certificate pinning or validation practices
> - Verify no mixed content warnings possible
>
> **E. Cross-Site Scripting (XSS) Test**
> - Test reflected XSS via URL parameters
> - Test stored XSS via user input fields (comments, profile data, document names)
> - Check if React's JSX escaping is consistently used (no `dangerouslySetInnerHTML` without sanitization)
> - Check if Content-Security-Policy headers are properly configured
>
> **F. CSRF Protection Test**
> - Verify CSRF tokens are used for state-changing operations
> - Check SameSite cookie attributes
> - Verify Origin and Referer header validation
>
> **G. Dependency Vulnerability Scan**
> - List all dependencies from `package.json`
> - Identify any packages with known CVEs (use your knowledge of common vulnerabilities in popular npm packages)
> - Flag any deprecated or unmaintained packages
> - Suggest safer alternatives for any vulnerable dependencies found
>
> ---
>
> ### Phase 5: Final Report
>
> Produce a structured security audit report with:
>
> 1. **Executive Summary** — Overall security posture in 2-3 sentences
> 2. **Critical Findings** — Issues that must be fixed before launch
> 3. **High Severity Findings** — Issues that should be fixed within a week
> 4. **Medium Severity Findings** — Issues to address in the next sprint
> 5. **Low Severity Findings** — Nice-to-have improvements
> 6. **Updated .gitignore** — Complete file ready to drop in
> 7. **Action Items Checklist** — A prioritized, checkbox-style list of every fix needed
>
> Each finding must include:
> - Severity level
> - File path and line number
> - Description of the vulnerability
> - Step-by-step reproduction (if applicable)
> - The exact code fix required
>
> ---
>
> **Rules:**
> - Do not skip any file or directory
> - Do not assume anything is safe without checking
> - Be thorough — false confidence is more dangerous than known issues
> - When in doubt, flag it
> - Provide actual code for all fixes, not just descriptions
> - If you find credentials, mask them in your report but make it very clear they need to be rotated immediately

---

This prompt is comprehensive and will give you a thorough security audit. If you want me to split it into smaller, more focused prompts (like separate ones for gitignore, secrets scanning, and penetration testing), let me know.