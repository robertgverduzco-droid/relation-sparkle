// Structured self-description and match-preference data (V1).
//
// Three separate forms of information, never conflated:
//   A. Member self-description — structured, member-stated facts (profiles.*)
//   B. Match preferences — structured openness about who they are open to
//      meeting (user_preferences.*)
//   C. Nuanced attraction understanding — learned conversationally by Athena
//      (understanding_facets / topic_map). Not represented here.
//
// Binding rules encoded in this module:
//   - Athena never infers ethnicity, religion or height from photographs,
//     names, language, location or any other proxy. Only member-stated values
//     reach this module.
//   - Missing data is UNKNOWN. Unknown is never silently treated as
//     incompatible, and never assumed compatible.
//   - Nothing here produces a member score, ranking, or desirability value.

export const PREFER_NOT_TO_SAY = "prefer_not_to_say";

export const ETHNICITY_OPTIONS = [
  { value: "asian_east", label: "East Asian" },
  { value: "asian_south", label: "South Asian" },
  { value: "asian_southeast", label: "Southeast Asian" },
  { value: "black_african", label: "Black / African" },
  { value: "black_caribbean", label: "Black / Caribbean" },
  { value: "hispanic_latino", label: "Hispanic / Latino" },
  { value: "indigenous", label: "Indigenous / Native" },
  { value: "middle_eastern", label: "Middle Eastern / North African" },
  { value: "pacific_islander", label: "Pacific Islander" },
  { value: "white_european", label: "White / European" },
  { value: "multiracial", label: "Multiracial / Multicultural" },
] as const;

export const RELIGION_OPTIONS = [
  { value: "agnostic", label: "Agnostic" },
  { value: "atheist", label: "Atheist" },
  { value: "buddhist", label: "Buddhist" },
  { value: "christian", label: "Christian" },
  { value: "hindu", label: "Hindu" },
  { value: "jewish", label: "Jewish" },
  { value: "muslim", label: "Muslim" },
  { value: "sikh", label: "Sikh" },
  { value: "spiritual", label: "Spiritual, not religious" },
  { value: "none", label: "No religion" },
] as const;

export type Openness = "open" | "preference" | "requirement" | "discuss_with_athena";
/**
 * Strength is the whole difference between a taste and a gate.
 *   preference  — weighs in Athena's qualitative reasoning; missing counterpart
 *                 data is never resolved before considering the pair.
 *   requirement — a genuine non-negotiable; counterpart data MUST be known and
 *                 satisfied before this pair can be presented.
 * There is no third "strong preference" storage state: a strong preference is a
 * preference Athena weighs more heavily in reasoning, never a gate.
 */
export type HeightStrength = "preference" | "requirement";
export type Strength = "preference" | "requirement";

export const SMOKING_OPTIONS = [
  { value: "no", label: "I don't smoke" },
  { value: "occasionally", label: "Occasionally" },
  { value: "yes", label: "I smoke" },
] as const;

/**
 * Drinking. Deliberately member-friendly and few: enough for a genuine
 * lifestyle constraint (someone in recovery, someone whose faith forbids it,
 * someone who wants a partner who drinks with them) without pretending to
 * measure anyone. It is never a desirability signal.
 */
export const DRINKING_OPTIONS = [
  { value: "no", label: "I don't drink" },
  { value: "rarely", label: "Rarely" },
  { value: "socially", label: "Socially" },
  { value: "regularly", label: "Regularly" },
] as const;

/**
 * Hobbies and interests. The list is a convenience, never a taxonomy: the
 * member's own words carry the same weight, and Athena reads any of it as
 * evidence about the person (what it reveals), never as an activity to match
 * on and never as a score.
 */
