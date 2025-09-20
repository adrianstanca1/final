# Autonomous Deployment Plan

## Objectives

- Provide a hands-free deployment workflow that validates every change, keeps production in a releasable state, and publishes updates automatically after approval.
- Guarantee that the Gemini-powered AI functionality keeps working across environments by managing credentials and configuration in the pipeline.
- Offer clear operational guidance so engineers, QA, and product stakeholders can understand the release cadence, rollback levers, and monitoring touchpoints.

## Environment Strategy

| Environment | Purpose | Trigger | Hosting | Notes |
|-------------|---------|---------|---------|-------|
| Local | Feature development, exploratory testing | `npm run dev` | Developer machine | Requires a personal `GEMINI_API_KEY` in `.env.local`. |
| Pull Request (CI) | Automated quality gate before merge | Pull requests to `main` | GitHub Actions `CI` workflow | Runs tests and build to catch regressions early. |
| Production | Customer-facing release | Merge/push to `main` or manual trigger | GitHub Pages via `Deploy to GitHub Pages` workflow | Publishes the static Vite build (`dist/`). Requires `GEMINI_API_KEY` secret. |

## Branching & Release Management

1. **Feature branches**: developers branch from `main` and open pull requests when ready. Small, incremental changes are encouraged.
2. **Pull request checks**: the `CI` workflow installs dependencies, runs Vitest, and builds the application. Merges are blocked until this workflow succeeds.
3. **Production deployment**: merges to `main` automatically queue the deployment workflow. GitHub Pages retains the history of published revisions, enabling rollbacks by reverting commits.
4. **Manual redeploy**: maintainers can use the `workflow_dispatch` trigger to redeploy the last successful build if infrastructure changes occur.

## Pipeline Implementation

### 1. Continuous Integration (`.github/workflows/ci.yml`)

- **Checkout & toolchain**: uses `actions/checkout@v4` and `actions/setup-node@v4` with Node.js 20 and npm caching for repeatable builds.
- **Dependency installation**: `npm ci` guarantees a clean install aligned with `package-lock.json`.
- **Quality gates**:
  - `npm run test -- --run` executes Vitest in run mode to surface failing suites.
  - `npm run build` ensures the static bundle compiles before merge.
- **Gemini credentials**: the build step reads `GEMINI_API_KEY` from repository secrets so tests that rely on the configuration can use fallbacks safely without exposing keys.

### 2. Continuous Deployment (`.github/workflows/deploy.yml`)

- **Trigger**: runs on pushes to `main` or on manual dispatch.
- **Build job**: mirrors the CI installation/build process and uploads the Vite `dist/` directory as a GitHub Pages artifact.
- **Deploy job**: publishes the artifact using `actions/deploy-pages@v4` into the `production` environment, exposing the deployed URL through environment metadata.
- **Concurrency control**: prevents overlapping deploys by cancelling superseded runs (`group: pages`).

### 3. Automation flow at a glance

```
developer push/PR --> CI workflow (install → test → build)
                     │
                     └── success on main? ──► Deploy workflow (build → upload → publish)
                                                 │
                                                 └── GitHub Pages production site
```

Every job emits workflow summary annotations. Configure branch protection to require the **CI** workflow before merging, ensuring only artefacts that pass automated checks can progress to production.

### 4. Quality gates & artefacts

- CI uploads Vitest results and the production build output (`dist/`) as ephemeral artefacts for debugging. Enable the "retention period" defaults (90 days) for traceability.
- Deployment exposes the live URL and commit SHA in the run summary, giving stakeholders a direct link for smoke testing.
- Timeout guards (15 minutes per job) fail fast if installations hang, notifying the team earlier.

## Configuration & Secrets

| Name | Type | Scope | Description |
|------|------|-------|-------------|
| `GEMINI_API_KEY` | Repository secret | Workflows | Gemini API key shared across build and runtime. Exposed to Vite as `process.env.GEMINI_API_KEY` during builds. |
| `GEMINI_API_KEY` | Local env var | Developer machines | Developer-specific Gemini key for local testing, set in `.env.local`. |

