from pydantic import BaseModel, Field
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
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    size: Optional[List[str]] = None
    color: Optional[List[str]] = None
    stock: Optional[int] = Field(None, ge=0)
    category: Optional[str] = None

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
        orm_mode = True

class ProductResponse(ProductBase):
    id: str
    seller_id: str
    created_at: datetime
    reviews: Optional[List[ReviewResponse]] = []
    
    class Config:
        orm_mode = True