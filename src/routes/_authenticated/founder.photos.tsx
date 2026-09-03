import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  approvePendingPhoto,
  getPendingPhotosForReview,
  rejectPendingPhoto,
} from "@/lib/photo-moderation.functions";

export const Route = createFileRoute("/_authenticated/founder/photos")({
  head: () => ({
    meta: [
      { title: "Photo Review — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FounderPhotosScreen,
});

type Photo = Awaited<ReturnType<typeof getPendingPhotosForReview>>["photos"][number];

function FounderPhotosScreen() {
  const load = useServerFn(getPendingPhotosForReview);
  const approve = useServerFn(approvePendingPhoto);
  const reject = useServerFn(rejectPendingPhoto);

  const [state, setState] = useState<"loading" | "denied" | "ready">("loading");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await load({});
      setPhotos(res.photos);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function act(photo: Photo, action: "approve" | "reject") {
    setBusyId(photo.id);
    setMessage(null);
    try {
      if (action === "approve") {
        await approve({ data: { photo_id: photo.id } });
      } else {
        const note = notes[photo.id]?.trim() || undefined;
        await reject({ data: { photo_id: photo.id, note } });
      }
      setMessage(
        action === "approve"
          ? `Approved ${photo.member_name}'s photo.`
          : `Rejected ${photo.member_name}'s photo — they've been told.`,
      );
      await refresh();
    } catch {
      setMessage("That didn't go through.");
    } finally {
      setBusyId(null);
    }
  }

  if (state === "loading") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Gathering what's waiting…</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">This page isn't available.</p>
      </section>
    );
  }

  return (
    <section className="min-h-dvh bg-background px-5 py-8">
      <header className="mx-auto max-w-2xl">
        <h1 className="text-lg font-medium text-foreground">Photo review</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing here reaches anyone else until you approve it. Rejecting deletes the photo and
          tells the member why, so they can try again.
        </p>
        {message && <p className="mt-3 text-xs text-foreground">{message}</p>}
      </header>

      <section className="mx-auto mt-8 max-w-2xl space-y-6">
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>
        ) : (
          photos.map((p) => (
            <article key={p.id} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{p.member_name}</p>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-border">
                {p.url ? (
                  <img
                    src={p.url}
                    alt={`${p.member_name}'s submitted photo`}
                    className="max-h-96 w-full object-contain bg-muted"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center bg-muted text-xs text-muted-foreground">
                    Couldn't load this image.
                  </div>
                )}
              </div>
              <label className="mt-3 block">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Note if rejecting (optional — the member sees this)
                </span>
                <textarea
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes((cur) => ({ ...cur, [p.id]: e.target.value }))}
                  maxLength={500}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-transparent px-2 py-1.5 text-xs text-foreground"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => void act(p, "approve")}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => void act(p, "reject")}
                  className="rounded-lg bg-destructive px-3 py-1.5 text-xs text-destructive-foreground disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
