// ARRIVAL SCENE — regression coverage for the gesture-gate ordering bug.
//
// The failure this guards against: the reveal-sequence timer ran from
// component mount regardless of the "Tap to begin" gesture gate, which is an
// opaque full-screen cover. A visitor who waited before tapping had the
// entire reveal (including the 5500ms auto-resolve) finish unseen behind the
// gate; dismissing the gate then revealed an already-finished scene
// instantly, and the animation effect's dependency on `started` restarted
// the whole timer from zero, so ~5500ms later the reveal sequence fired
// again and visibly pulled the wordmark/tagline/buttons back down before
// climbing them a second time.
//
// The component is canvas + requestAnimationFrame + real timers, not
// practically exercised behaviorally in vitest, so this is a source-scan
// proving nothing renders/resolves before the gesture it depends on.
//
//   bunx vitest run src/components/arrival-scene.test.ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "src/components/arrival-scene.tsx"), "utf8");

describe("the reveal timer never runs before the gesture gate is passed", () => {
  it("the node-field effect bails out before touching the canvas when the gate hasn't been passed", () => {
    const effectStart = src.indexOf("// ---- Node field");
    const canvasLookup = src.indexOf("canvasRef.current", effectStart);
    const guard = src.indexOf("if (!still && !started) return;", effectStart);
    expect(effectStart).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(-1);
    // The guard must run before the canvas is ever touched, so RAF, the
    // elapsed-time clock and runReveal() truly never start early.
    expect(guard).toBeLessThan(canvasLookup);
  });

  it("the gate's own visibility condition is the same one guarding the timer", () => {
    // Whatever decides whether "Tap to begin" is shown must be the exact
    // condition gating the effect -- if they drift apart, the timer can run
    // unseen behind the gate again.
    expect(src).toMatch(/\{!still && !started \? \(/);
    expect(src).toMatch(/if \(!still && !started\) return;/);
  });
});
