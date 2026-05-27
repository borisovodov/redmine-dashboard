from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import AnalyticsRequest, AnalyticsMetrics, IssueSummary
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
    issue_types: str = Query(None),
    categories: str = Query(None),
    closed_statuses: str = Query(None),
    tracked_statuses: str = Query(None),
    subject: str = Query(None)
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
        if categories:
            filters['categories'] = [int(c) for c in categories.split(',')]
        
        # Parse closed statuses (comma-separated names)
        closed_statuses_list = None
        if closed_statuses:
            closed_statuses_list = [s.strip() for s in closed_statuses.split(',') if s.strip()]
        
        # Parse tracked statuses — only these appear in the status time chart
        tracked_statuses_list = None
        if tracked_statuses:
            tracked_statuses_list = [s.strip() for s in tracked_statuses.split(',') if s.strip()]
        
        # Fetch issues
        issues = client.get_issues(
            project_id=project_id,
            date_from=date_from,
            date_to=date_to,
            filters=filters if filters else None
        )
        
        # Fetch statuses to build id->name mapping for journal parsing
        statuses = client.get_issue_statuses()
        statuses_map = {s['id']: s['name'] for s in statuses}
        logger.info(f"Loaded {len(statuses_map)} statuses for name resolution")
        
        # Filter issues by other criteria
        if filters:
            issues = AnalyticsEngine.filter_issues(issues, filters)
        
        # Filter by subject substring (case-insensitive)
        if subject:
            subject_lower = subject.strip().lower()
            issues = [i for i in issues if subject_lower in (i.get('subject', '') or '').lower()]
        
        # Determine which issues are in closed statuses (they need journal enrichment)
        closed_statuses_list = closed_statuses_list or AnalyticsEngine.DEFAULT_CLOSED_STATUSES
        closed_statuses_set = set(closed_statuses_list)
        closed_issues_for_enrich = [
            i for i in issues
            if i.get('status', {}).get('name') in closed_statuses_set
        ]
        
        # Enrich closed issues with journal history (individual API calls)
        if closed_issues_for_enrich:
            logger.info(f"Fetching journals for {len(closed_issues_for_enrich)} closed issues...")
            closed_issues_for_enrich = client.enrich_issues_with_journals(closed_issues_for_enrich)
        
        # Calculate metrics (engine filters by closed_statuses internally)
        metrics = AnalyticsEngine.calculate_metrics(
            closed_issues_for_enrich, 
            closed_statuses=closed_statuses_list,
            statuses_map=statuses_map,
            tracked_statuses=tracked_statuses_list
        )
        
        # Build issues summary with per-issue status times
        redmine_url = sessions[session_id]['redmine_url']
        issues_summary = AnalyticsEngine.build_issues_summary(
            closed_issues_for_enrich, redmine_url,
            statuses_map=statuses_map,
            tracked_statuses=tracked_statuses_list
        )
        
        return AnalyticsMetrics(
            total_issues=metrics['total_issues'],
            average_close_time_hours=metrics['average_close_time_hours'],
            median_close_time_hours=metrics['median_close_time_hours'],
            average_returns=metrics['average_returns'],
            distribution_data=metrics['distribution_data'],
            status_time_data=metrics['status_time_data'],
            issues=[IssueSummary(**s) for s in issues_summary]
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


@router.get("/filters/categories")
async def get_categories(
    session_id: str = Query(...),
    project_id: int = Query(...)
):
    """Get issue categories for a project"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        categories = client.get_categories(project_id)
        
        return {
            'categories': [
                {'id': c['id'], 'name': c['name']}
                for c in categories
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch categories: {str(e)}")


@router.get("/filters/statuses")
async def get_statuses(session_id: str = Query(...)):
    """Get all issue statuses for the «closed statuses» filter"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        statuses = client.get_issue_statuses()
        
        return {
            'statuses': [
                {'id': s['id'], 'name': s['name']}
                for s in statuses
            ]
        }
    
    except Exception as e:
        logger.error(f"Error fetching statuses: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch statuses: {str(e)}")


@router.get("/by_assignee")
async def get_analytics_by_assignee(
    session_id: str = Query(...),
    project_id: int = Query(...),
    date_from: str = Query(None),
    date_to: str = Query(None),
    closed_statuses: str = Query(None),
    subject: str = Query(None)
):
    """Get analytics grouped by assignees"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    try:
        client = sessions[session_id]['client']
        
        # Parse closed statuses
        closed_statuses_list = None
        if closed_statuses:
            closed_statuses_list = [s.strip() for s in closed_statuses.split(',') if s.strip()]
        closed_statuses_set = set(closed_statuses_list) if closed_statuses_list else set(AnalyticsEngine.DEFAULT_CLOSED_STATUSES)
        
        # Fetch issues
        issues = client.get_issues(
            project_id=project_id,
            date_from=date_from,
            date_to=date_to
        )
        
        # Filter to only closed issues
        issues = [i for i in issues if i.get('status', {}).get('name') in closed_statuses_set]
        
        # Filter by subject substring (case-insensitive)
        if subject:
            subject_lower = subject.strip().lower()
            issues = [i for i in issues if subject_lower in (i.get('subject', '') or '').lower()]
        
        # Group by assignee and calculate metrics
        metrics_by_assignee = AnalyticsEngine.group_by_assignee(issues)
        
        # Build issues summary
        redmine_url = sessions[session_id]['redmine_url']
        issues_summary = AnalyticsEngine.build_issues_summary(issues, redmine_url)
        
        return {
            'by_assignee': metrics_by_assignee,
            'issues': [IssueSummary(**s) for s in issues_summary]
        }
    
    except Exception as e:
        logger.error(f"Error calculating assignee analytics: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to calculate assignee analytics: {str(e)}")
