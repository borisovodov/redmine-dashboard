# AGENTS.md — Redmine Analytics Dashboard

> Auto-generated reference for AI coding assistants. Contains everything needed to work on this project in a new session.

---

## Project Overview

**Redmine Analytics Dashboard** — a single-page web app that connects to any Redmine instance via API key, fetches issue data in real time, and displays analytics metrics (close time, status transitions, distributions). No database — all data flows through in-memory sessions from Redmine API → backend → frontend.

## Architecture

```
Browser (React SPA)
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
6. Issues table renders below charts with sortable columns, pagination, and clickable links to Redmine

**Key constraint:** Sessions die when the backend container restarts (in-memory only, no Redis/DB).

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Backend framework | FastAPI | ≥0.104 |
| ASGI server | Uvicorn | ≥0.24 |
| Data validation | Pydantic | ≥2.0 |
| HTTP client | Requests | ≥2.31 |
| Frontend framework | React | ^18.3.1 |
| UI library | HeroUI (`@heroui/react`) | ^2.7.6 |
| Styling | Tailwind CSS | ^3.4.0 |
| Charts | Chart.js 4 + react-chartjs-2 | ^4.4.0 / ^5.2.0 |
| HTTP client (browser) | Axios | ^1.6.0 |
| Router | React Router DOM | ^6.26.0 |
| Build tool | Vite | ^5.0.0 |
| Date utils (frontend) | date-fns | ^2.30.0 |
| Date picker | @internationalized/date | (HeroUI dependency) |
| Animations | framer-motion | ^11.3.0 (HeroUI dependency) |

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
# Vite dev server starts on http://localhost:5173 by default
```

## File Structure

