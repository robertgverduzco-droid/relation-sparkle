// Continuous voice runtime regression suite.
//
// The failure this suite exists to prevent: the browser could not reach the
// realtime provider at all (blocked by our own Content-Security-Policy), and
// every such failure surfaced to the member as one generic sentence.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { AthenaLiveSession, type LiveStatus, type LiveTurn } from "./athena-live";

const startSession = vi.fn(async () => ({
  endSession: async () => {},
  sendContextualUpdate: () => {},
}));
vi.mock("@elevenlabs/client", () => ({
  Conversation: { startSession: (opts: unknown) => startSession(opts as never) },
}));
import {
  asksForPermission,
  classifySessionStatus,
  classifyThrown,
  liveFailureMessage,
  webrtcSupported,
} from "./live-failures";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("transport reachability", () => {
  it("allows the browser to reach the realtime provider", () => {
    const server = read("src/server.ts");
    const csp = server.split("\n").find((l) => l.includes("connect-src")) ?? "";
    expect(csp).toContain("https://api.elevenlabs.io");
    expect(csp).toContain("wss://*.livekit.cloud");
  });

  it("keeps the policy narrow — no wildcard connect-src", () => {
    expect(read("src/server.ts")).not.toMatch(/connect-src[^`]*\*\s/);
  });

  it("never ships a provider key to the browser", () => {
    expect(read("src/lib/athena-live.ts")).not.toMatch(/ELEVEN_?LABS?_API_KEY|xi-api-key/);
    expect(read("src/lib/athena-live.ts")).toContain("conversationToken");
  });
});

describe("failure vocabulary", () => {
  it("distinguishes every runtime layer", () => {
    expect(classifySessionStatus(401)).toBe("auth-failed");
    expect(classifySessionStatus(429)).toBe("rate-limited");
    expect(classifySessionStatus(503)).toBe("session-failed");
    expect(classifySessionStatus(500)).toBe("provider-unavailable");
    expect(classifyThrown(new TypeError("Failed to fetch"))).toBe("network-failed");
    expect(classifyThrown(new Error("ICE gathering failed"))).toBe("connection-failed");
  });

  it("never asks an already-permitted member to enable microphone access", () => {
    for (const reason of [
      "auth-failed",
      "session-failed",
      "provider-unavailable",
      "rate-limited",
      "quota-exhausted",
      "connection-failed",
      "network-failed",
      "disconnected",
    ] as const) {
      const message = liveFailureMessage(reason);
      expect(asksForPermission(message)).toBe(false);
      expect(message).toMatch(/microphone is fine|conversation dropped/);
    }
  });

  it("detects a browser with no WebRTC", () => {
    expect(webrtcSupported({})).toBe(false);
    expect(webrtcSupported({ RTCPeerConnection: function () {} })).toBe(true);
  });
});

// ---- Session lifecycle ----

type Harness = {
  statuses: LiveStatus[];
  turns: LiveTurn[];
  errors: string[];
  session: AthenaLiveSession;
};

function harness(): Harness {
  const statuses: LiveStatus[] = [];
  const turns: LiveTurn[] = [];
  const errors: string[] = [];
  const session = new AthenaLiveSession({
    onStatus: (s) => statuses.push(s),
    onTurn: (t) => turns.push(t),
    onPartial: () => {},
    onError: (m) => errors.push(m),
  });
  return { statuses, turns, errors, session };
}

const stopped: boolean[] = [];

function fakeMic(ok: boolean, name = "NotAllowedError") {
  return {
    mediaDevices: {
      enumerateDevices: async () => [{ kind: "audioinput" }],
      getUserMedia: async () => {
        if (!ok) throw Object.assign(new Error("denied"), { name });
        return { getTracks: () => [{ stop: () => stopped.push(true) }] } as unknown as MediaStream;
      },
    },
    permissions: { query: async () => ({ state: ok ? "granted" : "denied" }) },
  };
}

beforeEach(() => {
  stopped.length = 0;
  const FakeRTC = class {
    connectionState = "new";
    onconnectionstatechange: (() => void) | null = null;
    ontrack: ((e: unknown) => void) | null = null;
    addTrack() {}
    createDataChannel() {
      return { readyState: "connecting", close() {}, send() {} };
    }
    async createOffer() {
      return { type: "offer", sdp: "v=0" };
    }
    async setLocalDescription() {}
    async setRemoteDescription() {}
    close() {}
  };
  (globalThis as Record<string, unknown>).RTCPeerConnection = FakeRTC;
  vi.stubGlobal("window", { RTCPeerConnection: FakeRTC });
  (globalThis as Record<string, unknown>).document = {
    createElement: () => ({ autoplay: false, srcObject: null }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as Record<string, unknown>).RTCPeerConnection;
  delete (globalThis as Record<string, unknown>).document;
});

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    calls.push(String(input));
    return handler(String(input));
  });
  return calls;
}

describe("session initialization", () => {
  it("opens successfully end to end", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    mockFetch((url) =>
      url.includes("/api/realtime-session")
        ? Response.json({ conversationToken: "tok_test", conversationId: "conv_test" })
        : new Response("v=0\r\n", { status: 200 }),
    );
    const h = harness();
    await h.session.start({ Authorization: "Bearer t" });
    expect(h.errors).toEqual([]);
    expect(h.statuses[0]).toBe("connecting");
  });

  it("reports a provider/session failure, never a permission failure, when the mic is granted", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    mockFetch((url) =>
      url.includes("/api/realtime-session")
        ? new Response("Live conversation is unavailable right now", { status: 502 })
        : new Response(null, { status: 204 }),
    );
    const h = harness();
    await h.session.start({});
    expect(h.errors).toHaveLength(1);
    expect(asksForPermission(h.errors[0])).toBe(false);
    expect(h.errors[0]).toContain("microphone is fine");
    expect(h.statuses.at(-1)).toBe("error");
  });

  it("preserves the real technical cause server-side", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    const calls = mockFetch((url) =>
      url.includes("/api/realtime-session")
        ? new Response("nope", { status: 500 })
        : new Response(null, { status: 204 }),
    );
    await harness().session.start({});
    expect(calls.some((c) => c.includes("/api/live-diagnostic"))).toBe(true);
  });

  it("reports a network failure when the request never lands", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    vi.stubGlobal("fetch", async (input: string) => {
      if (String(input).includes("/api/live-diagnostic")) return new Response(null, { status: 204 });
      throw new TypeError("Failed to fetch");
    });
    const h = harness();
    await h.session.start({});
    expect(h.errors[0]).toContain("couldn't reach");
  });

  it("still reports a denied microphone as a permission problem", async () => {
    vi.stubGlobal("navigator", fakeMic(false));
    mockFetch(() => new Response(null, { status: 204 }));
    const h = harness();
    await h.session.start({});
    expect(asksForPermission(h.errors[0])).toBe(true);
  });

  it("reports a missing device plainly", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        enumerateDevices: async () => [],
        getUserMedia: async () => ({ getTracks: () => [] }),
      },
    });
    mockFetch(() => new Response(null, { status: 204 }));
    const h = harness();
    await h.session.start({});
    expect(h.errors[0]).toContain("can't find a microphone");
  });

  it("refuses to open a second session from the same instance", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    const calls = mockFetch((url) =>
      url.includes("/api/realtime-session")
        ? Response.json({ conversationToken: "tok_test", conversationId: "conv_test" })
        : new Response("v=0", { status: 200 }),
    );
    const h = harness();
    await h.session.start({});
    await h.session.start({});
    expect(calls.filter((c) => c.includes("/api/realtime-session"))).toHaveLength(1);
  });

  it("releases the microphone when the conversation ends", async () => {
    vi.stubGlobal("navigator", fakeMic(true));
    mockFetch((url) =>
      url.includes("/api/realtime-session")
        ? Response.json({ conversationToken: "tok_test", conversationId: "conv_test" })
        : new Response("v=0", { status: 200 }),
    );
    const h = harness();
    await h.session.start({});
    h.session.stop();
    expect(stopped.length).toBeGreaterThan(0);
    expect(h.statuses.at(-1)).toBe("ended");
  });

  it("declines cleanly on a browser without WebRTC", async () => {
    delete (globalThis as Record<string, unknown>).RTCPeerConnection;
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", fakeMic(true));
    mockFetch(() => new Response(null, { status: 204 }));
    const h = harness();
    await h.session.start({});
    expect(h.errors[0]).toContain("can't hold a live conversation");
  });
});

describe("turn handling and continuity", () => {
  it("never submits an empty transcript as a turn", () => {
    const source = read("src/lib/athena-live.ts");
    expect(source).toContain('const text = (message ?? "").trim();');
    expect(source).toContain("if (!text) return;");
  });

  it("keeps barge-in handling on the reasoning socket", () => {
    const ws = read("src/routes/api/speech-engine/ws.ts");
    expect(ws).toContain("inFlight.abort()");
    expect(ws).toContain("latestEventId");
  });

  it("binds a live call to the member who started it", () => {
    const session = read("src/routes/api/realtime-session.ts");
    expect(session).toContain("recordLiveGrant");
    expect(read("src/routes/api/speech-engine/ws.ts")).toContain("resolveLiveGrant");
  });

  it("keeps text mode and spoken fallback intact", () => {
    const page = read("src/routes/_authenticated/athena.tsx");
    expect(page).toContain("stopSpeaking()");
    expect(page).toContain("AthenaLiveSession");
  });
});
