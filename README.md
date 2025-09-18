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
2. Copy `.env.example` to `.env.local` and set `VITE_GEMINI_API_KEY` to your Gemini API key
3. Run the app:
   `npm run dev`

## Environment variables

The app reads its Gemini credentials from the standard Vite prefix so that the
key is available in the browser bundle. When developing locally create a
`.env.local` file from the provided example:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set the `VITE_GEMINI_API_KEY`. The same variable must
be configured in any deployment environment.

## Deploying to Vercel

This project is ready to be deployed as a static Vite site on Vercel.

1. Create a new Vercel project and select this repository.
2. In the **Environment Variables** section add `VITE_GEMINI_API_KEY` with your
   Gemini API key (repeat for Preview/Production as needed).
3. Vercel automatically detects the framework and runs `npm install` followed by
   `npm run build`. The generated `dist` directory is served as static assets.
4. The included `vercel.json` ensures single-page application routing works, so
   deep links render correctly without additional configuration.

After the first build completes, visit the generated Vercel URL to confirm the
application loads and AI powered features work with your configured API key.