export const HOBBY_OPTIONS = [
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "music_listening", label: "Music" },
  { value: "music_playing", label: "Playing an instrument" },
  { value: "art", label: "Art & making things" },
  { value: "photography", label: "Photography" },
  { value: "film", label: "Film & television" },
  { value: "cooking", label: "Cooking" },
  { value: "food_dining", label: "Food & dining out" },
  { value: "fitness", label: "Fitness & training" },
  { value: "running", label: "Running" },
  { value: "yoga", label: "Yoga & movement" },
  { value: "hiking", label: "Hiking & the outdoors" },
  { value: "water", label: "Water & the ocean" },
  { value: "travel", label: "Travel" },
  { value: "sports_watching", label: "Following sport" },
  { value: "sports_playing", label: "Playing sport" },
  { value: "games", label: "Games" },
  { value: "technology", label: "Technology & building" },
  { value: "gardening", label: "Gardening & plants" },
  { value: "animals", label: "Animals" },
  { value: "volunteering", label: "Volunteering" },
  { value: "faith_practice", label: "Faith & practice" },
  { value: "learning", label: "Learning & courses" },
  { value: "nightlife", label: "Nightlife & live events" },
  { value: "quiet_time", label: "Quiet time at home" },
] as const;


export const OPENNESS_OPTIONS: Array<{ value: Openness; label: string; help: string }> = [
  { value: "open", label: "Open to anyone", help: "No preference here." },
  { value: "preference", label: "I have a preference", help: "Athena will weigh it, gently." },
  { value: "requirement", label: "This matters deeply", help: "Athena will treat it as a real requirement." },
  {
    value: "discuss_with_athena",
    label: "I'd rather discuss it with Athena",
    help: "Nothing is recorded as a filter; you'll talk it through.",
  },
];

export type SelfDescription = {
  height_cm: number | null;
  ethnicities: string[];
  ethnicity_self_describe: string | null;
  religions: string[];
  religion_self_describe: string | null;
  /** Member-stated smoking. Never inferred from photographs or anything else. */
  smoking: string | null;
  /** Member-stated drinking. Never inferred, never a judgement. */
  drinking: string | null;
  /** Chosen interests. Evidence about a person, never a matching key. */
  hobbies: string[];
  /** Interests in the member's own words, where no chip fits. */
  hobbies_note: string | null;
  /** Derived from the member's own stated birth date; null when not supplied. */
  age: number | null;
  /** The member's own stance on children (their statement about themselves). */
  wants_children: string | null;
};

export type MatchPreferences = {
  ethnicity_openness: Openness;
  preferred_ethnicities: string[];
  religion_openness: Openness;
  preferred_religions: string[];
  height_min_cm: number | null;
  height_max_cm: number | null;
  height_strength: HeightStrength;
  additional_notes: string | null;
  age_min: number | null;
  age_max: number | null;
  age_strength: Strength;
  /** The member's own stance, reused as the thing a children requirement asks of a counterpart. */
  wants_children: string | null;
  children_strength: Strength;
  smoking_openness: Openness;
  preferred_smoking: string[];
  drinking_openness: Openness;
  preferred_drinking: string[];
};

export const EMPTY_SELF: SelfDescription = {
  height_cm: null,
  ethnicities: [],
  ethnicity_self_describe: null,
  religions: [],
  religion_self_describe: null,
  smoking: null,
  drinking: null,
  hobbies: [],
  hobbies_note: null,
  age: null,
  wants_children: null,
};

export const EMPTY_PREFERENCES: MatchPreferences = {
  ethnicity_openness: "open",
  preferred_ethnicities: [],
  religion_openness: "open",
  preferred_religions: [],
  height_min_cm: null,
  height_max_cm: null,
  height_strength: "preference",
  additional_notes: null,
  age_min: null,
  age_max: null,
  age_strength: "preference",
  wants_children: null,
  children_strength: "preference",
  smoking_openness: "open",
  preferred_smoking: [],
  drinking_openness: "open",
  preferred_drinking: [],
};



export function labelFor(
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>,
): string {
  if (value === PREFER_NOT_TO_SAY) return "Prefer not to say";
  return options.find((o) => o.value === value)?.label ?? value;
}

