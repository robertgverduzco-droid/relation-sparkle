// Microphone access diagnosis.
//
// One rule governs this module: Athena never tells a member to enable
// microphone access when microphone access is already granted. When the
// microphone is available and something else fails, she says what actually
// failed instead.

export type MicFailure =
  /** This browser has no microphone capture at all (or a non-secure origin). */
  | "unsupported"
  /** The browser itself is blocking the site — the member can change this. */
  | "browser-denied"
  /** The browser asked and the OS said no — a system setting, not a site one. */
  | "os-denied"
  /** No input device exists (unplugged, or none present). */
  | "no-device"
  /** A device exists but something else holds it, or it failed to open. */
  | "device-busy"
  /** Microphone was granted; the continuous conversation failed to start. */
  | "init-failed"
  | "unknown";

export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

export type MicAcquisition =
  | { ok: true; stream: MediaStream }
  | { ok: false; reason: MicFailure; permission: MicPermission };

type Nav = {
  mediaDevices?: {
    getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>;
    enumerateDevices?: () => Promise<Array<{ kind: string }>>;
  };
  permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> };
};

/** What the browser already knows, before anything is asked of the member. */
export async function readMicPermission(nav?: unknown): Promise<MicPermission> {
  const n = (nav ?? (typeof navigator === "undefined" ? undefined : navigator)) as Nav | undefined;
  try {
    const res = await n?.permissions?.query?.({ name: "microphone" });
    const state = res?.state;
    if (state === "granted" || state === "denied" || state === "prompt") return state;
  } catch {
    /* Safari and Firefox may not expose the microphone permission at all. */
  }
  return "unknown";
}

async function hasAudioInput(n: Nav | undefined): Promise<boolean | null> {
  try {
    const devices = await n?.mediaDevices?.enumerateDevices?.();
    if (!devices) return null;
    return devices.some((d) => d.kind === "audioinput");
  } catch {
    return null;
  }
}

/**
 * Separates an OS-level denial from a browser-level one. Chromium reports the
 * system refusal in the error message; the site permission can still be
 * "granted" in that case, which is exactly the situation this module exists
 * to stop misdiagnosing.
 */
export function classifyMicError(error: unknown, permission: MicPermission): MicFailure {
  const err = error as { name?: string; message?: string } | undefined;
  const name = err?.name ?? "";
  const message = (err?.message ?? "").toLowerCase();
  const systemLevel =
    message.includes("system") ||
    message.includes("operating system") ||
    message.includes("macos") ||
    message.includes("windows settings");

  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "no-device";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return systemLevel ? "os-denied" : "device-busy";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    if (systemLevel || permission === "granted") return "os-denied";
    return "browser-denied";
  }
  if (permission === "denied") return "browser-denied";
  return "unknown";
}

/**
 * Acquires the microphone and, on failure, says precisely which layer refused.
 * A successful acquisition means every later failure is an initialization
 * failure, never a permission problem.
 */
export async function acquireMicrophone(
  constraints: MediaStreamConstraints = { audio: true },
  nav?: unknown,
): Promise<MicAcquisition> {
  const n = (nav ?? (typeof navigator === "undefined" ? undefined : navigator)) as Nav | undefined;
  if (!n?.mediaDevices?.getUserMedia) {
    return { ok: false, reason: "unsupported", permission: "unknown" };
  }

  const permission = await readMicPermission(n);
  if (await hasAudioInput(n) === false) {
    return { ok: false, reason: "no-device", permission };
  }

  try {
    const stream = await n.mediaDevices.getUserMedia(constraints);
    return { ok: true, stream };
  } catch (error) {
    return { ok: false, reason: classifyMicError(error, permission), permission };
  }
}

const MESSAGES: Record<MicFailure, string> = {
  unsupported: "This browser can't use a microphone here. You can type instead — it works exactly the same.",
  "browser-denied":
    "Your browser is blocking the microphone for this site. Allow it in the address-bar permissions, and we can talk.",
  "os-denied":
    "Your device is blocking microphone access for this browser — that's a system setting, not one here. Once it's allowed, we can talk.",
  "no-device":
    "I can't find a microphone on this device. Connect one, or type instead — it works exactly the same.",
  "device-busy":
    "Your microphone is there, but something else is using it right now. Close that, and we can try again.",
  "init-failed":
    "Your microphone is fine — the continuous conversation didn't start. This is on my side, not yours. You can try again, or type.",
  unknown: "Something stopped the microphone from opening. You can try again, or type instead.",
};

export function micFailureMessage(reason: MicFailure, detail?: string): string {
  if (reason === "init-failed" && detail) return detail;
  return MESSAGES[reason];
}

/** True when the message would wrongly ask an already-permitted member to grant access. */
export function asksForPermission(message: string): boolean {
  return /allow it in|permission|enable microphone|microphone access/i.test(message);
}
