// F-12 — member-facing device & account safety.
//
// A signed-in device alone must not be enough to destroy or export an
// account. Everything destructive on this panel goes through step-up
// reauthentication server-side; the browser cannot skip it.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  getAccountSecurity,
  verifyStepUp,
  signOutEverywhere,
} from "@/lib/session-safety.functions";
import { deleteMyAccount } from "@/lib/account.functions";
import { generateMyExport } from "@/lib/export.functions";
import {
  isAppLockEnabled,
  enableAppLock,
  disableAppLock,
} from "@/components/app-lock";

type Overview = {
  last_sign_in_at: string | null;
  providers: string[];
  has_password: boolean;
  email_confirmed: boolean;
};

type Pending = "sign_out_everywhere" | "account_deletion" | "data_export" | null;


export function DeviceSafetyPanel() {
  const navigate = useNavigate();
  const overviewFn = useServerFn(getAccountSecurity);
  const verifyFn = useServerFn(verifyStepUp);
  const signOutAllFn = useServerFn(signOutEverywhere);
  const deleteFn = useServerFn(deleteMyAccount);
  const exportFn = useServerFn(generateMyExport);


  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockOn, setLockOn] = useState(false);
  const [pinPrompt, setPinPrompt] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    setLockOn(isAppLockEnabled());
    overviewFn({})
      .then((o) => setOverview(o as Overview))
      .catch(() => undefined);
  }, [overviewFn]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!pending) return;
    setBusy(true);
    try {
      await verifyFn({ data: { password, purpose: pending } });
      setPassword("");
      if (pending === "sign_out_everywhere") {
        await signOutAllFn({});
        toast("Signed out on every device.");
        await supabase.auth.signOut();
        navigate({ to: "/", replace: true });
        return;
      }
      if (pending === "data_export") {
        const result = (await exportFn({})) as { filename: string; json: string };
        // Handed straight to the member; the file never rests on a server.
        const url = URL.createObjectURL(
          new Blob([result.json], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);
        toast("Your copy has been downloaded.");
        return;
      }
      await deleteFn({ data: { confirm: "delete my account" } });

      await supabase.auth.signOut();
      toast("Your account has been deleted.");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't confirm that.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  async function toggleLock() {
    if (lockOn) {
      disableAppLock();
      setLockOn(false);
      toast("App lock turned off.");
      return;
    }
    setPinPrompt(true);
  }

  async function savePin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      toast.error("Use at least four digits.");
      return;
    }
    await enableAppLock(pin);
    setPin("");
    setPinPrompt(false);
    setLockOn(true);
    toast("App lock is on for this device.");
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
        Devices & safety
      </p>
      <p className="mt-2 text-xs text-ink-soft">
        If a phone is lost, shared, or taken, this is where you close it off.
      </p>

      {overview && (
        <dl className="mt-4 space-y-1 text-[13px] text-ink-soft">
          <div className="flex justify-between gap-4">
            <dt>Last sign-in</dt>
            <dd className="text-foreground">
              {overview.last_sign_in_at
                ? new Date(overview.last_sign_in_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Sign-in method</dt>
            <dd className="text-foreground">{overview.providers.join(", ") || "—"}</dd>
          </div>
        </dl>
      )}

      <div className="mt-4 space-y-2">
        <button
          onClick={toggleLock}
          className="w-full rounded-full border border-border px-5 py-3 text-sm text-foreground"
        >
          {lockOn ? "Turn off app lock on this device" : "Lock this device with a PIN"}
        </button>
        <button
          onClick={() => setPending("sign_out_everywhere")}
          className="w-full rounded-full border border-border px-5 py-3 text-sm text-foreground"
        >
          Sign out everywhere
        </button>
        <button
          onClick={() => setPending("account_deletion")}
          className="w-full rounded-full border border-destructive/60 px-5 py-3 text-sm text-destructive"
        >
          Delete my account permanently
        </button>
      </div>

      {pinPrompt && (
        <form onSubmit={savePin} className="mt-4 space-y-2">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Choose a PIN"
            aria-label="Choose a PIN"
            className="w-full rounded-full border border-border bg-background px-5 py-3 text-center tracking-[0.3em] text-foreground"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Save PIN
          </button>
        </form>
      )}

      {pending && (
        <form onSubmit={confirm} className="mt-4 space-y-2">
          <p className="text-[13px] text-ink-soft">
            {pending === "account_deletion"
              ? "This erases everything Athena has come to understand about you. Confirm with your password."
              : "Confirm with your password to end every other session."}
          </p>
          <input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            aria-label="Your password"
            className="w-full rounded-full border border-border bg-background px-5 py-3 text-foreground"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPending(null);
                setPassword("");
              }}
              className="flex-1 rounded-full border border-border px-5 py-3 text-sm text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !password}
              className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Confirming…" : "Confirm"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
