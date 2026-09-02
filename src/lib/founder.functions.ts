// Thin wrapper: module scope holds only imports, types, and server-fn
// declarations. All logic lives in ./founder-dialogue.server.ts.
//
// Founder authority NEVER comes from conversational text. It comes from the
// authenticated bearer token plus the `founder` role in user_roles, checked
// server-side on every call. These functions fail closed.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, type ModelMessage } from "ai";
import * as z from "zod";

export const getFounderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder } = await import("./founder-dialogue.server");
    return { isFounder: await isFounder(context.userId) };
  });

export const getFounderHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isFounder, loadFounderHistory } = await import("./founder-dialogue.server");
    if (!(await isFounder(context.userId))) throw new Error("Not found");
    return { turns: await loadFounderHistory(context.userId) };
  });

export const sendFounderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z.object({ message: z.string().min(1).max(6000) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    const {
      isFounder,
      screenFounderRequest,
      founderSystemPrompt,
      loadFounderHistory,
      recordFounderTurn,
      auditFounderDialogue,
    } = await import("./founder-dialogue.server");

    if (!(await isFounder(context.userId))) throw new Error("Not found");

    const question = data.message.trim();
    const screening = screenFounderRequest(question);

    if (!screening.allowed) {
      await recordFounderTurn(context.userId, "founder", question, true);
      await recordFounderTurn(context.userId, "athena", screening.response, true);
      await auditFounderDialogue(context.userId, "blocked", {
        reason: screening.reason,
        length: question.length,
      });
      return { reply: screening.response, blocked: true };
    }

    const { createLovableGateway } = await import("./ai-gateway.server");
    const gateway = createLovableGateway();
    const { asMemberData } = await import("./security.server");

    const history = await loadFounderHistory(context.userId);
    const messages: ModelMessage[] = [
      ...history.map((t) => ({
        role: (t.role === "founder" ? "user" : "assistant") as "user" | "assistant",
        content: t.content,
      })),
      { role: "user" as const, content: asMemberData(question) },
    ];

    const { text } = await generateText({
      model: gateway("openai/gpt-5.5"),
      system: await founderSystemPrompt(),
      messages,
      providerOptions: { lovable: { reasoningEffort: "none" } },
    });

    const reply = text.trim();
    await recordFounderTurn(context.userId, "founder", question);
    await recordFounderTurn(context.userId, "athena", reply);
    await auditFounderDialogue(context.userId, "allowed", { length: question.length });

    return { reply, blocked: false };
  });
