import { Link } from "@tanstack/react-router";
import { Home, Compass, MessageSquare, Mail, User } from "lucide-react";

type Tab = "home" | "athena" | "introductions" | "messages" | "profile" | "none";

const tabs: {
  key: Exclude<Tab, "none">;
  to: "/home" | "/athena" | "/introductions" | "/messages" | "/profile";
  label: string;
  Icon: typeof Home;
}[] = [
  { key: "home", to: "/home", label: "Today", Icon: Home },
  { key: "athena", to: "/athena", label: "Athena", Icon: MessageSquare },
  { key: "introductions", to: "/introductions", label: "Meet", Icon: Compass },
  { key: "messages", to: "/messages", label: "Messages", Icon: Mail },
  { key: "profile", to: "/profile", label: "You", Icon: User },
];

export function MobileTabBar({ current }: { current: Tab }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] safe-bottom"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--void) 62%, transparent) 0%, var(--void) 60%)",
        backdropFilter: "blur(18px)",
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-6 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--lavender) 30%, transparent), transparent)",
        }}
      />
      <ul className="grid grid-cols-5">
        {tabs.map(({ key, to, label, Icon }) => {
          const active = key === current;
          return (
            <li key={key}>
              <Link
                to={to}
                data-testid={`tab-${key}`}
                className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1.5 py-2.5 text-[10px] tracking-[0.14em] uppercase transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-ink-soft"}`}
              >
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={active ? 1.75 : 1.25}
                  style={
                    active
                      ? {
                          color: "var(--lavender-bright)",
                          filter:
                            "drop-shadow(0 0 10px color-mix(in oklab, var(--lavender) 65%, transparent))",
                        }
                      : undefined
                  }
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

