// Server-to-server trust for Athena's own internal doors.
//
// The speech socket and the Custom-LLM door both run inside our worker, but
// they talk over ordinary HTTP. A member JWT is the wrong thing to prove that
// call is ours: it belongs to the browser, it ages out mid-conversation, and
// its expiry silenced Athena. This is the separate, server-only signal —
// short-lived, signed with a secret the browser never sees, and naming the
// member the call is being made on behalf of.

const ENCODER = new TextEncoder();

export const INTERNAL_AUTH_HEADER = "x-athena-internal";

/** Deliberately short: this token never leaves one in-flight turn. */
const TTL_SECONDS = 120;

type InternalClaims = { userId: string; conversationId: string; exp: number };

function secret(): string | null {
  return process.env["ATHENA_INTERNAL_SECRET"] ?? null;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function key(rawSecret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    ENCODER.encode(rawSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Mint a signed internal token. Returns null when the signing secret is not
 * configured — callers must treat that as a hard failure, never as a pass.
 */
export async function signInternalToken(args: {
  userId: string;
  conversationId: string;
}): Promise<string | null> {
  const raw = secret();
  if (!raw) return null;
  const claims: InternalClaims = {
    userId: args.userId,
    conversationId: args.conversationId,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payload = base64url(ENCODER.encode(JSON.stringify(claims)));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await key(raw), ENCODER.encode(payload)),
  );
  return `${payload}.${base64url(signature)}`;
}

export type InternalVerdict =
  | { ok: true; claims: InternalClaims }
  | { ok: false; reason: string };

/** Verify an internal token. Every rejection names its reason so a failure is
 * legible in logs rather than collapsing into a bare 401. */
export async function verifyInternalToken(value: string | null): Promise<InternalVerdict> {
  const raw = secret();
  if (!raw) return { ok: false, reason: "internal-secret-missing" };
  if (!value) return { ok: false, reason: "no-internal-token" };

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return { ok: false, reason: "malformed-internal-token" };

  let valid = false;
  try {
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(raw),
      fromBase64url(signature) as unknown as ArrayBuffer,
      ENCODER.encode(payload),
    );
  } catch {
    return { ok: false, reason: "unverifiable-internal-token" };
  }
  if (!valid) return { ok: false, reason: "bad-internal-signature" };

  let claims: InternalClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(fromBase64url(payload))) as InternalClaims;
  } catch {
    return { ok: false, reason: "unreadable-internal-claims" };
  }
  if (!claims.userId) return { ok: false, reason: "internal-token-без-subject" };
  if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) {
    return { ok: false, reason: "internal-token-expired" };
  }
  return { ok: true, claims };
}
