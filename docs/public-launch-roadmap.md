# Public Launch Development Roadmap

## Vision
Deliver a production-ready, AI-augmented construction operations platform with real-time project intelligence, immersive dashboards, and seamless collaboration across principals, project managers, field teams, and clients. The experience should reflect a technology-forward construction company: responsive design, spatial visualisations, automation assist, and trust-by-design security.

## Current State Snapshot
- **Frontend**: Legacy `App.stable.tsx` stub exposed at repo root while full experience lives under `final/` with divergent copies (`final-1/`). Significant merge conflicts (e.g. `final/components/Dashboard.tsx`, `final/contexts/AuthContext.tsx`) and duplicated assets block builds.
- **Services**: Rich mock API (`services/mockApi.ts`) with caching, validation, and offline queueing. Experimental backend gateway (`final-1/services/backendGateway.ts`) not wired to live code. Auth client already supports remote base URL + mock fallback.
- **Data**: In-browser storage with security hardening, but no real database. No schema definition or migration plan.
- **Tooling**: Vite + Vitest pipeline, CI/CD scripts in place. Monitoring/alerting and linting incomplete. Readme still contains conflict artifacts.

## Guiding Principles
1. **Single source of truth** – eliminate duplicate app trees and consolidate code into a clean `src/` structure.
2. **API-first** – design contract-driven services with typed DTOs, OpenAPI specs, and SDK generation.
3. **Secure-by-default** – enforce authn/z, audit logging, rate limiting, and encryption in transit & at rest.
4. **Progressive enhancement** – keep mock/offline behaviour for demos while seamlessly upgrading to live backend when configured.
5. **Operational excellence** – automated testing, observability, and deployment gating before public launch.

## Target Architecture Overview
- **Frontend**: React + Vite monorepo (TypeScript) organised by business capabilities (`features/`, `entities/`, `shared/`). Global state via React Query + Zustand, design system powered by Tailwind or PandaCSS with theme tokens.
- **Gateway/API Layer**: Edge-ready BFF (Next.js App Router or NestJS) exposing REST+GraphQL façade, handling auth, caching, and message bus integration. Provides typed SDK consumed by frontend.
- **Core Services**: Modular services for Auth, Projects, Financials, Operations, Documents running on container platform (Fly.io/Render) with Docker images, auto-scaling, and blue/green deploys.
- **Data Platform**: PostgreSQL (primary OLTP) + Redis (caching/queues) + S3/GCS (object storage). Prisma as ORM + schema registry. Event streaming via Kafka/Redpanda feeding analytics warehouse (BigQuery/Snowflake).
- **AI & Analytics**: Dedicated service orchestrating Gemini function-calling, model monitoring, prompt management, and safe-guard rails.
- **Observability**: OpenTelemetry pipelines shipping traces/logs/metrics to Grafana Cloud or Datadog; uptime monitoring via Checkly/Synthetic tests.

## Workstreams & Milestones

### 1. Platform Stabilisation (Week 0-2)
- Resolve merge conflicts, delete stale `final-1/`, migrate active code into `src/` with domain-driven structure (e.g. `src/app`, `src/features`, `src/services`).
- Reinstate full UI shell by swapping `App.stable.tsx` for consolidated application entrypoint.
- Reinforce type safety and linting (ESLint + Prettier); add CI checks.
- Author ADR documenting final architecture & module boundaries.

### 2. Backend & Data Foundations (Week 1-4)
- Define canonical data model: ERD covering companies, users, projects, tasks, equipment, financials, documents, AI insights.
- Choose stack (e.g. **NestJS/TypeScript + PostgreSQL + Prisma** or **FastAPI + SQLAlchemy**). Provision Dev/Staging/Prod environments (Fly.io/Render/Vercel Functions).
- Publish OpenAPI spec for core domains; scaffold service modules (Auth, Projects, Tasks, Financials, Operations, Analytics).
- Implement database migrations, seed scripts, service-layer validation, and logging.
- Integrate `authClient` with real auth endpoints (login, refresh, MFA, invites) while preserving mock fallback.

### 3. API Integration Layer (Week 3-6)
- Port `backendGateway` concept into main app: data loaders using SWR/React Query, optimistic updates, offline queue.
- Replace direct `mockApi` imports with dependency-injected `dataService` that routes to REST/GraphQL endpoints when available.
- Add error boundaries, retry/backoff, request tracing headers.
- Implement feature toggles for beta rollout via remote config.

