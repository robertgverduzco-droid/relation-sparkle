# Athena screen — arriving with her, not with a transcript

## What it looks like when you arrive

Tapping Athena from the field opens a still, dark screen. Centre of the screen is
Athena's presence — the same living field already used during a live voice call,
held at its calm "resting" energy. No message list, no scroll, no cards.

Below the presence, one short line in her own register, chosen by state:

- first ever visit — "I've been looking forward to meeting you."
- returning, mid-foundational — "We can pick up wherever you like."
- returning, past readiness — a plain, quiet greeting with the member's name.

Nothing else competes for attention. The screen does not scroll.

## Where recent turns live

Nowhere on arrival. There is no "last 3 messages" strip — a partial transcript is
still a transcript, and it re-creates the thing being removed.

Once a member speaks or types, only the live exchange appears: her reply (and the
member's last line above it) fades in beneath the presence, one turn at a time,
and fades back out when the exchange settles. Long replies scroll inside that
block only, not the page. Boundary, readiness and crisis notices keep their exact
current behaviour, attached under her reply.

The full history moves to the settings sheet, listed plainly alongside the
account options — "Past conversation". Opening it shows the complete transcript on
its own quiet screen. Not promoted anywhere else. If a member wonders whether
something came up before, they ask her.

## How someone starts talking

Two controls, side by side and equal, low on the screen above the safe area:

- **Speak** — starts the live voice session, exactly the existing path. The
  presence expands to the full-screen voice environment already built; ending it
  returns to this same still screen.
- **Type** — reveals the existing composer inline (mic-to-transcribe button
  included, unchanged) and focuses it. Dismissing it returns to stillness.

Whichever mode the member chose (Voice & Text vs Text Only) still governs whether
she speaks aloud; that setting stays in the settings sheet.

## Technical notes

- `src/routes/_authenticated/athena.tsx` — presentation restructure only. All
  state, server calls, hydration, foundational milestone / readiness / boundary /
  crisis logic, live session wiring and speech playback stay exactly as they are.
  The transcript scroller is replaced by a `RestingPresence` + current-exchange
  region; the composer becomes conditionally revealed.
- New `src/components/athena-resting-presence.tsx` — reuses the canvas field from
  `athena-live-presence.tsx` at listening-level energy, reduced-motion safe.
- New route `src/routes/_authenticated/athena.history.tsx` — read-only transcript
  from the same `interview_sessions.messages` already loaded, with `FieldBack`.
- `VoiceSettingsSheet` gains an understated "Past conversation" link plus links to
  the existing account options / sign out (which live in `account.tsx`).
- No schema, loader, or server-function changes. Existing tests keep passing;
  add coverage that the Athena screen renders no transcript on arrival and that
  history is reachable from settings.