/** cm ⇄ feet/inches, for member-facing display only. */
export function cmToFeetInches(cm: number | null): string {
  if (cm == null || !Number.isFinite(cm)) return "";
  const total = Math.round(cm / 2.54);
  return `${Math.floor(total / 12)}'${total % 12}"`;
}
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

/** A stated value is "known" only when the member actually disclosed it. */
function disclosed(values: string[] | null | undefined, selfDescribe?: string | null): boolean {
  const list = (values ?? []).filter((v) => v && v !== PREFER_NOT_TO_SAY);
  return list.length > 0 || Boolean((selfDescribe ?? "").trim());
}

export type Tri = "compatible" | "incompatible" | "unknown";

/** Every characteristic a member may declare a genuine non-negotiable about. */
export type ConstraintField =
  | "height"
  | "ethnicity"
  | "religion"
  | "age"
  | "children"
  | "smoking"
  | "drinking";

export type ConstraintOutcome = {
  /** Which constraint this is. */
  field: ConstraintField;
  /** Whose stated requirement this is. */
  holder: "self" | "other";
  verdict: Tri;
  /** Internal-only sentence; never rendered to a member verbatim. */
  note: string;
};

export type StructuredEvaluation = {
  /** Overall: incompatible if any genuine requirement is violated; unknown if
   *  any genuine requirement cannot yet be evaluated; otherwise compatible. */
  verdict: Tri;
  outcomes: ConstraintOutcome[];
  /** Soft preferences (never blocking) Athena may weigh in her reasoning. */
  softSignals: string[];
  /** Information Athena must obtain before an introduction that depends on an
   *  unresolved genuine constraint. */
  unresolved: Array<{ subjectId: string; field: ConstraintField }>;
};

/**
 * BINDING: an introduction may only be presented when every genuine hard
 * constraint bearing on the pair is COMPATIBLE. UNKNOWN keeps the pair alive
 * as a possibility but can never be presented. No client state, conversational
 * statement, Founder role or member request may bypass this.
 */
export function constraintsPermitIntroduction(evaluation: StructuredEvaluation): boolean {
  return evaluation.verdict === "compatible";
}


type Party = { id: string; self: SelfDescription; prefs: MatchPreferences };

