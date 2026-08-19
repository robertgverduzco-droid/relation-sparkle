# D5 — Voice, Audio & Arrival Experience Closure (V1)

## v1.0 · CANONICAL (2026-08-19)

Subordinate to the Constitution, Privacy & Security, Trust & Safety, E1–E8,
the Design Foundation, D1–D6, Final Design Integration and the Athena Presence
Curve. Amends none of them. Closes the V1 portions of **D-06**, **D-12**,
**D-35** and **D-39**; the remaining production-voice decisions stay open.

`marin` remains the V1 Athena voice, with the D5 delivery direction unchanged.

## 1. First-ever arrival

On the member's first-ever arrival with Athena — and only there — her first
spoken and written line is:

> Welcome to Athena. The next evolution of matchmaking. Let's begin with you.

It is the opening line of the first-meeting sequence, which runs only when no
prior conversation exists for the member. It cannot replay: once a single turn
is stored, the branch is never entered again. The line enters the transcript as
text at the same moment it is spoken, so a member without audio reads exactly
what another member hears.

## 2. Returning member

Today greets a returning member with `Welcome back, {first name}.`, or
`Welcome back.` when no usable member-selected name exists. The name comes only
from the member's own display name; an email-shaped value, a single character or
anything Athena inferred is rejected in favour of the plain form. Nothing is
appended — no encouragement, no prompt, no product line.

## 3. Meaningful-return rule (exact)

Athena **speaks** the return greeting when all of the following hold:

1. the surface is Today (never a conversation, message thread, reflection,
   introduction, membership or safety flow);
2. the browser session has not been greeted yet (`sessionStorage`
   `athena-session-greeted`) — so app switching, backgrounding, tab focus
   changes and in-app navigation never re-trigger it;
3. at least **30 minutes** have passed since the member's last recorded
   activity (`localStorage` `athena-last-seen`, refreshed on Today and each
   minute of an Athena conversation);
4. a previous activity timestamp exists — a first-ever visit is not a return;
5. the member's audio preference is voice.

The **visible** greeting is unconditional. Audio is the only thing this rule
gates.

## 4. Connection field / presence

No new visual language. While the greeting plays, the existing Athena presence
indicator moves from `quiet` to its existing `speaking` state — a slightly wider
glow and the words "Athena is speaking". Reduced motion suppresses the breath
and keeps the label. No avatar, face, waveform, orb or added animation, and the
connection field itself is untouched.

## 5. Sonic signature / landing chime

The previously recorded uncontrolled landing chime **no longer exists in
runtime** and is formally retired; V1 ships with no chime, no event sounds and
no notification tones. D5 §19's ~three-tone direction is preserved as a future
possibility under D-06/D-38 and is deliberately not implemented in V1 — the
speaking voice is Athena's entire sonic presence. Tests forbid reintroducing an
oscillator or chime on the arrival, Today, field and greeting surfaces.

## 6. Playback and captions

Every spoken line already exists as text in the transcript. Playback now states
itself in words — "Athena is speaking. Her words appear above as she says them."
— inside an `aria-live="polite"` region, alongside a **Stop** control that meets
the tap-target standard. Switching to Text Only stops any speech in flight, so
the preference behaves as a true kill switch. No playback state depends on
animation.

## 7. Privacy

No change to the TTS/STT boundaries. Synthesized audio is fetched per line,
played from a blob URL and revoked on completion; the response is `no-store`
and nothing is cached, uploaded or persisted. No recording, transcript of the
member's voice beyond the existing transient STT path, and no voiceprint or
biometric derivation of any kind.

## 8. Remaining open (unchanged)

D-06/D-38 sonic signature realization, D-12/D-36 production-voice audition
beyond `marin`, D-37 spoken composition, D-40 barge-in technology, D-13 haptics.

## Revision history

| Version | Date | Description |
|---|---|---|
| 1.0 | 2026-08-19 | First-arrival welcome, return greeting and session rule canonized; chime retired; playback/caption divergence closed. |
