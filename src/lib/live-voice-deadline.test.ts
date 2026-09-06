import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const ws = readFileSync("src/routes/api/speech-engine/ws.ts", "utf8");
const chat = readFileSync("src/routes/api/eleven-agent-chat.ts", "utf8");
const athena = readFileSync("src/lib/athena.functions.ts", "utf8");
const retrieval = readFileSync("src/lib/education-retrieval.server.ts", "utf8");

/**
 * A live call must never wait forever. The failure that dropped a five-minute
 * call was a reply request that hung with no deadline anywhere in the chain:
 * the member heard silence and assumed the call had died.
 */
describe("live voice turn deadlines", () => {
  it("bounds the model call itself", () => {
    expect(athena).toContain("abortSignal: AbortSignal.timeout(25_000)");
  });

  it("returns a fast, explicit failure instead of hanging the transport", () => {
    expect(chat).toContain("status: 504");
    expect(chat).toContain("[agent-chat] turn failed after");
  });

  it("keeps its own socket deadline and still speaks a line", () => {
    expect(ws).toContain("let timedOut = false");
    expect(ws).toContain("}, 30_000)");
    expect(ws).toContain('speakFallback(turn.eventId, "turn exceeded the 30s deadline")');
    // A deadline abort must not be mistaken for the member barging in.
    expect(ws.indexOf("if (timedOut)")).toBeLessThan(ws.indexOf('=== "AbortError"'));
    expect(ws).toContain("clearTimeout(deadline)");
  });

  it("bounds the education-retrieval embedding call every turn runs ahead of the model", () => {
    // This fetch sat inside every turn's doctrine lookup with no deadline at
    // all -- ahead of the model call's own 25s budget, so a slow embeddings
    // provider silently ate into the turn's total time with nothing to show
    // for it, and could outlast even the socket's outer deadline.
    expect(retrieval).toContain('fetch("https://ai.gateway.lovable.dev/v1/embeddings"');
    expect(retrieval).toContain("signal: AbortSignal.timeout(5_000)");
  });
});
