import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Athena Voice Presence — PRESENTATION ONLY.
 *
 * Renders the approved full-screen voice environment over the existing live
 * conversation state. It owns no state machine, no audio, no microphone, no
 * network, no storage. Every value it shows is passed in; every action it
 * offers is a handler passed in from the existing surface.
 */

export type LivePresenceStatus = "connecting" | "listening" | "speaking";

const LABEL: Record<LivePresenceStatus, string> = {
  connecting: "Athena is thinking",
  listening: "Athena is listening",
  speaking: "Athena is speaking",
};

/** Approved energy relationships per state (Reference B). */
const FIELD: Record<
  LivePresenceStatus,
  { energy: number; drift: number; rate: number; depth: number }
> = {
  listening: { energy: 0.34, drift: 0.55, rate: 0.85, depth: 0.038 },
  connecting: { energy: 0.46, drift: 1.3, rate: 1.5, depth: 0.02 },
  speaking: { energy: 0.78, drift: 1.0, rate: 1.05, depth: 0.016 },
};

const POINTS = 20;

function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function AthenaLivePresence({
  status,
  caption,
  onEnd,
}: {
  status: LivePresenceStatus;
  caption?: string;
  onEnd: () => void;
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<LivePresenceStatus>(status);
  statusRef.current = status;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pts = Array.from({ length: POINTS }, (_, i) => ({
      x: seeded(i, 1),
      y: seeded(i, 2),
      vx: (seeded(i, 3) - 0.5) * 0.0006,
      vy: (seeded(i, 4) - 0.5) * 0.0006,
      r: 0.9 + seeded(i, 5) * 0.8,
      a: 0.16 + seeded(i, 6) * 0.14,
    }));

    // Eased energy, so state changes never snap.
    let energy = FIELD[statusRef.current].energy;
    let raf = 0;
    let t = 0;

    const draw = () => {
      const target = FIELD[statusRef.current];
      energy += (target.energy - energy) * 0.035;
      ctx.clearRect(0, 0, w, h);

      // ---- Ambient field -------------------------------------------------
      const px = pts.map((p) => ({ ...p, sx: p.x * w, sy: p.y * h }));
      ctx.lineWidth = 0.5;
      for (let i = 0; i < px.length; i++) {
        for (let j = i + 1; j < px.length; j++) {
          const dx = px[i].sx - px[j].sx;
          const dy = px[i].sy - px[j].sy;
          const d = Math.hypot(dx, dy);
          if (d < 96) {
            ctx.strokeStyle = `rgba(168,151,212,${(1 - d / 96) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(px[i].sx, px[i].sy);
            ctx.lineTo(px[j].sx, px[j].sy);
            ctx.stroke();
          }
        }
      }
      for (const p of px) {
        ctx.fillStyle = `rgba(168,151,212,${p.a})`;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- Central presence ----------------------------------------------
      const cx = w / 2;
      const cy = h * 0.42;
      const base = Math.min(w, h) * 0.23;
      const breath =
        1 + Math.sin(t * 0.001 * target.rate) * target.depth * (reduced ? 0 : 1);
      const R = base * breath * (0.9 + energy * 0.18);

      // Lavender field — dominant, soft, in lobes rather than a hard ball.
      for (let k = 0; k < 3; k++) {
        const ang = t * 0.00012 * target.drift + (k * Math.PI * 2) / 3;
        const ox = Math.cos(ang) * R * 0.14 * (reduced ? 0 : 1);
        const oy = Math.sin(ang) * R * 0.1 * (reduced ? 0 : 1);
        const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, R * 1.5);
        g.addColorStop(0, `rgba(168,151,212,${0.1 + energy * 0.08})`);
        g.addColorStop(0.55, `rgba(168,151,212,${0.05 + energy * 0.04})`);
        g.addColorStop(1, "rgba(77,68,104,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, R * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Restrained warm core — ivory centre, amber falloff, warmth to zero.
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.78);
      core.addColorStop(0, `rgba(252,244,234,${0.1 + energy * 0.14})`);
      core.addColorStop(0.42, `rgba(255,205,156,${0.05 + energy * 0.07})`);
      core.addColorStop(1, "rgba(255,184,122,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
      ctx.fill();

      // Hairline ring at ~1.44R, barely there.
      ctx.strokeStyle = `rgba(255,220,176,${0.05 + energy * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.44, 0, Math.PI * 2);
      ctx.stroke();

      if (reduced) return; // static frame

      for (const p of pts) {
        p.x += p.vx * target.drift * 50 * 0.03;
        p.y += p.vy * target.drift * 50 * 0.03;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
      }
      t += 16;
      raf = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduced]);

  return (
    <div
      data-athena-voice-presence
      className="fixed inset-0 z-40 flex justify-center bg-[#030304]"
    >
      <div className="relative flex h-full w-full max-w-[480px] flex-col">
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 42%, rgba(3,3,4,0) 35%, rgba(3,3,4,0.92) 100%)",
          }}
        />

        {/* Top treatment — state, stated in words. */}
        <div className="relative flex items-center justify-between px-6 pt-8">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ border: "1px solid rgba(168,151,212,0.15)" }}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full"
              style={{ background: "rgba(168,151,212,0.55)" }}
            />
          </span>
          <span
            role="status"
            aria-live="polite"
            className="uppercase"
            style={{
              fontSize: "0.6rem",
              letterSpacing: "0.2em",
              color: status === "speaking" ? "rgba(255,184,122,0.55)" : "rgba(77,68,104,1)",
            }}
          >
            {LABEL[status]}
          </span>
          <span className="h-9 w-9" aria-hidden />
        </div>

        {/* Caption — the words as they arrive, presentation only. */}
        <div className="relative mt-auto px-8 pb-8 text-center">
          {caption ? (
            <p
              className="mx-auto max-w-[22rem] text-[15px] leading-relaxed"
              style={{ color: "rgba(244,240,251,0.78)" }}
            >
              {caption}
            </p>
          ) : null}
        </div>

        {/* Bottom control — existing live controls only. */}
        <div className="relative flex justify-center pb-10">
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: "rgba(8,8,11,0.5)",
              backdropFilter: "blur(22px)",
              border: "1px solid rgba(168,151,212,0.11)",
              borderRadius: "40px",
            }}
          >
            <button
              type="button"
              onClick={onEnd}
              aria-label="End live conversation"
              className="flex h-12 w-12 items-center justify-center rounded-full transition-opacity hover:opacity-80"
              style={{ border: "1px solid rgba(77,68,104,0.9)" }}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path
                  d="M6 6 L18 18 M18 6 L6 18"
                  fill="none"
                  stroke="rgba(205,192,239,0.65)"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
