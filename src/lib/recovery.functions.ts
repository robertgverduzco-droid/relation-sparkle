// Password recovery — thin wrapper. Logic lives in ./recovery.server.ts.
//
// Unauthenticated by design: a member who cannot sign in must be able to
// reach this. Everything abuse-sensitive (rate limiting, enumeration
// protection, redirect validation) is enforced server-side.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const requestInput = z.object({
  email: z.string().trim().email().max(255),
  /** Where the member started from; validated as same-origin server-side. */
  origin: z.string().max(300).optional(),
});

/**
 * Always resolves with the same shape. The caller cannot learn whether the
 * address belongs to a member.
 */
export const requestPasswordRecovery = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => requestInput.parse(v))
  .handler(async ({ data }) => {
    const { safeRecoveryRedirect, sendRecoveryLink } = await import("./recovery.server");
    const headerOrigin = getRequestHeader("origin") ?? getRequestHeader("Origin") ?? null;
    const redirectTo = safeRecoveryRedirect(headerOrigin, data.origin ?? null);
    if (redirectTo) {
      // Never awaited into the response shape: timing must not leak existence.
      await sendRecoveryLink(data.email, redirectTo);
    }
    return {
      ok: true as const,
      message:
        "If that address belongs to an account, a recovery link is on its way. The link expires shortly.",
    };
  });

/**
 * Called after the member successfully replaces their password from a valid
 * recovery link. Requires the recovery session, so it cannot be forged by an
 * anonymous caller.
 */
export const completePasswordRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { noteRecoveryCompleted } = await import("./recovery.server");
    await noteRecoveryCompleted(context.userId);
    return { ok: true as const };
  });
