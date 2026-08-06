# Relationship Intelligence — Whole-Product Handoff Brief

Paste this into a fresh ChatGPT thread to bring it fully up to speed on the **entire application**,
not just Athena's mind. Companion document: `docs/CHATGPT-HANDOFF.md` (Athena's constitution + university).

---

## 1. What we are building

**Relationship Intelligence** is a mobile-first application whose product surface is a matchmaker named
**Athena**. It is not a swiping app, not a dating feed, and not a scoring engine.

**Ultimate Goal (permanent, verbatim):**
> To develop an ever-deepening understanding of human compatibility so that every introduction has the
> highest possible probability of becoming a healthy, enduring, and deeply fulfilling relationship experience.

**Success measure:** the quality, health, and longevity of relationships formed — never the number of
introductions, matches, messages, or sessions.

**Core loop:** Understanding precedes matching. Athena talks with a member continuously, builds a Living
Profile, and only introduces people when she has genuine confidence in compatibility — never on a timer.

---

## 2. Two constitutions (important distinction)

The project has **two** governing bodies of doctrine. They are separate and must stay separate.

| | **Athena Constitution** | **Product / Platform Architecture** |
|---|---|---|
| Location | `docs/constitution/` (L1–L7 + cross-cutting) | `docs/product/`, `docs/technical/`, `docs/business/`, `docs/security/`, `docs/engineering/` |
| Governs | Who Athena *is*: identity, ethics, understanding, epistemics, memory, cognition, operations | What the *app* is: screens, flows, data model, membership, safety, delivery |
| Authority | Highest. Product may never contradict it | Subordinate to the Athena Constitution |
| Amended by | Explicit constitutional directives from the founder | Normal product decisions |

Below the Athena Constitution sits the **Canonical Curriculum** (`docs/education/` — Athena University).
Curriculum informs judgment; it can never amend identity. **Constitution outranks Curriculum, always.**

### Athena Constitution — the seven fixed layers
1. **L1 Identity** — who Athena is, her voice, her permanence
2. **L2 Ethics** — the Ethical Constitution; non-negotiable boundaries
3. **L3 Human Understanding** — the Human Understanding Model v2.0 (21 dimensions, 4 families)
4. **L4 Epistemics** — how she knows what she knows; confidence follows evidence
5. **L5 Memory** — the Living Profile; what persists, what decays, what is never stored
6. **L6 Cognition** — L6a conversational reasoning, L6b relational reasoning, L6c decision & introduction
7. **L7 Operational** — how doctrine becomes runtime behavior

Cross-cutting: Personality & Voice, Conversation Strategy, Relationship Journey, Self-Evaluation, Evolution Engine.

---

## 3. Product architecture (the app itself)

### Delivery
- **Approved architecture:** mobile-first, installable **PWA** — TanStack Start v1, React 19, Vite 7, Tailwind v4.
- **Backend:** Supabase (via Lovable Cloud) — Postgres + RLS, auth, storage.
- **Path to stores:** the same backend later serves a Capacitor or React Native/Expo client. No core rebuild.
- **Every screen is designed portrait-mobile first.** Desktop is a courtesy, never the design target.

### Member journey
```
Landing ("Meet Athena. The Next Evolution of Matchmaking.")
  -> Create Account -> Verify Email -> Basic Information
  -> Meet Athena (Athena always speaks first; ~20-minute foundational conversation)
  -> Today / Home dashboard
  -> Ongoing conversation (voice or text) deepens the Living Profile
  -> Introduction, when and only when Athena is confident
  -> Mutual yes -> Connection -> Messaging -> Meeting
  -> Post-meeting Reflection (5 questions, private) -> Athena learns
  -> Relationship Focus Mode, or a respectful ending
```

### Screens shipped
Landing, Auth, Onboarding, Athena (live voice/text conversation), Home/Today, Conversations history,
Profile + Profile Review, Introductions (list + detail), Connections (list + detail), Messages (list +
thread), Reflection flow, Moderation/Safety, Terms, Privacy, Community Guidelines.

### Rules baked into the product
- **Maximum three active introductions** at any time.
- **No numerical compatibility scores anywhere in the UI** — reasoning in plain language only ("Why Athena
  sees potential").
- Introductions require completed foundational understanding; readiness gates block premature matching.
- Reflection answers are private to Athena. "No" closes an introduction; "Not sure" keeps it open.
- Members may always talk with Athena longer to refine understanding. Time never forces a match.
- Account pause and delete are first-class. Email verification gates the experience.

---

## 4. Technical state

**Server logic:** TanStack `createServerFn` thin wrappers in `src/lib/*.functions.ts`, with all runtime logic
in matching `*.server.ts` files. No Supabase edge functions. AI runs through the Lovable AI Gateway.

Key modules: `athena` (conversation + reflection), `introductions` (match discovery, confidence gates,
3-intro cap), `connections`, `messaging`, `relationship` (Focus Mode), `learning`, `self-evaluation`,
`moderation`, `account`. Voice via `src/routes/api/tts.ts` and `stt.ts`. Topic coverage via `src/lib/topics.ts`
(21 life topics) and the `topic_map` table.

**Database (all RLS-protected):** profiles, user_preferences, user_photos, user_prompts, user_readiness,
user_intelligence, user_roles, conversations, messages, topic_map, understanding_facets, facet_history,
matches, pair_reasoning, pair_reasoning_history, introductions, introduction_responses,
introduction_feedback, meeting_proposals, connections, relationship_focus, post_meeting_reflections,
reflection_submissions, reflections, partner_perception, athena_self_evaluations, athena_outcome_signals,
athena_usage_log, member_transitions, safety_flags, reports, blocks, plus legacy interview tables retained
and marked legacy.

**Milestones (rollback points):** `Athena Foundation Stable v1`, `Athena Foundation Stable v2` — see
`docs/MILESTONES.md`.

---

## 5. Business & safety layers

`docs/business/` defines membership tiers, pricing and packaging, subscription and account lifecycle,
revenue rules, and payment integration. Monetization must never create pressure to introduce more people;
revenue mechanics may not influence matchmaking judgment.

`docs/security/` plus in-app safety: reporting, blocking, safety flags, moderation review, community
guidelines, and reflection-integrated safety reporting.

---

## 6. Permanent change-control standard (applies to every future request)

1. **Mandatory conflict review** — if a new instruction overlaps existing doctrine or behavior, pause, list
   the conflicts, and ask before changing anything established.
2. **Integration standard** — when there is no conflict, integrate into the existing section rather than
   creating a parallel document. Preserve terminology.
3. **Never silently override** prior philosophy, architecture, or behavior.
4. **Continuous-system responsibility** — every change must leave docs, memory, and code coherent.

---

## 7. Where the work stands and what is next

**Done:** Priorities 1–3 shipped as a working vertical slice; Athena live on GPT-class models with voice;
full 7-layer constitution; five founding colleges of Athena University (Human Nature, Relationships,
Communication, Human Development, Philosophy & Ethics Part I).

**Immediately next:** Philosophy & Ethics **Part II** (non-Western and relational traditions), then the
**College of Culture** and the **College of Wisdom**. After education completes: deepen the relationship
journey, membership/billing surface, and the native client wrapper.

---

## 8. House style for anything you draft

Calm, precise, unhurried. Quiet confidence, never salesy or clinical. No emojis. No numerical scores. Never
label a person ("you are an anxious attachment type"); describe patterns tentatively and always as
revisable. Markdown with clear headers, short paragraphs, explicit versioning
(`Canonical Curriculum v1.0`, `v2.0`, etc.), and a Closing Integration section for any doctrine set.
