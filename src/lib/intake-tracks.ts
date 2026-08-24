/**
 * INTAKE TRACKS A & B — the question set (Rebuild Spec §2, §3).
 *
 * WHY DIRECT
 * The prior build disguised intake questions as organic small talk. The model
 * cannot reliably thread that needle: it reads as evasive, or as an interview
 * pretending not to be one. Directness is the correction. Athena asks plainly,
 * frames the directness ONCE up front in her own words, and stays warm,
 * reactive and occasionally funny while doing it. Direct structure, not
 * interrogation tone.
 *
 * ORIGINALITY
 * Track A (temperament / relational operating mode) and Track B (attachment /
 * nervous-system pattern) are synthesised in original wording. Nothing
 * member-facing echoes any source framework, instrument, or branded
 * terminology, and Athena never labels a member with a type.
 *
 * Track C — the existing 15 values/integrity/intimacy questions — carries
 * forward unchanged and is owned by the existing foundational domains.
 *
 * Pure and testable: no I/O, no model call.
 */

export type TrackKey = "temperament" | "attachment";

export type TrackFacet = {
  key: string;
  /** Athena's own words for what she is trying to understand. */
  label: string;
  /** Questions asked directly. Wording may be adapted to the conversation. */
  questions: string[];
  /** Lexical cues that this ground has actually been covered. */
  cues: RegExp;
};

/**
 * TRACK A — Temperament / relational operating mode.
 * What drives someone. Used for COMPLEMENTARY matching: some contrast here
 * tends to produce generative friction rather than conflict.
 */
export const TRACK_A: TrackFacet[] = [
  {
    key: "novelty",
    label: "how much they run on novelty and impulse",
    questions: [
      "When was the last time you did something completely on impulse — how did it turn out?",
      "Do you get bored faster than most people you know?",
      "Do you make plans and follow them, or do plans make you restless?",
    ],
    cues: /\b(impulse|impulsive|spontaneous|on a whim|bored|boredom|restless|novelty|spur of the moment|last minute|change of scene)\b/i,
  },
  {
    key: "structure",
    label: "how much structure they need to feel like themselves",
    questions: [
      "How important is having a routine to feeling like yourself?",
      "When something in your life feels chaotic, what's the first thing you try to fix?",
      "Do you trust a gut decision, or do you need to think it through first?",
    ],
    cues: /\b(routine|structure|schedule|organi[sz]ed|chaos|chaotic|plan(ner|ning)?|stability|predictab|think it through|overthink|gut (feel|decision|instinct))\b/i,
  },
  {
    key: "drive",
    label: "how drive and competition sit in them",
    questions: [
      "When you disagree with someone you respect, do you say so on the spot or process it first?",
      "What's something you've competed hard for that surprised people?",
      "Do you enjoy winning more than you dislike losing, or is it the reverse?",
    ],
    cues: /\b(competit|compete|win(ning)?|los(e|ing)|driven|ambitio|push(ed)? myself|disagree|argue back|say so|hate losing|prove)\b/i,
  },
  {
    key: "connection",
    label: "how they orient toward other people's inner states",
    questions: [
      "When a friend is struggling, is your instinct to fix it or just sit with them in it?",
      "How do you know when you actually trust someone — what's the tell?",
      "Do you feel other people's moods physically, like it affects your own body?",
    ],
    cues: /\b(empath|feel (their|other people'?s|others'?) (moods?|energy|feelings)|sit with (them|him|her)|fix it|absorb|trust someone|the tell|attuned|sensitive to (people|moods))\b/i,
  },
];

/**
 * TRACK B — Attachment / nervous-system pattern.
 * How someone actually behaves under closeness, conflict, or inconsistency —
 * read through specific stories and reactions, NEVER through self-labeling.
 * Used for SIMILARITY matching toward mutual security.
 */
export const TRACK_B: TrackFacet[] = [
  {
    key: "space",
    label: "what happens in them when a partner needs space",
    questions: [
      "When a partner needs space, what's your first internal reaction — relief, panic, or something else?",
    ],
    cues: /\b(needs? space|space from me|gave me space|relief|panic|freak(ed|ing)? out|spiral|left alone|distance)\b/i,
  },
  {
    key: "repair",
    label: "what they need after conflict",
    questions: [
      "After a fight, do you want to talk it out immediately or need time alone first?",
    ],
    cues: /\b(after (a|the) (fight|argument)|talk it out|cool(ing)? off|need time alone|storm off|shut down|make up|repair)\b/i,
  },
  {
    key: "withdrawal",
    label: "whether they have pulled away from someone who was doing it right",
    questions: [
      "Have you ever pulled away from someone who was doing everything right? What was that about?",
    ],
    cues: /\b(pull(ed)? away|pushed (them|him|her) away|lost interest for no reason|too good|doing everything right|self[- ]sabotag|ran)\b/i,
  },
  {
    key: "opening",
    label: "what opening up feels like in their body",
    questions: [
      "What does it feel like in your body right before you're about to open up to someone?",
    ],
    cues: /\b(in my (body|chest|stomach|throat)|tight(ness)?|heart rac|nervous|hands? shak|before i (open up|say it)|vulnerab)\b/i,
  },
  {
    key: "inconsistency",
    label: "how they respond to inconsistency from someone",
    questions: [
      "When someone is inconsistent with you, do you lean in harder or pull back?",
    ],
    cues: /\b(inconsistent|hot and cold|mixed signals|left on read|lean in|chase|pull back|withdraw|protest)\b/i,
  },
  {
    key: "needing",
    label: "whether being needed or needing is easier for them",
    questions: [
      "Do you find it easier to be needed or to need someone?",
    ],
    cues: /\b(easier to be needed|need someone|needing someone|ask(ing)? for help|rely on|depend(ent|ence)? on|being needed|self[- ]sufficient)\b/i,
  },
];

