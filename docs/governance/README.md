# Governance

## Decision principles
- The Constitution (`docs/constitution/`) governs behavior; every rule has
  exactly one canonical home. Directionality L1 → L7 is strict.
- Product docs cite constitution anchors, never redefine them.
- Business docs govern commercial behavior only.

## Change control
See `docs/constitution/META-PREAMBLE.md`. Constitutional changes require:
1. Written proposal naming affected layer(s) and clauses.
2. Duplication / directionality check.
3. Explicit approval decision recorded.
4. Revision history table updated in the amended layer.

## Milestones
Named rollback points live in `docs/engineering/MILESTONES.md`. Current:
- Athena Foundation Stable v1 — matchmaking engine + eligibility gates.
- Athena Foundation Stable v2 — core loop stabilized (Phase 2/2.5).
- Phase 3 shipped — Terms/Guidelines, history, deep intros, PWA install.

## Ownership
- Constitution changes: product owner + engineering lead approval.
- Schema changes: engineering lead approval; include GRANTs + RLS in same
  migration.
- AI prompt changes in `ai-gateway.server.ts`: verify Athena, Meet, and
  post-meeting flows before merging.
