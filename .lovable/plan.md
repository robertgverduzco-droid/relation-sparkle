# Consolidated Documentation Plan — Approved Architectural Actions

Covers only Recommendations 2, 3 (audit), 4, and 5. Recommendation 1 (L6d) is deferred and appears nowhere in this plan.

## Guarantees

- No runtime behavior will change.
- No prompt text will change.
- No database, schema, table, function, route, or component will change.
- No existing constitutional directionality rule will be violated.
- Voice & Expression remains structurally cross-cutting while becoming canonical.
- Constitutional doctrine governs the runtime prompt; the prompt never governs doctrine.
- The two research files are audited only — nothing merged, deleted, renamed, or redirected.
- Reflection terminology is clarified without renaming any working system.

Every edit below is to a Markdown file under `docs/`. No file in `src/`, `supabase/`, or any config is touched.

---

## Recommendation 3 — Audit report (already performed, read-only)

This was the only approved action I could complete without modifying anything, so the findings are below rather than deferred to implementation.

**Headline finding: these are not duplicates.** They are two different documents whose filenames collided by accident. Neither should be deleted.

| | `athena-human-understanding-framework-v1.md` (singular) | `athena-human-understanding-frameworks-v1.md` (plural) |
|---|---|---|
| Title | Athena Human Understanding Framework — v1 (Research & Architecture) | Athena Research Brief — Frameworks of Human Understanding, v1 |
| Lines | 361 | 208 |
| Nature | Athena's **own** original framework | Survey of **external** established frameworks |
| Status line | "Draft for review. Do not implement." | "Research only." |

**Content unique to the singular file:** Athena's 21 dimensions across Families A–D, evidence and confidence methodology, contradiction handling, pair-level compatibility reasoning, introduction derivation, integration with the existing architecture, duplication/conflict analysis, and next-artifact recommendations.

**Content unique to the plural file:** Reviews of Big Five/OCEAN, Attachment Theory, VIA Character Strengths, Gottman, Motivational Interviewing, and adjacent traditions; cross-framework recurring concepts; the three listening registers; question philosophy; adapted OARS listening moves; source provenance.

**Shared content:** Essentially none at the section level. The only overlap is thematic — both reject labels and typologies, and the singular file's "Guiding Principles" section is explicitly derived from the plural file. The singular file already names the plural file as "Companion to: ... (source synthesis)."

**Existing references:** Four constitutional layers cite the **singular** file as their migration source — L3 (§3), L4 (§§4–5), L5 (§8), and L6b (§6). The plural file has **zero** inbound references outside my own proposal document.

**Which is more complete:** Neither supersedes the other. The singular file is the more complete *architecture* document and is the one the constitution was built from. The plural file is the more complete *research* document and is the upstream evidence base the singular file synthesizes.

**Recommendation:** Keep both. The problem is naming, not duplication. The lowest-risk fix is to leave both files exactly where they are and add a one-line cross-reference header to the plural file pointing to the singular file as its downstream synthesis — mirroring the pointer that already exists in the other direction. A rename of the plural file to something like `athena-source-frameworks-review-v1.md` would be clearer still, but it is not necessary and I am not proposing it unless you ask.

**This plan makes no change to either file.** If you approve the cross-reference header, I will treat that as a separate, explicit approval.

---

## Recommendation 2 — Voice & Expression becomes cross-cutting canonical

Smallest change that promotes status without creating L8 and without merging into L2.

### Edit 2a — `docs/constitution/cross-cutting/voice-and-expression.md`

Change the status line from advisory to canonical, and add a short subsection establishing the substantive document that will fill it.

- Status line changes from `Status: charter. This is not a constitutional layer.` to a canonical cross-cutting status: canonical doctrine, cross-cutting rather than layered, binding on every user-facing layer.
- Add a "Canonical status and structure" subsection stating that Voice & Expression is canonical doctrine that applies across layers rather than sitting at a fixed position in the L1→L7 chain, and that being cross-cutting does not make it advisory.
- Add a "Substantive canonical document" subsection naming **Athena — Personality & Conversation Style** as the forthcoming document that will carry the substantive definition of Athena's expressed identity within this domain, and stating that until it is written and approved, this charter's scope section governs and all current runtime behavior is preserved unchanged.
- Add a "Binding effect" subsection: all user-facing constitutional layers, product behavior, and runtime prompts must remain aligned with this doctrine.
- Add a row to the existing revision history table.

