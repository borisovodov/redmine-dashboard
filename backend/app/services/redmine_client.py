import requests
from typing import Optional, List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class RedmineClient:
    """Client for Redmine API integration"""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            'X-Redmine-API-Key': api_key,
            'Content-Type': 'application/json'
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def validate(self) -> bool:
        """Validate API credentials"""
        try:
            response = self.session.get(
                f"{self.base_url}/users/current.json",
                timeout=10
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Validation error: {str(e)}")
            return False
    
    def get_projects(self) -> List[Dict]:
        """Get list of projects"""
        try:
            projects = []
            offset = 0
            limit = 100
            
            while True:
                response = self.session.get(
                    f"{self.base_url}/projects.json",
                    params={'offset': offset, 'limit': limit},
                    timeout=10
                )
                response.raise_for_status()
                data = response.json()
                
                if not data.get('projects'):
                    break
                    
                projects.extend(data['projects'])
                
                # Check if there are more pages
                if data.get('total_count', 0) <= offset + limit:
                    break
                    
                offset += limit
            
            return projects
        except Exception as e:
            logger.error(f"Error fetching projects: {str(e)}")
            return []
    
    def get_issues(self, project_id: int, date_from: str = None, date_to: str = None,
                   filters: Optional[Dict] = None) -> List[Dict]:
        """
        Get issues for a project, optionally filtered by close date.
        
        Date filtering uses closed_on (close date):
        - No dates: all issues
        - date_from only: closed_on >= date_from
        - date_to only: closed_on <= date_to
        - Both: closed_on between date_from and date_to
        
        Args:
            project_id: Redmine project ID
            date_from: Filter by close date start (YYYY-MM-DD)
            date_to: Filter by close date end (YYYY-MM-DD)
            filters: Additional filters (priorities, assignees, etc.)
        """
        try:
            issues = []
            offset = 0
            limit = 100
            
            # Build query parameters
            params = {
                'project_id': project_id,
                'offset': offset,
                'limit': limit,
                'status_id': '*',  # Include all statuses
                'include': 'journals,changesets'  # Include history for status transitions
            }
            
            # Add date filters — filter by close date (closed_on), not creation date
            if date_from and date_to:
                params['closed_on'] = f'><{date_from}|{date_to}'
            elif date_from:
                params['closed_on'] = f'>={date_from}'
            elif date_to:
                params['closed_on'] = f'<={date_to}'
            
            # Add other filters
            if filters:
                if filters.get('priorities'):
                    params['priority_id'] = ','.join(map(str, filters['priorities']))
                if filters.get('assignees'):
                    params['assigned_to_id'] = ','.join(map(str, filters['assignees']))
                if filters.get('issue_types'):
                    params['tracker_id'] = ','.join(map(str, filters['issue_types']))
                if filters.get('categories'):
                    params['category_id'] = ','.join(map(str, filters['categories']))
            
            while True:
                params['offset'] = offset
                response = self.session.get(
                    f"{self.base_url}/issues.json",
                    params=params,
                    timeout=15
                )
                response.raise_for_status()
                data = response.json()
                
                if not data.get('issues'):
                    break
                    
                issues.extend(data['issues'])
                
                # Check if there are more pages
                if data.get('total_count', 0) <= offset + limit:
                    break
                    
                offset += limit
            
            return issues
        except Exception as e:
            logger.error(f"Error fetching issues: {str(e)}")
            return []
    
    def get_priorities(self) -> List[Dict]:
        """Get list of issue priorities"""
        try:
            response = self.session.get(
                f"{self.base_url}/enumerations/issue_priorities.json",
                timeout=10
            )
            response.raise_for_status()
            return response.json().get('issue_priorities', [])
        except Exception as e:
            logger.error(f"Error fetching priorities: {str(e)}")
            return []
    
    def get_issue_statuses(self) -> List[Dict]:
        """Get list of issue statuses"""
        try:
            response = self.session.get(
                f"{self.base_url}/issue_statuses.json",
                timeout=10
            )
            response.raise_for_status()
            return response.json().get('issue_statuses', [])
        except Exception as e:
            logger.error(f"Error fetching issue statuses: {str(e)}")
            return []
    
    def get_trackers(self) -> List[Dict]:
        """Get list of issue trackers/types"""
        try:
            response = self.session.get(
                f"{self.base_url}/trackers.json",
                timeout=10
            )
            response.raise_for_status()
            return response.json().get('trackers', [])
        except Exception as e:
            logger.error(f"Error fetching trackers: {str(e)}")
            return []
    
    def get_project_members(self, project_id: int) -> List[Dict]:
        """Get members of a project"""
        try:
            response = self.session.get(
                f"{self.base_url}/projects/{project_id}/memberships.json",
                timeout=10
            )
            response.raise_for_status()
            memberships = response.json().get('memberships', [])
            return [m.get('user') for m in memberships if m.get('user')]
        except Exception as e:
            logger.error(f"Error fetching project members: {str(e)}")
            return []
    
    def get_categories(self, project_id: int) -> List[Dict]:
        """Get issue categories for a project"""
        try:
            response = self.session.get(
                f"{self.base_url}/projects/{project_id}/issue_categories.json",
                timeout=10
            )
            response.raise_for_status()
            return response.json().get('issue_categories', [])
        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            return []
    
    def enrich_issues_with_journals(self, issues: List[Dict]) -> List[Dict]:
        """
        Fetch journal history for each issue individually.
        
        The Redmine list endpoint (/issues.json) does not include journals even
        with include=journals on some instances. We must fetch each issue
        individually via GET /issues/{id}.json?include=journals.
        
        Uses ThreadPoolExecutor for concurrent fetching.
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        if not issues:
            return issues
        
        issue_map = {issue['id']: issue for issue in issues}
        results = []
        
        def fetch_one(issue_id):
            try:
                response = self.session.get(
                    f"{self.base_url}/issues/{issue_id}.json",
                    params={'include': 'journals'},
                    timeout=20
                )
                if response.status_code == 200:
                    data = response.json().get('issue', {})
                    return (issue_id, data.get('journals', []))
                return (issue_id, [])
            except Exception as e:
                logger.warning(f"Error fetching journals for issue {issue_id}: {e}")
                return (issue_id, [])
        
        # Fetch concurrently, max 10 at a time
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_one, iid): iid for iid in issue_map}
            for future in as_completed(futures):
                try:
                    issue_id, journals = future.result()
                    if issue_id in issue_map:
                        issue_map[issue_id]['journals'] = journals
                except Exception as e:
                    logger.warning(f"Future error: {e}")
        
        return list(issue_map.values())
