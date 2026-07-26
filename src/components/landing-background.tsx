import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  drift: number;
  violet: boolean;
  violetAt: number;
  pairedWith: number | null;
  merged: boolean;
};

type Ripple = { x: number; y: number; t: number };

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    const particles: Particle[] = [];
    const ripples: Ripple[] = [];
    let lastConnectionAt = performance.now();
    let nextConnectionDelay = 4000 + Math.random() * 4000;
    let raf = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      const area = width * height;
      const count = Math.min(260, Math.max(120, Math.floor(area / 3200)));
      for (let i = 0; i < count; i++) {
        const speed = 0.08 + Math.random() * 0.08; // 0.08–0.16, varied
        const ang = Math.random() * Math.PI * 2;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(ang) * speed,
          vy: Math.sin(ang) * speed,
          r: 0.75 + Math.random() * 1.65, // ~17% larger
          drift: 0.7 + Math.random() * 0.7, // per-particle variation
          violet: false,
          violetAt: 0,
          pairedWith: null,
          merged: false,
        });
      }
    };

    resize();
    seed();
    window.addEventListener("resize", resize);

    const playChime = () => {
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        const actx = audioCtxRef.current!;
        if (actx.state === "suspended") return; // requires user gesture
        const now = actx.currentTime;
        const freqs = [880, 1318.5]; // A5, E6 — soft interval
        freqs.forEach((f, i) => {
          const osc = actx.createOscillator();
          const gain = actx.createGain();
          osc.type = "sine";
          osc.frequency.value = f;
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2 + i * 0.2);
          osc.connect(gain).connect(actx.destination);
          osc.start(now);
          osc.stop(now + 2.4);
        });
      } catch {
        /* noop */
      }
    };

    const tryStartConnection = (now: number) => {
      if (now - lastConnectionAt < nextConnectionDelay) return;
      // pick two random unpaired white particles that are relatively close
      const whites: number[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.violet && !p.pairedWith && !p.merged) whites.push(i);
      }
      if (whites.length < 2) return;
      // pick a random one, find nearest neighbor within radius
      const a = whites[Math.floor(Math.random() * whites.length)];
      const pa = particles[a];
      let bestB = -1;
      let bestD = Infinity;
      for (const j of whites) {
        if (j === a) continue;
        const pj = particles[j];
        const dx = pj.x - pa.x;
        const dy = pj.y - pa.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD) {
          bestD = d2;
          bestB = j;
        }
      }
      if (bestB < 0) return;
      const maxDist = Math.min(width, height) * 0.35;
      if (Math.sqrt(bestD) > maxDist) return;
      pa.pairedWith = bestB;
      particles[bestB].pairedWith = a;
      lastConnectionAt = now;
      nextConnectionDelay = 8000 + Math.random() * 7000; // 8–15s
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);

      tryStartConnection(now);

      // update
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.merged) continue;
        if (p.pairedWith != null) {
          const q = particles[p.pairedWith];
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const dist = Math.hypot(dx, dy) || 0.0001;
          // gentle attraction
          const pull = 0.015;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
          // damping
          p.vx *= 0.92;
          p.vy *= 0.92;

          if (dist < 3 && i < p.pairedWith) {
            // meet: only fire once per pair (i < partner index)
            ripples.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, t: now });
            playChime();
            p.violet = true;
            q.violet = true;
            p.violetAt = now;
            q.violetAt = now;
            p.pairedWith = null;
            q.pairedWith = null;
            // nudge apart, resume drift
            const ang = Math.random() * Math.PI * 2;
            const s = 0.11 + Math.random() * 0.05;
            p.vx = Math.cos(ang) * s;
            p.vy = Math.sin(ang) * s;
            q.vx = -p.vx;
            q.vy = -p.vy;
          }
        } else {
          // subtle brownian drift, per-particle variation
          p.vx += (Math.random() - 0.5) * 0.003 * p.drift;
          p.vy += (Math.random() - 0.5) * 0.003 * p.drift;
          const maxV = 0.22;
          p.vx = Math.max(-maxV, Math.min(maxV, p.vx));
          p.vy = Math.max(-maxV, Math.min(maxV, p.vy));
        }

        p.x += p.vx;
        p.y += p.vy;

        // wrap
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;
        if (p.y < -5) p.y = height + 5;
        if (p.y > height + 5) p.y = -5;
      }

      // ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        const age = (now - rp.t) / 1000;
        if (age > 3.0) {
          ripples.splice(i, 1);
          continue;
        }
        const radius = age * 82; // slightly farther
        const alpha = Math.max(0, 1 - age / 3.0) * 0.5;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(190, 165, 230, ${alpha})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // brighter pulse flash in first 500ms
        if (age < 0.5) {
          const pa = 1 - age / 0.5;
          const grd = ctx.createRadialGradient(rp.x, rp.y, 0, rp.x, rp.y, 60);
          grd.addColorStop(0, `rgba(255,255,255,${0.9 * pa})`);
          grd.addColorStop(0.4, `rgba(220,205,245,${0.5 * pa})`);
          grd.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = grd;
          ctx.fillRect(rp.x - 60, rp.y - 60, 120, 120);
        }
      }

      // particles
      for (const p of particles) {
        if (p.merged) continue;
        let color: string;
        let glow: string;
        let glowScale = 3;
        if (p.violet) {
          // brief brightness boost after violetAt for ~1s
          const boostAge = (now - p.violetAt) / 1000;
          if (boostAge < 1) {
            const b = 1 - boostAge; // 1 → 0
            color = `rgba(210, 190, 245, ${0.95 + 0.05 * b})`;
            glow = `rgba(210, 190, 245, ${0.35 + 0.35 * b})`;
            glowScale = 3 + 1.5 * b;
          } else {
            color = "rgba(178, 156, 222, 0.98)";
            glow = "rgba(178, 156, 222, 0.32)";
          }
        } else {
          color = "rgba(255, 255, 255, 1)";
          glow = "rgba(255, 255, 255, 0.4)";
        }
        // glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * glowScale, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        // core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    const resumeAudio = () => {
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        audioCtxRef.current?.resume();
      } catch {
        /* noop */
      }
      window.removeEventListener("pointerdown", resumeAudio);
    };
    window.addEventListener("pointerdown", resumeAudio);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", resumeAudio);
    };
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #cfe4f5 0%, #e6f0fa 45%, #ffffff 100%)",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
