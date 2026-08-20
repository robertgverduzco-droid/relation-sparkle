// Member review and correction of their own structured information.
// Only ever shows the signed-in member's own data.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getStructuredProfile, saveStructuredProfile } from "@/lib/structured-profile.functions";
import { EMPTY_PREFERENCES, EMPTY_SELF, type MatchPreferences, type SelfDescription } from "@/lib/structured-profile";
import { MatchPreferenceFields, SelfDescriptionFields } from "./structured-profile-form";

export function StructuredProfilePanel() {
  const load = useServerFn(getStructuredProfile);
  const save = useServerFn(saveStructuredProfile);
  const [self, setSelf] = useState<SelfDescription>(EMPTY_SELF);
  const [prefs, setPrefs] = useState<MatchPreferences>(EMPTY_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await load({ data: undefined } as never);
        setSelf(data.self);
        setPrefs(data.preferences);
      } catch {
        // A read failure leaves the fields empty rather than blocking the page.
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  async function onSave() {
    setSaving(true);
    try {
      const res = await save({ data: { self, preferences: prefs } });
      toast.success(
        res.notesTrimmed
          ? "Saved. Part of your note couldn't be kept, but your preferences were."
          : "Saved.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <section className="mt-8 px-6" data-testid="structured-profile-panel">
      <h2 className="font-display text-[1.4rem] text-foreground">About you, in your words</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Only you can state these. Athena never guesses them from your photographs, your name, or
        where you live — and no one else ever sees your preferences.
      </p>

      <div className="mt-6 rounded-3xl border border-border/70 bg-card p-5">
        <SelfDescriptionFields value={self} onChange={setSelf} />
      </div>

      <h3 className="mt-8 font-display text-[1.2rem] text-foreground">
        Who you're open to meeting
      </h3>
      <div className="mt-4 rounded-3xl border border-border/70 bg-card p-5">
        <MatchPreferenceFields value={prefs} onChange={setPrefs} />
      </div>

      <button
        type="button"
        data-testid="structured-profile-save"
        onClick={onSave}
        disabled={saving}
        className="mt-5 min-h-11 w-full rounded-full bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
