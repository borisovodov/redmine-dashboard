from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import AnalyticsRequest, AnalyticsMetrics
from app.services.redmine_client import RedmineClient
from app.services.analytics_engine import AnalyticsEngine
from app.api.auth import sessions
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("", response_model=AnalyticsMetrics)
async def get_analytics(
    session_id: str = Query(...),
    project_id: int = Query(...),
    date_from: str = Query(None),
    date_to: str = Query(None),
    priorities: str = Query(None),
    assignees: str = Query(None),
    issue_types: str = Query(None)
):
    """Get analytics metrics for a project"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        
        # Parse filter parameters
        filters = {}
        if priorities:
            filters['priorities'] = [int(p) for p in priorities.split(',')]
        if assignees:
            filters['assignees'] = [int(a) for a in assignees.split(',')]
        if issue_types:
            filters['issue_types'] = [int(t) for t in issue_types.split(',')]
        
        # Fetch issues
        issues = client.get_issues(
            project_id=project_id,
            date_from=date_from,
            date_to=date_to,
            filters=filters if filters else None
        )
        
        # Filter issues
        if filters:
            issues = AnalyticsEngine.filter_issues(issues, filters)
        
        # Calculate metrics
        metrics = AnalyticsEngine.calculate_metrics(issues)
        
        return AnalyticsMetrics(
            total_issues=metrics['total_issues'],
            average_close_time_hours=metrics['average_close_time_hours'],
            median_close_time_hours=metrics['median_close_time_hours'],
            distribution_data=metrics['distribution_data'],
            status_time_data=metrics['status_time_data']
        )
    
    except Exception as e:
        logger.error(f"Error calculating analytics: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to calculate analytics: {str(e)}")


@router.get("/filters/priorities")
async def get_priorities(session_id: str = Query(...)):
    """Get available issue priorities"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        priorities = client.get_priorities()
        
        return {
            'priorities': [
                {'id': p['id'], 'name': p['name']}
                for p in priorities
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching priorities: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch priorities: {str(e)}")


@router.get("/filters/issue_types")
async def get_issue_types(session_id: str = Query(...)):
    """Get available issue types"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        trackers = client.get_trackers()
        
        return {
            'issue_types': [
                {'id': t['id'], 'name': t['name']}
                for t in trackers
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching issue types: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch issue types: {str(e)}")


@router.get("/filters/assignees")
async def get_assignees(
    session_id: str = Query(...),
    project_id: int = Query(...)
):
    """Get assignees for a project"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        members = client.get_project_members(project_id)
        
        return {
            'assignees': [
                {'id': m['id'], 'name': m['name']}
                for m in members
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching assignees: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch assignees: {str(e)}")


@router.get("/by_assignee")
async def get_analytics_by_assignee(
    session_id: str = Query(...),
    project_id: int = Query(...),
    date_from: str = Query(None),
    date_to: str = Query(None)
):
    """Get analytics grouped by assignees"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        
        # Fetch issues
        issues = client.get_issues(
            project_id=project_id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Group by assignee and calculate metrics
        metrics_by_assignee = AnalyticsEngine.group_by_assignee(issues)
        
        return {'by_assignee': metrics_by_assignee}
    
    except Exception as e:
        logger.error(f"Error calculating assignee analytics: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to calculate assignee analytics: {str(e)}")
