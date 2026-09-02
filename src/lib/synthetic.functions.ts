// Thin wrapper: module scope holds only imports, types and server-fn
// declarations. Every implementation lives in ./synthetic.server.ts.
//
// Authority never travels in the payload. Each function re-derives the caller
// from the verified bearer token and fails closed unless that account holds
// the `founder` role.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as z from "zod";

export const getSyntheticAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    return { allowed: await isFounder(context.userId) };
  });

export const listSyntheticBatchesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertFounder, listSyntheticBatches } = await import("./synthetic.server");
    await assertFounder(context.userId);
    return { batches: await listSyntheticBatches() };
  });

export const createSyntheticBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        size: z.number().int().min(1).max(100),
        label: z.string().min(1).max(80),
        note: z.string().max(400).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { assertFounder, createSyntheticBatch } = await import("./synthetic.server");
    await assertFounder(context.userId);
    return createSyntheticBatch({
      founderId: context.userId,
      size: data.size,
      label: data.label.trim(),
      note: data.note?.trim() || null,
    });
  });

export const reissueSyntheticCredentialsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ batchId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { assertFounder, reissueBatchCredentials } = await import("./synthetic.server");
    await assertFounder(context.userId);
    return reissueBatchCredentials({ founderId: context.userId, batchId: data.batchId });
  });

export const resetSyntheticBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ batchId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { assertFounder, resetSyntheticBatch } = await import("./synthetic.server");
    await assertFounder(context.userId);
    return resetSyntheticBatch({ founderId: context.userId, batchId: data.batchId });
  });

export const deleteSyntheticBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({ batchId: z.string().uuid(), confirm: z.literal("delete this batch") })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const { assertFounder, deleteSyntheticBatch } = await import("./synthetic.server");
    await assertFounder(context.userId);
    return deleteSyntheticBatch({ founderId: context.userId, batchId: data.batchId });
  });
