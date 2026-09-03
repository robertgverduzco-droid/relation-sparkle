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
      <p className="mx-[26px] mt-6 sys" role="status">
        A moment…
      </p>
    );
  }

  if (photos.length === 0) {
    return (
      <section className="meet-held">
        <span className="sys">No photograph yet</span>
        <p>
          {name} hasn't shared a photograph yet. You can still read what Athena
          sees, and decide from there.
        </p>
        <button onClick={onDepth} className="meet-quiet text-left">
          What Athena sees here
        </button>
      </section>
    );
  }

  const visible = photos.slice(0, shown);
  const remaining = photos.length - shown;

  return (
    <section data-testid="counterpart-photography">
      <div className="space-y-4">
        {visible.map((p, i) => (
          <figure
            key={p.id}
            className={
              "meet-portrait " + (reduced || i === 0 ? "" : "animate-in fade-in duration-500")
            }
          >
            <img
              src={p.url}
              alt={p.alt}
              data-testid={i === 0 ? "counterpart-primary-photo" : "counterpart-photo"}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <span aria-hidden className="meet-portrait-veil" />
            <span aria-hidden className="pbrk pbrk-tl" />
            <span aria-hidden className="pbrk pbrk-br" />
            <figcaption className="meet-portrait-note">Photograph</figcaption>
          </figure>
        ))}
      </div>

      {/* Attraction response: private, qualitative, never a rating of a person. */}
      <fieldset className="mx-[26px] mt-7 border-t border-[rgba(168,151,212,0.12)] pt-5">
        <legend className="sys px-1">Between you and Athena</legend>
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
                  ? "border-[color-mix(in_oklab,var(--lavender)_60%,transparent)] text-ink"
                  : "border-[rgba(168,151,212,0.18)] text-ink/50")
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        {attraction && (
          <p className="mt-3 text-[12px] text-ink/50" role="status">
            Noted. Athena keeps this to herself, and it doesn't decide anything
            on its own.
          </p>
        )}
      </fieldset>

      <div className="mx-[26px] mt-5 flex flex-col items-start gap-2">
        {remaining > 0 && (
          <button
            type="button"
            data-testid="counterpart-more-photos"
            onClick={() => setShown((n) => n + 1)}
            className="meet-quiet text-left"
          >
            See another photograph of {name} ({remaining} more)
          </button>
        )}
        <button
          type="button"
          data-testid="counterpart-depth"
          onClick={onDepth}
          className="meet-quiet text-left"
        >
          What Athena sees here
        </button>
      </div>
    </section>
  );
}
