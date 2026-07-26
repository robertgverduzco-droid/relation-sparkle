import { createFileRoute } from "@tanstack/react-router";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/introductions")({
  head: () => ({ meta: [{ title: "Introductions — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: IntroductionsPage,
});

function IntroductionsPage() {
  return (
    <div className="screen-shell safe-top pb-24 px-6 pt-8">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Introductions</p>
      <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
        One <em className="italic text-primary">person</em> at a time.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        When we've found someone whose values, readiness, and life direction feel like a real fit, you'll meet them here.
        Until then — nothing to swipe, nothing to sort.
      </p>

      <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
        <p className="font-display text-xl text-foreground">Nothing waiting yet</p>
        <p className="mt-2 text-sm text-ink-soft">Introductions arrive when they're worth arriving.</p>
      </div>

      <MobileTabBar current="introductions" />
    </div>
  );
}
