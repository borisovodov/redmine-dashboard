.PHONY: dev prod install run-backend run-frontend docker-build docker-up clean

# Development
dev: install
	@echo "Starting development servers..."
	@cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000 &
	@cd frontend && npm run dev -- --host &
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@wait

# Install all dependencies
install:
	@echo "Installing Python dependencies..."
	@test -d .venv || python3 -m venv .venv
	@.venv/bin/pip install -r backend/requirements.txt -q
	@echo "Installing Node dependencies..."
	@cd frontend && npm install --silent

run-backend:
	@cd backend && ../.venv/bin/python -m uvicorn app.main:app --reload --port 8000

run-frontend:
	@cd frontend && npm run dev -- --host

# Production Docker
docker-build:
	docker compose -f docker-compose.prod.yml build

docker-up:
	docker compose -f docker-compose.prod.yml up -d

docker-down:
	docker compose -f docker-compose.prod.yml down

# Clean
clean:
	@echo "Cleaning caches..."
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name .vite -exec rm -rf {} + 2>/dev/null || true
	@echo "Done."
