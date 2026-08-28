// Authentication for inbound ElevenLabs Speech Engine WebSocket connections.
//
// Every connection ElevenLabs opens carries a short-lived JWT in the
// X-Elevenlabs-Speech-Engine-Authorization header. It is HS256, signed with
// the SHA-256 hash of our own ElevenLabs API key — which means only a party
// holding that key (us, and ElevenLabs) can mint one. This module verifies it
// and nothing else; transport lives in the route.

export const SPEECH_ENGINE_AUTH_HEADER = "x-elevenlabs-speech-engine-authorization";
export const SPEECH_ENGINE_ISSUER = "https://api.elevenlabs.io/convai/speech-engine";
export const SPEECH_ENGINE_SUBJECT = "convai_speech_engine_upstream";

export type SpeechEnginePayload = {
  iss?: string;
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  [key: string]: unknown;
};

export type VerifyResult =
  | { ok: true; payload: SpeechEnginePayload }
  | { ok: false; reason: string };

function base64UrlToBytes(value: string): Uint8Array | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

/**
 * Candidate HMAC secrets derived from the API key. The documented secret is
 * "the SHA-256 hash of the API key"; that hash is represented either as raw
 * digest bytes or as its lowercase hex text depending on the signer, so both
 * are accepted rather than guessing wrong and rejecting real traffic.
 */
export async function speechEngineSecrets(apiKey: string): Promise<Uint8Array[]> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(apiKey)),
  );
  return [digest, new TextEncoder().encode(bytesToHex(digest))];
}

async function hmacMatches(
  secret: Uint8Array,
  signingInput: string,
  signature: Uint8Array,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput)),
  );
  return timingSafeEqual(expected, signature);
}

/**
 * Verify a Speech Engine JWT. Returns a reason rather than throwing so the
 * route can close the socket with a specific, loggable cause.
 */
export async function verifySpeechEngineToken(
  token: string | null | undefined,
  apiKey: string | null | undefined,
  now: number = Date.now(),
): Promise<VerifyResult> {
  if (!apiKey) return { ok: false, reason: "speech-engine-key-missing" };
  if (!token) return { ok: false, reason: "token-missing" };

  const parts = token.trim().replace(/^Bearer\s+/i, "").split(".");
  if (parts.length !== 3) return { ok: false, reason: "token-malformed" };
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const headerBytes = base64UrlToBytes(headerB64);
  const payloadBytes = base64UrlToBytes(payloadB64);
  const signature = base64UrlToBytes(signatureB64);
  if (!headerBytes || !payloadBytes || !signature) {
    return { ok: false, reason: "token-malformed" };
  }

  let header: { alg?: string; typ?: string };
  let payload: SpeechEnginePayload;
  try {
    header = JSON.parse(new TextDecoder().decode(headerBytes));
    payload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { ok: false, reason: "token-malformed" };
  }

  if (header.alg !== "HS256") return { ok: false, reason: "unsupported-alg" };
  if (payload.iss !== SPEECH_ENGINE_ISSUER) return { ok: false, reason: "bad-issuer" };
  if (payload.sub !== SPEECH_ENGINE_SUBJECT) return { ok: false, reason: "bad-subject" };

  const nowSeconds = Math.floor(now / 1000);
  if (typeof payload.exp === "number" && nowSeconds > payload.exp + 60) {
    return { ok: false, reason: "token-expired" };
  }
  if (typeof payload.nbf === "number" && nowSeconds + 60 < payload.nbf) {
    return { ok: false, reason: "token-not-yet-valid" };
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  for (const secret of await speechEngineSecrets(apiKey)) {
    if (await hmacMatches(secret, signingInput, signature)) {
      return { ok: true, payload };
    }
  }
  return { ok: false, reason: "bad-signature" };
}
