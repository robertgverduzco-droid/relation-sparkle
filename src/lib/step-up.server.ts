// F-12 Device Safety — step-up reauthentication.
//
// Doctrine: a signed-in device alone must never be sufficient to permanently
// destroy or export a member's intimate account material, or to change the
// credentials that control it. Before any of those actions the member must
// prove possession of the password again, in this moment.
//
// Mechanism: the member re-enters their password; we verify it server-side
// against Supabase Auth using a throwaway publishable-key client (no session
// persisted, so the device's real session is untouched). On success we write a
// short-lived, single-use grant row that the destructive server function
// consumes. Grants are service-role only — the browser never sees or forges one.
import { createClient } from "@supabase/supabase-js";
import { durableRateLimit, safeLog } from "./security.server";

export type StepUpPurpose =
  | "account_deletion"
  | "data_export"
  | "security_change"
  | "sign_out_everywhere";

/** How long a verification stays usable. Deliberately short. */
export const STEP_UP_TTL_MS = 5 * 60 * 1000;

/** Attempts allowed per member per window, to blunt shoulder-surf guessing. */
const ATTEMPT_LIMIT = 5;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Verify the member's password and mint a single-use grant.
 * Returns false for a wrong password, a missing email identity, or too many
 * attempts — the caller must not distinguish these to the member beyond
 * "that password didn't match".
 */
export async function grantStepUp(
  userId: string,
  password: string,
  purpose: StepUpPurpose,
): Promise<{ ok: boolean; reason?: "rate_limited" | "invalid" | "unsupported" }> {
  if (!(await durableRateLimit(`stepup:${userId}`, ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS))) {
    safeLog("stepup.rate_limited", { purpose });
    return { ok: false, reason: "rate_limited" };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = userRes?.user?.email;
  const hasPassword = (userRes?.user?.identities ?? []).some(
    (i) => i.provider === "email",
  );
  if (!email || !hasPassword) {
    // OAuth-only account: no password to re-enter. Callers fall back to the
    // provider-reauthentication path documented in AUTHENTICATION.md.
    return { ok: false, reason: "unsupported" };
  }

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false, reason: "invalid" };

  const probe = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  if (error || data.user?.id !== userId) {
    safeLog("stepup.failed", { purpose });
    return { ok: false, reason: "invalid" };
  }
  // Discard the probe session immediately; it must never become a live device.
  await probe.auth.signOut({ scope: "local" }).catch(() => undefined);

  await supabaseAdmin.from("step_up_grants").insert({
    user_id: userId,
    purpose,
    expires_at: new Date(Date.now() + STEP_UP_TTL_MS).toISOString(),
  });
  safeLog("stepup.granted", { purpose });
  return { ok: true };
}

/**
 * Consume a valid grant for this member and purpose. Throws when there is
 * none — the destructive action must not proceed.
 */
export async function consumeStepUp(
  userId: string,
  purpose: StepUpPurpose,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("step_up_grants")
    .select("id")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("granted_at", { ascending: false })
    .limit(1);
  const grant = data?.[0];
  if (!grant) throw new Error("Please confirm your password before continuing.");
  await supabaseAdmin
    .from("step_up_grants")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", grant.id as string);
}

/** True when a member could be asked for a password (i.e. has one). */
export async function hasPasswordIdentity(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  return (data?.user?.identities ?? []).some((i) => i.provider === "email");
}

/**
 * Revoke every session this member holds anywhere — the remote sign-out
 * a member reaches for when a device is lost or shared.
 */
export async function signOutAllDevices(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.signOut(userId, "global");
  if (error) throw new Error(error.message);
  safeLog("session.global_signout");
}

/** Non-identifying account-security overview shown on the member's own screen. */
export async function accountSecurityOverview(userId: string): Promise<{
  last_sign_in_at: string | null;
  providers: string[];
  has_password: boolean;
  email_confirmed: boolean;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const u = data?.user;
  return {
    last_sign_in_at: u?.last_sign_in_at ?? null,
    providers: (u?.identities ?? []).map((i) => i.provider),
    has_password: (u?.identities ?? []).some((i) => i.provider === "email"),
    email_confirmed: Boolean(u?.email_confirmed_at),
  };
}
