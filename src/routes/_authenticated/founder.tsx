import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getFounderStatus,
  getFounderHistory,
  sendFounderMessage,
} from "@/lib/founder.functions";
import { supabase } from "@/integrations/supabase/client";
import { acquireMicrophone, micFailureMessage } from "@/lib/mic-access";

export const Route = createFileRoute("/_authenticated/founder")({
  head: () => ({
    meta: [
      { title: "Founder Dialogue — Relationship Intelligence" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FounderDialogueScreen,
});

type Turn = { role: "founder" | "athena"; content: string };

/** Bearer token for /api/stt, which authenticates every request. */
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function FounderDialogueScreen() {
  const status = useServerFn(getFounderStatus);
  const history = useServerFn(getFounderHistory);
  const send = useServerFn(sendFounderMessage);

  const [state, setState] = useState<"checking" | "denied" | "ready">("checking");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ---- Voice input (mic → text in the draft box; Athena still replies in text) ----
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || transcribing || busy) return;
    const mic = await acquireMicrophone({ audio: true });
    if (!mic.ok) {
      toast(micFailureMessage(mic.reason));
      return;
    }
    try {
      const stream = mic.stream;
      streamRef.current = stream;
      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];
      const mimeType = candidates.find((c) =>
        typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        stopStream();
        if (blob.size < 1024) {
          setRecording(false);
          setTranscribing(false);
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
          fd.append("file", blob, `voice.${ext}`);
          const res = await fetch("/api/stt", {
            method: "POST",
            body: fd,
            headers: await authHeader(),
          });
          if (!res.ok) {
            toast("I couldn't hear that clearly. Please try again.");
            return;
          }
          const { text } = (await res.json()) as { text?: string };
          const clean = (text ?? "").trim();
          if (!clean) {
            toast("I didn't catch that. Please try again.");
            return;
          }
          setDraft((prev) => (prev ? `${prev.trimEnd()} ${clean}` : clean));
        } catch {
          toast("Voice input didn't go through. Please try again.");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast(micFailureMessage("init-failed", "Your microphone is fine — recording didn't start. You can try again, or type."));
      stopStream();
    }
  }, [recording, transcribing, busy, stopStream]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    setRecording(false);
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* ignore */ }
    } else {
      stopStream();
    }
  }, [stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await status({});
        if (!mounted) return;
        if (!s.isFounder) {
          setState("denied");
          return;
        }
        const h = await history({});
        if (!mounted) return;
        setTurns(h.turns as Turn[]);
        setState("ready");
      } catch {
        if (mounted) setState("denied");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [status, history]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setTurns((t) => [...t, { role: "founder", content: message }]);
    setBusy(true);
    try {
      const res = await send({ data: { message } });
      setTurns((t) => [...t, { role: "athena", content: res.reply }]);
    } catch {
      setTurns((t) => [
        ...t,
        { role: "athena", content: "Something went wrong reaching me just now. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Checking…</p>
      </section>
    );
  }

  if (state === "denied") {
    return (
      <section className="flex min-h-dvh items-center justify-center bg-background px-6">
        <p className="text-center text-sm text-muted-foreground">
          This page isn’t available.
        </p>
      </section>
    );
  }

  return (
    <section className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60 px-5 py-4">
        <h1 className="text-base font-medium text-foreground">Founder Dialogue</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          System governance. No member information is reachable here.
        </p>
        <a
          href="/founder/intelligence"
          className="mt-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
        >
          What I have learned →
        </a>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {turns.length === 0 && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ask me about the system, Robert — doctrine, my education, where runtime and
            Constitution disagree, where the product makes my role harder.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={
              t.role === "founder"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary/10 px-4 py-3 text-sm text-foreground"
                : "max-w-[95%] whitespace-pre-wrap text-sm leading-relaxed text-foreground"
            }
          >
            {t.content}
          </div>
        ))}
        {busy && <p className="text-xs text-muted-foreground">Athena is thinking…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-border/60 px-5 py-4">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Speak with Athena about the system…"
            className="flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy || transcribing}
            aria-label={recording ? "Stop recording" : "Voice input"}
            className={`rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${
              recording
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {transcribing ? "…" : recording ? "■" : "🎙"}
          </button>
          <button
            type="submit"
            disabled={busy || recording || transcribing || draft.trim().length === 0}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>
        {(recording || transcribing) && (
          <p className="mt-2 text-xs text-muted-foreground">
            {recording ? "Listening… tap again to stop." : "Transcribing…"}
          </p>
        )}
      </form>
    </section>
  );
}
