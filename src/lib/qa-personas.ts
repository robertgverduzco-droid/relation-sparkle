// Founder-only synthetic matchmaking QA — scripted fictional personas.
//
// Every person in this file is invented. None of them corresponds to a real
// member, and nothing here may ever enter a real matching pool or the
// continuous-learning ledger: personas are seeded only onto accounts already
// marked `profiles.is_synthetic`, and every seeded account is additionally
// marked `learning_opt_out` so no outcome from this harness can be learned
// from.
//
// The catalogue exists so the matchmaking contract — candidate discovery,
// tri-state hard constraints, pair reasoning, the presentation decision, and
// the three-open-introduction cap — can be exercised without long browser
// conversations.

export type QaScenarioFamily =
  | "strong_fit"
  | "hard_constraint_conflict"
  | "similar_poor_fit"
  | "different_strong_fit"
  | "communication_mismatch"
  | "critical_unknown"
  | "stated_vs_observed";

export const SCENARIO_FAMILY_LABEL: Record<QaScenarioFamily, string> = {
  strong_fit: "Obvious strong fit",
  hard_constraint_conflict: "Hard constraint conflict",
  similar_poor_fit: "Superficially similar, poor relational fit",
  different_strong_fit: "Superficially different, strong relational fit",
  communication_mismatch: "Communication mismatch",
  critical_unknown: "Critical information unknown",
  stated_vs_observed: "Stated preference contradicts observed pattern",
};

/** What the deterministic gate must answer, before any model is involved. */
export type QaExpectedGate = "present" | "hold_unknown" | "blocked";

/** What Athena's reasoning is expected to conclude, when it is run at all. */
export type QaExpectedReasoning = "introduced" | "not_introduced" | "either";

export type QaFacet = {
  key: string;
  understanding: string;
  confidence: number;
  basis: "self_report" | "observed" | "repeated_pattern" | "stated" | "inferred";
  contradictions?: number;
};

export type QaPersona = {
  key: string;
  name: string;
  family: QaScenarioFamily;
  gender: string | null;
  age: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  heightCm: number | null;
  religions: string[];
  smoking: string | null;
  drinking: string | null;
  hobbies: string[];
  // Preferences
  seeking: string[];
  ageMin: number | null;
  ageMax: number | null;
  maxDistanceKm: number | null;
  intent: string | null;
  wantsChildren: string | null;
  childrenStrength: "preference" | "requirement";
  religionOpenness: "open" | "preference" | "requirement" | "discuss_with_athena";
  preferredReligions: string[];
  heightMinCm: number | null;
  heightMaxCm: number | null;
  heightStrength: "preference" | "requirement";
  facets: QaFacet[];
};

type PersonaSeed = Partial<QaPersona> &
  Pick<QaPersona, "key" | "name" | "family" | "gender" | "facets">;

const BASE: Omit<QaPersona, "key" | "name" | "family" | "gender" | "facets"> = {
  age: 34,
  city: "Portland",
  region: "Oregon",
  country: "United States",
  lat: 45.52,
  lng: -122.68,
  heightCm: 172,
  religions: [],
  smoking: "no",
  drinking: "socially",
  hobbies: ["reading", "hiking"],
  seeking: [],
  ageMin: 28,
  ageMax: 45,
  maxDistanceKm: 80,
  intent: "a serious, committed long-term relationship",
  wantsChildren: null,
  childrenStrength: "preference",
  religionOpenness: "open",
  preferredReligions: [],
  heightMinCm: null,
  heightMaxCm: null,
  heightStrength: "preference",
};

function persona(seed: PersonaSeed): QaPersona {
  return { ...BASE, ...seed };
}

function f(
  key: string,
  understanding: string,
  confidence: number,
  basis: QaFacet["basis"] = "observed",
  contradictions = 0,
): QaFacet {
  return { key, understanding, confidence, basis, contradictions };
}