function evaluateOneDirection(holder: Party, counterpart: Party, side: "self" | "other") {
  const outcomes: ConstraintOutcome[] = [];
  const soft: string[] = [];
  const unresolved: StructuredEvaluation["unresolved"] = [];

  // Height — the only objective physical constraint authorised by Attraction
  // Intelligence, and only as the member stated it about themselves.
  const { height_min_cm: min, height_max_cm: max, height_strength } = holder.prefs;
  if (min != null || max != null) {
    const h = counterpart.self.height_cm;
    if (h == null) {
      if (height_strength === "requirement") {
        outcomes.push({ field: "height", holder: side, verdict: "unknown", note: "Height is a stated requirement; the other person has not recorded a height." });
        unresolved.push({ subjectId: counterpart.id, field: "height" });
      } else {
        soft.push("A height preference exists on one side, and the other person has not recorded a height. Treat this as unknown, not as a mismatch.");
      }
    } else {
      const within = (min == null || h >= min) && (max == null || h <= max);
      if (within) {
        outcomes.push({ field: "height", holder: side, verdict: "compatible", note: "Stated height sits inside the stated range." });
      } else if (height_strength === "requirement") {
        outcomes.push({ field: "height", holder: side, verdict: "incompatible", note: "Stated height falls outside a genuine stated requirement." });
      } else {
        soft.push("Height sits outside a soft preference. This is a nuance to weigh, not a disqualification.");
      }
    }
  }

  const categorical = (
    field: ConstraintField,

    openness: Openness,
    preferred: string[],
    stated: string[],
    selfDescribe: string | null,
  ) => {
    const wanted = (preferred ?? []).filter((v) => v && v !== PREFER_NOT_TO_SAY);
    if (openness === "open" || openness === "discuss_with_athena" || wanted.length === 0) return;
    if (!disclosed(stated, selfDescribe)) {
      if (openness === "requirement") {
        outcomes.push({ field, holder: side, verdict: "unknown", note: `A genuine ${field} requirement exists; the other person has not stated theirs.` });
        unresolved.push({ subjectId: counterpart.id, field });
      } else {
        soft.push(`A ${field} preference exists and the other person has not stated theirs. Unknown, never a mismatch.`);
      }
      return;
    }
    const overlap = (stated ?? []).some((v) => wanted.includes(v));
    if (overlap) {
      outcomes.push({ field, holder: side, verdict: "compatible", note: `Stated ${field} matches the stated preference.` });
    } else if (openness === "requirement") {
      // A self-described value that no fixed category captures is not a
      // refutation — categories are incomplete by design.
      if (!((stated ?? []).length > 0)) {
        outcomes.push({ field, holder: side, verdict: "unknown", note: `Only a self-described ${field} is recorded; a fixed category cannot settle this requirement.` });
        unresolved.push({ subjectId: counterpart.id, field });
      } else {
        outcomes.push({ field, holder: side, verdict: "incompatible", note: `A genuine ${field} requirement is not met by the stated values.` });
      }
    } else {
      soft.push(`A ${field} preference is not matched. Weigh it as nuance, never as a verdict on the person.`);
    }
  };

  categorical(
    "ethnicity",
    holder.prefs.ethnicity_openness,
    holder.prefs.preferred_ethnicities,
    counterpart.self.ethnicities,
    counterpart.self.ethnicity_self_describe,
  );
  categorical(
    "religion",
    holder.prefs.religion_openness,
    holder.prefs.preferred_religions,
    counterpart.self.religions,
    counterpart.self.religion_self_describe,
  );
  categorical(
    "smoking",
    holder.prefs.smoking_openness,
    holder.prefs.preferred_smoking,
    counterpart.self.smoking ? [counterpart.self.smoking] : [],
    null,
  );

  // Age. The stated range is an ordinary preference unless the member marked it
  // a non-negotiable. A missing birth date is UNKNOWN, never a mismatch.
  {
    const { age_min, age_max, age_strength } = holder.prefs;
    if (age_min != null || age_max != null) {
      const age = counterpart.self.age;
      if (age == null) {
        if (age_strength === "requirement") {
          outcomes.push({ field: "age", holder: side, verdict: "unknown", note: "Age is a stated non-negotiable; the other person has not recorded a birth date." });
          unresolved.push({ subjectId: counterpart.id, field: "age" });
        } else {
          soft.push("An age preference exists and the other person's age is not recorded. Unknown, never a mismatch.");
        }
      } else {
        const within = (age_min == null || age >= age_min) && (age_max == null || age <= age_max);
        if (within) {
          outcomes.push({ field: "age", holder: side, verdict: "compatible", note: "Stated age sits inside the stated range." });
        } else if (age_strength === "requirement") {
          outcomes.push({ field: "age", holder: side, verdict: "incompatible", note: "Stated age falls outside a genuine stated non-negotiable." });
        } else {
          soft.push("Age sits outside a soft preference. Weigh it; it is not a disqualification.");
        }
      }
    }
  }

  // Children / family. Only a declared non-negotiable gates; anything else is
  // reasoning material.
  {
    const mine = holder.prefs.wants_children;
    const theirs = counterpart.self.wants_children;
    if (mine && holder.prefs.children_strength === "requirement") {
      if (!theirs) {
        outcomes.push({ field: "children", holder: side, verdict: "unknown", note: "Children are a stated non-negotiable; the other person has not recorded their position." });
        unresolved.push({ subjectId: counterpart.id, field: "children" });
      } else if (theirs === mine) {
        outcomes.push({ field: "children", holder: side, verdict: "compatible", note: "Both recorded the same position on children." });
      } else {
        outcomes.push({ field: "children", holder: side, verdict: "incompatible", note: "A genuine stated position on children is not shared." });
      }
    } else if (mine && theirs && mine !== theirs) {
      soft.push("Their positions on children differ. Explore what that difference actually means to each of them.");
    }
  }


  return { outcomes, soft, unresolved };
}

