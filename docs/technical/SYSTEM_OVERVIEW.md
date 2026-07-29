# Athena — System Overview

How every major subsystem interacts. This is a map, not a spec; each domain has
its own canonical documents (see `docs/README.md`).

## 1. Layered view

```text
┌─────────────────────────────────────────────────────────────────┐
│  Constitution (docs/constitution/)                              │
│  L1 Identity → L2 Ethics → L3 Human Understanding → L4 Epist.   │
│  → L5 Memory → L6a/b/c Cognition → L7 Operations                │
│  Governs every layer below. Never inverted.                     │
└─────────────────────────────────────────────────────────────────┘
             │ referenced (never redefined) by
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Product Architecture (docs/product/)                           │
│  Onboarding · Athena conversation · Meet · Connections · Chats  │
└─────────────────────────────────────────────────────────────────┘
             │ implemented by
             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Technical Architecture (this doc + code)                       │
│  TanStack Start v1 · React 19 · Vite 7 · Tailwind v4 · PWA      │
│  Server functions (createServerFn) + api routes (createFileRoute)│
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│ Data Architecture        │   │ AI Gateway                       │
│ Supabase Postgres + RLS  │   │ src/lib/ai-gateway.server.ts     │
│ Storage · Auth · Realtime│   │ Lovable AI (GPT/Gemini) · TTS/STT│
└──────────────────────────┘   └──────────────────────────────────┘
```

## 2. Runtime request flow

1. Browser (React 19 + TanStack Router) requests a route.
2. `_authenticated/route.tsx` gate verifies Supabase session and email
   verification; unauth users redirect to `/auth`.
3. Route loader/component calls a thin server function (`*.functions.ts`).
4. The server function runs on Cloudflare Workers (workerd) with
   `nodejs_compat`. It reaches server-only helpers in `*.server.ts`.
5. Helpers call the Supabase client:
   - `@/integrations/supabase/client` — authenticated user context, RLS enforced.
   - `@/integrations/supabase/client.server` — service-role for cross-user
     matchmaking reads, gated behind an authenticated caller.
6. AI calls fan out to `ai-gateway.server.ts` → Lovable AI Gateway.
7. Results persist to Postgres; realtime subscriptions push chat updates back.

## 3. Subsystem interactions

### 3.1 Constitution ↔ Product ↔ Code
- Constitution rules are the only source of truth for behavior.
- Product docs describe *what* users experience; they cite constitution anchors.
- Code implements product behavior; comments/tests reference the same anchors
  (e.g., 3-active-intro cap → `L6c-decision-and-introduction.md`).

### 3.2 AI Gateway (`src/lib/ai-gateway.server.ts`)
Central chokepoint for all model calls. Callers:
- `athena.server.ts` — conversation, reflection, topic map updates.
- `introductions.server.ts` — pair reasoning + presentations.
- `connections.server.ts` — post-meeting reflection summarization.
- `api/tts.ts`, `api/stt.ts` — voice I/O for the Athena screen.

Every call is logged to `athena_usage_log` (tokens/seconds) for future billing.

### 3.3 Memory system
Persistent memory of a person lives in five tables and is the substrate for
matchmaking:
- `interview_sessions` — the running Athena transcript.
- `user_intelligence` — synthesized narrative fields (values, direction, style).
- `understanding_facets` (+ `facet_history`) — 21-dimension framework with
  confidence + evidence; history preserves prior states.
- `topic_map` — breadth/depth tracker across ~21 life topics.
- `user_prompts` / `user_photos` / `user_preferences` — declared self.

Write path: every Athena turn calls `reflectAthena` → updates facets, topic map,
and intelligence; on completion marks `last_interview_at` and triggers matchmaking.

### 3.4 Matchmaking engine (`src/lib/introductions.server.ts`)
- Eligibility gate: foundational conversation complete AND ≥ facet threshold AND
  minimum average confidence AND not paused AND < 3 active introductions.
- Candidate scan uses service-role client, then per-pair reasoning is written to
  `pair_reasoning` (+ `pair_reasoning_history` snapshot). Confidence + prose
  drive presentations; there is no hard percentage floor (per L6c).
- Triggers: after `reflectAthena` cadence, after foundational completion, after
  intro responses, after partner perception, after post-meeting reflection.
- Stale pair reasoning is re-run in place (`refreshStalePairsForUser`) when new
  post-meeting signal arrives (see `tg_mark_pair_reasoning_stale_*`).

### 3.5 Relationship engine (`src/lib/connections.server.ts`)
- Mutual accept on an introduction creates a `connection` and (via
  `ensure_conversation_for_connection`) a `conversation` row.
- Messages stream through `messages.functions.ts` with Supabase Realtime.
- After a meeting: `partner_perception` (each side's private read of the other)
  and `post_meeting_reflections` (private journal) feed back into pair reasoning
  and future matchmaking.

### 3.6 Safety
- Blocks (`blocks`), reports (`reports`), and `safety_flags` are surfaced in the
  chat UI and moderation dashboard (`/moderation`, moderator role only via
  `has_role` security-definer function).

## 4. Boundaries & invariants
- Server-only modules end in `.server.ts` and are never imported from client code.
- All new public tables must add `GRANT` statements alongside RLS policies.
- Roles live in `user_roles` (never on `profiles`); checked via `has_role`.
- Do not edit generated files: `src/routeTree.gen.ts`, `src/integrations/supabase/{client,client.server,auth-*,types}.ts`.
