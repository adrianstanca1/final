<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bxBJgk2nuKF5tvtdT-YfJQL4PdtvzUvq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Point authentication at a deployed backend by setting `VITE_API_BASE_URL` in `.env.local`. When omitted the app runs in secure local demo mode and persists accounts in browser storage.
4. Run the app:
   `npm run dev`

### Configure authentication backend

By default the registration and login flows use the encrypted in-browser mock API. Provide a `VITE_API_BASE_URL` in `.env.local` to connect to a real authentication service. If that service becomes unreachable you can allow automatic fallback to the mock implementation by exposing `window.__ASAGENTS_API_BASE_URL__` at runtime or by calling `configureAuthClient({ baseUrl, allowMockFallback: true })` in your initialization code.

## Deployment automation

This project ships with a fully automated CI/CD pipeline backed by GitHub Actions and Vercel.

- Pull requests run tests and builds via the [`CI` workflow](.github/workflows/ci.yml).
- Previews and production releases are handled by the [`Deploy to Vercel` workflow](.github/workflows/vercel-deploy.yml). Pushes to `main` promote the build to the production environment; pull requests publish preview URLs for QA.
- The legacy GitHub Pages workflow remains available in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for static exports if you need an alternative host.

### Operations playbooks & secrets

- **Runbooks & responsibilities**: [docs/deployment-plan.md](docs/deployment-plan.md) outlines the automation flow, operational checklists, and ownership model for engineers, reviewers, QA, and on-call.
- **Vercel-specific setup**: follow [docs/vercel-deployment.md](docs/vercel-deployment.md) to connect the repository to Vercel and provision the required secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- **Gemini credentials**: store the shared Gemini credential as `GEMINI_API_KEY` in repository secrets and mirror it to `VITE_GEMINI_API_KEY` (or provide a separate client-safe key). Developers keep personal keys in `.env.local` for local runs.
- **Monitoring**: follow the plan's observability section to wire synthetic uptime checks and error tracking so deployments stay production ready.