```
redmine-analytics/
├── docker-compose.yml          # Production: backend + frontend (nginx), context per subfolder
├── .dockerignore               # Root-level exclude for dev tooling (not used by builds)
├── README.md
├── AGENTS.md                   # This file
│
├── backend/
│   ├── Dockerfile              # python:3.11-slim, uvicorn (context: ./backend)
│   ├── .dockerignore           # Excludes __pycache__, .venv, .env, etc.
│   ├── requirements.txt        # fastapi, uvicorn[standard], pydantic, requests, python-dotenv, python-multipart
│   └── app/
│       ├── __init__.py
│       ├── main.py             # FastAPI app, CORS, in-memory `sessions` dict
│       ├── api/
│       │   ├── __init__.py
│       │   ├── auth.py         # POST /auth/validate, POST /auth/logout, sessions dict
│       │   ├── projects.py     # GET /projects (list Redmine projects)
│       │   └── analytics.py    # POST /analytics, GET /analytics/filters/*, GET /analytics/by_assignee
│       ├── models/
│       │   ├── __init__.py
│       │   └── schemas.py      # Pydantic: AuthRequest, AuthResponse, Project, AnalyticsMetrics, IssueSummary, etc.
│       └── services/
│           ├── __init__.py
│           ├── redmine_client.py    # RedmineClient: validate, get_projects, get_issues, get_priorities, get_trackers, get_project_members, get_categories
│           └── analytics_engine.py  # AnalyticsEngine: calculate_metrics, filter_issues, group_by_assignee, build_issues_summary, _calculate_distribution, _calculate_status_times
│
└── frontend/
    ├── Dockerfile              # Multi-stage: node:18-alpine build → nginx:alpine (context: ./frontend)
    ├── .dockerignore           # Excludes node_modules, dist
    ├── package.json
    ├── vite.config.js          # @vitejs/plugin-react, @ alias → ./src, proxy /api → localhost:8000
    ├── tailwind.config.js      # HeroUI plugin, content paths for JSX/TSX
    ├── postcss.config.js       # tailwindcss + autoprefixer
    ├── nginx.conf              # listen 3000, /api/ → proxy_pass http://backend:8000/, SPA fallback
    ├── index.html              # <div id="root">, entry: /src/main.jsx
    └── src/
        ├── main.jsx             # React 18 createRoot, BrowserRouter, App
        ├── App.jsx              # HeroUIProvider, Routes: / → /login, /login, /dashboard
        ├── index.css            # @tailwind base/components/utilities
        ├── services/
        │   └── api.js           # Axios instance, VITE_API_URL base, session_id interceptor, 401 → /login redirect
        ├── pages/
        │   ├── LoginPage.jsx        # URL + API key form, POST /auth/validate, stores sessionId + redmineUrl + apiKey in localStorage
        │   └── DashboardPage.jsx    # Project selector, date range, filters (priorities/assignees/types/categories), group-by-assignee checkbox, metrics, charts, issues table
        └── components/
            ├── MetricsDisplay.jsx              # Avg/median close time cards, total issues card, assignee breakdown table (when grouped)
            ├── ClosureTimeDistributionChart.jsx # Bar chart (1-day, 2-3, 4-7, 8-14, 15-30, 30+)
            ├── StatusTimeChart.jsx              # Pie chart (hours per status)
            └── IssuesTable.jsx                  # HeroUI Table: #, subject (link→Redmine), tracker, status, priority, assignee, close time. Sortable, paginated (15/page)
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check |
| `POST` | `/auth/validate` | No | Login: `{redmine_url, api_key}` → `{session_id, status}` |
| `POST` | `/auth/logout` | No | Destroy session via `?session_id=` |
| `GET` | `/projects` | Session | List Redmine projects → `{projects: [{id, name, key}]}` |
| `POST` | `/analytics` | Session | Calculate metrics: query params `session_id`, `project_id`, `date_from`, `date_to`, `priorities`, `assignees`, `issue_types`, `categories`. Returns `AnalyticsMetrics` including `issues` list |
| `GET` | `/analytics/filters/priorities` | Session | Available priority values → `{priorities: [{id, name}]}` |
| `GET` | `/analytics/filters/issue_types` | Session | Available tracker values → `{issue_types: [{id, name}]}` |
| `GET` | `/analytics/filters/assignees` | Session | Project members: `?project_id=` → `{assignees: [{id, name}]}` |
| `GET` | `/analytics/filters/categories` | Session | Issue categories: `?project_id=` → `{categories: [{id, name}]}` |
| `GET` | `/analytics/by_assignee` | Session | Grouped metrics + issues: `?session_id=&project_id=&date_from=&date_to=`. Returns `{by_assignee: {...}, issues: [IssueSummary]}` |

All session-authenticated endpoints require `?session_id=<uuid>` query param. Unauthorized → 401 → frontend redirects to `/login`.

### Response Models

**AnalyticsMetrics** (POST /analytics):
```json
{
  "total_issues": 42,
  "average_close_time_hours": 12.5,
  "median_close_time_hours": 8.0,
  "distribution_data": { "1-day": 5, "2-3-days": 10, ... },
  "status_time_data": { "New": 5.2, "In Progress": 12.1, ... },
  "issues": [
    {
      "id": 123,
      "subject": "Fix login bug",
      "status": "Closed",
      "close_time_hours": 4.5,
      "url": "https://redmine.example.com/issues/123",
      "tracker": "Bug",
      "priority": "High",
      "assigned_to": "John Doe"
    }
  ]
}
```

## Key Design Decisions & Gotchas

### Docker & Networking
- **Production**: `VITE_API_URL=/api` is a **build arg** (`ARG` + `ENV` in `frontend/Dockerfile`). Must be set at build time because Vite inlines `import.meta.env` vars. The nginx proxies `/api/` to `http://backend:8000/`.
- **Dev**: `VITE_API_URL=http://localhost:8000` as runtime env var. Vite dev server picks it up live. Vite also proxies `/api` → `localhost:8000` in dev mode (with `rewrite` stripping `/api` prefix).
- The `frontend/Dockerfile` has **two named stages**: `build` (node:18-alpine) and runtime (nginx:alpine).
- CORS origins in `main.py`: `localhost:3000`, `localhost:5173-5175`, `127.0.0.1:3000`, `127.0.0.1:5173-5175`. In production, the browser hits nginx at `:3000` and nginx proxies `/api/` to backend — so CORS is not triggered (same origin).

### Sessions
- Sessions live in a Python `dict` in `backend/app/api/auth.py` (also imported in `main.py`).
- Session contains: `{redmine_url, api_key, client: RedmineClient}`.
- Session dies on backend restart. No persistence.
- Frontend stores `sessionId`, `redmineUrl`, and `apiKey` in `localStorage`. On 401, clears `sessionId` and redirects to `/login`.

