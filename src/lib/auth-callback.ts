/**
 * Pure parsing for whatever a Supabase auth email link hands back.
 *
 * Why this is device-dependent in the wild:
 * Supabase's confirmation link is a one-time GET on `/auth/v1/verify` that
 * consumes the token and 303s to our callback with the session in the URL
 * *fragment* (implicit flow — this project's client uses the default). Any
 * first GET consumes it: desktop mail clients, corporate link scanners and
 * browser prefetch all issue one before the member ever clicks. iPhone Mail
 * generally does not. So the same fresh link succeeds on a phone and comes
 * back to a laptop as `#error=access_denied&error_code=otp_expired` — even
 * though the address was in fact confirmed by that first GET.
 *
 * Verified against the live project: a first GET returns `#access_token=…`,
 * a second GET of the same link returns `#error=access_denied&
 * error_code=otp_expired`.
 *
 * So `consumed` is a distinct outcome from `error`: the member is almost
 * certainly verified and simply needs to sign in, and must never be told the
 * link was invalid.
 */

export type OtpType = "signup" | "magiclink" | "recovery" | "invite" | "email_change" | "email";

export type CallbackLink =
  | { kind: "session"; accessToken: string; refreshToken: string }
  | { kind: "token_hash"; tokenHash: string; type: OtpType }
  | { kind: "code"; code: string }
  | { kind: "consumed"; detail: string }
  | { kind: "error"; detail: string }
  | { kind: "none" };

const OTP_TYPES = new Set<string>([
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
  "email",
]);

function tidy(value: string): string {
  return value.replace(/\+/g, " ").trim();
}

/**
 * A link whose token has already been spent — by a scanner, a prefetch, or a
 * second click. The address is confirmed; only this browser lacks a session.
 */
function isAlreadyConsumed(error: string | null, code: string | null, detail: string): boolean {
  if (code === "otp_expired" || code === "validation_failed") return true;
  if (error === "access_denied") return true;
  return /invalid or has expired|already been used|expired/i.test(detail);
}

/** Read every link shape Supabase can produce, from the query *and* the hash. */
export function readCallbackLink(href: string): CallbackLink {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: "none" };
  }
  const q = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const pick = (name: string) => q.get(name) ?? hash.get(name);

  // A live session in the fragment is the success path of the implicit flow.
  // Handle it explicitly rather than trusting `detectSessionInUrl` timing.
  const accessToken = hash.get("access_token") ?? q.get("access_token");
  const refreshToken = hash.get("refresh_token") ?? q.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "session", accessToken, refreshToken };
  }

  const error = pick("error");
  const errorCode = pick("error_code");
  const description = pick("error_description");
  if (error || errorCode || description) {
    const detail = tidy(description ?? error ?? errorCode ?? "This link is no longer valid.");
    return isAlreadyConsumed(error, errorCode, detail)
      ? { kind: "consumed", detail }
      : { kind: "error", detail };
  }

  // token_hash + verifyOtp is the device-independent path: no PKCE verifier,
  // no same-browser requirement.
  const tokenHash = pick("token_hash") ?? pick("token");
  if (tokenHash) {
    const raw = pick("type") ?? "signup";
    const type = (OTP_TYPES.has(raw) ? raw : "signup") as OtpType;
    return { kind: "token_hash", tokenHash, type };
  }

  const code = pick("code");
  if (code) return { kind: "code", code };

  return { kind: "none" };
}

/**
 * A PKCE code can only be exchanged in the browser that started sign-up,
 * because the verifier lives in that browser's storage. Opening the link on
 * another device is normal, not an error — the address is still confirmed.
 */
export function isMissingVerifier(message: string): boolean {
  return /code verifier|code_verifier|invalid request.*code|both auth code and code verifier/i.test(
    message,
  );
}

/** Where the member goes next, given the outcome. */
export function destinationFor(
  outcome: "verified" | "consumed" | "confirmed_elsewhere" | "error",
  detail?: string,
): string {
  switch (outcome) {
    case "verified":
      return "/home";
    case "consumed":
    case "confirmed_elsewhere":
      return "/auth?mode=signin#confirmed=1";
    case "error":
      return `/auth#error_description=${encodeURIComponent(detail ?? "This link is no longer valid.")}`;
  }
}

/**
 * True when a URL carries anything an auth email link can deliver.
 *
 * Needed because Supabase does not always land the member on the route we
 * asked for: when a redirect target is not on the project's allow-list it
 * falls back to the site root, so a confirmation can arrive at "/" with the
 * session — or the error — in the fragment. Whatever route receives it must
 * hand it to /auth-callback rather than render a marketing page over it.
 */
export function hasAuthLinkParams(href: string): boolean {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return false;
  }
  if (url.pathname === "/auth-callback") return false;
  const names = [
    "access_token",
    "refresh_token",
    "token_hash",
    "token",
    "code",
    "error",
    "error_code",
    "error_description",
  ];
  const inQuery = names.some((n) => url.searchParams.has(n));
  const inHash = new RegExp(`(^|[#&])(${names.join("|")})=`).test(url.hash);
  return inQuery || inHash;
}
