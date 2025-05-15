from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    description: str
    price: float = Field(..., gt=0)
    size: List[str]
    color: List[str]
    stock: int = Field(..., ge=0)
    category: str


class ProductCreate(ProductBase):
    image_urls: List[str] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    size: Optional[List[str]] = None
    color: Optional[List[str]] = None
    stock: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None
    image_urls: Optional[List[str]] = None


class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReportCreate(BaseModel):
    description: str
    reported_link: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    product_id: str
    user_id: str
    rating: float
    comment: Optional[str]
    created_at: datetime

    class Config:
        model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    size: List[str] = []
    color: List[str] = []
    stock: int = 0
    category: str
    seller_id: str
    image_urls: List[str] = []
    created_at: datetime
    reviews: List[ReviewResponse] = []

    class Config:
        model_config = ConfigDict(from_attributes=True)