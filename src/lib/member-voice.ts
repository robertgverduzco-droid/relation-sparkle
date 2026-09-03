// MEMBER VOICE — a display-time re-voicing of Athena's private notes.
//
// Athena's reflection pass writes her standing understanding as analytical
// notes about the member in the third person ("Robert values authenticity…").
// That register is correct for her private reasoning: it feeds matching, pair
// reasoning and the reveal. It is wrong for a member to read — nobody should
// open the app and find a clinical case file about themselves.
//
// So the fix belongs here, at the presentation boundary, not in how she
// thinks. Nothing stored is altered. This transform runs when the text is
// about to be shown to the person it describes, and only then.
//
// It is deliberately conservative: it only fires when the member's own name
// appears in the text (proof the passage really is written about them in the
// third person), and it only rewrites the pronoun family that co-occurs with
// that name. Anything ambiguous is left exactly as written.

/** Irregular verbs after a subject shift, applied before the -s rule. */
const VERB_FIXES: Array<[RegExp, string]> = [
  [/\bis\b/, "are"],
  [/\bwas\b/, "were"],
  [/\bhas\b/, "have"],
  [/\bdoes\b/, "do"],
  [/\bdoesn't\b/, "don't"],
  [/\bdoesn’t\b/, "don’t"],
  [/\bisn't\b/, "aren't"],
  [/\bisn’t\b/, "aren’t"],
  [/\bwasn't\b/, "weren't"],
  [/\bwasn’t\b/, "weren’t"],
  [/\bhasn't\b/, "haven't"],
  [/\bhasn’t\b/, "haven’t"],
  [/\bgoes\b/, "go"],
  [/\bsays\b/, "say"],
];

/** "values" -> "value", "tries" -> "try", "watches" -> "watch". */
function singularToPlural(verb: string): string {
  for (const [re, to] of VERB_FIXES) if (re.test(verb)) return verb.replace(re, to);
  if (/[^aeiou]ies$/.test(verb)) return verb.replace(/ies$/, "y");
  if (/(ss|sh|ch|x|z|o)es$/.test(verb)) return verb.replace(/es$/, "");
  if (/[^s]s$/.test(verb)) return verb.replace(/s$/, "");
  return verb;
}

/** Words that look like verbs but are not, and must not lose their "s". */
const NOT_A_VERB = new Set([
  "always",
  "perhaps",
  "sometimes",
  "less",
  "his",
  "hers",
  "yours",
  "this",
  "thus",
  "as",
  "was",
  "us",
]);

type Family = {
  subject: RegExp;
  object: RegExp;
  possessive: RegExp;
  possessivePronoun: RegExp;
  reflexive: RegExp;
  /** "they" already takes plural verbs; only he/she need the verb shift. */
  shiftsVerb: boolean;
};

const FAMILIES: Record<"he" | "she" | "they", Family> = {
  he: {
    subject: /\bhe\b/gi,
    object: /\bhim\b/gi,
    possessive: /\bhis\b/gi,
    // "his" is both determiner and pronoun; treating it as the determiner
    // ("your") is right far more often than "yours".
    possessivePronoun: /\bhis(?=\s*[.,;!?…]|$)/gi,
    reflexive: /\bhimself\b/gi,
    shiftsVerb: true,
  },
  she: {
    subject: /\bshe\b/gi,
    object: /\bher\b/gi,
    possessive: /\bher\b/gi,
    possessivePronoun: /\bhers\b/gi,
    reflexive: /\bherself\b/gi,
    shiftsVerb: true,
  },
  they: {
    subject: /\bthey\b/gi,
    object: /\bthem\b/gi,
    possessive: /\btheir\b/gi,
    possessivePronoun: /\btheirs\b/gi,
    reflexive: /\bthemselves\b/gi,
    shiftsVerb: false,
  },
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The dominant third-person family in the passage, if there is one. */
function dominantFamily(text: string): keyof typeof FAMILIES | null {
  const counts = (Object.keys(FAMILIES) as Array<keyof typeof FAMILIES>).map((k) => {
    const f = FAMILIES[k];
    // Reflexives are excluded on purpose: "how people present themselves" is
    // about other people, and must not make "they" look like the member.
    const n = (text.match(f.subject)?.length ?? 0) + (text.match(f.possessive)?.length ?? 0);
    return [k, n] as const;
  });
  const best = counts.sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

/** Restore sentence-initial capitalisation after a word swap. */
function recapitalise(text: string): string {
  return text
    .replace(/(^|[.!?…]\s+|\n)(you|your|yours|yourself)\b/g, (_m, lead: string, w: string) =>
      `${lead}${w.charAt(0).toUpperCase()}${w.slice(1)}`,
    )
    .replace(/^\s*([a-z])/, (_m, c: string) => c.toUpperCase());
}

/**
 * Re-voice Athena's private note so the member reads it as addressed to them.
 *
 * @param text  the stored, analytical understanding
 * @param name  the member's display name (first name is enough)
 * @returns the same passage in second person, or the original untouched when
 *          it is not safely recognisable as a third-person note about them.
 */
export function memberVoice(
  text: string | null | undefined,
  name: string | null | undefined,
): string | null {
  const raw = (text ?? "").trim();
  if (!raw) return null;

  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Already addressed to the member: leave it entirely alone.
  if (/\byou\b|\byour\b|\byou're\b|\byou’re\b/i.test(raw)) return raw;
  if (first.length < 2) return raw;
  const nameRe = new RegExp(`\\b${escapeRe(first)}\\b`, "g");
  const namePossessive = new RegExp(`\\b${escapeRe(first)}(?:'s|’s)`, "g");
  // The name must actually appear — otherwise we cannot tell whether the
  // passage is about the member or about someone they mentioned.
  if (!nameRe.test(raw)) return raw;

  const family = dominantFamily(raw);
  let out = raw.replace(namePossessive, "your").replace(nameRe, "you");

  if (family) {
    const f = FAMILIES[family];
    out = out
      .replace(f.reflexive, "yourself")
      .replace(f.possessivePronoun, "yours")
      .replace(f.possessive, "your")
      .replace(f.object, "you")
      .replace(f.subject, "you");
  }

  // Subject-verb agreement: "you values" -> "you value". One optional adverb
  // may sit between the subject and the verb ("you often values").
  {
    out = out.replace(
      /\b(you)(\s+(?:\w+ly|also|still|never|often|already|generally|typically)\b)?(\s+)([A-Za-z']+)/g,
      (m, subj: string, adv: string | undefined, gap: string, verb: string) => {
        const lower = verb.toLowerCase();
        if (NOT_A_VERB.has(lower) || !/s$/.test(lower)) return m;
        return `${subj}${adv ?? ""}${gap}${singularToPlural(verb)}`;
      },
    );
  }

  return recapitalise(out);
}
