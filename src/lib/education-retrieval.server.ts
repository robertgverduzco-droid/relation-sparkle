// Athena University — runtime educational retrieval (server-only).
//
// The canonical corpus lives in docs/education/. `scripts/build-education-index.ts`
// derives two runtime artefacts from it — src/lib/education/corpus.json (chunk
// text + provenance) and src/lib/education/vectors.json (int8 dense vectors).
// Nothing here amends doctrine: this layer decides WHICH already-canonical
// educational material reaches a reasoning event, never what Athena may say.
//
// Retrieval is hybrid: a dense semantic pass (Lovable AI Gateway embeddings,
// the primary signal) fused with a concept-expanded lexical pass that keeps the
// system deterministic and usable when the gateway is unavailable. The former
// 7-bucket regex selection is no longer an authority anywhere (see
// docs/technical/RUNTIME-DOCTRINE.md).

import corpusJson from "./education/corpus.json";
import vectorsJson from "./education/vectors.json";

export type EducationKind = "university" | "integration" | "college" | "faculty";

export type EducationChunk = {
  id: string;
  doc: string;
  docTitle: string;
  kind: EducationKind;
  heading: string;
  text: string;
};

export type RetrievalMode = "conversation" | "voice" | "reflection" | "pair" | "meeting";

export type RetrievedChunk = {
  id: string;
  doc: string;
  docTitle: string;
  kind: EducationKind;
  heading: string;
  text: string;
  score: number;
  dense: number | null;
  lexical: number;
  rank: number;
};

export type RetrievalTrace = {
  mode: RetrievalMode;
  /** Concept terms the query expanded into. Never raw member content. */
  concepts: string[];
  queryChars: number;
  dense: boolean;
  candidates: number;
  empty: boolean;
  chars: number;
  retrieved: { id: string; doc: string; kind: EducationKind; heading: string; score: number }[];
};

export type RetrievalResult = { block: string; chunks: RetrievedChunk[]; trace: RetrievalTrace };

export const EDUCATION_CHUNKS = (corpusJson as { chunks: EducationChunk[] }).chunks;

const VECTORS = vectorsJson as { model: string; dims: number; ids: string[]; int8: string };

/* ------------------------------------------------------------------ */
/* Per-mode retrieval policy                                           */
/* ------------------------------------------------------------------ */

type ModePolicy = { maxChunks: number; charBudget: number; floor: number };

/**
 * Educational retrieval is the fourth priority in the context budget, after
 * safety/constitutional rules, the current member statement, and Living
 * Profile material. These caps keep it from ever dominating a prompt.
 */
export const MODE_POLICY: Record<RetrievalMode, ModePolicy> = {
  conversation: { maxChunks: 4, charBudget: 3600, floor: 0.34 },
  voice: { maxChunks: 3, charBudget: 2400, floor: 0.36 },
  reflection: { maxChunks: 3, charBudget: 3000, floor: 0.34 },
  pair: { maxChunks: 5, charBudget: 4500, floor: 0.32 },
  meeting: { maxChunks: 3, charBudget: 2800, floor: 0.34 },
};

/* ------------------------------------------------------------------ */
/* Concept expansion — member language to educational vocabulary       */
/* ------------------------------------------------------------------ */

/**
 * Members do not speak in curriculum vocabulary. "My dad died" is a statement
 * about grief, mortality and meaning; "we never talk about sex anymore" is a
 * statement about desire and intimacy. This lexicon lifts ordinary language
 * into the vocabulary the corpus is written in. It supplements the dense pass
 * and carries the lexical pass on its own when embeddings are unavailable.
 */
