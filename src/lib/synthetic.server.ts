// Synthetic beta accounts — server-only machinery.
//
// Doctrine (docs/security/SYNTHETIC-BETA-ACCOUNTS.md):
//
//   * Only the Founder may create, reset, or destroy synthetic accounts. The
//     authority comes from the `founder` role in `user_roles`, checked against
//     the verified bearer token — never from anything the caller sends.
//   * A synthetic account is an ordinary member account in every respect the
//     member experience can observe. It is marked `profiles.is_synthetic` so
//     matchmaking keeps it in a pool of its own, permanently separate from real
//     people.
//   * Passwords are generated with a CSPRNG, handed back exactly once in the
//     response to the Founder's own authenticated call, and never written to
//     the database, to logs, or to source. Losing one is recoverable only by
//     re-issuing a new one.
//   * Possession of a synthetic credential grants exactly one thing: sign-in as
//     that single fictional member. It confers no founder, admin, or moderator
//     authority, and no visibility into any other account.
//
// This is deliberately separate from the Beta Invite path for real humans
// joining Athena as themselves; neither system reads or writes the other.

export const SYNTHETIC_EMAIL_DOMAIN = "synthetic.athena-beta.test";
export const SYNTHETIC_BATCH_SIZES = [10, 25, 50, 100] as const;
export const MAX_SYNTHETIC_BATCH = 100;

type Admin = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

export type SyntheticCredential = {
  email: string;
  password: string;
  label: string;
  userId: string;
};

export type SyntheticBatchSummary = {
  id: string;
  label: string;
  note: string | null;
  requestedSize: number;
  createdSize: number;
  activeAccounts: number;
  createdAt: string;
  deletedAt: string | null;
};

/** Founder authority, resolved server-side from the verified user id. */
export async function assertFounder(userId: string): Promise<void> {
  const { isFounder } = await import("./founder-dialogue.server");
  if (!(await isFounder(userId))) {
    // Deliberately indistinguishable from "no such surface".
    throw new Error("Not found");
  }
}

/** A password no human chose and nothing persists. */
export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** Stable, obviously-fictional address that needs no inbox. */
export function syntheticEmail(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `persona-${token}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/** True when an address belongs to the synthetic namespace. */
export function isSyntheticEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

/** Member-owned tables cleared when a persona is reset to a blank slate. */
const PERSONA_TABLES: Array<[table: string, column: string]> = [
  ["user_intelligence", "user_id"],
  ["user_preferences", "user_id"],
  ["user_readiness", "user_id"],
  ["member_readiness", "user_id"],
  ["notifications", "user_id"],
  ["notification_preferences", "user_id"],
  ["user_prompts", "user_id"],
  ["user_photos", "user_id"],
  ["understanding_facets", "user_id"],
  ["facet_history", "user_id"],
  ["understanding_revisions", "user_id"],
  ["topic_map", "user_id"],
  ["interview_sessions", "user_id"],
  ["athena_self_evaluations", "user_id"],
  ["athena_usage_log", "user_id"],
  ["introduction_responses", "user_id"],
  ["introduction_attraction", "user_id"],
  ["introduction_feedback", "user_id"],
  ["member_transitions", "user_id"],
  ["post_meeting_reflections", "user_id"],
  ["reflection_submissions", "user_id"],
  ["member_consents", "user_id"],
];

type LooseAdmin = {
  from: (t: string) => {
    delete: () => { eq: (c: string, v: string) => Promise<unknown> };
  };
};

async function clearPersonaData(admin: Admin, userId: string): Promise<void> {
  const loose = admin as unknown as LooseAdmin;
  for (const [table, column] of PERSONA_TABLES) {
    await loose.from(table).delete().eq(column, userId);
  }
  await admin
    .from("profiles")
    .update({
      display_name: null,
      birth_date: null,
      gender: null,
      pronouns: null,
      city: null,
      region: null,
      country: null,
      location_lat: null,
      location_lng: null,
      bio: null,
      height_cm: null,
      ethnicities: [],
      ethnicity_self_describe: null,
      religions: [],
      religion_self_describe: null,
      smoking: null,
      onboarding_stage: "welcome",
      onboarding_completed_at: null,
      is_paused: false,
      is_synthetic: true,
    })
    .eq("id", userId);
}

/**
 * Create a batch of pre-verified synthetic members.
 * Returns the credentials once; they exist nowhere else.
 */
export async function createSyntheticBatch(args: {
  founderId: string;
  size: number;
  label: string;
  note?: string | null;
}): Promise<{ batchId: string; credentials: SyntheticCredential[]; failed: number }> {
  const size = Math.floor(args.size);
  if (!Number.isFinite(size) || size < 1 || size > MAX_SYNTHETIC_BATCH) {
    throw new Error(`Batch size must be between 1 and ${MAX_SYNTHETIC_BATCH}.`);
  }

  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  const { data: batch, error: batchError } = await admin
    .from("synthetic_batches")
    .insert({
      label: args.label,
      note: args.note ?? null,
      requested_size: size,
      created_by: args.founderId,
    })
    .select("id")
    .single();
  if (batchError || !batch) throw new Error(batchError?.message ?? "Batch could not be created.");
  const batchId = batch.id as string;

  const credentials: SyntheticCredential[] = [];
  let failed = 0;

  for (let i = 0; i < size; i += 1) {
    const email = syntheticEmail();
    const password = generatePassword();
    const label = `${args.label} #${String(i + 1).padStart(3, "0")}`;

    // Pre-verified through the authorized server-side mechanism: no inbox,
    // no confirmation email, no invitation link.
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { synthetic: true, batch_id: batchId, name: label },
    });
    if (error || !created?.user) {
      failed += 1;
      continue;
    }
    const userId = created.user.id;

    // handle_new_user() already created the profile row; mark it synthetic so
    // it can never enter the real matching pool.
    await admin
      .from("profiles")
      .update({ is_synthetic: true, display_name: label })
      .eq("id", userId);

    await admin.from("synthetic_accounts").insert({
      batch_id: batchId,
      user_id: userId,
      email,
      label,
    });

    credentials.push({ email, password, label, userId });
  }

  await admin
    .from("synthetic_batches")
    .update({ created_size: credentials.length })
    .eq("id", batchId);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.founderId,
    actorRole: "admin",
    action: "synthetic.batch.created",
    resource: "profiles",
    purpose: "Founder-authorized synthetic beta persona provisioning",
    // Never the addresses, never the passwords.
    metadata: { batch_id: batchId, requested: size, created: credentials.length, failed },
  });

  return { batchId, credentials, failed };
}

