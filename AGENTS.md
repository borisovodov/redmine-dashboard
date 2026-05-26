# AGENTS.md — Redmine Analytics Dashboard

> Auto-generated reference for AI coding assistants. Contains everything needed to work on this project in a new session.

---

## Project Overview

**Redmine Analytics Dashboard** — a single-page web app that connects to any Redmine instance via API key, fetches issue data in real time, and displays analytics metrics (close time, status transitions, distributions). No database — all data flows through in-memory sessions from Redmine API → backend → frontend.

## Architecture

```
Browser (Vue SPA)
  │  /api/*  (production: nginx proxy; dev: Vite proxy)
  ▼
FastAPI backend (port 8000)
  │  Redmine REST API (X-Redmine-API-Key header)
  ▼
Redmine instance (external, user-provided)
```

**Data flow:**
1. User enters Redmine URL + API key on `LoginPage`
2. Backend's `POST /auth/validate` tests credentials via Redmine `GET /users/current.json`, creates in-memory session (`sessions` dict in `auth.py`)
3. Session ID stored in browser `localStorage`, sent as `?session_id=` query param on every subsequent request
4. Dashboard fetches projects, filter options, issues, and analytics — all through the Redmine client using the session's API key
5. Analytics calculated server-side: close time = `closed_on - created_on`, status times from journal history

**Key constraint:** Sessions die when the backend container restarts (in-memory only, no Redis/DB).

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Backend framework | FastAPI | ≥0.104 |
| ASGI server | Uvicorn | ≥0.24 |
| Data validation | Pydantic | ≥2.0 |
| HTTP client | Requests | ≥2.31 |
| Frontend framework | Vue.js 3 | ^3.3.4 |
| UI library | Vuetify 3 | ^3.4.0 |
| Charts | Chart.js 4 + vue-chartjs | ^4.4.0 / ^5.2.0 |
| HTTP client (browser) | Axios | ^1.6.0 |
| Router | Vue Router | ^4.2.5 |
| Build tool | Vite | ^5.0.0 |
| Date utils | date-fns | ^2.30.0 |
| CSS preprocessor | Sass | ^1.69.0 |

## How to Run

### Production (default)
```bash
docker compose up -d --build
# Frontend: http://localhost:3000  (nginx serving built SPA)
# Backend:  http://localhost:8000  (uvicorn, no --reload)
docker compose down
```

### Manual (no Docker, with hot-reload)
```bash
# Backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## File Structure

```
redmine-analytics/
├── docker-compose.yml          # Production: nginx + uvicorn, context per subfolder
├── .dockerignore               # Root-level exclude for dev tooling (not used by builds)
├── README.md
├── plan.md                     # Original development plan (historical)
│
├── backend/
│   ├── Dockerfile              # python:3.11-slim, uvicorn (context: ./backend)
│   ├── .dockerignore           # Excludes __pycache__, .venv, .env, etc.
│   ├── requirements.txt        # fastapi, uvicorn[standard], pydantic, requests, python-dotenv, python-multipart
│   └── app/
│       ├── main.py             # FastAPI app, CORS (origins: :3000, :5173), in-memory `sessions` dict
│       ├── api/
│       │   ├── auth.py         # POST /auth/validate, POST /auth/logout, sessions dict
│       │   ├── projects.py     # GET /projects (list Redmine projects)
│       │   └── analytics.py    # POST /analytics, GET /analytics/filters/*, GET /analytics/by_assignee
│       ├── models/
│       │   └── schemas.py      # Pydantic: AuthRequest, AuthResponse, Project, AnalyticsMetrics, etc.
│       └── services/
│           ├── redmine_client.py   # RedmineClient: validate(), get_projects(), get_issues(), get_priorities(), get_trackers(), get_project_members()
│           └── analytics_engine.py # AnalyticsEngine: calculate_metrics(), filter_issues(), group_by_assignee(), _calculate_distribution(), _calculate_status_times()
│
└── frontend/
    ├── Dockerfile              # Multi-stage: node:18-alpine build → nginx:alpine (context: ./frontend)
    ├── .dockerignore           # Excludes node_modules, .vite, dist
    ├── package.json
    ├── vite.config.js          # host: 0.0.0.0, port: 5173, proxy /api → localhost:8000
    ├── nginx.conf              # listen 3000, /api/ → proxy_pass http://backend:8000/
    ├── index.html
    └── src/
        ├── main.js             # Vue app, Vuetify, Vue Router, auth guard
        ├── App.vue             # Root: <router-view />
        ├── services/
        │   └── api.js          # Axios instance, VITE_API_URL base, session_id interceptor, 401 redirect
        ├── pages/
        │   ├── LoginPage.vue       # URL + API key form, POST /auth/validate
        │   └── DashboardPage.vue   # Project selector, date range, filters, metrics, charts
        └── components/
            ├── MetricsDisplay.vue              # Avg/median close time, total issues, assignee table
            ├── ClosureTimeDistributionChart.vue # Bar chart (1-day, 2-3, 4-7, 8-14, 15-30, 30+)
            └── StatusTimeChart.vue              # Pie chart (hours per status)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/validate` | No | Login: `{redmine_url, api_key}` → `{session_id, status}` |
