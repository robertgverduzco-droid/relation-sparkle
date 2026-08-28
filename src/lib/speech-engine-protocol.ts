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
 *
 * The documented ElevenLabs shape carries the whole conversation in
 * `user_transcript` as an array of { role, content }, with the newest user
 * turn last and `event_id` alongside it. Older/flat variants (a `text` field
 * plus a separate history array) are still accepted so a dialect change on
 * their side cannot silence Athena again.
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

  const transcript = data["user_transcript"];
  const nested =
    transcript && typeof transcript === "object" && !Array.isArray(transcript)
      ? (transcript as Record<string, unknown>)
      : ((data["data"] ?? {}) as Record<string, unknown>);
  const pick = (key: string): unknown => data[key] ?? nested[key];

  const rawEventId = pick("event_id");
  const eventId =
    typeof rawEventId === "number"
      ? rawEventId
      : typeof rawEventId === "string" && rawEventId.trim() !== "" && !Number.isNaN(Number(rawEventId))
        ? Number(rawEventId)
        : null;

  // Canonical shape: the transcript itself is the full conversation.
  const rawHistory = Array.isArray(transcript)
    ? transcript
    : (pick("conversation_history") ?? pick("history") ?? pick("messages"));

  const turns: SpeechEngineTurn["history"] = [];
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
      turns.push({ role, content });
    }
  }

  let text = flatten(pick("text") ?? pick("transcript")).trim();
  let history = turns;
  if (!text && Array.isArray(transcript)) {
    // The latest user turn is the thing being answered; everything before it
    // is context.
    const lastUser = [...turns].reverse().findIndex((t) => t.role === "user");
    if (lastUser === -1) return null;
    const index = turns.length - 1 - lastUser;
    text = turns[index]!.content;
    history = turns.slice(0, index);
  }
  if (!text) return null;
  if (eventId === null && !Array.isArray(transcript)) return null;

  return { eventId: eventId ?? 0, text, history: history.slice(-60) };
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
