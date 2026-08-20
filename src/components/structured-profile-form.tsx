// Controlled inputs for structured self-description and match preferences.
// Purely presentational: every write goes through a server function.
import {
  ETHNICITY_OPTIONS,
  OPENNESS_OPTIONS,
  PREFER_NOT_TO_SAY,
  RELIGION_OPTIONS,
  cmToFeetInches,
  feetInchesToCm,
  type MatchPreferences,
  type SelfDescription,
} from "@/lib/structured-profile";

function Chip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`min-h-11 rounded-full border px-4 py-2 text-sm transition ${
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function toggle(list: string[], value: string): string[] {
  if (value === PREFER_NOT_TO_SAY) {
    return list.includes(PREFER_NOT_TO_SAY) ? [] : [PREFER_NOT_TO_SAY];
  }
  const base = list.filter((v) => v !== PREFER_NOT_TO_SAY);
  return base.includes(value) ? base.filter((v) => v !== value) : [...base, value];
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm text-foreground">{children}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function HeightPicker({
  cm,
  onChange,
  label,
}: {
  cm: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  const total = cm ? Math.round(cm / 2.54) : null;
  const feet = total ? Math.floor(total / 12) : "";
  const inches = total ? total % 12 : "";
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <select
          aria-label={`${label} — feet`}
          value={feet}
          onChange={(e) =>
            onChange(
              e.target.value === ""
                ? null
                : feetInchesToCm(Number(e.target.value), Number(inches || 0)),
            )
          }
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="">—</option>
          {[4, 5, 6, 7].map((f) => (
            <option key={f} value={f}>{f} ft</option>
          ))}
        </select>
        <select
          aria-label={`${label} — inches`}
          value={inches}
          onChange={(e) =>
            onChange(
              feet === ""
                ? null
                : feetInchesToCm(Number(feet), Number(e.target.value || 0)),
            )
          }
          className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i}>{i} in</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{cmToFeetInches(cm)}</span>
      </div>
    </div>
  );
}

export function SelfDescriptionFields({
  value,
  onChange,
}: {
  value: SelfDescription;
  onChange: (v: SelfDescription) => void;
}) {
  return (
    <div className="space-y-6" data-testid="self-description-fields">
      <HeightPicker
        cm={value.height_cm}
        label="Your height"
        onChange={(v) => onChange({ ...value, height_cm: v })}
      />

      <div>
        <Label hint="Select any that fit. This is yours to state — nothing is ever inferred.">
          Ethnicity or cultural background
        </Label>
        <div className="flex flex-wrap gap-2">
          {ETHNICITY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={value.ethnicities.includes(o.value)}
              onToggle={() => onChange({ ...value, ethnicities: toggle(value.ethnicities, o.value) })}
            />
          ))}
          <Chip
            label="Prefer not to say"
            selected={value.ethnicities.includes(PREFER_NOT_TO_SAY)}
            onToggle={() => onChange({ ...value, ethnicities: toggle(value.ethnicities, PREFER_NOT_TO_SAY) })}
          />
        </div>
        <input
          aria-label="Describe your cultural background in your own words"
          placeholder="Other — in your own words"
          value={value.ethnicity_self_describe ?? ""}
          onChange={(e) => onChange({ ...value, ethnicity_self_describe: e.target.value })}
          className="mt-3 min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm"
        />
      </div>

      <div>
        <Label hint="However you'd describe it — including not at all.">
          Religion or spirituality
        </Label>
        <div className="flex flex-wrap gap-2">
          {RELIGION_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={value.religions.includes(o.value)}
              onToggle={() => onChange({ ...value, religions: toggle(value.religions, o.value) })}
            />
          ))}
          <Chip
            label="Prefer not to say"
            selected={value.religions.includes(PREFER_NOT_TO_SAY)}
            onToggle={() => onChange({ ...value, religions: toggle(value.religions, PREFER_NOT_TO_SAY) })}
          />
        </div>
        <input
          aria-label="Describe your religion or spirituality in your own words"
          placeholder="Other — in your own words"
          value={value.religion_self_describe ?? ""}
          onChange={(e) => onChange({ ...value, religion_self_describe: e.target.value })}
          className="mt-3 min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm"
        />
      </div>
    </div>
  );
}

function OpennessRow({
  legend,
  openness,
  onOpenness,
  options,
  selected,
  onSelected,
}: {
  legend: string;
  openness: MatchPreferences["ethnicity_openness"];
  onOpenness: (v: MatchPreferences["ethnicity_openness"]) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  selected: string[];
  onSelected: (v: string[]) => void;
}) {
  const showList = openness === "preference" || openness === "requirement";
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-foreground">{legend}</legend>
      <p className="mb-2 text-xs text-muted-foreground">
        Optional. Nothing here is required, and nothing here ranks anyone.
      </p>
      <div className="flex flex-wrap gap-2">
        {OPENNESS_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={openness === o.value}
            onToggle={() => onOpenness(o.value)}
          />
        ))}
      </div>
      {showList && (
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip
              key={o.value}
              label={o.label}
              selected={selected.includes(o.value)}
              onToggle={() => onSelected(toggle(selected, o.value))}
            />
          ))}
        </div>
      )}
    </fieldset>
  );
}

export function MatchPreferenceFields({
  value,
  onChange,
}: {
  value: MatchPreferences;
  onChange: (v: MatchPreferences) => void;
}) {
  return (
    <div className="space-y-6" data-testid="match-preference-fields">
      <OpennessRow
        legend="Cultural background of someone you'd meet"
        openness={value.ethnicity_openness}
        onOpenness={(v) => onChange({ ...value, ethnicity_openness: v })}
        options={ETHNICITY_OPTIONS}
        selected={value.preferred_ethnicities}
        onSelected={(v) => onChange({ ...value, preferred_ethnicities: v })}
      />

      <OpennessRow
        legend="Religion or spirituality of someone you'd meet"
        openness={value.religion_openness}
        onOpenness={(v) => onChange({ ...value, religion_openness: v })}
        options={RELIGION_OPTIONS}
        selected={value.preferred_religions}
        onSelected={(v) => onChange({ ...value, preferred_religions: v })}
      />

      <div className="space-y-3">
        <HeightPicker
          cm={value.height_min_cm}
          label="Shortest you'd consider"
          onChange={(v) => onChange({ ...value, height_min_cm: v })}
        />
        <HeightPicker
          cm={value.height_max_cm}
          label="Tallest you'd consider"
          onChange={(v) => onChange({ ...value, height_max_cm: v })}
        />
        {(value.height_min_cm != null || value.height_max_cm != null) && (
          <div className="flex flex-wrap gap-2">
            <Chip
              label="A preference"
              selected={value.height_strength === "preference"}
              onToggle={() => onChange({ ...value, height_strength: "preference" })}
            />
            <Chip
              label="Something that truly matters"
              selected={value.height_strength === "requirement"}
              onToggle={() => onChange({ ...value, height_strength: "requirement" })}
            />
          </div>
        )}
      </div>

      <div>
        <Label hint="Share any preferences or boundaries that matter to you.">
          Anything else Athena should know about who you're open to meeting?
        </Label>
        <textarea
          data-testid="preferences-additional-notes"
          aria-label="Anything else Athena should know about who you're open to meeting?"
          rows={4}
          maxLength={2000}
          value={value.additional_notes ?? ""}
          onChange={(e) => onChange({ ...value, additional_notes: e.target.value })}
          className="w-full rounded-xl border border-border bg-card p-4 text-sm"
        />
      </div>
    </div>
  );
}
