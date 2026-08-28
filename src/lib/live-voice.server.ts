// Live voice — server side of the ElevenLabs Speech Engine handshake.
//
// Topology (this is the part that is easy to get backwards):
//
//   browser  ──WebRTC──▶  ElevenLabs (ears + voice)
//   ElevenLabs ──WebSocket──▶  /api/speech-engine/ws  (Athena's mind)
//
// The browser never talks to Athena's socket, and ElevenLabs opens that
// socket itself. Its `init` frame carries a conversation id and nothing else
// — no member, no token. So the member has to be bound to the conversation id
// *before* the call starts: that is what a grant is.
//
// A grant is deliberately short-lived and service-role-only. It is deleted
// the moment the conversation ends, and expired rows are swept on every mint.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Our registered Speech Engine — the voice layer in front of Athena. */
export const SPEECH_ENGINE_ID = "seng_1301m14txaqpe8mt4qk7etbtf2sj";

const TOKEN_URL = "https://api.elevenlabs.io/v1/convai/conversation/token";

/** A live call is capped well below this; the grant simply must outlive it. */
const GRANT_TTL_MS = 45 * 60_000;

export function elevenApiKey(): string | null {
  return process.env["ELEVENLABS_API_KEY"] ?? process.env["ELEVEN_API_KEY"] ?? null;
}

export type ConversationToken = { token: string; conversationId: string };

/**
 * Mint a single-use WebRTC conversation token for our Speech Engine. The
 * long-lived provider key never leaves the server.
 */
export async function mintConversationToken(apiKey: string): Promise<ConversationToken | null> {
  const res = await fetch(`${TOKEN_URL}?agent_id=${SPEECH_ENGINE_ID}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as
    | { token?: unknown; conversation_id?: unknown }
    | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const conversationId = typeof body?.conversation_id === "string" ? body.conversation_id : "";
  if (!token || !conversationId) return null;
  return { token, conversationId };
}

/** Bind a conversation id to the member who started it. */
export async function recordLiveGrant(args: {
  conversationId: string;
  userId: string;
  accessToken: string;
}): Promise<void> {
  const admin = supabaseAdmin;
  const expiresAt = new Date(Date.now() + GRANT_TTL_MS).toISOString();
  await admin.from("live_voice_grants").upsert(
    {
      conversation_id: args.conversationId,
      user_id: args.userId,
      access_token: args.accessToken,
      expires_at: expiresAt,
    },
    { onConflict: "conversation_id" },
  );
  // Opportunistic sweep: no cron, no accumulation of stale credentials.
  await admin.from("live_voice_grants").delete().lt("expires_at", new Date().toISOString());
}

/** Resolve the member behind a conversation id. Null when unknown or stale. */
export async function resolveLiveGrant(
  conversationId: string,
): Promise<{ userId: string; accessToken: string } | null> {
  if (!conversationId) return null;
  const { data } = await supabaseAdmin
    .from("live_voice_grants")
    .select("user_id, access_token, expires_at")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await releaseLiveGrant(conversationId);
    return null;
  }
  return { userId: data.user_id, accessToken: data.access_token };
}

/** The call is over; the credential has no reason to exist any longer. */
export async function releaseLiveGrant(conversationId: string): Promise<void> {
  if (!conversationId) return;
  await supabaseAdmin.from("live_voice_grants").delete().eq("conversation_id", conversationId);
}
