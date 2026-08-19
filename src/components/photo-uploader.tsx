import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// D-07: five photographs is the canonical maximum.
const MAX_PHOTOS = 5;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

/**
 * Re-encode an image through a canvas so no EXIF/XMP metadata (GPS location,
 * capture timestamp, device serial) survives the upload. Orientation is
 * normalised by the decoder, so the visible image is unchanged.
 */
async function stripMetadata(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image on this device.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) throw new Error("Couldn't process that image on this device.");
  return blob;
}

type Photo = {
  id: string;
  path: string;
  url: string;
  is_primary: boolean;
  position: number;
  alt_text: string | null;
};

export function PhotoUploader() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await supabase
      .from("user_photos")
      .select("id, storage_path, position, is_primary, alt_text")
      .order("position", { ascending: true });
    const list: Photo[] = [];
    for (const r of rows ?? []) {
      const { data: signed } = await supabase.storage
        .from("profile-photos")
        .createSignedUrl(r.storage_path as string, 3600);
      list.push({
        id: r.id as string,
        path: r.storage_path as string,
        url: signed?.signedUrl ?? "",
        is_primary: r.is_primary as boolean,
        position: r.position as number,
        alt_text: (r.alt_text as string | null) ?? null,
      });
    }
    setPhotos(list);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error("You can share up to five photos.");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please choose a JPEG, PNG, WebP, or HEIC photo.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That image is over 8MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not signed in");
      // Privacy: a phone photo carries GPS coordinates, capture time, and
      // device identifiers in EXIF. Re-encoding through a canvas discards all
      // of it before the bytes ever leave the device.
      const clean = await stripMetadata(file);
      const path = `${uid}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, clean, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const nextPos = (photos[photos.length - 1]?.position ?? -1) + 1;
      const { error: rowErr } = await supabase.from("user_photos").insert({
        user_id: uid,
        storage_path: path,
        position: nextPos,
        is_primary: photos.length === 0,
        moderation: "pending",
      });
      if (rowErr) throw rowErr;
      toast.success("Photo added. Athena will review it briefly.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(p: Photo) {
    if (!confirm("Remove this photo?")) return;
    await supabase.storage.from("profile-photos").remove([p.path]);
    await supabase.from("user_photos").delete().eq("id", p.id);
    await load();
  }

  async function makePrimary(p: Photo) {
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return;
    await supabase.from("user_photos").update({ is_primary: false }).eq("user_id", uid);
    await supabase.from("user_photos").update({ is_primary: true }).eq("id", p.id);
    await load();
  }

  // Accessibility (D6 §18): the member writes the words a screen-reader
  // member will hear. Athena never describes a human being's appearance, and
  // never invents one from the image.
  async function saveAlt(p: Photo, value: string) {
    const text = value.trim().slice(0, 140);
    setPhotos((cur) => cur.map((x) => (x.id === p.id ? { ...x, alt_text: text } : x)));
    await supabase.from("user_photos").update({ alt_text: text || null }).eq("id", p.id);
  }

  return (
    <div className="panel p-5">
      <p className="type-section">Photos</p>
      <p className="type-caption mt-2">
        A few natural photos help someone recognise you. Up to five.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="space-y-1">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
              {p.url ? (
                <img
                  src={p.url}
                  alt={
                    p.is_primary
                      ? "Your primary photo"
                      : `Your photo ${p.position + 1} of ${photos.length}`
                  }
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              {p.is_primary && (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-foreground">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-field/70 px-2 py-1 text-[11px]">
                {!p.is_primary ? (
                  <button
                    onClick={() => void makePrimary(p)}
                    aria-label={`Make photo ${p.position + 1} your primary photo`}
                    className="min-h-11 text-ink"
                  >
                    Make primary
                  </button>
                ) : <span />}
                <button
                  onClick={() => void remove(p)}
                  aria-label={`Remove photo ${p.position + 1}`}
                  className="min-h-11 text-ink"
                >
                  Remove
                </button>
              </div>
            </div>
            <label className="block">
              <span className="sr-only">Describe photo {p.position + 1}</span>
              <input
                type="text"
                defaultValue={p.alt_text ?? ""}
                maxLength={140}
                placeholder="Describe this photo"
                onBlur={(e) => void saveAlt(p, e.target.value)}
                className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-[11px] text-ink"
              />
            </label>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="Add a photo"
              className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border-strong text-sm text-muted-foreground disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "+ Add"}
            </button>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