### 4. Frontend Experience Upgrade (Week 4-7)
- Establish futuristic UI system: glassmorphism, dynamic gradients, contextual 3D site maps (Leaflet + custom overlays).
- Build responsive dashboards for each persona (Principal, Owner, Foreman, Client) with real-time KPI tiles (health score, RFI velocity, cash flow, safety index).
- Enhance workflows: drag-and-drop scheduling, AI-powered risk summaries, voice-to-task entry (Web Speech API fallback).
- Improve accessibility (WCAG 2.1 AA) and internationalisation.

### 5. Services & Automation (Week 5-8)
- Integrate analytics pipeline (Segment/Snowplow) feeding a warehouse (BigQuery/Snowflake) for KPI dashboards.
- Implement notification service (email/SMS/push) via SendGrid/Twilio, wired to audit log + automation rules.
- Deploy document management microservice with signed URLs (S3/GCS) and real-time co-editing roadmap.
- Build AI service layer using Google Gemini for summaries, forecasts, resource suggestions with guardrails & prompt logging.

### 6. Security, Compliance & Quality (Week 6-9)
- Penetration testing + threat modeling; harden CORS, CSP, secure cookies, secret rotation.
- SOC 2 readiness checklist, DPA templates, backup/restore runbooks.
- Expand automated testing: unit (Vitest), integration (Playwright), contract tests vs backend, synthetic monitoring.

### 7. Launch Preparation (Week 8-10)
- Beta testing program: recruit pilot customers, collect feedback loops inside app (in-product NPS, session replay).
- Production readiness review (load testing, chaos experiments, rollback drills).
- Marketing site & onboarding academy; pricing, packaging, and billing integration (Stripe) if required.
- Final go/no-go with observability dashboards, incident response playbooks, support SLAs.

## Database Integration Strategy
- **Primary store**: Amazon Aurora PostgreSQL (serverless v2) in `eu-west-2` via Terraform, with Secrets Manager-managed credentials and optional reader cluster for analytics workloads.
- **Schema governance**: maintain Prisma schema + ERD docs in `docs/data-model/`, enforce migration review gates and automated drift detection in CI.
- **Data access patterns**: expose read models via dedicated reporting schema and cached materialised views for dashboards; apply row-level security for multi-company tenancy.
- **Sync & backups**: nightly logical backups (pg_dump) with point-in-time recovery via WAL archiving; replicate to read replica for analytics workloads.
- **Data quality**: schedule dbt or Dagster jobs to reconcile mock data migrations, run anomaly detection, and surface data quality metrics to the ops squad.
- **Security**: store credentials in Vault/Secrets Manager, enforce TLS, audit logging, and encryption-at-rest policies across environments.

## Cross-Cutting Tasks
- **Design System**: Create Figma kit mirroring code components; adopt token-based theming (Style Dictionary).
- **Documentation**: Living developer portal (Docusaurus) covering API docs, runbooks, architecture, release notes.
- **Data Privacy**: Implement consent management, data retention policies, and region-based data residency if serving EU/UK clients.
- **Performance**: Lighthouse budgets, code-splitting, edge caching via Vercel, prefetch critical views.

## Team & Execution Model
- **Squads**: Platform (backend + infra), Experience (frontend + design), Intelligence (AI + analytics), QA/Compliance.
- **Ceremony**: Bi-weekly milestones with demo, retro, and risk review. Maintain roadmap in Linear/Jira aligned to this document.
- **KPIs**: Time-to-insight (<5s for dashboards), Uptime (99.9%), MTTR (<30m), Beta activation (>60%).

## Dependencies & Risks
- Recruiting backend engineer with infra experience.
- Third-party API limits (Gemini quotas, mapping providers).
- Legacy data migration from mock environment requires transformation scripts.
- Security certification timeline may impact launch date.

## Deliverables Summary
- Consolidated codebase with real backend integration hooks.
- Production-grade API + database with migrations and observability.
- Futuristic, persona-driven UI with AI augmentation.
- Comprehensive security, compliance, and operational readiness for public launch.

---
Status owners should update this roadmap weekly, noting progress, blockers, and newly identified work.
