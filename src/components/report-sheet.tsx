// Shared safety reporting sheet.
//
// Extracted verbatim from the messages thread so the same reporting flow can
// be opened from anywhere (messages, reflection). The safety system itself is
// unchanged — this still submits through `reportUser`.
import { useState } from "react";

export type ReportCategory =
  | "harassment"
  | "unsafe"
  | "spam"
  | "impersonation"
  | "other";

export function ReportSheet({
  other,
  onClose,
  onSubmit,
}: {
  other: string;
  onClose: () => void;
  onSubmit: (c: ReportCategory, details: string) => void;
}) {
  const [cat, setCat] = useState<ReportCategory>("harassment");
  const [details, setDetails] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60" onClick={onClose}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl bg-card p-6 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-display text-lg text-foreground">Report a concern about {other}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Anything you share is private. Athena's safety team reviews all reports.
        </p>
        <div className="mt-4 space-y-2">
          {(["harassment", "unsafe", "spam", "impersonation", "other"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setCat(k)}
              className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm ${cat === k ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground"}`}
            >
              {labelFor(k)}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="What happened? (optional)"
          className="mt-3 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onSubmit(cat, details)}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Submit
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function labelFor(k: string): string {
  switch (k) {
    case "harassment": return "Harassment or disrespect";
    case "unsafe": return "I felt unsafe";
    case "spam": return "Spam or off-platform pressure";
    case "impersonation": return "This didn't seem like a real person";
    default: return "Something else";
  }
}
