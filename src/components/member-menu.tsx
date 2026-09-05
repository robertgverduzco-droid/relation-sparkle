// The one place a member — or a founder — can reach everything that isn't a
// conversation: their profile, their account, sign out, and (when the server
// says so) moderation and founder tools.
//
// These controls used to hang off a bottom tab bar. When the tab bar left the
// main surfaces, they were orphaned behind two hops. This component is the
// shared list, so any surface can open the same menu and nothing can be
// orphaned again by a layout change.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { amIModerator } from "@/lib/moderation.functions";
import { getFounderStatus } from "@/lib/founder.functions";

/** Convenience only — every founder route and server fn re-verifies the role
 * server-side from the bearer token. Nothing here grants access. */
export function useMemberRoles() {
  const modCheck = useServerFn(amIModerator);
  const founderCheck = useServerFn(getFounderStatus);
  const [roles, setRoles] = useState({ isModerator: false, isFounder: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [mod, founder] = await Promise.all([
        modCheck({}).catch(() => ({ moderator: false })),
        founderCheck({}).catch(() => ({ isFounder: false })),
      ]);
      if (!alive) return;
      setRoles({
        isModerator: Boolean((mod as { moderator?: boolean } | null)?.moderator),
        isFounder: Boolean((founder as { isFounder?: boolean } | null)?.isFounder),
      });
    })();
    return () => {
      alive = false;
    };
  }, [modCheck, founderCheck]);

  return roles;
}

const row =
  "text-left text-[13px] text-muted-foreground transition-colors hover:text-foreground";

/**
 * The menu body. `onNavigate` closes whatever surface is presenting it.
 * `showHistory` is only true on the Athena screen, where the past
 * conversation belongs.
 */
export function MemberMenuLinks({
  onNavigate,
  showHistory = false,
}: {
  onNavigate?: () => void;
  showHistory?: boolean;
}) {
  const navigate = useNavigate();
  const { isModerator, isFounder } = useMemberRoles();

  async function signOut() {
    await supabase.auth.signOut();
    toast("You've signed out.");
    onNavigate?.();
    navigate({ to: "/" });
  }

  return (
    <div className="flex flex-col items-start gap-3" data-testid="member-menu">
      {showHistory && (
        <Link to="/athena-history" data-testid="athena-history-link" onClick={onNavigate} className={row}>
          Past conversation
        </Link>
      )}
      <Link to="/profile" data-testid="menu-profile" onClick={onNavigate} className={row}>
        Your Living Profile
      </Link>
      <Link to="/account" data-testid="menu-account" onClick={onNavigate} className={row}>
        Account settings
      </Link>

      {isModerator && (
        <Link to="/moderation" data-testid="menu-moderation" onClick={onNavigate} className={row}>
          Moderation review
        </Link>
      )}
      {isFounder && (
        <>
          <Link to="/founder" data-testid="menu-founder" onClick={onNavigate} className={row}>
            Founder Dialogue
          </Link>
          <Link
            to="/founder/intelligence"
            data-testid="menu-founder-intelligence"
            onClick={onNavigate}
            className={row}
          >
            Founder intelligence
          </Link>
          <Link
            to="/beta-accounts"
            data-testid="menu-beta-accounts"
            onClick={onNavigate}
            className={row}
          >
            Synthetic beta accounts
          </Link>
        </>
      )}

      <button type="button" onClick={signOut} data-testid="menu-sign-out" className={row}>
        Sign out
      </button>
    </div>
  );
}

/** A plain bottom sheet, so every surface presents the menu identically. */
export function MemberMenuSheet({
  onClose,
  title = "Menu",
  children,
  showHistory = false,
}: {
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  showHistory?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border/60 bg-background p-6 pb-8 fade-in-slow"
        onClick={(e) => e.stopPropagation()}
        data-testid="member-menu-sheet"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <h2 className="mb-4 font-display text-lg">{title}</h2>
        {children}
        <div className="mt-6 border-t border-border/60 pt-4">
          <MemberMenuLinks onNavigate={onClose} showHistory={showHistory} />
        </div>
      </div>
    </div>
  );
}
