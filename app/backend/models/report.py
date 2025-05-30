# app/backend/models/report.py
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ReportStatus(str, Enum):
    pending = "pending"
    handled = "handled"
    dismissed = "dismissed"

class ReportCreate(BaseModel):
    product_id: str
    description: str = Field(..., min_length=10, max_length=1000)

class ReportUpdate(BaseModel):
    status: Optional[ReportStatus] = None
    admin_notes: Optional[str] = None

class Report(BaseModel):
    id: str
    product_id: str
    user_id: str
    description: str
    status: ReportStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ReportResponse(Report):
    product_name: Optional[str] = None
    product_image: Optional[str] = None
    reporter_name: Optional[str] = None

class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    size: int
    pages: int