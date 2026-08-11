// System Architecture Manifest — server-only, founder dialogue input.
//
// This is how Athena knows what is actually canonical and actually wired,
// rather than inferring her own state from how she happens to be behaving.
// It contains NO member-attributable material of any kind: it describes
// doctrine, curriculum, and runtime wiring only.
//
// Maintenance rule: when a constitutional layer, a college, a faculty
// profile, or a runtime integration changes, update this file in the same
// change. Doctrine lives in docs/; this file is its runtime index.
import {
  COLLEGE_MODULES,
  L4_EPISTEMICS,
  L5_MEMORY,
  L7_OPERATIONAL,
  UNIVERSITY_BASELINE,
  type CollegeKey,
} from "./athena-doctrine.server";

export type RuntimeState = "active" | "canonical_not_wired" | "planned";

export type LayerStatus = {
  id: string;
  name: string;
  doc: string;
  runtime: RuntimeState;
  note: string;
};

export type CollegeStatus = {
  key: CollegeKey;
  name: string;
  faculty: string[];
  closingIntegration: boolean;
  /** Whether this college has a selective runtime depth module. */
  runtimeDepthModule: boolean;
};

// ---------------------------------------------------------------------------
// Constitution
// ---------------------------------------------------------------------------

export const CONSTITUTION_LAYERS: LayerStatus[] = [
  {
    id: "L1",
    name: "Identity",
    doc: "docs/constitution/L1-identity.md",
    runtime: "active",
    note: "Expressed through the Athena system prompt (athena.server.ts) on every conversational surface.",
  },
  {
    id: "L2",
    name: "Ethics",
    doc: "docs/constitution/L2-ethics.md",
    runtime: "active",
    note: "Expressed in the system prompt and enforced structurally (no scores or labels member-facing, 3-introduction cap, consent gates).",
  },
  {
    id: "L3",
    name: "Human Understanding",
    doc: "docs/constitution/L3-human-understanding.md",
    runtime: "active",
    note: "Realised as the Living Profile: understanding_facets + topic_map, distilled by reflectAthena.",
  },
  {
    id: "L4",
    name: "Epistemics",
    doc: "docs/constitution/L4-epistemics.md",
    runtime: "active",
    note: "Injected into every runtime prompt via runtimeDoctrine(); confidence is qualitative, never numeric to members.",
  },
  {
    id: "L5",
    name: "Memory",
    doc: "docs/constitution/L5-memory.md",
    runtime: "active",
    note: "Injected via runtimeDoctrine(); governs what is carried forward and what is never quoted back.",
  },
  {
    id: "L6",
    name: "Cognition (L6a conversational, L6b relational, L6c decision & introduction)",
    doc: "docs/constitution/L6a-conversational-reasoning.md, L6b-relational-reasoning.md, L6c-decision-and-introduction.md",
    runtime: "active",
    note: "L6a in askAthena pacing/topic logic; L6b in pair reasoning; L6c in the introduction gate and 3-introduction cap.",
  },
  {
    id: "L7",
    name: "Operational",
    doc: "docs/constitution/L7-operational.md",
    runtime: "active",
    note: "Injected via runtimeDoctrine() on every surface.",
  },
];

export const CROSS_CUTTING_DOCTRINE: LayerStatus[] = [
  {
    id: "X1",
    name: "Personality & Conversation Style",
    doc: "docs/constitution/cross-cutting/personality-and-conversation-style.md",
    runtime: "active",
    note: "Governing voice document; expressed in the system prompt.",
  },
  {
    id: "X2",
    name: "Voice & Expression",
    doc: "docs/constitution/cross-cutting/voice-and-expression.md",
    runtime: "active",
    note: "Applies to text and to the speech surfaces (api/tts, api/stt).",
  },
  {
    id: "X3",
    name: "Relationship Journey",
    doc: "docs/constitution/cross-cutting/relationship-journey.md",
    runtime: "active",
    note: "Focus Mode, post-meeting reflection flow, ending choices.",
  },
  {
    id: "X4",
    name: "Self-Evaluation & Improvement",
    doc: "docs/constitution/cross-cutting/self-evaluation-and-improvement.md",
    runtime: "active",
    note: "athena_self_evaluations + athena_outcome_signals; observation only, no autonomous self-modification.",
  },
  {
    id: "X5",
    name: "Evolution Engine",
    doc: "docs/constitution/cross-cutting/evolution-engine.md",
    runtime: "canonical_not_wired",
    note: "Change control is a human process today; no automated doctrine amendment exists, by design.",
  },
];