### Edit 2b — `docs/constitution/README.md`

The layers table stays exactly as it is — L1 through L7, no L8. Only the "Cross-cutting" line below the table changes, from a plain bullet to a line marking Voice & Expression as canonical cross-cutting doctrine binding on all user-facing layers, with Personality & Conversation Style noted as pending.

### Directionality

Unaffected. A cross-cutting domain sits outside the L1→L7 chain, so no upward dependency is introduced. The existing rule in the charter — that Voice & Expression depends on the layers below it and modifies none of them — is preserved verbatim.

---

## Recommendation 4 — Prompt governance in L7, with corrected authority hierarchy

### Edit 4a — `docs/constitution/L7-operational.md`

Append one section, "Athena System Prompt — Runtime Implementation Governance," containing:

1. **Authority hierarchy**, stated in this order and explicitly non-negotiable:
   1. Athena's constitutional doctrine governs.
   2. The canonical Personality & Conversation Style document (within cross-cutting Voice & Expression) defines Athena's expressed identity.
   3. The runtime system prompt *implements* that doctrine.
   4. Every prompt change is reviewed against the governing constitutional documents before implementation.
2. **An explicit non-authority clause**: the source-code prompt is an implementation artifact and never governs, overrides, amends, or supersedes constitutional doctrine. Where prompt and doctrine diverge, doctrine is correct and the prompt is defective.
3. **Location**: the runtime prompt lives in `src/lib/athena.server.ts`, recorded as location only, not as source of truth.
4. **Purpose**: translating doctrine into model-executable instruction.
5. **Version and change history**: a table for recording prompt changes, seeded with the current state as the baseline entry. No prompt text is copied into the document.
6. **Review requirements**: which layers must be checked for which kinds of change — L2 for refusal and boundary language, L3 for anything touching how a person is understood or the no-labels rule, L6a for conversational conduct, and cross-cutting Voice & Expression for tone, warmth, uncertainty expression, and explanation framing.
7. **Governing documents list**: the specific documents that govern the prompt.

The section will state that it deliberately does not restate prompt text, because restating creates drift.

### Not done

The runtime prompt is not modified, read into the document, or referenced as authoritative.

---

## Recommendation 5 — Reflection terminology notes

Two documentation-only notes, no renames anywhere.

### Edit 5a — `docs/constitution/L5-memory.md`

Add a short "Terminology note — conversation reflection" subsection defining **conversation reflection** as Athena's AI-generated post-conversation distillation, owned by L5 Memory and the Living Profile system, and distinguishing it by name from meeting reflection, which L5 does not own.

### Edit 5b — `docs/product/relationship-support.md`

Add the mirrored "Terminology note — meeting reflection" subsection defining **meeting reflection** as member-submitted guided feedback following an introduction or meaningful interaction, owned by Relationship Support and the connection lifecycle, and distinguishing it from conversation reflection.

Both notes will state plainly that the underlying code identifiers are intentionally left unchanged to avoid touching working systems.

### Not done

No table, column, file, function, route, or component is renamed. `reflections`, `post_meeting_reflections`, `reflection_submissions`, `reflection-flow.tsx`, and every related identifier stay exactly as they are.

---

## Complete file manifest

| File | Change |
|---|---|
| `docs/constitution/cross-cutting/voice-and-expression.md` | Status advisory to canonical; add canonical-status, substantive-document, and binding-effect subsections; revision history row |
| `docs/constitution/README.md` | Cross-cutting line updated to reflect canonical status; layers table untouched |
| `docs/constitution/L7-operational.md` | Append prompt-governance section with corrected authority hierarchy |
| `docs/constitution/L5-memory.md` | Append conversation-reflection terminology note |
| `docs/product/relationship-support.md` | Append meeting-reflection terminology note |

Five Markdown files. No other file of any kind is modified. Recommendation 1 produces no edits. Recommendation 3 produces no edits.

---

## Open question for you

The Recommendation 3 audit found the two research files are genuinely different documents, not duplicates. Confirm whether you want the one-line cross-reference header added to the plural file, or whether both files should be left completely untouched for now.
