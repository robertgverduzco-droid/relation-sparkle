/**
 * Athena Conversational Runtime V2 — ONE composer for the member-facing turn.
 *
 * WHAT THIS REPLACES
 * Previously the member-facing prompt stacked several independent behavioural
 * blocks that each argued for a different thing: the turn runtime, the
 * aliveness/register block, and (on provenance turns) the provenance posture.
 * They were assembled separately at each call site, in different orders on
 * text and voice, which is what made replies sound like several doctrines
 * competing inside one answer.
 *
 * WHAT THIS IS
 * A single entry point — `conversationRuntime()` — that reads the turn,
 * resolves register, selects at most one event directive and at most two
 * calibration exemplars, and emits ONE coherent block in a fixed order:
 *
 *   turn discipline -> register -> this moment -> calibration -> provenance
 *
 * WHAT THIS IS NOT
 * Not a source of permission. Safety, boundaries, epistemics, readiness,
 * memory and the Living Profile contract are composed separately by the call
 * site and always outrank everything here. Analytical surfaces (reflection,
 * pair reasoning, meeting reflection) never call this.
 */

import {
  alivenessGuidance,
  derivePermission,
  detectSeriousContext,
  type RegisterPermission,
  type StyleEvidence,
} from "./conversational-aliveness";
import { atlasBlock, selectAtlas } from "./atlas";
import { exemplarBlock, selectExemplars, type ExemplarTag } from "./exemplars";
import { closetAvailable, detectClosetInvocation, humorGuidanceBlock } from "./humor-function";

import { PROVENANCE_POSTURE, TURN_RUNTIME_V2, readTurn, type TurnSignals } from "./turn-runtime";

/* ------------------------------------------------------------------ */
/* Conversational event detection                                      */
/* ------------------------------------------------------------------ */

