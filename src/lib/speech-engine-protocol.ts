// Wire protocol for the ElevenLabs Speech Engine socket.
//
// Pure parsing and framing only — no network, no Athena logic. The route
// translates these frames into the existing conversation pipeline, so this
// module is the one place the external dialect is understood.

export type SpeechEngineTurn = {
  eventId: number;
  text: string;
  history: { role: "user" | "assistant"; content: string }[];
};

export type AgentResponseFrame = {
  type: "agent_response";
  event_id: number;
  content: string;
  is_final: boolean;
};

function flatten(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : typeof (part as { text?: unknown })?.text === "string"
            ? (part as { text: string }).text
            : "",
      )
      .join(" ");
  }
  return "";
}

function normalizeRole(role: unknown): "user" | "assistant" | null {
  if (role === "user") return "user";
  if (role === "assistant" || role === "agent") return "assistant";
  return null;
}

/**
 * Parse an inbound frame. Returns null for anything that is not a usable
 * user_transcript — pings, unknown types and malformed payloads are ignored
 * rather than treated as errors.
 */
export function parseUserTranscript(raw: unknown): SpeechEngineTurn | null {
  let data: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    data = raw as Record<string, unknown>;
  } else {
    return null;
  }

  if (data["type"] !== "user_transcript") return null;

  const nested = (data["user_transcript"] ?? data["data"] ?? {}) as Record<string, unknown>;
  const pick = (key: string): unknown => data[key] ?? nested[key];

  const rawEventId = pick("event_id");
  const eventId =
    typeof rawEventId === "number"
      ? rawEventId
      : typeof rawEventId === "string" && rawEventId.trim() !== "" && !Number.isNaN(Number(rawEventId))
        ? Number(rawEventId)
        : null;
  if (eventId === null) return null;

  const text = flatten(pick("text") ?? pick("transcript") ?? pick("user_transcript")).trim();
  if (!text) return null;

  const rawHistory = pick("conversation_history") ?? pick("history") ?? pick("messages");
  const history: SpeechEngineTurn["history"] = [];
  if (Array.isArray(rawHistory)) {
    for (const entry of rawHistory) {
      if (!entry || typeof entry !== "object") continue;
      const role = normalizeRole((entry as { role?: unknown }).role);
      if (!role) continue;
      const content = flatten(
        (entry as { content?: unknown; text?: unknown }).content ??
          (entry as { text?: unknown }).text,
      ).trim();
      if (!content) continue;
      history.push({ role, content });
    }
  }

  return { eventId, text, history: history.slice(-60) };
}

export function agentResponseFrame(
  eventId: number,
  content: string,
  isFinal: boolean,
): AgentResponseFrame {
  return { type: "agent_response", event_id: eventId, content, is_final: isFinal };
}

/**
 * Split a reply into speakable chunks. Sentence boundaries first so speech
 * synthesis starts on a natural unit, with a hard cap for runaway sentences.
 */
export function chunkReply(reply: string, maxChars = 220): string[] {
  const text = reply.trim();
  if (!text) return [];
  const sentences = text.match(/[^.!?…\n]+[.!?…]*\s*|\n+/g) ?? [text];
  const chunks: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if (buffer && (buffer + sentence).length > maxChars) {
      chunks.push(buffer);
      buffer = sentence;
    } else {
      buffer += sentence;
    }
  }
  if (buffer.trim()) chunks.push(buffer);
  return chunks.map((c) => c.replace(/\s+$/, " ")).filter((c) => c.trim().length > 0);
}

/** A turn is superseded once a strictly newer event_id has arrived. */
export function isSuperseded(turnEventId: number, latestEventId: number): boolean {
  return latestEventId > turnEventId;
}
