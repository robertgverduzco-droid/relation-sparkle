import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  askAthenaReflection,
  distillReflection,
  getConnection,
  proposeMeeting,
  updateMeetingProposal,
  submitPartnerPerception,
  getMyPartnerPerception,
} from "@/lib/connections.functions";
import { reportUser } from "@/lib/messaging.functions";
import { ReflectionFlow } from "@/components/reflection-flow";
import { FocusModeCard } from "@/components/focus-mode-card";
import { ReportSheet, type ReportCategory } from "@/components/report-sheet";


export const Route = createFileRoute("/_authenticated/connections/$id")({
  head: () => ({
    meta: [
      { title: "Connection — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ConnectionDetail,
});

type Msg = { role: "user" | "assistant"; content: string };

type Data = Awaited<ReturnType<typeof getConnection>>;

function ConnectionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const get = useServerFn(getConnection);
  const propose = useServerFn(proposeMeeting);
  const updateProp = useServerFn(updateMeetingProposal);
  const askReflect = useServerFn(askAthenaReflection);
  const distill = useServerFn(distillReflection);
  const submitPerception = useServerFn(submitPartnerPerception);
  const getPerception = useServerFn(getMyPartnerPerception);
  const report = useServerFn(reportUser);
  const [reportOpen, setReportOpen] = useState(false);

  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<"plan" | "reflect">("plan");
  const [showForm, setShowForm] = useState(false);
  const [whenText, setWhenText] = useState("");
  const [whereText, setWhereText] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [perc, setPerc] = useState<{
    warmth: number | null;
    honesty: number | null;
    safety: number | null;
    chemistry: number | null;
    would_meet_again: boolean | null;
    concerns: string;
  }>({ warmth: null, honesty: null, safety: null, chemistry: null, would_meet_again: null, concerns: "" });
  const [percSaved, setPercSaved] = useState(false);
  const [percSaving, setPercSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await get({ data: { connection_id: id } });
      setData(res);
      if (res.reflection?.transcript?.length) setMessages(res.reflection.transcript);
      if (res.connection.status === "met" && !res.reflection?.summary) setTab("reflect");
      const p = await getPerception({ data: { connection_id: id } });
      if (p.perception) {
        setPerc({
          warmth: p.perception.warmth,
          honesty: p.perception.honesty,
          safety: p.perception.safety,
          chemistry: p.perception.chemistry,
          would_meet_again: p.perception.would_meet_again,
          concerns: p.perception.concerns ?? "",
        });
        setPercSaved(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load this connection.");
    }
  }, [get, getPerception, id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function savePerception() {
    setPercSaving(true);
    try {
      await submitPerception({
        data: {
          connection_id: id,
          warmth: perc.warmth,
          honesty: perc.honesty,
          safety: perc.safety,
          chemistry: perc.chemistry,
          would_meet_again: perc.would_meet_again,
          concerns: perc.concerns.trim() || undefined,
        },
      });
      setPercSaved(true);
      toast.success("Kept privately with Athena.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    } finally {
      setPercSaving(false);
    }
  }


  async function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!whenText.trim() && !whereText.trim()) {
      toast.error("Add at least a time or place.");
      return;
    }
    setBusy(true);
    try {
      await propose({
        data: {
          connection_id: id,
          when_text: whenText.trim() || undefined,
          where_text: whereText.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      setShowForm(false);
      setWhenText(""); setWhereText(""); setNotes("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send that.");
    } finally {
      setBusy(false);
    }
  }

  async function proposalAction(proposalId: string, action: "confirm" | "complete" | "cancel") {
    try {
      await updateProp({ data: { proposal_id: proposalId, action } });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update that.");
    }
  }

  async function sendReflect() {
    const text = input.trim();
    if (!text || thinking) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const res = await askReflect({ data: { connection_id: id, messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Athena is quiet right now.");
    } finally {
      setThinking(false);
    }
  }

  async function saveReflection() {
    setBusy(true);
    try {
      const res = await distill({ data: { connection_id: id } });
      toast.success("Athena noted this quietly.");
      await load();
      void res;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save the reflection yet.");
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="screen-shell safe-top pt-8 px-6">
        <p className="text-sm text-muted-foreground">A moment…</p>
      </div>
    );
  }

  // Athena decides server-side whether a reflection is actually available yet
  // (a completed meeting, a passed meeting time, or a sustained conversation).
  // The tab stays reachable; the flow itself shows her gentle "not yet" state.
  const canReflect = data.connection.status !== "closed";

  async function submitReport(category: ReportCategory, details: string) {
    try {
      await report({
        data: {
          reported_id: data!.connection.other_id,
          category,
          details: details || undefined,
        },
      });
      toast.success("Thank you. Athena's safety team will look into this.");
      setReportOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit report.");
    }
  }

  return (
    <div className="screen-shell safe-top pb-16 flex flex-col">
      <header className="px-6 pt-6 pb-3 border-b border-border/60">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/connections" })}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground"
          >
            ← Connections
          </button>
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {data.connection.other_name}
          </span>
          <span className="w-16" />
        </div>
      </header>

      {data.athena_reflection ? (
        <section className="px-6 pt-5">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Athena's reflection</p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{data.athena_reflection}</p>
        </section>
      ) : null}

      <div className="px-6 pt-5">
        <FocusModeCard
          connectionId={data.connection.id}
          otherName={data.connection.other_name ?? null}
        />
      </div>

      <div className="px-6 pt-5">

        <div className="inline-flex rounded-full border border-border p-1 text-xs">
          <button
            className={`px-4 py-1.5 rounded-full transition ${tab === "plan" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            onClick={() => setTab("plan")}
          >
            Meeting
          </button>
          <button
            className={`px-4 py-1.5 rounded-full transition ${tab === "reflect" ? "bg-primary text-primary-foreground" : "text-muted-foreground"} ${!canReflect ? "opacity-50" : ""}`}
            onClick={() => canReflect && setTab("reflect")}
            disabled={!canReflect}
            title={canReflect ? "" : "This introduction has concluded"}
          >
            Reflect
          </button>
        </div>
      </div>

      {tab === "plan" ? (
        <section className="flex-1 px-6 pt-5 space-y-4">
          {data.proposals.length === 0 && !showForm ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/60 p-6 text-center">
              <p className="font-display text-lg text-foreground">Suggest how you'd like to meet</p>
              <p className="mt-2 text-sm text-ink-soft">Keep it simple — a coffee, a walk. Something low-pressure.</p>
            </div>
          ) : null}

          {data.proposals.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {p.by_me ? "You suggested" : `${data.connection.other_name} suggested`}
                </p>
                <span className="text-[11px] uppercase tracking-[0.2em] text-primary">{p.status}</span>
              </div>
              {p.when_text && <p className="mt-2 text-[15px] text-foreground"><span className="text-muted-foreground">When · </span>{p.when_text}</p>}
              {p.where_text && <p className="mt-1 text-[15px] text-foreground"><span className="text-muted-foreground">Where · </span>{p.where_text}</p>}
              {p.notes && <p className="mt-2 text-sm text-ink-soft whitespace-pre-wrap">{p.notes}</p>}

              {p.status === "proposed" && !p.by_me && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => proposalAction(p.id, "confirm")}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    Yes, let's do it
                  </button>
                  <button
                    onClick={() => proposalAction(p.id, "cancel")}
                    className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
                  >
                    Not this time
                  </button>
                </div>
              )}
              {p.status === "confirmed" && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => proposalAction(p.id, "complete")}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    We met
                  </button>
                  <button
                    onClick={() => proposalAction(p.id, "cancel")}
                    className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}

          {showForm ? (
            <form onSubmit={submitProposal} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <input
                value={whenText}
                onChange={(e) => setWhenText(e.target.value)}
                placeholder="When · e.g. Saturday around 3pm"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
              />
              <input
                value={whereText}
                onChange={(e) => setWhereText(e.target.value)}
                placeholder="Where · e.g. Blue Bottle on Hayes"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else (optional)"
                rows={2}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  Send suggestion
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            data.connection.status !== "met" && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-full border border-border px-4 py-3 text-sm text-foreground transition hover:border-primary/60"
              >
                Suggest a time & place
              </button>
            )
          )}
        </section>
      ) : (
        <section className="flex-1 flex flex-col">
          <div className="px-5 pt-5 pb-2">
            <ReflectionFlow
              connectionId={id}
              otherName={data.connection.other_name}
              onCompleted={() => void load()}
              onReportSafety={() => setReportOpen(true)}
            />
            <p className="mt-6 px-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
              A few private impressions
            </p>
            <div className="mt-3 rounded-3xl border border-border/70 bg-card/70 p-5">
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Five questions Athena always asks
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Private. {data.connection.other_name} never sees any of this. Athena uses it to
                understand you better and to notice patterns over time.
              </p>
              <div className="mt-4 space-y-4">
                <RatingRow label="Did they feel warm and present?" value={perc.warmth} onChange={(v) => setPerc((p) => ({ ...p, warmth: v }))} />
                <RatingRow label="Did they feel honest?" value={perc.honesty} onChange={(v) => setPerc((p) => ({ ...p, honesty: v }))} />
                <RatingRow label="Did you feel safe with them?" value={perc.safety} onChange={(v) => setPerc((p) => ({ ...p, safety: v }))} />
                <RatingRow label="Was there any real chemistry?" value={perc.chemistry} onChange={(v) => setPerc((p) => ({ ...p, chemistry: v }))} />
                <div>
                  <p className="text-sm text-foreground">Would you meet them again?</p>
                  <div className="mt-2 flex gap-2">
                    {[
                      { v: true, label: "Yes" },
                      { v: false, label: "No" },
                      { v: null, label: "Unsure" },
                    ].map((o) => (
                      <button
                        key={String(o.v)}
                        type="button"
                        onClick={() => setPerc((p) => ({ ...p, would_meet_again: o.v }))}
                        className={`rounded-full border px-4 py-1.5 text-sm transition ${
                          perc.would_meet_again === o.v
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-foreground"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-foreground">Anything that concerned you? (optional)</p>
                  <textarea
                    value={perc.concerns}
                    onChange={(e) => setPerc((p) => ({ ...p, concerns: e.target.value }))}
                    rows={2}
                    placeholder="Only Athena sees this."
                    className="mt-2 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void savePerception()}
                  disabled={percSaving}
                  className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  {percSaving ? "Saving…" : percSaved ? "Update Athena's private notes" : "Share with Athena, privately"}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {reportOpen && (
        <ReportSheet
          other={data.connection.other_name}
          onClose={() => setReportOpen(false)}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm text-foreground">{label}</p>
      <div className="mt-2 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-full border text-sm transition ${
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
