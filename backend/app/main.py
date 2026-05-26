from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Redmine Analytics",
    description="Analytics dashboard for Redmine tasks",
    version="0.1.0"
)

# CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple session storage (in-memory)
sessions = {}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}


# Import and include routers
from app.api import auth, projects, analytics

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(analytics.router)
