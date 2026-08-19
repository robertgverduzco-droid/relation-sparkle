import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  getAttractionResponse,
  getIntroductionPhotos,
  recordAttractionResponse,
} from "@/lib/introductions.functions";

/**
 * D-44 / F-33 — counterpart photography and progressive visual revelation.
 *
 * One person. One primary portrait, large and calm. Further photographs are
 * offered one at a time, by the member's own choice — never a thumbnail wall,
 * never a countdown, never a suspense mechanic. Nothing here compares two
 * people, and nothing here scores anyone.
 */

type Photo = { id: string; url: string; alt: string; is_primary: boolean };

type Attraction = "drawn" | "curious" | "unsure" | "not_there";

const ATTRACTION_CHOICES: { value: Attraction; label: string }[] = [
  { value: "drawn", label: "I'm drawn to them" },
  { value: "curious", label: "I'm curious" },
  { value: "unsure", label: "I'm not sure yet" },
  { value: "not_there", label: "Attraction isn't there" },
];

export function CounterpartPhotography({
  pairId,
  name,
  onDepth,
}: {
  pairId: string;
  name: string;
  onDepth: () => void;
}) {
  const loadPhotos = useServerFn(getIntroductionPhotos);
  const loadAttraction = useServerFn(getAttractionResponse);
  const record = useServerFn(recordAttractionResponse);
  const reduced = useReducedMotion();

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [shown, setShown] = useState(1);
  const [attraction, setAttraction] = useState<Attraction | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [p, a] = await Promise.all([
          loadPhotos({ data: { pair_id: pairId } }),
          loadAttraction({ data: { pair_id: pairId } }),
        ]);
        if (!live) return;
        setPhotos(p.photos as Photo[]);
        setAttraction((a.response as Attraction | null) ?? null);
      } catch {
        if (live) setPhotos([]);
      }
    })();
    return () => {
      live = false;
    };
  }, [pairId, loadPhotos, loadAttraction]);

  async function choose(value: Attraction) {
    setSaving(true);
    setAttraction(value);
    try {
      await record({ data: { pair_id: pairId, response: value } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't note that.");
    } finally {
      setSaving(false);
    }
  }

  if (photos === null) {
    return (
      <p className="mx-6 mt-6 text-sm text-muted-foreground" role="status">
        A moment…
      </p>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="mx-6 mt-6 rounded-3xl border border-dashed border-border p-5">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {name} hasn't shared a photograph yet. You can still read what Athena
          sees, and decide from there.
        </p>
        <button
          onClick={onDepth}
          className="mt-4 min-h-11 text-[13px] text-primary underline underline-offset-4"
        >
          What Athena sees here
        </button>
      </section>
    );
  }

  const visible = photos.slice(0, shown);
  const remaining = photos.length - shown;

  return (
    <section className="mt-6" data-testid="counterpart-photography">
      <div className="space-y-4 px-6">
        {visible.map((p, i) => (
          <figure
            key={p.id}
            className={
              "overflow-hidden rounded-3xl border border-border/60 bg-card " +
              (reduced || i === 0 ? "" : "animate-in fade-in duration-500")
            }
          >
            <img
              src={p.url}
              alt={p.alt}
              data-testid={i === 0 ? "counterpart-primary-photo" : "counterpart-photo"}
              loading={i === 0 ? "eager" : "lazy"}
              className="aspect-[4/5] w-full object-cover"
            />
          </figure>
        ))}
      </div>

      {/* Attraction response: private, qualitative, never a rating of a person. */}
      <fieldset className="mx-6 mt-6 rounded-3xl border border-border/70 bg-card p-5">
        <legend className="px-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Between you and Athena
        </legend>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Seeing them, what's true right now? {name} never sees this.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" data-testid="attraction-response">
          {ATTRACTION_CHOICES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => void choose(c.value)}
              disabled={saving}
              aria-pressed={attraction === c.value}
              className={
                "min-h-11 rounded-full border px-4 py-2 text-[13px] disabled:opacity-60 " +
                (attraction === c.value
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-ink-soft")
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        {attraction && (
          <p className="mt-3 text-[12px] text-muted-foreground" role="status">
            Noted. Athena keeps this to herself, and it doesn't decide anything
            on its own.
          </p>
        )}
      </fieldset>

      <div className="mx-6 mt-6 flex flex-col gap-3">
        {remaining > 0 && (
          <button
            type="button"
            data-testid="counterpart-more-photos"
            onClick={() => setShown((n) => n + 1)}
            className="min-h-11 rounded-full border border-border px-5 py-2.5 text-[13px] text-foreground"
          >
            See another photograph of {name}
            <span className="ml-2 text-muted-foreground">({remaining} more)</span>
          </button>
        )}
        <button
          type="button"
          data-testid="counterpart-depth"
          onClick={onDepth}
          className="min-h-11 rounded-full border border-border px-5 py-2.5 text-[13px] text-foreground"
        >
          What Athena sees here
        </button>
      </div>
    </section>
  );
}
