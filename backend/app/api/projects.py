from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import ProjectsResponse, Project
from app.services.redmine_client import RedmineClient
from app.api.auth import sessions
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectsResponse)
async def get_projects(session_id: str = Query(...)):
    """Get list of projects"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        projects_data = client.get_projects()
        
        projects = [
            Project(
                id=p['id'],
                name=p['name'],
                key=p['identifier']
            )
            for p in projects_data
        ]
        
        return ProjectsResponse(projects=projects)
    
    except Exception as e:
        logger.error(f"Error fetching projects: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch projects: {str(e)}")