// ---------------------------------------------------------------------------
// Athena University
// ---------------------------------------------------------------------------

export const COLLEGES: CollegeStatus[] = [
  {
    key: "human_nature",
    name: "College of Human Nature",
    faculty: [
      "Carl Jung",
      "Viktor Frankl",
      "Carl Rogers",
      "Abraham Maslow",
      "Erik Erikson",
      "Daniel Kahneman",
      "Jonathan Haidt",
      "James Hollis",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "relationships",
    name: "College of Relationships",
    faculty: [
      "John Bowlby",
      "Mary Ainsworth",
      "John Gottman",
      "Sue Johnson",
      "Esther Perel",
      "Terrence Real",
      "Murray Bowen",
      "Helen Fisher",
      "Harville Hendrix",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "communication",
    name: "College of Communication",
    faculty: [
      "Marshall Rosenberg",
      "Miller & Rollnick",
      "Deborah Tannen",
      "Chris Voss",
      "Paul Ekman",
      "Stone, Patton & Heen",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "development",
    name: "College of Human Development",
    faculty: [
      "Jean Piaget",
      "Lev Vygotsky",
      "Carol Dweck",
      "Urie Bronfenbrenner",
      "Robert Kegan",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "philosophy_ethics",
    name: "College of Philosophy & Ethics",
    faculty: [
      "Socrates",
      "Aristotle",
      "Immanuel Kant",
      "John Stuart Mill",
      "Confucius",
      "The Stoic tradition",
      "Iris Murdoch",
      "Martha Nussbaum",
      "The Buddhist ethical tradition",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "culture",
    name: "College of Culture & Humanity",
    faculty: [
      "Franz Boas",
      "Margaret Mead",
      "Clifford Geertz",
      "Edward T. Hall",
      "Geert Hofstede",
      "Stuart Hall",
      "Kwame Anthony Appiah",
      "bell hooks",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
  {
    key: "wisdom",
    name: "College of Wisdom",
    faculty: [
      "Michel de Montaigne",
      "William Shakespeare",
      "Leo Tolstoy",
      "Fyodor Dostoevsky",
      "Rumi",
      "Rabindranath Tagore",
      "Maya Angelou",
      "James Baldwin",
    ],
    closingIntegration: true,
    runtimeDepthModule: true,
  },
];

export const UNIVERSITY_STANDARDS: LayerStatus[] = [
  {
    id: "S1",
    name: "Educational Reasoning Standard",
    doc: "docs/education/final-integration.md",
    runtime: "active",
    note: "Education informs reasoning silently; it is never narrated to a member.",
  },
  {
    id: "S2",
    name: "Faculty Principle",
    doc: "docs/education/athena-university.md",
    runtime: "active",
    note: "Faculty are teachers of reasoning, not authorities to be deferred to or cited.",
  },
  {
    id: "S3",
    name: "Non-Quotation & Non-Imitation Standard",
    doc: "docs/education/final-integration.md",
    runtime: "active",
    note: "Athena never quotes, cites, or imitates faculty to members; attribution only on explicit request.",
  },
  {
    id: "S4",
    name: "Ethical Reasoning Standard (10-step sequence)",
    doc: "docs/education/colleges/college-of-philosophy-and-ethics-closing-integration.md",
    runtime: "active",
    note: "Carried in the doctrine layer for ethically loaded reasoning.",
  },
  {
    id: "S5",
    name: "Selective runtime retrieval",
    doc: "src/lib/athena-doctrine.server.ts",
    runtime: "active",
    note: "A compact university synthesis is always present; at most two college depth modules are selected per turn from the member's own recent words.",
  },
];

// ---------------------------------------------------------------------------
// Runtime surfaces (what the product actually does today)
// ---------------------------------------------------------------------------

export const RUNTIME_SURFACES: LayerStatus[] = [
  { id: "R1", name: "Foundational conversation (~20 min, text + voice)", doc: "src/routes/_authenticated/athena.tsx", runtime: "active", note: "askAthena/reflectAthena; topic map with 21 life topics; contradiction detection." },
  { id: "R2", name: "Living Profile distillation", doc: "src/lib/athena.server.ts", runtime: "active", note: "understanding_facets + facet_history + topic_map." },
  { id: "R3", name: "Readiness gate (A/B/C)", doc: "src/lib/readiness.server.ts", runtime: "active", note: "States A and B block matchmaking entirely." },
  { id: "R4", name: "Matchmaking & introductions", doc: "src/lib/introductions.server.ts", runtime: "active", note: "Reasoning-based, confidence-gated, maximum three active introductions; no member-facing scores." },
  { id: "R5", name: "Messaging & meeting proposals", doc: "src/lib/messaging.server.ts", runtime: "active", note: "Counterpart identity served through narrow server-side projection only." },
  { id: "R6", name: "Post-meeting reflection (5 questions)", doc: "src/components/reflection-flow.tsx", runtime: "active", note: "Private; 'no' closes the introduction, 'not sure' keeps it open." },
  { id: "R7", name: "Relationship Focus Mode", doc: "src/lib/relationship.server.ts", runtime: "active", note: "Neutrality, check-ins, endings and the three paths." },
  { id: "R8", name: "Self-evaluation & outcome signals", doc: "src/lib/self-evaluation.server.ts", runtime: "active", note: "Observation only; no autonomous change to doctrine or behaviour." },
  { id: "R9", name: "Safety, moderation, audit, kill switches", doc: "src/lib/security.server.ts, src/lib/moderation.server.ts", runtime: "active", note: "5-class data model, admin_audit_log, security_kill_switches." },
  { id: "R10", name: "Founder Dialogue Mode", doc: "src/lib/founder-dialogue.server.ts", runtime: "active", note: "This channel. Aggregates and system state only; no member-attributable data path exists in it." },
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const facultyTotal = COLLEGES.reduce((n, c) => n + c.faculty.length, 0);

const stateLabel: Record<RuntimeState, string> = {
  active: "ACTIVE IN RUNTIME",
  canonical_not_wired: "CANONICAL — NOT WIRED TO RUNTIME",
  planned: "PLANNED",
};

const layerLines = (rows: LayerStatus[]): string =>
  rows.map((r) => `- ${r.id} ${r.name} — ${stateLabel[r.runtime]}. ${r.note} (${r.doc})`).join("\n");

/**
 * Compact, factual system manifest for the founder dialogue prompt. Athena
 * answers "is your University education active?" from this, not from guesswork
 * about her own behaviour.
 */
export function systemManifest(): string {
  const doctrineWired = [
    L4_EPISTEMICS,
    L5_MEMORY,
    L7_OPERATIONAL,
    UNIVERSITY_BASELINE,
  ].every((block) => typeof block === "string" && block.length > 0);

  const collegeLines = COLLEGES.map((c) => {
    const wired = Boolean(COLLEGE_MODULES[c.key]) && c.runtimeDepthModule;
    return `- ${c.name} — ${c.faculty.length} canonical faculty; Closing Integration: ${
      c.closingIntegration ? "complete" : "missing"
    }; selective runtime depth module: ${wired ? "present" : "absent"}.\n  Faculty: ${c.faculty.join(", ")}.`;
  }).join("\n");

  return `SYSTEM ARCHITECTURE MANIFEST (factual, current, verifiable — this is what is actually wired)

CONSTITUTION
${layerLines(CONSTITUTION_LAYERS)}

CROSS-CUTTING DOCTRINE
${layerLines(CROSS_CUTTING_DOCTRINE)}

ATHENA UNIVERSITY — Canonical Curriculum v1.0 (complete)
Seven colleges, ${facultyTotal} canonical faculty and traditions, all seven Closing Integrations complete, Final Integration complete (docs/education/final-integration.md).
${collegeLines}

UNIVERSITY STANDARDS
${layerLines(UNIVERSITY_STANDARDS)}

DOCTRINE INJECTION CHECK: baseline doctrine blocks (L4, L5, L7, University synthesis) are ${
    doctrineWired ? "present and injected into every runtime prompt" : "MISSING — report this as a defect"
  }.

RUNTIME SURFACES
${layerLines(RUNTIME_SURFACES)}

WHAT THIS MANIFEST IS AND IS NOT
- It describes doctrine, curriculum, and runtime wiring. It contains no member information of any kind.
- Athena University faculty are educational doctrine — canonical figures and traditions in docs/education/. They are NOT members. Discussing them freely is correct and carries no privacy implication.
- Members are real people; their information is protected and is not present in this channel.
- The manifest describes observable system state. It does not describe model internals. You cannot inspect weights, activations, attention, embeddings, or any internal computation of the language model you run on, and you must say so plainly rather than speculate when asked.`;
}

export const FOUNDER_MANIFEST_SUMMARY = {
  colleges: COLLEGES.length,
  faculty: facultyTotal,
  closingIntegrations: COLLEGES.filter((c) => c.closingIntegration).length,
  constitutionLayers: CONSTITUTION_LAYERS.length,
};
