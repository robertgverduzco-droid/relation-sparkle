// LEGACY SURFACE — RETIRED (audit finding A-04).
//
// This route rendered `interview_sessions`, the pre-Athena "interview"
// transcript table that the continuous-conversation retrofit superseded. It
// was still linked from the profile menu as "Your conversations with Athena",
// which presented a stale or empty legacy record as if it were canonical.
//
// Canonical conversation surface: /athena.
//
// The route path is deliberately retained (rather than deleted) so that any
// existing deep link, bookmark, notification, or cached client lands somewhere
// coherent instead of a 404 — it now redirects to the canonical surface before
// anything legacy can render. The retired component is preserved verbatim for
// historical and rollback reference at:
//   docs/engineering/legacy/conversations-route.legacy.tsx.txt
// The underlying `interview_sessions` rows are NOT deleted by this change;
// retention is governed by docs/security/RETENTION-AND-DELETION.md.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/conversations")({
  beforeLoad: () => {
    throw redirect({ to: "/athena", replace: true });
  },
});
