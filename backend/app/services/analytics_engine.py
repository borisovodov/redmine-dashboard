from typing import List, Dict, Optional
from datetime import datetime
import statistics
import logging

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """Analytics calculations engine"""
    
    # List of closed status names (usually, but can vary)
    CLOSED_STATUSES = ['Closed', 'Rejected', 'Done']
    
    @staticmethod
    def calculate_metrics(issues: List[Dict], closed_statuses: Optional[List[str]] = None) -> Dict:
        """
        Calculate analytics metrics from issues
        
        Args:
            issues: List of Redmine issues
            closed_statuses: List of status names that count as "closed"
        
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
        
        closed_statuses = closed_statuses or AnalyticsEngine.CLOSED_STATUSES
        
        # Filter for closed issues
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
        
        # Calculate status times
        status_times = AnalyticsEngine._calculate_status_times(closed_issues)
        
        # Calculate metrics
        avg_hours = sum(close_times_hours) / len(close_times_hours) if close_times_hours else 0
        median_hours = statistics.median(close_times_hours) if close_times_hours else 0
        
        return {
            'total_issues': len(issues),
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
    def _calculate_status_times(issues: List[Dict]) -> Dict:
        """Calculate average time spent in each status"""
        status_times = {}
        
        for issue in issues:
            try:
                # Get journals (history) for status changes
                journals = issue.get('journals', [])
                
                # Sort by date
                journals_sorted = sorted(journals, key=lambda x: x['created_on'])
                
                created_on = datetime.fromisoformat(
                    issue['created_on'].replace('Z', '+00:00')
                )
                
                # Iterate through journals and track status changes
                current_status = issue.get('status', {}).get('name', 'Unknown')
                status_start_time = created_on
                
                for journal in journals_sorted:
                    journal_time = datetime.fromisoformat(
                        journal['created_on'].replace('Z', '+00:00')
                    )
                    
                    for change in journal.get('details', []):
                        if change['name'] == 'status':
                            # Record time in current status
                            time_in_status = (journal_time - status_start_time).total_seconds() / 3600
                            
                            if current_status not in status_times:
                                status_times[current_status] = []
                            status_times[current_status].append(time_in_status)
                            
                            # Update current status
                            current_status = change['new_value']
                            status_start_time = journal_time
                
                # Calculate last status time
                if issue.get('closed_on'):
                    closed_on = datetime.fromisoformat(
                        issue['closed_on'].replace('Z', '+00:00')
                    )
                    time_in_status = (closed_on - status_start_time).total_seconds() / 3600
                    
                    if current_status not in status_times:
                        status_times[current_status] = []
                    status_times[current_status].append(time_in_status)
            
            except Exception as e:
                logger.warning(f"Error calculating status times for issue {issue.get('id')}: {str(e)}")
                continue
        
        # Convert to average times
        average_status_times = {}
        for status, times in status_times.items():
            average_status_times[status] = round(sum(times) / len(times), 2) if times else 0
        
        return average_status_times
    
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
        
        return filtered
    
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
