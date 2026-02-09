# Nous Platform - Architecture & Ecosystem

## 1. System Overview
**Nous** is a hybrid SEO platform designed for immersion and performance. It orchestrates user interaction via a globally distributed frontend while leveraging a VPS for heavy computation and centralized data management.

### The "Triad" of Connectivity
1.  **Vercel (Frontend & Edge)**
    *   **Role**: Hosts the Next.js 14+ application. Delivers UI, handles routing, and serves Edge Functions for low-latency AI responses.
    *   **Interaction**: Connects to **Supabase** for data fetch/subscription and **LiveKit Cloud** for media tokens.

2.  **Supabase (The "Brain" / State)**
    *   **Role**: Central Source of Truth.
        *   **Auth**: Manages user sessions (JWT).
        *   **Postgres**: Stores user data, project states, and cached SEO data.
        *   **Realtime**: Pushes state changes (e.g., "Analysis Complete") instantly to the Vercel Frontend without polling.

3.  **LiveKit (The "Voice" / Presence)**
    *   **Role**: Manages real-time audio/video and Voice AI agents.
    *   **Interaction**: The Frontend joins "Rooms". AI Agents (running on VPS or Cloud) join as invisible participants to transcribe or speak.

### Heavy Lifting (BanaHosting VPS)
*   **Role**: The "Muscle".
*   **Responsibilities**:
    *   Running Puppeteer/Selenium for heavy scraping.
    *   Executing long-running Python cron jobs.
    *   Hosting the API for the Desktop Agent (if not peer-to-peer).
*   **Flow**: `VPS Script` -> `Updates Supabase DB` -> `Supabase Realtime` -> `Vercel Frontend UI Update`.

---

## 2. Data Flow & Security

### Frontend <-> Backend
*   **Read**: Next.js Server Components fetch cached data directly from Supabase (standard Postgres connection).
*   **Write**: Server Actions mutate data in Supabase with RLS (Row Level Security) enforcement.
*   **Secrets**: API Keys (Groq, DataForSEO) are stored in Vercel Environment Variables, never exposed to the client.

### Desktop Agent (Tauri)
*   **Auth**: Log in via Supabase (OAuth/Magic Link).
*   **Data**: Pushes local metrics (Time Tracking, Local SERP results) to Supabase.
*   **Security**: Uses a dedicated API Token or Session JWT to talk to the Nous API.

---

## 3. Directory Structure Proposal (Next.js App Router)

We adhere to a **Modular (Feature-First)** architecture to prevent monolithic chaos.

```
/
├── .env.local             # Secrets (Supabase, LiveKit, Groq)
├── README.architecture.md # This file
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js App Router (Routing only)
│   │   ├── (auth)/        # Login, Signup routes
│   │   ├── (platform)/    # Authenticated routes
│   │   │   ├── dashboard/
│   │   │   ├── zen/       # Zen Mode views
│   │   │   └── analysis/  # Analysis Mode views
│   │   ├── api/           # Edge Functions / Webhooks
│   │   └── layout.tsx     # Root Layout (Theme/Context providers)
│   │
│   ├── components/        # Shared UI Primitives (Buttons, Cards - "Atomic")
│   │   ├── ui/
│   │   └── layout/
│   │
│   ├── lib/               # Core Infrastructure & Clients
│   │   ├── supabase/      # Supabase Client creators
│   │   ├── livekit/       # Token generation, room management
│   │   └── ai/            # Groq/Gemini wrappers
│   │
│   └── modules/           # DOMAIN LOGIC (The Core)
│       ├── seo/
│       │   ├── components/ # Charts, Data Tables specific to SEO
│       │   ├── services/   # DataForSEO wrappers, Analysis logic
│       │   └── types.ts
│       │
│       ├── virtual-office/
│       │   ├── components/ # Video tiles, Agent avatars
│       │   └── hooks/      # useRoom, useVoiceAgent
│       │
│       ├── tracker/        # Time tracking logic
│       └── ai-agents/      # Agent orchestration logic
│
└── supabase/              # Migrations, Edge Functions (if used)
```

## 4. Immediate Roadmap (Migration Phase 1)
1.  **Initialize Next.js**: Set up the scaffold with TypeScript and Tailwind.
2.  **Core Connectivity**: Configure `lib/supabase` and `lib/livekit` utilities.
3.  **Layout System**: Implement the "Zen" vs "Analysis" global state (Framer Motion wrapper).
4.  **Subdomain Setup**: Configure `nous.simonsandreaseo.com` DNS to point to Vercel (CNAME).
