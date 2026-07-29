# Athena — Master Archive

Everything required to rebuild Athena from scratch, independent of Lovable.

## Contents

```
athena/
├── ARCHIVE_README.md          ← this file
├── README.md                  ← original project readme
├── AGENTS.md                  ← agent working notes
├── package.json, bun.lock     ← dependency manifest
├── tsconfig.json, vite.config.ts, eslint.config.js, components.json
├── .env.example               ← environment template (no secrets)
├── public/                    ← static assets, PWA manifest
├── src/                       ← full application source
│   ├── routes/                ← TanStack file-based routes (incl. api/)
│   ├── lib/                   ← server + client business logic
│   │   ├── *.functions.ts     ← thin server-fn wrappers
│   │   ├── *.server.ts        ← server-only helpers
│   │   └── ai-gateway.server.ts  ← model chokepoint
│   ├── integrations/supabase/ ← generated clients + middleware (do not edit)
│   ├── components/            ← UI (shadcn + custom)
│   ├── hooks/, styles.css
│   └── router.tsx, server.ts, start.ts
├── supabase/
│   ├── config.toml
│   └── migrations/            ← ordered SQL migrations (schema + RLS + GRANTs)
└── docs/
    ├── README.md              ← platform routing guide (14 domains)
    ├── RESTORE.md             ← step-by-step restore instructions
    ├── constitution/          ← L1–L7 + META-PREAMBLE + voice cross-cut
    ├── product/               ← product architecture
    ├── business/              ← memberships, pricing, billing, lifecycle
    ├── technical/
    │   ├── SYSTEM_OVERVIEW.md ← subsystem interactions
    │   └── DEPENDENCY_MAP.md  ← "if I change this file, what else breaks?"
    ├── security/README.md
    ├── governance/README.md
    ├── engineering/MILESTONES.md
    ├── research/              ← Athena Human Understanding Framework
    └── _legacy/               ← superseded docs with redirect stubs
```

Legal / user-facing content lives as routes (canonical copy):

- Terms of Service — `src/routes/terms.tsx`
- Privacy Policy — `src/routes/privacy.tsx`
- Community Guidelines — `src/routes/community-guidelines.tsx`

## Version

Application: **Athena Foundation Stable v2 + Phase 3 shipped**
(see `docs/engineering/MILESTONES.md` for the definitive checkpoint list).

Node.js: 20+ · Bun: 1.1+ · React: 19 · TanStack Start: v1 · Vite: 7 ·
Tailwind CSS: v4 · Backend: Supabase Postgres + Storage + Realtime ·
AI: Lovable AI Gateway (OpenAI-compatible).

## Restore

See `docs/RESTORE.md`. TL;DR:

```sh
tar -xzf athena-master-archive.tar.gz && cd athena
cp .env.example .env    # fill in values
bun install
# apply supabase/migrations/*.sql in filename order
bun run dev
```

## System understanding

Start here in order:

1. `docs/README.md` — platform routing guide.
2. `docs/constitution/README.md` — cognitive spine (L1–L7).
3. `docs/technical/SYSTEM_OVERVIEW.md` — how subsystems interact.
4. `docs/technical/DEPENDENCY_MAP.md` — change-impact reference.
5. `docs/RESTORE.md` — practical rebuild.

## What is intentionally NOT in the archive

- Secrets (`.env`, service-role keys, Lovable API keys).
- `node_modules/` — reinstall with `bun install`.
- Generated `.tsbuildinfo` and build output.
- Any user data from the running Supabase database.
