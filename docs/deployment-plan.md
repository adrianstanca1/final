# Autonomous Deployment Plan

This plan enables hands-off delivery of the AI Studio front-end through a fully automated CI/CD pipeline. It is optimised for reliability, rapid feedback, and safe progressive delivery across staging and production.

## Objectives

1. **Automated validation** – ensure every change passes unit tests and produces a shippable build artifact.
2. **Continuous delivery** – automatically push successful changes to staging when `main` is updated.
3. **Safe production releases** – require explicit promotion via version tags with audit-ready approvals.
4. **Observability and rollback** – maintain visibility into deployment health and offer quick rollback paths.

## Pipeline Overview

The pipeline is implemented with GitHub Actions (`.github/workflows/autonomous-deploy.yml`) and runs in three stages:

1. **Quality Gates (`quality-gates` job)**
   - Triggers on pull requests, pushes to `main`, and version tags (`v*`).
   - Installs dependencies with `npm ci`, executes Vitest, and builds the production bundle via `vite build`.
   - Publishes the compiled `dist/` directory as an artifact for downstream jobs, guaranteeing reproducible builds.

2. **Staging Deployment (`deploy-staging` job)**
   - Runs automatically after quality gates for pushes to `main`.
   - Rebuilds the application (to ensure environment parity) and deploys it to a Google Cloud Storage bucket dedicated to staging using `gsutil rsync`.
   - Requires GitHub secrets:
     - `GCP_SERVICE_ACCOUNT_KEY` – JSON credentials for a service account with Storage Admin rights.
     - `GCP_STAGING_BUCKET` – bucket name (no `gs://` prefix) used for staging hosting.
   - Associates with the GitHub `staging` environment to enable approvals, environment variables, and tracking.

3. **Production Deployment (`deploy-production` job)**
   - Executes when a release tag matching `v*` is pushed.
   - Downloads the tested build artifact to avoid rebuild drift and syncs it to the production bucket specified by `GCP_PRODUCTION_BUCKET`.
   - Publishes the public URL to the workflow summary for quick access and attaches to the `production` environment for optional protection rules (approvals, required reviewers, etc.).

## Branching and Release Strategy

- **Feature branches** → Pull requests into `main`. CI runs quality gates to block regressions.
- **Merge to `main`** → Auto deploys to staging, providing a continually updated integration environment.
- **Release tags (`vX.Y.Z`)** → Trigger production promotion. Tags should be created from the commit currently in staging to ensure parity.

## Secrets & Environment Configuration

| Secret | Purpose | Scope |
| --- | --- | --- |
| `GCP_SERVICE_ACCOUNT_KEY` | Authenticates with Google Cloud for both staging and production deployments. | Repository secret |
| `GCP_STAGING_BUCKET` | Target Cloud Storage bucket for staging assets. | Repository secret |
| `GCP_PRODUCTION_BUCKET` | Target Cloud Storage bucket for production assets. | Repository secret |

Additional runtime configuration (e.g., `GEMINI_API_KEY`) should be delivered via platform-specific secret managers or `.env` files during deployment. The CI pipeline does not inject these values directly; instead they should be configured on the hosting platform or served via runtime configuration endpoints.

## Monitoring & Rollback

- **Monitoring**: Integrate Google Cloud Monitoring or third-party tools (e.g., Sentry) using environment-specific credentials. Configure alerts on availability and error-rate metrics.
- **Rollback**: Maintain previous build artifacts by enabling artifact retention in GitHub Actions. Rolling back involves re-tagging the last known good version (e.g., `git tag -f vX.Y.Z <commit>` and pushing with `--force`), automatically redeploying the stored artifact.
- **Smoke Tests**: Optionally extend the workflow with an end-to-end test job post-deployment using Playwright to verify core flows.

## Local Developer Checklist

Before opening a pull request:

1. Run `npm ci` to ensure dependencies are up to date.
2. Execute `npm run test -- --run` and `npm run build` locally.
3. Update documentation and environment variables as needed.
4. Include screenshots for notable UI changes.

Following this checklist keeps the automated pipeline fast and reliable.

## Future Enhancements

- Add automated accessibility audits using Lighthouse CI in the quality gates stage.
- Integrate canary deployments by syncing to a `canary` bucket and running telemetry-based verification.
- Automate creation of release notes using GitHub’s release automation or Gemini-powered summarisation.

