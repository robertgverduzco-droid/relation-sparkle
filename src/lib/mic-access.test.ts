import { describe, expect, it } from "vitest";
import {
  acquireMicrophone,
  asksForPermission,
  classifyMicError,
  micFailureMessage,
  readMicPermission,
} from "./mic-access";

const err = (name: string, message = "") => Object.assign(new Error(message), { name });

function nav(opts: {
  permission?: string;
  devices?: Array<{ kind: string }>;
  getUserMedia?: () => Promise<MediaStream>;
}) {
  return {
    permissions: opts.permission
      ? { query: async () => ({ state: opts.permission! }) }
      : undefined,
    mediaDevices: {
      enumerateDevices: async () => opts.devices ?? [{ kind: "audioinput" }],
      getUserMedia: opts.getUserMedia ?? (async () => ({}) as MediaStream),
    },
  };
}

describe("microphone diagnosis", () => {
  it("separates browser denial from OS denial", () => {
    expect(classifyMicError(err("NotAllowedError"), "prompt")).toBe("browser-denied");
    expect(classifyMicError(err("NotAllowedError"), "denied")).toBe("browser-denied");
    expect(
      classifyMicError(err("NotAllowedError", "Permission denied by system"), "prompt"),
    ).toBe("os-denied");
    // Already granted here — so the refusal cannot be the site permission.
    expect(classifyMicError(err("NotAllowedError"), "granted")).toBe("os-denied");
  });

  it("recognises a missing device and a busy device", () => {
    expect(classifyMicError(err("NotFoundError"), "granted")).toBe("no-device");
    expect(classifyMicError(err("NotReadableError"), "granted")).toBe("device-busy");
  });

  it("reports no device when the system lists no audio input", async () => {
    const res = await acquireMicrophone({ audio: true }, nav({ devices: [{ kind: "videoinput" }] }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("no-device");
  });

  it("reports unsupported when the browser cannot capture audio", async () => {
    const res = await acquireMicrophone({ audio: true }, {});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unsupported");
  });

  it("returns the stream when the microphone opens", async () => {
    const res = await acquireMicrophone({ audio: true }, nav({ permission: "granted" }));
    expect(res.ok).toBe(true);
  });

  it("reads a permission state, falling back to unknown", async () => {
    expect(await readMicPermission(nav({ permission: "granted" }))).toBe("granted");
    expect(await readMicPermission(nav({}))).toBe("unknown");
  });

  it("never asks an already-permitted member to enable microphone access", () => {
    expect(asksForPermission(micFailureMessage("init-failed"))).toBe(false);
    expect(asksForPermission(micFailureMessage("device-busy"))).toBe(false);
    expect(asksForPermission(micFailureMessage("no-device"))).toBe(false);
    expect(micFailureMessage("init-failed")).toMatch(/microphone is fine/i);
    expect(micFailureMessage("init-failed", "Custom failure.")).toBe("Custom failure.");
  });

  it("names the layer that refused, and blames no one for it", () => {
    expect(micFailureMessage("browser-denied")).toMatch(/browser is blocking/i);
    expect(micFailureMessage("os-denied")).toMatch(/system setting/i);
    for (const m of [
      micFailureMessage("unsupported"),
      micFailureMessage("no-device"),
      micFailureMessage("init-failed"),
    ]) {
      expect(m).toMatch(/type|connect/i);
    }
  });
});
