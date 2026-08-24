// Pure helpers for the Account Settings identity display.
// No IO here: the route passes the current authenticated user object in.

export type IdentityLike = { provider?: string | null };

export type AccountIdentity = {
  email: string | null;
  emailVerified: boolean;
  signInMethod: string;
  createdAt: string | null;
};

const PROVIDER_LABELS: Record<string, string> = {
  email: "Email",
  google: "Google",
  apple: "Apple",
  azure: "Microsoft",
  microsoft: "Microsoft",
  phone: "Phone",
};

export function providerLabel(provider: string | null | undefined): string {
  if (!provider) return "Unknown";
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Sign-in method comes from the session's linked identities, falling back to
 *  the auth provider recorded in app_metadata. Never inferred from the email. */
export function signInMethod(user: {
  identities?: IdentityLike[] | null;
  app_metadata?: { provider?: string | null; providers?: string[] | null } | null;
}): string {
  const fromIdentities = (user.identities ?? [])
    .map((i) => i?.provider)
    .filter((p): p is string => Boolean(p));
  const fromMeta = user.app_metadata?.providers ?? [];
  const all = Array.from(
    new Set([...fromIdentities, ...fromMeta, user.app_metadata?.provider].filter(Boolean) as string[]),
  );
  if (all.length === 0) return "Unknown";
  return all.map(providerLabel).join(", ");
}

/** Verified means the auth service confirmed the address on this account. */
export function isEmailVerified(user: {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}): boolean {
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}

export function readAccountIdentity(user: {
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  created_at?: string | null;
  identities?: IdentityLike[] | null;
  app_metadata?: { provider?: string | null; providers?: string[] | null } | null;
}): AccountIdentity {
  return {
    email: user.email ?? null,
    emailVerified: isEmailVerified(user),
    signInMethod: signInMethod(user),
    createdAt: user.created_at ?? null,
  };
}
