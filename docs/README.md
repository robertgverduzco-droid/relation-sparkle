# Athena Platform Architecture — Routing Guide

This document is the canonical map of the Athena platform. Every future idea, requirement, or subsystem should be routed to one of these top-level domains. Each domain has a clear purpose and a single source of truth.

---

## 1. Constitution
**Purpose:** Why Athena exists, what she values, and how she is permitted to think and act.

**Location:** `docs/constitution/`

**Major components:**
- L1 — Identity (purpose, north star, ultimate goal)
- L2 — Ethics (ethical constitution, user dignity, safety, privacy)
- L3 — Human Understanding (Athena Human Understanding Framework, dimensions, no-labels rule)
- L4 — Epistemics (evidence, confidence, contradiction, uncertainty)
- L5 — Memory (Living Profile, Topic Map, Understanding Facets, forgetting)
- L6a — Cognition & Conversation (how Athena speaks and listens)
- L6b — Relational Reasoning (pair-level compatibility reasoning)
- L6c — Decision & Introduction (introduction philosophy, exploration mode, eligibility)
- L7 — Operations (runtime governance, overrides, escalation)
- META-PREAMBLE — Hierarchical precedence and change-control rules

**Route here when:** Changing Athena’s values, decision rules, voice, memory policy, or ethical boundaries.

---

## 2. Product Architecture
**Purpose:** What the user experiences and how product capabilities are organized.

**Location:** `docs/product/`

**Major components:**
- User journeys and onboarding
- Today dashboard and relationship support
- Match discovery and introduction experience
- Messaging and connection lifecycle
- Voice, text, and AI-assisted interactions

**Route here when:** Defining a new feature, screen flow, or user-facing capability.

---

## 3. Business Architecture
**Purpose:** How Athena’s value is packaged, priced, monetized, and governed commercially.

**Location:** `docs/business/`

**Major components:**
- Membership Tiers & Entitlements
- Pricing & Packaging
- Subscriptions & Billing Lifecycle
- Revenue Rules
- Account Lifecycle
- Payment Provider Integration

**Route here when:** Changing plans, pricing, subscriptions, billing, trials, refunds, promotions, or account commercial state.

---

## 4. Technical Architecture
**Purpose:** How the platform is built, deployed, and run.

**Location:** `docs/technical/` (to be created when needed)

**Major components:**
- Frontend stack (TanStack Start, React 19, Vite 7, Tailwind CSS v4)
- Mobile-first PWA and native-app migration path
- Server functions and API routes
- AI Gateway and model routing
- Supabase backend, auth, storage, and edge functions

**Route here when:** Changing frameworks, deployment targets, infrastructure, APIs, or integration patterns.

---

## 5. Data Architecture
**Purpose:** What data Athena stores, how it is modeled, and how it moves across the system.

**Location:** `docs/data/` (to be created when needed)

**Major components:**
- Core schema (users, profiles, conversations, understanding, reasoning, connections)
- Migration and versioning policy
- Privacy, retention, and deletion rules
- Analytics and derived data models

**Route here when:** Adding tables, changing schema, defining retention, or modeling new entities.

---

## 6. Security & Privacy Operations
**Purpose:** How the platform protects users, data, and trust.

**Location:** `docs/security-privacy/` (to be created when needed)

**Major components:**
- Authentication and session management
- Row-level security (RLS) policies
- Data encryption and access controls
- Incident response and vulnerability management

**Route here when:** Changing auth, access policies, encryption, or responding to security issues.

---

## 7. Trust & Safety
**Purpose:** How Athena prevents harm and responds to abuse, harassment, or safety signals.

**Location:** `docs/trust-safety/` (to be created when needed)

**Major components:**
- Reporting, blocking, and escalation flows
- Safety thresholds and intervention triggers
- Human-in-the-loop review policies
- Content and conduct standards

**Route here when:** Adding safety features, moderation rules, or incident-handling workflows.

---

## 8. Analytics & Outcomes
**Purpose:** How Athena measures whether she is helping people build better relationships.

**Location:** `docs/analytics/` (to be created when needed)

**Major components:**
- Success metrics (relationship quality, longevity, satisfaction)
- Conversation quality and understanding depth
- Match outcomes and introduction efficacy
- Reporting and experimentation framework

**Route here when:** Defining KPIs, adding telemetry, or measuring product and matching outcomes.

---

## 9. Governance
**Purpose:** How decisions about the platform are made, reviewed, and documented.

**Location:** `docs/governance/` (to be created when needed)

**Major components:**
- Decision records and architectural decision logs (ADRs)
- Review cadences and ownership
- Change-control policy for the Constitution
- External review and audit readiness

**Route here when:** Recording a major decision, defining process, or preparing for review.

---

## 10. Agent Runtime Memory
**Purpose:** Persistent, cross-session working memory for the Lovable agent building Athena.

**Location:** `mem://`

**Major components:**
- Core rules (always applied)
- Feature-specific memories
- User preferences
- Security memory

**Route here when:** Storing a persistent preference, correction, or rule the agent must remember.

---

## 11. Research
**Purpose:** External and synthesized knowledge that informs Athena’s models and philosophy.

**Location:** `docs/research/`

**Major components:**
- Athena Human Understanding Framework synthesis
- Big Five, Attachment, Gottman, and related frameworks
- Conversation science and relationship research
- Sources and bibliography

**Route here when:** Adding research findings, frameworks, or source material.

---

## 12. Engineering History
**Purpose:** Milestones, stable checkpoints, and the evolution of the codebase.

**Location:** `docs/engineering/`

**Major components:**
- Named milestones (e.g., Athena Foundation Stable v1)
- Rollback points and what each preserves
- Release notes and migration records

**Route here when:** Creating a milestone, recording a release, or defining a rollback point.

---

## 13. Legacy Archive
**Purpose:** Superseded documents kept for reference, with redirects to canonical replacements.

**Location:** `docs/_legacy/`

**Major components:**
- Archived pre-constitution documents
- Redirect stubs pointing to canonical layers

**Route here when:** A document is superseded but must remain discoverable for history.

---

## How to Use This Guide

1. Identify the domain that owns the concern.
2. If the domain folder does not exist, create it with a `README.md` describing its purpose and components.
3. If a concern crosses domains, document it in the primary domain and link to it from secondary domains.
4. Never place commercial, security, or governance rules inside Product unless the Constitution explicitly requires it there.
