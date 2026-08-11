// Versioned consent capture — member-facing.
//
// Two surfaces, one component:
//   gate     — blocks entry until required agreements are accepted at their
//              current version (used on first entry and on re-acceptance
//              after a document changes).
//   settings — optional permissions the member may grant or withdraw at any
//              time, without leaving the product.
//
// No universal "I agree": each agreement is its own decision, at its own
// version. Declining an optional permission costs the member nothing.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getConsentStatus, recordConsent, type ConsentStatus } from "@/lib/consent.functions";

export function ConsentPanel({
  mode,
  onSatisfied,
}: {
  mode: "gate" | "settings";
  onSatisfied?: () => void;
}) {
  const statusFn = useServerFn(getConsentStatus);
  const recordFn = useServerFn(recordConsent);

  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    statusFn({})
      .then((s) => {
        const next = s as ConsentStatus;
        setStatus(next);
        setChecked(
          Object.fromEntries(next.optional.map((o) => [o.key, Boolean(o.granted)])),
        );
        if (mode === "gate" && next.outstanding.length === 0) onSatisfied?.();
      })
      .catch(() => undefined);
  }, [statusFn, mode, onSatisfied]);

  useEffect(load, [load]);

  if (!status) return null;
  if (mode === "gate" && status.outstanding.length === 0) return null;

  async function acceptRequired() {
    if (!status) return;
    setBusy(true);
    try {
      await recordFn({
        data: {
          decisions: status.outstanding.map((d) => ({
            key: d.key,
            version: d.version,
            granted: true,
          })),
          source: "signup",
        },
      });
      toast("Thank you.");
      load();
      onSatisfied?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't save.");
    } finally {
      setBusy(false);
    }
  }

  async function setOptional(key: string, version: string, granted: boolean) {
    setChecked((c) => ({ ...c, [key]: granted }));
    try {
      await recordFn({ data: { decisions: [{ key, version, granted }], source: "settings" } });
      toast(granted ? "Noted — thank you." : "Withdrawn. Nothing else changes.");
    } catch {
      setChecked((c) => ({ ...c, [key]: !granted }));
      toast.error("Couldn't record that.");
    }
  }

  const optionalDefs = status.catalogue.filter((c) => !c.required);

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        {mode === "gate" ? "Before we begin" : "Your permissions"}
      </p>

      {mode === "gate" ? (
        <>
          <p className="mt-2 text-xs text-ink-soft">
            Each of these is a separate agreement, at a stated version. Please read them.
          </p>
          <ul className="mt-4 space-y-4">
            {status.outstanding.map((d) => (
              <li key={d.key}>
                <p className="text-[15px] text-foreground">{d.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{d.description}</p>
                {d.documentPath && (
                  <Link
                    to={d.documentPath}
                    className="mt-1 inline-block text-[13px] text-primary"
                  >
                    Read the full text
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <button
            onClick={acceptRequired}
            disabled={busy}
            className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "I've read and accept these"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-ink-soft">
            Yours to change at any time. Declining costs you nothing.
          </p>
          <ul className="mt-4 space-y-4">
            {optionalDefs.map((d) => (
              <li key={d.key} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[15px] text-foreground">{d.title}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                    {d.description}
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={Boolean(checked[d.key])}
                  aria-label={d.title}
                  onClick={() => setOptional(d.key, d.version, !checked[d.key])}
                  className={`mt-1 h-7 w-12 shrink-0 rounded-full border transition-colors ${
                    checked[d.key] ? "border-primary bg-primary/70" : "border-border bg-muted"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-background transition-transform ${
                      checked[d.key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
          {status.outstanding.length > 0 && (
            <p className="mt-4 text-[13px] text-ink-soft">
              Some agreements have been updated and need your acceptance.
            </p>
          )}
        </>
      )}
    </div>
  );
}
