// Thin wrapper. All moderation logic lives in ./moderation.server.ts.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isModerator,
  listReports,
  reinstateAccount,
  reinstateInput,
  resolveInput,
  resolveReportForModerator,
} from "./moderation.server";

export const amIModerator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({
    moderator: await isModerator(context.supabase, context.userId),
  }));

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listReports(context.supabase, context.userId));

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => resolveInput.parse(v))
  .handler(async ({ data, context }) =>
    resolveReportForModerator(context.supabase, context.userId, data),
  );

export const reinstateModeratedAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => reinstateInput.parse(v))
  .handler(async ({ data, context }) => reinstateAccount(context.supabase, context.userId, data));
