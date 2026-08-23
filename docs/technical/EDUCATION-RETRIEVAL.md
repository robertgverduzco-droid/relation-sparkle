# Athena University — Live Reasoning Integration

Status: implementation artifact. Governed by `docs/constitution/L7-operational.md`.
This document describes how the **Canonical Curriculum** (`docs/education/`)
reaches Athena's live reasoning. It is never a source of truth; the Constitution
and the Curriculum are.

## Why this layer exists

Before this pass, only a hand-written ~13.5KB synthesis of the curriculum was
available at runtime, selected by a 7-bucket keyword regex, and only in text
chat. Voice, reflection, and pair reasoning received no situational depth at
all. The corpus existed; live Athena could not reach it.

## Pipeline

```text
docs/education/**.md
   │  scripts/build-education-index.ts   (bun run education:index)
   ▼
src/lib/education/corpus.json     chunk text + provenance (id, doc, kind, heading)
src/lib/education/vectors.json    int8-quantized dense vectors (512d)
   │  src/lib/education-retrieval.server.ts
   ▼  hybrid retrieval + mode policy + Faculty Principle
src/lib/education-context.server.ts   doctrine + retrieved depth, one entry point
   ▼
askAthena · live voice session · reflection · pair reasoning · post-meeting
```

Indexing is a build-time step, run manually whenever `docs/education/` changes:

```bash
bun run education:index
```

Chunks split at heading and paragraph boundaries; the corpus currently yields
1023 chunks from 68 documents.

## Retrieval

Two passes, fused:

- **Dense** — the member's own recent words are embedded through the Lovable AI
  Gateway (`google/gemini-embedding-2`, 512d) and compared by cosine similarity
  against the quantized corpus vectors. This is the primary signal.
- **Lexical** — BM25 over an in-process inverted index, with concept expansion
  (bereavement language reaches grief and family-system material; "goes quiet"
  reaches withdrawal and conflict material). Deterministic, and the system's
  working floor whenever the gateway is unreachable.

Fusion is agreement-weighted rather than fixed-weight: `0.75 · max + 0.25 · min`
of the two normalised relevances. Either signal may carry a turn on its own —
grief is lexically obvious and densely subtle, "we never talk about sex anymore"
is the reverse — and agreement raises confidence.

Below the per-mode floor, **nothing is retrieved**. Ordinary logistics and small
talk return an empty block; Athena is not handed theory for a conversation about
dry cleaning.

## Mode policy

| Mode | Max chunks | Char budget | Floor | Surface |
|---|---:|---:|---:|---|
| `conversation` | 4 | 3600 | 0.45 | `askAthena` |
| `voice` | 3 | 2400 | 0.47 | live session + mid-session supplement |
| `reflection` | 3 | 3000 | 0.45 | `reflectAthena` (Living Profile refinement) |
| `pair` | 5 | 4500 | 0.42 | `reasonPair` |
| `meeting` | 3 | 2800 | 0.45 | post-meeting reflection |

Spoken mode is deliberately tighter: depth must not turn into speech.

## Voice

A realtime session's instructions are fixed when it is minted, so voice is
served twice:

1. **At session open** — `buildLiveInstructions()` retrieves against whatever
   the member has already said today.
2. **Mid-session** — after each completed member turn, the client posts the
   member's last three turns to `POST /api/realtime-education` and injects the
   returned material as an internal system item. Silent when nothing is
   relevant; never spoken, never referenced.

## Faculty Principle at runtime

No single document may supply more than two chunks to one reasoning event. One
framework never quietly does all the reasoning.

## Non-Quotation Standard at runtime

The prompt receives passage text only. Document paths, file names, faculty
names, and college labels are withheld from the model and exist only in the
audit trace. The block is explicitly framed as internal reasoning material that
is never narrated, cited, or named, and that the member's own evidence outranks.

## Observability

`public.education_retrieval_events` records provenance for each reasoning
event: mode, surface, whether the dense pass ran, expanded concepts, candidate
and retrieved counts, injected characters, chunk ids, source documents, and
scores. It stores a one-way `actor_hash`, never a member identifier, and never
member content or model output. Readable by administrators only; writes are
service-role. Logging is best-effort and never blocks a conversation.

## Failure behaviour

- Gateway unavailable → lexical-only retrieval, unchanged contract.
- Retrieval throws → doctrine alone, conversation proceeds.
- Telemetry insert fails → swallowed.

Education deepens reasoning; it is never a precondition for it.

## Change control

Any edit here is reviewed against the governing documents listed in L7
§"Review requirements" before implementation. Editing `docs/education/`
requires re-running the indexer for the change to reach runtime.
