<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Construction Management App with Multimodal AI

This is a comprehensive construction management application with AI integration, role-based access control, and multimodal capabilities. The system integrates TypeScript/React frontend, Node.js services, and Python-based multimodal processing.

View your app in AI Studio: https://ai.studio/apps/drive/1bxBJgk2nuKF5tvtdT-YfJQL4PdtvzUvq

## Multimodal Architecture

This application uses a multimodal system that seamlessly integrates:

- **Frontend**: React 18 + TypeScript with Vite
- **Backend Services**: Node.js/TypeScript API and services
- **Multimodal Processing**: Python FastAPI service for image analysis
- **AI Integration**: Google Gemini API for construction domain AI features

The system is designed with cross-language compatibility in mind, using type-safe interfaces between components.

## Prerequisites

- **Node.js** 18+ with npm
- **Python** 3.8+ (required for multimodal features)
- **Git** (for version control)

## Run Locally

### Standard Setup (Frontend Only)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set `VITE_GEMINI_API_KEY` to your Gemini API key
3. Run the frontend:
   ```bash
   npm run dev
   ```

### Complete Multimodal System

For full multimodal functionality (React frontend + Node.js services + Python processing):

1. Install dependencies:
   ```bash
   npm install
   python -m venv .venv
   source .venv/bin/activate
   pip install -r mm_service/requirements.txt
   ```
2. Run the multimodal integration script:
   ```bash
   ./scripts/multimodal-integration-fixed.sh
   ```
3. Fix ESM imports:
   ```bash
   node scripts/fix-esm-imports.js
   ```
4. Build the multimodal system:
   ```bash
   npm run build:multimodal
   ```
5. Run the multimodal system:
   ```bash
   ./scripts/run-multimodal.sh
   ```

For troubleshooting, run the diagnostic tool:
```bash
node scripts/diagnose-multimodal.js
```

## Environment variables

The app reads its Gemini credentials from the standard Vite prefix so that the
key is available in the browser bundle. When developing locally create a
`.env.local` file from the provided example:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and set the `VITE_GEMINI_API_KEY`. The same variable must
be configured in any deployment environment.

You can also set `GEMINI_API_KEY` in [.env.local](.env.local) for server-side operations.
(Optional) Point authentication at a deployed backend by setting `VITE_API_BASE_URL` in `.env.local`. When omitted the app runs in secure local demo mode and persists accounts in browser storage.

### Configure authentication backend

By default the registration and login flows use the encrypted in-browser mock API. Provide a `VITE_API_BASE_URL` in `.env.local` to connect to a real authentication service. If that service becomes unreachable you can allow automatic fallback to the mock implementation by exposing `window.__ASAGENTS_API_BASE_URL__` at runtime or by calling `configureAuthClient({ baseUrl, allowMockFallback: true })` in your initialization code.

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

## Multimodal Architecture

The application uses a multimodal architecture to handle different languages and environments:

- **Frontend**: React/TypeScript with Vite
- **Backend Services**: Node.js/TypeScript
- **Multimodal Processing**: Python with FastAPI

### Key Integration Points

The multimodal system uses several strategies to ensure seamless integration:

1. **Type-Safe Communication**: Shared type definitions ensure data consistency across languages
2. **Language Bridge**: `utils/languageBridge.ts` provides translation between different data formats
3. **Module Resolution**: `utils/moduleResolver.ts` ensures consistent import paths across environments
4. **Cross-Environment Validation**: `utils/validation.ts` validates data consistently

For more details, see [docs/multimodal-architecture.md](docs/multimodal-architecture.md).

### Directory Structure

```
├── components/        # React components
├── services/          # Backend services
├── utils/             # Shared utilities
│   ├── languageBridge.ts  # Cross-language communication
│   ├── moduleResolver.ts  # Import path resolution
│   └── validation.ts      # Cross-environment validation
├── mm_service/        # Python multimodal service
├── scripts/
│   ├── multimodal-integration-fixed.sh  # Integration setup
│   ├── fix-esm-imports.js               # ESM compatibility fixes
│   ├── diagnose-multimodal.js           # Diagnostic tool
│   └── run-multimodal.sh                # Run script
└── types.ts           # Shared type definitions
```

## Deployment Options

### Standard Deployment (Frontend Only)

This project is ready to be deployed as a static Vite site on Vercel.

1. Create a new Vercel project and select this repository.
2. In the **Environment Variables** section add `VITE_GEMINI_API_KEY` with your
   Gemini API key (repeat for Preview/Production as needed).
3. Vercel automatically detects the framework and runs `npm install` followed by
   `npm run build`. The generated `dist` directory is served as static assets.
4. The included `vercel.json` ensures single-page application routing works, so
   deep links render correctly without additional configuration.

### Multimodal Deployment

For deploying the full multimodal system:

1. **Combined Deployment** (Docker):
   ```bash
   npm run docker:build
   npm run docker:run
   ```

2. **Microservices Deployment**:
   - Frontend: Deploy using Vercel or similar static hosting
   - Backend Services: Deploy to Node.js environment (Vercel Functions or similar)
   - Python Service: Deploy to Python-compatible environment (e.g., Cloud Run)

