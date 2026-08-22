/**
 * Match semantics (V1 stabilization).
 *
 * Three matchmaking questions were previously answered with raw string
 * equality or with silent optimism. None of them can be:
 *
 *   1. Relationship intent — two members who mean the same thing in different
 *      words must not be falsely rejected, and two members who mean genuinely
 *      different things must not be quietly accepted.
 *   2. Seeking gender — when a member has stated who they are seeking and the
 *      counterpart has not stated their gender, the pair is UNRESOLVED. Athena
 *      never infers gender from a name, a photograph, or anything she has
 *      learned in conversation.
 *   3. Geography — when a member has stated a genuine distance requirement and
 *      the counterpart's location is unknown, the pair is UNRESOLVED rather
 *      than compatible.
 *
 * Everything here is pure, tri-state, and never produces a score. "Unknown" is
 * a third answer, never a synonym for "no".
 */

export type Tri = "compatible" | "incompatible" | "unknown";

/** Worst-wins combination: incompatible > unknown > compatible. */
export function combineTri(values: Tri[]): Tri {
  if (values.includes("incompatible")) return "incompatible";
  if (values.includes("unknown")) return "unknown";
  return "compatible";
}

// ---------------------------------------------------------------------------
// Relationship intent
// ---------------------------------------------------------------------------

/**
 * Canonical intents. Free text is mapped onto these; anything unrecognised
 * stays `null`, which means "Athena does not know", not "incompatible".
 */
export type IntentKey = "life_partnership" | "serious_relationship" | "exploring" | "companionship";

const INTENT_PATTERNS: Array<{ key: IntentKey; test: RegExp }> = [
  {
    key: "life_partnership",
    test: /\b(marriage|married|marry|life partner|lifelong|life-long|spouse|husband|wife|forever|settle down|build a life|start a family)\b/i,
  },
  {
    key: "serious_relationship",
    test: /\b(serious|committed|commitment|long[- ]?term|longterm|exclusive|meaningful relationship|real relationship|partnership)\b/i,
  },
  {
    key: "companionship",
    test: /\b(companionship|companion|friendship first|someone to share|company)\b/i,
  },
  {
    key: "exploring",
    test: /\b(exploring|open to|see where|seeing where|casual|not sure yet|dating around|taking it slow|no expectations)\b/i,
  },
];

/** Map free text onto a canonical intent. Unrecognised text yields null. */
export function normalizeIntent(raw: string | null | undefined): IntentKey | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  for (const p of INTENT_PATTERNS) if (p.test.test(text)) return p.key;
  return null;
}

/**
 * Intents that can genuinely sit alongside one another. Adjacency is
 * deliberately generous: differences in wording, and differences in pace, are
 * for Athena's reasoning to weigh — only a real mismatch of direction is a
 * hard incompatibility.
 */
const INTENT_ADJACENCY: Record<IntentKey, IntentKey[]> = {
  life_partnership: ["life_partnership", "serious_relationship"],
  serious_relationship: ["serious_relationship", "life_partnership", "companionship"],
  companionship: ["companionship", "serious_relationship", "exploring"],
  exploring: ["exploring", "companionship"],
};

/**
 * Tri-state intent compatibility. Unstated or unrecognised intent on either
 * side is UNKNOWN — Athena resolves it in conversation rather than guessing.
 */
export function intentCompatibility(
  aRaw: string | null | undefined,
  bRaw: string | null | undefined,
): Tri {
  const rawA = (aRaw ?? "").trim();
  const rawB = (bRaw ?? "").trim();
  if (!rawA || !rawB) return "unknown";

  const a = normalizeIntent(rawA);
  const b = normalizeIntent(rawB);

  // Identical member wording is compatible whether or not we recognise it.
  if (!a || !b) {
    return rawA.toLowerCase() === rawB.toLowerCase() ? "compatible" : "unknown";
  }
  return INTENT_ADJACENCY[a].includes(b) ? "compatible" : "incompatible";
}

// ---------------------------------------------------------------------------
// Seeking gender
// ---------------------------------------------------------------------------

/**
 * Tri-state. An explicit `seeking_genders` list plus an unstated counterpart
 * gender is UNRESOLVED: the pair may not be presented, and Athena never
 * infers the missing value.
 */
export function seekingGenderState(
  seeking: string[] | null | undefined,
  otherGender: string | null | undefined,
): Tri {
  const list = (seeking ?? []).map((g) => g.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return "compatible"; // no stated requirement
  if (list.includes("everyone") || list.includes("any")) return "compatible";
  const g = (otherGender ?? "").trim().toLowerCase();
  if (!g) return "unknown";
  return list.includes(g) ? "compatible" : "incompatible";
}

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

export type Place = {
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in kilometres. Never returned to a client. */
export function distanceKm(a: Place, b: Place): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

function sameNamedPlace(a: Place, b: Place): boolean | null {
  const ac = (a.city ?? "").trim().toLowerCase();
  const bc = (b.city ?? "").trim().toLowerCase();
  if (ac && bc) return ac === bc;
  const ar = (a.region ?? "").trim().toLowerCase();
  const br = (b.region ?? "").trim().toLowerCase();
  if (ar && br) return ar === br;
  return null;
}

/**
 * Tri-state geographic feasibility for ONE member's stated requirement.
 *
 * - No stated maximum distance → compatible (no requirement to satisfy).
 * - Coordinates on both sides → measured against the stated maximum.
 * - No coordinates, but both named places known → same city (or, failing that,
 *   same region) satisfies a tight requirement; a different named place with a
 *   tight requirement is UNKNOWN, never a silent pass.
 * - Nothing locatable on either side → UNKNOWN.
 *
 * Precise coordinates never leave this module.
 */
export function geographicFeasibility(
  maxDistanceKm: number | null | undefined,
  self: Place,
  other: Place,
): Tri {
  const max = maxDistanceKm ?? null;
  if (max == null || max <= 0) return "compatible";

  const d = distanceKm(self, other);
  if (d != null) return d <= max ? "compatible" : "incompatible";

  const same = sameNamedPlace(self, other);
  if (same === true) return "compatible";
  // A different named place cannot be measured against a stated radius.
  return "unknown";
}
