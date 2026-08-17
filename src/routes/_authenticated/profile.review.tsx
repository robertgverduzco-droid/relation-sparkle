import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile/review")({
  head: () => ({
    meta: [
      { title: "Correct what Athena understands — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

type IntelDraft = {
  core_values: string[];
  life_direction: string;
  self_understanding: string;
  communication_style: string;
  conflict_style: string;
  partnership_vision: string;
  readiness_summary: string;
};

const EMPTY: IntelDraft = {
  core_values: [],
  life_direction: "",
  self_understanding: "",
  communication_style: "",
  conflict_style: "",
  partnership_vision: "",
  readiness_summary: "",
};

function ReviewPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<IntelDraft>(EMPTY);
  const [valuesText, setValuesText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("user_intelligence")
        .select(
          "core_values, life_direction, self_understanding, communication_style, conflict_style, partnership_vision, readiness_summary",
        )
        .maybeSingle();
      if (data) {
        const values = Array.isArray(data.core_values)
          ? (data.core_values as string[])
          : [];
        setDraft({
          core_values: values,
          life_direction: data.life_direction ?? "",
          self_understanding: data.self_understanding ?? "",
          communication_style: data.communication_style ?? "",
          conflict_style: data.conflict_style ?? "",
          partnership_vision: data.partnership_vision ?? "",
          readiness_summary: data.readiness_summary ?? "",
        });
        setValuesText(values.join(", "));
      }
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      toast.error("Please sign in again.");
      setSaving(false);
      return;
    }
    const values = valuesText
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    const { error } = await supabase.from("user_intelligence").upsert(
      {
        user_id: userId,
        core_values: values,
        life_direction: draft.life_direction.trim() || null,
        self_understanding: draft.self_understanding.trim() || null,
        communication_style: draft.communication_style.trim() || null,
        conflict_style: draft.conflict_style.trim() || null,
        partnership_vision: draft.partnership_vision.trim() || null,
        readiness_summary: draft.readiness_summary.trim() || null,
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast("Athena will hold this in mind.");
    navigate({ to: "/profile" });
  }

  if (loading) {
    return (
      <div className="screen-shell safe-top px-6 pt-10 text-sm text-muted-foreground">
        A moment…
      </div>
    );
  }

  return (
    <div className="screen-shell safe-top safe-bottom pb-24" data-testid="profile-review-screen">
      <header className="px-6 pt-8">
        <Link to="/profile" className="text-[13px] text-muted-foreground">
          ← Back
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
          In your own words
        </p>
        <h1 className="mt-2 font-display text-[2rem] leading-tight text-foreground">
          Does this sound like you?
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          Athena's understanding of you is always evolving. Correct anything that
          isn't right — she'll fold your words into how she sees you.
        </p>
      </header>

      <section className="mt-6 space-y-5 px-6">
        <FieldGroup
          label="What you care about"
          hint="Short lowercase phrases, separated by commas."
        >
          <input
            value={valuesText}
            onChange={(e) => setValuesText(e.target.value)}
            placeholder="honesty, growth, family closeness"
            className="w-full rounded-2xl border border-border/70 bg-background px-4 py-3 text-[15px] text-foreground outline-none focus:border-primary"
          />
        </FieldGroup>

        <TextArea
          label="Where your life is going"
          value={draft.life_direction}
          onChange={(v) => setDraft((d) => ({ ...d, life_direction: v }))}
        />
        <TextArea
          label="How you understand yourself"
          value={draft.self_understanding}
          onChange={(v) => setDraft((d) => ({ ...d, self_understanding: v }))}
        />
        <TextArea
          label="How you tend to communicate"
          value={draft.communication_style}
          onChange={(v) => setDraft((d) => ({ ...d, communication_style: v }))}
        />
        <TextArea
          label="How you handle conflict"
          value={draft.conflict_style}
          onChange={(v) => setDraft((d) => ({ ...d, conflict_style: v }))}
        />
        <TextArea
          label="What you're building toward"
          value={draft.partnership_vision}
          onChange={(v) => setDraft((d) => ({ ...d, partnership_vision: v }))}
        />
        <TextArea
          label="Where you are right now"
          value={draft.readiness_summary}
          onChange={(v) => setDraft((d) => ({ ...d, readiness_summary: v }))}
        />
      </section>

      <footer className="mt-8 space-y-3 px-6">
        <button
          disabled={saving}
          onClick={save}
          className="w-full rounded-full bg-primary px-6 py-4 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <Link
          to="/athena"
          className="block w-full rounded-full border border-border/60 px-6 py-3 text-center text-[13px] text-muted-foreground"
        >
          Continue with Athena
        </Link>
      </footer>
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-2">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <FieldGroup label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-2xl border border-border/70 bg-background px-4 py-3 text-[15px] leading-relaxed text-foreground outline-none focus:border-primary"
      />
    </FieldGroup>
  );
}
