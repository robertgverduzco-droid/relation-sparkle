import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * The orb field — PRESENTATION ONLY.
 *
 * Five destinations drifting in the void. It owns no data, no routing and no
 * state beyond its own canvas: every label is passed in, and tapping a light
 * calls `onEnter` with that light's id after the bloom completes. Ported from
 * the approved athena-app-flow reference: 44-dot background network connecting
 * at 150px, line alpha prox × 0.34, occasional amber pairing, vignette to
 * rgba(3,3,4,0.88) at 94%.
 */

export type OrbId = "today" | "athena" | "meet" | "messages" | "you";

export type OrbSpec = {
  id: OrbId;
  name: string;
  /** 0 = lavender, 1 = amber. Amber means a person is waiting, nothing else. */
  warm: number;
  /** Amber status line — only ever a waiting human. */
  badge?: string | null;
  /** Quiet lavender-dim status line. */
  sub?: string | null;
};

type Node = OrbSpec & {
  rx: number;
  ry: number;
  r: number;
  bx: number;
  by: number;
  x: number;
  y: number;
  phase: number;
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  scale: number;
  targetScale: number;
  alpha: number;
  targetAlpha: number;
};

const GEOMETRY: Record<OrbId, { rx: number; ry: number; r: number }> = {
  today: { rx: 0.5, ry: 0.44, r: 32 },
  athena: { rx: 0.23, ry: 0.28, r: 25 },
  meet: { rx: 0.77, ry: 0.25, r: 28 },
  messages: { rx: 0.26, ry: 0.68, r: 23 },
  you: { rx: 0.75, ry: 0.71, r: 26 },
};

const CONNECT = 150;

