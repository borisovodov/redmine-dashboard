# Redmine Analytics Dashboard

Analytics dashboard for Redmine task management system. Displays metrics for task closure times, status transitions, and performance analytics.

## Features

- 🔐 Secure authentication via Redmine API key
- 📊 Real-time analytics and metrics
- 📈 Interactive charts and visualizations
- 🎯 Filterable by project, priority, assignee, and issue type
- 👥 Group analytics by assignee
- 🚀 Multi-user support
- 🐳 Docker support for easy deployment

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **Requests** - HTTP client

### Frontend
- **Vue.js 3** - JavaScript framework
- **Vuetify** - Material Design components
- **Chart.js** - Charts and visualizations
- **Vite** - Build tool

## Quick Start

### Using Makefile (recommended)

```bash
# Install all dependencies
make install

# Start backend (terminal 1)
make run-backend

# Start frontend (terminal 2)
make run-frontend
```

### Manual Setup

#### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cd backend
uvicorn app.main:app --reload --port 8000
# Backend: http://localhost:8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend: http://localhost:5173
```

### Production (Docker)

```bash
# Build and start
make docker-build
make docker-up

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000

# Stop
make docker-down
```

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
# Server runs on http://localhost:8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
# Frontend runs on http://localhost:5173
```

## Configuration

### Backend (.env)

```
DEBUG=true
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
SESSION_TIMEOUT_MINUTES=60
```

### Frontend (.env)

```
VITE_API_URL=http://localhost:8000
```

## Usage

1. **Login**: Enter your Redmine URL and API key
2. **Select Project**: Choose a project to analyze
3. **Set Filters**: 
   - Date range (from/to)
   - Priorities
   - Assignees
   - Issue types
4. **View Analytics**:
   - Average and median close times
   - Close time distribution chart
   - Time spent in each status
   - Metrics grouped by assignee (optional)

## API Endpoints

### Authentication
- `POST /auth/validate` - Validate credentials and create session
- `POST /auth/logout` - Destroy session

### Projects
- `GET /projects` - Get list of projects

### Analytics
- `POST /analytics` - Get analytics metrics
- `GET /analytics/filters/priorities` - Get available priorities
- `GET /analytics/filters/issue_types` - Get available issue types
- `GET /analytics/filters/assignees` - Get project assignees
- `GET /analytics/by_assignee` - Get analytics grouped by assignee

## Building for Production

### Backend
```bash
# Build Docker image
docker build -f Dockerfile.backend -t redmine-analytics-backend .

# Run
docker run -p 8000:8000 redmine-analytics-backend
```

### Frontend
```bash
cd frontend

# Build static files
npm run build

# Output in dist/ directory
```

## Error Handling

The application handles:
- Invalid API credentials
- Network timeouts
- Redmine API errors
- Missing data
- Session expiration

## Known Limitations

- No persistent data storage (session-based only)
- Depends on Redmine API rate limits
- Data is fetched on every request (not cached)
- Single-instance deployment (no scaling)

## Future Enhancements

- [ ] Export to CSV/PDF
- [ ] Real-time data synchronization with WebSockets
- [ ] Period comparison
- [ ] Custom field support
- [ ] Report saving and scheduling
- [ ] LDAP/SSO integration
- [ ] Caching layer (Redis)

## Troubleshooting

### "Invalid API key" error
- Verify Redmine URL is correct (e.g., https://redmine.example.com)
- Check API key is valid in Redmine user settings
- Ensure Redmine is accessible from application

### Charts not displaying
- Check browser console for errors
- Verify data is loaded in browser DevTools Network tab
- Clear browser cache and reload

### CORS errors
- Check CORS_ORIGINS in backend .env
- Ensure frontend URL is in CORS whitelist
- Backend must be running on correct host/port

## Development

### Project Structure

```
redmine-analytics/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── services/     # Business logic
│   │   ├── models/       # Pydantic schemas
│   │   └── main.py       # FastAPI app
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable components
│   │   └── services/     # API client
│   ├── index.html
│   └── package.json
└── docker-compose.yml
```

## License

MIT
