// Athena University — provenance retrieval (server-only).
//
// The Non-Quotation Standard governs ordinary conversation: Athena never
// names a thinker, a college or a framework unprompted, and the ordinary
// retrieval path deliberately withholds that metadata from the prompt.
//
// This module is the single, member-triggered exception. When someone asks
// where something came from, challenges Athena's credentials, or asks what
// she has actually studied, she is allowed to answer accurately — which
// requires the metadata the ordinary path hides. It is a separate retrieval
// path so that the exception can never leak into a normal turn.

import {
  EDUCATION_CHUNKS,
  retrieveEducation,
  type EducationChunk,
} from "./education-retrieval.server";
import type { ProvenanceIntent } from "./turn-runtime";

type Chunk = EducationChunk & { college?: string; scholar?: string; role?: string };

const CHUNKS = EDUCATION_CHUNKS as Chunk[];

/* ------------------------------------------------------------------ */
/* Education inventory                                                 */
/* ------------------------------------------------------------------ */

export type EducationInventory = {
  colleges: { name: string; faculty: string[] }[];
  facultyCount: number;
  documentCount: number;
};

let inventory: EducationInventory | null = null;

/** What Athena has actually studied, derived from the corpus itself. */
export function educationInventory(): EducationInventory {
  if (inventory) return inventory;
  const byCollege = new Map<string, Set<string>>();
  const scholars = new Set<string>();

  for (const c of CHUNKS) {
    const college = c.college?.trim();
    if (!college) continue;
    const set = byCollege.get(college) ?? new Set<string>();
    if (c.kind === "faculty" && c.scholar) {
      set.add(c.scholar);
      scholars.add(c.scholar);
    }
    byCollege.set(college, set);
  }

  inventory = {
    colleges: [...byCollege.entries()]
      .map(([name, faculty]) => ({ name, faculty: [...faculty].sort() }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    facultyCount: scholars.size,
    documentCount: new Set(CHUNKS.map((c) => c.doc)).size,
  };
  return inventory;
}

export function inventoryBlock(): string {
  const inv = educationInventory();
  const lines = inv.colleges.map(
    (c) => `- ${c.name}${c.faculty.length ? `: ${c.faculty.join(", ")}` : ""}`,
  );
  return `YOUR EDUCATION — FACTUAL INVENTORY (accurate; use only because they asked)
Athena University, Canonical Curriculum v1.0 — ${inv.colleges.length} colleges, ${inv.facultyCount} faculty, ${inv.documentCount} canonical documents.
${lines.join("\n")}
This is what you have studied. Describe it plainly and without inflation: it is a curriculum you were built on, not a degree, not a licence, and not clinical training. Never claim to have studied a person, a school or a work that does not appear above.`;
}

/* ------------------------------------------------------------------ */
/* Verbatim quotation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Verbatim passages available for exact quotation. The curriculum is written
 * as Athena's own study material, so quoted source wording is rare by design —
 * which is exactly why this is checked rather than assumed.
 */
export function verifiedQuotations(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/[“"]([^”"]{25,300})[”"]/g)) out.push(m[1].trim());
  return out;
}

/* ------------------------------------------------------------------ */
/* Provenance retrieval                                                */
/* ------------------------------------------------------------------ */

export type ProvenanceResult = {
  block: string;
  sources: { scholar?: string; college?: string; docTitle: string; heading: string }[];
};

const EMPTY: ProvenanceResult = { block: "", sources: [] };

/**
 * Retrieves educational material WITH its provenance metadata, for one turn,
 * because the member asked. Distinguishes source material from Athena's own
 * synthesis, and marks which wording (if any) may be quoted exactly.
 */
export async function provenanceContext(input: {
  intent: ProvenanceIntent;
  /** The member's own recent words — the subject provenance is asked about. */
  memberText: string;
}): Promise<ProvenanceResult> {
  if (!input.intent.active) return EMPTY;

  const parts: string[] = [];
  const sources: ProvenanceResult["sources"] = [];

  if (input.intent.inventoryRequest || input.intent.credentialChallenge) {
    parts.push(inventoryBlock());
  }

  try {
    // A wider draw than a normal turn: provenance answers should reflect the
    // range of what her education actually contains, including disagreement.
    const { chunks } = await retrieveEducation({ mode: "pair", current: input.memberText });
    const rendered = (chunks as unknown as (Chunk & { text: string })[])
      .slice(0, 4)
      .map((c) => {
        const quotes = verifiedQuotations(c.text);
        const label = [
          c.scholar ? `Scholar: ${c.scholar}` : null,
          c.college ? `College: ${c.college}` : null,
          `Document: ${c.docTitle}${c.heading ? ` › ${c.heading}` : ""}`,
          `Nature: Athena University study material — a synthesis written for your education, not the scholar's own wording`,
          quotes.length
            ? `Verbatim wording available for exact quotation: ${quotes.map((q) => `"${q}"`).join(" | ")}`
            : `No verbatim wording available — if you refer to this, present it as a paraphrase in your own words`,
        ]
          .filter(Boolean)
          .join("\n");
        sources.push({
          scholar: c.scholar,
          college: c.college,
          docTitle: c.docTitle,
          heading: c.heading,
        });
        return `${label}\nMaterial: ${c.text.trim()}`;
      });
    if (rendered.length) {
      parts.push(
        `PROVENANCE MATERIAL (they asked where this comes from — attribution is permitted this turn only)\n\n${rendered.join("\n\n---\n\n")}`,
      );
    }
  } catch {
    // Provenance deepens the answer; it is never a precondition for one.
  }

  if (!parts.length) return EMPTY;
  return { block: parts.join("\n\n"), sources };
}
