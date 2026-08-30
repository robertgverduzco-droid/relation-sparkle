import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { listMyIntroductions } from "@/lib/introductions.functions";
import { listConversations } from "@/lib/messaging.functions";
import { getMyUnderstanding } from "@/lib/understanding.functions";
import { OrbField, type OrbId, type OrbSpec } from "@/components/orb-field";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Athena — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Field,
});

type ProfileRow = {
  display_name: string | null;
  onboarding_stage: string;
  onboarding_completed_at: string | null;
};

const ROUTE_OF: Record<OrbId, "/today" | "/athena" | "/introductions" | "/messages" | "/understanding"> = {
  today: "/today",
  athena: "/athena",
  meet: "/introductions",
  messages: "/messages",
  you: "/understanding",
};

const WORDS = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const count = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));

/**
 * The field (§4): five lights drifting in the void. This is the whole of
 * member navigation — no tab bar, no cards, no list. Every label is real
 * status from the existing loaders; amber means a person is waiting.
 */
function Field() {
  const navigate = useNavigate();
  const listIntroductions = useServerFn(listMyIntroductions);
  const listConvs = useServerFn(listConversations);
  const loadUnderstanding = useServerFn(getMyUnderstanding);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [threads, setThreads] = useState(0);
  const [held, setHeld] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: s }, intros] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name, onboarding_stage, onboarding_completed_at")
          .maybeSingle(),
        supabase.from("interview_sessions").select("messages").maybeSingle(),
        listIntroductions().catch(() => ({ introductions: [] as { response: string }[] })),
      ]);
      const profile = p as ProfileRow | null;
      const msgs = Array.isArray(s?.messages) ? (s!.messages as unknown[]) : [];
      const started = msgs.length > 0;
      if (profile && !profile.onboarding_completed_at) {
        navigate({ to: "/onboarding" });
        return;
      }
      // First meeting always happens before anything else.
      if (!started) {
        navigate({ to: "/athena" });
        return;
      }
      setWaiting(
        (intros?.introductions ?? []).filter(
          (i) => (i as { response: string }).response === "pending",
        ).length,
      );
      setLoading(false);

      const [convs, understanding] = await Promise.all([
        listConvs().catch(() => ({ conversations: [] as unknown[] })),
        loadUnderstanding().catch(() => ({ facets: [] as unknown[] })),
      ]);
      setThreads(convs?.conversations?.length ?? 0);
      setHeld(understanding?.facets?.length ?? 0);
    })();
  }, [navigate, listIntroductions, listConvs, loadUnderstanding]);

  if (loading)
    return (
      <div className="screen-shell items-center justify-center">
        <p className="type-meta">A moment…</p>
      </div>
    );

  const orbs: OrbSpec[] = [
    { id: "today", name: "Today", warm: 0.12 },
    { id: "athena", name: "Athena", warm: 0 },
    {
      id: "meet",
      name: "Meet",
      warm: waiting > 0 ? 1 : 0,
      badge: waiting > 0 ? `${count(waiting)} waiting` : null,
    },
    {
      id: "messages",
      name: "Messages",
      warm: 0,
      sub: threads > 0 ? `${count(threads)} open` : null,
    },
    { id: "you", name: "You", warm: 0, sub: held > 0 ? `${count(held)} held` : null },
  ];

  const today = new Date();
  const stamp = today.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div data-testid="field-screen">
      <OrbField orbs={orbs} onEnter={(id) => navigate({ to: ROUTE_OF[id] })} />
      <div className="orb-field-top" style={{ pointerEvents: "none" }}>
        <span className="orb-sys">Athena</span>
        <span className="orb-sys">{stamp}</span>
      </div>
      <div className="orb-field-hint">
        <span className="orb-sys">Touch a light</span>
      </div>
    </div>
  );
}
