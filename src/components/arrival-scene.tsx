import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  createArrivalAudio,
  playAmbientBuild,
  playPairChime,
  playResolveChord,
} from "@/lib/arrival-audio";

/**
 * Athena arrival — Variant E "Presence".
 *
 * PRESENTATION ONLY. Ported from the approved arrival source: 34 drifting
 * nodes, occasional pair-locking with a warm chime, a perspective grid that
 * fades before the reveal, and the reticle / wordmark / tagline resolve at
 * 5500ms. No handlers, no navigation, no state beyond its own animation.
 */

const NUM_DOTS = 34;
const RESOLVE_AT = 5500;

type Dot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  paired: boolean;
  pairT: number;
  baseAlpha: number;
  justPaired: number;
};

function tempoFactor(elapsed: number) {
  const t = Math.min(elapsed / RESOLVE_AT, 1);
  return t * (2 - t);
}

export function ArrivalScene({
  skip = false,
  footer,
}: {
  /** Repeat visit: resolve immediately, silently, with no gesture gate. */
  skip?: boolean;
  /** The route's own actions, revealed with the wordmark. */
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const [replay, setReplay] = useState(false);
  const still = (reduced || skip) && !replay;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [started, setStarted] = useState(false);
  const [gridIn, setGridIn] = useState(false);
  const [gridFade, setGridFade] = useState(false);
  const [hud, setHud] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [step, setStep] = useState(0); // 1 reticle · 2 wordmark · 3 tagline

  // Repeat visits and reduced motion resolve straight to presence.
  useEffect(() => {
    if (!still) return;
    setGridIn(false);
    setHud(true);
    setRevealed(true);
    setStep(3);
  }, [still]);

  const runReveal = useCallback(() => {
    setRevealed(true);
    const a = setTimeout(() => setStep(1), 150);
    const b = setTimeout(() => setStep(2), 650);
    const c = setTimeout(() => setStep(3), 1500);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(c);
    };
  }, []);

  // ---- Node field ------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const resize = () => {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const dots: Dot[] = Array.from({ length: NUM_DOTS }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.055,
      vy: (Math.random() - 0.5) * 0.055,
      r: 1 + Math.random() * 1,
      paired: false,
      pairT: 0,
      baseAlpha: 0.32 + Math.random() * 0.28,
      justPaired: 0,
    }));

    const audio = still || !started ? null : audioRef.current;
    let startTime: number | null = null;
    let raf = 0;
    let resolveFired = false;
    let cleanupReveal: (() => void) | undefined;

    const frame = (ts: number) => {
      if (startTime === null) startTime = ts;
      const elapsed = still ? RESOLVE_AT : ts - startTime;
      const tempo = tempoFactor(elapsed);
      ctx.clearRect(0, 0, W, H);

      const speedMul = 1 + tempo * 0.9;
      if (!still) {
        for (const d of dots) {
          d.x += d.vx * speedMul;
          d.y += d.vy * speedMul;
          if (d.x < 0 || d.x > W) d.vx *= -1;
          if (d.y < 0 || d.y > H) d.vy *= -1;
        }
      }

      const connectDist = 78 + tempo * 95;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectDist) {
            const proximity = 1 - dist / connectDist;
            const alpha = proximity * 0.4 * (0.4 + tempo * 0.6);
            const bothPaired = a.paired && b.paired;
            if (
              !still &&
              proximity > 0.87 &&
              !a.paired &&
              !b.paired &&
              Math.random() < 0.0028 * (1 + tempo)
            ) {
              a.paired = true;
              b.paired = true;
              a.justPaired = 32;
              b.justPaired = 32;
              if (audio) playPairChime(audio);
            }
            ctx.strokeStyle = bothPaired
              ? `rgba(255, 184, 122, ${alpha * 1.3})`
              : `rgba(168, 151, 212, ${alpha})`;
            ctx.lineWidth = bothPaired ? 0.9 : 0.55;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const d of dots) {
        if (d.paired && d.pairT < 1) d.pairT = Math.min(1, d.pairT + 0.018);
        if (d.justPaired > 0) {
          const p = 1 - d.justPaired / 32;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 220, 176, ${0.35 * (1 - p)})`;
          ctx.lineWidth = 1;
          ctx.arc(d.x, d.y, 3 + p * 10, 0, Math.PI * 2);
          ctx.stroke();
          d.justPaired--;
        }
        const c = d.paired
          ? `rgba(255, ${184 + (220 - 184) * d.pairT}, ${122 + (176 - 122) * d.pairT}, ${
              d.baseAlpha + 0.38 * d.pairT
            })`
          : `rgba(168, 151, 212, ${d.baseAlpha})`;
        ctx.beginPath();
        ctx.fillStyle = c;
        ctx.shadowColor = d.paired ? "rgba(255,200,150,0.55)" : "transparent";
        ctx.shadowBlur = d.paired ? 6 : 0;
        ctx.arc(d.x, d.y, d.r * (d.paired ? 1.5 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (still) return; // one static frame

      if (elapsed > 2200) setGridFade(true);

      if (elapsed > RESOLVE_AT && !resolveFired) {
        resolveFired = true;
        if (audio) playResolveChord(audio);
        cleanupReveal = runReveal();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      cleanupReveal?.();
      window.removeEventListener("resize", resize);
    };
  }, [still, started, runReveal]);

  // ---- Gesture gate ----------------------------------------------------
  const audioRef = useRef<AudioContext | null>(null);

  const begin = () => {
    if (started) return;
    const ctx = createArrivalAudio();
    audioRef.current = ctx;
    if (ctx) {
      // Safari/Chrome start suspended; scheduling before the context is
      // actually running produces silence, so the build waits for resume.
      void ctx
        .resume()
        .catch(() => {})
        .finally(() => playAmbientBuild(ctx));
    }
    setGridIn(true);
    setTimeout(() => setHud(true), 400);
    setStarted(true);
  };

  /** Repeat visit: the member can ask for the arrival again, with sound. */
  const replayArrival = () => {
    setRevealed(false);
    setStep(0);
    setHud(false);
    setGridIn(false);
    setGridFade(false);
    setStarted(false);
    setReplay(true);
  };


  useEffect(() => {
    return () => {
      audioRef.current?.close().catch(() => {});
    };
  }, []);

  return (
    <div
      data-athena-arrival
      className="relative h-[100dvh] w-full overflow-hidden bg-[var(--void)]"
      style={{ perspective: "600px" }}
    >
      {/* Perspective grid — in, then almost entirely out before the reveal. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(150,135,190,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(150,135,190,0.09) 1px, transparent 1px)",
          backgroundSize: "70px 70px",
          transform: "rotateX(62deg) scale(2.2) translateY(10%)",
          transformOrigin: "center 70%",
          opacity: gridIn && !gridFade ? 1 : 0,
          transition: gridFade ? "opacity 3.5s ease" : "opacity 3s ease",
        }}
      />

      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(3,3,4,0.92) 88%)",
        }}
      />

      {/* Minimal framing. */}
      <div
        aria-hidden
        className="absolute left-7 top-[26px] font-light uppercase"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.2em",
          color: "var(--lavender-dim)",
          opacity: hud ? 0.55 : 0,
          transition: "opacity 2s ease",
        }}
      >
        ATHENA
      </div>
      <div
        aria-hidden
        className="absolute right-7 top-[26px] h-[5px] w-[5px] rounded-full"
        style={{
          background: "var(--lavender-dim)",
          opacity: hud ? 0.5 : 0,
          transition: "opacity 2s ease",
        }}
      />

      {/* Reveal. */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-6"
        style={{
          opacity: revealed ? 1 : 0,
          pointerEvents: revealed ? "auto" : "none",
          transition: "opacity 2s ease",
        }}
      >
        <div
          aria-hidden
          className="relative mb-6 h-[92px] w-[92px]"
          style={{
            opacity: step >= 1 ? 1 : 0,
            transform: step >= 1 ? "scale(1)" : "scale(1.15)",
            transition:
              "opacity 1.6s ease, transform 2.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid var(--amber-bright)", opacity: 0.85 }}
          />
          <span
            className="absolute rounded-full"
            style={{
              inset: "20px",
              border: "1px solid rgba(255, 220, 176, 0.35)",
            }}
          />
          {(
            [
              { top: "-1.5px", left: "50%", transform: "translateX(-50%)" },
              { bottom: "-1.5px", left: "50%", transform: "translateX(-50%)" },
              { left: "-1.5px", top: "50%", transform: "translateY(-50%)" },
              { right: "-1.5px", top: "50%", transform: "translateY(-50%)" },
            ] as const
          ).map((pos, i) => (
            <span
              key={i}
              className="absolute h-[3px] w-[3px] rounded-full"
              style={{ ...pos, background: "var(--amber-bright)", opacity: 0.9 }}
            />
          ))}
        </div>

        <h1
          className="font-extralight"
          style={{
            fontSize: "clamp(2rem, 7.2vw, 4.2rem)",
            letterSpacing: "0.52em",
            textIndent: "0.52em",
            color: "var(--ink)",
            textShadow:
              "0 0 36px rgba(255, 220, 176, 0.3), 0 0 80px rgba(168, 151, 212, 0.28)",
            opacity: step >= 2 ? 1 : 0,
            transform: step >= 2 ? "translateY(0)" : "translateY(4px)",
            transition:
              "opacity 2s ease, transform 2.2s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          ATHENA
        </h1>

        <p
          className="mt-5 font-light"
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.32em",
            textIndent: "0.32em",
            color: "var(--lavender-dim)",
            opacity: step >= 3 ? 1 : 0,
            transition: "opacity 1.8s ease 0.5s",
          }}
        >
          SHE IS PRESENT
        </p>

        {footer ? (
          <div
            className="mt-12 w-full max-w-[21rem]"
            style={{
              opacity: step >= 3 ? 1 : 0,
              pointerEvents: step >= 3 ? "auto" : "none",
              transition: "opacity 1.6s ease 0.9s",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>

      {/* Gesture gate — audio cannot start without it. */}
      {!still && !started ? (
        <button
          type="button"
          onClick={begin}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[18px] bg-[var(--void)]"
        >
          <span
            className="font-light uppercase"
            style={{
              color: "var(--lavender)",
              fontSize: "0.78rem",
              letterSpacing: "0.24em",
              opacity: 0.7,
            }}
          >
            Tap to begin
          </span>
          <span
            aria-hidden
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full text-[1.25rem]"
            style={{
              border: "1px solid var(--lavender-dim)",
              color: "var(--amber-bright)",
            }}
          >
            ▶
          </span>
        </button>
      ) : null}
    </div>
  );
}
