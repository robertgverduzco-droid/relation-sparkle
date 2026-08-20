# Synthetic Beta Accounts — v1.0

Founder-authorized bulk provisioning of fictional member accounts for
high-volume persona testing. This system is **separate from, and does not
touch, the Beta Invite path** by which real humans join Athena as themselves.

## Principles

1. **Founder authority only.** Creation, re-issue, reset and deletion require
   the `founder` role in `user_roles`, resolved server-side from the verified
   bearer token. Nothing in the request payload can confer authority. A
   non-founder receives "Not found".
2. **A credential buys one account.** Possessing a synthetic password permits
   sign-in as that single fictional member and nothing else — no founder,
   admin or moderator capability, no visibility into any other account.
3. **Pool isolation is permanent.** `profiles.is_synthetic` splits matching
   into two disjoint pools. A synthetic persona can only ever be introduced to
   another synthetic persona; a real member is never shown a fiction.
4. **Ordinary member experience.** After authentication a synthetic account is
   an ordinary member: same arrival, same Athena, same onboarding, same
   Living Profile, same introductions — within its own pool.
5. **Secrets live in one place: the Founder's screen, once.** Passwords are
   generated with a CSPRNG, returned only in the response to the Founder's own
   authenticated call, and never written to the database, to logs, to audit
   metadata, or to source. A lost credential is re-issued, never recovered.

## Shape

- `synthetic_batches` — one row per generated group: label, note, requested and
  created size, creator, deletion timestamp.
- `synthetic_accounts` — one row per persona: batch, auth user, synthetic
  address, label, when credentials were last issued, revocation timestamp.
- Both tables have RLS enabled with **no policies** and **no grant** to `anon`
  or `authenticated`. That deny-by-default posture is intentional; they are
  reached only through the service-role client inside Founder-gated server
  functions, matching the posture already documented for `purge_tombstones`,
  `banned_identifiers` and `step_up_grants` in ACCESS-CONTROL.md.

Addresses take the form `persona-<random>@synthetic.athena-beta.test`. The
domain is unroutable by design: no inbox exists or is required, because each
identity is pre-verified through `email_confirm` at creation.

## Operations

| Action | Effect |
| --- | --- |
| Create batch (10 / 25 / 50 / 100) | New pre-verified accounts, marked synthetic; credentials shown once |
| Re-issue credentials | New passwords for every live account in the batch; previous ones stop working immediately |
| Reset personas | Every persona returns to a blank member — understanding, onboarding state, introductions, reflections, photos and consents cleared — and receives fresh credentials |
| Delete batch | Each account goes through `purgeMemberAndDeleteAuthUser`, the same permanent-deletion machinery a real member's account uses |

Every one of the four writes an `admin_audit_log` entry carrying the batch id
and counts only — never an address, never a secret.

## Handing accounts to a beta tester

The Founder creates a batch, names it for the tester, copies the one-time
credential list from `/beta-accounts`, and transmits it out of band. The tester
signs in to as many personas as they were given and builds fictional members
freely. They receive no invitation links, no elevated role, and no ability to
create, reset or see any other batch.

## Verification

`src/lib/synthetic.test.ts` covers bulk creation and size bounds, unique
pre-verified identities, credential secrecy and re-issue, founder-only
authority on every server function, login isolation (no role elevation),
matching-pool isolation, reset to a blank persona, deletion through the
permanent-deletion path, and the audit trail.
