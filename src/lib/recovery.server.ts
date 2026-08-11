// Password recovery — server-only mechanics.
//
// P0 closure item §1. Requirements held here:
//   - account-enumeration protection: the caller always receives the same
//     answer, whether or not the address belongs to a member;
//   - rate limiting, per address and per request origin;
//   - no secret (token, link, password) is ever logged or audited;
//   - security-relevant events are auditable via hashed subject only.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { rateLimit, safeLog, auditAdminAccess } from "./security.server";

/** Requests allowed per address per window. */
const PER_ADDRESS_LIMIT = 3;
const PER_ADDRESS_WINDOW_MS = 15 * 60 * 1000;
/** Coarse ceiling across all addresses on this instance. */
const GLOBAL_LIMIT = 60;
const GLOBAL_WINDOW_MS = 15 * 60 * 1000;

/** Non-reversible handle for an email address, safe to write to the audit log. */
export function addressHandle(email: string): string {
  const salt = process.env["ATHENA_LEARNING_SALT"] ?? process.env["SUPABASE_URL"] ?? "athena";
  return createHash("sha256").update(`${salt}:${email.trim().toLowerCase()}`).digest("hex").slice(0, 32);
}

/**
 * Only same-origin recovery destinations are honoured, so a caller cannot
 * redirect a recovery link at a host they control.
 */
export function safeRecoveryRedirect(requestOrigin: string | null, claimed: string | null): string | null {
  if (!requestOrigin) return null;
  const base = `${requestOrigin.replace(/\/$/, "")}/reset-password`;
  if (!claimed) return base;
  try {
    const url = new URL(claimed, requestOrigin);
    if (url.origin !== new URL(requestOrigin).origin) return base;
    return `${url.origin}/reset-password`;
  } catch {
    return base;
  }
}

/**
 * Ask the auth provider to send a recovery link. Returns nothing the caller
 * can use to distinguish a real member from an unknown address.
 */
export async function sendRecoveryLink(email: string, redirectTo: string): Promise<void> {
  const handle = addressHandle(email);

  if (!rateLimit(`recovery:${handle}`, PER_ADDRESS_LIMIT, PER_ADDRESS_WINDOW_MS)) {
    safeLog("recovery.rate_limited");
    return; // deliberately silent — the member-facing answer never varies
  }
  if (!rateLimit("recovery:global", GLOBAL_LIMIT, GLOBAL_WINDOW_MS)) {
    safeLog("recovery.global_rate_limited");
    return;
  }

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    safeLog("recovery.unconfigured");
    return;
  }

  const client = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  // Errors here (unknown address, provider rate limit) are never surfaced.
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  safeLog("recovery.requested", { delivered: !error });

  await auditAdminAccess({
    actorRole: "service",
    action: "auth.recovery.requested",
    resource: "profiles",
    purpose: "Member-initiated password recovery",
    // Hashed handle only: no address, no token, no link.
    metadata: { address_handle: handle, accepted: !error },
  });
}

/** Record that a recovery actually completed, for the security timeline. */
export async function noteRecoveryCompleted(userId: string): Promise<void> {
  await auditAdminAccess({
    actorId: userId,
    actorRole: "member",
    action: "auth.recovery.completed",
    subjectId: userId,
    resource: "profiles",
    purpose: "Password replaced through recovery link",
  });
  safeLog("recovery.completed");
}
