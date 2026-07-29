import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — Relationship Intelligence" },
      {
        name: "description",
        content:
          "How members of Relationship Intelligence treat one another — the culture we protect together.",
      },
      { property: "og:title", content: "Community Guidelines — Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "How members of Relationship Intelligence treat one another — the culture we protect together.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <div className="screen-shell safe-top safe-bottom pb-16">
      <header className="px-6 pt-10">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          The culture we protect
        </p>
        <h1 className="mt-3 font-display text-[2.25rem] leading-tight text-foreground">
          Community Guidelines
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Relationship Intelligence works because members show up as their real
          selves and treat each other with dignity. These aren't rules for
          rules' sake — they are the conditions under which real connection
          becomes possible.
        </p>
      </header>

      <main className="mt-8 space-y-6 px-6 text-[15px] leading-relaxed text-foreground/90">
        <Section title="Be who you actually are">
          Use your real name and current photos. Speak honestly with Athena — it
          is the only way she can understand you well enough to introduce you
          meaningfully. There is nothing to perform for here.
        </Section>

        <Section title="Assume dignity in the person on the other side">
          Every member is a real person whose time, attention, and openness
          matter. Say what you would say in a room together. Ghosting a
          conversation you started is unkind; a graceful close is welcome any
          time.
        </Section>

        <Section title="No harassment, ever">
          No slurs, threats, sexualized pressure, coercion, degrading messages,
          or persistent contact after someone has said no or stepped back. This
          applies in-app, in messages, on dates, and anywhere our members
          interact because of this platform.
        </Section>

        <Section title="Consent is continuous">
          Interest can change. "Maybe another time" is a full answer. If someone
          disengages, let them.
        </Section>

        <Section title="Protect each other's privacy">
          What another member shares here — reflections, photos, personal
          history — stays here. Do not screenshot, publish, or share it
          outside the platform. Do not try to find members off-platform without
          their invitation.
        </Section>

        <Section title="No commercial use">
          This is not a place to sell, recruit, solicit investment, promote a
          business, or ask for money. Not on your profile, not in messages,
          not on a date.
        </Section>

        <Section title="Nothing illegal, nothing that endangers people">
          No content depicting minors in any sexualized way. No incitement to
          violence. No trafficking, exploitation, or predatory behavior. These
          result in immediate permanent removal and, when appropriate, reports
          to authorities.
        </Section>

        <Section title="Meet safely">
          For a first meeting: a public place, at a time that works for you,
          and someone in your life knows where you are. Trust your instincts
          — if something feels off, leave. You can block or report from any
          conversation.
        </Section>

        <Section title="When something goes wrong">
          Report it. Reports are read by trained moderators, taken seriously,
          and handled with discretion. We would rather act on a report that
          turns out to be minor than miss one that wasn't.
        </Section>

        <Section title="Consequences">
          Members whose behavior threatens the safety or dignity of others may
          be warned, paused, or permanently removed depending on severity. We
          err toward protecting the community over preserving any single
          account.
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
          to="/privacy"
          className="block w-full rounded-full border border-border/70 bg-background/60 px-6 py-4 text-center text-[15px] font-medium text-foreground"
        >
          Privacy
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
