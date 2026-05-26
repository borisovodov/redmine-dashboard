from typing import List, Dict, Optional
from datetime import datetime
import statistics
import logging

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Analytics calculations engine"""
    
    # Default closed status names (sensible defaults for most Redmine instances)
    DEFAULT_CLOSED_STATUSES = ['Closed', 'Done', 'Rejected', 'Resolved']
    
    @staticmethod
    def calculate_metrics(issues: List[Dict], closed_statuses: Optional[List[str]] = None,
                          statuses_map: Optional[Dict[int, str]] = None,
                          tracked_statuses: Optional[List[str]] = None) -> Dict:
        """
        Calculate analytics metrics from issues.
        
        Only issues currently in one of the closed_statuses are included.
        Only tracked_statuses appear in the status_time_data chart.
        
        Args:
            issues: List of Redmine issues
            closed_statuses: List of status names that count as "closed".
                             Only issues in these statuses are analyzed.
            statuses_map: Dict mapping status_id (int) to status name (str)
            tracked_statuses: Status names to include in the time chart.
                              If None, excludes only closed_statuses.
        
        Returns:
            Dictionary with calculated metrics
        """
        if not issues:
            return {
                'total_issues': 0,
                'average_close_time_hours': 0,
                'median_close_time_hours': 0,
                'distribution_data': {},
                'status_time_data': {}
            }
        
        closed_statuses = closed_statuses or AnalyticsEngine.DEFAULT_CLOSED_STATUSES
        
        # Keep only issues that are currently in a closed status
        closed_issues = [
            issue for issue in issues 
            if issue.get('status', {}).get('name') in closed_statuses
        ]
        
        close_times_hours = []
        
        for issue in closed_issues:
            try:
                created_on = datetime.fromisoformat(issue['created_on'].replace('Z', '+00:00'))
                closed_on = issue.get('closed_on')
                
                if closed_on:
                    closed_on = datetime.fromisoformat(closed_on.replace('Z', '+00:00'))
                    diff = closed_on - created_on
                    hours = diff.total_seconds() / 3600
                    close_times_hours.append(hours)
            except Exception as e:
                logger.warning(f"Error calculating close time for issue {issue.get('id')}: {str(e)}")
                continue
        
        # Calculate distribution (by days)
        distribution = AnalyticsEngine._calculate_distribution(close_times_hours)
        
        # Calculate status times only for closed issues (historical snapshot)
        status_times = AnalyticsEngine._calculate_status_times(closed_issues, statuses_map)
        
        # Keep only tracked statuses in the chart.
        # If tracked_statuses is provided, filter to those names.
        # Otherwise, exclude closed statuses (legacy behaviour).
        if tracked_statuses is not None:
            tracked_set = set(tracked_statuses)
            status_times = {k: v for k, v in status_times.items() if k in tracked_set}
        else:
            for cs in closed_statuses:
                status_times.pop(cs, None)
        
        # Calculate metrics
        avg_hours = sum(close_times_hours) / len(close_times_hours) if close_times_hours else 0
        median_hours = statistics.median(close_times_hours) if close_times_hours else 0
        
        return {
            'total_issues': len(closed_issues),
            'closed_issues': len(closed_issues),
            'average_close_time_hours': round(avg_hours, 2),
            'median_close_time_hours': round(median_hours, 2),
            'distribution_data': distribution,
            'status_time_data': status_times
        }
    
    @staticmethod
    def _calculate_distribution(close_times_hours: List[float]) -> Dict:
        """Calculate distribution of close times by days"""
        distribution = {
            '1-day': 0,
            '2-3-days': 0,
            '4-7-days': 0,
            '8-14-days': 0,
            '15-30-days': 0,
            '30+-days': 0,
        }
        
        for hours in close_times_hours:
            days = hours / 24
            if days <= 1:
                distribution['1-day'] += 1
            elif days <= 3:
                distribution['2-3-days'] += 1
            elif days <= 7:
                distribution['4-7-days'] += 1
            elif days <= 14:
                distribution['8-14-days'] += 1
            elif days <= 30:
                distribution['15-30-days'] += 1
            else:
                distribution['30+-days'] += 1
        
        return distribution
    
    @staticmethod
    def _calculate_status_times(issues: List[Dict], 
                                statuses_map: Optional[Dict[int, str]] = None) -> Dict:
        """
        Calculate total time spent in each status across ALL issues (historical snapshot).
        
        Uses Redmine journal history to track when each issue entered/left each status.
        For open issues, time from last status change to "now" is also counted.
        
        Args:
            issues: List of Redmine issues (with journals included)
            statuses_map: Dict mapping status_id (int) to status name (str).
                          If not provided, falls back to using IDs as strings.
        
        Returns:
            Dict of {status_name: total_hours} summed across all issues
        """
        status_times: Dict[str, float] = {}
        now = datetime.now().astimezone()
        
        for issue in issues:
            try:
                journals = issue.get('journals', [])
                
                if not journals:
                    # No history — just count current status time from creation
                    created_on = datetime.fromisoformat(
                        issue['created_on'].replace('Z', '+00:00')
                    )
                    end_time = now
                    closed_on_str = issue.get('closed_on')
                    if closed_on_str:
                        end_time = datetime.fromisoformat(
                            closed_on_str.replace('Z', '+00:00')
                        )
                    
                    status_name = AnalyticsEngine._resolve_status_name(
                        issue.get('status', {}), statuses_map
                    )
                    hours = (end_time - created_on).total_seconds() / 3600
                    status_times[status_name] = status_times.get(status_name, 0) + hours
                    continue
                
                # Sort journals by date
                journals_sorted = sorted(journals, key=lambda x: x['created_on'])
                
                # Determine initial status: use old_value from first status_id change,
                # fall back to issue's current status
                initial_status_name = None
                for journal in journals_sorted:
                    for detail in journal.get('details', []):
                        if detail.get('name') == 'status_id':
                            old_id = detail.get('old_value')
                            if old_id:
                                initial_status_name = AnalyticsEngine._resolve_status_name(
                                    {'id': int(old_id)}, statuses_map
                                )
                            break
                    if initial_status_name:
                        break
                
                if not initial_status_name:
                    initial_status_name = AnalyticsEngine._resolve_status_name(
                        issue.get('status', {}), statuses_map
                    )
                
                created_on = datetime.fromisoformat(
                    issue['created_on'].replace('Z', '+00:00')
                )
                
                current_status = initial_status_name
                status_start_time = created_on
                
                # Walk through journals and accumulate time per status
                for journal in journals_sorted:
                    journal_time = datetime.fromisoformat(
                        journal['created_on'].replace('Z', '+00:00')
                    )
                    
                    for detail in journal.get('details', []):
                        if detail.get('name') == 'status_id':
                            new_id = detail.get('new_value')
                            if new_id is None:
                                continue
                            
                            # Record time spent in current_status
                            time_in_status = (journal_time - status_start_time).total_seconds() / 3600
                            if time_in_status > 0:
                                status_times[current_status] = \
                                    status_times.get(current_status, 0) + time_in_status
                            
                            # Move to next status
                            current_status = AnalyticsEngine._resolve_status_name(
                                {'id': int(new_id)}, statuses_map
                            )
                            status_start_time = journal_time
                
                # Record time in final status (from last change to close or now)
                end_time = now
                closed_on_str = issue.get('closed_on')
                if closed_on_str:
                    end_time = datetime.fromisoformat(
                        closed_on_str.replace('Z', '+00:00')
                    )
                
                time_in_status = (end_time - status_start_time).total_seconds() / 3600
                if time_in_status > 0:
                    status_times[current_status] = \
                        status_times.get(current_status, 0) + time_in_status
            
            except Exception as e:
                logger.warning(f"Error calculating status times for issue {issue.get('id')}: {str(e)}")
                continue
        
        # Round values
        return {k: round(v, 2) for k, v in status_times.items()}
    
    @staticmethod
    def _resolve_status_name(status_obj: Dict, 
                             statuses_map: Optional[Dict[int, str]] = None) -> str:
        """Resolve status name from a status dict using the map or fallback."""
        status_id = status_obj.get('id') if isinstance(status_obj, dict) else None
        status_name = status_obj.get('name') if isinstance(status_obj, dict) else str(status_obj)
        
        if statuses_map and status_id is not None:
            sid = status_id if isinstance(status_id, int) else int(status_id)
            return statuses_map.get(sid, status_name or f"Status #{sid}")
        
        return status_name or f"Status #{status_id}" if status_id else "Unknown"
    
    @staticmethod
    def _calculate_per_issue_status_times(issues: List[Dict],
                                          statuses_map: Optional[Dict[int, str]] = None) -> Dict[int, Dict[str, float]]:
        """
        Calculate per-issue status times using the same logic as _calculate_status_times.
        
        Returns:
            Dict of {issue_id: {status_name: hours}}
        """
        result: Dict[int, Dict[str, float]] = {}
        now = datetime.now().astimezone()
        
        for issue in issues:
            issue_id = issue['id']
            issue_times: Dict[str, float] = {}
            
            try:
                journals = issue.get('journals', [])
                
                if not journals:
                    created_on = datetime.fromisoformat(
                        issue['created_on'].replace('Z', '+00:00')
                    )
                    end_time = now
                    closed_on_str = issue.get('closed_on')
                    if closed_on_str:
                        end_time = datetime.fromisoformat(
                            closed_on_str.replace('Z', '+00:00')
                        )
                    status_name = AnalyticsEngine._resolve_status_name(
                        issue.get('status', {}), statuses_map
                    )
                    hours = (end_time - created_on).total_seconds() / 3600
                    issue_times[status_name] = hours
                    result[issue_id] = issue_times
                    continue
                
                journals_sorted = sorted(journals, key=lambda x: x['created_on'])
                
                initial_status_name = None
                for journal in journals_sorted:
                    for detail in journal.get('details', []):
                        if detail.get('name') == 'status_id':
                            old_id = detail.get('old_value')
                            if old_id:
                                initial_status_name = AnalyticsEngine._resolve_status_name(
                                    {'id': int(old_id)}, statuses_map
                                )
                            break
                    if initial_status_name:
                        break
                
                if not initial_status_name:
                    initial_status_name = AnalyticsEngine._resolve_status_name(
                        issue.get('status', {}), statuses_map
                    )
                
                created_on = datetime.fromisoformat(
                    issue['created_on'].replace('Z', '+00:00')
                )
                
                current_status = initial_status_name
                status_start_time = created_on
                
                for journal in journals_sorted:
                    journal_time = datetime.fromisoformat(
                        journal['created_on'].replace('Z', '+00:00')
                    )
                    for detail in journal.get('details', []):
                        if detail.get('name') == 'status_id':
                            new_id = detail.get('new_value')
                            if new_id is None:
                                continue
                            time_in_status = (journal_time - status_start_time).total_seconds() / 3600
                            if time_in_status > 0:
                                issue_times[current_status] = \
                                    issue_times.get(current_status, 0) + time_in_status
                            current_status = AnalyticsEngine._resolve_status_name(
                                {'id': int(new_id)}, statuses_map
                            )
                            status_start_time = journal_time
                
                end_time = now
                closed_on_str = issue.get('closed_on')
                if closed_on_str:
                    end_time = datetime.fromisoformat(
                        closed_on_str.replace('Z', '+00:00')
                    )
                time_in_status = (end_time - status_start_time).total_seconds() / 3600
                if time_in_status > 0:
                    issue_times[current_status] = \
                        issue_times.get(current_status, 0) + time_in_status
            
            except Exception as e:
                logger.warning(f"Error in per-issue status times for {issue_id}: {e}")
            
            result[issue_id] = issue_times
        
        return result
    
    @staticmethod
    def filter_issues(issues: List[Dict], filters: Optional[Dict] = None) -> List[Dict]:
        """Filter issues by various criteria"""
        if not filters:
            return issues
        
        filtered = issues
        
        if filters.get('priorities'):
            filtered = [
                i for i in filtered 
                if i.get('priority', {}).get('id') in filters['priorities']
            ]
        
        if filters.get('assignees'):
            filtered = [
                i for i in filtered 
                if i.get('assigned_to', {}).get('id') in filters['assignees']
            ]
        
        if filters.get('issue_types'):
            filtered = [
                i for i in filtered 
                if i.get('tracker', {}).get('id') in filters['issue_types']
            ]
        
        if filters.get('categories'):
            filtered = [
                i for i in filtered 
                if i.get('category', {}).get('id') in filters['categories']
            ]
        
        return filtered
    
    @staticmethod
    def build_issues_summary(issues: List[Dict], redmine_url: str,
                             statuses_map: Optional[Dict[int, str]] = None,
                             tracked_statuses: Optional[List[str]] = None) -> List[Dict]:
        """
        Build a summary list of issues with close time, URL and per-issue status times.
        
        Args:
            issues: List of Redmine issues (with journals)
            redmine_url: Base URL of the Redmine instance
            statuses_map: Dict mapping status_id to status name
            tracked_statuses: Status names to include in per-issue status_times.
                              If None, excludes default closed statuses.
        
        Returns:
            List of issue summaries with status_times
        """
        # Compute per-issue status times
        per_issue_times = AnalyticsEngine._calculate_per_issue_status_times(
            issues, statuses_map
        )
        
        # Determine which statuses to keep in per-issue output
        if tracked_statuses is not None:
            keep_set = set(tracked_statuses)
        else:
            keep_set = None  # will exclude default closed
        
        summaries = []
        
        for issue in issues:
            close_time_hours = None
            created_on_str = issue.get('created_on')
            closed_on_str = issue.get('closed_on')
            
            if created_on_str and closed_on_str:
                try:
                    created_on = datetime.fromisoformat(created_on_str.replace('Z', '+00:00'))
                    closed_on = datetime.fromisoformat(closed_on_str.replace('Z', '+00:00'))
                    close_time_hours = round((closed_on - created_on).total_seconds() / 3600, 2)
                except Exception:
                    pass
            
            # Get per-issue status times, keep only tracked statuses
            issue_times = per_issue_times.get(issue['id'], {})
            if keep_set is not None:
                filtered_times = {k: round(v, 2) for k, v in issue_times.items() if k in keep_set}
            else:
                # Exclude default closed statuses
                default_closed = set(AnalyticsEngine.DEFAULT_CLOSED_STATUSES)
                filtered_times = {k: round(v, 2) for k, v in issue_times.items() if k not in default_closed}
            
            summaries.append({
                'id': issue['id'],
                'subject': issue.get('subject', ''),
                'status': issue.get('status', {}).get('name', ''),
                'close_time_hours': close_time_hours,
                'closed_on': closed_on_str,
                'url': f"{redmine_url}/issues/{issue['id']}",
                'tracker': issue.get('tracker', {}).get('name', ''),
                'priority': issue.get('priority', {}).get('name', ''),
                'assigned_to': issue.get('assigned_to', {}).get('name', ''),
                'status_times': filtered_times
            })
        
        return summaries

    @staticmethod
    def group_by_assignee(issues: List[Dict]) -> Dict:
        """Group metrics by assignee"""
        assignees = {}
        
        for issue in issues:
            assignee = issue.get('assigned_to', {})
            assignee_id = assignee.get('id')
            assignee_name = assignee.get('name', 'Unassigned')
            
            if assignee_id not in assignees:
                assignees[assignee_id] = {
                    'name': assignee_name,
                    'issues': []
                }
            
            assignees[assignee_id]['issues'].append(issue)
        
        # Calculate metrics for each assignee
        result = {}
        for assignee_id, data in assignees.items():
            result[data['name']] = AnalyticsEngine.calculate_metrics(data['issues'])
        
        return result
