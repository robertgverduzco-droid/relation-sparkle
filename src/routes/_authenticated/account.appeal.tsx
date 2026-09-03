import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getHoldStatus, submitAppeal } from "@/lib/appeals.functions";

export const Route = createFileRoute("/_authenticated/account/appeal")({
  head: () => ({
    meta: [
      { title: "Account hold — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountAppealScreen,
});

type Status = Awaited<ReturnType<typeof getHoldStatus>>;

const CATEGORY_LABEL: Record<string, string> = {
  harassment: "harassment",
  policy_violation: "a policy violation",
};

function categoryLabel(key: string): string {
  return CATEGORY_LABEL[key] ?? key.replace(/_/g, " ");
}

function AccountAppealScreen() {
  const load = useServerFn(getHoldStatus);
  const submit = useServerFn(submitAppeal);

  const [state, setState] = useState<"loading" | "ready">("loading");
  const [status, setStatus] = useState<Status | null>(null);
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await load({});
    setStatus(res);
    setState("ready");
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSubmit() {
    const text = statement.trim();
    if (!text) return;
    setBusy(true);
    try {
      await submit({ data: { statement: text } });
      toast("Sent. Athena's team will review it.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">A moment…</p>
      </section>
    );
  }

  if (!status?.onHold) {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">
          Nothing is on hold on your account right now.
        </p>
      </section>
    );
  }

  const appeal = status.appeal;

  return (
    <section className="min-h-dvh bg-background px-5 py-8">
      <header className="mx-auto max-w-xl">
        <h1 className="text-lg font-medium text-foreground">Your account is on hold</h1>
        <p className="mt-3 text-sm leading-relaxed text-foreground">
          Athena's team looked into a report and found:{" "}
          {status.conductCategory ? categoryLabel(status.conductCategory) : "a concern"}.
        </p>
        {status.behaviorNote && (
          <p className="mt-2 rounded-2xl border border-border/70 bg-card p-4 text-sm leading-relaxed text-foreground">
            {status.behaviorNote}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          This doesn't touch conversations you're already in — it means Athena won't consider new
          introductions for you right now.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-xl">
        {!appeal ? (
          <>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                Tell us what happened, in your own words
              </span>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                rows={6}
                maxLength={2000}
                className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || !statement.trim()}
              className="mt-4 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Sending…" : "Submit appeal"}
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              You can submit one appeal for this hold, so take the space you need.
            </p>
          </>
        ) : appeal.status === "open" ? (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your appeal</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{appeal.statement}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              This is with Athena's team. There's nothing else to do right now — we'll let you know.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/70 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your appeal</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{appeal.statement}</p>
            <p className="mt-4 text-sm text-foreground">
              {appeal.status === "upheld"
                ? "Athena's team reviewed this and the hold stands."
                : `Decision: ${appeal.status}.`}
            </p>
            {appeal.reviewerNote && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {appeal.reviewerNote}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
