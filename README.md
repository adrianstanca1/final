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

## Persistent backend (optional)

The UI now supports a live SQLite-backed API. To boot the service locally:

1. Seed the database (creates `backend/data/app.db`):
   ```bash
   npm run db:seed
   ```
2. Start the API server:
   ```bash
   npm run dev:server
   ```
3. Point the frontend to the API by defining `VITE_BACKEND_URL` in your environment, for example:
   ```bash
   VITE_BACKEND_URL=http://localhost:4000 npm run dev
   ```

When the backend is available, the Clients and Invoices dashboards automatically switch to the live data source and expose the connection status in their header metrics.
