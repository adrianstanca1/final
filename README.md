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
3. Run the app:
   `npm run dev`

## Deployment automation

This project ships with a fully automated CI/CD pipeline backed by GitHub Actions. Pull requests run tests and builds via the [`CI` workflow](.github/workflows/ci.yml), while merges to `main` trigger the [`Deploy to GitHub Pages` workflow](.github/workflows/deploy.yml) to publish the production site. Refer to [docs/deployment-plan.md](docs/deployment-plan.md) for the complete autonomous deployment plan, including environment setup, secrets management, and rollback guidance.
