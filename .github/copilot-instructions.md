# HR Lodex – Copilot Instructions

## Project Overview

AI-powered HR interview SaaS (HR Lodex). Monorepo with npm workspaces:
- `client/` — React 19 + Vite + TypeScript + Tailwind v4 frontend
- `server/` — Express + TypeScript + MongoDB/Mongoose backend

Three user roles: **employer** (called `HR` on the frontend), **candidate**, **admin**.

---

## Commands

### Root (runs both workspaces)
```bash
npm run dev          # Start client + server concurrently
npm run build        # Build client only (Vite)
npm run start        # Start server from compiled dist/
npm run test         # Runs tests in all workspaces (server currently has none)
```

### Client only
```bash
npm run dev -w client
npm run build -w client
```

### Server only
```bash
npm run dev -w server      # tsx watch src/index.ts (hot reload)
npm run build -w server    # tsc → dist/
npm run start -w server    # node dist/index.js
npm run create-admin -w server   # Bootstrap the first admin user
```

There are no client-side tests. The pre-commit hook runs `npm run build -w server` — TypeScript errors in the server will block commits.

---

## Architecture

### Frontend (`client/`)

- **Router**: `HashRouter` — all routes use `#` prefix (e.g. `/#/auth`, `/#/jobs`). When constructing or parsing URLs, account for the hash.
- **Services layer**: `client/services/` — one file per domain (`authService.ts`, `jobsService.ts`, etc.). All API calls go through `request()` (public) or `requestAuth()` (authenticated) helpers in `authService.ts`.
- **Views**: organised by role — `views/HR/`, `views/Candidate/`, `views/Admin/`, plus shared views.
- **i18n**: `translations.ts` exports `UI_STRINGS` keyed by `Language` enum (`uz` | `ru` | `en`). All user-visible strings must come from there — do not hardcode UI text.
- **Types**: All shared TypeScript types live in `client/types.ts`. Frontend role enum: `UserRole.HR` maps to the backend string `"employer"`.
- **Auth state**: persisted in `localStorage` under keys `hrlodex_token` and `hrlodex_user`. Use `setAuth()` / `getAuth()` / `clearAuth()` from `authService.ts`.
- **Gemini AI**: direct client-side calls via `@google/genai` are used for some features (e.g. resume analysis). Key is in `VITE_GEMINI_API_KEY`.

### Backend (`server/src/`)

- **Entry**: `src/index.ts` — registers all routes under `/api/<domain>`, applies middleware, connects to MongoDB, seeds default tariffs on startup.
- **Auth**: JWT Bearer tokens. Middleware: `protect` (verify token, attach `req.user`) and `restrictTo(...roles)` in `middlewares/authMiddleware.ts`.
- **Response shape**: every response follows `{ success: boolean, message?: string, data?: T }`. Always use this shape — never return bare objects.
- **Error codes**: string constants (e.g. `AUTH_EMAIL_EXISTS`, `JOB_NOT_FOUND`) defined in `utils/errorMessages.ts` with translations for `uz`, `ru`, `en`. The client sends an `Accept-Language` header; the backend picks the matching translation. Default language is `uz`.
- **Transform layer**: `utils/transform.ts` contains functions (`jobToResponse`, `applicationToResponse`, `sessionToResponse`, `chatMessageToResponse`) that convert Mongoose documents to API response objects, mapping `_id` → `id`. Always use these when returning documents.
- **Payments**: Payme and Click webhook integrations (`controllers/paymeController.ts`, `controllers/clickController.ts`) with dedicated auth middlewares.
- **Tariffs**: Subscription system. Users have an `interviews` credit counter. `seedDefaultTariffs()` ensures default tariffs exist on startup.
- **AI**: `utils/geminiService.ts` wraps `@google/genai` for server-side Gemini calls (question generation, interview evaluation).

### Database (MongoDB)

Models in `server/src/models/`: `User`, `Job`, `Application`, `InterviewSession`, `Payment`, `Tariff`, `ChatMessage`, `VerificationCode`.

Use `127.0.0.1` instead of `localhost` in `MONGODB_URI` to avoid IPv6 connection issues.

---

## Key Conventions

- **Role naming mismatch**: frontend uses `UserRole.HR` / `"HR"`, backend uses `"employer"`. The mapping happens in `App.tsx` (`restoreUser`). Don't introduce new inconsistencies — be explicit when crossing this boundary.
- **401 handling**: `requestAuth()` automatically clears auth and redirects to `/#/auth?redirect=<current_path>` on a 401. Don't add separate 401 handling in individual services.
- **Language header**: always pass `Accept-Language` on requests. The helpers in `authService.ts` do this automatically by reading `localStorage.getItem('language')`.
- **Transform functions**: never return a raw Mongoose document from a controller. Always call the appropriate `*ToResponse()` helper from `utils/transform.ts`.
- **Error response pattern**:
  ```ts
  return res.status(4xx).json({ success: false, message: getErrorMessage(lang, 'ERROR_CODE'), errorCode: 'ERROR_CODE' });
  ```
- **Environment**: copy `.env.example` in each workspace to `.env`. Server default port is `5001`; client Vite dev server is `5173`.
- **Deployment**: server runs under PM2 (`pm2 reload hr-lodex`); client builds to `dist/` and is served by Nginx from `/var/www/hrlodex-frontend`.
