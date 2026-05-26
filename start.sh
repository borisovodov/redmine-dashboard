#!/bin/bash

# Start script for Redmine Analytics

echo "🚀 Starting Redmine Analytics..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate venv
source .venv/bin/activate

# Install backend dependencies
if [ -f "backend/requirements.txt" ]; then
    echo "📥 Installing backend dependencies..."
    pip install -q -r backend/requirements.txt
fi

# Install frontend dependencies
if [ -d "frontend" ]; then
    if [ ! -d "frontend/node_modules" ]; then
        echo "📥 Installing frontend dependencies..."
        cd frontend && npm install --silent && cd ..
    fi
fi

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Start backend
cd backend
echo "Starting backend on http://localhost:8000..."
uvicorn app.main:app --reload &
BACKEND_PID=$!

# Start frontend
cd ../frontend
echo "Starting frontend on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
