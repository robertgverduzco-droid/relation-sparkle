import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Photo = {
  id: string;
  path: string;
  url: string;
  is_primary: boolean;
  position: number;
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
      .select("id, storage_path, position, is_primary")
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
    if (photos.length >= 6) {
      toast.error("You can share up to six photos.");
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
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${uid}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { contentType: file.type });
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

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">Photos</p>
      <p className="mt-2 text-xs text-ink-soft">
        A few natural photos help others recognize you. Up to six.
      </p>
      {loading ? (
        <p className="mt-3 text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border">
              {p.url ? (
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              {p.is_primary && (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary-foreground">
                  Primary
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/40 px-2 py-1 text-[11px]">
                {!p.is_primary ? (
                  <button onClick={() => void makePrimary(p)} className="text-white/90">Make primary</button>
                ) : <span />}
                <button onClick={() => void remove(p)} className="text-white/90">Remove</button>
              </div>
            </div>
          ))}
          {photos.length < 6 && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground disabled:opacity-40"
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
