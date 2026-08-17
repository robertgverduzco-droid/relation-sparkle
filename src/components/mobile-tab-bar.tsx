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
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] border-t border-border bg-field/90 backdrop-blur-xl safe-bottom"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ key, to, label, Icon }) => {
          const active = key === current;
          return (
            <li key={key}>
              <Link
                to={to}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[11px] tracking-wide transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 1.75 : 1.25} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
