import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyIntroductions } from "@/lib/introductions.functions";
import { getTodayRead, countWord, type TodayRead } from "@/lib/today.functions";
import { EndingChoiceCard } from "@/components/ending-choice-card";
import { ReadinessCard } from "@/components/readiness-card";
import { LookingState } from "@/components/looking-state";
import { ReturnGreeting } from "@/components/return-greeting";
import { AthenaPresence } from "@/components/athena-presence";
import { Bell } from "lucide-react";
import { FieldBack } from "@/components/field-back";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Today,
});

type ProfileRow = {
  display_name: string | null;
  onboarding_stage: string;
  onboarding_completed_at: string | null;
};

const EMPTY_READ: TodayRead = { lede: null, paragraphs: [], shifts: [], holding: [] };

/** Today (§35): a calm orientation surface — Athena's read of where the member
 *  is. Not a feed, not a dashboard, no metrics, no streaks. */
function Today() {
  const navigate = useNavigate();
  const listIntroductions = useServerFn(listMyIntroductions);
  const loadRead = useServerFn(getTodayRead);
  const [hasIntroduction, setHasIntroduction] = useState<boolean>(false);
  const [read, setRead] = useState<TodayRead>(EMPTY_READ);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [athenaSpeaking, setAthenaSpeaking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }, intros, todayRead] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, onboarding_stage, onboarding_completed_at")
          .maybeSingle(),
        supabase.from("interview_sessions").select("messages").maybeSingle(),
        listIntroductions().catch(() => ({ introductions: [] as unknown[] })),
        loadRead().catch(() => EMPTY_READ),
      ]);
      const profile = p as ProfileRow | null;
      const msgs = Array.isArray(s?.messages) ? (s!.messages as unknown[]) : [];
      const started = msgs.length > 0;
      setHasIntroduction((intros?.introductions?.length ?? 0) > 0);
      setRead(todayRead ?? EMPTY_READ);
      setDisplayName(profile?.display_name ?? null);
      if (profile && !profile.onboarding_completed_at) {
        navigate({ to: "/onboarding" });
        return;
      }
      // First meeting always happens before the dashboard has context.
      if (!started) {
        navigate({ to: "/athena" });
        return;
      }
      setLoading(false);
    })();
  }, [navigate, listIntroductions, loadRead]);

  if (loading)
    return (
      <div className="screen-shell items-center justify-center">
        <p className="type-meta">A moment…</p>
      </div>
    );

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="surface fade-in-quick" data-testid="today-screen">
      <FieldBack />

      <div className="surface-top">
        <span aria-hidden style={{ width: "34px" }} />
        <div className="sys" style={{ opacity: 0.6 }}>
          {today}
        </div>
        <Link
          to="/notifications"
          aria-label="Notifications"
          className="tap-target justify-end text-[var(--lavender-dim)]"
        >
          <Bell className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        </Link>
      </div>

      <div className="surface-scroll">
        {/* Her read — the whole point of the page. */}
        <div className="today-read">
          <div className="sys" style={{ opacity: 0.6, marginBottom: "16px" }}>
            Where you are
          </div>
          <div className="mb-6">
            <ReturnGreeting displayName={displayName} onSpeakingChange={setAthenaSpeaking} />
          </div>
          <div className="mb-7 flex items-center gap-3">
            <span
              aria-hidden
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(90deg, color-mix(in oklab, var(--lavender) 42%, transparent), transparent)",
              }}
            />
            <AthenaPresence state={athenaSpeaking ? "speaking" : "quiet"} />
          </div>
          {read.lede ? (
            <>
              <div className="today-lede">{read.lede}</div>
              {read.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </>
          ) : (
            <div className="today-lede today-lede-quiet">
              I am still forming my read of you. When it is worth saying out loud, it will be here.
            </div>
          )}
        </div>

        {read.shifts.length > 0 && (
          <div className="today-sec" data-testid="today-shifts">
            <div className="today-head">
              <div className="sys">What shifted</div>
              <div className="sys" style={{ opacity: 0.4 }}>
                {countWord(read.shifts.length)}
              </div>
            </div>
            {read.shifts.map((s, i) => (
              <div key={i} className={s.warm ? "today-shift today-shift-warm" : "today-shift"}>
                <div className="today-when">{s.when}</div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        )}

        {read.holding.length > 0 && (
          <div className="today-sec" data-testid="today-holding">
            <div className="today-head">
              <div className="sys">What I am holding</div>
              <div className="sys" style={{ opacity: 0.4 }}>
                {countWord(read.holding.length)}
              </div>
            </div>
            <div style={{ height: "8px" }} />
            {read.holding.map((h) => (
              <div key={h.label} className="today-hold">
                <div className="l">{h.label}</div>
                <div className={h.sure ? "r sure" : "r"}>{h.held}</div>
              </div>
            ))}
          </div>
        )}

        {/* Live member business, when there is any. Each of these renders
            nothing unless it genuinely applies. */}
        <div className="today-sec space-y-5">
          <EndingChoiceCard />
          <ReadinessCard />
        </div>
        {!hasIntroduction && <LookingState />}

        <div className="today-sec today-next">
          <div className="today-head">
            <div className="sys">Where to go</div>
          </div>
          <NextLink to="/athena" label="Continue with Athena" testId="today-link-athena" warm />
          <NextLink to="/profile" label="Your Living Profile" testId="today-link-living-profile" />
          <NextLink to="/understanding" label="What she understands" testId="today-link-understanding" />
          <NextLink to="/reveal" label="Her read of you" testId="today-link-reveal" />
        </div>

        <div className="today-foot">
          <div className="sys">Also true</div>
          <p>
            Nothing here needs your attention today. I will keep going either way — this is only so
            you can see what I see.
          </p>
        </div>
      </div>
    </div>
  );
}

function NextLink({
  to,
  label,
  testId,
  warm = false,
}: {
  testId?: string;
  to: "/profile" | "/athena" | "/understanding" | "/reveal";
  label: string;
  warm?: boolean;
}) {
  return (
    <Link to={to} data-testid={testId} className={warm ? "today-hold today-next-row warm" : "today-hold today-next-row"}>
      <div className="l">{label}</div>
      <div className="r" aria-hidden>
        →
      </div>
    </Link>
  );
}
