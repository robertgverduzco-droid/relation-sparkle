import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The Athena connection field (D4 / §17–§19).
 *
 * Independence dominates. Points drift alone; proximity does not produce
 * connection. Rarely — and never often enough to imply abundance, live
 * members, or matchmaking activity — two points briefly align, illuminate,
 * carry a relational tint, and then continue as two distinct points.
 * They never merge, snap, burst, or reward.
 */

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  drift: number;
  relationalUntil: number;
  partner: number | null;
  alignAt: number;
};

type Alignment = { a: number; b: number; t: number };

export type FieldIntensity = "quiet" | "attending" | "organizing";

export function ConnectionField({
  intensity = "quiet",
  className,
}: {
  intensity?: FieldIntensity;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef<FieldIntensity>(intensity);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const points: Point[] = [];
    const alignments: Alignment[] = [];
    let raf = 0;
    let running = true;
    // Connection is rare by design: 45–90s between meaningful events.
    let nextEventAt = performance.now() + 20000 + Math.random() * 25000;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      points.length = 0;
      const area = width * height;
      // Sparse. A field, not a starfield.
      const count = Math.min(90, Math.max(38, Math.floor(area / 11000)));
      for (let i = 0; i < count; i++) {
        const speed = 0.03 + Math.random() * 0.05;
        const ang = Math.random() * Math.PI * 2;
        points.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          r: 0.6 + Math.random() * 1.1,
          drift: 0.6 + Math.random() * 0.8,
          relationalUntil: 0,
          partner: null,
          alignAt: 0,
        });
      }
    };

    resize();
    seed();

    const onResize = () => {
      resize();
      seed();
      if (!running) drawStatic();
    };
    window.addEventListener("resize", onResize);

    const beginAlignment = (now: number) => {
      const free: number[] = [];
      for (let i = 0; i < points.length; i++) {
        if (points[i].partner == null && points[i].relationalUntil < now) free.push(i);
      }
      if (free.length < 2) return;
      const a = free[Math.floor(Math.random() * free.length)];
      let b = -1;
      let best = Infinity;
      for (const j of free) {
        if (j === a) continue;
        const d = Math.hypot(points[j].x - points[a].x, points[j].y - points[a].y);
        if (d < best) {
          best = d;
          b = j;
        }
      }
      // Proximity alone is not connection — the pair must also be plausible.
      if (b < 0 || best > Math.min(width, height) * 0.3 || best < 40) return;
      points[a].partner = b;
      points[b].partner = a;
      points[a].alignAt = now;
      points[b].alignAt = now;
      alignments.push({ a, b, t: now });
      nextEventAt = now + 45000 + Math.random() * 45000;
    };

    const step = (now: number) => {
      const org =
        intensityRef.current === "organizing" ? 1 : intensityRef.current === "attending" ? 0.5 : 0;

      if (now >= nextEventAt) beginAlignment(now);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.partner != null) {
          const q = points[p.partner];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          // Restrained alignment: they approach, never arrive on top of
          // each other. Two remain two.
          const target = 26;
          const pull = (dist - target) * 0.0012;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
          p.vx *= 0.985;
          p.vy *= 0.985;
          if (now - p.alignAt > 7000) {
            p.partner = null;
            p.relationalUntil = now + 9000;
            const ang = Math.random() * Math.PI * 2;
            const s = 0.035 + Math.random() * 0.03;
            p.vx = Math.cos(ang) * s;
            p.vy = Math.sin(ang) * s;
          }
        } else {
          // Independent drift. Organization tightens motion slightly rather
          // than adding activity.
          const jitter = 0.0018 * p.drift * (1 - org * 0.65);
          p.vx += (Math.random() - 0.5) * jitter;
          p.vy += (Math.random() - 0.5) * jitter;
          const maxV = 0.12 - org * 0.045;
          p.vx = Math.max(-maxV, Math.min(maxV, p.vx));
          p.vy = Math.max(-maxV, Math.min(maxV, p.vy));
        }

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -4) p.x = width + 4;
        if (p.x > width + 4) p.x = -4;
        if (p.y < -4) p.y = height + 4;
        if (p.y > height + 4) p.y = -4;
      }
    };

    const render = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      // Relational threads — thin, brief, quiet.
      for (let i = alignments.length - 1; i >= 0; i--) {
        const al = alignments[i];
        const age = (now - al.t) / 1000;
        if (age > 9) {
          alignments.splice(i, 1);
          continue;
        }
        const fade = age < 1.2 ? age / 1.2 : Math.max(0, 1 - (age - 6) / 3);
        const a = points[al.a];
        const b = points[al.b];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(196, 168, 206, ${0.3 * fade})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      for (const p of points) {
        const related = p.partner != null || p.relationalUntil > now;
        const glow = related ? "rgba(196, 168, 206, 0.2)" : "rgba(242, 239, 232, 0.1)";
        const core = related ? "rgba(206, 182, 214, 0.92)" : "rgba(242, 239, 232, 0.72)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.4, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      }
    };

    const drawStatic = () => {
      render(performance.now());
    };

    const loop = (now: number) => {
      step(now);
      render(now);
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Battery: no work while the page is hidden.
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reducedMotion) {
      running = false;
      drawStatic();
    } else {
      running = false;
      start();
    }

    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 12%, color-mix(in oklab, var(--athena) 12%, var(--field)) 0%, var(--field) 62%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