| `POST` | `/auth/logout` | No | Destroy session via `?session_id=` |
| `GET` | `/projects` | Session | List Redmine projects → `{projects: [{id, name, key}]}` |
| `POST` | `/analytics` | Session | Calculate metrics: `?session_id=&project_id=&date_from=&date_to=&priorities=&assignees=&issue_types=` |
| `GET` | `/analytics/filters/priorities` | Session | Available priority values |
| `GET` | `/analytics/filters/issue_types` | Session | Available tracker values |
| `GET` | `/analytics/filters/assignees` | Session | Project members: `?project_id=` |
| `GET` | `/analytics/by_assignee` | Session | Grouped metrics: `?session_id=&project_id=&date_from=&date_to=` |

All session-authenticated endpoints require `?session_id=<uuid>` query param. Unauthorized → 401 → frontend redirects to `/login`.

## Key Design Decisions & Gotchas

### Docker & Networking
- **Production**: `VITE_API_URL=/api` is a **build arg** (`ARG` + `ENV` in `frontend/Dockerfile`). Must be set at build time because Vite inlines `import.meta.env` vars. The nginx proxies `/api/` to `http://backend:8000/`.
- **Dev**: `VITE_API_URL=http://localhost:8000` as runtime env var. Vite dev server picks it up live. Vite also proxies `/api` → `localhost:8000` in dev mode.
- The `frontend/Dockerfile` has **two named stages**: `build` (node:18-alpine) and default (nginx:alpine). The `build` stage can be targeted for dev hot-reload if needed.
- CORS origins in `main.py`: `localhost:3000`, `localhost:5173`, `127.0.0.1:3000`, `127.0.0.1:5173`. In production, the browser hits nginx at `:3000` and nginx proxies `/api/` to backend — so CORS is not triggered (same origin).

### Sessions
- Sessions live in a Python `dict` in `backend/app/api/auth.py` (imported by other modules).
- Session contains: `{redmine_url, api_key, client: RedmineClient}`.
- Session dies on backend restart. No persistence.
- Frontend stores `sessionId` in `localStorage`. On 401, clears it and redirects to `/login`.

### Analytics Engine
- "Closed" statuses: `['Closed', 'Rejected', 'Done']`. These are hardcoded and may differ per Redmine instance.
- Status time calculation parses `journals` from Redmine issue history — requires `include=journals` in API request. Only works if Redmine returns journal details (some instances restrict this).
- Distribution buckets: 1-day, 2-3-days, 4-7, 8-14, 15-30, 30+.
- Pydantic `Project.key` maps to Redmine's `identifier` field (not `id`).

### Frontend Auth Guard
- `router.beforeEach` in `main.js`: checks `localStorage.getItem('sessionId')`.
- `/dashboard` requires auth → redirects to `/login`.
- `/login` with existing session → redirects to `/dashboard`.
- History mode: `createWebHistory()` (no hash). Nginx must handle SPA fallback with `try_files $uri /index.html`.

## Known Limitations
- No persistent storage — all sessions lost on restart
- No caching — every analytics request fetches ALL issues from Redmine API (pagination: 100 per page)
- Single-instance deployment (in-memory sessions, no shared state)
- Hardcoded closed status names may not match all Redmine instances
- Date filter in `redmine_client.py` overwrites `created_on` when both `date_from` and `date_to` are set (line: `params['created_on'] = f'<={date_to}' if date_to else f'>={date_from}'` — should use separate `>=` and `<=` filters or Redmine's range syntax)

## Common Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ERR_CONNECTION_REFUSED` on login | Containers not running | `docker compose up -d` |
| "Authentication failed" | Wrong URL or API key | Verify URL has no trailing path, API key is valid in Redmine settings |
| Charts empty after applying filters | No issues in selected date range | Try wider date range |
| 401 after some time | Container restarted, session lost | Re-login |
| Frontend builds but API calls fail | `VITE_API_URL` not set at build time | Ensure `ARG VITE_API_URL=/api` in Dockerfile and `build.args` in compose |
| CORS errors in dev | Backend not in CORS origins | Check `origins` list in `main.py` includes your dev port |
