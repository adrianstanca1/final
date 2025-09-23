# Sprint Backlog Seed (Launch Track)

| ID | Title | Description | Owner | Status |
| --- | --- | --- | --- | --- |
| APP-001 | Merge legacy app trees into `src/` | Collapse `final/` and `final-1/` copies into the canonical `src` tree, update build tooling, and remove the stabilisation stub. | Platform | In Progress |
| APP-002 | Auth client integration with backend | Wire `authClient` to the real API gateway, enabling login/register/refresh flows with graceful mock fallback. Includes contract tests vs the OpenAPI schema. | Platform | Todo |
| APP-003 | Dashboard data gateway | Replace direct `mockApi` calls with the backend gateway abstraction and React Query data hooks for dashboards, teams, and projects. | Experience | Todo |
| APP-004 | Terraform baseline for data tier | Provision Aurora PostgreSQL + VPC via `infra/terraform`, document secrets management and operations hand-off. | Infra | In Review |
| APP-005 | Observability enablement | Configure OpenTelemetry, Sentry, and AWS CloudWatch dashboards with golden-signal SLOs ahead of beta. | Intelligence | Todo |
| APP-006 | Linting + formatting CI | Introduce ESLint + Prettier config, add `npm run lint` to GitHub Actions, and enforce formatting on push. | Platform | Todo |
| APP-007 | Persona dashboard polish | Ship futuristic visual refresh for Principal/Owner dashboards including AI insights, 3D site map overlays, and accessibility audit fixes. | Experience | Todo |
| APP-008 | Beta customer onboarding playbook | Draft success metrics, invite flow, and support runbooks; prepare marketing site updates ahead of public launch. | GTM | Todo |

> Update this backlog at sprint planning; link PRs and Jira/Linear tickets as they are opened to keep engineering, design, and ops aligned.
