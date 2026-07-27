# Meta-Preamble — Constitutional Evolution

Status: charter. Governs how the constitution itself changes.

The constitution is living but not casual. It evolves intentionally,
transparently, and through explicit review. Silent drift is the failure mode
this preamble exists to prevent.

## Principles

1. **Explicit review.** No constitutional clause is added, edited, or removed
   without a written proposal and an explicit approval decision.
2. **One canonical home.** Every rule lives in exactly one layer. Duplication
   is a defect and must be resolved by choosing a canonical location and
   replacing others with references.
3. **Directionality preserved.** Every proposal is checked against the
   directionality rule in `README.md` before approval.
4. **Traceability.** Older versions remain reachable through the revision
   history at the bottom of each layer file and through the `_legacy/`
   redirect stubs.
5. **Evidence-informed.** Product use, research findings, and post-meeting
   outcomes may prompt revision proposals, but do not silently modify the
   constitution.

## Revision process

1. **Propose.** Draft the change as a short document naming the affected
   layer(s), the exact clauses added, edited, or removed, and the reason.
2. **Conflict check.** Search every layer for conflicting or duplicated
   clauses. List them in the proposal.
3. **Directionality check.** Confirm no upward dependency is introduced.
4. **Review.** The proposal is reviewed against Athena's mission and existing
   layers. Approval is explicit.
5. **Apply.** Update the target layer file(s). Record the change in the layer's
   revision history table.
6. **Reference update.** If the change affects a canonical anchor, update the
   cross-layer reference index in `README.md`.

## Drift prevention

- Every layer file ends with a revision history table. An unrecorded change is
  treated as a defect.
- Any code, prompt, or product surface that restates a constitutional rule
  should cite the canonical anchor rather than paraphrase it.
- Redirect stubs in `docs/_legacy/` preserve access to superseded documents so
  that old references remain traceable.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-07-27 | Initial meta-preamble established alongside layered scaffold. |
