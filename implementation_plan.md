# Trinetra - Implementation Plan

## Goal
Initialize "Trinetra", a high-performance AI infrastructure platform with a "Terminal Chic" aesthetic.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- UI Library: Shadcn/UI (Base setup)

## Design Guidelines
- **Theme**: Dark Mode Default (Zinc-950 bg, Zinc-50 text)
- **Accents**: Green (#10b981), Amber (#f59e0b)
- **Fonts**: Inter (UI), JetBrains Mono (Code/Data)
- **Aesthetic**: "Terminal Chic" / "Ghost Mode"

## Steps

### 1. Project Initialization
- [x] Initialize Next.js app in current directory with TypeScript, Tailwind, ESLint, App Router.
- [x] Install dependencies: `lucide-react`, `clsx`, `tailwind-merge` (for Shadcn utils).

### 2. Configuration
- [x] Configure `tailwind.config.ts`:
    - Add custom colors (background, foreground, primary, accents).
    - Add font families (Inter, JetBrains Mono).
- [x] Configure `app/layout.tsx`:
    - Import and apply `Inter` and `JetBrains Mono` from `next/font/google`.
    - Apply global dark theme styles.
- [x] Create `lib/utils.ts` for class merging (standard Shadcn pattern).

### 3. Core Pages Implementation
- [x] **Landing Page (`app/page.tsx`)**:
    - Hero section: "Trinetra: The Operating System for Autonomous Business".
    - "Terminal Chic" styling.
- [x] **Dashboard (`app/dashboard/page.tsx`)**:
    - Protected route layout (Mock).
    - Blank sidebar layout structure.

### 4. Authentication
- [x] Install Supabase dependencies (`@supabase/ssr`, `@supabase/supabase-js`).
- [x] Create Supabase helpers:
    - `utils/supabase/server.ts` (Server-side client).
    - `utils/supabase/client.ts` (Client-side client).
- [x] Create Login Page (`app/login/page.tsx`):
    - Design: "Access Terminal", Shadcn Card, "Continue with Google".
    - Aesthetics: Deep black, grid effect.
- [x] Create `.env.example` for required variables.

### 5. Verification
- [x] Verify file structure.
- [ ] Ensure build passes (optional check).