**Setup checklist:**

1. Store `GEMINI_API_KEY` in the repository secrets UI.
2. Enable GitHub Pages for the repository with the "GitHub Actions" source.
3. (Optional) Restrict the `production` environment with reviewers for controlled releases.

## Observability & Quality Signals

- **Workflow status**: monitor the `CI` and `Deploy to GitHub Pages` workflows in the Actions tab. Failures block releases.
- **Pages deployment history**: GitHub Pages keeps a timeline of deployments for traceability.
- **Release dashboards**: pin the Pages environment URL and latest workflow runs to the repository README or team dashboard for at-a-glance health.
- **Synthetic checks**: configure an UptimeRobot/Checkly probe that hits the Pages URL after each deployment and alerts on non-200 responses.
- **Runtime monitoring**: integrate browser analytics or error tracking (e.g., Google Analytics, Sentry) in future iterations to watch for regressions post-release.

## Rollback & Incident Response

1. **Immediate rollback**: revert or cherry-pick fixes onto `main`. The deployment workflow republishes automatically.
2. **Hotfix policy**: create a hotfix branch from `main`, land the fix with an expedited PR, and allow CI to validate before deployment.
3. **Secret rotation**: if the Gemini key is compromised, rotate it in the Google Cloud console and update the `GEMINI_API_KEY` secret. Redeploy using the manual trigger once updated.

## Operational Runbooks

### Pre-merge checklist (engineers)

1. Branch from `main` and keep commits focused and reviewable.
2. Run `npm run test` and `npm run build` locally before pushing to surface dependency issues earlier.
3. Ensure relevant UI changes include screenshots or Storybook references for design sign-off.
4. Verify any Gemini prompt or model updates against sandbox credentials before submitting the PR.

### Post-deploy verification (QA / product)

1. Inspect the GitHub Pages deployment summary to confirm the correct commit SHA and environment URL.
2. Execute the smoke test checklist: application loads, Gemini-backed flows respond with expected latencies, and analytics beacons fire.
3. Record the verification outcome in the deployment log (GitHub issue or Notion page) for auditability.

### Incident playbook (on-call engineer)

1. Capture context: failed workflow logs, Pages deployment status, and any user-facing impact.
2. Decide on rollback vs. hotfix within 15 minutes of detection.
3. Communicate status in the team channel and open an incident ticket containing root-cause hypotheses and mitigation steps.
4. Schedule a retro once the incident is resolved to catalogue preventive actions.

## Release Workflow & Responsibilities

| Role | Primary duties | Handoffs |
|------|----------------|----------|
| Feature engineer | Develop features, author tests, maintain documentation, respond to PR feedback. | Signals QA once PR is ready and CI passes. |
| Reviewer | Perform code review, confirm automated checks, ensure product/UX acceptance criteria are met. | Approves merge or requests changes. |
| QA/Product | Conduct targeted exploratory testing on the deployed Pages environment. | Signs off in deployment log, alerts on regressions. |
| On-call engineer | Monitors workflows, owns incident response, coordinates rollback/hotfix. | Updates stakeholders post-resolution. |

## Maintenance Cadence

- **Weekly**: prune stale preview branches, review GitHub Actions runtime usage, and refresh the deployment log with notable releases.
- **Monthly**: rotate Gemini API keys, verify backup owners for the `production` environment, and update dependency snapshots via `npm audit fix --dry-run` for awareness.
- **Quarterly**: revisit pipeline configuration (Node.js version, caching strategy) and expand automated checks (Lighthouse, accessibility) as the product evolves.

## Future Enhancements

- Add visual regression testing or Lighthouse checks to protect UX quality gates.
- Integrate preview deployments for each pull request (e.g., Vercel/Netlify) if stakeholders need live QA sandboxes.
- Automate notifications (Slack/Teams) on deployment completion and failures for better team awareness.
- Expand monitoring with uptime checks and error alerting to close the feedback loop after release.
