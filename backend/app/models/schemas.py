from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AuthRequest(BaseModel):
    """Request model for authentication"""
    redmine_url: str
    api_key: str


class AuthResponse(BaseModel):
    """Response model for authentication"""
    session_id: str
    status: str


class Project(BaseModel):
    """Redmine project model"""
    id: int
    name: str
    key: str


class ProjectsResponse(BaseModel):
    """Response model for projects list"""
    projects: List[Project]


class FilterOptions(BaseModel):
    """Available filter options"""
    priorities: List[dict]
    assignees: List[dict]
    issue_types: List[dict]
    categories: List[dict] = []


class AnalyticsRequest(BaseModel):
    """Request model for analytics"""
    project_id: int
    date_from: str
    date_to: str
    priorities: Optional[List[int]] = None
    assignees: Optional[List[int]] = None
    issue_types: Optional[List[int]] = None
    categories: Optional[List[int]] = None


class AnalyticsMetrics(BaseModel):
    """Analytics metrics model"""
    total_issues: int
    average_close_time_hours: float
    median_close_time_hours: float
    distribution_data: dict
    status_time_data: dict


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: Optional[str] = None
