// Living Profile review + F-13 Change / Correction / Removal — server logic.
//
// Doctrine:
//   F-13 (docs/security/DECISION-REGISTER.md): three states, not one.
//     Change     — was true, no longer is. History is preserved AS history;
//                  the new understanding becomes authoritative for reasoning.
//     Correction — Athena was wrong. The incorrect understanding is
//                  superseded and the fact of the correction is retained so
//                  future reasoning is more careful in that area.
//     Remove     — the member wants it gone. The understanding AND its
//                  inference trail (facet history, revision statements) are
//                  destroyed.
//   F-14: stated and inferred material stay distinguishable.
//
// Privacy: this surface returns Athena's *understanding* only. It never
// returns her private reasoning chain, evidence attributed to other members,
// pair reasoning, or any system-internal material.
import type { FacetBasis, FacetKey } from "./facets";
import { BASIS_LABEL, FACET_LABELS } from "./facets";
import {
  depthStage,
  hasEvolvedSince,
  lensForFacet,
  memberFacingDepth,
  type DepthStage,
  type LensKey,
} from "./profile-depth";

export type { FacetBasis };
export { BASIS_LABEL };

export type RevisionKind = "change" | "correction" | "removal";

export type FacetView = {
  key: string;
  label: string;
  understanding: string;
  /** Qualitative only — numbers are never shown to members (L4). */
  held: "held lightly" | "reasonably understood" | "well-understood";
  /**
   * F-14 provenance. `stated` and `inferred` come from the stored basis.
   * `unestablished` means provenance was never recorded (legacy understanding)
   * — Athena must not claim member authorship she cannot evidence.
   */
  basis: FacetBasis;
  last_updated: string | null;
  revised: boolean;
  /** Specialist lens this facet belongs to (grouping only, not a new domain). */
  lens: LensKey;
  /** Internal depth stage; rendered as prose, never as a level or score. */
  stage: DepthStage;
  /** Member-facing wording for the stage. */
  depth: string;
  /** True when this understanding changed since the member last read it. */
  evolved: boolean;
};

/**
 * BR01-04 — provenance is read from the canonical `basis` column only.
 * The presence of evidence quotes never implies the member authored the
 * understanding; an inference can quote them and still be an inference.
 */
export function resolveBasis(basis: unknown): FacetBasis {
  return basis === "stated" ? "stated" : basis === "inferred" ? "inferred" : "unestablished";
}

type FacetRecord = {
  facet_key: string;
  understanding: string | null;
  confidence: number | null;
  evidence: unknown;
  basis?: unknown;
  refined_at: string | null;
};

export function toFacetView(
  row: FacetRecord,
  revisedKeys: Set<string>,
  opts?: { historyCount?: number; reviewedAt?: string | null },
): FacetView {
  const c = row.confidence ?? 0;
  const evidenceCount = Array.isArray(row.evidence) ? row.evidence.length : 0;
  const stage = depthStage({
    evidenceCount,
    historyCount: opts?.historyCount ?? 0,
    confidence: c,
  });
  return {
    key: row.facet_key,
    label: FACET_LABELS[row.facet_key as FacetKey] ?? row.facet_key,
    understanding: (row.understanding ?? "").trim(),
    held: c >= 0.7 ? "well-understood" : c >= 0.45 ? "reasonably understood" : "held lightly",
    basis: resolveBasis(row.basis),
    last_updated: row.refined_at,
    revised: revisedKeys.has(row.facet_key),
    lens: lensForFacet(row.facet_key),
    stage,
    depth: memberFacingDepth(stage),
    evolved: hasEvolvedSince(row.refined_at, opts?.reviewedAt ?? null),
  };
}


/** Applied to a member's own words before they are stored on a revision. */
export function trimStatement(input: string | undefined | null): string | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  return s.slice(0, 1200);
}

/**
 * BR01-05 — Athena-native restatement.
 *
 * A member's correction arrives in the member's voice ("I'm not driven by
 * status"). Rendering it verbatim inside Athena's understanding makes her
 * appear to speak as the member. Athena therefore restates it in her own
 * register — second person, addressed to the member — without adding,
 * softening, or reinterpreting anything. The member's exact words are still
 * preserved on the revision record as the authoritative source.
 *
 * The transform is deliberately conservative: it only runs when the statement
 * is written in the first person and does not already address the member. If
 * anything is ambiguous, the member's wording is kept untouched rather than
 * risk changing meaning.
 */
