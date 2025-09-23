<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This repository contains the full source for the AS Agents construction intelligence platform.

View the app in AI Studio: https://ai.studio/apps/drive/1bxBJgk2nuKF5tvtdT-YfJQL4PdtvzUvq

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `VITE_GEMINI_API_KEY` (and, if required, `GEMINI_API_KEY`) in `.env.local`
4. (Optional) Add `VITE_API_BASE_URL` to point at a deployed authentication/REST backend. Without it the app runs in secure local demo mode and stores accounts in browser storage.
5. Start the dev server: `npm run dev`

The application source now lives in `src/`. Import aliases use the `@/` prefix so components can be referenced as `@/components/...`.

## Environment variables

The app reads Gemini credentials with the standard Vite prefix so the key is available to the browser bundle. When developing locally create a `.env.local` file from the provided example:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set `VITE_GEMINI_API_KEY`. Mirror this variable in every deployment environment. When connecting to a remote authentication service set `VITE_API_BASE_URL`. You can enable fallback to the encrypted in-browser mock API by exposing `window.__ASAGENTS_API_BASE_URL__` at runtime or by calling `configureAuthClient({ baseUrl, allowMockFallback: true })` during initialization.

## Deploying to Vercel

This project is ready to be deployed as a static Vite site on Vercel.

1. Create a new Vercel project and select this repository.
2. In **Environment Variables** add `VITE_GEMINI_API_KEY` (and any other client-safe variables). Provide `GEMINI_API_KEY` or `VITE_API_BASE_URL` secrets for the relevant environments.
3. Vercel automatically runs `npm install` followed by `npm run build`. The generated `dist` directory is served as static assets.
4. The included `vercel.json` ensures single-page application routing works so deep links render correctly without additional configuration.

After the first build completes, visit the generated Vercel URL to confirm the application loads and AI-powered features work with your configured API key.

## Deployment automation

This project ships with a fully automated CI/CD pipeline backed by GitHub Actions and Vercel.

- Pull requests run tests and builds via the [`CI` workflow](.github/workflows/ci.yml).
- Previews and production releases are handled by the [`Deploy to Vercel` workflow](.github/workflows/vercel-deploy.yml). Pushes to `main` promote the build to production; pull requests publish preview URLs for QA.
- The legacy GitHub Pages workflow remains available in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for static exports if you need an alternative host.

### Operations playbooks & secrets

- **Runbooks & responsibilities**: [docs/deployment-plan.md](docs/deployment-plan.md) outlines automation, operational checklists, and ownership model for engineers, reviewers, QA, and on-call.
- **Vercel-specific setup**: follow [docs/vercel-deployment.md](docs/vercel-deployment.md) to connect the repository to Vercel and provision required secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- **Gemini credentials**: store the shared Gemini credential as `GEMINI_API_KEY` in repository secrets and mirror it to `VITE_GEMINI_API_KEY` (or provide a separate client-safe key). Developers keep personal keys in `.env.local` for local runs.
- **Monitoring**: follow the plan's observability section to wire synthetic uptime checks and error tracking so deployments stay production ready.
