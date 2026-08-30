import { Link } from "@tanstack/react-router";

/**
 * Back to the orb field — PRESENTATION ONLY.
 *
 * With no tab bar, this is the way back. It is pinned top-left and stays fixed
 * while the surface scrolls.
 */
export function FieldBack({ label = "Back to the field" }: { label?: string }) {
  return (
    <Link
      to="/home"
      aria-label={label}
      data-testid="field-back"
      className="surface-back fixed left-6 z-50"
      style={{ top: "max(24px, calc(env(safe-area-inset-top) + 14px))" }}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden fill="none">
        <path
          d="M15 6l-6 6 6 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      </svg>
    </Link>
  );
}
