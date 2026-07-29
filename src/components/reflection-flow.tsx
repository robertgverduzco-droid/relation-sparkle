// Athena Reflection Flow — post-date experience.
//
// North star: every reflection should leave the member feeling more understood
// than when they began, while helping Athena understand them more deeply for
// every future introduction.
//
// This never presents itself as a survey. It is a continuation of the member's
// relationship with Athena.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getGuidedReflection,
  submitGuidedReflection,
} from "@/lib/connections.functions";

const INTRO =
  "Your reflections help me understand both the person you met and the person you are becoming. The more honestly you share your experience, the more thoughtfully I can guide future introductions.";

const FEELINGS = [
  "Comfortable",
  "Relaxed",
  "Excited",
  "Curious",
  "Nervous",
  "Unsure",
  "Disconnected",
  "Other",
];

const CLOSINGS: Record<"yes" | "no" | "not_sure", string> = {
  yes: "I'm happy to hear that. I'll continue supporting you as you get to know one another. Whenever you'd like to reflect on your experiences together or talk something through, I'm here.",
  not_sure:
    "That's perfectly okay. Meaningful relationships sometimes take time to understand. Whenever you're ready to reflect again, I'll be here.",
  no: "Thank you for telling me honestly. I'll carry what you shared into every introduction that comes next.",
};

type Decision = "yes" | "no" | "not_sure";

export function ReflectionFlow({
  connectionId,
  otherName,
  onCompleted,
}: {
  connectionId: string;
  otherName: string;
  onCompleted?: () => void;
}) {
  const load = useServerFn(getGuidedReflection);
  const submit = useServerFn(submitGuidedReflection);

  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);

  const [feelings, setFeelings] = useState<string[]>([]);
  const [feelingOther, setFeelingOther] = useState("");
  const [mostGenuine, setMostGenuine] = useState("");
  const [difference, setDifference] = useState("");
  const [selfLearning, setSelfLearning] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");
  const [anythingElse, setAnythingElse] = useState("");

  const fetchIt = useCallback(async () => {
    try {
      const res = await load({ data: { connection_id: connectionId } });
      const r = res.reflection;
      if (r) {
        setFeelings((r.feeling_tags as string[] | null) ?? []);
        setFeelingOther(r.feeling_other ?? "");
        setMostGenuine(r.most_genuine ?? "");
        setDifference(r.greatest_difference ?? "");
        setSelfLearning(r.self_understanding ?? "");
        setReason(r.decision_reason ?? "");
        setAnythingElse(r.anything_else ?? "");
        if (r.submitted_at && r.continue_decision) {
          setDone(r.continue_decision as Decision);
        }
      }
    } catch {
      /* the reflection simply hasn't started yet */
    } finally {
      setReady(true);
    }
  }, [connectionId, load]);

  useEffect(() => {
    void fetchIt();
  }, [fetchIt]);

  function toggleFeeling(f: string) {
    setFeelings((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function send(d: Decision) {
    setBusy(true);
    try {
      await submit({
        data: {
          connection_id: connectionId,
          feeling_tags: feelings,
          feeling_other: feelingOther.trim() || undefined,
          most_genuine: mostGenuine.trim() || undefined,
          greatest_difference: difference.trim() || undefined,
          self_understanding: selfLearning.trim() || undefined,
          continue_decision: d,
          decision_reason: reason.trim() || undefined,
          anything_else: anythingElse.trim() || undefined,
        },
      });
      setDone(d);
      onCompleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that just yet.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (done) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card/70 p-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Athena</p>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground">{CLOSINGS[done]}</p>
        {done === "no" ? (
          <p className="mt-3 text-xs text-ink-soft">
            This introduction is complete. When the time is right, I'll bring you someone new.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card/70 p-5">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        Reflecting with Athena
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-foreground">{INTRO}</p>

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-[15px] text-foreground">
            Overall, how did you feel while spending time together?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeeling(f)}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${
                  feelings.includes(f)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {feelings.includes("Other") ? (
            <input
              value={feelingOther}
              onChange={(e) => setFeelingOther(e.target.value)}
              placeholder="In your own words"
              className="mt-3 w-full rounded-2xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          ) : null}
        </div>

        <Open
          label="What part of your time together felt the most genuine or enjoyable?"
          value={mostGenuine}
          onChange={setMostGenuine}
        />
        <Open
          label="Where did you notice the greatest difference between the two of you?"
          value={difference}
          onChange={setDifference}
        />
        <Open
          label="Looking back, what did this experience help you understand about yourself or what you're looking for in a relationship?"
          value={selfLearning}
          onChange={setSelfLearning}
        />

        <div>
          <p className="text-[15px] text-foreground">
            Based on your experience, would you like to continue getting to know{" "}
            {otherName}?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                { v: "yes", label: "Yes" },
                { v: "no", label: "No" },
                { v: "not_sure", label: "I'm Not Sure Yet" },
              ] as Array<{ v: Decision; label: string }>
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                disabled={busy}
                onClick={() => {
                  setDecision(o.v);
                  if (o.v !== "no") void send(o.v);
                }}
                className={`rounded-full border px-5 py-2 text-sm transition disabled:opacity-40 ${
                  decision === o.v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {decision === "no" ? (
          <div className="space-y-6 border-t border-border/60 pt-6">
            <Open
              label="Please help me understand what led to your decision. Your answer helps me make more thoughtful introductions in the future."
              value={reason}
              onChange={setReason}
            />
            <Open
              label="Is there anything else you'd like me to understand about you before I introduce you to someone else?"
              value={anythingElse}
              onChange={setAnythingElse}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void send("no")}
              className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Saving…" : "Share this with Athena"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Open({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[15px] leading-relaxed text-foreground">{label}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="Take your time."
        className="mt-3 w-full resize-none rounded-2xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