/** Batches and their live account counts. No credentials, ever. */
export async function listSyntheticBatches(): Promise<SyntheticBatchSummary[]> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: batches } = await admin
    .from("synthetic_batches")
    .select("id, label, note, requested_size, created_size, created_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (batches ?? []).map((b) => b.id as string);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: rows } = await admin
      .from("synthetic_accounts")
      .select("batch_id")
      .in("batch_id", ids)
      .is("revoked_at", null);
    for (const r of rows ?? []) {
      const key = r.batch_id as string;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return (batches ?? []).map((b) => ({
    id: b.id as string,
    label: b.label as string,
    note: (b.note as string | null) ?? null,
    requestedSize: Number(b.requested_size ?? 0),
    createdSize: Number(b.created_size ?? 0),
    activeAccounts: counts.get(b.id as string) ?? 0,
    createdAt: b.created_at as string,
    deletedAt: (b.deleted_at as string | null) ?? null,
  }));
}

/**
 * Issue fresh passwords for every live account in a batch. The previous
 * credentials stop working immediately; the new ones are returned once.
 */
export async function reissueBatchCredentials(args: {
  founderId: string;
  batchId: string;
}): Promise<{ credentials: SyntheticCredential[] }> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await admin
    .from("synthetic_accounts")
    .select("user_id, email, label")
    .eq("batch_id", args.batchId)
    .is("revoked_at", null);

  const credentials: SyntheticCredential[] = [];
  for (const row of rows ?? []) {
    const userId = row.user_id as string;
    const password = generatePassword();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) continue;
    await admin
      .from("synthetic_accounts")
      .update({ credential_issued_at: new Date().toISOString() })
      .eq("user_id", userId);
    credentials.push({
      email: row.email as string,
      password,
      label: row.label as string,
      userId,
    });
  }

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.founderId,
    actorRole: "admin",
    action: "synthetic.batch.credentials_reissued",
    resource: "profiles",
    purpose: "Founder-authorized synthetic credential re-issue",
    metadata: { batch_id: args.batchId, count: credentials.length },
  });

  return { credentials };
}

/**
 * Return every persona in the batch to a blank member: all understanding,
 * onboarding state, introductions and reflections cleared, credentials
 * re-issued. The accounts themselves survive.
 */
export async function resetSyntheticBatch(args: {
  founderId: string;
  batchId: string;
}): Promise<{ reset: number; credentials: SyntheticCredential[] }> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await admin
    .from("synthetic_accounts")
    .select("user_id")
    .eq("batch_id", args.batchId)
    .is("revoked_at", null);

  for (const row of rows ?? []) {
    await clearPersonaData(admin, row.user_id as string);
  }

  const { credentials } = await reissueBatchCredentials(args);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.founderId,
    actorRole: "admin",
    action: "synthetic.batch.reset",
    resource: "profiles",
    purpose: "Founder-authorized synthetic persona reset",
    metadata: { batch_id: args.batchId, count: (rows ?? []).length },
  });

  return { reset: (rows ?? []).length, credentials };
}

/**
 * Destroy a batch: every persona goes through the same permanent-deletion
 * machinery a real member's account would, so nothing survives a test run that
 * would not survive a real deletion.
 */
export async function deleteSyntheticBatch(args: {
  founderId: string;
  batchId: string;
}): Promise<{ deleted: number; failed: number }> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await admin
    .from("synthetic_accounts")
    .select("user_id")
    .eq("batch_id", args.batchId)
    .is("revoked_at", null);

  const { purgeMemberAndDeleteAuthUser } = await import("./account.server");
  let deleted = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const userId = row.user_id as string;
    try {
      await purgeMemberAndDeleteAuthUser(userId);
      deleted += 1;
    } catch {
      failed += 1;
    }
    await admin
      .from("synthetic_accounts")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  await admin
    .from("synthetic_batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", args.batchId);

  const { auditAdminAccess } = await import("./security.server");
  await auditAdminAccess({
    actorId: args.founderId,
    actorRole: "admin",
    action: "synthetic.batch.deleted",
    resource: "profiles",
    purpose: "Founder-authorized synthetic batch teardown",
    metadata: { batch_id: args.batchId, deleted, failed },
  });

  return { deleted, failed };
}
