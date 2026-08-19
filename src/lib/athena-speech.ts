/**
 * D5 — Athena voice playback (client).
 *
 * Transient by construction: synthesized audio is held as a blob URL for the
 * duration of playback and revoked immediately afterwards. Nothing is stored,
 * cached, or uploaded. No recording of the member is created here.
 *
 * Playback state is reported to the caller so it can be shown as *text*, not
 * only as motion — see the speaking indicator in the Athena surface.
 */
import { supabase } from "@/integrations/supabase/client";

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function speak(
  text: string,
  signal: AbortSignal,
  onState?: (speaking: boolean) => void,
): Promise<void> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    onState?.(true);
    await new Promise<void>((resolve) => {
      const done = () => {
        URL.revokeObjectURL(url);
        onState?.(false);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      signal.addEventListener(
        "abort",
        () => {
          audio.pause();
          done();
        },
        { once: true },
      );
      audio.play().catch(done);
    });
  } catch {
    onState?.(false);
  }
}
