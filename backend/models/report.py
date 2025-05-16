from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ProductReportCreate(BaseModel):
    """Product report creation model"""
    reason: str = Field(..., description="Reason for reporting the product")
    description: str = Field(..., description="Detailed description of the issue")
    reported_link: Optional[str] = None


class ProductReportUpdate(BaseModel):
    """Model for updating a report"""
    status: str



class ProductReportResponse(BaseModel):
    """Product report response model"""
    id: str
    product_id: str
    user_id: str
    reason: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    product_name: Optional[str] = None
    reported_link: Optional[str] = None