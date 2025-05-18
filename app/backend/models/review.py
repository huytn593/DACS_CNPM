# app/backend/models/review.py
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    product_id: str
    rating: float = Field(..., ge=1.0, le=5.0)
    comment: Optional[str] = None

    @field_validator('rating')
    def validate_rating_steps(cls, v):
        # Ensure rating is in steps of 0.5
        if v * 10 % 5 != 0:
            raise ValueError("Rating must be in steps of 0.5")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    comment: Optional[str] = None

    @field_validator('rating')
    def validate_rating_steps(cls, v):
        if v is not None and v * 10 % 5 != 0:
            raise ValueError("Rating must be in steps of 0.5")
        return v

class Review(BaseModel):
    id: str
    product_id: str
    user_id: str
    user_name: str
    rating: float
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ReviewResponse(Review):
    pass

class ReviewSummary(BaseModel):
    average_rating: float
    total_reviews: int
    rating_breakdown: dict[int, int]  # Maps rating (1-5) to count