// Consent capture — thin wrapper. See ./policy-versions.ts for the catalogue.
//
// Provenance rules (P0 closure item): every row records member, agreement,
// document version, timestamp, source, and grant/withdraw state. No universal
// "I agree" is ever written, and consent categories whose feature does not
// exist are never recorded.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  ACTIVE_CONSENTS,
  REQUIRED_CONSENTS,
  isRecordableConsent,
  type ConsentDefinition,
} from "./policy-versions";

const recordInput = z.object({
  decisions: z
    .array(
      z.object({
        key: z.string().min(1).max(64),
        version: z.string().min(1).max(64),
        granted: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
  source: z.enum(["signup", "reacceptance", "settings"]).default("settings"),
});

export type ConsentStatus = {
  catalogue: ConsentDefinition[];
  /** Accepted at the current version. */
  satisfied: string[];
  /** Required but never accepted, or accepted at an older version. */
  outstanding: ConsentDefinition[];
  /** Optional permissions and their current grant state. */
  optional: Array<{ key: string; granted: boolean | null; version: string }>;
};

/** What this member has agreed to, at which versions, right now. */
export const getConsentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConsentStatus> => {
    const { data, error } = await context.supabase
      .from("member_consents")
      .select("consent_key, version, granted, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Latest row per (key, version) wins; earlier rows are history.
    const latest = new Map<string, { granted: boolean; version: string }>();
    for (const row of data ?? []) {
      const r = row as { consent_key: string; version: string; granted: boolean };
      if (!latest.has(r.consent_key)) latest.set(r.consent_key, { granted: r.granted, version: r.version });
    }

    const satisfied: string[] = [];
    const outstanding: ConsentDefinition[] = [];
    for (const def of REQUIRED_CONSENTS) {
      const held = latest.get(def.key);
      if (held?.granted && held.version === def.version) satisfied.push(def.key);
      else outstanding.push(def);
    }

    const optional = ACTIVE_CONSENTS.filter((c) => !c.required).map((c) => {
      const held = latest.get(c.key);
      return {
        key: c.key,
        granted: held ? held.granted && held.version === c.version : null,
        version: c.version,
      };
    });

    return { catalogue: ACTIVE_CONSENTS, satisfied, outstanding, optional };
  });

/** Record one or more explicit, versioned decisions. Append-only. */
export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => recordInput.parse(v))
  .handler(async ({ data, context }) => {
    const rows = data.decisions
      .filter((d) => isRecordableConsent(d.key, d.version))
      .map((d) => ({
        user_id: context.userId,
        consent_key: d.key,
        version: d.version,
        granted: d.granted,
        source: data.source,
      }));
    if (rows.length === 0) throw new Error("No recordable consent in this request.");

    const { error } = await context.supabase.from("member_consents").insert(rows);
    if (error) throw new Error(error.message);

    // Optional permissions with runtime effects are mirrored where the runtime
    // already reads them, so a withdrawal takes effect immediately.
    const learning = data.decisions.find((d) => d.key === "outcome_learning");
    if (learning) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("profiles")
        .update({ learning_opt_out: !learning.granted })
        .eq("id", context.userId);
    }

    const { auditAdminAccess } = await import("./security.server");
    await auditAdminAccess({
      actorId: context.userId,
      actorRole: "member",
      action: "consent.recorded",
      subjectId: context.userId,
      resource: "member_consents",
      purpose: "Versioned agreement provenance",
      metadata: { keys: rows.map((r) => `${r.consent_key}@${r.version}:${r.granted}`) },
    });

    return { ok: true, recorded: rows.length };
  });
