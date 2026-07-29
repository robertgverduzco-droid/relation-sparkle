import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Relationship Intelligence" },
      {
        name: "description",
        content:
          "How Relationship Intelligence and Athena hold your private information, reflections, and identity with care.",
      },
      { property: "og:title", content: "Privacy — Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "How Relationship Intelligence and Athena hold your private information, reflections, and identity with care.",
      },
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
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A quiet promise
        </p>
        <h1 className="mt-3 font-display text-[2.25rem] leading-tight text-foreground">
          Your privacy
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Relationship Intelligence is built on discretion. What you share with
          Athena is used to understand you — never to perform for others. Below is a
          plain-language account of how your information is held.
        </p>
      </header>

      <main className="mt-8 space-y-6 px-6 text-[15px] leading-relaxed text-foreground/90">
        <Section title="What we collect">
          Your name and email, the essentials you provide when creating your
          account, everything you share in conversation with Athena, your Living
          Profile, your reflections after dates, and the messages you exchange
          with other members. Photographs you upload are stored securely and shown
          only when you choose.
        </Section>

        <Section title="What stays private, always">
          Your conversations with Athena, your reflections after a date, your
          journal-style notes, and Athena's internal understanding of you are never
          shared with other members. They shape your matching quietly, in the
          background.
        </Section>

        <Section title="What another person can see">
          Only the parts of your profile you have chosen to share — never raw
          conversations, never Athena's private notes, and never your home
          address. Photos are revealed only after a mutual decision.
        </Section>

        <Section title="How Athena learns">
          Athena updates your Living Profile from what you tell her directly and
          from patterns she notices over time. Her understanding is always
          provisional and always evolving. You may correct anything, hide any
          insight, or ask Athena to set a topic aside.
        </Section>

        <Section title="Safety">
          You can block, report, unmatch, or pause at any time. Reports are
          reviewed by trained moderators. Serious safety concerns may result in
          account restrictions.
        </Section>

        <Section title="Your controls">
          You can pause matching, correct your profile, download your data, and
          request account deletion from your profile screen at any time.
        </Section>

        <Section title="Contact">
          Questions about privacy or safety can be sent from within the app. We
          aim to reply within a few business days.
        </Section>
      </main>

      <div className="mt-10 flex flex-col gap-2 px-6">
        <Link
          to="/terms"
          className="block w-full rounded-full border border-border/70 bg-background/60 px-6 py-4 text-center text-[15px] font-medium text-foreground"
        >
          Terms of Service
        </Link>
        <Link
          to="/community-guidelines"
          className="block w-full rounded-full border border-border/70 bg-background/60 px-6 py-4 text-center text-[15px] font-medium text-foreground"
        >
          Community Guidelines
        </Link>
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-[1.25rem] text-foreground">{title}</h2>
      <p className="mt-2 text-ink-soft">{children}</p>
    </section>
  );
}
