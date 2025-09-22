# Delivery roadmap and deployment cadence

This roadmap captures the ongoing plan to evolve the multitenant workspace, strengthen backend services, and keep deployments predictable. Each phase can be executed iteratively; the checklist format is intended to give engineering, product, and QA a shared view of what "done" means.

## 1. Foundation hardening (current sprint)

- [x] Surface tenant operational summaries and user access matrices directly from the backend mock service.
- [x] Extend admin dashboards with adoption telemetry, watchlists, and recommended actions.
- [x] Add automated tests covering the new analytics endpoints to guarantee regression safety.
- [ ] Instrument runtime logging to capture when adoption scores fall below agreed thresholds (planned).

### Backend milestones

1. **Adoption analytics service**
   - Build aggregated usage scores, MFA coverage checks, and risk posture indicators per tenant.
   - Publish a `getPlatformAdoptionReport` endpoint for admin dashboards and reporting APIs.
   - Store guidance messages that downstream clients can surface as recommended actions.
2. **Access intelligence**
   - Generate `getUserAccessSummary` payloads detailing module availability, denied capabilities, and remediation steps.
   - Reuse the shared permission matrix so UI gating and API responses stay aligned.
3. **Data quality**
   - Extend unit coverage to assert that directory snapshots, operational summaries, and user access responses stay in sync.
   - Add synthetic tests for new recommendation heuristics as they are tuned.

### Frontend milestones

1. **Dashboards and UI wiring**
   - Integrate the adoption scorecard, tenant watchlist, and recommended actions into the principal admin dashboard.
   - Add workspace access summaries to operational dashboards so end users understand their privileges.
2. **Interaction polish**
   - Provide refresh controls, loading feedback, and inline error handling for the new analytics panels.
   - Use consistent badge colouring to communicate adoption health and action priority.
3. **Documentation**
   - Capture the roadmap and deployment cadence in the repo so contributors can follow the plan.

## 2. Expansion backlog (up next)

These items should be tackled once the foundation work is stabilised. They are sequenced by impact and dependency depth.

1. **Real data connectors** – Replace mock aggregations with real telemetry when the production API is available. Include feature flags for staged rollout.
2. **Automated tenant nudges** – Trigger notification workflows (email/in-app) when adoption scores are low or compliance actions are overdue.
3. **Privilege insights for managers** – Surface access summaries inside team management views so admins can adjust roles in place.
4. **Audit-ready exports** – Provide CSV/JSON exports of adoption and access data for compliance teams.
5. **Observability** – Push adoption metrics to monitoring dashboards (Grafana/Data Studio) and add alerts for risk spikes.

## 3. Deployment cadence

1. **Daily**
   - Run `npm run test -- --run` and `npm run build` before merging feature branches.
   - Execute the Vercel preview workflow to verify UI changes in a hosted environment.
2. **Twice weekly**
   - Publish a platform adoption snapshot for principal admins.
   - Review the tenant watchlist and follow up on outstanding recommended actions.
3. **Release train**
   - Promote builds to production every Wednesday once regression tests, adoption reports, and smoke tests pass.
   - Use the GitHub Actions deploy workflow as the single path to production; document exceptions in the deployment log.

Keeping this plan in-repo ensures the entire team understands the multi-phase effort: harden the backend, expose actionable intelligence in the UI, and ship safely with repeatable automation.
