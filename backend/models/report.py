from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ReportBase(BaseModel):
    description: str
    reported_link: Optional[str] = None


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    status: str  # "pending", "processed", "rejected"


class ReportResponse(ReportBase):
    id: str
    user_id: str
    product_id: str
    status: str = "pending"
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)