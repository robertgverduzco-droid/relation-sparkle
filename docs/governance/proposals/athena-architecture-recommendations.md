# Proposal — Addressing Athena Architectural Recommendations

Date: 2026-08-01
Status: Awaiting approval

## Background

The recent architectural inventory identified five design/doc gaps that are not yet owned by any existing document or layer. This proposal lists each gap, the conflict or risk it creates, the smallest recommended fix, and the exact files that would change. No implementation is performed in this document.

## Scope boundary

- This proposal only creates or reorganizes **documents, file names, and terminology**. It does not change prompts, runtime behavior, or database schema unless explicitly noted.
- If any recommendation below is approved, a follow-up implementation plan will be written before code changes.

---

## Recommendation 1 — §11 (Self-evaluation) needs a constitutional layer

### What was observed

§11 (Athena's own self-evaluation / performance calibration) is discussed in the inventory but has no canonical owner in the current 7-layer constitution. It is not L4 (epistemics is about belief formation regarding members, not Athena's own model performance) and it is not L7 (operational is about engineering/runtime constraints, not cognitive self-assessment).

### Conflict / risk

Without a clear layer, any future self-evaluation rule could be pushed into L4 or L7 improperly, violating the directionality rule (L4 and L7 must not depend on higher layers). It also creates confusion about where to place model drift, calibration, and quality-loop governance.

### Proposed fix

Add a new constitutional layer: **L6d — Self-Reflective Reasoning**. Placement: after L6c (Decision & Introduction) so the directionality rule still holds.

`docs/constitution/L6d-self-reflective-reasoning.md` would own:

- Athena's own performance calibration and quality loops.
- When and how Athena questions its own conclusions.
- Model drift, confidence recalibration, and systematic error correction.
- Feedback loops between introductions and reasoning quality.

It would depend on L6c (outcomes from introductions feed self-reflection) and all lower layers, but no lower layer would depend on it.

### Files changed

- `docs/constitution/L6d-self-reflective-reasoning.md` (new)
- `docs/constitution/README.md` (add L6d to layers table)
- `docs/constitution/META-PREAMBLE.md` (if cross-layer index references §11)
- `docs/technical/DEPENDENCY_MAP.md` (add L6d dependency arrow)
- `docs/technical/SYSTEM_OVERVIEW.md` (add L6d to cognition layer)

### Risk / trade-off

Adding a layer is a structural change. Downstream product or technical docs that mention the seven layers would need to be updated to mention eight. This is a one-time terminology change, not a behavior change.

---

## Recommendation 2 — Promote Voice & Expression to a canonical layer

### What was observed

Voice & Expression currently lives at `docs/constitution/cross-cutting/voice-and-expression.md` with the status "cross-cutting, not a layer." However, §2 (Conversational Reasoning) and §9 (L2 Ethics and refusal language) both depend on it, and the live AI prompt in `src/lib/athena.server.ts` is effectively the de-facto specification. It is already used as canonical guidance but is not formally recognized as a layer.

### Conflict / risk

Keeping Voice & Expression as advisory creates a status mismatch: it is treated as canonical but not structurally canonical. Future changes to Athena's tone, refusal language, or uncertainty expression could be edited in the code prompt without any constitutional review path. This quietly bypasses the explicit-approval requirement in the Meta-Preamble.

### Proposed fix

Promote Voice & Expression to a full canonical layer. Two options:

**Option A — Standalone layer (L8 or cross-layer canonical)**

Create `docs/constitution/L8-voice-and-expression.md` as a canonical layer, placed after L7. It would still be referenced by all lower layers, but its own status would be "canonical" rather than "cross-cutting." This preserves the rule that higher layers may depend on lower layers, while making Voice & Expression a formal constitutional document.

**Option B — Merge into L2 Ethics**

Move the refusal, tone, and uncertainty-expression rules into L2 Ethics (where permission to speak or refuse is governed). Keep a redirect stub at the old location. This is the smaller change but it makes Voice & Expression a subordinate of ethics rather than a first-class cross-cutting concern.

### Recommended option

**Option A** — make it canonical as L8. Voice & Expression is broader than ethics (it covers warmth, clarity, uncertainty expression, and explanation framing), so it deserves its own layer. This also makes it easier to require explicit review for any prompt change that affects Athena's voice.

### Files changed

- `docs/constitution/L8-voice-and-expression.md` (new, promoted from cross-cutting)
- `docs/constitution/cross-cutting/voice-and-expression.md` (redirect stub pointing to new layer)
- `docs/constitution/README.md` (add L8 to layers table)
- `docs/technical/DEPENDENCY_MAP.md` (add L8 references)

### Risk / trade-off

Promoting to a layer requires that every prompt change that affects voice, tone, or refusal language be treated as a constitutional change. This is more rigorous but may slow down minor wording tweaks. If you prefer lighter governance, Option B is safer.

---

## Recommendation 3 — Resolve the duplicate research filename

### What was observed

`docs/research/` contains two files with nearly identical names:

- `athena-human-understanding-framework-v1.md`
- `athena-human-understanding-frameworks-v1.md`