/**
 * Tri-state constraint evaluation across both members. Never returns a score.
 */
export function evaluateStructuredConstraints(a: Party, b: Party): StructuredEvaluation {
  const one = evaluateOneDirection(a, b, "self");
  const two = evaluateOneDirection(b, a, "other");
  const outcomes = [...one.outcomes, ...two.outcomes];
  const unresolved = [...one.unresolved, ...two.unresolved];
  const softSignals = [...one.soft, ...two.soft];

  const verdict: Tri = outcomes.some((o) => o.verdict === "incompatible")
    ? "incompatible"
    : outcomes.some((o) => o.verdict === "unknown")
      ? "unknown"
      : "compatible";

  return { verdict, outcomes, softSignals, unresolved };
}

/**
 * Context Athena is given so she does not ask a member to repeat something
 * they already supplied. Structured intake never replaces her conversation —
 * she still explores meaning, flexibility and lived experience.
 */
export function structuredContextBlock(self: SelfDescription, prefs: MatchPreferences): string {
  const lines: string[] = [];
  if (self.height_cm) lines.push(`- They stated their height: ${cmToFeetInches(self.height_cm)} (${self.height_cm} cm).`);
  if (disclosed(self.ethnicities, self.ethnicity_self_describe)) {
    const parts = [
      ...self.ethnicities.filter((v) => v !== PREFER_NOT_TO_SAY).map((v) => labelFor(v, ETHNICITY_OPTIONS)),
      ...(self.ethnicity_self_describe ? [self.ethnicity_self_describe] : []),
    ];
    lines.push(`- They described their cultural background as: ${parts.join(", ")}.`);
  } else if ((self.ethnicities ?? []).includes(PREFER_NOT_TO_SAY)) {
    lines.push("- They chose not to state a cultural background. Respect that; do not ask again and never infer it.");
  }
  if (disclosed(self.religions, self.religion_self_describe)) {
    const parts = [
      ...self.religions.filter((v) => v !== PREFER_NOT_TO_SAY).map((v) => labelFor(v, RELIGION_OPTIONS)),
      ...(self.religion_self_describe ? [self.religion_self_describe] : []),
    ];
    lines.push(`- They described their religion or spirituality as: ${parts.join(", ")}.`);
  } else if ((self.religions ?? []).includes(PREFER_NOT_TO_SAY)) {
    lines.push("- They chose not to state a religion or spirituality. Respect that; do not ask again and never infer it.");
  }

  const statedSomething = lines.length > 0;
  if (statedSomething && prefs.ethnicity_openness === "open") lines.push("- On cultural background in a partner, they said they are open to anyone.");
  if (prefs.ethnicity_openness === "discuss_with_athena") lines.push("- On cultural background in a partner, they asked to talk it through with you rather than record a preference.");
  if (prefs.preferred_ethnicities.length > 0 && prefs.ethnicity_openness !== "open") {
    lines.push(
      `- Stated ${prefs.ethnicity_openness === "requirement" ? "requirement" : "preference"} about a partner's cultural background: ${prefs.preferred_ethnicities.map((v) => labelFor(v, ETHNICITY_OPTIONS)).join(", ")}.`,
    );
  }
  if (statedSomething && prefs.religion_openness === "open") lines.push("- On religion or spirituality in a partner, they said they are open to anyone.");
  if (prefs.religion_openness === "discuss_with_athena") lines.push("- On religion or spirituality in a partner, they asked to talk it through with you.");
  if (prefs.preferred_religions.length > 0 && prefs.religion_openness !== "open") {
    lines.push(
      `- Stated ${prefs.religion_openness === "requirement" ? "relationship requirement" : "preference"} about a partner's faith: ${prefs.preferred_religions.map((v) => labelFor(v, RELIGION_OPTIONS)).join(", ")}.`,
    );
  }
  if (prefs.height_min_cm != null || prefs.height_max_cm != null) {
    const lo = prefs.height_min_cm != null ? cmToFeetInches(prefs.height_min_cm) : "any";
    const hi = prefs.height_max_cm != null ? cmToFeetInches(prefs.height_max_cm) : "any";
    lines.push(`- Stated height ${prefs.height_strength === "requirement" ? "constraint" : "preference"} for a partner: ${lo} to ${hi}.`);
  }
  if (self.smoking && self.smoking !== PREFER_NOT_TO_SAY) {
    lines.push(`- On smoking, they said about themselves: ${labelFor(self.smoking, SMOKING_OPTIONS)}.`);
  }
  if (prefs.smoking_openness === "requirement" && prefs.preferred_smoking.length > 0) {
    lines.push(`- Stated non-negotiable about a partner and smoking: ${prefs.preferred_smoking.map((v) => labelFor(v, SMOKING_OPTIONS)).join(", ")}.`);
  } else if (prefs.preferred_smoking.length > 0) {
    lines.push(`- Preference about a partner and smoking: ${prefs.preferred_smoking.map((v) => labelFor(v, SMOKING_OPTIONS)).join(", ")}.`);
  }
  if (prefs.age_strength === "requirement" && (prefs.age_min != null || prefs.age_max != null)) {
    lines.push(`- They marked their age range a genuine non-negotiable: ${prefs.age_min ?? "any"} to ${prefs.age_max ?? "any"}.`);
  }
  if (prefs.children_strength === "requirement" && prefs.wants_children) {
    lines.push("- They marked their position on children a genuine non-negotiable.");
  }

  if ((prefs.additional_notes ?? "").trim()) {
    lines.push(`- In their own words, about who they are open to meeting: "${prefs.additional_notes!.trim()}"`);
  }

  if (lines.length === 0) return "";
  return `WHAT THEY ALREADY TOLD US IN THEIR PROFILE (member-stated; never inferred, never quoted back as data):
${lines.join("\n")}

Do not ask them to repeat any of this. You may explore the meaning, flexibility and lived experience behind what matters to them when it is useful. Never judge a consensual preference, never rank people, and never turn any of this into a score.`;
}

