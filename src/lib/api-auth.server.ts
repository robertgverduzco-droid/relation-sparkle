// Bearer verification for raw HTTP route handlers (src/routes/api/*).
// createServerFn paths use requireSupabaseAuth; these endpoints receive
// multipart/stream payloads and verify the token themselves.
import { createClient } from "@supabase/supabase-js";

export type ApiCaller = { userId: string };

/**
 * Verify the Supabase access token on an inbound API request.
 * Returns null when the caller is not a valid signed-in member.
 */
export async function verifyApiCaller(request: Request): Promise<ApiCaller | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (token.split(".").length !== 3) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { userId: String(sub) };
}
