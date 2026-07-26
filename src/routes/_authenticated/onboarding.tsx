import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

type Step =
  | "welcome"
  | "identity"
  | "intelligence"
  | "preferences"
  | "readiness"
  | "prompts"
  | "complete";

const STEPS: Step[] = ["welcome", "identity", "intelligence", "preferences", "readiness", "prompts", "complete"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);

  // form state (kept in-memory; persisted at each Next)
  const [identity, setIdentity] = useState({ display_name: "", birth_date: "", gender: "", pronouns: "", city: "" });
  const [intel, setIntel] = useState({ core_values: "", life_direction: "", self_understanding: "", communication_style: "" });
  const [prefs, setPrefs] = useState({ seeking_genders: "", age_min: "", age_max: "", relationship_intent: "" });
  const [ready, setReady] = useState({ emotional_availability: 5, time_availability: 5, clarity_of_want: 5, ready_reflection: "" });
  const [prompt, setPrompt] = useState({ answer_1: "", answer_2: "" });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      if (data) {
        setStep((data.onboarding_stage as Step) ?? "welcome");
        setIdentity((s) => ({
          ...s,
          display_name: data.display_name ?? "",
          birth_date: data.birth_date ?? "",
          gender: data.gender ?? "",
          pronouns: data.pronouns ?? "",
          city: data.city ?? "",
        }));
      }
    })();
  }, []);

  const currentIdx = STEPS.indexOf(step);

  async function persistStage(next: Step) {
    setSaving(true);
    try {
      if (step === "identity") {
        await supabase.from("profiles").update({
          display_name: identity.display_name || null,
          birth_date: identity.birth_date || null,
          gender: identity.gender || null,
          pronouns: identity.pronouns || null,
          city: identity.city || null,
          onboarding_stage: next,
        }).eq("id", (await supabase.auth.getUser()).data.user!.id);
      } else if (step === "intelligence") {
        const uid = (await supabase.auth.getUser()).data.user!.id;
        await supabase.from("user_intelligence").upsert({
          user_id: uid,
          core_values: intel.core_values.split(",").map((v) => v.trim()).filter(Boolean),
          life_direction: intel.life_direction || null,
          self_understanding: intel.self_understanding || null,
          communication_style: intel.communication_style || null,
        });
        await supabase.from("profiles").update({ onboarding_stage: next }).eq("id", uid);
      } else if (step === "preferences") {
        const uid = (await supabase.auth.getUser()).data.user!.id;
        await supabase.from("user_preferences").upsert({
          user_id: uid,
          seeking_genders: prefs.seeking_genders.split(",").map((g) => g.trim()).filter(Boolean),
          age_min: prefs.age_min ? Number(prefs.age_min) : null,
          age_max: prefs.age_max ? Number(prefs.age_max) : null,
          relationship_intent: prefs.relationship_intent || null,
        });
        await supabase.from("profiles").update({ onboarding_stage: next }).eq("id", uid);
      } else if (step === "readiness") {
        const uid = (await supabase.auth.getUser()).data.user!.id;
        const overall = Math.round((ready.emotional_availability + ready.time_availability + ready.clarity_of_want) / 3);
        await supabase.from("user_readiness").upsert({
          user_id: uid,
          emotional_availability: ready.emotional_availability,
          time_availability: ready.time_availability,
          clarity_of_want: ready.clarity_of_want,
          ready_reflection: ready.ready_reflection || null,
          overall_score: overall,
        });
        await supabase.from("profiles").update({ onboarding_stage: next }).eq("id", uid);
      } else if (step === "prompts") {
        const uid = (await supabase.auth.getUser()).data.user!.id;
        const rows = [
          { key: "meaningful_moment", text: "Describe a moment that shaped who you are.", answer: prompt.answer_1 },
          { key: "kind_of_partnership", text: "The kind of partnership I'm building toward…", answer: prompt.answer_2 },
        ].filter((r) => r.answer.trim());
        if (rows.length) {
          await supabase.from("user_prompts").upsert(
            rows.map((r, i) => ({ user_id: uid, prompt_key: r.key, prompt_text: r.text, answer: r.answer, position: i })),
            { onConflict: "user_id,prompt_key" }
          );
        }
        await supabase.from("profiles").update({
          onboarding_stage: next,
          onboarding_completed_at: next === "complete" ? new Date().toISOString() : null,
        }).eq("id", uid);
      } else if (step === "welcome") {
        const uid = (await supabase.auth.getUser()).data.user!.id;
        await supabase.from("profiles").update({ onboarding_stage: next }).eq("id", uid);
      }
      setStep(next);
      if (next === "complete") {
        toast.success("Your profile is ready.");
        setTimeout(() => navigate({ to: "/home" }), 900);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const next = STEPS[Math.min(currentIdx + 1, STEPS.length - 1)];
  const prev = STEPS[Math.max(currentIdx - 1, 0)];

  return (
    <div className="screen-shell safe-top safe-bottom px-6 pt-6 pb-8">
      <ProgressBar current={currentIdx} total={STEPS.length - 1} />

      <div className="mt-8 flex-1 fade-in-slow" key={step}>
        {step === "welcome" && (
          <Section
            eyebrow="A quiet beginning"
            title={<>This isn't a <em className="italic text-primary">quick</em> setup.</>}
            body="The next few minutes shape everything that follows: who we understand you to be, and who we consider introducing you to. Move slowly."
          />
        )}
        {step === "identity" && (
          <Section eyebrow="Step 1 · Identity" title={<>The <em className="italic text-primary">basics</em>.</>} body="How you'd like to be known.">
            <div className="mt-6 space-y-3">
              <Field label="Preferred name" value={identity.display_name} onChange={(v) => setIdentity({ ...identity, display_name: v })} />
              <Field label="Birth date" type="date" value={identity.birth_date} onChange={(v) => setIdentity({ ...identity, birth_date: v })} />
              <Field label="Gender" value={identity.gender} onChange={(v) => setIdentity({ ...identity, gender: v })} />
              <Field label="Pronouns" value={identity.pronouns} onChange={(v) => setIdentity({ ...identity, pronouns: v })} />
              <Field label="City" value={identity.city} onChange={(v) => setIdentity({ ...identity, city: v })} />
            </div>
          </Section>
        )}
        {step === "intelligence" && (
          <Section eyebrow="Step 2 · Intelligence" title={<>Who you <em className="italic text-primary">are</em>.</>} body="This is the layer that lets us understand you beyond the surface.">
            <div className="mt-6 space-y-3">
              <Field label="Core values (comma separated)" value={intel.core_values} onChange={(v) => setIntel({ ...intel, core_values: v })} placeholder="honesty, curiosity, family" />
              <TextArea label="Where your life is heading" value={intel.life_direction} onChange={(v) => setIntel({ ...intel, life_direction: v })} />
              <TextArea label="Something you understand about yourself" value={intel.self_understanding} onChange={(v) => setIntel({ ...intel, self_understanding: v })} />
              <Field label="How you tend to communicate" value={intel.communication_style} onChange={(v) => setIntel({ ...intel, communication_style: v })} placeholder="direct and warm" />
            </div>
          </Section>
        )}
        {step === "preferences" && (
          <Section eyebrow="Step 3 · Preferences" title={<>Who you're <em className="italic text-primary">open</em> to meeting.</>} body="Not a filter list — a starting point.">
            <div className="mt-6 space-y-3">
              <Field label="Seeking (comma separated)" value={prefs.seeking_genders} onChange={(v) => setPrefs({ ...prefs, seeking_genders: v })} placeholder="women, non-binary" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Age min" type="number" value={prefs.age_min} onChange={(v) => setPrefs({ ...prefs, age_min: v })} />
                <Field label="Age max" type="number" value={prefs.age_max} onChange={(v) => setPrefs({ ...prefs, age_max: v })} />
              </div>
              <Field label="What you're building toward" value={prefs.relationship_intent} onChange={(v) => setPrefs({ ...prefs, relationship_intent: v })} placeholder="a long-term partnership" />
            </div>
          </Section>
        )}
        {step === "readiness" && (
          <Section eyebrow="Step 4 · Readiness" title={<>Where you <em className="italic text-primary">are</em> right now.</>} body="Honest is better than impressive.">
            <div className="mt-6 space-y-5">
              <Slider label="Emotional availability" value={ready.emotional_availability} onChange={(n) => setReady({ ...ready, emotional_availability: n })} />
              <Slider label="Time in your life for someone" value={ready.time_availability} onChange={(n) => setReady({ ...ready, time_availability: n })} />
              <Slider label="Clarity about what you want" value={ready.clarity_of_want} onChange={(n) => setReady({ ...ready, clarity_of_want: n })} />
              <TextArea label="Anything you'd like us to hold in mind" value={ready.ready_reflection} onChange={(v) => setReady({ ...ready, ready_reflection: v })} />
            </div>
          </Section>
        )}
        {step === "prompts" && (
          <Section eyebrow="Step 5 · Voice" title={<>Let someone <em className="italic text-primary">hear</em> you.</>} body="Two short prompts. Say them the way you'd actually say them.">
            <div className="mt-6 space-y-4">
              <TextArea label="Describe a moment that shaped who you are." value={prompt.answer_1} onChange={(v) => setPrompt({ ...prompt, answer_1: v })} />
              <TextArea label="The kind of partnership I'm building toward…" value={prompt.answer_2} onChange={(v) => setPrompt({ ...prompt, answer_2: v })} />
            </div>
          </Section>
        )}
        {step === "complete" && (
          <Section eyebrow="Complete" title={<>Your <em className="italic text-primary">intelligence</em> is set.</>} body="We'll take it from here. Introductions arrive when they're worth arriving." />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {currentIdx > 0 && step !== "complete" ? (
          <button onClick={() => setStep(prev)} className="text-sm text-muted-foreground">← Back</button>
        ) : <span />}
        {step !== "complete" && (
          <button
            onClick={() => persistStage(next)}
            disabled={saving}
            className="ml-auto rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Saving…" : step === "welcome" ? "Begin" : currentIdx === STEPS.length - 2 ? "Finish" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.max(0, Math.min(1, current / total)) * 100;
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}
function Section({ eyebrow, title, body, children }: { eyebrow: string; title: React.ReactNode; body: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-3 font-display text-[2.25rem] leading-[1.05] text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
      {children}
    </div>
  );
}
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-ring" />
    </label>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4}
        className="mt-1 w-full resize-none rounded-2xl border border-input bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none focus:border-ring" />
    </label>
  );
}
function Slider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-foreground">{label}</span>
        <span className="font-display text-lg text-primary">{value}</span>
      </div>
      <input type="range" min={1} max={10} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-primary" />
    </div>
  );
}
