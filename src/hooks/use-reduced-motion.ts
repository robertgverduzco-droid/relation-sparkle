import { useEffect, useState } from "react";

/**
 * F-16 (beta gate): honour the OS "reduce motion" setting.
 * Meaning must never depend on movement — callers substitute a static,
 * still-legible presentation rather than removing information.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
}
