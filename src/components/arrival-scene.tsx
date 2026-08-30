import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Arrival environment — presentation only.
 *
 * A cinematic, dimensional horizon built entirely from CSS/SVG gradients so
 * there is no external image dependency. Deep void above, distant ranges at
 * the horizon, a luminous path drawing the eye to centre, and a still
 * reflective plane below. Motion is limited to a slow star drift and a
 * horizon shimmer; both stop under reduced-motion.
 */

/** Deterministic pseudo-random so server and client render the same sky. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Star = { x: number; y: number; r: number; o: number; d: number; dur: number };

export function ArrivalScene({ awake = true }: { awake?: boolean }) {
  const reduced = useReducedMotion();

  const stars = useMemo<Star[]>(() => {
    // Values are rounded so server and client markup are byte-identical.
    const r3 = (n: number) => Math.round(n * 1000) / 1000;
    const out: Star[] = [];
    for (let i = 0; i < 96; i++) {
      const y = Math.pow(seeded(i, 2), 1.6) * 58; // sparse, concentrated high
      out.push({
        x: r3(seeded(i, 1) * 100),
        y: r3(y),
        r: r3(0.5 + seeded(i, 3) * 1.15),
        o: r3(0.18 + seeded(i, 4) * 0.62),
        d: r3(seeded(i, 5) * 9),
        dur: r3(6 + seeded(i, 6) * 9),
      });
    }
    return out;
  }, []);


  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Deep field */}
      <div className="absolute inset-0 bg-[var(--void)]" />

      {/* Upper atmosphere — lavender intelligence, extremely restrained */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, color-mix(in oklab, var(--lavender) 13%, transparent) 0%, transparent 58%)",
        }}
      />

      {/* Stars */}
      <div className="absolute inset-x-0 top-0 h-[68%]">
        {stars.map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${s.x.toFixed(2)}%`,
              top: `${s.y.toFixed(2)}%`,
              width: `${(s.r * 2).toFixed(2)}px`,
              height: `${(s.r * 2).toFixed(2)}px`,
              background: "var(--ink)",
              opacity: awake ? Number(s.o.toFixed(2)) : 0,
              boxShadow: `0 0 ${(s.r * 5).toFixed(2)}px color-mix(in oklab, var(--lavender-bright) 60%, transparent)`,
              transition: "opacity 2200ms ease-out",
              animation: reduced || !awake ? undefined : `athena-star-drift ${s.dur.toFixed(2)}s ease-in-out ${s.d.toFixed(2)}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Horizon bloom — the warm centre the eye travels toward */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "42%",
          height: "40%",
          background:
            "radial-gradient(58% 100% at 50% 62%, color-mix(in oklab, var(--amber) 26%, transparent) 0%, color-mix(in oklab, var(--amber) 8%, transparent) 38%, transparent 72%)",
          opacity: awake ? 1 : 0,
          transition: "opacity 2600ms ease-out",
          animation: reduced || !awake ? undefined : "athena-horizon-shimmer 14s ease-in-out infinite",
        }}
      />

      {/* Distant ranges */}
      <svg
        className="absolute inset-x-0"
        style={{ top: "50%", height: "24%", width: "100%" }}
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ridge-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lavender-dim)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--void)" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="ridge-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lavender-dim)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--void)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          fill="url(#ridge-far)"
          d="M0,214 C120,190 200,168 300,176 C410,185 470,146 580,150 C700,155 760,186 880,178 C990,171 1060,150 1180,158 C1290,165 1360,190 1440,182 L1440,260 L0,260 Z"
        />
        <path
          fill="url(#ridge-near)"
          d="M0,236 C150,222 240,206 360,210 C480,214 560,196 680,198 C800,200 870,220 990,216 C1110,212 1200,198 1320,204 C1380,207 1410,214 1440,218 L1440,260 L0,260 Z"
        />
      </svg>

      {/* Horizon line */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "73.4%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--amber-bright) 55%, transparent) 32%, color-mix(in oklab, var(--amber-bright) 85%, transparent) 50%, color-mix(in oklab, var(--amber-bright) 55%, transparent) 68%, transparent 100%)",
          opacity: awake ? 0.75 : 0,
          transition: "opacity 2600ms ease-out",
        }}
      />

      {/* Reflective plane */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          top: "73.5%",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--lavender-dim) 26%, var(--void)) 0%, var(--void) 62%)",
        }}
      />
      {/* Luminous path on the water */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          top: "73.5%",
          width: "min(78vw, 780px)",
          background:
            "radial-gradient(50% 74% at 50% 0%, color-mix(in oklab, var(--amber) 30%, transparent) 0%, color-mix(in oklab, var(--amber) 8%, transparent) 40%, transparent 74%)",
          filter: "blur(6px)",
          opacity: awake ? 0.9 : 0,
          transition: "opacity 3000ms ease-out",
          animation: reduced || !awake ? undefined : "athena-horizon-shimmer 16s ease-in-out infinite",
        }}
      />

      {/* Grounding vignette so the composition never looks like a flat panel */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 88% at 50% 50%, transparent 42%, color-mix(in oklab, var(--void) 82%, transparent) 100%)",
        }}
      />

      <style>{`
        @keyframes athena-star-drift {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(0.82); }
        }
        @keyframes athena-horizon-shimmer {
          0%, 100% { opacity: 0.82; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
