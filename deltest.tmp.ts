import { createClient } from "@supabase/supabase-js";
import { purgeMemberAndDeleteAuthUser } from "./src/lib/account.server";
import { pairToken } from "./src/lib/learning.server";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const rnd = Math.random().toString(36).slice(2, 8);
const emailA = `deltest-a-${rnd}@example.com`;
const emailB = `deltest-b-${rnd}@example.com`;

const { data: ua, error: ea } = await admin.auth.admin.createUser({ email: emailA, password: "Passw0rd!123", email_confirm: true });
const { data: ub, error: eb } = await admin.auth.admin.createUser({ email: emailB, password: "Passw0rd!123", email_confirm: true });
if (ea || eb) throw new Error(String(ea?.message ?? eb?.message));
const A = ua.user!.id, B = ub.user!.id;
console.log("users", A, B);

await admin.from("profiles").upsert([{ id: A, display_name: "A" }, { id: B, display_name: "B" }]);
await admin.from("user_intelligence").upsert({ user_id: A });
await admin.from("user_preferences").upsert({ user_id: A });
await admin.from("user_readiness").upsert({ user_id: A });
await admin.from("understanding_facets").insert({ user_id: A, facet_key: "values", understanding: "x", confidence: 0.5 });
await admin.from("facet_history").insert({ user_id: A, facet_key: "values", confidence: 0.5 });
await admin.from("topic_map").insert({ user_id: A, topic_key: "family" });
await admin.from("interview_sessions").upsert({ user_id: A, messages: [] });
await admin.from("user_prompts").insert({ user_id: A, prompt_key: "p", prompt_text: "t", answer: "a", position: 0 });
await admin.from("user_photos").insert({ user_id: A, storage_path: `${A}/x.jpg`, position: 0 });
await admin.from("athena_usage_log").insert({ user_id: A, kind: "chat" });
await admin.from("athena_self_evaluations").insert({ user_id: A, session_key: "s", turn_count: 1, dimensions: {}, next_conversation_intents: [], self_confidence: 0.5, constitution_version: "1", prompt_version: "1" });

const [low, high] = [A, B].sort();
const { data: pair } = await admin.from("pair_reasoning").insert({ user_low: low, user_high: high, status: "presented", confidence: 0.7, reasoning: "private", presentation_a: "pa", presentation_b: "pb", presented_to_a_at: new Date().toISOString(), presented_to_b_at: new Date().toISOString() }).select("id").single();
await admin.from("introduction_responses").insert([{ pair_id: pair!.id, user_id: A, response: "accepted" }, { pair_id: pair!.id, user_id: B, response: "accepted" }]);
await admin.from("introduction_feedback").insert({ pair_id: pair!.id, user_id: B, kind: "accepted", signals: {} });
const { data: conn } = await admin.from("connections").insert({ pair_id: pair!.id, user_low: low, user_high: high, status: "open" }).select("id").single();
await admin.from("meeting_proposals").insert({ connection_id: conn!.id, proposed_by: B, status: "proposed" });
await admin.from("partner_perception").insert({ connection_id: conn!.id, author_id: B, subject_id: A, warmth: 4 });
await admin.from("post_meeting_reflections").insert({ connection_id: conn!.id, user_id: A, transcript: [] });
await admin.from("reflection_submissions").insert({ connection_id: conn!.id, user_id: A, sequence: 1, feeling_tags: [] });
await admin.from("relationship_focus").insert({ connection_id: conn!.id, user_low: low, user_high: high });
await admin.from("member_transitions").insert({ user_id: A, connection_id: conn!.id });
await admin.from("blocks").insert({ blocker_id: B, blocked_id: A });
const { data: rep } = await admin.from("reports").insert({ reporter_id: B, reported_id: A, category: "other", severity: "low", resolved_by: A }).select("id").single();
await admin.from("safety_flags").insert({ user_id: A, category: "x", severity: "low", detail: {} });
await admin.from("athena_outcome_signals").insert({ pair_token: pairToken(A, B), signal_kind: "introduction_accepted_both", valence: "positive", strength: "weak", is_contradictory: false, learning_version: "0", dedupe_key: "t", occurred_at: new Date().toISOString() });
await admin.storage.from("profile-photos").upload(`${A}/x.jpg`, new Blob(["hi"]), { contentType: "image/jpeg", upsert: true });

const { data: convBefore } = await admin.from("conversations").select("id").or(`user_a.eq.${A},user_b.eq.${A}`);
console.log("seeded. conversations:", convBefore?.length);

const result = await purgeMemberAndDeleteAuthUser(A);
console.log("purge result", JSON.stringify(result));

const checks: Record<string, unknown> = {};
for (const [t, cols] of [["profiles",["id"]],["understanding_facets",["user_id"]],["facet_history",["user_id"]],["topic_map",["user_id"]],["user_prompts",["user_id"]],["user_photos",["user_id"]],["athena_usage_log",["user_id"]],["athena_self_evaluations",["user_id"]],["pair_reasoning",["user_low","user_high"]],["connections",["user_low","user_high"]],["introduction_responses",["user_id"]],["partner_perception",["author_id","subject_id"]],["post_meeting_reflections",["user_id"]],["reflection_submissions",["user_id"]],["relationship_focus",["user_low","user_high"]],["member_transitions",["user_id"]],["blocks",["blocker_id","blocked_id"]],["reports",["reporter_id","reported_id"]],["safety_flags",["user_id"]],["meeting_proposals",["proposed_by"]],["conversations",["user_a","user_b"]],["interview_sessions",["user_id"]],["user_intelligence",["user_id"]],["user_preferences",["user_id"]],["user_readiness",["user_id"]]] as Array<[string,string[]]>) {
  let n = 0;
  for (const c of cols) {
    const { count } = await admin.from(t).select("*", { count: "exact", head: true }).eq(c, A);
    n += count ?? 0;
  }
  if (n > 0) checks[t] = n;
}
const { count: sig } = await admin.from("athena_outcome_signals").select("*", { count: "exact", head: true }).eq("pair_token", pairToken(A, B));
const { data: files } = await admin.storage.from("profile-photos").list(A);
const { data: authA } = await admin.auth.admin.getUserById(A);
const { data: bProfile } = await admin.from("profiles").select("id").eq("id", B).maybeSingle();
const { data: repRow } = await admin.from("reports").select("id, resolved_by").eq("id", rep?.id ?? "").maybeSingle();
console.log("residual rows:", JSON.stringify(checks));
console.log("outcome signals left:", sig, "storage files left:", files?.length, "auth user:", authA?.user?.id ?? null, "B profile intact:", !!bProfile, "report row:", JSON.stringify(repRow));

await admin.auth.admin.deleteUser(B);