### Authentication
- Login page pre-fills URL and API key from `localStorage` for convenience.
- Each page has its own auth guard in `useEffect` — checks `localStorage.getItem('sessionId')`, redirects to `/login` if missing.
- Routes: `/` redirects to `/login`, `/dashboard` requires auth.
- History mode: `BrowserRouter` (no hash). Nginx must handle SPA fallback with `try_files $uri /index.html`.

### Analytics Engine
- "Closed" statuses: `['Closed', 'Rejected', 'Done']`. These are hardcoded and may differ per Redmine instance.
- Status time calculation parses `journals` from Redmine issue history — requires `include=journals` in API request. Only works if Redmine returns journal details (some instances restrict this).
- Distribution buckets: 1-day, 2-3-days, 4-7, 8-14, 15-30, 30+.
- Pydantic `Project.key` maps to Redmine's `identifier` field (not `id`).
- `build_issues_summary()` constructs the Redmine issue URL as `{redmine_url}/issues/{id}` and computes `close_time_hours` from `closed_on - created_on`.

### Frontend Patterns
- **HeroUI** is the UI library — imported as `@heroui/react`. Components use `onPress` (not `onClick`), `onSelectionChange` for Select, `onValueChange` for Input.
- **Tailwind CSS** for all custom styling. HeroUI integrates with Tailwind via its plugin in `tailwind.config.js`.
- **Date picker**: Uses `@internationalized/date`'s `CalendarDate`. Convert to string via `.toString()` for API params.
- **Filter debounce**: Select/dropdown changes trigger a 500ms debounce via `setTimeout` in `filterTimeoutRef` before calling `applyFilters`.
- **Stale closure workaround**: `applyFiltersRef` always holds the latest `applyFilters` function to avoid stale state in the debounce callback.
- **Vite alias**: `@` maps to `./src` for clean imports like `@/services/api`.

### Issues Table
- HeroUI `Table` with `allowsSorting` on all columns, `isStriped` for readability.
- Pagination: 15 rows per page using HeroUI `Pagination` component in `bottomContent`.
- Issue ID rendered as a HeroUI `Button` with `as="a"` linking to `issue.url` with `target="_blank"`.
- Subject rendered as a plain `<a>` link to the same URL.
- Status and close time shown as colored `Chip` components:
  - Status: green for closed statuses, yellow otherwise
  - Close time: green (≤24h), yellow (≤72h), red (>72h), gray (not closed)

## Known Limitations
- No persistent storage — all sessions lost on restart
- No caching — every analytics request fetches ALL issues from Redmine API (pagination: 100 per page)
- Single-instance deployment (in-memory sessions, no shared state)
- Hardcoded closed status names may not match all Redmine instances
- Date filter in `redmine_client.py` overwrites `created_on` when both `date_from` and `date_to` are set (line: `params['created_on'] = f'<={date_to}' if date_to else f'>={date_from}'` — should use separate `>=` and `<=` filters or Redmine's range syntax `><`)
- The `by_assignee` endpoint ignores priority/assignee/type/category filters — it only accepts `project_id`, `date_from`, `date_to`

## Common Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `ERR_CONNECTION_REFUSED` on login | Containers not running | `docker compose up -d` |
| "Authentication failed" | Wrong URL or API key | Verify URL has no trailing path, API key is valid in Redmine settings |
| Charts empty after applying filters | No issues in selected date range | Try wider date range |
| 401 after some time | Container restarted, session lost | Re-login |
| Frontend builds but API calls fail | `VITE_API_URL` not set at build time | Ensure `ARG VITE_API_URL=/api` in Dockerfile and `build.args` in compose |
| CORS errors in dev | Backend not in CORS origins | Check `origins` list in `main.py` includes your dev port |
| Issues table not showing | `issues` field missing from API response | Ensure backend returns `issues` in `AnalyticsMetrics` |
| HeroUI components not styled | Tailwind/HeroUI config issue | Verify `tailwind.config.js` has `heroui()` plugin and correct content paths |
