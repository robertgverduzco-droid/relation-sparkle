import { useMemo } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * Arrival environment — presentation only.
 *
 * A cinematic cosmic mountain-valley: midnight sky and sparse stars above,
 * layered ranges falling away on both sides, a violet / rose-gold sunset at
 * the horizon, and a still lake carrying a luminous vertical path from the
 * horizon toward the member. Constructed entirely from SVG gradients so there
 * is no image dependency; the whole scene is drawn in one viewBox and slices
 * to fill any canvas, so mobile and desktop share the same composition.
 *
 * Motion is limited to star shimmer, horizon glow and a slow reflection
 * breath; all of it stops under reduced-motion.
 */

/** Deterministic pseudo-random so server and client render the same sky. */
function seeded(i: number, salt: number) {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type Star = { x: number; y: number; r: number; o: number; d: number; dur: number };

const HORIZON = 560; // y of the waterline inside the 1440x1000 viewBox

export function ArrivalScene({ awake = true }: { awake?: boolean }) {
  const reduced = useReducedMotion();

  const stars = useMemo<Star[]>(() => {
    const r2 = (n: number) => Math.round(n * 100) / 100;
    const out: Star[] = [];
    for (let i = 0; i < 110; i++) {
      const y = Math.pow(seeded(i, 2), 1.5) * 470; // sparse, concentrated high
      out.push({
        x: r2(seeded(i, 1) * 1440),
        y: r2(y),
        r: r2(0.7 + seeded(i, 3) * 1.5),
        o: r2(0.16 + seeded(i, 4) * 0.6),
        d: r2(seeded(i, 5) * 9),
        dur: r2(6 + seeded(i, 6) * 9),
      });
    }
    return out;
  }, []);

  const still = reduced || !awake;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--void)]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: awake ? 1 : 0, transition: "opacity 2400ms ease-out" }}
      >
        <defs>
          {/* Night sky: void above, indigo, then violet toward the horizon. */}
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#030304" />
            <stop offset="34%" stopColor="#0a0819" />
            <stop offset="64%" stopColor="#1d1338" />
            <stop offset="88%" stopColor="#4a2a54" />
            <stop offset="100%" stopColor="#7c4560" />
          </linearGradient>

          {/* Sunset bloom sitting on the waterline. */}
          <radialGradient id="sunset" cx="0.5" cy="1" r="0.75">
            <stop offset="0%" stopColor="#ffcfa8" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#f2a2a0" stopOpacity="0.65" />
            <stop offset="52%" stopColor="#a897d4" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#a897d4" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="rangeFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8f7ab4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3a2a52" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="rangeMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a4577" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1d1430" stopOpacity="0.97" />
          </linearGradient>
          <linearGradient id="rangeNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#241a35" />
            <stop offset="100%" stopColor="#08060e" />
          </linearGradient>

          {/* Water: violet at the shore of the horizon, void at the feet. */}
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5c3a62" />
            <stop offset="26%" stopColor="#2a1c3c" />
            <stop offset="70%" stopColor="#0b0912" />
            <stop offset="100%" stopColor="#030304" />
          </linearGradient>

          {/* The luminous corridor leading from the horizon to the member. */}
          <linearGradient id="pathGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd9b4" stopOpacity="0.85" />
            <stop offset="26%" stopColor="#e6a5b0" stopOpacity="0.42" />
            <stop offset="66%" stopColor="#a897d4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#a897d4" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <mask id="reflectionMask">
            <rect x="0" y={HORIZON} width="1440" height="440" fill="url(#fade)" />
          </mask>

          <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="46%" stopColor="#030304" stopOpacity="0" />
            <stop offset="100%" stopColor="#030304" stopOpacity="0.88" />
          </radialGradient>
        </defs>

        {/* --- Sky ---------------------------------------------------- */}
        <rect x="0" y="0" width="1440" height={HORIZON} fill="url(#sky)" />

        {/* Stars */}
        <g>
          {stars.map((s, i) => (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#f4f0fb"
              opacity={s.o}
              style={
                still
                  ? undefined
                  : { animation: `athena-star-shimmer ${s.dur}s ease-in-out ${s.d}s infinite` }
              }
            />
          ))}
        </g>

        {/* Sunset bloom */}
        <ellipse
          cx="720"
          cy={HORIZON}
          rx="760"
          ry="330"
          fill="url(#sunset)"
          style={still ? undefined : { animation: "athena-horizon-glow 16s ease-in-out infinite" }}
        />

        {/* --- Ranges: valley opening at the centre --------------------- */}
        {/* Far haze ridges, low and distant behind the corridor */}
        <path
          fill="url(#rangeFar)"
          d="M0,470 L120,392 L214,442 L318,352 L432,452 L520,404 L612,494 L720,520 L836,492 L928,402 L1020,462 L1128,346 L1236,440 L1332,382 L1440,464 L1440,560 L0,560 Z"
          opacity="0.85"
        />
        {/* Mid ranges, both flanks, dropping toward the water corridor */}
        <path
          fill="url(#rangeMid)"
          d="M0,404 L96,336 L188,410 L286,300 L392,398 L470,352 L556,468 L640,530 L720,558 L800,530 L884,466 L972,350 L1054,398 L1156,296 L1258,404 L1350,338 L1440,412 L1440,560 L0,560 Z"
        />
        {/* Near ranges, dark and close, framing the valley on both sides */}
        <path
          fill="url(#rangeNear)"
          d="M0,470 L74,398 L150,468 L236,352 L330,452 L410,404 L486,494 L560,540 L636,556 L720,562 L808,556 L884,538 L958,492 L1032,400 L1112,452 L1204,348 L1298,466 L1372,396 L1440,468 L1440,560 L0,560 Z"
        />

        {/* --- Water ---------------------------------------------------- */}
        <rect x="0" y={HORIZON} width="1440" height={1000 - HORIZON} fill="url(#water)" />

        {/* Mirrored ranges, softened into the lake */}
        <g mask="url(#reflectionMask)" opacity="0.4">
          <g transform={`translate(0, ${HORIZON * 2}) scale(1, -1)`}>
            <path
              fill="url(#rangeNear)"
              d="M0,470 L74,398 L150,468 L236,352 L330,452 L410,404 L486,494 L560,540 L636,556 L720,562 L808,556 L884,538 L958,492 L1032,400 L1112,452 L1204,348 L1298,466 L1372,396 L1440,468 L1440,560 L0,560 Z"
            />
          </g>
        </g>

        {/* Waterline */}
        <rect
          x="180"
          y={HORIZON - 1}
          width="1080"
          height="2"
          fill="#ffdcb0"
          opacity="0.5"
        />

        {/* Luminous central path — widening as it approaches the member */}
        <path
          d={`M666,${HORIZON} L774,${HORIZON} L960,1000 L480,1000 Z`}
          fill="url(#pathGlow)"
          style={
            still ? undefined : { animation: "athena-reflection-breath 18s ease-in-out infinite" }
          }
        />
        <path
          d={`M700,${HORIZON} L740,${HORIZON} L820,1000 L620,1000 Z`}
          fill="url(#pathGlow)"
          opacity="0.7"
        />

        {/* Still ripples across the corridor */}
        <g stroke="#ffdcb0" strokeLinecap="round" opacity="0.22">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const t = (i + 1) / 9;
            const y = HORIZON + t * t * 430;
            const w = 60 + t * 300;
            return (
              <line
                key={i}
                x1={720 - w / 2}
                x2={720 + w / 2}
                y1={y}
                y2={y}
                strokeWidth={1 + t}
                opacity={0.55 - t * 0.4}
              />
            );
          })}
        </g>

        {/* Grounding vignette so the scene reads as a world, not a panel */}
        <rect x="0" y="0" width="1440" height="1000" fill="url(#vignette)" />
      </svg>

      <style>{`
        @keyframes athena-star-shimmer {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 0.25; }
        }
        @keyframes athena-horizon-glow {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 1; }
        }
        @keyframes athena-reflection-breath {
          0%, 100% { opacity: 0.86; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