export const TRACKS: Record<TrackKey, TrackFacet[]> = {
  temperament: TRACK_A,
  attachment: TRACK_B,
};

/** Facet keys where Athena writes what each track produced. */
export const TRACK_FACET: Record<TrackKey, "temperament_mode" | "nervous_system_pattern"> = {
  temperament: "temperament_mode",
  attachment: "nervous_system_pattern",
};

export type Turn = { role: string; content: string };

export type TrackCoverage = {
  /** Sub-areas of each track already genuinely touched in this conversation. */
  covered: Record<TrackKey, string[]>;
  /** Sub-areas still unseen, in ask order. */
  remaining: Record<TrackKey, TrackFacet[]>;
  complete: boolean;
};

/** Which sub-areas does this passage touch? */
function touched(track: TrackFacet[], text: string): string[] {
  return track.filter((f) => f.cues.test(text)).map((f) => f.key);
}

/**
 * Coverage is derived from the WHOLE transcript — Athena's questions and the
 * member's answers both count as having been in that ground, because a member
 * who deflects a question has still been asked it and Athena should not loop.
 */
export function assessTrackCoverage(messages: Turn[]): TrackCoverage {
  const text = (messages ?? []).map((m) => m.content ?? "").join("\n");
  const a = new Set(touched(TRACK_A, text));
  const b = new Set(touched(TRACK_B, text));
  const remainingA = TRACK_A.filter((f) => !a.has(f.key));
  const remainingB = TRACK_B.filter((f) => !b.has(f.key));
  return {
    covered: { temperament: [...a], attachment: [...b] },
    remaining: { temperament: remainingA, attachment: remainingB },
    // Both tracks need most of their ground, not all of it: a member can
    // answer two questions at once, and Athena must not re-ask what she has.
    complete: remainingA.length <= 1 && remainingB.length <= 2,
  };
}

/**
 * The directness framing. Said ONCE, near the start of the first
 * conversation, in Athena's own words — this is intent, not a script.
 */
export const DIRECTNESS_FRAMING = [
  "FRAME THE DIRECTNESS — ONCE, NOW, THEN NEVER AGAIN.",
  "This is early in your first real conversation with them and you have not yet explained how you work. Do it now, in your own words, in two or three sentences at most.",
  "What has to land: you are going to ask directly rather than dance around it; the more they give you now, the better you can search for them later; some of it may feel like a lot in one sitting; and it gets more naturally conversational once this first pass is behind you.",
  "Do not apologise for it, do not ask permission, do not describe categories or a number of questions, and do not promise how long it takes. Then ask your first real question.",
].join(" ");

/**
 * Per-turn guidance for the intake conversation. Direct question structure,
 * warm reactive tone. One question per turn; her reaction to their last answer
 * comes first.
 */
export function trackGuidance(coverage: TrackCoverage, opts: { framed: boolean }): string {
  const lines: string[] = [];

  if (!opts.framed) lines.push(DIRECTNESS_FRAMING);

  const nextA = coverage.remaining.temperament[0];
  const nextB = coverage.remaining.attachment[0];

  lines.push(
    "INTAKE — DIRECT QUESTIONS, WARM DELIVERY.",
    "Ask directly. Do not disguise a question as small talk, do not build a runway of pleasantries before it, and do not stack two questions in one turn.",
    "React to what they actually said first — honestly, briefly, with humour if the moment has it — and then ask the next thing. Directness is about structure, not tone: never sound like a form or an interrogation.",
    "Never name a track, a category, a type, a stage, or how much is left. Never tell them what their answer means about them.",
  );

  if (nextA || nextB) {
    const wanted = [nextA ? `TEMPERAMENT — ${nextA.label}` : "", nextB ? `HOW THEY ARE UNDER CLOSENESS — ${nextB.label}` : ""]
      .filter(Boolean)
      .join("; ");
    lines.push(`GROUND YOU STILL NEED: ${wanted}.`);
    const examples = [nextA?.questions[0], nextB?.questions[0]].filter(Boolean);
    lines.push(
      `Questions in the right shape (adapt the wording to what has already been said, never read them out mechanically): ${examples
        .map((q) => `"${q}"`)
        .join(" / ")}`,
    );
    lines.push(
      "For how they are under closeness, always go for a specific story or a felt reaction. Never accept or invite a self-label — what they call themselves is worth far less than what they did the last time it happened.",
    );
  } else {
    lines.push(
      "You have covered this ground already. Do not re-ask it. Follow what is genuinely open instead.",
    );
  }

  return lines.join(" ");
}

/**
 * Has Athena already framed her directness in this conversation? Detected from
 * her own words so it survives a refresh and can never be said twice.
 */
export function alreadyFramed(messages: Turn[]): boolean {
  const hers = (messages ?? []).filter((m) => m.role === "assistant").map((m) => m.content ?? "");
  if (hers.length === 0) return false;
  return hers.some((t) =>
    /\b(ask(ing)? (you )?(some )?(pretty |quite |fairly )?(direct|directly|straight)|i'?m going to ask|rather than dance|no small talk|straight to it|more conversational (after|once)|feel like a lot)\b/i.test(
      t,
    ),
  );
}
