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
  /** Lets the socket renew the member credential mid-call. Optional so an
   * older client cannot fail to start a call — it simply cannot outlive its
   * first access token. */
  refreshToken?: string | null;
}): Promise<void> {
  const admin = supabaseAdmin;
  const expiresAt = new Date(Date.now() + GRANT_TTL_MS).toISOString();
  await admin.from("live_voice_grants").upsert(
    {
      conversation_id: args.conversationId,
      user_id: args.userId,
      access_token: args.accessToken,
      refresh_token: args.refreshToken ?? null,
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

/** Seconds of headroom before expiry at which a credential is already stale:
 * a turn takes several seconds, so "valid right now" is not good enough. */
const RENEW_SKEW_SECONDS = 120;

function accessTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

export type TurnCredential =
  | { ok: true; userId: string; accessToken: string; renewed: boolean }
  | { ok: false; reason: string };

/**
 * The credential for one turn — resolved fresh every time, never cached for
 * the length of a call. A member access token lives roughly an hour; a live
 * conversation can outlast it, and when it lapsed every remaining turn failed
 * silently. Here the stored refresh token mints a new one before that happens
 * and the grant is updated in place.
 */
export async function resolveTurnCredential(conversationId: string): Promise<TurnCredential> {
  if (!conversationId) return { ok: false, reason: "no-conversation-id" };

  const { data, error } = await supabaseAdmin
    .from("live_voice_grants")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) return { ok: false, reason: `grant-lookup-failed: ${error.message}` };
  if (!data) return { ok: false, reason: "grant-not-found" };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await releaseLiveGrant(conversationId);
    return { ok: false, reason: "grant-expired" };
  }

  const exp = accessTokenExpiry(data.access_token);
  const stale = exp === null ? false : exp - RENEW_SKEW_SECONDS <= Math.floor(Date.now() / 1000);
  if (!stale) {
    return { ok: true, userId: data.user_id, accessToken: data.access_token, renewed: false };
  }

  if (!data.refresh_token) return { ok: false, reason: "access-token-expired-no-refresh-token" };

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false, reason: "supabase-env-missing" };

  const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ refresh_token: data.refresh_token }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, reason: `refresh-failed ${res.status}: ${body.slice(0, 200)}` };
  }
  const renewed = (await res.json().catch(() => null)) as
    | { access_token?: unknown; refresh_token?: unknown }
    | null;
  const accessToken = typeof renewed?.access_token === "string" ? renewed.access_token : "";
  if (!accessToken) return { ok: false, reason: "refresh-returned-no-token" };

  await supabaseAdmin
    .from("live_voice_grants")
    .update({
      access_token: accessToken,
      refresh_token:
        typeof renewed?.refresh_token === "string" ? renewed.refresh_token : data.refresh_token,
      refreshed_at: new Date().toISOString(),
    })
    .eq("conversation_id", conversationId);

  return { ok: true, userId: data.user_id, accessToken, renewed: true };
}

/** The call is over; the credential has no reason to exist any longer. */
export async function releaseLiveGrant(conversationId: string): Promise<void> {
  if (!conversationId) return;
  await supabaseAdmin.from("live_voice_grants").delete().eq("conversation_id", conversationId);
}

