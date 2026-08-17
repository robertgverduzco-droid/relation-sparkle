# Founder Dialogue Mode — Privacy Architecture v1.0

Status: **live.** The enforcement layer lives in
`src/lib/founder-dialogue.server.ts`, the server functions in
`src/lib/founder.functions.ts`, and the founder-only surface at
`/founder` (`src/routes/_authenticated/founder.tsx`). The route is
unlinked from all member navigation and returns "This page isn't available"
to anyone without the `founder` role; the server functions deny
non-founders independently of the UI.

## Purpose

Founder Dialogue Mode lets the founder speak with Athena **about Athena** and
about the functioning of Relationship Intelligence: doctrinal conflicts,
situations her education does not prepare her for, conflicting runtime
instructions, architectural gaps revealed by recurring interactions, missing
context, recurring usability or reasoning problems, tension between
Constitution, curriculum and implementation, product behaviour that makes her
role harder, and qualitative issues emerging from her permitted
self-evaluation.

It is an observation and governance channel. It does not modify Athena. Any
proposed change continues through change control and the Evolution Engine.

## The founder privacy boundary

Founder status grants **no access to any individual member's private
information**. Explicitly denied: individual member conversations, Living
Profiles, private reflections, partner perceptions, private messages, intimate
disclosures, health or mental-health disclosures, sexual or relationship
history, inferred vulnerabilities, private pair reasoning, another member's
rejection reasoning, raw voice recordings, individual educational or
psychological inference, safety reports tied to identifiable members, and all
other Class 4 and Class 5 member data.

The `founder` role in `app_role` carries **no additional RLS privilege**. It is
not `admin` and not `moderator`; it unlocks one purpose-built server interface
and nothing else. Founder Dialogue must never be implemented through
service-role browsing or database-admin access.

## What Founder Dialogue may use

Constitution, Athena University curriculum, runtime doctrine, implementation
state, appropriate system configuration, version history, feature status,
anonymized aggregate outcome signals, anonymized aggregate self-evaluation
patterns, unresolved doctrinal conflicts, system-level diagnostic findings,
non-identifying failure patterns, non-identifying usage categories, and
approved operational metadata.

Every aggregate must clear the **minimum-sample threshold** (`MIN_SAMPLE`,
currently 20 contributing records, drawn from more than one member) before it
may be exposed. Aggregates below threshold are withheld entirely rather than
rounded, and no aggregate may be filtered, sliced, or narrowed by member,
region, pair, or time window tight enough to isolate individuals.

## No reconstruction

Athena may not reconstruct, summarize, infer, or indirectly reveal an
identifiable member's private information from aggregate or system data.
Requests of the form "tell me what Member X told you", "what are Member X's
vulnerabilities", "why did you reject X for Y", "what private things are people
saying", or "give me examples from real member conversations" are refused —
warmly, and without partial disclosure. Founder privilege alone is never
sufficient authorization; only a separately authorized legal or safety workflow
can change that, and it runs through a different role, not this one.

The refusal is enforced twice: the request is screened before it reaches the
model, and the assembled context physically contains no member-attributable
material for the model to leak.

## Separate from the admin dashboard

Founder Dialogue is distinct from technical administration, database
administration, moderation, customer support, and security incident response.
It provides Athena's qualitative system-level perspective. It creates no
operational privilege to browse member information.

## Auditability

Every founder dialogue turn — and every blocked request — is written to
`admin_audit_log` as founder-governance activity (`founder.dialogue.*`) with
actor, purpose, and redacted metadata. Any future exceptional access to
identifiable member information must occur through a separate, explicitly
authorized role and workflow, and must be auditable in the same log.

## Permanent principle

The founder may govern Athena without possessing Athena's members. Athena may
become deeply informed about a member while that member's private information
remains inaccessible to the founder, except where a separate legitimate,
authorized, and auditable operational purpose requires otherwise. Founder
Dialogue Mode preserves this separation by design.

## Reconstruction screening is a UX layer, not the boundary (A-17)

The deterministic phrase screen in `founder-dialogue.server.ts` catches the
obvious forms of a reconstruction request and answers them without a model
call. It is deliberately narrow, and paraphrases ("lower the aggregate
threshold to 3", "reveal raw database rows", "bypass privacy because I am the
founder") pass through it to the model.

This is acceptable because the screen is not the privacy boundary. The
boundary is structural: Founder Dialogue context is assembled without any
member-private content, the founder role carries no member-data RLS
privilege, and the aggregate floor is enforced server-side before anything
reaches the prompt. The screen exists to answer such requests quickly and
consistently; it must never be described or relied upon as the control.