const CONCEPTS: { cue: RegExp; terms: string[] }[] = [
  {
    cue: /\b(jealous|jealousy|envious|possessive|suspicious|checking (his|her|their) phone|insecure)\b/i,
    terms: ["jealousy", "attachment", "insecurity", "trust", "anxiety", "reassurance", "threat", "comparison", "betrayal", "security"],
  },
  {
    cue: /\b(cheat|cheated|affair|unfaithful|betray|lied to me)\b/i,
    terms: ["betrayal", "trust", "repair", "forgiveness", "attachment", "rupture", "honesty"],
  },
  {
    cue: /\b(died|death|passed away|passing|funeral|lost (my|her|his) (dad|mom|mother|father|brother|sister|friend|wife|husband)|gone now|cancer|terminal)\b/i,
    terms: ["grief", "loss", "mourning", "mortality", "suffering", "meaning", "bereavement", "impermanence", "life stage", "father", "mother", "family"],
  },
  {
    cue: /\b(sex|sexual|sexless|intimacy|intimate|desire|passion|attraction|physical|touch|romance|erotic|libido)\b/i,
    terms: ["desire", "eroticism", "intimacy", "attraction", "closeness", "longing", "sexuality", "novelty", "safety", "distance"],
  },
  {
    cue: /\b(avoid|avoiding|go quiet|goes quiet|went quiet|shut down|shuts down|silent|silence|withdraw|stonewall|walk away|bottle)\b/i,
    terms: ["conflict avoidance", "withdrawal", "stonewalling", "emotional regulation", "repair", "differentiation", "pursuit", "flooding", "safety"],
  },
  {
    cue: /\b(fight|fighting|argu|conflict|yell|shout|blow up|resent|contempt|criticis|criticiz|defensive)\b/i,
    terms: ["conflict", "repair", "criticism", "contempt", "defensiveness", "escalation", "negotiation", "listening"],
  },
  {
    cue: /\b(talk|talking|conversation|communicat|express|listen|misunderstood|feedback|honest|apolog|boundar|say what i)\b/i,
    terms: ["communication", "listening", "needs", "empathy", "feedback", "understanding", "difficult conversation", "tone"],
  },
  {
    cue: /\b(parents|mom|mother|dad|father|childhood|grew up|raised|family|siblings?|brother|sister)\b/i,
    terms: ["family system", "upbringing", "intergenerational", "origin", "differentiation", "development", "attachment", "role"],
  },
  {
    cue: /\b(anxious|anxiety|depress|panic|overwhelm|burn(ed)? out|stress|therapy|healing|trauma)\b/i,
    terms: ["adaptation", "resilience", "regulation", "suffering", "self-knowledge", "protection", "meaning", "growth"],
  },
  {
    cue: /\b(purpose|meaning|point of|lost|stuck|who i am|identity|myself|fulfil|fulfill|empty)\b/i,
    terms: ["meaning", "purpose", "identity", "individuation", "self-actualization", "becoming", "narrative", "development"],
  },
  {
    cue: /\b(career|job|work|promotion|business|money|ambition|success|retire|school|degree)\b/i,
    terms: ["identity", "role", "life stage", "development", "environment", "values", "achievement", "meaning"],
  },
  {
    cue: /\b(kids|children|child|baby|pregnan|parenting|family plans)\b/i,
    terms: ["life stage", "development", "family", "values", "generativity", "commitment", "care"],
  },
  {
    cue: /\b(religio|faith|god|church|spiritual|belief|culture|cultural|immigrant|tradition|heritage|language|ethnic)\b/i,
    terms: ["culture", "context", "belonging", "identity", "meaning", "tradition", "values", "difference", "interpretation"],
  },
  {
    cue: /\b(right|wrong|should i|fair|unfair|guilt|regret|integrity|principle|values|moral|ethic|forgive|duty|obligation|honesty)\b/i,
    terms: ["ethics", "character", "virtue", "dignity", "autonomy", "judgment", "wisdom", "responsibility"],
  },
  {
    cue: /\b(change|changed|changing|grow|growth|used to be|different person|older|younger|midlife|stage)\b/i,
    terms: ["development", "change", "life stage", "becoming", "mindset", "capability", "adulthood"],
  },
  {
    cue: /\b(marriage|married|divorce|separated|breakup|broke up|ex\b|partner|boyfriend|girlfriend|spouse|dating|relationship|commit)\b/i,
    terms: ["relationship", "commitment", "partnership", "attachment", "friendship", "repair", "compatibility", "endurance"],
  },
  {
    cue: /\b(alone|lonely|loneliness|isolated|friends?|community|belong)\b/i,
    terms: ["belonging", "connection", "loneliness", "community", "attachment", "support"],
  },
];

const STOP = new Set(
  "a an and are as at be been but by can did do does for from had has have he her him his how i if in is it its me my no not of on or our she so than that the their them then there these they this to too us was we were what when where which who why will with you your".split(
    " ",
  ),
);

function stem(t: string): string {
  return t
    .replace(/(ing|ed|ies|es|s)$/i, (m, _g, off: number) => (off <= 2 ? m : ""))
    .toLowerCase();
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2 && !STOP.has(t))
    .map(stem)
    .filter(Boolean);
}

