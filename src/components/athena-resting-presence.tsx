import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Athena at rest — PRESENTATION ONLY.
 *
 * The same field used during a live voice session, held at its calm listening
 * energy. It owns no state, no audio, no network. It is the thing a member
 * arrives to when they open Athena.
 */
export function AthenaRestingPresence({
  active = false,
  className = "",
}: {
  /** Slightly more energy while she is composing a reply. */
  active?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

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

    let energy = 0.3;
    let t = 0;
    let raf = 0;

    const draw = () => {
      const target = activeRef.current ? 0.52 : 0.3;
      energy += (target - energy) * 0.03;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.33;
      const breath = 1 + Math.sin(t * 0.00085) * 0.035 * (reduced ? 0 : 1);
      const R = base * breath * (0.9 + energy * 0.18);

      for (let k = 0; k < 3; k++) {
        const ang = t * 0.00011 + (k * Math.PI * 2) / 3;
        const ox = Math.cos(ang) * R * 0.13 * (reduced ? 0 : 1);
        const oy = Math.sin(ang) * R * 0.09 * (reduced ? 0 : 1);
        const g = ctx.createRadialGradient(cx + ox, cy + oy, 0, cx + ox, cy + oy, R * 1.5);
        g.addColorStop(0, `rgba(168,151,212,${0.1 + energy * 0.08})`);
        g.addColorStop(0.55, `rgba(168,151,212,${0.05 + energy * 0.04})`);
        g.addColorStop(1, "rgba(77,68,104,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx + ox, cy + oy, R * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.78);
      core.addColorStop(0, `rgba(252,244,234,${0.09 + energy * 0.12})`);
      core.addColorStop(0.42, `rgba(255,205,156,${0.04 + energy * 0.06})`);
      core.addColorStop(1, "rgba(255,184,122,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.78, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,220,176,${0.045 + energy * 0.03})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.42, 0, Math.PI * 2);
      ctx.stroke();

      if (reduced) return; // one static frame
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
    <canvas
      ref={canvasRef}
      aria-hidden
      data-testid="athena-resting-presence"
      className={`h-full w-full ${className}`}
    />
  );
}