export function OrbField({
  orbs,
  onEnter,
}: {
  orbs: OrbSpec[];
  onEnter: (id: OrbId) => void;
}) {
  const still = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const labelHostRef = useRef<HTMLDivElement | null>(null);
  const enteringRef = useRef<HTMLDivElement | null>(null);
  const orbsRef = useRef(orbs);
  orbsRef.current = orbs;
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    const host = hostRef.current;
    const cv = canvasRef.current;
    const labelHost = labelHostRef.current;
    const enteringEl = enteringRef.current;
    if (!host || !cv || !labelHost || !enteringEl) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let DPR = 1;
    let t = 0;
    let raf = 0;
    let leaving: OrbId | null = null;
    let disposed = false;

    const NODES: Node[] = orbsRef.current.map((o) => ({
      ...o,
      ...GEOMETRY[o.id],
      bx: 0,
      by: 0,
      x: 0,
      y: 0,
      phase: 0,
      f1: 0,
      f2: 0,
      f3: 0,
      f4: 0,
      scale: 1,
      targetScale: 1,
      alpha: 1,
      targetAlpha: 1,
    }));

    type Dust = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      a: number;
      paired: boolean;
      pairT: number;
    };
    let dust: Dust[] = [];

    const labelEls: Partial<Record<OrbId, HTMLDivElement>> = {};
    for (const n of NODES) {
      const el = document.createElement("div");
      el.className = "orb-label";
      const name = document.createElement("div");
      name.className = "orb-label-name";
      name.textContent = n.name;
      el.appendChild(name);
      if (n.badge) {
        const b = document.createElement("span");
        b.className = "orb-label-badge";
        b.textContent = n.badge;
        el.appendChild(b);
      }
      if (n.sub) {
        const s = document.createElement("span");
        s.className = "orb-label-sub";
        s.textContent = n.sub;
        el.appendChild(s);
      }
      labelHost.appendChild(el);
      labelEls[n.id] = el;
    }

    const resize = () => {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = host.clientWidth;
      H = host.clientHeight;
      cv.width = W * DPR;
      cv.height = H * DPR;
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      for (const n of NODES) {
        n.bx = n.rx * W;
        n.by = n.ry * H;
        n.x = n.bx;
        n.y = n.by;
        n.phase = Math.random() * Math.PI * 2;
        n.f1 = 0.085 + Math.random() * 0.05;
        n.f2 = 0.13 + Math.random() * 0.06;
        n.f3 = 0.075 + Math.random() * 0.05;
        n.f4 = 0.115 + Math.random() * 0.06;
      }

      dust = [];
      for (let i = 0; i < 44; i++) {
        dust.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.045,
          vy: (Math.random() - 0.5) * 0.045,
          r: 0.9 + Math.random() * 1.0,
          a: 0.26 + Math.random() * 0.22,
          paired: false,
          pairT: 0,
        });
      }
    };

    const draw = () => {
      if (disposed) return;
      ctx.clearRect(0, 0, W, H);

      if (!still) {
        for (const d of dust) {
          d.x += d.vx;
          d.y += d.vy;
          if (d.x < 0 || d.x > W) d.vx *= -1;
          if (d.y < 0 || d.y > H) d.vy *= -1;
        }
      }

      for (let i = 0; i < dust.length; i++) {
        for (let j = i + 1; j < dust.length; j++) {
          const a = dust[i];
          const b = dust[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist >= CONNECT) continue;
          const prox = 1 - dist / CONNECT;
          if (!still && prox > 0.86 && !a.paired && !b.paired && Math.random() < 0.0022) {
            a.paired = true;
            b.paired = true;
          }
          const warm = a.paired && b.paired;
          ctx.strokeStyle = warm
            ? `rgba(255,184,122,${prox * 0.42})`
            : `rgba(168,151,212,${prox * 0.34})`;
          ctx.lineWidth = warm ? 0.8 : 0.65;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const d of dust) {
        if (d.paired && d.pairT < 1) d.pairT = Math.min(1, d.pairT + 0.007);
        ctx.fillStyle = d.paired
          ? `rgba(255,${184 + 36 * d.pairT},${122 + 54 * d.pairT},${d.a + 0.22 * d.pairT})`
          : `rgba(168,151,212,${d.a})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * (d.paired ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      for (const n of NODES) {
        if (!still) {
          n.x = n.bx + Math.sin(t * n.f1 + n.phase) * 20 + Math.sin(t * n.f2 + n.phase * 1.7) * 11;
          n.y = n.by + Math.cos(t * n.f3 + n.phase) * 17 + Math.cos(t * n.f4 + n.phase * 2.3) * 9;
        }
        n.scale += (n.targetScale - n.scale) * 0.1;
        n.alpha += (n.targetAlpha - n.alpha) * 0.1;

        const breathe = still ? 1 : 1 + Math.sin(t * 0.9 + n.phase) * 0.045;
        const R = n.r * n.scale * breathe;
        const A = n.alpha;

        const cLav = [205, 192, 239];
        const cAmb = [255, 200, 150];
        const c = [
          cLav[0] + (cAmb[0] - cLav[0]) * n.warm,
          cLav[1] + (cAmb[1] - cLav[1]) * n.warm,
          cLav[2] + (cAmb[2] - cLav[2]) * n.warm,
        ];

        const halo = ctx.createRadialGradient(n.x, n.y, R * 0.2, n.x, n.y, R * 3.2);
        halo.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.11 * A})`);
        halo.addColorStop(1, "rgba(3,3,4,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(n.x, n.y, R * 3.2, 0, Math.PI * 2);
        ctx.fill();

        const body = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, R);
        body.addColorStop(0, `rgba(250,246,255,${0.36 * A})`);
        body.addColorStop(0.45, `rgba(${c[0]},${c[1]},${c[2]},${0.19 * A})`);
        body.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(n.x, n.y, R, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.17 * A})`;
        ctx.lineWidth = 0.7;
        ctx.arc(n.x, n.y, R * 1.5, 0, Math.PI * 2);
        ctx.stroke();

        const el = labelEls[n.id];
        if (el) {
          el.style.left = `${n.x}px`;
          el.style.top = `${n.y + R * 1.5 + 14}px`;
          el.style.opacity = A < 0.6 ? String(A * 0.5) : "";
        }
      }

      t += 0.016;
      if (!document.hidden && !leaving) raf = requestAnimationFrame(draw);
      else if (leaving) raf = requestAnimationFrame(draw);
    };

    const enter = (n: Node) => {
      if (leaving) return;
      leaving = n.id;
      for (const o of NODES) {
        const isIt = o.id === n.id;
        o.targetScale = isIt ? 2.6 : 0.6;
        o.targetAlpha = isIt ? 1 : 0;
      }
      for (const key of Object.keys(labelEls) as OrbId[]) {
        const el = labelEls[key];
        if (el) el.style.opacity = "0";
      }
      host.dataset.blooming = "true";
      const label = enteringEl.querySelector("span");
      if (label) label.textContent = n.name;
      enteringEl.dataset.show = "true";
      window.setTimeout(() => {
        if (disposed) return;
        onEnterRef.current(n.id);
      }, 900);
    };

    const onClick = (e: MouseEvent) => {
      if (leaving) return;
      const rect = cv.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let hit: Node | null = null;
      let best = Infinity;
      for (const n of NODES) {
        const d = Math.hypot(px - n.x, py - n.y);
        const target = Math.max(n.r * 2.0, 48);
        if (d < target && d < best) {
          best = d;
          hit = n;
        }
      }
      if (hit) enter(hit);
    };

    const onVisibility = () => {
      if (!document.hidden && !disposed) raf = requestAnimationFrame(draw);
    };

    cv.addEventListener("click", onClick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (still) draw();
    else raf = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cv.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const key of Object.keys(labelEls) as OrbId[]) labelEls[key]?.remove();
    };
  }, [still]);

  return (
    <div ref={hostRef} className="orb-field" data-testid="orb-field">
      <canvas ref={canvasRef} className="orb-field-canvas" aria-hidden />
      <div className="orb-field-vignette" aria-hidden />
      <div ref={labelHostRef} className="orb-field-labels" aria-hidden />
      <div ref={enteringRef} className="orb-field-entering" aria-hidden>
        <span className="orb-sys" />
      </div>

      {/* Accessible, always-available equivalent of the drifting lights. */}
      <ul className="sr-only">
        {orbs.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => onEnter(o.id)} data-testid={`orb-${o.id}`}>
              {[o.name, o.badge, o.sub].filter(Boolean).join(" — ")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
