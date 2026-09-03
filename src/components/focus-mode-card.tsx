import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getFocusState, optIntoFocus, endFocus } from "@/lib/relationship.functions";

type State = {
  eligible: boolean;
  active: boolean;
  i_opted_in: boolean;
  started_at: string | null;
  invite: string;
  waiting: string;
  started_notice: string;
};

/**
 * Relationship Focus Mode — the mutual transition in Athena's role.
 * Doctrine: docs/constitution/cross-cutting/relationship-journey.md
 */
export function FocusModeCard({
  connectionId,
  otherName,
}: {
  connectionId: string;
  otherName: string | null;
}) {
  const read = useServerFn(getFocusState);
  const optIn = useServerFn(optIntoFocus);
  const leave = useServerFn(endFocus);
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await read({ data: { connection_id: connectionId } });
      setState(res as State);
    } catch {
      setState(null);
    }
  }, [read, connectionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!state?.eligible) return null;

  const onOptIn = async () => {
    setBusy(true);
    try {
      await optIn({ data: { connection_id: connectionId } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onEnd = async () => {
    setBusy(true);
    try {
      await leave({ data: { connection_id: connectionId } });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      data-testid="relationship-focus"
      data-focus-state={state.active ? "active" : state.i_opted_in ? "waiting" : "invited"}
      className="rounded-3xl border border-primary/30 bg-card p-6 shadow-sm"
    >
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Relationship Focus
      </p>

      {state.active ? (
        <>
          <h3 className="mt-2 font-display text-xl text-foreground">
            {otherName ? `You and ${otherName}` : "You two"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.started_notice}</p>
          {confirmEnd ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-ink-soft">
                Leaving Relationship Focus closes this connection. Athena will ask each of you what
                you'd like next — there's no wrong answer.
              </p>
              <div className="flex gap-3">
                <button
                  data-testid="relationship-focus-end-confirm"
                  onClick={() => void onEnd()}
                  disabled={busy}
                  className="rounded-full border border-border px-4 py-2 text-sm text-foreground disabled:opacity-60"
                >
                  Yes, leave Focus
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="rounded-full px-4 py-2 text-sm text-muted-foreground"
                >
                  Never mind
                </button>
              </div>
            </div>
          ) : (
            <button
              data-testid="relationship-focus-end"
              onClick={() => setConfirmEnd(true)}
              className="mt-4 text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              Leave Relationship Focus
            </button>
          )}
        </>
      ) : state.i_opted_in ? (
        <>
          <h3 className="mt-2 font-display text-xl text-foreground">Waiting, quietly</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.waiting}</p>
        </>
      ) : (
        <>
          <h3 className="mt-2 font-display text-xl text-foreground">
            {otherName ? `Focus on ${otherName}?` : "Focus on this relationship?"}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.invite}</p>
          <button
            data-testid="relationship-focus-opt-in"
            onClick={() => void onOptIn()}
            disabled={busy}
            className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            Choose Relationship Focus
          </button>
        </>
      )}
    </article>
  );
}