const FIRST_PERSON = /\b(i|i'm|i've|i'd|i'll|im|me|my|mine|myself)\b/i;
const SECOND_PERSON = /\b(you|you're|your|yours|yourself)\b/i;

const PRONOUN_MAP: Array<[RegExp, string]> = [
  [/\bI am\b/g, "You are"],
  [/\bI'm\b/g, "You're"],
  [/\bI’m\b/g, "You’re"],
  [/\bI have\b/g, "You have"],
  [/\bI've\b/g, "You've"],
  [/\bI’ve\b/g, "You’ve"],
  [/\bI will\b/g, "You will"],
  [/\bI'll\b/g, "You'll"],
  [/\bI’ll\b/g, "You’ll"],
  [/\bI would\b/g, "You would"],
  [/\bI'd\b/g, "You'd"],
  [/\bI’d\b/g, "You’d"],
  [/\bI\b/g, "you"],
  [/\bmyself\b/gi, "yourself"],
  [/\bmine\b/gi, "yours"],
  [/\bmy\b/gi, "your"],
  [/\bMy\b/g, "Your"],
  [/\bme\b/g, "you"],
  [/\bMe\b/g, "You"],
];

/** Verbs that must follow the person shift when "I" becomes "you". */
const VERB_MAP: Array<[RegExp, string]> = [
  [/\byou was\b/g, "you were"],
  [/\byou wasn't\b/g, "you weren't"],
  [/\byou am\b/g, "you are"],
];

export function athenaRestatement(statement: string | null): string | null {
  if (!statement) return null;
  const raw = statement.trim();
  if (!raw) return null;
  // Already in Athena's register, or not first-person: keep the member's words.
  if (SECOND_PERSON.test(raw) || !FIRST_PERSON.test(raw)) return sentence(raw);

  let out = raw;
  for (const [re, to] of PRONOUN_MAP) out = out.replace(re, to);
  for (const [re, to] of VERB_MAP) out = out.replace(re, to);
  // A sentence should not open in lower case after the shift.
  out = out.charAt(0).toUpperCase() + out.slice(1);
  return sentence(out);
}

function sentence(text: string): string {
  const t = text.trim();
  return /[.!?…]$/.test(t) ? t : `${t}.`;
}

/**
 * How each revision kind rewrites the facet row. Returned as a plain patch so
 * the thin wrapper can apply it with the member's own RLS-scoped client.
 */
export function revisionPatch(
  kind: RevisionKind,
  statement: string | null,
): {
  understanding: string | null;
  reasoning: string;
  confidence: number;
  evidence: unknown[];
  /** F-14: a member revision is stated material by definition. */
  basis: FacetBasis | null;
  needs_clarification: boolean;
  clarification_note: string | null;
  refined_at: string;
} {
  const now = new Date().toISOString();
  if (kind === "change") {
    return {
      // The member's own account of the change is authoritative and is stated,
      // not inferred, material — restated in Athena's own voice (BR01-05).
      understanding: athenaRestatement(statement),
      reasoning:
        "The member told me directly that this has changed. Earlier understanding is kept as history, not as present truth.",
      confidence: statement ? 0.6 : 0.2,
      evidence: statement ? [statement] : [],
      basis: "stated",
      needs_clarification: false,
      clarification_note: null,
      refined_at: now,
    };
  }
  if (kind === "correction") {
    return {
      understanding: athenaRestatement(statement),
      reasoning:
        "I had misunderstood this. The member corrected me; the correction is authoritative for what it corrects, and I should be slower to infer in this area.",
      confidence: statement ? 0.5 : 0.15,
      evidence: statement ? [statement] : [],
      basis: "stated",
      needs_clarification: false,
      clarification_note: null,
      refined_at: now,
    };
  }
  // Removal: nothing is retained in the facet row itself.
  return {
    understanding: null,
    reasoning: "",
    confidence: 0,
    evidence: [],
    basis: null,
    needs_clarification: false,
    clarification_note: null,
    refined_at: now,
  };
}

// ---------------------------------------------------------------------------
// F-13 propagation to the denormalised Living Profile mirror (`user_intelligence`)
//
// The facet table is the source of truth. `user_intelligence` is a convenience
// mirror rendered on /profile. A correction or removal that stops at the facet
// table leaves the superseded understanding visible on another surface, which
// breaks F-13. Every facet that has a mirror column must therefore be written
// in the same operation. This adds no new retention: it only clears or
// overwrites a copy that already exists.
// ---------------------------------------------------------------------------

/** Facet key -> the `user_intelligence` column that mirrors it. */
export const FACET_MIRROR_COLUMNS: Record<string, string> = {
  core_values: "core_values",
  life_direction: "life_direction",
  self_understanding: "self_understanding",
  emotional_regulation: "emotional_patterns",
  communication_style: "communication_style",
  attachment_tendencies: "attachment_style",
  conflict_style: "conflict_style",
  lifestyle: "daily_lifestyle",
  partnership_vision: "partnership_vision",
  readiness: "readiness_summary",
};

/**
 * The patch that keeps the mirror honest for a revision.
 *
 * Removal   -> the mirrored copy is cleared (destroyed with the facet).
 * Change    -> the member's own words become the mirrored value.
 * Correction-> the member's own words supersede the wrong value.
 *
 * `core_values` is a list, not prose, so a prose revision clears the stale
 * list rather than inventing entries; the authoritative wording lives on the
 * facet and is shown on /understanding.
 */
export function mirrorPatch(
  facetKey: string,
  kind: RevisionKind,
  statement: string | null,
): Record<string, string | string[] | null> | null {
  const column = FACET_MIRROR_COLUMNS[facetKey];
  if (!column) return null;
  if (column === "core_values") return { core_values: [] };
  if (kind === "removal") return { [column]: null };
  return { [column]: athenaRestatement(statement) };
}

/** Member-facing acknowledgement in Athena's voice. */
export function revisionAcknowledgement(kind: RevisionKind, label: string): string {
  if (kind === "change")
    return `Thank you for telling me. I'll treat what I understood about ${label.toLowerCase()} as where you were, not where you are.`;
  if (kind === "correction")
    return `I appreciate the correction — I had that wrong. I'll hold ${label.toLowerCase()} more carefully from here.`;
  return `Done. What I understood about ${label.toLowerCase()} is gone, along with how I arrived at it.`;
}
