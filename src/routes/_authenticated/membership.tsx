import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getMyMembership,
  restoreMembership,
  selectMembershipPlan,
} from "@/lib/membership.functions";
import {
  BILLING_ACTIVE,
  MEMBERSHIP_COPY,
  MEMBERSHIP_PLANS,
  statusLabel,
  type PlanKey,
  type MembershipStatus,
} from "@/lib/membership";
import { AthenaPresence } from "@/components/athena-presence";

export const Route = createFileRoute("/_authenticated/membership")({
  head: () => ({
    meta: [
      { title: "Membership — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MembershipPage,
});

/**
 * Membership selection (§ payment experience). Deliberately not a conversation
 * with Athena: commerce stays outside her voice. Quiet, unhurried, no urgency,
 * no persuasion, no countdown, no comparison table of what you'd "lose".
 */
function MembershipPage() {
  const navigate = useNavigate();
  const read = useServerFn(getMyMembership);
  const select = useServerFn(selectMembershipPlan);
  const restore = useServerFn(restoreMembership);

  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [chosen, setChosen] = useState<PlanKey | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    read()
      .then((e) => {
        setStatus(e.status);
        if (e.planKey === "monthly" || e.planKey === "annual") setChosen(e.planKey);
      })
      .catch(() => setStatus("none"));
  }, [read]);

  async function choose(planKey: PlanKey) {
    setChosen(planKey);
    setBusy(true);
    try {
      const res = await select({ data: { planKey } });
      setStatus(res.entitlement.status);
      if (!res.billingActive) {
        toast("Noted. Membership isn't open yet — nothing has been charged.");
      }
    } catch {
      toast("That didn't go through. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const res = await restore();
      setStatus(res.entitlement.status);
      toast(
        res.restored
          ? "Your membership has been restored."
          : "No existing membership was found for this account.",
      );
    } catch {
      toast("Couldn't check for an existing membership right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen-shell safe-top fade-in-quick pb-16">
      <header className="px-6 pt-10">
        <AthenaPresence state="quiet" />
        <p className="type-section mt-6">{MEMBERSHIP_COPY.title}</p>
        <h1 className="type-page-title mt-3 text-foreground">
          Continuing with Athena.
        </h1>
        <p className="type-body mt-4 text-ink-soft">{MEMBERSHIP_COPY.lede}</p>
      </header>

      <main className="mt-10 px-6">
        <h2 className="sr-only">Membership options</h2>
        <div className="space-y-1">
          {MEMBERSHIP_PLANS.map((plan) => {
            const active = chosen === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                disabled={busy}
                aria-pressed={active}
                onClick={() => void choose(plan.key)}
                className="hairline tap-target block w-full py-6 text-left transition-colors first:border-t-0 hover:bg-surface/40 disabled:opacity-60"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-display text-[1.375rem] leading-snug text-foreground">
                    {plan.cadence}
                  </span>
                  <span className="type-meta text-ink-soft">{plan.priceLabel}</span>
                </div>
                <p className="type-body mt-1.5 text-ink-soft">{plan.description}</p>
                {plan.priceNote ? (
                  <p className="type-meta mt-1 text-muted-foreground">{plan.priceNote}</p>
                ) : null}
                <ul className="mt-3 space-y-1">
                  {plan.inclusions.map((line) => (
                    <li key={line} className="type-meta text-muted-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
                {active ? (
                  <span className="mt-3 inline-block text-sm text-primary">Selected</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {!BILLING_ACTIVE ? (
          <p className="type-meta mt-8 text-muted-foreground">{MEMBERSHIP_COPY.notLiveNotice}</p>
        ) : null}

        <p className="type-meta mt-3 text-muted-foreground">{MEMBERSHIP_COPY.reassurance}</p>
        <p className="type-meta mt-3 text-muted-foreground">{MEMBERSHIP_COPY.cancelNote}</p>

        {status && status !== "none" ? (
          <p className="type-meta mt-6 text-ink-soft">
            Current status: {statusLabel(status)}.
          </p>
        ) : null}

        <div className="mt-10 space-y-4">
          <button
            type="button"
            onClick={() => navigate({ to: "/home" })}
            className="tap-target text-sm text-primary"
          >
            Continue →
          </button>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRestore()}
              className="tap-target text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-60"
            >
              Restore an existing membership
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
