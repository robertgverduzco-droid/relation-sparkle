import { createFileRoute } from "@tanstack/react-router";
import { MobileTabBar } from "@/components/mobile-tab-bar";

export const Route = createFileRoute("/_authenticated/conversations")({
  head: () => ({ meta: [{ title: "Conversations — Relationship Intelligence" }, { name: "robots", content: "noindex" }] }),
  component: ConversationsPage,
});

function ConversationsPage() {
  return (
    <div className="screen-shell safe-top pb-24 px-6 pt-8">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Conversations</p>
      <h1 className="mt-2 font-display text-[2.25rem] leading-tight text-foreground">
        Quiet, <em className="italic text-primary">real</em> exchanges.
      </h1>
      <p className="mt-3 text-sm text-ink-soft">
        Every conversation here began with a mutual introduction. Take your time.
      </p>
      <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
        <p className="font-display text-xl text-foreground">No open conversations yet</p>
        <p className="mt-2 text-sm text-ink-soft">This is where they'll live.</p>
      </div>
      <MobileTabBar current="conversations" />
    </div>
  );
}