/**
 * Safety handling for the free-text field. Existing enforcement is preserved:
 * abusive, sexual or harm-bearing sentences are not stored. The legitimate
 * matchmaking information in the rest of the text is kept, so a member never
 * loses a real preference because one sentence crossed a line.
 */
export function sanitizeAdditionalNotes(
  raw: string | null | undefined,
  classify: (text: string) => { category: string; severity: string } | null,
): { text: string | null; removed: string[]; flaggedCategories: string[] } {
  const input = (raw ?? "").trim();
  if (!input) return { text: null, removed: [], flaggedCategories: [] };
  const blocking = new Set(["harm_risk", "sexual_content", "abusive_language"]);
  const sentences = input.split(/(?<=[.!?\n])\s+/).filter((s) => s.trim());
  const kept: string[] = [];
  const removed: string[] = [];
  const flagged: string[] = [];
  for (const s of sentences) {
    const hit = classify(s);
    if (hit && blocking.has(hit.category)) {
      removed.push(s.trim());
      if (!flagged.includes(hit.category)) flagged.push(hit.category);
    } else {
      kept.push(s.trim());
    }
  }
  const text = kept.join(" ").trim();
  return { text: text.length > 0 ? text.slice(0, 2000) : null, removed, flaggedCategories: flagged };
}
