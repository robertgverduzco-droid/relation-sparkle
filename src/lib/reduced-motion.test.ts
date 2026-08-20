// Experience regression suite — F-16 reduced motion (beta gate).
//
// Motion may never be the only carrier of meaning, and continuous ambient
// motion must stop when the member's OS asks for reduced motion.
//
//   bunx vitest run
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("reduced motion support", () => {
  it("global stylesheet honours prefers-reduced-motion", () => {
    const css = read("src/styles.css");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
    expect(css).toMatch(/transition-duration:\s*0\.001ms\s*!important/);
  });

  it("exposes a reduced-motion hook driven by the media query", () => {
    const hook = read("src/hooks/use-reduced-motion.ts");
    expect(hook).toContain("(prefers-reduced-motion: reduce)");
    expect(hook).toContain("addEventListener");
  });

  it("the connection field stops animating and stays silent", () => {
    const field = read("src/components/connection-field.tsx");
    expect(field).toContain("useReducedMotion");
    // No continuous animation loop under reduced motion, and no audio at all.
    expect(field).toMatch(/if \(reducedMotion\) \{[\s\S]*drawStatic\(\)/);
    expect(field).not.toContain("AudioContext");
    // Battery: ambient motion pauses when the page is hidden.
    expect(field).toContain("visibilitychange");
  });

  it("Athena's thinking state carries a text label, not only motion", () => {
    const athena = read("src/routes/_authenticated/athena.tsx");
    const state = read("src/lib/athena-runtime-state.ts");
    expect(state).toContain("Athena is thinking");
    expect(athena).toContain("RUNTIME_STATE_LABEL");
    expect(athena).toContain('aria-live="polite"');
  });
});
