from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class ReviewBase(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None




class ReviewCreate(BaseModel):
    """Review creation model"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str = Field(..., min_length=3, description="Review comment")


class ReviewResponse(BaseModel):
    """Review response model"""
    id: str
    product_id: str
    user_id: str
    rating: int
    comment: str
    created_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None