They differ only by the plural "s" and by 153 lines. This makes it unclear which is authoritative.

### Conflict / risk

Future references may point to the wrong file. If the files diverge further, the Human Understanding Framework could be read from a stale or partial copy. This is a documentation hygiene issue, not a runtime bug, but it threatens consistency.

### Proposed fix

1. Read both files and determine which one is the complete/authoritative version.
2. Keep the authoritative version under a clear name, e.g. `athena-human-understanding-framework-v1.md`.
3. Replace the duplicate with a redirect stub that points to the canonical file.
4. Search the codebase for references to either filename and point them all to the canonical file.

### Files changed

- One of the two files becomes a redirect stub.
- Any code or docs referencing the removed filename get updated.

### Risk / trade-off

If both files contain distinct content, merging them may be necessary instead of deleting one. This is a documentation-only operation; no runtime risk.

---

## Recommendation 4 — Document the system prompt as canonical

### What was observed

Athena's actual personality and voice live in a string inside `src/lib/athena.server.ts`. The constitution and Voice & Expression guide describe the desired voice, but there is no single document that mirrors the live system prompt itself. This means any prompt edit is currently an unreviewed constitutional change, even though it has the largest direct impact on user-facing behavior.

### Conflict / risk

The Meta-Preamble requires explicit review for changes to constitutional rules. The prompt is the most concrete expression of those rules, yet it has no reviewable canonical document. This is a governance gap. It also makes future changes to Athena's voice harder to reason about: you must read the source code to know what she actually says.

### Proposed fix

Create a canonical document that references the prompt as the source of truth, rather than restating it.

**Recommended location:** `docs/constitution/L7-operational.md` is the correct layer because this is about how the constitution is implemented at runtime, not what the constitution says. Add a section to L7-operational.md titled "Athena System Prompt — Canonical Reference" that states:

- The canonical system prompt lives in `src/lib/athena.server.ts` (and any related prompt files).
- This document does not duplicate the prompt text; it describes the prompt's purpose, version policy, and review rules.
- Any change to the prompt that affects voice, refusal language, ethical boundaries, or explanation framing must be reviewed against the relevant constitutional layers (L2, L3, L6a, L8 if promoted).
- A small "key design choices" summary (e.g., "no labels," "no percentages," "quiet confidence") can be listed here as reference anchors, with the exact wording governed by the source file.

This keeps the live prompt as the single source of truth while making the prompt's governance visible in the constitution.

### Files changed

- `docs/constitution/L7-operational.md` (add prompt governance section)
- Optionally `docs/constitution/L8-voice-and-expression.md` if Recommendation 2 is approved (cross-reference the prompt section)

### Risk / trade-off

This does not change the prompt itself. It only documents where the prompt lives and how it is reviewed. The only risk is that future prompt edits become slightly more formal, which is the intended effect.

---

## Recommendation 5 — Disambiguate the two "reflection" concepts

### What was observed

Two distinct systems use the word "reflection":

1. `reflections` (post-conversation distillation) — generated after Athena conversations, stored in the `reflections` table, part of the Living Profile / memory system.
2. `post_meeting_reflections` / `reflection_submissions` (post-meeting guided flow) — completed after a member meets an introduction, part of the connection lifecycle.

They are unrelated but share vocabulary. This can cause confusion in code, docs, and future prompts.

### Conflict / risk

Miscommunication in future specs, debugging, and AI training. A developer or future AI assistant might assume "reflection" means only one of these systems. No runtime bug exists today, but it is a naming debt.

### Proposed fix

Do not rename tables or files (renaming would touch working code). Instead, add a terminology note in a visible document.

**Recommended location:** `docs/constitution/L5-memory.md` and `docs/product/relationship-support.md` each get a small "Terminology note" that clarifies:

- **Conversation reflection** = the AI-generated distillation after a conversation with Athena. Owned by L5 Memory / Living Profile.
- **Meeting reflection** = the member-submitted guided reflection after an introduction. Owned by Relationship Support / connection lifecycle.

This is a documentation-only change. The code terms remain unchanged to preserve working code.

### Files changed

- `docs/constitution/L5-memory.md` (add terminology note)
- `docs/product/relationship-support.md` (add terminology note)
- Optionally `docs/technical/DEPENDENCY_MAP.md` if the terms are listed there

### Risk / trade-off

Zero runtime risk. The only downside is that the vocabulary remains slightly ambiguous in code, which is mitigated by the documentation note.

---

## Implementation order

If all five recommendations are approved, the recommended order is:

1. **Recommendation 5** (terminology note) — no risk, purely additive.
2. **Recommendation 3** (duplicate filename) — documentation cleanup.
3. **Recommendation 4** (prompt governance) — documentation-only, but depends on L7.
4. **Recommendation 2** (Voice & Expression layer) — structural layer change.
5. **Recommendation 1** (L6d layer) — structural layer change.

## What I need from you

For each recommendation, please approve or reject. If you want a different option (e.g., merge Voice & Expression into L2 instead of promoting to L8), say so. No code changes will be made until you explicitly approve each one.