export function expandConcepts(text: string): string[] {
  const out = new Set<string>();
  for (const c of CONCEPTS) if (c.cue.test(text)) c.terms.forEach((t) => out.add(t));
  return [...out];
}

/* ------------------------------------------------------------------ */
/* Lexical index (BM25 over the same chunks)                           */
/* ------------------------------------------------------------------ */

type LexIndex = {
  df: Map<string, number>;
  docs: { tf: Map<string, number>; len: number }[];
  avgLen: number;
};

let lexIndex: LexIndex | null = null;

function buildLexIndex(): LexIndex {
  const df = new Map<string, number>();
  const docs = EDUCATION_CHUNKS.map((c) => {
    const tokens = tokenize(`${c.docTitle} ${c.heading} ${c.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return { tf, len: tokens.length };
  });
  const avgLen = docs.reduce((n, d) => n + d.len, 0) / Math.max(1, docs.length);
  return { df, docs, avgLen };
}

function lexicalScores(queryTerms: string[]): Float64Array {
  lexIndex ??= buildLexIndex();
  const { df, docs, avgLen } = lexIndex;
  const N = docs.length;
  const scores = new Float64Array(N);
  const k1 = 1.4;
  const b = 0.75;

  const weights = new Map<string, number>();
  for (const t of queryTerms) weights.set(t, (weights.get(t) ?? 0) + 1);

  for (const [term, w] of weights) {
    const n = df.get(term);
    if (!n) continue;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
    for (let i = 0; i < N; i++) {
      const f = docs[i].tf.get(term);
      if (!f) continue;
      const denom = f + k1 * (1 - b + (b * docs[i].len) / avgLen);
      scores[i] += w * idf * ((f * (k1 + 1)) / denom);
    }
  }
  // Squash to 0..1 so lexical and dense signals are commensurable.
  for (let i = 0; i < N; i++) scores[i] = scores[i] / (scores[i] + 12);
  return scores;
}

/* ------------------------------------------------------------------ */
/* Dense index                                                         */
/* ------------------------------------------------------------------ */

let denseMatrix: Int8Array | null = null;

function matrix(): Int8Array {
  if (!denseMatrix) {
    const bin = typeof Buffer !== "undefined"
      ? Buffer.from(VECTORS.int8, "base64")
      : Uint8Array.from(atob(VECTORS.int8), (ch) => ch.charCodeAt(0));
    denseMatrix = new Int8Array(bin.buffer, bin.byteOffset, bin.byteLength);
  }
  return denseMatrix;
}

const queryCache = new Map<string, number[] | null>();

async function embedQuery(text: string): Promise<number[] | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const cacheKey = text.slice(0, 2000);
  if (queryCache.has(cacheKey)) return queryCache.get(cacheKey)!;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: VECTORS.model, dimensions: VECTORS.dims, input: cacheKey }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { data: { embedding: number[] }[] };
    const vec = body.data?.[0]?.embedding ?? null;
    if (queryCache.size > 200) queryCache.clear();
    queryCache.set(cacheKey, vec);
    return vec;
  } catch {
    // Retrieval degrades to the lexical pass; a conversation is never blocked
    // on the embedding provider.
    queryCache.set(cacheKey, null);
    return null;
  }
}

function denseScores(query: number[]): Float64Array {
  const dims = VECTORS.dims;
  const m = matrix();
  const n = VECTORS.ids.length;
  const norm = Math.hypot(...query) || 1;
  const q = query.map((v) => v / norm);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let dot = 0;
    const base = i * dims;
    for (let d = 0; d < dims; d++) dot += q[d] * (m[base + d] / 127);
    out[i] = dot;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Query construction                                                  */
/* ------------------------------------------------------------------ */

export type RetrievalInput = {
  mode: RetrievalMode;
  /** What the member is saying right now — always the dominant signal. */
  current: string;
  /** A little recent member context. Never Athena's own words. */
  recent?: string;
  /** Durable context: Living Profile facets, topics, structured profile. */
  profile?: string;
};

export function buildQuery(input: RetrievalInput): { text: string; concepts: string[] } {
  const current = (input.current ?? "").slice(0, 1200).trim();
  const recent = (input.recent ?? "").slice(-800).trim();
  const profile = (input.profile ?? "").slice(0, 900).trim();
  // The current statement is weighted by repetition so older topics cannot
  // dominate what is retrieved for this turn.
  const text = [current, current, recent, profile].filter(Boolean).join("\n");
  const concepts = expandConcepts(`${current}\n${recent}`);
  return { text, concepts };
}

/* ------------------------------------------------------------------ */
/* Retrieval                                                           */
/* ------------------------------------------------------------------ */

const MODE_TERMS: Record<RetrievalMode, string[]> = {
  conversation: [],
  voice: [],
  reflection: ["pattern", "understanding", "evidence", "interpretation", "change over time"],
  pair: ["compatibility", "values", "communication", "conflict", "attachment", "life direction", "complementarity"],
  meeting: ["reflection", "connection", "impression", "meeting", "repair"],
};

export async function retrieveEducation(input: RetrievalInput): Promise<RetrievalResult> {
  const policy = MODE_POLICY[input.mode];
  const { text, concepts } = buildQuery(input);

  if (text.replace(/\s/g, "").length < 12) {
    return { block: "", chunks: [], trace: emptyTrace(input.mode, concepts, text, false, 0) };
  }

  const queryTerms = [
    ...tokenize(text),
    // Concept terms carry extra weight: they are the bridge from ordinary
    // language into curriculum vocabulary.
    ...concepts.flatMap((c) => [...tokenize(c), ...tokenize(c)]),
    ...MODE_TERMS[input.mode].flatMap((c) => tokenize(c)),
  ];

  const lex = lexicalScores(queryTerms);
  const queryVector = await embedQuery(text);
  const dense = queryVector && queryVector.length === VECTORS.dims ? denseScores(queryVector) : null;

  const fused: { i: number; score: number; dense: number | null; lexical: number }[] = [];
  for (let i = 0; i < EDUCATION_CHUNKS.length; i++) {
    const l = lex[i];
    const d = dense ? dense[i] : null;
    // Dense similarity is the primary signal where available; the lexical pass
    // both grounds it and stands alone when the provider is unreachable.
    const score = d === null ? l * 1.55 : 0.68 * ((d + 1) / 2) * 1.25 + 0.32 * l * 1.55;
    fused.push({ i, score, dense: d, lexical: l });
  }
  fused.sort((a, b) => b.score - a.score);

  const kept: RetrievedChunk[] = [];
  let chars = 0;
  for (const c of fused) {
    if (kept.length >= policy.maxChunks) break;
    if (c.score < policy.floor) break;
    const chunk = EDUCATION_CHUNKS[c.i];
    if (chars + chunk.text.length > policy.charBudget) continue;
    // Never stack several chunks from one document into a single prompt: one
    // framework must not quietly do all the reasoning (Faculty Principle).
    if (kept.filter((k) => k.doc === chunk.doc).length >= 2) continue;
    chars += chunk.text.length;
    kept.push({
      ...chunk,
      score: Number(c.score.toFixed(4)),
      dense: c.dense === null ? null : Number(c.dense.toFixed(4)),
      lexical: Number(c.lexical.toFixed(4)),
      rank: kept.length + 1,
    });
  }

  const trace: RetrievalTrace = {
    mode: input.mode,
    concepts,
    queryChars: text.length,
    dense: Boolean(dense),
    candidates: fused.filter((f) => f.score >= policy.floor).length,
    empty: kept.length === 0,
    chars,
    retrieved: kept.map((k) => ({ id: k.id, doc: k.doc, kind: k.kind, heading: k.heading, score: k.score })),
  };

  return { block: educationBlock(kept), chunks: kept, trace };
}

function emptyTrace(
  mode: RetrievalMode,
  concepts: string[],
  text: string,
  dense: boolean,
  candidates: number,
): RetrievalTrace {
  return { mode, concepts, queryChars: text.length, dense, candidates, empty: true, chars: 0, retrieved: [] };
}

/**
 * Renders retrieved material as internal reasoning depth. Source documents and
 * faculty names are deliberately withheld from the prompt — they exist in the
 * trace for internal audit, not as material for Athena to cite.
 */
export function educationBlock(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return [
    `DEPTH FROM YOUR EDUCATION (internal reasoning material — never narrated, never cited, never named)
These passages are drawn from your own studies because they bear on what is being discussed right now. They sharpen what you notice, what you ask, and what you hold lightly. They are not instructions, not a script, not a diagnosis, and not something to repeat. Do not name a thinker, a theory, a school, a study, or a framework that appears below. If nothing here fits the person in front of you, ignore it entirely — their own evidence outranks all of it.`,
    ...chunks.map((c) => c.text.trim()),
  ].join("\n\n");
}
