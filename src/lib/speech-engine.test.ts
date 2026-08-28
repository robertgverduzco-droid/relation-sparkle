import { describe, expect, it } from "vitest";
import {
  SPEECH_ENGINE_ISSUER,
  SPEECH_ENGINE_SUBJECT,
  speechEngineSecrets,
  verifySpeechEngineToken,
} from "./speech-engine-auth";
import {
  agentResponseFrame,
  chunkReply,
  isSuperseded,
  parseUserTranscript,
} from "./speech-engine-protocol";

const API_KEY = "sk_test_eleven_key";

function b64url(bytes: Uint8Array | string): string {
  const data = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  let binary = "";
  for (const b of data) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function mint(
  payload: Record<string, unknown>,
  opts: { secretIndex?: number; alg?: string } = {},
): Promise<string> {
  const secrets = await speechEngineSecrets(API_KEY);
  const secret = secrets[opts.secretIndex ?? 0]!;
  const header = b64url(JSON.stringify({ alg: opts.alg ?? "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    secret as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`)),
  );
  return `${header}.${body}.${b64url(sig)}`;
}

const valid = () => ({
  iss: SPEECH_ENGINE_ISSUER,
  sub: SPEECH_ENGINE_SUBJECT,
  exp: Math.floor(Date.now() / 1000) + 300,
});

describe("speech engine token verification", () => {
  it("accepts a token signed with the raw sha-256 digest of the api key", async () => {
    const result = await verifySpeechEngineToken(await mint(valid()), API_KEY);
    expect(result.ok).toBe(true);
  });

  it("accepts the hex-text form of the same hash", async () => {
    const result = await verifySpeechEngineToken(
      await mint(valid(), { secretIndex: 1 }),
      API_KEY,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a token signed with a different key", async () => {
    const result = await verifySpeechEngineToken(await mint(valid()), "another_key");
    expect(result).toMatchObject({ ok: false, reason: "bad-signature" });
  });

  it("rejects a wrong issuer or subject", async () => {
    expect(
      await verifySpeechEngineToken(await mint({ ...valid(), iss: "https://evil.test" }), API_KEY),
    ).toMatchObject({ ok: false, reason: "bad-issuer" });
    expect(
      await verifySpeechEngineToken(await mint({ ...valid(), sub: "someone_else" }), API_KEY),
    ).toMatchObject({ ok: false, reason: "bad-subject" });
  });

  it("rejects expired tokens, non-HS256 algorithms and junk", async () => {
    expect(
      await verifySpeechEngineToken(
        await mint({ ...valid(), exp: Math.floor(Date.now() / 1000) - 600 }),
        API_KEY,
      ),
    ).toMatchObject({ ok: false, reason: "token-expired" });
    expect(await verifySpeechEngineToken(await mint(valid(), { alg: "none" }), API_KEY)).toMatchObject(
      { ok: false, reason: "unsupported-alg" },
    );
    expect(await verifySpeechEngineToken("not-a-token", API_KEY)).toMatchObject({ ok: false });
    expect(await verifySpeechEngineToken(await mint(valid()), null)).toMatchObject({
      ok: false,
      reason: "speech-engine-key-missing",
    });
  });
});

describe("speech engine protocol", () => {
  it("parses a user_transcript with history", () => {
    const turn = parseUserTranscript(
      JSON.stringify({
        type: "user_transcript",
        event_id: 4,
        text: "  I moved to Austin last year.  ",
        conversation_history: [
          { role: "user", content: "hi" },
          { role: "agent", content: "Hello." },
          { role: "system", content: "ignored" },
        ],
      }),
    );
    expect(turn).toEqual({
      eventId: 4,
      text: "I moved to Austin last year.",
      history: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "Hello." },
      ],
    });
  });

  it("ignores non-transcript, empty and malformed frames", () => {
    expect(parseUserTranscript(JSON.stringify({ type: "ping" }))).toBeNull();
    expect(parseUserTranscript("{oops")).toBeNull();
    expect(
      parseUserTranscript(JSON.stringify({ type: "user_transcript", event_id: 1, text: "   " })),
    ).toBeNull();
    expect(parseUserTranscript(JSON.stringify({ type: "user_transcript", text: "hi" }))).toBeNull();
  });

  it("frames agent responses with the originating event id", () => {
    expect(agentResponseFrame(7, "Hello.", false)).toEqual({
      type: "agent_response",
      event_id: 7,
      content: "Hello.",
      is_final: false,
    });
    expect(agentResponseFrame(7, "", true).is_final).toBe(true);
  });

  it("chunks a reply on sentence boundaries", () => {
    const chunks = chunkReply("One thing. Then another thing. And a third.", 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("").replace(/\s+/g, " ").trim()).toBe(
      "One thing. Then another thing. And a third.",
    );
    expect(chunkReply("   ")).toEqual([]);
  });

  it("treats a newer event id as superseding an in-flight turn", () => {
    expect(isSuperseded(3, 4)).toBe(true);
    expect(isSuperseded(4, 4)).toBe(false);
  });
});
