from fastapi import APIRouter, HTTPException, Depends
from app.models.schemas import AuthRequest, AuthResponse
from app.services.redmine_client import RedmineClient
import uuid
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# Session storage
sessions = {}


@router.post("/validate", response_model=AuthResponse)
async def validate_credentials(request: AuthRequest):
    """Validate Redmine credentials and create session"""
    try:
        # Test connection to Redmine
        client = RedmineClient(request.redmine_url, request.api_key)
        
        if not client.validate():
            raise HTTPException(status_code=401, detail="Invalid API key or Redmine URL")
        
        # Create session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            'redmine_url': request.redmine_url,
            'api_key': request.api_key,
            'client': client
        }
        
        return AuthResponse(
            session_id=session_id,
            status="authenticated"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")


@router.post("/logout")
async def logout(session_id: str):
    """Logout and destroy session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"status": "logged_out"}
    
    raise HTTPException(status_code=400, detail="Session not found")


def get_redmine_client(session_id: str) -> RedmineClient:
    """Dependency to get Redmine client from session"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return sessions[session_id]['client']
