import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConsentPanel } from "@/components/consent-panel";
import { saveOnboardingStep } from "@/lib/onboarding.functions";
import { MatchPreferenceFields, SelfDescriptionFields } from "@/components/structured-profile-form";
import { saveStructuredProfile } from "@/lib/structured-profile.functions";
import { EMPTY_PREFERENCES, EMPTY_SELF } from "@/lib/structured-profile";
import { ARRIVAL_WELCOME, arrivalShown, markArrivalShown } from "@/lib/arrival";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Begin — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

type Step = "welcome" | "identity" | "preferences" | "complete";
const STEPS: Step[] = ["welcome", "identity", "preferences", "complete"];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [saving, setSaving] = useState(false);
  // Required agreements must be accepted before we gather anything about them.
  const [consentOk, setConsentOk] = useState(false);
  // The written welcome is remembered per account, not per browser.
  const [accountId, setAccountId] = useState<string | null>(null);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setAccountId(data.user?.id ?? null));
  }, []);

  const [identity, setIdentity] = useState({
    display_name: "",
    birth_date: "",
    gender: "",
    pronouns: "",
    city: "",
    intro_note: "",
  });

  // Member-stated structured data (never inferred). Saved alongside each step.
  const [self, setSelf] = useState(EMPTY_SELF);
  const [openness, setOpenness] = useState(EMPTY_PREFERENCES);
  const [prefs, setPrefs] = useState({
    seeking_genders: "",
    age_min: "",
    age_max: "",
    relationship_intent: "",
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").maybeSingle();
      if (data) {
        // Legacy stages from previous versions collapse to the nearest current step.
        const legacy = (data.onboarding_stage as string) ?? "welcome";
        const mapped: Step =
          legacy === "complete"
            ? "complete"
            : legacy === "welcome"
              ? "welcome"
              : legacy === "identity"
                ? "identity"
                : "preferences";
        setStep(mapped);
        setIdentity((s) => ({
          ...s,
          display_name: data.display_name ?? "",
          birth_date: data.birth_date ?? "",
          gender: data.gender ?? "",
          pronouns: data.pronouns ?? "",
          city: data.city ?? "",
          intro_note: (data as { intro_note?: string | null }).intro_note ?? "",
        }));

      }
    })();
  }, []);

  const currentIdx = STEPS.indexOf(step);

  async function persistStage(next: Step) {
    setSaving(true);
    try {
      // A-08: onboarding progress is written server-side after validation.
      if (step === "identity" && !identity.display_name.trim()) {
        toast.error("Athena will need a name to call you by.");
        setSaving(false);
        return;
      }
      await saveOnboardingStep({
        data: {
          step,
          identity:
            step === "identity"
              ? {
                  display_name: identity.display_name.trim(),
                  birth_date: identity.birth_date || undefined,
                  gender: identity.gender || undefined,
                  pronouns: identity.pronouns || undefined,
                  city: identity.city || undefined,
                  intro_note: identity.intro_note || undefined,

                }
              : undefined,
          preferences:
            step === "preferences"
              ? {
                  seeking_genders: prefs.seeking_genders
                    .split(",")
                    .map((g) => g.trim())
                    .filter(Boolean),
                  age_min: prefs.age_min ? Number(prefs.age_min) : null,
                  age_max: prefs.age_max ? Number(prefs.age_max) : null,
                  relationship_intent: prefs.relationship_intent || undefined,
                }
              : undefined,
        },
      });
      if (step === "identity" || step === "preferences") {
        await saveStructuredProfile({
          data: step === "identity" ? { self } : { preferences: openness },
        });
      }
      setStep(next);
      if (next === "complete") {
        toast.success("Athena is ready to meet you.");
        setTimeout(() => navigate({ to: "/athena" }), 700);
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
        {step === "welcome" && accountId && <ArrivalWelcome accountId={accountId} />}
        {step === "welcome" && (

          <Section
            eyebrow="A quiet beginning"
            title={
              <>
                A few <em className="italic text-primary">essentials</em>, then a
                conversation.
              </>
            }
            body="We only need what's necessary to create your account. Everything else — who you are, how you love, what matters to you — you and Athena will discover together, in your own time."
          >
            {/* Versioned agreements are recorded here, individually, before
                anything about this person is gathered. */}
            <div className="mt-6">
              <ConsentPanel mode="gate" onSatisfied={() => setConsentOk(true)} />
            </div>
          </Section>
        )}

        {step === "identity" && (
          <Section
            eyebrow="Step 1 · You"
            title={
              <>
                How Athena should <em className="italic text-primary">know</em> you.
              </>
            }
            body="Just the basics, so Athena can call you by name and understand where you are in the world."
          >
            <div className="mt-6 space-y-3">
              <Field
                label="Preferred name"
                value={identity.display_name}
                onChange={(v) => setIdentity({ ...identity, display_name: v })}
              />
              <Field
                label="Birth date"
                type="date"
                value={identity.birth_date}
                onChange={(v) => setIdentity({ ...identity, birth_date: v })}
              />
              <Field
                label="Gender"
                value={identity.gender}
                onChange={(v) => setIdentity({ ...identity, gender: v })}
              />
              <Field
                label="Pronouns"
                value={identity.pronouns}
                onChange={(v) => setIdentity({ ...identity, pronouns: v })}
              />
              <Field
                label="City"
                value={identity.city}
                onChange={(v) => setIdentity({ ...identity, city: v })}
              />
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  Anything else you'd like to share?
                </span>
                <textarea
                  value={identity.intro_note}
                  onChange={(e) => setIdentity({ ...identity, intro_note: e.target.value })}
                  rows={4}
                  maxLength={2000}
                  placeholder="Optional. Whatever you'd want Athena to know before you talk."
                  className="mt-1.5 w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <div className="pt-2">
                <SelfDescriptionFields value={self} onChange={setSelf} />
              </div>
            </div>

          </Section>
        )}
        {step === "preferences" && (
          <Section
            eyebrow="Step 2 · Open to"
            title={
              <>
                Who you are <em className="italic text-primary">open</em> to meeting.
              </>
            }
            body="A starting point — not a filter list. Athena will refine her sense of fit through conversation."
          >
            <div className="mt-6 space-y-3">
              <Field
                label="Open to meeting (comma separated)"
                value={prefs.seeking_genders}
                onChange={(v) => setPrefs({ ...prefs, seeking_genders: v })}
                placeholder="women, non-binary"
              />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Age min"
                  type="number"
                  value={prefs.age_min}
                  onChange={(v) => setPrefs({ ...prefs, age_min: v })}
                />
                <Field
                  label="Age max"
                  type="number"
                  value={prefs.age_max}
                  onChange={(v) => setPrefs({ ...prefs, age_max: v })}
                />
              </div>
              <Field
                label="What you're building toward"
                value={prefs.relationship_intent}
                onChange={(v) =>
                  setPrefs({ ...prefs, relationship_intent: v })
                }
                placeholder="a long-term partnership"
              />
              <div className="pt-2">
                <MatchPreferenceFields value={openness} onChange={setOpenness} />
              </div>
            </div>
          </Section>
        )}
        {/* Screen 2 — Athena introduces herself and sets expectations for the
            conversation that follows. Her voice, not a product tour. */}
        {step === "complete" && (
          <Section
            eyebrow="Athena"
            title={
              <>
                I'm <em className="italic text-primary">Athena</em>.
              </>
            }
            body="I find people the right person. Not by comparing faces, but by understanding you well enough to recognise who would actually fit. So we're going to talk — about a quarter of an hour, and I'll ask directly rather than dress questions up as small talk. Some of it may feel like a lot at once. The more I understand now, the better I can search later, and it gets more like an ordinary conversation after this first pass."
          />
        )}

      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {currentIdx > 0 && step !== "complete" ? (
          <button
            onClick={() => setStep(prev)}
            className="text-sm text-muted-foreground"
          >
            ← Back
          </button>
        ) : (
          <span />
        )}
        {step !== "complete" && (
          <button
            onClick={() => persistStage(next)}
            disabled={saving || (step === "welcome" && !consentOk)}
            className="ml-auto rounded-full bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : step === "welcome"
                ? "Begin"
                : currentIdx === STEPS.length - 2
                  ? "Meet Athena"
                  : "Continue"}
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
      <div
        className="h-full bg-primary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
function Section({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-[2.25rem] leading-[1.05] text-foreground">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{body}</p>
      {children}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-input bg-card px-4 py-3 text-[15px] text-foreground outline-none focus:border-ring"
      />
    </label>
  );
}

/**
 * The canonical arrival welcome, restored to its proper place: Athena speaks
 * to the member before the first onboarding question, never after it.
 *
 * Text-first by doctrine — the words are always visible, whether or not audio
 * is available. It is delivered once, ever; the first-meeting sequence in
 * /athena drops its duplicate line once this has been shown.
 */
function ArrivalWelcome({ accountId }: { accountId: string | null }) {
  const [already] = useState(() => arrivalShown(accountId));
  useEffect(() => {
    markArrivalShown(accountId);
  }, [accountId]);
  if (already) return null;
  return (
    <div className="mb-8 fade-in-slow" data-testid="onboarding-arrival-welcome">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Athena</p>
      <p className="mt-3 font-display text-[1.75rem] leading-[1.15] text-foreground">
        {ARRIVAL_WELCOME}
      </p>
    </div>
  );
}
