import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Relationship Intelligence" },
      {
        name: "description",
        content:
          "The agreement between you and Relationship Intelligence for using Athena and meeting other members.",
      },
      { property: "og:title", content: "Terms of Service — Relationship Intelligence" },
      {
        property: "og:description",
        content:
          "The agreement between you and Relationship Intelligence for using Athena and meeting other members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="screen-shell safe-top safe-bottom pb-16">
      <header className="px-6 pt-10">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          A plain agreement
        </p>
        <h1 className="mt-3 font-display text-[2.25rem] leading-tight text-foreground">
          Terms of Service
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          These are the terms you agree to when you use Relationship Intelligence.
          We keep them short and human. If any part is unclear, ask us.
        </p>
        <p className="mt-2 text-[12px] text-muted-foreground">
          Effective as of the date you create your account.
        </p>
      </header>

      <main className="mt-8 space-y-6 px-6 text-[15px] leading-relaxed text-foreground/90">
        <Section title="Who can use this">
          You must be 18 years or older, legally able to enter into a
          relationship agreement in your jurisdiction, and using the service
          in good faith to meet real people for genuine connection.
        </Section>

        <Section title="Your account">
          You are responsible for what you say and do here. Your account is
          personal — do not share it, sell it, or use it on behalf of anyone
          else. Impersonation, fake profiles, and coordinated inauthentic
          behavior are cause for permanent removal.
        </Section>

        <Section title="What Athena is">
          Athena is an AI companion that helps us understand you well enough to
          consider meaningful introductions. She is not a therapist, a
          matchmaker, a legal advisor, or an emergency service. Her
          understanding is provisional and can be wrong. Nothing she says is a
          guarantee about another person.
        </Section>

        <Section title="Introductions and connections">
          Meeting anyone Athena introduces is entirely your choice. We do not
          conduct background checks. You are responsible for your own safety,
          judgment, and decisions when interacting with another member — in
          the app, in messages, and in person.
        </Section>

        <Section title="What you may not do">
          Harass, threaten, or degrade another member. Solicit money, sex work,
          or business. Post explicit, illegal, or hateful content. Attempt to
          extract another member's private information, or reveal it publicly.
          Attempt to manipulate Athena, evade safety systems, or reverse-engineer
          the service. Violations can result in immediate removal.
        </Section>

        <Section title="Your content, your rights">
          What you share stays yours. You grant us a limited right to store,
          process, and display it as needed to run the service — to power
          Athena's understanding of you, to present the parts of your profile
          you choose to share, and to keep your messages available to the
          people you're talking with.
        </Section>

        <Section title="Suspension and removal">
          We may pause or remove an account when a member's behavior threatens
          the safety, dignity, or trust of the community. Serious safety
          concerns are handled quickly and quietly. You may pause or delete
          your account yourself at any time from your profile.
        </Section>

        <Section title="No promises we cannot keep">
          We do not promise you will meet anyone, that a match will last, or
          that the service will be uninterrupted. We work hard on all three.
        </Section>

        <Section title="Limits on our liability">
          To the fullest extent permitted by law, Relationship Intelligence is
          not liable for indirect, incidental, or consequential harms arising
          from your use of the service or from interactions with other members.
        </Section>

        <Section title="Changes to these terms">
          If we change these terms in a way that meaningfully affects you, we
          will tell you before the change takes effect. Continuing to use the
          service after that constitutes acceptance.
        </Section>

        <Section title="Contact">
          Questions about these terms can be sent from within the app.
        </Section>
      </main>

      <div className="mt-10 flex flex-col gap-2 px-6">
        <Link
          to="/community-guidelines"
          className="block w-full rounded-full border border-border/70 bg-background/60 px-6 py-4 text-center text-[15px] font-medium text-foreground"
        >
          Community Guidelines
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