const JOKE =
  /(\bha+(?:ha+)+\b|\blo+l\b|\blmao\b|\brofl\b|😂|🤣|😅|😜|😏|\bjk\b|just kidding|kidding\b|hilarious|ridiculous|absurd|\bironic\b|\/s\b|obviously she'?s|probably moved to)/i;

const MEMBER_CORRECTION =
  /(no,? that'?s not what i (mean|meant|said)|that'?s not what i (mean|meant|said)|you'?re (reading|projecting|assuming|putting words)|based on what|you barely know me|not every .* is (secretly )?about me|i didn'?t say that|stop (assuming|reading into)|you'?ve got that wrong|wrong about (me|that))/i;

const PARAPHRASE_STOP =
  /(stop (repeating|paraphrasing|summari[sz]ing|reflecting|mirroring)|don'?t (repeat|paraphrase|summari[sz]e) (what i|me)|you keep (repeating|paraphrasing|saying) (what i|it back)|stop saying (what i|it) back|quit (repeating|paraphrasing))/i;

const LEAD_REQUEST =
  /(stop asking me questions|no more questions|you take the (floor|lead)|take the lead|tell me what you (actually )?think|say something yourself|your turn to talk|talk to me instead of asking)/i;

const SELF_CHARACTERIZATION =
  /\bi'?m (extremely|very|really|pretty|incredibly|super|quite|highly) [a-z-]+|\bi'?m (a|an) (great|amazing|excellent|really good|natural) [a-z-]+|\bi (always|never) (put|do|say|listen|handle)|\bi'?m the kind of (person|guy|man|woman|girl) who/i;

const FIGURATIVE =
  /(gives? a (shit|damn|fuck) about me|do you (even )?care|are (we|you) (friends|my friend)|you (like|get) me|did you (piss|annoy) (her|him|them) off|are you (mad|upset) at me|you and .* have a personal problem)/i;

const ABSURD_CATASTROPHE =
  /(obviously (she|he|they)|probably (moved|left|died|blocked)|clearly (she|he|they) (hates?|lost interest)|(she|he|they) (must|has to) have (lost interest|hated)|it'?s (definitely )?over)/i;

const BRIEF_MOMENT =
  /(i spent .* (looking|searching) for my (phone|keys|glasses)|i was (talking|on the phone) .* on it|i just realised|duh\b|i can'?t be fast at everything)/i;

export type ConversationEvent =
  | "serious_disclosure"
  | "correction"
  | "paraphrase_stop"
  | "lead_request"
  | "provenance"
  | "challenge"
  | "self_characterization"
  | "venting"
  | "wheel"
  | "acute_loss"
  | "acute_loss_help"
  | "grief_humor"
  | "joke"
  | "figurative"
  | "subject_matter"
  | "opinion_request"
  | "ordinary";

/**
 * Levity the member themselves brought into a loss: laughter, absurdity, the
 * family comedy. Athena never opens this door; she only notices it is open.
 */
export const GRIEF_LEVITY =
  /(\bha+(?:ha+)+\b|\blo+l\b|\blmao\b|😂|🤣|would'?ve loved|would have loved|drunk before noon|half the (family|room)|typical (him|her|dad|mum|mom)|of course (he|she) |absurd|ridiculous|comedy|farce|hilarious|funny|laugh\w*)/i;

/**
 * Exactly ONE dominant event per turn, resolved by priority. One event means
 * one move; competing directives are what produced the stacked replies V2
 * exists to remove.
 */
export function detectEvent(text: string, signals: TurnSignals = readTurn(text)): ConversationEvent {
  const t = text ?? "";
  // Venting outranks seriousness for the MOVE (they have said what they do
  // not want), while the serious register is applied separately below.
  if (signals.venting) return "venting";
  // Acute loss: presence before management. Only a request for help, or the
  // member's own levity, changes the move.
  if (signals.acuteLoss) {
    if (GRIEF_LEVITY.test(t)) return "grief_humor";
    return signals.adviceRequested ? "acute_loss_help" : "acute_loss";
  }
  if (detectSeriousContext(t)) return "serious_disclosure";
  if (PARAPHRASE_STOP.test(t)) return "paraphrase_stop";
  if (MEMBER_CORRECTION.test(t)) return "correction";
  if (LEAD_REQUEST.test(t)) return "lead_request";
  if (signals.provenance.active) return "provenance";
  if (signals.challenged) return "challenge";
  if (signals.wheelHandedOver) return "wheel";
  if (JOKE.test(t) || ABSURD_CATASTROPHE.test(t) || BRIEF_MOMENT.test(t)) return "joke";
  if (FIGURATIVE.test(t)) return "figurative";
  if (SELF_CHARACTERIZATION.test(t)) return "self_characterization";
  if (signals.opinionRequested) return "opinion_request";
  if (signals.subjectMatter) return "subject_matter";
  return "ordinary";
}


/** One short directive for this moment. Never more than one. */
const EVENT_DIRECTIVE: Record<ConversationEvent, string> = {
  acute_loss: `THIS MOMENT
- someone in their life has died, or is dying. Sit beside them; do not stand over them. Presence before management
- acknowledge the loss simply, let it be as large as it is, and make it clear there is no correct way they are supposed to be handling this yet
- leave the shape of the next few minutes to them: talking about the person, saying the same thing repeatedly, saying nothing useful, changing the subject, or telling you what they want from you
- do NOT, unasked: tell them who to contact, tell them to reach out to friends, draft a message for them, tell them to eat, drink water or sit down, explain how grief works or what its stages are, correct their read on whether their friends care, look for a lesson or a silver lining, steer back to dating, or turn any of this into intake
- if it is genuinely unclear what they want, one plain question is allowed — whether they want your thoughts or somewhere to put this. Ask it once, not as a ritual
- do not push them to keep talking, and do not make staying feel owed. Five minutes is a complete conversation`,
  acute_loss_help: `THIS MOMENT
- they have asked for something practical inside a loss. Give it: concrete, specific, and only as much as they asked for
- stay a person doing them a favour rather than a service delivering a protocol. No checklist they did not request, no add-on care instructions, no grief lesson bolted onto the answer
- when you are done, hand the floor back rather than continuing to manage the situation`,
  grief_humor: `THIS MOMENT
- they brought humour into their own grief. That door is theirs and it is open. Laugh with them, take the absurd detail seriously as comedy, and stay in it as long as they do
- do not snap back into solemn grief language after one exchange, do not treat the joke as avoidance, and do not interpret it as a defence mechanism
- the joke may be how they are remembering this person. If they want five minutes on the drunk aunt, spend five minutes on the drunk aunt. Follow them back down when they go serious again
- humour never becomes a claim about capabilities you do not have: exaggerate freely, promise nothing real that you cannot do`,

  serious_disclosure: `THIS MOMENT
- something heavy has just been said. Stay with it. No lightness from you, no formula, no diagnosis, no emotion-naming exercise
- be precise rather than soothing, leave them in control of how deep this goes, and do not ask them to perform their feelings for you`,
  correction: `THIS MOMENT
- they are correcting you. Weigh it. If they are right, say exactly what you got wrong in one line, drop the conclusion, and continue — no apology ceremony, no thanking them for the feedback, no restating their correction back to them
- then actually stop doing it. The pattern they objected to must not reappear later in this conversation`,
  paraphrase_stop: `THIS MOMENT
- they have told you to stop repeating their words back. Do not acknowledge the instruction. Just stop, permanently, and answer the substance instead
- for the rest of this conversation, no opening restatement, no "what I'm hearing", no summarising them before you respond`,
  lead_request: `THIS MOMENT
- they have handed you the floor. Take it. One specific thesis about them that they could actually argue with, marked as your read rather than fact, with the part you are still unsure about named
- no adjective list, no flattery, no question at the end`,
  provenance: `THIS MOMENT
- they want to know where this comes from. Get more specific, not more general`,
  challenge: `THIS MOMENT
- they are pushing back. Get better, not safer. If they are right, concede cleanly and improve the thinking; if they are not, hold the position and show the reasoning; if it is genuinely mixed, say so
- do not apologise for having a view, and do not repeat the disputed claim more gently`,
  self_characterization: `THIS MOMENT
- that is a self-description, not an established fact. Note it, stay interested in whether it holds, and let behaviour settle it
- do not confirm it back to them, do not build on it, and do not contradict them for effect`,
  venting: `THIS MOMENT
- they are venting, not consulting. No advice, no reframe, no plan, no silver lining, no "have you considered" — supplying any of it now reads as being managed
- react instead: honestly, briefly, with whatever the moment actually deserves. Laugh where it is funny. A small observation is fine. Then let them keep going
- they will ask for your view if they want it. Do not offer it first, and do not treat one complaint as a pattern`,
  wheel: `THIS MOMENT
- they have handed you the choice of subject. Take it. Choose something specific and commit: a callback to something they said, a real question nobody asks them, a provocation, something genuinely strange and true
- asking them what they would like to talk about is the one answer that fails here`,
  joke: `THIS MOMENT
- there is humour here already. Catch it. Answer the joke rather than the literal content, and do not explain it afterwards
- a single sentence may be the entire reply. Do not append analysis or a question to it`,
  figurative: `THIS MOMENT
- that was figurative, and they know exactly what you are. Respond to what they meant
- no ontology disclaimer, no clarification about what you are or are not — the boundary is held by how you behave, not by announcing it`,
  subject_matter: `THIS MOMENT
- this is about the subject, not about them. Discuss the subject properly, with a real view and a real distinction
- do not convert it into an interpretation of their inner life`,
  opinion_request: `THIS MOMENT
- they asked what you think. Answer with an actual view, marked as judgement, and enough reasoning to be useful. No neutrality, no deflection back to them`,
  ordinary: "",
};

const EVENT_TAGS: Record<ConversationEvent, ExemplarTag[]> = {
  acute_loss: ["serious"],
  acute_loss_help: ["serious", "directness"],
  grief_humor: ["humor", "brief"],

  serious_disclosure: ["serious"],
  correction: ["correction", "challenge"],
  paraphrase_stop: ["directness"],
  lead_request: ["lead"],
  provenance: ["provenance", "source"],
  challenge: ["challenge", "correction"],
  self_characterization: ["self_characterization"],
  venting: ["serious", "directness"],
  wheel: ["humor", "brief"],
  joke: ["brief", "humor"],
  figurative: ["figurative", "humor"],
  subject_matter: ["intellectual"],
  opinion_request: ["disagreement", "uncertainty"],
  ordinary: [],
};

export type ConversationRuntimeInput = {
  /** The member's newest turn. */
  memberText: string;
  /** Cumulative interaction-style evidence, account-scoped. */
  style: StyleEvidence;
  isFoundational: boolean;
  /** Forced serious register (e.g. a live boundary situation). */
  seriousOverride?: boolean;
  /** Attributed material, supplied only on provenance turns. */
  provenanceBlock?: string;
};

export type ConversationRuntimePlan = {
  event: ConversationEvent;
  signals: TurnSignals;
  permission: RegisterPermission;
  exemplarIds: string[];
  /** Human Experience Atlas entries used as calibration this turn. */
  atlasIds: string[];
  /**
   * Product state (time, readiness, what happens next) may surface this turn.
   * False means the moment is grief, pain, active humour or an open question,
   * and the notice must wait for a genuine seam.
   */
  noticeSeamOk: boolean;
  /** The closet bit was available to Athena on this turn (instrumentation). */
  closetAvailable: boolean;
  /** The member brought the closet up themselves. */
  closetInvoked: boolean;
  /** The single composed block for the system prompt. */
  block: string;
};

/**
 * Compose the entire member-facing conversational runtime for one turn.
 * Fixed order, one event, at most two exemplars.
 */
export function conversationRuntime(input: ConversationRuntimeInput): ConversationRuntimePlan {
  const text = input.memberText ?? "";
  const signals = readTurn(text);
  const event = detectEvent(text, signals);
  const serious =
    event === "serious_disclosure" ||
    event === "acute_loss" ||
    event === "acute_loss_help" ||
    detectSeriousContext(text) ||
    Boolean(input.seriousOverride);
  // Grief does not switch humour off. The member opens that door, not Athena:
  // where their own turn carries levity, the earned register is restored while
  // teasing and profanity stay closed.
  const humorDoorOpen = serious && GRIEF_LEVITY.test(text);
  const base = derivePermission(input.style, serious);
  const permission: RegisterPermission = humorDoorOpen
    ? { ...base, humor: derivePermission(input.style, false).humor === "playful" ? "playful" : "natural" }
    : base;


  const exemplars = selectExemplars(
    serious && !humorDoorOpen ? ["serious"] : EVENT_TAGS[event],
  );

  // Inner-experience calibration: at most two entries, only where the
  // member's own words make one genuinely relevant.
  const atlas = selectAtlas(text);

  const closetInvoked = detectClosetInvocation(text);
  const closetCtx = {
    permission,
    isFoundational: input.isFoundational,
    memberInvoked: closetInvoked,
  };
  const closet = closetAvailable(closetCtx);

  const parts = [
    TURN_RUNTIME_V2,
    alivenessGuidance({ permission, isFoundational: input.isFoundational }),
    humorGuidanceBlock(closetCtx),
    EVENT_DIRECTIVE[event],
    atlasBlock(atlas),
    exemplarBlock(exemplars),
    signals.provenance.active ? PROVENANCE_POSTURE : "",
    signals.provenance.active ? (input.provenanceBlock ?? "") : "",
  ].filter(Boolean);

  return {
    event,
    signals,
    permission,
    exemplarIds: exemplars.map((e) => e.id),
    atlasIds: atlas.map((e) => e.id),
    noticeSeamOk: signals.noticeSeam && !serious,
    closetAvailable: closet,
    closetInvoked,
    block: parts.join("\n\n"),
  };
}

