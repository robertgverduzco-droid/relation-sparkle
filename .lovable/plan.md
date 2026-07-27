# Athena Constitutional Restructuring — Migration Plan

No files will be moved, merged, renamed, rewritten, or deleted until you approve this plan. This is the blueprint only.

---

## 1. Final proposed file tree

```text
docs/
  constitution/
    README.md                          # Index + directionality rule + how to read
    META-PREAMBLE.md                   # Constitutional evolution & change control
    L1-identity.md                     # Includes "Purpose and North Star" (canonical mission)
    L2-ethics.md
    L3-human-understanding.md
    L4-epistemics.md
    L5-memory.md
    L6a-conversational-reasoning.md
    L6b-relational-reasoning.md
    L6c-decision-and-introduction.md
    L7-operational.md
    cross-cutting/
      voice-and-expression.md
  product/
    README.md
    relationship-support.md            # Product capability governed by constitution
    introduction-experience.md         # UX surface for L6c decisions (optional stub)
  research/
    athena-human-understanding-framework-v1.md      # unchanged, source material
    athena-human-understanding-frameworks-v1.md     # unchanged, source material
  engineering/
    MILESTONES.md                      # moved from docs/MILESTONES.md
  _legacy/
    athena-ultimate-goal.md            # redirect stub -> L1 §Purpose and North Star
    athena-ethical-constitution.md     # redirect stub -> L2 + L6c
    MILESTONES.md                      # redirect stub -> engineering/MILESTONES.md
```

Rationale: `constitution/` is the cognitive spine, `product/` is capability, `research/` is source material, `engineering/` is implementation history, `_legacy/` holds redirect stubs so nothing 404s.

---

## 2. Source → destination migration map

| Source | Section | Destination | Notes |
|---|---|---|---|
| `docs/athena-ultimate-goal.md` | Entire document | `constitution/L1-identity.md` → **§Purpose and North Star** | Canonical mission home. |
| `docs/athena-ultimate-goal.md` | "14 integration points" list | `constitution/README.md` → §Cross-layer reference index | Becomes a reference map, not a duplicated rule. |
| `docs/athena-ethical-constitution.md` | Part I — Ethical Constitution | `constitution/L2-ethics.md` | Absorbs governing principles, ethical non-negotiables, privacy/dignity/consent/honesty/mutual-benefit/non-manipulation. |
| `docs/athena-ethical-constitution.md` | Part II — Introduction Philosophy | `constitution/L6c-decision-and-introduction.md` | Consolidated as the single Introduction Constitution. |
| `docs/athena-ethical-constitution.md` | Exploration Mode (future) | `constitution/L6c-decision-and-introduction.md` → §Future capabilities | Retained as future concept, not active behavior. |
| `docs/research/athena-human-understanding-framework-v1.md` | Dimensions, evidence categories, contradiction handling | `constitution/L3-human-understanding.md` (dimensions, no-labels rule, growth/change) + `constitution/L4-epistemics.md` (evidence, confidence, contradiction, revision) | Split by cognitive layer. Original research file stays intact as source. |
| `docs/research/athena-human-understanding-framework-v1.md` | 10-part pair reasoning | `constitution/L6b-relational-reasoning.md` | Replaces old "Compatibility Engine" naming. |
| `docs/research/athena-human-understanding-framework-v1.md` | Integration mapping to Living Profile / Topic Map / Facets | `constitution/L5-memory.md` | Memory lifecycle, revision, staleness, current-state vs historical. |
| `docs/research/athena-human-understanding-frameworks-v1.md` | Framework synthesis (Big Five, Attachment, VIA, Gottman, MI) | Stays in `research/` unchanged | Source material, not canonical rules. |
| `mem://index.md` Core rules | Mission + no-rushing intros + understanding-before-matching | Referenced from `L1 §Purpose and North Star` and `L3` | mem stays as agent runtime memory; constitution is the source of truth. |
| `docs/MILESTONES.md` | Entire file | `docs/engineering/MILESTONES.md` | Engineering log, not constitution. |
| Existing system prompt clauses in `src/lib/athena.server.ts` | Mission, no-labels, confidence caps, foundation gate, decision philosophy | Referenced from L1/L3/L4/L6c — **not moved yet** | Code stays untouched in this pass; future pass will make prompt cite the constitution. |

---

## 3. Duplicated clauses → single canonical home

| Clause (currently repeated) | Canonical home |
|---|---|
| Athena's mission / ultimate goal / North Star | `L1 §Purpose and North Star` |
| "Success = quality/longevity of relationships, not intro count" | `L1 §Purpose and North Star` |
| "Understanding always precedes matching" | `L3` (referenced by L6b, L6c) |
| "No fixed labels, no permanent personality types" | `L3` |
| "Confidence must never be 1.0 / distinction between confidence and certainty" | `L4` |
| Contradiction handling ("flag, don't overwrite") | `L4` (memory mechanics detailed in L5) |
| Privacy / consent / non-manipulation | `L2` |
| "Never rush introductions by time — only by genuine confidence" | `L6c` (with L4 confidence semantics) |
| Max 3 active introductions; not required to fill all 3 | `L6c` |
| Foundational-conversation eligibility gate (~20 min) | `L6c` (thresholds), referenced by L5 |
| Pair reasoning schema (alignments/complementary/frictions/hard conflicts) | `L6b` |
| Post-meeting reflection loop | `product/relationship-support.md` (mechanics) referencing L6a/L6b/L4 |

