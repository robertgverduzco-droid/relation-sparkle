import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Relationship Intelligence" },
      { name: "description", content: "How Relationship Intelligence protects your private information, reflections, and identity." },
      { property: "og:title", content: "Privacy — Relationship Intelligence" },
      { property: "og:description", content: "How Relationship Intelligence protects your private information, reflections, and identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="screen-shell safe-top safe-bottom pb-16">
      <header className="px-6 pt-10">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">A quiet promise</p>
        <h1 className="mt-3 font-display text-[2.25rem] leading-tight text-foreground">Your privacy</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Relationship Intelligence is built on discretion. What you share with the AI is used to
          understand you, never to perform for others. Below is a plain-language explanation of how
          your information is handled.
        </p>
      </header>

      <main className="mt-8 space-y-6 px-6 text-[15px] leading-relaxed text-foreground/90">
        <Section title="What we collect">
          Your name and email, the answers you give during onboarding and the AI interview, your
          Living Profile, your reflections after dates, and the messages you exchange with other
          members. Photographs you upload are stored securely and shown only when you choose.
        </Section>

        <Section title="What stays private, always">
          Your reflections after a date, your private AI insights, your journal-style notes, and the
          AI’s internal understanding of you are never shared with other members. They shape your
          matching quietly, in the background.
        </Section>

        <Section title="What another person can see">
          Only the parts of your profile you have approved for sharing — never raw interview
          transcripts, never internal notes, and never your home address. Photos are revealed only
          after a mutual decision.
        </Section>

        <Section title="How the AI learns">
          The AI updates your Living Profile from what you tell it directly and from patterns you
          confirm. You may correct anything, hide any insight, or ask the AI to forget a topic.
        </Section>

        <Section title="Safety">
          You can block, report, unmatch, or pause at any time. Reports are reviewed by trained
          moderators. Serious safety concerns may result in account restrictions.
        </Section>

        <Section title="Your controls">
          You can pause matching, edit your profile, download your data, and request account
          deletion from your profile screen at any time.
        </Section>

        <Section title="Contact">
          Questions about privacy or safety can be sent from within the app. We aim to reply within
          a few business days.
        </Section>
      </main>

      <div className="mt-10 px-6">
        <Link
          to="/"
          className="block w-full rounded-full border border-border/70 bg-background/60 px-6 py-4 text-center text-[15px] font-medium text-foreground"
        >
          Back
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[1.25rem] text-foreground">{title}</h2>
      <p className="mt-2 text-ink-soft">{children}</p>
    </section>
  );
}
