# Dependency Map — "If I change this file, what else does it affect?"

Read as: **file → callers/consumers**. Only cross-module dependencies are
listed. UI-only leaf components are omitted.

## Core cognition

### `src/lib/ai-gateway.server.ts`
Model chokepoint. Changing prompts/model routing affects:
- `src/lib/athena.server.ts` (conversation, reflection)
- `src/lib/introductions.server.ts` (pair reasoning + presentations)
- `src/lib/connections.server.ts` (post-meeting summarization)
- `src/routes/api/tts.ts`, `src/routes/api/stt.ts`

### `src/lib/athena.server.ts` → `src/lib/athena.functions.ts`
`athena.functions.ts` is consumed by:
- `src/routes/_authenticated/athena.tsx` (main conversation UI)
- `src/routes/_authenticated/onboarding.tsx`
- `src/routes/_authenticated/home.tsx` (Today card)
Side effects: writes `interview_sessions`, `understanding_facets`,
`facet_history`, `topic_map`, `user_intelligence`, `athena_usage_log`;
triggers `runMatchmakingForUser`.

### `src/lib/introductions.server.ts` → `src/lib/introductions.functions.ts`
Consumed by:
- `src/routes/_authenticated/introductions.tsx` (Meet list)
- `src/routes/_authenticated/introductions.$id.tsx` (deep "why")
- `src/routes/_authenticated/home.tsx`
Also called from: `athena.functions.ts`, `connections.functions.ts`
(cascade triggers). Writes: `matches`, `introductions`, `introduction_responses`,
`pair_reasoning`, `pair_reasoning_history`.

### `src/lib/connections.server.ts` → `src/lib/connections.functions.ts`
Consumed by:
- `src/routes/_authenticated/connections.tsx`, `connections.$id.tsx`
- `src/routes/_authenticated/messages.$id.tsx` (meeting proposals)
Writes: `connections`, `meeting_proposals`, `partner_perception`,
`post_meeting_reflections`, `reflections`. Cascades to
`refreshStalePairsForUser` in `introductions.server.ts`.

### `src/lib/messaging.server.ts` → `src/lib/messaging.functions.ts`
Consumed by: `messages.tsx`, `messages.$id.tsx`. Writes `messages`,
updates `conversations.last_message_at`.

### `src/lib/moderation.functions.ts`
Consumed by: `src/routes/_authenticated/moderation.tsx`. Reads `reports`,
`safety_flags`, `blocks`. Gated by `has_role(_, 'moderator')`.

### `src/lib/account.functions.ts`
Consumed by: `src/routes/_authenticated/profile.tsx`. Pause/resume/delete;
touches `profiles.is_paused` and cascades a user deletion server-side.

## Supporting modules

### `src/lib/facets.ts` (21-dimension framework metadata)
Consumers: `athena.server.ts`, `introductions.server.ts`,
`introductions.$id.tsx`, `profile.review.tsx`.

### `src/lib/topics.ts` (topic catalog)
Consumers: `athena.server.ts`, `conversations.tsx`.

### `src/lib/utils.ts`, `src/lib/error-*.ts`, `src/lib/lovable-error-reporting.ts`
Utility-only; safe to refactor in place.

## Integrations (DO NOT EDIT — auto-generated)

### `src/integrations/supabase/client.ts` (browser, RLS)
Consumed by nearly every route and hook. Changes require regeneration.

### `src/integrations/supabase/client.server.ts` (service-role)
Consumed by: `introductions.server.ts`, `moderation.functions.ts`,
`account.functions.ts` (only after verifying an authenticated caller).

### `src/integrations/supabase/auth-attacher.ts` / `auth-middleware.ts`
Wired in `src/start.ts` (client middleware) and applied via
`.middleware([requireSupabaseAuth])` on every protected server function.

### `src/integrations/supabase/types.ts`
Consumed everywhere Supabase types are inferred. Regenerate after every
migration.

## Routing

### `src/routes/__root.tsx`
Global layout, PWA install prompt, error boundary. Changes affect every route.

### `src/routes/_authenticated/route.tsx`
Auth + email-verification gate for the entire authenticated tree.

### `src/routeTree.gen.ts`
Generated. Any new file in `src/routes/` regenerates this — never edit by hand.

### `src/router.tsx`, `src/server.ts`, `src/start.ts`
Framework wiring. Touch only when changing router config or middleware chain.

## Database migrations → tables → server modules

| Migration adds/changes                | Feeds …                                                          |
|---------------------------------------|------------------------------------------------------------------|
| `profiles`, `user_intelligence`       | onboarding, athena.server, home                                  |
| `interview_sessions`                  | athena.server, conversations                                     |
| `understanding_facets`, `facet_history` | athena.server, introductions.server (reasoning inputs)         |
| `topic_map`                           | athena.server, conversations                                     |
| `matches`, `introductions`, `introduction_responses` | introductions.server, meet UI                     |
| `pair_reasoning` (+ history)          | introductions.server, introductions.$id                          |
| `connections`, `conversations`, `messages` | connections.server, messaging.server, realtime chat         |
| `partner_perception`, `post_meeting_reflections`, `reflections` | connections.server → stale pair refresh |
| `blocks`, `reports`, `safety_flags`   | messaging UI, moderation dashboard                                |
| `user_roles` + `has_role()`           | moderation gate, RLS policies across many tables                  |
| `athena_usage_log`                    | ai-gateway.server (logging), future billing                       |
| `user_photos`, `profile-photos` bucket | photo-uploader, profile, meet cards                              |

## Change-impact heuristics

- **Change AI prompts** in `ai-gateway.server.ts` → re-verify Athena UX, Meet
  "why" text, and post-meeting summaries.
- **Change a facet definition** in `facets.ts` → re-verify reasoning outputs
  and profile review screen.
- **Add a new public table** → migration must include `GRANT`s + RLS +
  regenerate `types.ts` + update this map.
- **Change auth gating** (`_authenticated/route.tsx`) → verify every protected
  route still loads and no public loader calls a protected server fn.
- **Add a route** → verify `routeTree.gen.ts` regenerated and no duplicate
  index claimants exist.
