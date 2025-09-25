<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repository contains everything you need to run the AS Agents platform locally and prepare production deployments.

View the hosted experience in AI Studio: https://ai.studio/apps/drive/1bxBJgk2nuKF5tvtdT-YfJQL4PdtvzUvq

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Create a local environment file: `cp .env.example .env.local`
3. Edit `.env.local` and set:
   - `VITE_GEMINI_API_KEY` – your Gemini client key so AI features work in the browser.
   - (Optional) `VITE_API_BASE_URL` – point authentication at a deployed backend. If omitted, the encrypted in-browser mock service is used.
4. Start the dev server: `npm run dev`

## Environment variables

The app reads Gemini credentials from the standard Vite prefix so they are available to browser code. For local development update `.env.local`; in CI/CD mirror the same values into build secrets.

| Variable | Description |
| --- | --- |
| `VITE_GEMINI_API_KEY` | Required. Client-exposed Gemini key used by the browser app. |
| `GEMINI_API_KEY` | Optional. Server-side Gemini key used during builds and as a fallback for tooling. |
| `VITE_API_BASE_URL` | Optional. REST endpoint for an external auth service. When omitted the mock API persists data in encrypted browser storage. |

## Deploying to Vercel

1. Create a new Vercel project and link this repository.
2. In **Environment Variables** add `VITE_GEMINI_API_KEY` (and optionally `GEMINI_API_KEY`) for Preview and Production.
3. Vercel automatically runs `npm install` followed by `npm run build`; the generated `dist` directory is served as static assets.
4. The included `vercel.json` enables single-page application routing so deep links render without additional configuration.

After the first build completes, visit the generated Vercel URL to confirm the application loads and Gemini powered features work with your configured API key.

### Configure authentication backend

By default the registration and login flows use the encrypted in-browser mock API. Provide a `VITE_API_BASE_URL` in `.env.local` (and mirror it in production secrets) to connect to a real authentication service. If that service becomes unreachable you can allow automatic fallback to the mock implementation by exposing `window.__ASAGENTS_API_BASE_URL__` at runtime or by calling `configureAuthClient({ baseUrl, allowMockFallback: true })` during app bootstrap.

## Deployment automation

This project ships with a fully automated CI/CD pipeline backed by GitHub Actions and Vercel.

- Pull requests run tests and builds via the [`CI` workflow](.github/workflows/ci.yml).
- Previews and production releases are handled by the [`Deploy to Vercel` workflow](.github/workflows/vercel-deploy.yml). Pushes to `main` promote the build to production; pull requests publish preview URLs for QA.
- The legacy GitHub Pages workflow remains available in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for static exports if you need an alternative host.

### Operations playbooks & secrets

- **Runbooks & responsibilities**: [docs/deployment-plan.md](docs/deployment-plan.md) outlines automation flow, operational checklists, and ownership model for engineers, reviewers, QA, and on-call.
- **Vercel-specific setup**: follow [docs/vercel-deployment.md](docs/vercel-deployment.md) to connect the repository to Vercel and provision `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`.
- **Gemini credentials**: store the shared Gemini credential as `GEMINI_API_KEY` in repository secrets and mirror it to `VITE_GEMINI_API_KEY` (or provide a separate client-safe key). Developers keep personal keys in `.env.local` for local runs.
- **Monitoring**: follow the plan's observability section to wire synthetic uptime checks and error tracking so deployments stay production ready.
