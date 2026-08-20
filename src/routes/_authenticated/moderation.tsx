import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { amIModerator, listOpenReports, resolveReport } from "@/lib/moderation.functions";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ModerationPage,
});

type Report = Awaited<ReturnType<typeof listOpenReports>>["reports"][number];

function ModerationPage() {
  const navigate = useNavigate();
  const check = useServerFn(amIModerator);
  const list = useServerFn(listOpenReports);
  const resolve = useServerFn(resolveReport);
  const [ready, setReady] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  // BR01-06: exactly one denial notice per attempt. Effect re-runs (StrictMode,
  // remount, or a changed server-fn identity) must not repeat it, and sonner
  // dedupes on the shared id even if the route is re-entered.
  const deniedRef = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { moderator } = await check({});
      if (!alive) return;
      if (!moderator) {
        if (!deniedRef.current) {
          deniedRef.current = true;
          toast("You don't have access to moderation.", { id: "moderation-denied" });
        }
        navigate({ to: "/home" });
        return;
      }
      const res = await list({});
      if (!alive) return;
      setReports(res.reports);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [check, list, navigate]);


  async function act(id: string, action: "dismiss" | "suspend" | "ban") {
    if (action === "ban" && !confirm("Permanently delete this account?")) return;
    await resolve({ data: { report_id: id, action } });
    const res = await list({});
    setReports(res.reports);
    toast(action === "dismiss" ? "Report dismissed." : action === "suspend" ? "Account paused." : "Account removed.");
  }

  return (
    <div className="screen-shell safe-top pb-28">
      <header className="px-6 pt-8">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Safety</p>
        <h1 className="mt-2 font-display text-[2rem] text-foreground">Report review</h1>
      </header>
      {!ready ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="px-6 pt-10 text-sm text-muted-foreground">No open reports.</p>
      ) : (
        <ul className="mt-6 space-y-3 px-6">
          {reports.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {r.severity} • {r.category} • {r.status}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-[15px] text-foreground">
                <strong>{r.reporter_name}</strong> reported <strong>{r.reported_name}</strong>
              </p>
              {r.details && <p className="mt-2 text-sm text-ink-soft">{r.details}</p>}
              {r.status === "open" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => void act(r.id, "dismiss")} className="rounded-full border border-border px-3 py-1.5 text-xs">Dismiss</button>
                  <button onClick={() => void act(r.id, "suspend")} className="rounded-full border border-border px-3 py-1.5 text-xs">Pause account</button>
                  <button onClick={() => void act(r.id, "ban")} className="rounded-full bg-destructive px-3 py-1.5 text-xs text-destructive-foreground">Remove</button>
                </div>
              )}
              {r.status !== "open" && r.resolution_note && (
                <p className="mt-2 text-xs text-muted-foreground">Note: {r.resolution_note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      <MobileTabBar current="none" />
    </div>
  );
}