Every other mention becomes a one-line reference (`see L4 §Confidence`).

---

## 4. Redirect stubs left at old paths

Each stub is 3–6 lines: a note that the file has moved, one link to the new canonical location, and a "do not edit" marker. Kept so external links, prior chat references, and `mem://` pointers continue to resolve.

- `docs/athena-ultimate-goal.md` → `constitution/L1-identity.md#purpose-and-north-star`
- `docs/athena-ethical-constitution.md` → `constitution/L2-ethics.md` and `constitution/L6c-decision-and-introduction.md`
- `docs/MILESTONES.md` → `docs/engineering/MILESTONES.md`

Research files under `docs/research/` do **not** move and need no stubs.

---

## 5. New section stubs to create

Empty or charter-only stubs (2–5 sentences describing scope + directionality) so gaps are visible:

- `constitution/README.md` — index, directionality rule, cross-layer reference table
- `constitution/META-PREAMBLE.md` — evolution, review, versioning, drift prevention
- `constitution/L1-identity.md` — Identity + §Purpose and North Star
- `constitution/L2-ethics.md` — charter only until Part I content is migrated
- `constitution/L3-human-understanding.md` — charter + placeholder for migrated dimensions
- `constitution/L4-epistemics.md` — charter for evidence/confidence/revision
- `constitution/L5-memory.md` — charter for Living Profile / Topic Map / Facets lifecycle
- `constitution/L6a-conversational-reasoning.md` — charter
- `constitution/L6b-relational-reasoning.md` — charter (replaces "Compatibility Engine")
- `constitution/L6c-decision-and-introduction.md` — charter, absorbs Introduction Philosophy
- `constitution/L7-operational.md` — engineering constraints only
- `constitution/cross-cutting/voice-and-expression.md` — tone/warmth/clarity/transparency guide
- `product/README.md` and `product/relationship-support.md` — product capability, references constitution

---

## 6. Content that belongs outside the constitution

- **Research** (stays in `docs/research/`): framework synthesis, source-material summaries.
- **Product architecture** (`docs/product/`): Relationship Support, introduction experience, any future concierge features.
- **Engineering logs** (`docs/engineering/`): MILESTONES, rollback anchors, migration records.
- **Runtime memory** (`mem://`): agent working memory; references constitution but is not canonical.
- **Code-level prompts** (`src/lib/athena.server.ts` etc.): implementation of constitutional rules; will be aligned to cite the constitution in a later pass, not this one.

---

## 7. Rollback plan

- No content is deleted; originals are preserved either in place (research) or via redirect stubs (`_legacy/`).
- The restructuring is done in one commit boundary so a single history revert restores the previous tree.
- `docs/engineering/MILESTONES.md` records "Athena Foundation Stable v1" as the pre-restructure anchor; a new entry "Constitutional Architecture v1" will mark the post-restructure state once you approve substantive content migration.
- If any layer proves wrong after review, that single layer file can be reverted without touching the others because directionality forbids upward dependencies.

---

## 8. Verification checklist (no content lost)

Before marking the restructure complete:

1. Every paragraph from `athena-ultimate-goal.md` appears in `L1 §Purpose and North Star` or is explicitly noted as superseded.
2. Every clause from `athena-ethical-constitution.md` Part I appears in `L2`; every clause from Part II appears in `L6c`.
3. Every dimension, evidence rule, and contradiction rule from the Human Understanding Framework v1 research doc is mapped to L3/L4/L5/L6b as listed in §2, with a checkbox per item.
4. No clause appears verbatim in two constitutional files; duplicates are replaced by references per §3.
5. Redirect stubs resolve to the correct canonical anchor.
6. Directionality audit: grep each layer for references to higher-numbered layers; any hit is a violation and blocks completion.
7. `mem://index.md` updated to point Core rules at their new canonical anchors (no content change, only link updates).
8. Build + typecheck unaffected (no source files touched in this pass).

---

## 9. Directionality pre-flight (flagged now, before implementation)

Potential violations to watch for during migration:

- **L2 Ethics** currently contains Introduction Philosophy language that references specific decisions (an L6c concern). Migration must strip decision mechanics from L2 and leave only the ethical boundary ("Athena will never introduce under manipulation/coercion"), with the mechanics living in L6c.
- **L3 Human Understanding** research draft mentions pair reasoning; that must move to L6b, leaving L3 with only the theory of an individual.
- **L5 Memory** must not encode confidence semantics; those live in L4 and are referenced.
- **L7 Operational** must be scrubbed of any ethical or cognitive rules migrated from the old "Operational Constraints" section.

Each violation will be listed explicitly in the migration PR description when execution begins.

---

## What I need from you

Approve, amend, or reject this migration plan. On approval I will:

1. Create the new tree with charter-only stubs and redirect stubs.
2. Migrate content section-by-section per §2, preserving wording.
3. Run the §8 checklist and report results before recording the new milestone.

No substantive constitutional language will be rewritten in this pass — only relocated and deduplicated.