// ---------------------------------------------------------------------------
// 1. Obvious strong fit
// ---------------------------------------------------------------------------

const strongFit: QaPersona[] = [
  persona({
    key: "sf_a1",
    name: "Marguerite Vale",
    family: "strong_fit",
    gender: "woman",
    seeking: ["man"],
    wantsChildren: "open",
    facets: [
      f("values", "Honesty is the thing she will not trade; she names discomfort early rather than letting it accumulate.", 0.82, "repeated_pattern"),
      f("conflict_repair", "Returns to a disagreement within a day and asks what the other person needed. Demonstrated twice under real strain.", 0.78, "repeated_pattern"),
      f("communication", "Direct, warm, unhurried. Says the hard sentence plainly and then waits.", 0.8, "observed"),
      f("life_direction", "Settled work she cares about; wants a shared life built slowly, not a rescue.", 0.74, "observed"),
      f("attachment", "Secure. Asks for reassurance without punishing the person she asks.", 0.71, "observed"),
      f("humor", "Dry, generous, never at anyone's expense.", 0.66, "observed"),
    ],
  }),
  persona({
    key: "sf_b1",
    name: "Idris Hallow",
    family: "strong_fit",
    gender: "man",
    seeking: ["woman"],
    wantsChildren: "open",
    facets: [
      f("values", "Keeps his word in small things; treats reliability as a form of affection.", 0.8, "repeated_pattern"),
      f("conflict_repair", "Slows down rather than escalating, and comes back with an actual apology instead of a truce.", 0.76, "repeated_pattern"),
      f("communication", "Plain-spoken, listens all the way to the end of a sentence.", 0.79, "observed"),
      f("life_direction", "Wants partnership, not audience. Clear about the life he is building.", 0.75, "observed"),
      f("attachment", "Secure with a mild tendency to over-give when tired.", 0.7, "observed"),
      f("growth", "Actively working on saying what he needs earlier.", 0.68, "observed"),
    ],
  }),
  persona({
    key: "sf_a2",
    name: "Perpetua Lund",
    family: "strong_fit",
    gender: "woman",
    seeking: ["man"],
    age: 39,
    facets: [
      f("values", "Steadiness and candour; she distrusts intensity that has not been tested.", 0.77, "repeated_pattern"),
      f("emotional_regulation", "Names her own state accurately mid-conflict rather than after.", 0.73, "observed"),
      f("communication", "Economical. Prefers three true sentences to twenty warm ones.", 0.76, "repeated_pattern"),
      f("life_direction", "Wants a long partnership with a lot of quiet in it.", 0.72, "observed"),
      f("boundaries", "Says no cleanly and does not relitigate it.", 0.7, "observed"),
    ],
  }),
  persona({
    key: "sf_b2",
    name: "Casimir Thorne",
    family: "strong_fit",
    gender: "man",
    seeking: ["woman"],
    age: 42,
    facets: [
      f("values", "Loyalty demonstrated through inconvenience, not declaration.", 0.79, "repeated_pattern"),
      f("emotional_regulation", "Steady under pressure; does not withdraw when the conversation gets hard.", 0.74, "observed"),
      f("communication", "Brief, dry, and unusually accurate about his own part in things.", 0.75, "observed"),
      f("life_direction", "Building something he intends to share; no interest in performance.", 0.71, "observed"),
      f("boundaries", "Respects a no immediately and without sulking.", 0.72, "repeated_pattern"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 2. Hard constraint conflict
// ---------------------------------------------------------------------------

const hardConflict: QaPersona[] = [
  persona({
    key: "hc_a1",
    name: "Ottoline Beck",
    family: "hard_constraint_conflict",
    gender: "woman",
    seeking: ["man"],
    wantsChildren: "yes",
    childrenStrength: "requirement",
    facets: [
      f("values", "Family is the centre of the life she is building; she has said so consistently for years.", 0.83, "repeated_pattern"),
      f("communication", "Warm and open, occasionally over-explains.", 0.7, "observed"),
      f("life_direction", "Wants children within a few years and will not defer it quietly.", 0.81, "repeated_pattern"),
      f("conflict_repair", "Repairs quickly, sometimes before she has finished being upset.", 0.66, "observed"),
    ],
  }),
  persona({
    key: "hc_b1",
    name: "Silas Renn",
    family: "hard_constraint_conflict",
    gender: "man",
    seeking: ["woman"],
    wantsChildren: "no",
    childrenStrength: "requirement",
    facets: [
      f("values", "Autonomy and a small, deliberate life. Has been settled on no children for a decade.", 0.84, "repeated_pattern"),
      f("communication", "Clear, unsentimental, kind in his directness.", 0.74, "observed"),
      f("life_direction", "Wants a partner, not a family. Says it early to be fair.", 0.82, "repeated_pattern"),
      f("boundaries", "Holds a stated boundary without needing agreement.", 0.72, "observed"),
    ],
  }),
  persona({
    key: "hc_a2",
    name: "Beatrix Corvo",
    family: "hard_constraint_conflict",
    gender: "woman",
    seeking: ["man"],
    age: 33,
    ageMin: 30,
    ageMax: 40,
    facets: [
      f("values", "Fairness and follow-through.", 0.72, "observed"),
      f("communication", "Curious, asks better questions than she answers.", 0.7, "observed"),
      f("life_direction", "Wants to build with someone in a similar decade of life.", 0.69, "self_report"),
      f("attachment", "Anxious-leaning, working on it visibly.", 0.66, "observed"),
    ],
  }),
  persona({
    key: "hc_b2",
    name: "Ambrose Kite",
    family: "hard_constraint_conflict",
    gender: "man",
    seeking: ["woman"],
    age: 57,
    facets: [
      f("values", "Generosity, and an allergy to pretence.", 0.75, "observed"),
      f("communication", "Storyteller; sometimes talks past the other person's point.", 0.68, "observed"),
      f("life_direction", "Second act. Wants companionship with real depth.", 0.7, "observed"),
      f("conflict_repair", "Apologises well and specifically.", 0.71, "observed"),
    ],
  }),
  persona({
    key: "hc_a3",
    name: "Cressida Malo",
    family: "hard_constraint_conflict",
    gender: "woman",
    seeking: ["man"],
    religions: ["muslim"],
    religionOpenness: "requirement",
    preferredReligions: ["muslim"],
    facets: [
      f("values", "Faith is the structure of her week, not a label she carries.", 0.8, "repeated_pattern"),
      f("communication", "Gentle, precise, hard to rush.", 0.72, "observed"),
      f("life_direction", "Wants a shared practice at the centre of a marriage.", 0.78, "repeated_pattern"),
      f("boundaries", "Names a non-negotiable once, calmly, and means it.", 0.74, "observed"),
    ],
  }),
  persona({
    key: "hc_b3",
    name: "Roderick Pyle",
    family: "hard_constraint_conflict",
    gender: "man",
    seeking: ["woman"],
    religions: ["atheist"],
    facets: [
      f("values", "Reason, honesty, and a refusal to pretend belief he does not hold.", 0.77, "repeated_pattern"),
      f("communication", "Warm, argumentative in the friendly sense.", 0.71, "observed"),
      f("life_direction", "Wants a serious partnership with a lot of conversation in it.", 0.7, "observed"),
      f("conflict_repair", "Concedes a point when it is genuinely made.", 0.69, "observed"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 3. Superficially similar, poor relational fit
// ---------------------------------------------------------------------------

const similarPoorFit: QaPersona[] = [
  persona({
    key: "sp_a1",
    name: "Delphine Ash",
    family: "similar_poor_fit",
    gender: "woman",
    seeking: ["man"],
    hobbies: ["hiking", "cooking", "travel", "reading"],
    facets: [
      f("values", "Achievement and independence; she measures a good year by what she completed.", 0.76, "repeated_pattern"),
      f("conflict_repair", "Goes quiet for days and returns as though nothing happened. Pattern seen three times.", 0.74, "repeated_pattern"),
      f("emotional_regulation", "Manages her own feelings privately and finds being asked about them intrusive.", 0.72, "repeated_pattern"),
      f("communication", "Fluent and charming, rarely disclosing.", 0.73, "observed"),
      f("attachment", "Avoidant. Withdraws precisely when closeness increases.", 0.7, "repeated_pattern"),
    ],
  }),
  persona({
    key: "sp_b1",
    name: "Gideon Marlow",
    family: "similar_poor_fit",
    gender: "man",
    seeking: ["woman"],
    hobbies: ["hiking", "cooking", "travel", "reading"],
    facets: [
      f("values", "Achievement and independence, framed almost identically to hers.", 0.75, "repeated_pattern"),
      f("conflict_repair", "Also withdraws, and waits for the other person to reopen. Nobody reopens.", 0.73, "repeated_pattern"),
      f("emotional_regulation", "Copes alone; treats a request for closeness during stress as pressure.", 0.71, "repeated_pattern"),
      f("communication", "Excellent surface rapport, very little underneath yet.", 0.72, "observed"),
      f("attachment", "Avoidant, with a history of relationships that ended in silence.", 0.7, "repeated_pattern"),
    ],
  }),
  persona({
    key: "sp_a2",
    name: "Rosalind Quay",
    family: "similar_poor_fit",
    gender: "woman",
    seeking: ["man"],
    hobbies: ["music_listening", "film", "food_dining"],
    facets: [
      f("values", "Novelty and intensity; commitment reads to her as narrowing.", 0.72, "repeated_pattern"),
      f("pacing", "Moves fast, then re-evaluates abruptly. Three short, intense relationships.", 0.75, "repeated_pattern"),
      f("communication", "Vivid and immediate, less durable across a week.", 0.7, "observed"),
      f("conflict_repair", "Escalates first, repairs generously afterwards.", 0.68, "observed"),
    ],
  }),
  persona({
    key: "sp_b2",
    name: "Emerson Vale",
    family: "similar_poor_fit",
    gender: "man",
    seeking: ["woman"],
    hobbies: ["music_listening", "film", "food_dining"],
    facets: [
      f("values", "Also novelty-driven; describes routine as a slow death.", 0.71, "repeated_pattern"),
      f("pacing", "Same accelerate-then-retreat pattern, from the other direction.", 0.74, "repeated_pattern"),
      f("communication", "Charismatic; avoids the unglamorous conversation.", 0.69, "observed"),
      f("conflict_repair", "Leaves the room. Comes back only when the temperature has dropped on its own.", 0.67, "repeated_pattern"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 4. Superficially different, strong relational fit
// ---------------------------------------------------------------------------

const differentStrongFit: QaPersona[] = [
  persona({
    key: "df_a1",
    name: "Ingrid Solveig",
    family: "different_strong_fit",
    gender: "woman",
    seeking: ["man"],
    hobbies: ["quiet_time", "gardening", "reading"],
    facets: [
      f("values", "Integrity, and a quiet insistence on being told the truth early.", 0.8, "repeated_pattern"),
      f("conflict_repair", "Stays in the room. Asks what she got wrong before defending herself.", 0.78, "repeated_pattern"),
      f("communication", "Reserved but never evasive; her silence is thinking, not withholding.", 0.75, "observed"),
      f("attachment", "Secure. Comfortable with someone else's noise.", 0.73, "observed"),
      f("life_direction", "Wants one life shared, built slowly.", 0.72, "observed"),
    ],
  }),
  persona({
    key: "df_b1",
    name: "Teodoro Lisk",
    family: "different_strong_fit",
    gender: "man",
    seeking: ["woman"],
    hobbies: ["nightlife", "sports_playing", "travel"],
    facets: [
      f("values", "Same insistence on the truth early, expressed loudly instead of quietly.", 0.79, "repeated_pattern"),
      f("conflict_repair", "Fast, direct, and completely without grudge. Repairs demonstrated repeatedly.", 0.77, "repeated_pattern"),
      f("communication", "Expansive, but stops on a dime when asked to.", 0.74, "observed"),
      f("attachment", "Secure. Reassures without being asked twice.", 0.72, "observed"),
      f("life_direction", "Wants a home to come back to, not an audience.", 0.71, "observed"),
    ],
  }),
  persona({
    key: "df_a2",
    name: "Adaeze Nwoko",
    family: "different_strong_fit",
    gender: "woman",
    seeking: ["man"],
    religions: ["christian"],
    hobbies: ["faith_practice", "volunteering"],
    facets: [
      f("values", "Service and accountability; she keeps commitments that cost her something.", 0.81, "repeated_pattern"),
      f("conflict_repair", "Repairs deliberately and does not keep score.", 0.76, "repeated_pattern"),
      f("communication", "Warm, exact, unafraid of the awkward sentence.", 0.75, "observed"),
      f("growth", "Has visibly changed a pattern she disliked in herself.", 0.73, "repeated_pattern"),
    ],
  }),
  persona({
    key: "df_b2",
    name: "Jonty Fairweather",
    family: "different_strong_fit",
    gender: "man",
    seeking: ["woman"],
    religions: ["agnostic"],
    religionOpenness: "open",
    hobbies: ["technology", "games", "running"],
    facets: [
      f("values", "Accountability above comfort; apologises before being asked.", 0.79, "repeated_pattern"),
      f("conflict_repair", "Names his own contribution first, every time it has been observed.", 0.77, "repeated_pattern"),
      f("communication", "Precise and curious; asks about meaning rather than facts.", 0.74, "observed"),
      f("growth", "Deliberately unlearning a habit of intellectualising feeling.", 0.72, "observed"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 5. Communication mismatch
// ---------------------------------------------------------------------------

const communicationMismatch: QaPersona[] = [
  persona({
    key: "cm_a1",
    name: "Wilhelmina Storr",
    family: "communication_mismatch",
    gender: "woman",
    seeking: ["man"],
    facets: [
      f("values", "Kindness and thoroughness.", 0.72, "observed"),
      f("communication", "Processes out loud at length; needs the whole thing said before she knows what she thinks.", 0.79, "repeated_pattern"),
      f("conflict_repair", "Reads brevity as withdrawal and escalates to be heard.", 0.75, "repeated_pattern"),
      f("attachment", "Anxious. Silence is the thing that frightens her.", 0.73, "repeated_pattern"),
      f("life_direction", "Wants a committed partnership and says so plainly.", 0.7, "self_report"),
    ],
  }),
  persona({
    key: "cm_b1",
    name: "Barnaby Frost",
    family: "communication_mismatch",
    gender: "man",
    seeking: ["woman"],
    facets: [
      f("values", "Kindness and thoroughness, described almost identically.", 0.71, "observed"),
      f("communication", "Needs hours of silence before he can speak about anything difficult.", 0.78, "repeated_pattern"),
      f("conflict_repair", "Shuts down when the volume rises; repairs only after full quiet.", 0.76, "repeated_pattern"),
      f("attachment", "Avoidant. Pursuit reads to him as danger.", 0.72, "repeated_pattern"),
      f("life_direction", "Wants a committed partnership and says so plainly.", 0.7, "self_report"),
    ],
  }),
  persona({
    key: "cm_a2",
    name: "Xiomara Belle",
    family: "communication_mismatch",
    gender: "woman",
    seeking: ["man"],
    facets: [
      f("values", "Directness as respect; she considers hinting a small dishonesty.", 0.76, "repeated_pattern"),
      f("communication", "Blunt, fast, unbothered by friction.", 0.78, "repeated_pattern"),
      f("conflict_repair", "Wants it resolved inside the hour.", 0.72, "observed"),
      f("emotional_regulation", "Steady, but underestimates her own force.", 0.68, "observed"),
    ],
  }),
  persona({
    key: "cm_b2",
    name: "Peregrine Nash",
    family: "communication_mismatch",
    gender: "man",
    seeking: ["woman"],
    facets: [
      f("values", "Harmony as care; he softens everything before saying it.", 0.75, "repeated_pattern"),
      f("communication", "Indirect. Signals displeasure through mood rather than words.", 0.77, "repeated_pattern"),
      f("conflict_repair", "Agrees in the moment and resents it later. Observed twice.", 0.71, "repeated_pattern"),
      f("emotional_regulation", "Absorbs, then leaks.", 0.69, "observed"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 6. Critical information unknown
// ---------------------------------------------------------------------------

const criticalUnknown: QaPersona[] = [
  persona({
    key: "cu_a1",
    name: "Henrietta Dole",
    family: "critical_unknown",
    gender: "woman",
    seeking: ["man"],
    facets: [
      f("values", "Loyalty, and an unusual tolerance for other people's mess.", 0.74, "observed"),
      f("communication", "Open, funny, occasionally deflecting.", 0.72, "observed"),
      f("conflict_repair", "Comes back the same evening.", 0.7, "observed"),
      f("life_direction", "Wants something serious and is unhurried about finding it.", 0.71, "observed"),
    ],
  }),
  persona({
    key: "cu_b1",
    name: "Lorcan Bly",
    family: "critical_unknown",
    gender: null, // never stated — Athena must not infer it
    seeking: ["woman"],
    facets: [
      f("values", "Care expressed practically.", 0.73, "observed"),
      f("communication", "Considered, slow to disclose but honest when he does.", 0.71, "observed"),
      f("conflict_repair", "Returns to things properly rather than quickly.", 0.7, "observed"),
      f("life_direction", "Wants a serious relationship; clear about it.", 0.69, "observed"),
    ],
  }),
  persona({
    key: "cu_a2",
    name: "Anneliese Rook",
    family: "critical_unknown",
    gender: "woman",
    seeking: ["man"],
    heightMinCm: 178,
    heightStrength: "requirement",
    facets: [
      f("values", "Straightforwardness; she states her requirements rather than hinting.", 0.75, "repeated_pattern"),
      f("communication", "Crisp and self-aware.", 0.72, "observed"),
      f("conflict_repair", "Direct and quick to own her part.", 0.71, "observed"),
      f("life_direction", "Wants a committed partnership.", 0.7, "observed"),
    ],
  }),
  persona({
    key: "cu_b2",
    name: "Fitzwilliam Hone",
    family: "critical_unknown",
    gender: "man",
    seeking: ["woman"],
    heightCm: null, // never recorded — the requirement cannot be evaluated
    facets: [
      f("values", "Reliability, and a dislike of exaggeration.", 0.74, "observed"),
      f("communication", "Measured, dry, careful with other people's feelings.", 0.72, "observed"),
      f("conflict_repair", "Stays and finishes the conversation.", 0.71, "observed"),
      f("life_direction", "Wants a long partnership.", 0.7, "observed"),
    ],
  }),
];

// ---------------------------------------------------------------------------
// 7. Stated preference contradicted by observed pattern
// ---------------------------------------------------------------------------

const statedVsObserved: QaPersona[] = [
  persona({
    key: "sv_a1",
    name: "Guinevere Talbot",
    family: "stated_vs_observed",
    gender: "woman",
    seeking: ["man"],
    facets: [
      f("stated_preference", "Says she wants someone highly ambitious and always working.", 0.55, "self_report", 3),
      f("observed_pattern", "Every relationship she describes warmly involved someone with a lot of unhurried time for her.", 0.76, "repeated_pattern"),
      f("values", "Presence over status, whatever she says out loud.", 0.7, "repeated_pattern", 1),
      f("communication", "Honest, and visibly surprised when the contradiction is named.", 0.68, "observed"),
      f("conflict_repair", "Willing to be corrected by her own history.", 0.66, "observed"),
    ],
  }),
  persona({
    key: "sv_b1",
    name: "Octavian Reed",
    family: "stated_vs_observed",
    gender: "man",
    seeking: ["woman"],
    facets: [
      f("values", "Steadiness, and a life deliberately arranged around time rather than status.", 0.78, "repeated_pattern"),
      f("communication", "Unhurried, attentive, asks a second question.", 0.75, "observed"),
      f("life_direction", "Chose a smaller career on purpose and does not apologise for it.", 0.74, "repeated_pattern"),
      f("conflict_repair", "Calm, specific, no scorekeeping.", 0.72, "observed"),
    ],
  }),
  persona({
    key: "sv_a2",
    name: "Saoirse Winter",
    family: "stated_vs_observed",
    gender: "woman",
    seeking: ["man"],
    facets: [
      f("stated_preference", "Insists she only wants someone who never needs reassurance.", 0.5, "self_report", 4),
      f("observed_pattern", "Reports feeling closest in the relationships where reassurance was exchanged constantly.", 0.74, "repeated_pattern"),
      f("attachment", "Anxious, and self-critical about being anxious.", 0.71, "repeated_pattern", 2),
      f("communication", "Candid once trust exists.", 0.68, "observed"),
    ],
  }),
  persona({
    key: "sv_b2",
    name: "Bartholomew Grange",
    family: "stated_vs_observed",
    gender: "man",
    seeking: ["woman"],
    facets: [
      f("values", "Comfortable with tenderness; offers reassurance without keeping count.", 0.77, "repeated_pattern"),
      f("communication", "Warm and steady, unusually undefended.", 0.74, "observed"),
      f("conflict_repair", "Moves toward, not away.", 0.73, "repeated_pattern"),
      f("life_direction", "Wants a committed relationship with real intimacy in it.", 0.71, "observed"),
    ],
  }),
];

export const QA_PERSONAS: QaPersona[] = [
  ...strongFit,
  ...hardConflict,
  ...similarPoorFit,
  ...differentStrongFit,
  ...communicationMismatch,
  ...criticalUnknown,
  ...statedVsObserved,
];

export type QaScenario = {
  id: string;
  family: QaScenarioFamily;
  a: string;
  b: string;
  /** What the deterministic gate must decide. */
  expectedGate: QaExpectedGate;
  /** What Athena's reasoning should conclude, when it is run. */
  expectedReasoning: QaExpectedReasoning;
  /** Founder-readable statement of what this pair is testing. */
  intent: string;
  /** Chosen for the smaller AI matrix when a full run is impractical. */
  aiRepresentative?: boolean;
};

export const QA_SCENARIOS: QaScenario[] = [
  {
    id: "SF-1",
    family: "strong_fit",
    a: "sf_a1",
    b: "sf_b1",
    expectedGate: "present",
    expectedReasoning: "introduced",
    intent: "Two well-understood people with shared foundations and demonstrated repair. Nothing should block, and Athena should be willing to introduce.",
    aiRepresentative: true,
  },
  {
    id: "SF-2",
    family: "strong_fit",
    a: "sf_a2",
    b: "sf_b2",
    expectedGate: "present",
    expectedReasoning: "introduced",
    intent: "A quieter strong fit at a different life stage. Confirms the gate does not treat reserve as thin understanding.",
  },
  {
    id: "HC-1",
    family: "hard_constraint_conflict",
    a: "hc_a1",
    b: "hc_b1",
    expectedGate: "blocked",
    expectedReasoning: "not_introduced",
    intent: "Both stated children as a genuine requirement, in opposite directions. Must be blocked before any reasoning runs.",
    aiRepresentative: true,
  },
  {
    id: "HC-2",
    family: "hard_constraint_conflict",
    a: "hc_a2",
    b: "hc_b2",
    expectedGate: "blocked",
    expectedReasoning: "not_introduced",
    intent: "A stated age range is genuinely exceeded. Blocked by mutual eligibility, not by reasoning.",
  },
  {
    id: "HC-3",
    family: "hard_constraint_conflict",
    a: "hc_a3",
    b: "hc_b3",
    expectedGate: "blocked",
    expectedReasoning: "not_introduced",
    intent: "A stated religious requirement is known and not satisfied. Known-and-violated must block, never merely weigh.",
  },
  {
    id: "SP-1",
    family: "similar_poor_fit",
    a: "sp_a1",
    b: "sp_b1",
    expectedGate: "present",
    expectedReasoning: "not_introduced",
    intent: "Identical interests and language, two avoidant repair patterns. The gate must pass; Athena's reasoning is what should decline.",
    aiRepresentative: true,
  },
  {
    id: "SP-2",
    family: "similar_poor_fit",
    a: "sp_a2",
    b: "sp_b2",
    expectedGate: "present",
    expectedReasoning: "not_introduced",
    intent: "Matching taste, matching accelerate-then-retreat pacing. Similarity must not read as compatibility.",
  },
  {
    id: "DF-1",
    family: "different_strong_fit",
    a: "df_a1",
    b: "df_b1",
    expectedGate: "present",
    expectedReasoning: "introduced",
    intent: "Opposite surfaces, same values and repair capacity. Difference must not be treated as disqualifying.",
    aiRepresentative: true,
  },
  {
    id: "DF-2",
    family: "different_strong_fit",
    a: "df_a2",
    b: "df_b2",
    expectedGate: "present",
    expectedReasoning: "either",
    intent: "Different faith positions held without a stated requirement. Openness means the pair reaches reasoning rather than being filtered out.",
  },
  {
    id: "CM-1",
    family: "communication_mismatch",
    a: "cm_a1",
    b: "cm_b1",
    expectedGate: "present",
    expectedReasoning: "not_introduced",
    intent: "Pursue-withdraw under conflict on top of identical stated intentions. Reasoning should see the mismatch the filters cannot.",
    aiRepresentative: true,
  },
  {
    id: "CM-2",
    family: "communication_mismatch",
    a: "cm_a2",
    b: "cm_b2",
    expectedGate: "present",
    expectedReasoning: "either",
    intent: "Bluntness against indirectness — navigable for some pairs, corrosive for others. Athena should name the friction either way.",
  },
  {
    id: "CU-1",
    family: "critical_unknown",
    a: "cu_a1",
    b: "cu_b1",
    expectedGate: "hold_unknown",
    expectedReasoning: "not_introduced",
    intent: "A stated seeking-gender requirement against an unstated gender. Unknown must hold the pair, never be inferred and never be a rejection.",
    aiRepresentative: true,
  },
  {
    id: "CU-2",
    family: "critical_unknown",
    a: "cu_a2",
    b: "cu_b2",
    expectedGate: "hold_unknown",
    expectedReasoning: "not_introduced",
    intent: "A genuine height requirement with no recorded counterpart height. Unresolved, not incompatible.",
  },
  {
    id: "SV-1",
    family: "stated_vs_observed",
    a: "sv_a1",
    b: "sv_b1",
    expectedGate: "present",
    expectedReasoning: "either",
    intent: "Stated preference for ambition contradicted by her own history. Athena should weigh the observed pattern above the self-report and say so.",
    aiRepresentative: true,
  },
  {
    id: "SV-2",
    family: "stated_vs_observed",
    a: "sv_a2",
    b: "sv_b2",
    expectedGate: "present",
    expectedReasoning: "either",
    intent: "A stated dislike of reassurance contradicted by where she has felt closest. Contradiction count should visibly discount the self-report.",
  },
];

export function personaByKey(key: string): QaPersona | undefined {
  return QA_PERSONAS.find((p) => p.key === key);
}
