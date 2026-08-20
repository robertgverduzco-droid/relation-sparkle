// Founder-only surface for synthetic beta personas.
//
// Credentials appear exactly once, in this response, in this browser. They are
// never stored, never logged, and cannot be retrieved later — only re-issued.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  getSyntheticAccess,
  listSyntheticBatchesFn,
  createSyntheticBatchFn,
  reissueSyntheticCredentialsFn,
  resetSyntheticBatchFn,
  deleteSyntheticBatchFn,
} from "@/lib/synthetic.functions";

export const Route = createFileRoute("/_authenticated/beta-accounts")({
  head: () => ({
    meta: [
      { title: "Synthetic Beta Accounts — Relationship Intelligence" },
      {
        name: "description",
        content:
          "Founder-only provisioning of synthetic beta personas for high-volume testing.",
      },
      { property: "og:title", content: "Synthetic Beta Accounts" },
      {
        property: "og:description",
        content: "Founder-only provisioning of synthetic beta personas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BetaAccountsScreen,
});

const SIZES = [10, 25, 50, 100];

type Batch = {
  id: string;
  label: string;
  note: string | null;
  requestedSize: number;
  createdSize: number;
  activeAccounts: number;
  createdAt: string;
  deletedAt: string | null;
};

type Credential = { email: string; password: string; label: string; userId: string };

function credentialsText(rows: Credential[]): string {
  return rows.map((c) => `${c.label}\t${c.email}\t${c.password}`).join("\n");
}

function BetaAccountsScreen() {
  const access = useServerFn(getSyntheticAccess);
  const list = useServerFn(listSyntheticBatchesFn);
  const create = useServerFn(createSyntheticBatchFn);
  const reissue = useServerFn(reissueSyntheticCredentialsFn);
  const reset = useServerFn(resetSyntheticBatchFn);
  const destroy = useServerFn(deleteSyntheticBatchFn);

  const [state, setState] = useState<"checking" | "denied" | "ready">("checking");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [label, setLabel] = useState("Beta personas");
  const [note, setNote] = useState("");
  const [size, setSize] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Credential[] | null>(null);

  const refresh = useCallback(async () => {
    const res = await list({});
    setBatches(res.batches as Batch[]);
  }, [list]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await access({});
        if (!mounted) return;
        if (!a.allowed) {
          setState("denied");
          return;
        }
        await refresh();
        if (mounted) setState("ready");
      } catch {
        if (mounted) setState("denied");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [access, refresh]);

  async function run(key: string, fn: () => Promise<Credential[] | null>) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      const creds = await fn();
      if (creds) setCredentials(creds);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  if (state === "checking") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Checking…</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">This page isn’t available.</p>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background pb-24" data-testid="beta-accounts-screen">
      <header className="border-b border-border/60 px-5 py-4">
        <h1 className="text-base font-medium text-foreground">Synthetic Beta Accounts</h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Fictional members for high-volume testing. They never enter the real matching
          pool, and their credentials grant nothing beyond their own single account.
        </p>
      </header>

      <div className="space-y-8 px-5 py-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void run("create", async () => {
              const res = await create({
                data: { size, label: label.trim(), note: note.trim() || undefined },
              });
              return res.credentials as Credential[];
            });
          }}
        >
          <div>
            <label className="text-xs text-muted-foreground" htmlFor="batch-label">
              Batch name
            </label>
            <input
              id="batch-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              data-testid="synthetic-batch-label"
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground" htmlFor="batch-note">
              Who is this for (optional)
            </label>
            <input
              id="batch-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={400}
              placeholder="e.g. handed to a beta tester for persona work"
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          <fieldset>
            <legend className="text-xs text-muted-foreground">How many</legend>
            <div className="mt-2 flex gap-2">
              {SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSize(n)}
                  data-testid={`synthetic-size-${n}`}
                  aria-pressed={size === n}
                  className={
                    size === n
                      ? "rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                      : "rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground"
                  }
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={busy !== null || label.trim().length === 0}
            data-testid="synthetic-create"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {busy === "create" ? "Creating…" : `Create ${size} accounts`}
          </button>
        </form>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {credentials && (
          <div
            className="rounded-2xl border border-border bg-card p-4"
            data-testid="synthetic-credentials"
          >
            <h2 className="text-sm font-medium text-foreground">
              Credentials — shown once
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              These are not stored anywhere. Copy them now; if they are lost, re-issue the
              batch to generate new ones.
            </p>
            <textarea
              readOnly
              rows={Math.min(12, credentials.length + 1)}
              value={credentialsText(credentials)}
              className="mt-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(credentialsText(credentials))}
                className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setCredentials(null)}
                className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Batches</h2>
          {batches.length === 0 && (
            <p className="text-sm text-muted-foreground">No batches yet.</p>
          )}
          {batches.map((b) => (
            <article
              key={b.id}
              data-testid="synthetic-batch"
              className="rounded-2xl border border-border bg-card p-4"
            >
              <h3 className="text-sm font-medium text-foreground">{b.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {b.activeAccounts} of {b.createdSize} active
                {b.deletedAt ? " · deleted" : ""}
                {b.note ? ` · ${b.note}` : ""}
              </p>
              {!b.deletedAt && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="synthetic-reissue"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(`reissue-${b.id}`, async () => {
                        const res = await reissue({ data: { batchId: b.id } });
                        return res.credentials as Credential[];
                      })
                    }
                    className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40"
                  >
                    Re-issue credentials
                  </button>
                  <button
                    type="button"
                    data-testid="synthetic-reset"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(`reset-${b.id}`, async () => {
                        const res = await reset({ data: { batchId: b.id } });
                        return res.credentials as Credential[];
                      })
                    }
                    className="rounded-xl border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40"
                  >
                    Reset personas
                  </button>
                  <button
                    type="button"
                    data-testid="synthetic-delete"
                    disabled={busy !== null}
                    onClick={() => {
                      if (!window.confirm(`Permanently delete every account in “${b.label}”?`)) {
                        return;
                      }
                      void run(`delete-${b.id}`, async () => {
                        await destroy({
                          data: { batchId: b.id, confirm: "delete this batch" },
                        });
                        return null;
                      });
                    }}
                    className="rounded-xl border border-destructive/50 px-3 py-1.5 text-xs text-destructive disabled:opacity-40"
                  >
                    Delete batch
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
