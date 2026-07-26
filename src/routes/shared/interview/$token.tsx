import { createFileRoute, useLoaderData, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { getSharedTranscript } from "@/lib/interview-share.functions";

export const Route = createFileRoute("/shared/interview/$token")({
  head: () => ({
    meta: [
      { title: "Shared Interview — Relationship Intelligence" },
      { name: "description", content: "A shared Relationship Intelligence interview transcript." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Shared Interview — Relationship Intelligence" },
      { property: "og:description", content: "A shared Relationship Intelligence interview transcript." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ params }) => {
    const res = await getSharedTranscript({ data: { token: params.token } });
    if (!res.ok) throw notFound();
    return res;
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl">This link is no longer active</h1>
      <p className="mt-3 text-sm text-muted-foreground">The owner has revoked access to this transcript.</p>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">Please try again later.</p>
    </div>
  ),
  component: SharedInterview,
});

function SharedInterview() {
  const data = useLoaderData({ from: "/shared/interview/$token" });
  const fmt = (ts?: string | null) => (ts ? new Date(ts).toLocaleString() : "—");
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-16">
      <header className="border-b border-border/60 pb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">The Interview</p>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          {data.displayName ? `${data.displayName}'s transcript` : "Shared transcript"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data.completedAt ? `Completed ${fmt(data.completedAt)}` : "In progress"} · Shared {fmt(data.sharedAt)}
        </p>
      </header>
      <div className="mt-8 space-y-6">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No content yet.</p>
        ) : (
          data.messages.map((m, i) => (
            <div key={i}>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {m.role === "user" ? "They said" : "Interviewer"} · {fmt(m.ts)}
              </p>
              <div className="prose prose-sm mt-2 max-w-none text-foreground prose-p:leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