## Deployment Automation

The project includes several automation scripts for deployment:

### 1. Vercel Deployment

```bash
npm run deploy:vercel
```

This command uses the Vercel CLI to deploy the frontend application. Configuration is in `vercel.json`.

### 2. Containerized Deployment

```bash
# Build container image
npm run docker:build

# Run locally
npm run docker:run

# Push to container registry
npm run docker:push
```

The Dockerfile includes all three components (frontend, backend services, and Python service) in a single container for simplified deployment.

### 3. Custom Deployment

For custom deployment targets, use the deployment configuration in `deploy.config.js`:

```bash
npm run deploy -- --target=custom
```

This project ships with a fully automated CI/CD pipeline backed by GitHub Actions and Vercel.

- Pull requests run tests and builds via the [`CI` workflow](.github/workflows/ci.yml).
- Previews and production releases are handled by the [`Deploy to Vercel` workflow](.github/workflows/vercel-deploy.yml). Pushes to `main` promote the build to the production environment; pull requests publish preview URLs for QA.
- The legacy GitHub Pages workflow remains available in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) for static exports if you need an alternative host.

### Operations playbooks & secrets

- **Runbooks & responsibilities**: [docs/deployment-plan.md](docs/deployment-plan.md) outlines the automation flow, operational checklists, and ownership model for engineers, reviewers, QA, and on-call.
- **Vercel-specific setup**: follow [docs/vercel-deployment.md](docs/vercel-deployment.md) to connect the repository to Vercel and provision the required secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).
- **Gemini credentials**: store the shared Gemini credential as `GEMINI_API_KEY` in repository secrets and mirror it to `VITE_GEMINI_API_KEY` (or provide a separate client-safe key). Developers keep personal keys in `.env.local` for local runs.
- **Monitoring**: follow the plan's observability section to wire synthetic uptime checks and error tracking so deployments stay production ready.

## Troubleshooting Multimodal System

If you encounter issues with the multimodal system, use these troubleshooting steps:

### 1. Run the Diagnostic Tool

The diagnostic tool will identify common issues:

```bash
node scripts/diagnose-multimodal.js
```

This will check for:
- Missing configuration files
- TypeScript errors
- ESM compatibility issues
- Python environment issues

### 2. Common Issues and Solutions

#### ESM Import Errors

If you see errors like `ERR_MODULE_NOT_FOUND` or `Relative import paths need explicit file extensions`:

```bash
node scripts/fix-esm-imports.js
```

#### TypeScript Build Errors

For TypeScript configuration issues:

1. Check tsconfig files exist in the project root
2. Ensure path aliases are consistent between tsconfig files
3. Run `npm run build:multimodal` to build all components

#### Python Service Issues

If the Python service fails to start:

1. Ensure Python 3.8+ is installed
2. Check if virtual environment is activated:
   ```bash
   source .venv/bin/activate
   ```
3. Verify dependencies are installed:
   ```bash
   pip install -r mm_service/requirements.txt
   ```
4. Check if the service endpoint is available at http://localhost:8010/health

#### Cross-Language Communication Issues

If components fail to communicate:

1. Check network connectivity between services
2. Ensure CORS headers are properly configured
3. Verify environment variables are set correctly

### 3. Logs and Debugging

All service logs are stored in the `logs` directory:

- Frontend: `logs/frontend-*.log`
- Backend: `logs/backend-*.log`
- Python Service: `logs/python-*.log`

Run the system in debug mode for more verbose logging:

```bash
DEBUG=true ./scripts/run-multimodal.sh
```

## Architecture and Technical Workflow

### Multimodal System Architecture

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  React Frontend   │◄────┤  Node.js Backend  │◄────┤  Python Service   │
│  (TypeScript)     │     │  (TypeScript)     │     │  (FastAPI)        │
│                   │─────►                   │─────►                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
         │                          │                        │
         │                          │                        │
         ▼                          ▼                        ▼
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│                   │     │                   │     │                   │
│  Shared Types     │     │  Language Bridge  │     │  Module Resolver  │
│  (types.ts)       │     │  (languageBridge) │     │  (moduleResolver) │
│                   │     │                   │     │                   │
└───────────────────┘     └───────────────────┘     └───────────────────┘
```

### Technical Workflow

1. **Frontend Request Flow**:
   - User triggers action in UI
   - Frontend validates data using shared types
   - Request is sent to Node.js backend
   - Response is processed and displayed

2. **Multimodal Processing Flow**:
   - Image/multimedia data is captured in frontend
   - Data is preprocessed (resized, validated)
   - Sent to Python service via Node.js backend
   - Python service processes and returns analysis
   - Results displayed in frontend components

3. **Offline-First Data Flow**:
   - Data writes are queued locally when offline
   - Background sync processes when online
   - Conflict resolution handles merge issues

4. **Build and Deployment Flow**:
   - TypeScript files compiled with appropriate configs
   - ESM imports fixed for Node.js compatibility
   - Python service packaged with dependencies
   - Components deployed to respective environments

For more detailed documentation about each component, refer to the [docs/](docs/) directory.
