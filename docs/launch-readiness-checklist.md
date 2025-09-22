# Launch Readiness Checklist

## Immediate Actions (Week 0)
- [ ] Resolve outstanding merge conflicts under `final/` (`components/Dashboard.tsx`, `contexts/AuthContext.tsx`, others flagged by `git status`).
- [ ] Decide canonical app directory (`src/`) and remove deprecated copies (`final/`, `final-1/`, `App.stable.tsx`).
- [ ] Restore full application entrypoint in `index.tsx` once consolidation is complete.
- [ ] Stand up shared `.env` contract (frontend + backend secrets) and document in README without merge artefacts.
- [ ] Enable ESLint + Prettier, wire to `npm run lint` in CI.

## Backend & Data (Weeks 1-3)
- [ ] Finalise stack choice (NestJS+Postgres or equivalent) and create repository with CI/CD.
- [ ] Draft ERD & migration plan; implement Prisma/Knex migrations and seed data aligned with current mock schema.
- [ ] Publish OpenAPI spec v1 (Auth, Projects, Tasks, Financials, Operations) and generate TypeScript client.
- [ ] Implement authentication (JWT, refresh, MFA) and connect `services/authClient.ts` to live endpoints.
- [ ] Configure staging database backups, monitoring, and alerting.
- [ ] Stand up `infra/terraform` directory with reproducible environments (VPC, DB, storage, secrets) and document access rotation.
- [ ] Define data retention & archival policies; script anonymised fixture import from mock data for beta demos.

## Frontend Integration (Weeks 2-5)
- [ ] Refactor services to consume new `backendGateway` with graceful mock fallback.
- [ ] Introduce data fetching hooks (React Query/SWR) per domain with optimistic updates and retry policies.
- [ ] Update dashboards and persona views to read from unified data service; remove direct `mockApi` imports.
- [ ] Implement feature flag service (ConfigCat/LaunchDarkly or in-house) to gate beta features.
- [ ] Ensure offline modes & background sync queues degrade gracefully when backend unavailable.
- [ ] Add contract tests validating SDK typings against OpenAPI schema in CI.

## Experience & Design (Weeks 3-6)
- [ ] Curate futuristic visual language (Figma kit) and sync with component library (`components/ui`).
- [ ] Upgrade dashboards with live KPIs, timeline heatmaps, AI insights; validate on mobile and desktop.
- [ ] Add collaboration affordances: comments, assignments, notifications.
- [ ] Run WCAG 2.1 AA audit; fix keyboard and screen-reader gaps.

## Ops, Security & Compliance (Weeks 4-8)
- [ ] Integrate telemetry (OpenTelemetry, Sentry, Logflare) and define golden signals dashboards.
- [ ] Configure alerting, on-call rotations, escalation playbooks.
- [ ] Perform threat model, implement security headers, rate limiting, and secrets rotation.
- [ ] Schedule third-party penetration test; address findings.
- [ ] Complete SOC 2 readiness gap analysis and draft policies (access, change management, incident response).

## Launch Preparation (Weeks 7-10)
- [ ] Recruit pilot customers; run UAT sessions, capture feedback in tracked issues.
- [ ] Conduct load & chaos testing; define SLOs and error budgets.
- [ ] Finalise pricing, billing integration (Stripe), and public marketing site updates.
- [ ] Train support & sales teams; publish knowledge base articles and onboarding videos.
- [ ] Execute launch go/no-go review with stakeholder sign-off and rollback plan.

Keep this checklist in version control and update status weekly to maintain shared visibility across teams.
