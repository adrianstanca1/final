# 🚀 Deployment Guide

This document captures the current release process for the AS Agents platform so you can ship safely and repeatably. It reflects the repository as it exists today—no placeholder commands or imaginary services—so treat it as the single source of truth when preparing a production release.

## ✅ Readiness checklist

Before promoting a build ensure every item below passes locally or in CI:

- [ ] Install fresh dependencies with `npm ci`.
- [ ] Type safety: `npm run type-check`.
- [ ] Unit tests: `npm run test -- --run`.
- [ ] Production build: `npm run build`.
- [ ] Verify `.env.production`, `.env.local`, and Vercel secrets contain the Gemini key that UI features require.
- [ ] Confirm the changelog/README updates that reference deployment steps remain accurate.

Document the results in your pull request description or release ticket so reviewers can confirm the state quickly.

## 🔐 Environment variables

| Variable | Where to set it | Purpose |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | `.env.local` for local runs, Vercel project settings for Preview/Production | Client-exposed Gemini key required for all AI powered flows. |
| `GEMINI_API_KEY` | GitHub Actions secrets & Vercel project settings | Server-side Gemini key. The workflows fall back to this value if the Vite-prefixed key is missing. |
| `VITE_API_BASE_URL` | Optional (local + Vercel) | Point the UI at a hosted authentication API. Leave unset to use the encrypted mock service. |

`vercel.json` mirrors the shared Gemini secret so the CLI and automation stay in sync. Run `vercel secrets add gemini_api_key <value>` if you rotate credentials.

## 🤖 CI/CD automation

Three workflows keep the repository deployable:

1. **CI (`.github/workflows/ci.yml`)** – Runs on every push and pull request. Installs dependencies with `npm ci`, runs Vitest, and builds the production bundle to guard against regressions.
2. **Deploy to Vercel (`.github/workflows/vercel-deploy.yml`)** – Repeats the CI checks and, on success, publishes a preview deployment for pull requests or promotes the artefact to production when the commit lands on `main`. Concurrency control ensures only the newest commit per branch deploys.
3. **Deploy to GitHub Pages (`.github/workflows/deploy.yml`)** – Optional static export retained for disaster recovery. Triggered manually or on pushes to `main` when you need a Pages-hosted mirror.

Keep the CI workflow required in branch protection so code cannot merge without a green build. The Vercel workflow provides the live URL in the Actions run summary for smoke testing.

## 🚀 Manual deployment steps

### Vercel (primary host)

1. Connect the GitHub repository to a Vercel project (Framework: **Vite**, Output directory: **dist**).
2. Add the environment variables listed above for both **Preview** and **Production** environments.
3. Push to `main` (or merge an approved pull request). GitHub Actions runs the **Deploy to Vercel** workflow automatically and promotes the build when it passes.
4. To redeploy or roll back, visit the Vercel dashboard, choose the desired build, and click **Promote to Production** or **Rollback**. The automation will update the environment status accordingly.

### GitHub Pages fallback

1. Enable GitHub Pages in the repository settings with **GitHub Actions** as the source.
2. Trigger the **Deploy to GitHub Pages** workflow manually (Actions → Deploy to GitHub Pages → Run workflow) or push to `main`.
3. The workflow uploads the `dist/` artefact built by Vite and publishes it at the configured Pages URL.

## 🔍 Post-deploy verification

- Load the deployed site (Vercel preview or production URL) and confirm the Gemini-backed experiences render correctly.
- Inspect the browser console/network tab for failed requests or missing environment configuration.
- Run the quick AI regression checklist: open the AI Advisor, request a portfolio summary, and ensure fallback messaging appears when keys are absent.
- Capture the outcome and any issues in the release notes or monitoring channel.

## 🛠️ Rollback playbook

1. **Preview regression**: fix on the feature branch and push a new commit; superseded preview deployments are cancelled automatically.
2. **Production incident**: select a prior healthy deployment in Vercel and click **Rollback**, or revert the offending commit on `main`. The Deploy workflow republishes the previous artefact.
3. **Secret rotation**: update `GEMINI_API_KEY` and `VITE_GEMINI_API_KEY` in GitHub and Vercel, re-run the **Deploy to Vercel** workflow, and verify the AI flows before announcing completion.

Keep this document updated as the release process evolves so the entire team understands how to ship confidently.
