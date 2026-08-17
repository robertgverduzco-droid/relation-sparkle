# Athena — Experience Integration Audit V1

**Status:** Audit report. Non-canonical. Amends nothing.
**Date:** 2026-08-17
**Scope:** How closely the application that exists today behaves like the Athena
defined by E1–E8, FINAL-INTEGRATION.md, and the Experience Decision Register
(X-01–X-38, F-01–F-38).

**No-repair rule observed.** No runtime, UI, CSS, token, typography, colour,
motion, sound, voice, prompt, matchmaking, relationship-state, database-policy,
privacy, safety, payment, or analytics change was made during this pass. No
finding was repaired. No open decision was closed. No exceptional
security/data-integrity condition was encountered that would have required
intervention.

## Evidence basis — read this before trusting any claim

Three verification modes are used throughout and are labelled per finding:

- **Executed** — exercised in a real browser (headless Chromium) against the
  running application at three viewports (390×844, 834×1112, 1440×900).
  Coverage: `/`, `/auth`, `/reset-password`, `/terms`, `/privacy`,
  `/community-guidelines`, and the redirect behaviour of `/home`.
- **Code-traced** — read directly in source with file:line evidence.
- **Reasoned simulation** — inferred from traced code without runtime exercise.

**Material limitation.** No authenticated session was available in the audit
environment (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`). **Every authenticated
surface — onboarding, Athena conversation, voice, understanding, Today,
introductions, connections, messaging, reflection, Focus Mode, endings, profile,
device safety, moderation — is code-traced or reasoned simulation only, never
executed.** Claims about how those screens *feel* are inferences from markup and
copy, not observed behaviour. This is the single largest confidence limit on
this report and should be closed by a founder-supervised authenticated walk
before beta sign-off.

---

# 1. Executive Summary

The application is materially better aligned with the Athena Experience
Architecture than a product at this stage usually is. The things that are
hardest to retrofit — restraint, absence of gamification, understanding before
matching, member correction of inference, real deletion and export, calibrated
non-numeric language, a real three-path ending — are already built and working.
The things that are missing are, with a small number of exceptions, exactly the
things the Register already defers to the Visual, Sonic, Motion, Interaction and
UX phases.

**The strongest statement this audit can make:** there is no generic dating-app
regression and almost no generic-AI regression in the product. The regression
tests in §13 and §14 came back essentially clean. That is a real achievement and
the most important thing to protect during the aesthetics phase.

**The three findings that genuinely matter before beta:**

1. **A binding founder decision is contradicted in runtime.** X-01/F-30 state
   that expiry of a chosen pause must never silently return a member to
   matchmaking. `matchmakingHold` returns `{ held: false }` the moment
   `hold_until` passes, with no member act (`src/lib/relationship.server.ts:145-149`).
   A member who chose rest after a relationship ended is silently re-entered
   into matchmaking 30 days later. This is the only place in the audit where
   runtime actively contradicts an approved decision rather than merely not yet
   implementing it. **P0.**
2. **Accessibility and reduced motion are unverified and, for reduced motion,
   absent.** F-14 and F-16 are both explicit beta gates. `prefers-reduced-motion`
   appears nowhere in `src/`. The landing particle field animates continuously
   with a Web Audio chime and no motion or sound alternative
   (`src/components/landing-background.tsx`). Contrast has never been measured.
   **P0** by the founder's own gate definition, not by this audit's judgement.
3. **The whole authenticated experience is unverified at runtime.** Every
   emotional-journey, presence, failure-state and safety claim about the
   signed-in product in this report is inference. **P0** as a verification task,
   not as a defect.

**What the product does not yet have, and knows it doesn't:** a designed Waiting
state, ceremony, Athena-native processing language, a sonic identity, a desktop
layout, progressive photographic revelation, contextual first-meeting safety,
analytics, and payments. All are already recorded as X-items with a named
downstream destination. This audit adds evidence, not new obligations.

**What surprised the audit:** photography of a counterpart does not appear
anywhere in the introduction or connection surfaces at all. X-33 anticipates
sequencing appearance *after* meaning; the current runtime has no appearance
step in the sequence whatsoever. This is a larger gap than the Register records.

---

# 2. Actual Current Member Journey

Reconstructed from runtime code. Stages are described as they *are*, not as
architecture intends. Nothing below is filled in from doctrine.

| # | Stage | Status | Reality |
|---|---|---|---|
| 1 | First arrival | **Exists fully** (executed) | `src/routes/index.tsx`. Animated particle field, "MEET / Athena." / "The Next Evolution of Matchmaking." / `Begin` / `I already have an account`. Signed-in users redirect to `/home` (`index.tsx:31-33`). |
| 2 | Account creation | **Exists fully** (executed) | `src/routes/auth.tsx`. Email+password and Google OAuth (`auth.tsx:128`). |
| 3 | Email verification | **Exists fully** (code-traced) | In-page verification state with resend and re-check (`auth.tsx:137-183`); `_authenticated/route.tsx:13-15` redirects unverified members to `/auth?verify=1`. Not a separate route. |
| 4 | Consent | **Exists fully** (code-traced) | `ConsentPanel` in blocking `gate` mode inside onboarding (`onboarding.tsx:150,264`); versioned, per-key, append-only rows via `consent.functions.ts:42,79,107-116`. No agree-to-all. Withdrawal of `outcome_learning` immediately sets `profiles.learning_opt_out` (`consent.functions.ts:99-105`). |
| 5 | Onboarding | **Exists fully** (code-traced) | Four steps `welcome → identity → preferences → complete` (`onboarding.tsx:18`), real `<ProgressBar>` driven by step index (`onboarding.tsx:133,281`), 700 ms cosmetic pause then navigate to `/athena` (`onboarding.tsx:119`). |
| 6 | Meeting Athena | **Exists fully** (code-traced) | `athena.tsx`. Scripted opening delivered line-by-line with deliberate `wait()` pacing (`athena.tsx:144,147,154,190,210`), optional TTS per line, then a one-time voice/text preference prompt (`athena.tsx:161-163,467-487`). |
| 7 | Foundational conversation | **Exists fully** (code-traced) | `askAthena` (`athena.functions.ts`), reflection every 6 turns and on unmount/pagehide (`athena.tsx:228-250,316-319`). Server pacing signal `offer_return` raises a `ClosingSheet` "A natural place to pause" (`athena.tsx:560-569,623-665`) → `completeFoundationalConversation` → `/home`. |
| 8 | Living Profile / understanding | **Exists fully, duplicated** (code-traced) | Two surfaces: `/understanding` per-facet change/correction/removal with provenance (`understanding.tsx:6,53-54,60-92`) and `/profile/review` bulk free-text rewrite of `user_intelligence` (`profile.review.tsx:83-95`). Both are legitimate; they overlap. |
| 9 | Waiting | **Exists only as copy inside other components** | No Waiting route, surface, or state of its own. Manifests as a sentence on the introductions list ("You're open. Athena will let you know when they are too." `introductions.tsx:166-168`) and as FocusMode's "Waiting, quietly" (`focus-mode-card.tsx:111-115`). **X-03/X-24/F-24 not implemented.** |
| 10 | Introduction | **Exists fully, as a list** (code-traced) | `listMyIntroductions` returns an array (`introductions.functions.ts:16-109`); `introductions.tsx` renders up to three simultaneously with the copy "Athena keeps up to three introductions active at a time" (`introductions.tsx:87-89`). Detail view re-filters the same list client-side (`introductions.$id.tsx:44-45`). |
| 11 | Response | **Exists fully** (code-traced) | Accept / defer / decline via `respondToIntroduction` (`introductions.tsx:67-74`), sticky action bar on detail. |
| 12 | Mutual interest | **Exists technically; no experiential moment** | Mutual accept creates a `connection` and a `conversation` row server-side. No handoff choreography, no acknowledgement surface. **X-34/F-34 not implemented.** |
| 13 | Messaging | **Exists fully** (code-traced) | `messages.tsx` / `messages.$id.tsx`, Supabase Realtime subscription (`messages.$id.tsx:67-95`), in-thread Report and Block (`messages.$id.tsx:114-124,216`). |
| 14 | Meeting | **Exists fully** (code-traced) | Propose / confirm / complete / cancel in `connections.$id.tsx:121-146`. |
| 15 | First-meeting safety | **Partial** | Report and Block are present everywhere. No contextual safety preparedness at the moment of scheduling — no reference appears in the proposal UI (`connections.$id.tsx:229-333`). The only guidance is static copy on `/community-guidelines:89-90`. **X-35 not implemented.** |
| 16 | Reflection | **Exists fully — strongest component in the product** | `reflection-flow.tsx`: not-yet-available state, feelings, three open questions, yes/no/not-sure continue decision with a two-question follow-up branch on "no" (`reflection-flow.tsx:361-382`), acknowledged state with re-entry, history accordion, safety-report link threaded through every state. Plus a separate private partner-perception form explicitly labelled "never seen by the other person" (`connections.$id.tsx:351,355-399`). |
| 17 | Relationship development | **Partial** | Exists as connection status labels `open / meeting_planned / met` (`connections.tsx:19-23`) and Focus eligibility. No developmental presence change beyond that. |
| 18 | Focus Mode | **Exists fully behind an invisible precondition** | `focus-mode-card.tsx` — invite, one-sided "Waiting, quietly", active with leave confirmation. Renders `null` when `!state.eligible` (`focus-mode-card.tsx:46`), with no explanation to the member. Server logic in `relationship.server.ts:108-164`, 21-day check-in cadence. |
| 19 | Ending | **Exists fully** | `ending-choice-card.tsx` — three paths `rest` / `resume` / `talk` with server-supplied copy (`relationship.server.ts:27-47`), "Nothing is final" (`ending-choice-card.tsx:93`), mounted persistently on Home (`home.tsx:92`). |
| 20 | Return / recalibration | **Exists in server logic only; no member-visible stage** | `matchmakingHold` releases on `resume` (`relationship.server.ts:144`); readiness re-evaluates on `ending_path_chosen` / `focus_change` (`readiness.server.ts:21-33`). The member simply sees the ordinary introductions queue again. No "this is a return" state, no recalibration conversation. |
| 21 | Rest / Pause | **Exists twice, as two different things** | (a) account-level `Pause matches` toggle (`profile.tsx:221-232`, `setAccountPaused`) — manual on, manual off, correct; (b) relationship `rest` path with a 30-day `hold_until` (`relationship.server.ts:19`) that **auto-expires without member action** (`relationship.server.ts:145-149`). See F-01 in §17. |
| 22 | Account administration | **Exists fully** | `profile.tsx` — Living Profile, pause, consent settings panel, Devices & Safety panel, conditional moderator link (`profile.tsx:68,258-265,276,280`). |
| 23 | Export | **Exists fully, step-up gated** | `generateMyExport` behind `verifyStepUp` password re-entry, downloads JSON client-side (`device-safety-panel.tsx:63,72-84`). |
| 24 | Deletion / departure | **Exists fully, step-up gated** | `deleteMyAccount` with typed confirmation phrase verified server-side, signs out and returns to `/` (`device-safety-panel.tsx:86-90`). |
| — | Successful departure | **Not implemented as a recognised state** | Nothing in runtime distinguishes leaving because Athena worked from leaving because it didn't. `deleteMyAccount` is the only exit. |
| — | Payments / billing | **NOT IMPLEMENTED** | No payment code of any kind exists in `src/`. Correct under F-29. |
| — | Analytics | **NOT IMPLEMENTED** as engagement analytics | Only `athena_usage_log` (model/kind/session self-performance, `self-evaluation.server.ts:330`) and `learning.server.ts`, which is deliberately anonymised, salted-HMAC, categorical, consent-gated, and inert (`LEARNING_VERSION = "0"`). |

**Ancillary surfaces that exist and sit outside the linear journey:**
`/conversations` (read-only Athena transcript log), `/notifications` (list plus
six preference categories, `notifications.tsx:43-50,84-89,158`), `/moderation`
(moderator-only console), global `AppLock` PIN overlay (`__root.tsx:136`), PWA
install prompt (`__root.tsx:135`).

---

# 3. Architecture-to-Runtime Matrix

| Layer | Rating | Basis |
|---|---|---|
| **E1 — Experience Philosophy** | **Strongly Aligned** | Understanding is enforced before matching at the routing level (`home.tsx:45-51`) and the gate level (`readiness.server.ts`). No numeric reduction of a person is displayed. Correction and removal of inference are first-class. No engagement mechanics exist. |
| **E2 — Emotional Journey** | **Partially Aligned** | Arrival, first disclosure, ending and reflection are genuinely designed. Waiting, post-foundational uncertainty, mutual interest and return are emotional dead zones with no surface of their own. Pause expiry contradicts X-01. |
| **E3 — Athena Presence** | **Mostly Aligned** | She reads as a specific intelligence, not a chatbot: named, first-person, refuses the AI frame (`athena.server.ts:234`), remembers across turns, delivers her opening deliberately. Weakened by generic `animate-pulse` dots as her thinking state and by her total absence from waiting, mutual interest, and return. |
| **E4 — Voice & Sonic Identity** | **Partially Aligned** | STT and TTS are implemented, authenticated, rate-limited and non-persistent. Voice is provisional-by-decision. No sonic signature (correct per F-08), no barge-in, no captions/transcript controls, no sound controls, no graceful speech-failure degradation. |
| **E5 — Visual World** | **Partially Aligned** | One coherent OKLCH semantic token system, editorial serif/sans pairing, near-zero hardcoded colour in application components. But landing and internal surfaces read as two products, the palette carries no canonical authority, hardcoded colour survives in scrims and the landing canvas, and accessibility is entirely unverified. |
| **E6 — Motion, Curiosity & Revelation** | **Partially Aligned** | Genuinely free of fake progress, engagement loops and dating-app celebration — that baseline holds. But there is no reduced-motion path anywhere, generic pulses stand in for Athena's states, all four operational conditions collapse into one, and there is a single global fade instead of state-aware transitions. |
| **E7 — Member Interaction** | **Mostly Aligned** | Text path fully viable; account, consent, privacy, understanding, devices, export and deletion controls all exist and are reachable from one profile surface. Weakened by administration-before-Athena ordering, questionnaire framing, silent conditional surfaces, three overlapping "conversation" concepts, and no offline/connectivity handling. |
| **E8 — Introduction & Relationship** | **Partially Aligned** | Reasoning, the three-cap, qualitative language, decline, private perception, reflection, Focus Mode and the three-path ending are all real and good. Presentation is a comparison list, photography is absent entirely, mutual interest has no moment, first-meeting safety is not contextual, return is invisible, successful departure is unrecognised. |
| **Final Integration** | **Mostly Aligned** | Doctrine is used as internal operating architecture and is explicitly non-quoting (`athena-doctrine.server.ts:101-106`); no founder, faculty or architecture language reaches the member. The Presence Curve is only partly expressed: Athena does not visibly recede at connection, because there is no connection moment to recede from. |

---

# 4. E1–E8 Findings

## E1 — Experience Philosophy

Runtime behaviour that *supports* E1: sequencing is enforced structurally rather
than merely intended — `/home` bounces to `/onboarding` and then to `/athena`
until a conversation exists (`home.tsx:45-51`), so a member cannot reach
introductions before Athena has met them. Readiness is expressed to the member
as a sentence, never a score (`readiness-card.tsx:34-48`). Members can change,
correct and delete Athena's inferences about them, and removal deletes the
reasoning as well as the conclusion (`understanding.tsx:53-54`).

Runtime behaviour that *contradicts* E1 experientially while working
technically:

- **The introductions list invites comparison** (`introductions.tsx`). Three
  people, three qualitative confidence labels, one screen. Nothing here is a
  score, but the arrangement performs the function of one. (E1 dignity /
  E8 §6, §8; X-31, F-31.)
- **A raw `confidence` float crosses the network to the browser**
  (`introductions.functions.ts:101`). The UI renders only
  `confidenceLabel(...)`, so no member sees a number today — but the number is
  in the client payload, one careless component away from being displayed, and
  visible to any member who opens devtools. E1's prohibition on numerical human
  reduction is currently a UI convention, not a data boundary.
- **Focus Mode renders `null` when ineligible** (`focus-mode-card.tsx:46`).
  Silence where an explanation belongs reads as absence, not restraint.

## E2 — Emotional Journey

Walking the journey for the four member questions — *Where am I? What is
happening? What happens next? Do I need to do anything?*

| Moment | Answered? |
|---|---|
| Arrival | Yes. |
| Orientation / onboarding | Yes — a real step indicator, clear steps. |
| First disclosure | Yes. The scripted opening and the voice/text choice orient well. |
| Growing familiarity | Yes, via reflection cadence and the transcript log. |
| **Post-foundational completion** | **Partially.** The closing sheet says "A natural place to pause" and returns the member to Home. Home shows readiness and static cards. Nothing states that Athena keeps learning, that introductions are not immediate, or that no activity is required to stay eligible. **X-24/F-24 unmet.** |
| **Waiting** | **No.** There is no Waiting state. The member is on Home with nothing happening and no account of why. This is the largest emotional dead zone in the product. **X-03/F-24 unmet.** |
| Introduction | Yes. |
| Uncertainty / defer | Yes — defer exists as a first-class response. |
| **Mutual interest** | **No.** State changes; experience does not. **X-34/F-34 unmet.** |
| Relationship development | Weak — status labels only. |
| Focus Mode | Yes when eligible; invisible otherwise. |
| Ending | **Yes — best-in-product.** Three named paths, server-authored copy, explicitly non-final. |
| **Return** | **No.** Indistinguishable from never having left. No recalibration. **X-37 unmet.** |
| **Rest/Pause** | **Contradicted.** Account pause is honest and symmetric. Relationship rest silently expires. **X-01/F-30 violated.** |
| Successful departure | **No.** Not a recognised state. |

Notification behaviour: `notifications.server.ts` is explicitly built without
streaks, countdowns, scarcity, re-engagement nudges or unread pressure (header
comment, line 4), and members control six categories. There is no formal quiet
standard — no frequency ceiling, no absence handling, no Focus Mode quieting.
The claim that "Account and safety messages always reach you"
(`notifications.tsx:158`) is member-facing copy; this audit did not verify a
server-side bypass path. **X-02 unmet; the copy claim is unverified.**

## E3 — Athena Presence

Athena currently reads as **a specific intelligence**, not a chatbot, feature,
narrator, assistant or interface. Evidence: she is named and first-person; she
explicitly refuses the AI/chatbot/language-model frame and does not break it
(`athena.server.ts:234`); her opening is authored and paced rather than
generated boilerplate (`athena.tsx:25-37`); her closing is her own judgement,
signalled by the server (`offer_return`), not a timer the member can see; her
memory is continuous and flushed on unmount so nothing is lost
(`athena.tsx:228-250`).

Against the Presence Curve:

- **Too absent** at waiting, at mutual interest, and at return — three moments
  where the curve expects her presence to be felt, and where the product is
  silent.
- **Generic** in her processing state: three `animate-pulse` dots
  (`athena.tsx:712-729`) and a pulsing microphone (`athena.tsx:512`). These are
  stock indicators wearing Athena's colours. **X-17/F-17 unmet.**
- **Inconsistent** in error behaviour: `askAthena` has no `try/catch` around
  `generateText` (`athena.functions.ts:114`), so a gateway failure throws to the
  server-function boundary and surfaces as a generic 500. Athena has no voice in
  her own failure.
- Not over-present, not unnecessarily anthropomorphic, not emotionally
  overreaching. No instance of either was found.
- **Not recedent.** The Presence Curve requires her to step back as the human
  relationship develops. Runtime has no mechanism that reduces her presence at
  connection — she is equally present before and after, because nothing marks
  the transition.

## E4 — Voice & Sonic Identity

| Capability | Status |
|---|---|
| STT | **Implemented.** `api/stt.ts` — authenticated caller, feature flag, 40/min limit, multipart with 512-byte floor, MIME-inferred extension, `openai/gpt-4o-transcribe`, streamed, never persisted. |
| TTS | **Implemented.** `api/tts.ts` — authenticated, feature flag, 120/min, `openai/gpt-4o-mini-tts`, 4000-char cap, streamed passthrough, `Cache-Control: no-store`. |
| Authentication of audio endpoints | **Implemented.** `verifyApiCaller` on both. |
| Transient audio handling | **Implemented.** Nothing written to disk or database in either route; consistent with F-09. |
| Current voice | **Placeholder by decision.** Hardcoded default `"shimmer"` (`tts.ts:25`), overridable by request body. Provisional per F-04. |
| Delivery instruction | **Implemented, static.** A single fixed instruction string (`tts.ts:39-40`). Not context-sensitive — correct, since F-06 defers that. |
| Playback | **Partially implemented.** Per-line playback during the opening; no member playback controls. |
| Text/voice switching | **Partially implemented.** A one-time preference prompt exists; no persistent in-conversation switch found. |
| Interruption / barge-in | **Missing.** Correct per F-05 (deferred), but currently the member must wait. |
| Captions / transcript | **Partially implemented.** Every spoken line is also a text bubble, and `/conversations` is a full transcript — so content is never audio-only. No caption *controls*. |
| Speech-failure degradation | **Missing.** No traced path that reports a failed transcription honestly rather than as silence. |
| Sound controls | **Missing.** No control over playback, automatic speech, sound effects, or notification sound. **X-06/F-07 unmet.** |
| Accessibility of voice | **Not tested.** |
| Sonic states / signature | **Intentionally absent** per F-08 — with one exception: the landing field plays a Web Audio chime on particle merge (`landing-background.tsx:73-101`). This is an unselected sound asset shipping in production, and it is not gated by any member sound control. |

## E5 — Visual World

**Inventory.** One token system in `src/styles.css`: Tailwind v4 `@theme inline`
(lines 12-47) mapping semantic roles to OKLCH raw tokens, light `:root`
(49-97) and `.dark` (99-132). Palette is warm paper + plum + ember —
`--paper: oklch(0.965 0.012 80)`, `--primary/--plum: oklch(0.31 0.08 330)`,
`--ember: oklch(0.62 0.14 40)`. Typography: Instrument Serif display / Inter
body (lines 20-21), serif auto-applied to `h1,h2,h3` (142-146). Utilities:
`safe-top`, `safe-bottom`, `screen-shell`, `fade-in-slow`. One keyframe,
`ri-fade`. Iconography: `lucide-react`. Surfaces: shadcn primitives with
token-driven variants.

**X-10 — entry/internal split: unchanged, and now visually confirmed.** Executed
capture at 1440×900 shows the landing as a pale blue-to-white gradient field
inside a 480 px column, floating on bare warm-paper canvas; every internal
surface is warm paper with card borders and plum accents. Two palettes, two
atmospheres, one product. **Status: open.**

**X-11 — palette vs E5 direction: unchanged.** No midnight-navy anchor, no
antique gold, no organic secondary. Both the implementation and the E5 palette
remain directional per F-11. **Status: open.**

**X-12 — hardcoded colour: substantially better than the Register records, but
open.** A full grep of `src/` finds **zero** Tailwind palette literals
(`bg-slate-*`, `text-red-500`, etc.) and zero hex literals in application
components. Remaining instances, all of them scrims or canvas:
`photo-uploader.tsx:161,163,165` (`bg-black/40`, `text-white/90`),
`report-sheet.tsx:27` (`bg-black/60`), `athena.tsx:587,633`
(`bg-black/40`, `bg-black/50`), shadcn primitives `dialog.tsx:24`,
`drawer.tsx:26`, `sheet.tsx:24`, `alert-dialog.tsx:19` (`bg-black/80`), and
`landing-background.tsx:293` — a literal
`linear-gradient(180deg, #cfe4f5, #e6f0fa, #ffffff)` plus raw `rgba()` canvas
fills (208, 216-218, 235-244). The landing gradient is the single largest
token-system bypass in the product and is also the direct cause of X-10.
**Status: open, narrowed.**

**X-13 — no ranking or scoring visuals: holding.** The only bar-like affordance
is the onboarding `<ProgressBar>` (`onboarding.tsx:133,281`), driven by real
step index, describing the member's own flow — permitted under F-13. No
progress, bar, meter, or percentage treatment appears on any introduction,
profile, or reasoning surface. `ui/progress.tsx` and `ui/skeleton.tsx` exist as
unused shadcn primitives. **Status: satisfied in current UI; keep it that way.**

**X-14 — accessibility as a visual gate: not started.** No contrast measurement
has ever been performed on the OKLCH palette. `--muted-foreground` on `--muted`
is the pairing most likely to fail AA and is used widely for secondary copy.
Scalable-type behaviour untested. Focus visibility exists via shadcn
`focus-visible:` rings on every primitive, but custom buttons written directly
in routes were not systematically checked. **Status: open, and it is a beta gate
by F-14.**

**X-15 — visual privacy treatments: not started.** No app-switcher or screenshot
obscuring, no sensitive-label sizing rules, no shared-screen state. The `AppLock`
PIN overlay (`app-lock.tsx`) is adjacent but is a device-lock, not a visual
privacy treatment, and is explicitly documented as not an authentication factor
(`app-lock.tsx:7`). **Status: open.**

**Additional visual findings.** No generic component-library appearance in the
member-facing flow — the routes are hand-written with the token system rather
than assembled from shadcn cards, and the Athena chat uses bespoke `Bubble` /
`TypingBubble` components (`athena.tsx:689-729`) rather than a chat widget. No
dating-app visual pattern found. Photography exists only as the member's own
upload grid (`photo-uploader.tsx`); no counterpart photography appears anywhere.

## E6 — Motion, Curiosity & Revelation

**Complete motion inventory.** No animation library is installed — no
framer-motion, no GSAP. Everything is CSS or canvas.

1. `fade-in-slow` / `@keyframes ri-fade` — 1200 ms opacity + translateY. Applied
   at page level (`index.tsx:39`, `auth.tsx:141,195`, `reset-password.tsx:111`)
   and per chat bubble (`athena.tsx:692`). This is the *only* project keyframe.
2. Landing connection field — canvas, `requestAnimationFrame`, ~120-260
   particles, pairing, merge ripple, Web Audio chime
   (`landing-background.tsx:73-101,137-260`). Bespoke, meaningful, and the one
   piece of motion that carries Athena's idea.
3. `animate-pulse` ×2 — thinking dots (`athena.tsx:712-729`, staggered by inline
   `animationDelay`) and the recording microphone (`athena.tsx:512`).
4. Radix `data-[state]:animate-in/out` on dialog, sheet, drawer, popover,
   select, tooltip, navigation-menu — stock library motion.
5. `transition-colors` / `transition-transform` micro-interactions across
   buttons, switches and toggles.
6. Timed pacing: onboarding→Athena 700 ms (`onboarding.tsx:119`), PWA prompt
   1200 ms (`pwa-install-prompt.tsx:65,72`), and the Athena opening sequence
   `wait(500)`, `wait(300|500)`, `wait(min(3200, 700 + len×30))`, `wait(400)`,
   `wait(600)` (`athena.tsx:144,147,154,190,210`).

**Verification against the E6 baseline:**

- **Reduced motion: absent.** `prefers-reduced-motion` and `motion-reduce`
  appear **nowhere** in `src/`. The landing field animates and chimes
  unconditionally. **X-16/F-16 unmet — beta gate.**
- **Operational-state differentiation: absent.** Athena processing, network
  unavailable, request failed, and service unavailable all resolve to either the
  same pulsing dots or an unhandled throw. **X-18/F-18 unmet.**
- **Artificial delay: present, and it needs a founder reading.** The opening
  sequence's `wait()` calls are typography-paced narration — arguably restrained
  ceremony under X-04. The 700 ms onboarding redirect is cosmetic delay with no
  meaning attached. Neither is theatrical processing, but the second is delay
  without purpose. Recorded, not judged.
- **Fake progress: none.** The only progress indicator is index-driven.
- **Engagement loops: none.**
- **Animation without purpose: the global `fade-in-slow`.** Applied uniformly
  regardless of what is being entered — the same 1200 ms fade for a legal page
  and for meeting Athena. Motion here decorates rather than communicates.
  **X-20/F-20 unmet.**
- **Dating-app celebration patterns: none.**

**Where motion communicates meaning:** the landing field, and the per-line
pacing of Athena's opening. **Everywhere else it decorates.**

## E7 — Member Interaction

- **Navigation.** Five fixed tabs — Today / Athena / Meet / Chats / You
  (`mobile-tab-bar.tsx:14`). `Meet` uses the `Sparkles` glyph. Connections
  routes borrow the `introductions` tab highlight (`connections.tsx:83`);
  `/conversations`, `/notifications`, `/moderation` pass `current="none"` and
  are therefore reachable only by link — discoverable in principle, orphaned in
  the navigation model.
- **Today.** `home.tsx` is not a feed and not a dashboard — it is
  `EndingChoiceCard` + `ReadinessCard` + two static links (`home.tsx:92-93`). It
  correctly avoids the E7 failure modes but also carries no answer to "what
  matters for me right now" during the long waiting period, because the waiting
  period has no content. **X-26/F-26: structurally safe, experientially thin.**
- **Onboarding.** Steps are literally labelled as steps; the framing is a form.
  **X-23/F-23 unmet by design intent, correct by current implementation.**
- **Arrival before administration.** Sequence is landing → account → verify →
  consent → identity → preferences → Athena. Athena is last.
  **X-22/F-22 unmet.**
- **Conversation controls.** Text path fully viable. Voice controls minimal (see
  E4). **X-25/F-25 partially unmet.**
- **Understanding controls.** Two overlapping surfaces (§2 row 8). Both work;
  which one a member should use is unclear from either.
- **Account controls.** All reachable from `/profile`: pause, consent settings,
  device safety, export, deletion, moderator link. Nothing is buried to protect
  retention. **X-27/F-27 substantially satisfied — this is a genuine strength.**
- **Consent.** Versioned, granular, withdrawable with immediate effect. Strong.
- **Devices & Safety.** Step-up reauth before sign-out-everywhere, export and
  deletion (`device-safety-panel.tsx:63`). Strong.
- **Rest/Pause.** Account pause is honest. Relationship rest is not (§17 F-01).
- **Errors.** `confirm()` used for two destructive actions
  (`messages.$id.tsx:114-124` block, `moderation.tsx:43` ban) — native browser
  dialogs are a continuity break in an otherwise authored product. No
  distinction between sending and sent, no unsent-work preservation traced, no
  duplicate-submission guard traced. **X-28/F-28 unmet.**
- **Connectivity.** No offline handling found in an installable PWA.
- **Accessibility.** See §8.

## E8 — Introduction & Relationship

**Single-person attention (X-31/F-31).** The presentation encourages
**comparison**, not consideration. `listMyIntroductions` returns an array
(`introductions.functions.ts:16-109`); `introductions.tsx` renders all active
introductions on one screen, each with a qualitative confidence label
(`introductions.tsx:125`). The copy even names the ceiling —
"Athena keeps up to three introductions active at a time"
(`introductions.tsx:87-89`) — turning an internal policy into a member-facing
inventory count. The three-cap is correct policy; it has become a display
pattern.

**Athena certainty (X-32/F-32).** Language is calibrated in the right direction
but not fully. The server prompt forbids percentages, scores and certainty
language in generated presentation prose (`introductions.server.ts:153,155`).
The detail view explicitly tells the member introductions are not ranked by
percentage (`introductions.$id.tsx:133-144`). But `confidenceLabel()` maps an
internal float to member-facing words (`introductions.tsx:183-187`,
`introductions.$id.tsx:179`), which (a) implies gradations of certainty Athena
should not claim and (b) becomes an implicit ranking when three appear together.
**Does current language imply more certainty than Athena possesses? Yes,
marginally — through the label, not through the prose.**

**Progressive revelation (X-33/F-33).** **Photography never appears.** No photo
field is selected or returned by `introductions.functions.ts`; no photo is
rendered in `introductions.tsx`, `introductions.$id.tsx`, or the connection
surfaces. Members upload their own photos (`photo-uploader.tsx`) but no member
ever sees a counterpart's. The current sequence is: reason for curiosity →
generalised area → age → prose portrait → choice. Appearance is not late in the
sequence; it is absent from it. This satisfies "meaning precedes appearance"
vacuously while failing F-33's explicit affirmation that physical attraction
remains legitimate and important. **This gap is larger than the Register
records.**

**Mutual-interest handoff (X-34/F-34).** What actually happens: mutual accept
creates a `connection` row and, via `ensure_conversation_for_connection`, a
`conversation` row. The member's next observation is that a thread exists. No
acknowledgement, no transition, no visible reduction in Athena's presence.
Correctly free of "It's a match!" spectacle — and equally free of any moment at
all.

**First-meeting safety (X-35).** What exists: Report and Block, reachable from
messages and connections, using a shared five-category `ReportSheet`. What does
not exist: any safety preparedness at the point of scheduling. The meeting
proposal UI (`connections.$id.tsx:229-333`) contains no reference to safety. The
only guidance is a static paragraph on `/community-guidelines:89-90`, reachable
from Profile.

**Focus Mode and ending (X-36/F-36).** Experientially: Focus Mode is an opt-in
card that appears when the server deems the connection eligible and is otherwise
invisible; a one-sided opt-in shows "Waiting, quietly"; leaving requires
confirmation. Ending presents three named paths with Athena's own words and an
explicit "Nothing is final". Technically: `relationship.server.ts:95-164` —
`openEndingChoice`, `ENDING_PATHS`, `REST_HOLD_DAYS = 30`, `matchmakingHold` as
the single authority consulted by both `introductions.server.ts:215-218` and
`readiness.server.ts:126-145`; Focus check-in cadence 21 days. Endings are
dignified, non-punitive, and carry no commercial or matchmaking exploitation.
**This is the best-realised part of E8.**

**F-07 / sealed former-partner knowledge (X-37).** *Note: the Register's F-07 is
the E4 member-audio-controls decision; the sealed-former-partner boundary is
governed by X-37 and F-37. Both are addressed here — see the governance note in
§17.*

Traced end to end and **upheld in code**:

- `reasonPair` accepts only `{ name, facets }`, and `FacetRow` is sourced
  exclusively from `understanding_facets`
  (`introductions.server.ts:25-30,120-164`, call sites 189, 331, 505).
- `runMatchmakingForUser` queries only `profiles`, `user_preferences`,
  `understanding_facets`, `blocks`, and `pair_reasoning` (existence-filtering
  only, not content) — `introductions.server.ts:319-334`.
- **`partner_perception` and `post_meeting_reflections` are never queried
  anywhere in the matchmaking path.** `partner_perception` is classified
  `Restricted` (`security.server.ts:49`) and appears only in export, deletion,
  founder-dialogue and restore-guard modules.
- The only residue of a former relationship that can influence future matching
  is the ex-partner's own `understanding_facets` — what Athena learned about
  *them, about themselves*. That is ordinary per-person understanding, not
  knowledge of the relationship or of the other member.

**Conclusion: no violation found by code trace.** This is a code trace, not a
runtime test; F-37 requires end-to-end runtime verification before beta, and
that verification has not occurred.

**Recalibration on return.** Not implemented. `matchmakingHold` releases and the
member re-enters with prior preferences intact. Nothing asks what changed.

**Successful departure (X-38/F-38).** Not recognised. The architecture is
*capable* of it — no engagement metric exists to be harmed by a member leaving,
`learning.server.ts:20-21` explicitly excludes message volume, latency, session
length, app opens, acceptance rate and match counts as signals, and deletion is
real and unobstructed. But nothing distinguishes a successful departure from any
other, and nothing records it as a positive outcome.

---

# 5. Final Integration Findings

**Inheritance and interpretation.** The runtime honours the layer hierarchy: no
surface expresses a rule that contradicts a higher layer, and the Constitution
remains the source of behavioural truth in `athena.server.ts` /
`athena-doctrine.server.ts` rather than being restated in UI copy.

**Experience Internalization Standard — satisfied.** See §12.

**Athena Presence Curve — partially expressed.** Her presence is correctly high
during the foundational conversation and correctly absent from messaging between
two members. But the curve's defining move — receding at connection — is not
expressed, because connection has no moment. And the curve's early-waiting
portion is flat: she is absent where the curve expects presence.

**Cross-layer authority — no conflict found.** No business or analytics
objective overrides autonomy, privacy, relationship quality or recession,
because neither exists in runtime.

**The Integrated Athena Test.** Applied informally to the product as it stands:
a member would experience a distinctive, restrained, non-manipulative
intelligence during onboarding, the foundational conversation, reflection and
ending — and would experience an ordinary, quiet web application during waiting,
introduction comparison, mutual interest and return. **The product passes the
test where Athena speaks and fails it where she is silent.** That is the single
most useful summary of this audit.

---

# 6. Privacy-as-Experience Findings

Where privacy is *perceptible and well-communicated*:

- **Counterpart visibility.** Before mutual connection a counterpart is placed
  only by a generalised area, never an exact city
  (`introductions.functions.ts:74-75`). The restraint is real and structural.
- **Partner perception.** The member is told in plain words that their private
  read of the other person is "never seen by the other person"
  (`connections.$id.tsx:351`). Exactly the right sentence in exactly the right
  place.
- **Understanding removal.** "I'll delete this understanding and how I arrived
  at it" (`understanding.tsx:53-54`) communicates provenance deletion, not just
  conclusion deletion. Rare and good.
- **Consent.** Per-key, versioned, withdrawable, with immediate downstream
  effect on learning (`consent.functions.ts:99-105`).
- **Voice.** Nothing persisted; the architecture is sound and consistent with
  F-09.

Where privacy is technically correct but **experientially mute or confusing**:

- **Voice privacy is invisible.** A member has no way to learn that their audio
  is never stored. The strongest privacy property in the product is
  uncommunicated.
- **Two correction surfaces.** `/understanding` (provenance-aware, per-facet)
  and `/profile/review` (bulk overwrite) do different things with different
  guarantees, and neither explains the difference. A member seeking to correct
  Athena may pick the weaker instrument without knowing.
- **Notification content.** Introduction notices carry human-readable content
  ("There's a new introduction waiting…", `notifications.server.ts:130`). Tone is
  correct and quiet; lock-screen exposure is ungoverned. **X-08 open.**
- **Founder boundary.** Governed in `founder-dialogue.server.ts` and
  `restore-guard.server.ts`; **entirely invisible to members.** Nothing tells a
  member what a founder can and cannot see.
- **Export.** Produces a raw JSON download (`device-safety-panel.tsx:72-84`).
  Complete and honest; not legible as an account of what Athena knows.
- **Sensitive inference.** No member-facing indication of which inferences are
  treated as sensitive, or that a category exists at all.
- **Relationship ending.** The sealing of former-partner knowledge is real
  (§4/E8) and is never communicated. A member ending a relationship has no way
  to know that what their ex said about them is now sealed.

---

# 7. Trust & Safety Experience Findings

| Property | Assessment |
|---|---|
| **Accessible** | Yes for reporting and blocking — reachable from messages (`messages.$id.tsx:216`) and connections (`connections.$id.tsx:406-412`) and from every state of the reflection flow. |
| **Discreet** | Yes. A shared bottom sheet, five categories, no alarm framing. |
| **Understandable** | Partially. Blocking's consequence — closing the shared connection — is communicated only in a toast, after a native `confirm()`. |
| **Proportionate** | Yes. |
| **Non-spectacular** | Yes. |
| **Operationally enforceable** | Yes. `/moderation` offers dismiss / suspend / ban via `resolveReport`, and authorization is enforced **server-side** — `moderation.functions.ts:3,7,13,17` applies `requireSupabaseAuth` and evaluates `isModerator(context.supabase, context.userId)`. The client redirect at `moderation.tsx:30-35` is a UX convenience on top of a real gate. Verified. |

**Gaps:** no member-facing communication around enforcement outcomes (a warned,
suspended or banned member's experience is untraced); no severe-conduct
escalation path distinguishable from ordinary reporting; no contextual
first-meeting safety (X-35); native `confirm()` for block and ban breaks the
authored voice at the two most consequential moments in the safety system.

---

# 8. Accessibility Findings

Rigorously separated by evidence class. **No accessibility compliance is claimed
anywhere in this section, and the presence of an accessible component library is
not treated as evidence.**

**Verified (statically, by direct source read):**

- `aria-label` on the primary nav (`mobile-tab-bar.tsx:22`), PIN inputs
  (`app-lock.tsx:105`, `device-safety-panel.tsx:184,212`), the mic toggle
  (`athena.tsx:509`), and icon-only links (`notifications.tsx:94`,
  `home.tsx:71`).
- `role="switch"` correctly paired with `aria-checked` on custom toggles
  (`consent-panel.tsx:137-139`, `notifications.tsx:140-142`).
- `aria-hidden` on decorative elements (`landing-background.tsx:288`,
  `readiness-card.tsx:45`, `auth.tsx:272`).
- `alt=""` on decorative photo thumbnails (`photo-uploader.tsx:152`).
- `focus-visible:` ring styles present on all shadcn primitives.
- Exactly one `<h1>` per public route, confirmed by DOM query in the executed
  browser pass across all six public routes at three viewports.
- Zero images without `alt` on all six public routes — **executed**.
- Zero console errors on all six public routes at all three viewports —
  **executed**.

**Assumed (present in source, correctness not confirmed):**

- `<label>` elements exist in `auth.tsx:224,232`, `reset-password.tsx:148,162,189`,
  `onboarding.tsx:330`, `profile.review.tsx:206`, but `htmlFor`/`id` association
  versus implicit wrapping was not verified element by element.
- Heading hierarchy inside authenticated routes; `founder.tsx:101` uses `<h1>`
  for what appears to be a panel title.
- Custom buttons written directly in route files (not shadcn primitives) inherit
  no guaranteed focus ring.

**Not tested (and cannot be claimed):**

- Colour contrast. The OKLCH palette has never been measured against WCAG AA.
  `--muted-foreground` on `--muted` is the highest-risk pairing and is used
  pervasively for secondary copy.
- Screen-reader flow and announcement correctness.
- Keyboard tab order; focus trapping in dialogs, sheets and the `AppLock`
  overlay.
- Scalable text at 200%.
- Error identification and programmatic association of errors with fields.
- Mobile touch-target sizing.

**Absent:**

- No skip-to-content link anywhere in `src/`.
- **No `prefers-reduced-motion` support anywhere in `src/`.**
- No sound-off guarantee: the landing chime is ungated and no member sound
  control exists.

F-14 and F-16 are founder-declared beta gates. Both are currently unmet.

---

# 9. Failure-State Findings

Traced, not induced — no failure was deliberately injected against production
data.

| Failure | Behaviour | Can the member tell? |
|---|---|---|
| AI failure (conversation) | `generateText` is uncaught in `askAthena` (`athena.functions.ts:114`) → throws to the server-fn boundary → generic 500. | **No.** |
| AI failure (background) | `.catch(() => {})` on readiness, matchmaking trigger and self-eval (`athena.functions.ts:402,404,415`) — silent by design. | Not applicable; correct. |
| AI failure (pair reasoning) | Per-candidate catch, pair skipped (`introductions.server.ts:571-573`). | Not applicable; correct. |
| AI timeout | **No timeout is configured on any gateway call.** All calls are buffered `generateText`/`generateObject`, never streamed. A slow model holds the request until the platform kills it. | **No.** |
| STT failure | No traced honest-failure path. | **Unlikely.** |
| TTS failure | Upstream status forwarded (`tts.ts:44-47`); client handling untraced. | Unverified. |
| Network interruption | No offline handling in an installable PWA. | **No.** |
| Authentication expiry / stale session | `_authenticated/route.tsx` re-checks on navigation; mid-session expiry during a conversation untraced. | Unverified. |
| Failed message send | No sending-vs-sent distinction and no unsent-work preservation traced. | **Unverified, likely no.** |
| Failed introduction action | No duplicate-submission guard traced. | Unverified. |
| Failed export | Client-side JSON assembly and download; failure handling untraced. | Unverified. |
| Failed deletion | Server-verified confirmation phrase; partial-failure behaviour untraced. | Unverified. |
| Notification failure | Untraced. | Unverified. |

Two structural conclusions. First, **the four operational conditions named in
F-18 are indistinguishable in runtime** — processing, network, request failure
and service failure produce either the same pulsing dots or an unhandled throw.
Second, **the conversation's reflection flush is a genuine strength**: reflection
is flushed on unmount and `pagehide` (`athena.tsx:228-250`), so understanding
survives a member closing the tab mid-thought. Unsent *text* in the composer,
however, was not traced as preserved.

---

# 10. Responsive Findings

**Executed** at 390×844, 834×1112 and 1440×900 across all six public routes.

- The application is a single fixed shell: `screen-shell` sets
  `max-width: 480px; margin-inline: auto; min-height: 100dvh`
  (`styles.css:153-160`), applied to ~30 routes; the tab bar mirrors the same
  480 px cap (`mobile-tab-bar.tsx:23`). No breakpoint anywhere overrides it.
- **Mobile (390):** correct and comfortable. No horizontal overflow.
- **Tablet (834):** a 480 px column centred in 834 px. Functional, visually
  under-occupied.
- **Desktop (1440):** the captured landing shows a 480 px column with the
  gradient particle field clipped inside it, floating on a plain warm-paper
  field that fills the remaining ~960 px. Nothing degrades functionally;
  the *atmosphere* degrades badly, because the connection field — the one piece
  of motion carrying Athena's identity — is boxed into a phone-width strip.
- `styles.css:8` states "Portrait-mobile first", and the project is a
  mobile-first PWA, so this is a deliberate constraint rather than an oversight.
  It is recorded because no Experience document states what Athena is on a
  desktop screen, and the landing is the surface most likely to be opened there.

---

# 11. Business / Analytics Findings

**Business: NOT IMPLEMENTED.** No payment, billing, subscription, pricing,
paywall, trial, or conversion code exists in `src/`. No commercial affordance
appears anywhere in the member experience. **F-29 preserved and currently
uncontradicted.** Nothing in the product exploits emotional disclosure, because
nothing in the product sells.

**Analytics: NOT IMPLEMENTED as engagement measurement.** Two adjacent systems
exist and neither is engagement analytics:

- `athena_usage_log` (`self-evaluation.server.ts:330`) — model, kind, session,
  tokens/seconds. Operational self-performance and future billing basis.
- `learning.server.ts` — outcome learning, and it is architecturally exemplary
  for F-38: salted HMAC pair tokens with no user IDs, a closed reason
  vocabulary, an explicit consent-opt-out check (lines 188-195),
  `LEARNING_VERSION = "0"` so nothing is promoted or used yet, and an explicit
  header stating that "message volume, latency, session length, app opens,
  acceptance rate and match counts are not signals" (lines 20-21).

**Does anything currently incentivise engagement, retention, excessive
messaging, excessive introductions, or product dependence?** No. Not one
mechanism was found. The three-introduction cap actively limits volume,
notifications are deliberately free of nudges and unread pressure, and no metric
exists that a departing member would harm.

**Is the architecture capable of treating successful departure and relationship
quality as positive outcomes?** Structurally yes — the outcome vocabulary and
the absence of counter-incentives both permit it. Currently it does neither,
because departure is not recorded as an outcome at all. **F-38 capable, not
realised.**

---

# 12. Experience Internalization Findings

Prompt assembly: `athena.functions.ts:108` composes
`[athenaSystemPrompt(), doctrine, pacingHint, timeHint]` plus a memory block.
`athena.server.ts:231-423` is the constitution-derived operating prompt.
`athena-doctrine.server.ts` supplies L4/L5/L7 syntheses and a compact
`UNIVERSITY_BASELINE` (lines 72-108) plus at most two selectively retrieved
college modules (lines 114-214).

**Findings:**

- The doctrine is used as **internal operating architecture**, not as script.
  `athena-doctrine.server.ts:1-19` declares itself an implementation artifact
  that never governs or quotes the canonical documents, and states plainly that
  the full curriculum is never injected.
- Every doctrine block is annotated `(internal, never narrated)`
  (`athena-doctrine.server.ts:25,42,59,72`).
- The **Non-Quotation / Non-Imitation Standard is present verbatim in the
  runtime instructions** (`athena-doctrine.server.ts:101-106`): no "according to
  Jung", no "Gottman would say", no lectures, no citations — "Your words, your
  metaphors, your observations, your questions."
- **No faculty or thinker name appears anywhere in the text sent to the model.**
  Only discipline names. Verified by direct read of both files.
- No founder language, no architecture language, no E-layer or X/F identifiers,
  no file paths reach the model.
- Athena is instructed never to describe herself as an AI, chatbot, assistant,
  language model or bot, and never to break that frame even if asked
  (`athena.server.ts:234`).

**Compatible with Athena University's Non-Quotation / Non-Imitation standards.**

**One residual risk, recorded not repaired:** the entire doctrine text is
concatenated into the system message on every turn, and no output-side check
prevents the model reciting its own instructions under a sufficiently determined
prompt-injection attempt. The protection is instruction-level, not structural.
This is a known and generally-unsolved class of exposure; it is recorded here
because the exposed material would be Athena's internal architecture, which E1
and Final Integration hold should never be narrated to a member.

---

# 13. Dating-App Regression Test

Searched across all of `src/` for each named pattern.

| Pattern | Result |
|---|---|
| Swipe mechanics | **None.** No gesture handlers, no card stack. |
| Candidate grids | **None.** Introductions render as a vertical list of at most three. |
| Rapid comparison | **Near-instance.** Three simultaneous introductions with qualitative confidence labels on one screen (`introductions.tsx:125`) enable comparison without inviting it. Recorded as F-05 in §17, not as a swipe-deck regression. |
| Hearts | **None.** |
| Popularity | **None.** |
| Compatibility percentages | **None displayed.** **Near-instance:** the raw `confidence` float is sent to the client (`introductions.functions.ts:101`) and only converted to words in the component. |
| Romantic rankings | **None.** No ordering by score, no "top pick". |
| Streaks | **None.** Explicitly excluded in `notifications.server.ts:4`. |
| Badges | **None.** `ui/badge.tsx` and `SidebarMenuBadge` are unused shadcn primitives, not gamification. |
| Scarcity | **None.** Explicitly excluded in `notifications.server.ts:4`. |
| Countdowns | **None.** |
| Match explosions / celebration | **None.** No confetti, no "It's a match!", no celebratory animation. |
| Infinite discovery | **None.** Hard cap of three, server-enforced (`introductions.server.ts:22,252-254`). |
| Engagement feeds | **None.** Home is two cards and two links. |

**Result: the product contains no generic dating-app mechanics.** Two
near-instances are recorded (simultaneous comparison; the confidence float on
the wire) and both are already governed by X-31/X-32. The stated intent is
explicit in the product's own metadata: "Values, readiness and depth first —
never a swipe deck" (`__root.tsx:85,87`).

---

# 14. Generic-AI Regression Test

| Pattern | Result |
|---|---|
| Generic chatbot presentation | **None.** Bespoke `Bubble` / `TypingBubble` (`athena.tsx:689-729`), not a chat widget. |
| Generic sparkle AI iconography | **One instance.** `Sparkles` from lucide as the `Meet` tab glyph (`mobile-tab-bar.tsx:2,14`). Repurposed for introductions rather than AI branding, but it is the single most recognisable generic-AI glyph in the ecosystem. |
| Generic assistant language | **None.** Athena refuses the assistant frame in her operating instructions (`athena.server.ts:234`), and `founder-dialogue.server.ts:304` separately instructs her not to become an administrative assistant. |
| Generic loading behaviour | **Two instances.** `animate-pulse` thinking dots (`athena.tsx:712-729`) and the pulsing mic (`athena.tsx:512`). Already governed by X-17/F-17. |
| Excessive prompt suggestions | **None.** No suggestion chips anywhere. |
| "How can I help?" framing | **None.** |
| Interchangeable-assistant feel | **No.** Athena's opening, closing judgement, memory continuity and refusal of the AI frame make her specific. |

**Result: one iconography instance and two loading-state instances. No
linguistic or structural generic-AI regression.**

---

# 15. Multi-Person Simulation Results

**No authenticated runtime execution was possible.** Every row below is
code-traced or reasoned simulation. None is executed. This is stated per the
audit's own prohibition on claiming runtime testing that did not occur.

| # | Member | Method | Outcome |
|---|---|---|---|
| 1 | Skeptical new member | Reasoned | Landing is restrained and makes no claim; consent is granular and honest; no payment wall. Likely to survive first contact. Risk: onboarding's form framing arrives before Athena speaks (X-22). |
| 2 | Enthusiastic conversational member | Code-traced | Well served. Reflection every 6 turns, memory continuity, Athena's own closing judgement. Risk: after completion, the product goes quiet with no Waiting state. |
| 3 | Quiet / low-disclosure member | Code-traced | Gated out of introductions by `MIN_FACETS_EACH = 4` and `EXPLORATORY_MIN_AVG = 0.35` (`introductions.server.ts:16-17`) and readiness A/B (`readiness.server.ts:36-38`). `ReadinessCard` explains state in words, not scores — good. But the member cannot tell what would change it. |
| 4 | Voice-first member | Code-traced | Can speak and be spoken to. Cannot interrupt, cannot control playback, cannot disable automatic speech, has no honest failure path if transcription fails. |
| 5 | Text-only member | Code-traced | Fully served. Voice is genuinely optional; every spoken line also exists as text. |
| 6 | Member waiting without an introduction | Reasoned | **Worst-served journey in the product.** Home shows readiness and two links; nothing explains what is happening, that Athena is still learning, or that no action is needed. |
| 7 | Member entering Rest/Pause | Code-traced | Account pause: honest, symmetric, clearly explained (`profile.tsx:226-232`). Relationship rest: **silently expires** (`relationship.server.ts:145-149`). |
| 8 | Member who declines an introduction | Code-traced | Clean. Decline is a first-class response alongside defer. |
| 9 | Member whose introduction is declined invisibly | Reasoned | No traced notification of another's decline — consistent with dignity. Unverified whether the introduction simply disappears from the list, which would be a silent state change. |
| 10 | Mutually interested pair | Code-traced | Connection and conversation rows are created; no experiential moment occurs. |
| 11 | Member entering Focus Mode | Code-traced | Good when eligible: opt-in, "Waiting, quietly" for one-sided, confirmation to leave. Invisible with no explanation when ineligible (`focus-mode-card.tsx:46`). |
| 12 | Relationship ending | Code-traced | Strongest moment in the product. Three named paths, Athena's own words, explicitly non-final, no matchmaking or commercial exploitation. |
| 13 | Member returning after ending | Code-traced | Hold releases and the ordinary queue resumes. No recalibration, no acknowledgement, no distinction from never having left. |
| 14 | Member correcting Athena | Code-traced | Two surfaces, both functional, neither explaining which to use. |
| 15 | Member removing an inference | Code-traced | Provenance-aware removal with clear language. Strong. |
| 16 | Member deleting the account | Code-traced | Step-up reauth, typed confirmation verified server-side, sign-out, return to `/`. Real deletion. Strong. |
| 17 | Reduced-motion member | Code-traced | **Receives no accommodation.** Landing field animates unconditionally. F-16 unmet. |
| 18 | Sound-off member | Code-traced | Content is never audio-only (every line is also text) — so the product is usable. But the landing chime is ungated and no sound control exists. |
| 19 | Member hitting network/AI failure | Code-traced | Cannot tell what happened. Uncaught throw on conversation failure; no offline handling; one indicator for all conditions. |

---

# 16. F/X Decision Verification

Status vocabulary per §28 of the audit instruction. No decision is reinterpreted
and none is closed.

## Founder decisions

| ID | Subject | Runtime status | Note |
|---|---|---|---|
| F-01–F-03 | Rest/Pause as intentional state; related E2 decisions | **Partially implemented** | Account pause honours intentionality; relationship rest does not (see X-01). |
| F-04 | Current voice provisional | **Implemented and verified** | `"shimmer"` is a default, not a canonical selection (`tts.ts:25`). Correctly provisional. |
| F-05 | Barge-in ultimately supported | **Not implemented** | Correct — deferred by the decision itself. |
| F-06 | Context-sensitive pacing | **Not implemented** | Correct — a single static instruction string (`tts.ts:39-40`). |
| F-07 | Member audio controls | **Not implemented** | No sound controls exist. |
| F-08 | Sonic signature unresolved | **Partially implemented** | The *absence* is correct, but the landing Web Audio chime (`landing-background.tsx:73-101`) is an unselected sound shipping in production. |
| F-09 | Voice privacy preserved | **Implemented and verified** | No audio persisted in `tts.ts` or `stt.ts`; no acoustic profiling anywhere. |
| F-10 | One Athena visual world | **Not implemented** | Landing and internal remain two worlds; confirmed by executed capture. |
| F-11 | Palette directional only | **Documentation-only** | Correct by design. |
| F-12 | Hardcoded colour deferred | **Documentation-only** | Correctly not repaired. Inventory narrowed (§4/E5). |
| F-13 | Progress language limited to member's own process | **Implemented and verified** | Only the onboarding indicator; no ranking affordance found on any person-facing surface. |
| F-14 | Accessibility verification a beta gate | **Not implemented** | No verification has occurred. Contrast unmeasured. |
| F-15 | Visual privacy before beta | **Not implemented** | No treatments exist. |
| F-16 | Reduced motion a beta gate | **Not implemented** | `prefers-reduced-motion` absent from `src/`. |
| F-17 | Athena-native visual state language | **Not implemented** | Generic pulses remain. |
| F-18 | Operational conditions distinguishable | **Not implemented** | All conditions collapse into one state. |
| F-19 | Connection field directional | **Documentation-only** | Field is provisional and remains so. |
| F-20 | Ceremony unresolved | **Requires later design specification** | Single global fade only. |
| F-21 | Haptics optional | **Not implemented** | Correct. |
| F-22 | Arrival before administration | **Not implemented** | Athena is last in the sequence. |
| F-23 | Onboarding as orientation | **Not implemented** | Step framing persists. |
| F-24 | Post-conversation and Waiting surface | **Not implemented** | No Waiting surface exists. |
| F-25 | Voice/text parity | **Partially implemented** | Text fully viable; voice lacks controls, interruption and honest failure. |
| F-26 | Navigation and Today | **Partially implemented** | Correctly not a feed; thin during waiting; three tab-less routes. |
| F-27 | Account controls discoverable | **Implemented, verification recommended** | All controls reachable from `/profile`; nothing buried. Not runtime-verified. |
| F-28 | Honest AI/network/connectivity behaviour | **Not implemented** | See §9. |
| F-29 | Payment placement unresolved | **Implemented and verified** | No payment code exists. |
| F-30 | Rest/Pause reconciled with X-01 | **Not implemented — actively contradicted** | See F-01 in §17. |
| F-31 | Single-person attention | **Not implemented** | Three-at-once list. |
| F-32 | Calibrated certainty language | **Partially implemented** | Prose calibrated; `confidenceLabel` gradations remain. |
| F-33 | Progressive revelation and photography | **Not implemented** | No counterpart photography exists at all. |
| F-34 | Mutual-interest handoff | **Not implemented** | No moment exists. |
| F-35 | First-meeting safety | **Not implemented** | Report/Block exist; contextual preparedness does not. |
| F-36 | Focus Mode and endings | **Partially implemented** | Endings strong; Focus Mode silent when ineligible; Athena does not recede. |
| F-37 | Return, recalibration, sealed former-partner boundary | **Partially implemented — sealing verified by code trace, runtime verification outstanding, recalibration not implemented** | See §4/E8. |
| F-38 | Successful departure and outcomes | **Partially implemented** | Structurally capable, not recognised. |

## Downstream requirements X-01 – X-38

| ID | Status |
|---|---|
| X-01 | **Not implemented — runtime contradicts the decision.** |
| X-02 | Not implemented (no quiet standard; behaviour is already restrained). |
| X-03, X-04 | Not implemented. |
| X-05 | Not implemented. |
| X-06 | Not implemented. |
| X-07 | Requires later design specification (correctly deferred; one stray chime). |
| X-08 | Not implemented. |
| X-09 | Not implemented. |
| X-10 | Not implemented — confirmed visually at desktop. |
| X-11 | Requires later design specification. |
| X-12 | Partially addressed (application components clean; scrims and landing canvas remain). |
| X-13 | **Satisfied in current runtime.** |
| X-14, X-15, X-16, X-17, X-18 | Not implemented. |
| X-19, X-20, X-21 | Requires later design specification. |
| X-22, X-23, X-24, X-25 | Not implemented. |
| X-26 | Partially implemented. |
| X-27 | Substantially implemented; unverified at runtime. |
| X-28 | Not implemented. |
| X-29 | Not implemented — correct; no payment exists. |
| X-30 | **Not implemented — contradicted (see X-01).** |
| X-31, X-32, X-33, X-34, X-35 | Not implemented (X-32 partially). |
| X-36 | Partially implemented. |
| X-37 | Partially implemented; **runtime verification outstanding as a beta gate.** |
| X-38 | Partially implemented (capable, unrecognised). |

**Governance note, recorded not resolved.** The Register's **F-07** is the E4
member-audio-controls decision (Part III). The audit instruction refers to
"F-07 (sealed partner data)", which corresponds to the E8 sealed-former-partner
boundary governed by **X-37 / F-37**. Both were audited and both are reported
above. This is an identifier collision in referencing, not a doctrinal conflict,
and it is flagged for founder attention because a mis-referenced binding
decision is a governance risk. **Destination: Governance / Founder Decision.**

---

# 17. Prioritized Finding Register

## P0 — Beta blockers

### F-01 — Pause expiry silently returns a member to matchmaking
- **Priority:** P0
- **Location:** `src/lib/relationship.server.ts:145-149`; consumed by `src/lib/introductions.server.ts:215-218` and `src/lib/readiness.server.ts:126-145`
- **Member experience:** A member ends a relationship and chooses "rest". Athena says she will not bring anyone until told. Thirty days later, without any act by the member, introductions resume.
- **Actual implementation:** `matchmakingHold` returns `{ held: true, reason: "resting" }` only while `hold_until` is in the future; once it passes it falls through to `{ held: false }`. No resume act is required or recorded.
- **Governing architecture:** X-01 (approved), F-30, E2 §35/§38, E7 §28/§29.
- **Why it matters:** This is the only place in the audit where runtime actively contradicts a binding founder decision rather than merely not yet implementing it. It breaks a promise made in Athena's own words (`relationship.server.ts:46`) at the most vulnerable moment in the journey, and it is a consent-adjacent failure, not merely a UX gap.
- **Destination:** Runtime Engineering (with Governance confirmation that X-01 controls).

### F-02 — No reduced-motion support anywhere
- **Priority:** P0 (by F-16, a founder-declared beta gate)
- **Location:** all of `src/`; acutely `src/components/landing-background.tsx`, `src/styles.css`
- **Member experience:** A member with vestibular sensitivity opens the app to a continuously animating particle field with an audio chime, with no alternative.
- **Actual implementation:** `prefers-reduced-motion` and `motion-reduce` appear zero times in the codebase.
- **Governing architecture:** F-16, X-16, E6 §50–§51, E5 §44.
- **Why it matters:** F-16 states reduced-motion support is mandatory before beta and that a reduced-motion path may never deliver a lesser product. Today it delivers no product distinction at all.
- **Destination:** Motion Design System (specification) → Runtime Engineering (implementation).

### F-03 — Accessibility has never been verified; contrast unmeasured
- **Priority:** P0 (by F-14, a founder-declared beta gate)
- **Location:** `src/styles.css:49-132` tokens; all routes
- **Member experience:** Unknown. That is the finding.
- **Actual implementation:** Good static hygiene (see §8) but zero measurement. No skip link. `--muted-foreground` on `--muted` used pervasively and unmeasured.
- **Governing architecture:** F-14, X-14, E5 §44/§48/§49.
- **Why it matters:** F-14 makes verification — not good intentions — the gate.
- **Destination:** Visual Design System (contrast/scalable type) → Interaction Design System (focus, keyboard) → Runtime Engineering.

### F-04 — The entire authenticated experience is unverified at runtime
- **Priority:** P0 (verification task)
- **Location:** all `_authenticated` routes
- **Member experience:** Not observed by this audit.
- **Actual implementation:** No authenticated session was available (`LOVABLE_BROWSER_AUTH_STATUS=signed_out`).
- **Governing architecture:** Final Integration — the Integrated Athena Test cannot be applied to surfaces nobody has walked.
- **Why it matters:** Every presence, emotional-journey, failure-state and safety claim about the signed-in product is inference. F-37 additionally requires *end-to-end runtime* verification of the sealed former-partner boundary, which by definition cannot be satisfied by code trace.
- **Destination:** Governance / Founder Decision (schedule a supervised authenticated walk) → Runtime Engineering.

## P1 — Major experience gaps

### F-05 — Introductions are presented as a comparison list
- **P1** · `src/routes/_authenticated/introductions.tsx:87-89,125`; `src/lib/introductions.functions.ts:16-109`
- **Member experience:** Up to three people on one screen, each labelled with a degree of Athena's interest, plus copy naming the inventory ceiling.
- **Actual implementation:** List-returning server function; list-rendering component; `confidenceLabel()` per row.
- **Governing architecture:** X-31, F-31, X-32, F-32, E8 §6/§8, E1.
- **Why it matters:** The cap is correct policy that has become a display pattern. Nothing here is a score, yet the arrangement performs the function of one, and comparison is the specific experience E8 exists to prevent.
- **Destination:** UX Specification.

### F-06 — Raw `confidence` float is sent to the browser
- **P1** · `src/lib/introductions.functions.ts:101`
- **Member experience:** None today — the UI renders words only.
- **Actual implementation:** `confidence: Number(p.confidence ?? 0)` in the client payload.
- **Governing architecture:** E1 (no numerical reduction), X-32, F-32.
- **Why it matters:** The prohibition on scoring a person is currently enforced by a UI convention rather than a data boundary. It is visible in devtools and one component away from being rendered.
- **Destination:** Runtime Engineering.

### F-07 — Waiting does not exist as a designed state
- **P1** · `src/routes/_authenticated/home.tsx:92-93`; `src/routes/_authenticated/athena.tsx:623-665`
- **Member experience:** The foundational conversation closes warmly; the member returns to a near-empty Home; nothing explains what happens next or whether anything is required of them.
- **Actual implementation:** Home renders `EndingChoiceCard` (usually null), `ReadinessCard`, and two static links. No Waiting surface.
- **Governing architecture:** X-03, X-24, F-24, E2 §15, E7 §25–§27.
- **Why it matters:** This is the longest stretch of the member's life in the product and the emptiest. It is where a member decides Athena forgot them.
- **Destination:** UX Specification.

### F-08 — Mutual interest has no experiential moment
- **P1** · connection creation path; `src/lib/connections.server.ts`
- **Member experience:** A thread appears.
- **Actual implementation:** `connection` + `conversation` rows created on mutual accept.
- **Governing architecture:** X-34, F-34, E8 §31–§34, Presence Curve.
- **Why it matters:** Correctly free of spectacle and equally free of meaning. It is also the point at which the Presence Curve requires Athena to visibly recede, and she cannot recede from a transition that does not exist.
- **Destination:** UX Specification → Motion Design System.

### F-09 — No counterpart photography anywhere in the introduction sequence
- **P1** · `src/lib/introductions.functions.ts`; `src/routes/_authenticated/introductions*.tsx`; `src/routes/_authenticated/connections.$id.tsx`
- **Member experience:** A member decides whether to meet someone they have never seen.
- **Actual implementation:** No photo field is selected or rendered on any counterpart surface. Members upload photos (`photo-uploader.tsx`) that no one is shown.
- **Governing architecture:** X-33, F-33, E8 §21–§24.
- **Why it matters:** F-33 affirms that physical attraction remains legitimate and important, and asks for sequencing, not omission. Progressive revelation is currently satisfied vacuously. This gap is larger than the Register anticipated.
- **Destination:** UX Specification → Visual Design System.

### F-10 — Four operational conditions are indistinguishable; AI failure is silent
- **P1** · `src/lib/athena.functions.ts:114,170`; `src/routes/_authenticated/athena.tsx:512,712-729`
- **Member experience:** Athena stops. The member cannot tell whether she is thinking, the network dropped, the request failed, or the service is down.
- **Actual implementation:** Uncaught `generateText` in `askAthena`; no timeout on any gateway call; all calls buffered rather than streamed; one `animate-pulse` state for everything; no offline handling.
- **Governing architecture:** F-18, F-28, X-18, X-28, E6 §53–§54, E7 §51–§53.
- **Why it matters:** Athena has no voice in her own failure, and atmospheric motion continues after work has stopped — the exact condition F-18 prohibits.
- **Destination:** UX Specification (state language) → Runtime Engineering (handling, timeouts, streaming).

### F-11 — Relationship rest and account pause are two different things sharing one word
- **P1** · `src/routes/_authenticated/profile.tsx:221-232`; `src/components/ending-choice-card.tsx:11`
- **Member experience:** A member who chose "rest" after an ending may reasonably believe they are paused, and vice versa. The two states are independent.
- **Actual implementation:** `profiles.is_paused` via `setAccountPaused`, and an ending-transition `rest` with `hold_until` — separate mechanisms, both consulted independently.
- **Governing architecture:** X-30, F-30, E7 §28–§29.
- **Why it matters:** Compounds F-01. Two overlapping notions of "not right now" with different semantics and different exit conditions.
- **Destination:** UX Specification → Runtime Engineering.

### F-12 — Focus Mode renders nothing, and explains nothing, when ineligible
- **P1** · `src/components/focus-mode-card.tsx:46`
- **Member experience:** A feature the member may have heard of simply is not there, with no account of why or when it might be.
- **Actual implementation:** `if (!state.eligible) return null`.
- **Governing architecture:** X-36, F-36, E2 (the member must know where they are), E7.
- **Why it matters:** Silent conditional surfaces are the interaction equivalent of Athena refusing to answer.
- **Destination:** UX Specification.

### F-13 — Return after an ending is indistinguishable from never having left
- **P1** · `src/lib/relationship.server.ts:144`; `src/lib/readiness.server.ts:21-33`
- **Member experience:** Introductions resume. Nothing acknowledges the ending, and prior preferences are treated as current truth.
- **Actual implementation:** Hold releases; readiness re-evaluates; the ordinary queue resumes.
- **Governing architecture:** X-37, F-37, E8 return-and-recalibration.
- **Why it matters:** F-37 requires continuation rather than reset *and* recalibration of what changed. The first is satisfied; the second is absent, which is the more consequential half.
- **Destination:** UX Specification → Runtime Engineering.

### F-14 — First-meeting safety is not present where the first meeting is arranged
- **P1** · `src/routes/_authenticated/connections.$id.tsx:229-333`
- **Member experience:** A member schedules a first meeting with a stranger and receives no preparedness support at that moment.
- **Actual implementation:** Report and Block exist throughout; the only safety guidance is static copy on `/community-guidelines:89-90`.
- **Governing architecture:** X-35, F-35, Trust & Safety doctrine.
- **Why it matters:** X-35 asks for quiet preparedness rather than fear. Today there is neither.
- **Destination:** Trust & Safety → UX Specification.

### F-15 — Athena's failure to communicate her own privacy restraint
- **P1** · voice handling; founder boundary; former-partner sealing; export
- **Member experience:** The strongest privacy properties in the product — audio never stored, former-partner knowledge sealed at ending, provenance deleted with an inference — are invisible.
- **Actual implementation:** All three are correctly implemented (§6, §4/E8, `understanding.tsx:53-54`) and none is communicated except the third.
- **Governing architecture:** E1 (perceptible restraint), Privacy & Security v1, Final Integration.
- **Why it matters:** Privacy the member cannot perceive cannot earn trust, and trust is the product.
- **Destination:** UX Specification → Privacy & Security (copy review).

### F-16 — Native `confirm()` at the two most consequential safety moments
- **P1** · `src/routes/_authenticated/messages.$id.tsx:114-124`; `src/routes/_authenticated/moderation.tsx:43`
- **Member experience:** Blocking someone — and banning someone — is confirmed by a browser system dialog.
- **Actual implementation:** `window.confirm`.
- **Governing architecture:** E5/E7 continuity; Trust & Safety (understandable, proportionate).
- **Why it matters:** A total break in authored voice at the moment the member most needs to understand consequences; the consequence of blocking (closing the connection) is stated only afterwards, in a toast.
- **Destination:** Interaction Design System → Trust & Safety.

## P2 — Design-system / UX implementation gaps

| ID | Finding | Location | Governing | Destination |
|---|---|---|---|---|
| F-17 | Landing and internal surfaces read as two products (confirmed at 1440 px) | `landing-background.tsx:293`; `styles.css:49-97` | X-10, F-10 | Visual Design System |
| F-18 | Generic `animate-pulse` stands in for Athena's thinking and listening | `athena.tsx:512,712-729` | X-17, F-17 | Motion Design System |
| F-19 | One global 1200 ms fade for every transition regardless of significance | `styles.css:161-167` | X-20, F-20 | Motion Design System |
| F-20 | Landing canvas bypasses the token system entirely (hex gradient + raw rgba) | `landing-background.tsx:208,216-218,235-244,293` | X-12, F-12 | Visual Design System |
| F-21 | `bg-black/*` scrims and `text-white/90` controls remain non-semantic | `photo-uploader.tsx:161-165`, `report-sheet.tsx:27`, `athena.tsx:587,633`, shadcn overlays | X-12, F-12 | Visual Design System |
| F-22 | No sonic identity, and one unselected chime shipping in production | `landing-background.tsx:73-101` | X-07, F-08, X-06, F-07 | Sonic Design System |
| F-23 | No member sound controls; sound-off completeness unguaranteed | product-wide | X-06, F-07 | Sonic Design System → UX Specification |
| F-24 | Voice lacks barge-in, playback control, and honest transcription failure | `athena.tsx`, `api/stt.ts` | X-09, X-25, F-05, F-25 | Interaction Design System → Runtime Engineering |
| F-25 | Athena is last in the arrival sequence | `onboarding.tsx`, `_authenticated/route.tsx` | X-22, F-22 | UX Specification |
| F-26 | Onboarding reads as a form ("Step 1 · You") | `onboarding.tsx:18,281` | X-23, F-23 | UX Specification |
| F-27 | Two overlapping understanding-correction surfaces with unexplained difference | `understanding.tsx`, `profile.review.tsx` | E7, X-27 | UX Specification |
| F-28 | Three distinct "conversation" concepts share the word | `/athena`, `/conversations`, `/messages` | E7 continuity | UX Specification |
| F-29 | Three routes are tab-less and reachable only by link | `conversations.tsx`, `notifications.tsx`, `moderation.tsx` | X-26, F-26 | UX Specification |
| F-30 | `Sparkles` glyph on the `Meet` tab | `mobile-tab-bar.tsx:2,14` | Generic-AI regression | Visual Design System |
| F-31 | No notification quiet standard (behaviour already restrained) | `notifications.server.ts` | X-02 | UX Specification |
| F-32 | No visual privacy treatments | product-wide | X-15, F-15 | Privacy & Security → Visual Design System |
| F-33 | Desktop and tablet render a 480 px column with an empty canvas | `styles.css:153-160` | E5, no governing doctrine | Visual Design System / Governance (decide intent) |
| F-34 | Unexplained cosmetic 700 ms delay before entering Athena | `onboarding.tsx:119` | X-04, E6 (no manufactured delay) | Motion Design System |

## P3 — Polish

| ID | Finding | Location | Destination |
|---|---|---|---|
| F-35 | Introduction detail re-filters the full list client-side; likely shows "not available" once an introduction becomes a connection | `introductions.$id.tsx:44-45` | Runtime Engineering |
| F-36 | Unused shadcn primitives shipped (`progress.tsx`, `skeleton.tsx`, `badge.tsx`, `sidebar.tsx`) — future ranking/gamification affordances sitting in the tree | `src/components/ui/` | Runtime Engineering |
| F-37 | No skip-to-content link | `__root.tsx` | Interaction Design System |
| F-38 | `founder.tsx:101` uses `<h1>` for a panel title | `founder.tsx` | Runtime Engineering |
| F-39 | The member-facing claim that safety messages always bypass preferences is not verified against server behaviour | `notifications.tsx:158` | Runtime Engineering |
| F-40 | System-prompt exfiltration is prevented by instruction only, with no output-side check | `athena.functions.ts:108` | Governance / Runtime Engineering |
| F-41 | F-07 identifier collision between E4 audio controls and the E8 sealed-partner boundary | `DECISION-REGISTER.md` | Governance / Founder Decision |

---

# 18. Already Aligned — Do Not Break

**This section is the most operationally important part of the audit.** Each
item below already satisfies canonical architecture and must survive the
aesthetics, UX, visual, sonic, motion and interaction phases intact. Breaking
any of them would cost more than the improvement that displaced it.

1. **No dating-app mechanics exist.** No swipe, grid, heart, percentage,
   ranking, streak, badge, scarcity, countdown, celebration, infinite discovery
   or feed. Verified by exhaustive grep (§13). *Protect absolutely.*
2. **No engagement or retention incentive exists.** `learning.server.ts:20-21`
   explicitly excludes message volume, latency, session length, app opens,
   acceptance rate and match counts as signals. No analytics library. No
   payment. *Protect absolutely — this is what makes F-38 achievable.*
3. **Understanding is enforced before matching structurally**, not by
   convention: `home.tsx:45-51` routing gates, plus `readiness.server.ts`
   thresholds and `introductionGate`.
4. **The three-introduction ceiling is server-enforced**
   (`introductions.server.ts:22,252-254`; mirrored in `readiness.server.ts:217-271`).
   Presentation must change; the cap must not.
5. **No numeric score is ever displayed to a member.** `confidenceLabel()` is a
   UI convention that must be replaced by something better, never by a number.
6. **Counterpart location is generalised before mutual connection**
   (`introductions.functions.ts:74-75`).
7. **Former-partner knowledge is sealed from matchmaking.**
   `partner_perception` and `post_meeting_reflections` are never queried in the
   matchmaking path; `reasonPair` accepts only `understanding_facets`
   (`introductions.server.ts:25-30,120-164,319-334`). *Any future "improve
   matching with meeting outcomes" work must not breach this.*
8. **The Non-Quotation / Non-Imitation Standard is live in the runtime prompt**
   (`athena-doctrine.server.ts:101-106`), and no faculty, founder, or
   architecture language reaches the model.
9. **Athena refuses the AI/chatbot frame and does not break it**
   (`athena.server.ts:234`).
10. **The doctrine is injected as a compact synthesis, never the full
    curriculum** (`athena-doctrine.server.ts:1-19,72-108,114-214`).
11. **Athena decides when to close the conversation**, signalled by the server
    (`offer_return`) and offered as "A natural place to pause"
    (`athena.tsx:560-569,623-665`). Not a visible timer, not a member chore.
12. **Reflection is flushed on unmount and `pagehide`**
    (`athena.tsx:228-250`) — understanding survives a closed tab.
13. **The three-path ending** — rest / resume / talk, Athena's own words,
    "Nothing is final", no matchmaking or commercial exploitation at the moment
    of loss (`ending-choice-card.tsx`, `relationship.server.ts:27-47`). *The best
    thing in the product.*
14. **The guided reflection flow**, including the two-question follow-up branch
    on "no" and the safety link threaded through every state
    (`reflection-flow.tsx:361-382`).
15. **Private partner perception, explicitly labelled as never shown to the
    other person** (`connections.$id.tsx:351`).
16. **Provenance-aware inference removal**: "I'll delete this understanding and
    how I arrived at it" (`understanding.tsx:53-54`).
17. **Versioned, granular, append-only consent with immediate withdrawal
    effect** (`consent.functions.ts:42,79,99-116`). No agree-to-all.
18. **Step-up reauthentication before sign-out-everywhere, export and deletion**
    (`device-safety-panel.tsx:63`), with a server-verified typed confirmation
    phrase for deletion.
19. **Real, unobstructed deletion and export**, reachable in two taps from
    Profile. Nothing is buried to protect retention.
20. **Server-side moderator authorization** — `requireSupabaseAuth` +
    `isModerator` in `moderation.functions.ts:3,7,13,17`, with the client
    redirect as convenience only.
21. **Notifications built without nudges**: no streaks, countdowns, scarcity,
    re-engagement or unread pressure (`notifications.server.ts:4`), six member
    controls.
22. **Voice endpoints authenticated, feature-flagged, rate-limited, and
    non-persistent** (`api/tts.ts:9-16`, `api/stt.ts:9-14`) — F-09 upheld.
23. **A single semantic OKLCH token system with near-zero hardcoded colour in
    application components** — the discipline that makes a palette change
    feasible at all.
24. **No fake progress anywhere.** The only progress indicator is driven by real
    step index (`onboarding.tsx:133,281`).
25. **Bespoke conversation components** rather than a chat widget
    (`athena.tsx:689-729`).
26. **Defer exists as a first-class response** alongside accept and decline —
    uncertainty is a permitted answer.

---

# 19. Final Gap Map

## A. Beta blockers (true P0 only)

1. **F-01** — pause expiry silently returns a member to matchmaking; contradicts
   binding X-01/F-30. *Runtime Engineering.*
2. **F-02** — no reduced-motion support; F-16 is a declared beta gate.
   *Motion Design System → Runtime Engineering.*
3. **F-03** — accessibility unverified, contrast unmeasured; F-14 is a declared
   beta gate. *Visual + Interaction Design Systems.*
4. **F-04** — the entire authenticated experience is unverified at runtime, and
   F-37 requires end-to-end runtime verification that has not occurred.
   *Governance → Runtime Engineering.*

## B. Major runtime / UX gaps (P1)

F-05 comparison-list presentation · F-06 confidence float on the wire ·
F-07 no Waiting state · F-08 no mutual-interest moment · F-09 no counterpart
photography · F-10 indistinguishable failure states and silent AI failure ·
F-11 two meanings of pause · F-12 silent Focus Mode · F-13 no recalibration on
return · F-14 no first-meeting safety in context · F-15 privacy restraint
uncommunicated · F-16 native `confirm()` at safety moments.

## C. Upcoming aesthetics / design-system work

**Visual Design System:** F-17 entry/internal reconciliation · F-20 landing
canvas tokenisation · F-21 scrim tokenisation · F-30 Sparkles glyph ·
F-32 visual privacy · F-33 desktop/tablet intent · plus X-11 palette resolution
and the contrast half of F-03.

**Motion Design System:** F-18 Athena-native state language · F-19 state-aware
transitions and ceremony · F-34 unexplained delay · plus the specification half
of F-02 and X-19 connection-field behaviour.

**Sonic Design System:** F-22 sonic signature and the stray landing chime ·
F-23 member sound controls.

**Interaction Design System:** F-24 voice fidelity and barge-in · F-16 authored
confirmation patterns · F-37 skip link · plus the keyboard/focus half of F-03.

**UX Specification:** F-05, F-07, F-08, F-09, F-11, F-12, F-13, F-25, F-26,
F-27, F-28, F-29, F-31, and the copy half of F-15.

## D. Later product work (intentionally outside the aesthetics phase)

- **Business Architecture** — payment placement under F-29. Nothing exists;
  nothing should be built until Business Architecture authorizes it.
- **Analytics & Outcomes** — realising F-38. The architecture is capable; the
  outcome vocabulary and successful-departure recognition are unbuilt.
- **Trust & Safety** — first-meeting preparedness design (F-14), enforcement
  communication, severe-conduct escalation.
- **Privacy & Security** — X-08 locked-screen/environmental voice privacy;
  X-15 visual privacy treatments; F-40 prompt-exfiltration posture.
- **Runtime Engineering (non-aesthetic)** — F-06 data boundary, F-10 timeouts
  and streaming, F-35 introduction detail fetch, F-36 unused primitive removal,
  F-39 notification bypass verification.
- **Governance** — F-41 identifier collision; F-33 desktop intent; scheduling
  the F-04 authenticated verification walk.

## E. Already aligned — protect during redesign

See §18. Twenty-six behaviours. The four that would be most costly to lose and
are most at risk from a presentation-layer rewrite:

- the **absence** of dating-app mechanics and engagement incentives (items 1–2)
  — absences are the easiest thing for a redesign to accidentally fill;
- the **server-enforced** understanding-before-matching gates and three-cap
  (items 3–4) — easy to bypass while "improving" the introductions screen;
- the **sealed former-partner boundary** (item 7) — a plausible future feature
  ("use meeting outcomes to match better") would breach it;
- the **ending experience** (item 13) — the most emotionally correct thing in
  the product and the most likely to be flattened by a component-library pass.

---

# 20. Recommended Sequencing by Destination

Sequence, not schedule. Nothing below is authorized by this audit.

1. **Governance / Founder Decision** — resolve F-41 (F-07 identifier
   collision); decide F-33 (what Athena is on a desktop screen); commission the
   F-04 authenticated runtime verification walk, including the F-37 end-to-end
   trace. *These gate the accuracy of everything downstream.*
2. **Runtime Engineering (P0 only)** — F-01 pause expiry. It contradicts a
   binding decision and belongs to no design phase.
3. **Privacy & Security** — X-08 and X-15 inputs, so the Visual and Sonic
   systems inherit privacy constraints rather than retrofitting them.
4. **Trust & Safety** — first-meeting preparedness doctrine (F-14) and
   enforcement communication, so the UX Specification has safety requirements in
   hand.
5. **UX Specification** — the largest block: Waiting (F-07), single-person
   presentation (F-05), progressive revelation with photography (F-09),
   mutual-interest handoff (F-08), Focus Mode visibility (F-12), return and
   recalibration (F-13), pause reconciliation (F-11), arrival ordering (F-25),
   onboarding framing (F-26), control consolidation (F-27–F-29), privacy copy
   (F-15). Every other design system depends on its state inventory.
6. **Visual Design System** — palette resolution, entry/internal reconciliation,
   tokenisation of remaining colour, and the contrast half of the F-14
   accessibility gate.
7. **Motion Design System** — reduced motion first (it is the beta gate), then
   Athena-native state language, then ceremony.
8. **Sonic Design System** — signature and member sound controls; retire or
   adopt the landing chime.
9. **Interaction Design System** — voice fidelity and barge-in, authored
   confirmation patterns, keyboard and focus behaviour.
10. **Runtime Engineering (P1/P2 implementation)** — build against the finished
    specifications: failure-state handling, timeouts and streaming, the
    confidence data boundary, offline behaviour.
11. **Analytics & Outcomes** — only after relationship-quality and
    successful-departure definitions are settled, so measurement never precedes
    meaning.
12. **Business Architecture** — last, per F-29.

---

*End of audit. No remediation performed. No decision closed. No canonical
document amended.*
